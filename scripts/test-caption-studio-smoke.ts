/**
 * End-to-end smoke for /captions studio flows (EN + ZH).
 *
 * Covers the same server paths CaptionStudioClient uses:
 *   plan captions+voice → expand spoken → burn captions → TTS dub → BGM
 *
 *   npx tsx scripts/test-caption-studio-smoke.ts
 *   CAPTION_SMOKE_VIDEO=/path/to.mp4 npx tsx scripts/test-caption-studio-smoke.ts
 *
 * Artifacts: tests/output/caption-studio-smoke/<runId>/
 */
import { spawn } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { azureVoiceForLocale, type VoiceoverLocale } from "../lib/ad-pack-preferences";
import type { CaptionLine } from "../lib/ad-pack-types";
import { captionSpeakText } from "../lib/ad-pack-types";
import { expandSpokenForCaptions } from "../lib/expand-spoken-captions";
import { planCaptionVoice } from "../lib/plan-caption-voice";
import { burnCaptionsOverlay } from "../lib/pipeline/caption-overlay-burn";
import {
  addBackgroundMusic,
  ensureFfmpeg,
  getFfmpegPath,
  getMediaDurationSeconds,
  mixNarrationOverVideo,
  mixTimedNarrationClips,
  videoHasAudioStream,
} from "../lib/pipeline/ffmpeg";
import { synthesizeSpeechToFile } from "../lib/pipeline/tts";
import { bgmFilePath } from "../lib/bgm/tracks";
import { spokenCharBudget } from "../lib/speech-timing";

/** Minimal .env.local loader (no dotenv dependency). */
function loadEnvFile(filePath: string) {
  if (!existsSync(filePath)) return;
  for (const line of readFileSync(filePath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}

loadEnvFile(path.join(process.cwd(), ".env.local"));
loadEnvFile(path.join(process.cwd(), ".env"));

type Status = "pass" | "fail" | "skip";
type Row = {
  id: string;
  locale: string;
  status: Status;
  detail: string;
  ms: number;
};

const SKIP_AI = process.env.CAPTION_SMOKE_SKIP_AI === "1";
const SKIP_TTS = process.env.CAPTION_SMOKE_SKIP_TTS === "1";
const ROOT = process.cwd();
const runId = new Date().toISOString().replace(/[:.]/g, "-");
const outDir = path.join(ROOT, "tests/output/caption-studio-smoke", runId);
mkdirSync(outDir, { recursive: true });

const rows: Row[] = [];

function log(msg: string) {
  console.log(msg);
}

async function step(
  id: string,
  locale: string,
  label: string,
  fn: () => Promise<string>,
  opts?: { skip?: boolean; skipReason?: string },
): Promise<string | null> {
  if (opts?.skip) {
    rows.push({
      id,
      locale,
      status: "skip",
      detail: opts.skipReason ?? "skipped",
      ms: 0,
    });
    log(`⏭  [${locale}] ${label} — ${opts.skipReason ?? "skipped"}`);
    return null;
  }
  const t0 = Date.now();
  try {
    const detail = await fn();
    const ms = Date.now() - t0;
    rows.push({ id, locale, status: "pass", detail, ms });
    log(`✅ [${locale}] ${label} (${ms}ms) — ${detail}`);
    return detail;
  } catch (e) {
    const ms = Date.now() - t0;
    const detail = e instanceof Error ? e.message : String(e);
    rows.push({ id, locale, status: "fail", detail, ms });
    log(`❌ [${locale}] ${label} (${ms}ms) — ${detail}`);
    return null;
  }
}

function run(cmd: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (c: Buffer) => {
      stderr += c.toString("utf8");
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} exited ${code}: ${stderr.slice(-400)}`));
    });
  });
}

async function makeCleanReel(outPath: string, durationSec: number): Promise<void> {
  await run(getFfmpegPath(), [
    "-y",
    "-f",
    "lavfi",
    "-i",
    `color=c=#1a1a2e:s=1080x1920:d=${durationSec}`,
    "-f",
    "lavfi",
    "-i",
    `sine=frequency=220:duration=${durationSec}`,
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    "-shortest",
    outPath,
  ]);
}

async function extractFrame(video: string, atSec: number, outJpg: string): Promise<void> {
  await run(getFfmpegPath(), [
    "-y",
    "-ss",
    String(atSec),
    "-i",
    video,
    "-frames:v",
    "1",
    "-q:v",
    "2",
    outJpg,
  ]);
}

/** Caption region should have bright outline/fill pixels if glyphs rendered. */
async function assertCaptionPixelsVisible(
  frameJpg: string,
  opts?: { minBright?: number },
): Promise<{ bright: number; ratio: number }> {
  const img = sharp(frameJpg);
  const { width, height } = await img.metadata();
  if (!width || !height) throw new Error("bad frame");
  const top = Math.floor(height * 0.72);
  const cropH = height - top;
  const { data, info } = await sharp(frameJpg)
    .extract({ left: 0, top, width, height: cropH })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const channels = info.channels;
  let bright = 0;
  const total = info.width * info.height;
  for (let i = 0; i < data.length; i += channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    // White fill/stroke OR yellow XHS-bold captions (high R+G, low B)
    const white = r > 200 && g > 200 && b > 200;
    const yellow = r > 200 && g > 180 && b < 120;
    if (white || yellow) bright += 1;
  }
  const ratio = bright / total;
  const minBright = opts?.minBright ?? 80;
  if (bright < minBright) {
    throw new Error(
      `Caption region looks empty/tofu (brightPixels=${bright}, ratio=${ratio.toFixed(4)}). Frame: ${frameJpg}`,
    );
  }
  return { bright, ratio };
}

function fallbackLines(locale: VoiceoverLocale, durationSec: number): CaptionLine[] {
  const n = 4;
  const slice = durationSec / n;
  if (locale === "en") {
    const texts = [
      "Create ads in minutes",
      "No prompt writing needed",
      "Upload once, generate reels",
      "Try Alchemy today",
    ];
    return texts.map((text, i) => ({
      startSec: Number((i * slice).toFixed(2)),
      endSec: Number((i === n - 1 ? durationSec : (i + 1) * slice).toFixed(2)),
      text,
      spokenText: text,
      position: i % 2 === 0 ? "bottom" : "top",
    }));
  }
  const texts = ["一鍵出片", "不用寫 Prompt", "上傳產品即製片", "立即試用 Alchemy"];
  return texts.map((text, i) => ({
    startSec: Number((i * slice).toFixed(2)),
    endSec: Number((i === n - 1 ? durationSec : (i + 1) * slice).toFixed(2)),
    text,
    spokenText: text,
    position: i % 2 === 0 ? "bottom" : "top",
  }));
}

async function runLocale(locale: VoiceoverLocale, cleanVideo: string, durationSec: number) {
  const dir = path.join(outDir, locale);
  mkdirSync(dir, { recursive: true });

  let lines: CaptionLine[] = fallbackLines(locale, durationSec);

  await step(
    `${locale}-plan`,
    locale,
    "Plan captions + spoken voice (DeepSeek)",
    async () => {
      const topic =
        locale === "en"
          ? "Alchemy AI Lab — create product ads and reels in minutes"
          : "Alchemy AI Lab 工作室 — 一鍵製作產品廣告短片";
      const planned = await planCaptionVoice({
        topic,
        locale,
        videoDurationSec: durationSec,
        lineCount: 4,
      });
      lines = planned.captionLines;
      writeFileSync(path.join(dir, "plan.json"), JSON.stringify(planned, null, 2));
      const budgets = lines.map((l) => {
        const dur = Math.max(0.5, l.endSec - l.startSec);
        const b = spokenCharBudget(dur, locale);
        const spoken = captionSpeakText(l);
        return `${spoken.length}/${b.maxChars}`;
      });
      return `${lines.length} lines · spoken chars ${budgets.join(", ")}`;
    },
    {
      skip: SKIP_AI || !process.env.DEEPSEEK_API_KEY,
      skipReason: SKIP_AI ? "CAPTION_SMOKE_SKIP_AI=1" : "no DEEPSEEK_API_KEY",
    },
  );

  await step(
    `${locale}-expand`,
    locale,
    "Expand spoken captions",
    async () => {
      const expanded = await expandSpokenForCaptions({
        captionLines: lines,
        locale,
        product: locale === "en" ? "Alchemy" : "Alchemy 工作室",
      });
      lines = expanded.captionLines;
      writeFileSync(path.join(dir, "expand.json"), JSON.stringify(expanded, null, 2));
      return `${lines.length} lines · script ${expanded.voiceoverScript.slice(0, 60)}…`;
    },
    {
      skip: SKIP_AI || !process.env.DEEPSEEK_API_KEY,
      skipReason: SKIP_AI ? "CAPTION_SMOKE_SKIP_AI=1" : "no DEEPSEEK_API_KEY",
    },
  );

  const burnedPath = path.join(dir, "burned-captions.mp4");
  await step(`${locale}-burn`, locale, "Burn script captions (overlay)", async () => {
    const work = path.join(dir, "_work-burn");
    mkdirSync(work, { recursive: true });
    await burnCaptionsOverlay(cleanVideo, lines, burnedPath, work, {
      preset: locale === "en" ? "xhs-bold" : "classic",
    });
    const mid = Math.max(0.3, (lines[0].startSec + lines[0].endSec) / 2);
    const frame = path.join(dir, "burn-frame.jpg");
    await extractFrame(burnedPath, mid, frame);
    const pix = await assertCaptionPixelsVisible(frame);
    const hasAudio = await videoHasAudioStream(burnedPath);
    if (!hasAudio) throw new Error("Burned video lost audio track");
    return `burn ok · brightPixels=${pix.bright} · audio preserved`;
  });

  // Also burn English with classic (NotoBody) to catch both font stacks.
  if (locale === "en") {
    await step(`${locale}-burn-classic`, locale, "Burn EN classic font stack", async () => {
      const work = path.join(dir, "_work-burn-classic");
      mkdirSync(work, { recursive: true });
      const out = path.join(dir, "burned-classic.mp4");
      await burnCaptionsOverlay(cleanVideo, lines, out, work, { preset: "classic" });
      const frame = path.join(dir, "burn-classic-frame.jpg");
      await extractFrame(out, 1.0, frame);
      const pix = await assertCaptionPixelsVisible(frame);
      return `classic ok · brightPixels=${pix.bright}`;
    });
  }

  const dubbedPath = path.join(dir, "with-voice.mp4");
  await step(
    `${locale}-voice`,
    locale,
    "TTS dub per caption (natural speed + fit)",
    async () => {
      const { voice, xmlLang } = azureVoiceForLocale(locale);
      const clips: { path: string; startSec: number; endSec?: number }[] = [];
      let rawSpeechSec = 0;
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const speak = captionSpeakText(line);
        const clipPath = path.join(dir, `tts-${i}.mp3`);
        await synthesizeSpeechToFile({
          text: speak,
          voice,
          xmlLang,
          locale,
          outputPath: clipPath,
          voicePresetId: locale === "en" ? "en-female" : "hk-female-pro",
        });
        const dur = await getMediaDurationSeconds(clipPath);
        rawSpeechSec += dur;
        clips.push({ path: clipPath, startSec: line.startSec, endSec: line.endSec });
      }
      const narrationWav = path.join(dir, "narration-mix.wav");
      await mixTimedNarrationClips(clips, narrationWav, durationSec);
      await mixNarrationOverVideo(burnedPath, narrationWav, dubbedPath);
      const finalDur = await getMediaDurationSeconds(dubbedPath);
      const hasAudio = await videoHasAudioStream(dubbedPath);
      if (!hasAudio) throw new Error("Dubbed video has no audio");
      if (Math.abs(finalDur - durationSec) > 0.75) {
        throw new Error(`Final duration ${finalDur.toFixed(2)}s ≠ video ${durationSec}s`);
      }
      // Raw TTS may still be a bit over, but should not be ~30% over like 26/20.
      const overshoot = rawSpeechSec / durationSec;
      if (overshoot > 1.35) {
        throw new Error(
          `Raw TTS still too long: ${rawSpeechSec.toFixed(1)}s for ${durationSec}s video (${(overshoot * 100).toFixed(0)}%)`,
        );
      }
      return `rawTTS=${rawSpeechSec.toFixed(1)}s → fitted ${finalDur.toFixed(1)}s · overshoot=${(overshoot * 100).toFixed(0)}%`;
    },
    {
      skip: SKIP_TTS || (!process.env.FAL_KEY && !process.env.AZURE_SPEECH_KEY),
      skipReason: SKIP_TTS ? "CAPTION_SMOKE_SKIP_TTS=1" : "no TTS keys",
    },
  );

  await step(`${locale}-bgm`, locale, "Add BGM over voice video", async () => {
    const bgm = bgmFilePath("calm");
    if (!existsSync(bgm)) throw new Error("missing public/bgm/calm.mp3 — npm run setup:bgm");
    const src = existsSync(dubbedPath) ? dubbedPath : burnedPath;
    const out = path.join(dir, "with-bgm.mp4");
    await addBackgroundMusic(src, bgm, out, 0.28, false);
    const hasAudio = await videoHasAudioStream(out);
    if (!hasAudio) throw new Error("BGM video has no audio");
    return path.basename(out);
  });
}

async function main() {
  log(`Caption studio smoke → ${outDir}`);
  await ensureFfmpeg();

  const durationSec = 8;
  const cleanVideo = path.join(outDir, "clean-source.mp4");
  await makeCleanReel(cleanVideo, durationSec);

  const userVideo =
    process.env.CAPTION_SMOKE_VIDEO?.trim() ||
    "/Users/michaelng/Downloads/30f24949-d561-45a2-9364-076dda5b51fc.mp4";
  if (existsSync(userVideo)) {
    copyFileSync(userVideo, path.join(outDir, "user-sample.mp4"));
    log(`Sample reel copied (${await getMediaDurationSeconds(userVideo).then((d) => d.toFixed(1))}s)`);
  }

  for (const locale of ["en", "hk"] as VoiceoverLocale[]) {
    log(`\n=== Locale: ${locale} ===`);
    await runLocale(locale, cleanVideo, durationSec);
  }

  // Extra: burn EN+ZH on user reel if present (real 9:16 content).
  if (existsSync(userVideo)) {
    log(`\n=== User reel burn check ===`);
    const userDur = await getMediaDurationSeconds(userVideo);
    await step("user-en-burn", "en", "Burn English on user reel", async () => {
      const lines = fallbackLines("en", Math.min(20, userDur));
      const work = path.join(outDir, "_user-en");
      mkdirSync(work, { recursive: true });
      const out = path.join(outDir, "user-en-burned.mp4");
      await burnCaptionsOverlay(userVideo, lines, out, work, { preset: "classic" });
      const frame = path.join(outDir, "user-en-frame.jpg");
      await extractFrame(out, 2.5, frame);
      // User reel already has busy pixels; only require some bright caption ink.
      const pix = await assertCaptionPixelsVisible(frame, { minBright: 40 });
      return `brightPixels=${pix.bright}`;
    });
    await step("user-zh-burn", "hk", "Burn Chinese on user reel", async () => {
      const lines = fallbackLines("hk", Math.min(20, userDur));
      const work = path.join(outDir, "_user-zh");
      mkdirSync(work, { recursive: true });
      const out = path.join(outDir, "user-zh-burned.mp4");
      await burnCaptionsOverlay(userVideo, lines, out, work, { preset: "classic" });
      const frame = path.join(outDir, "user-zh-frame.jpg");
      await extractFrame(out, 2.5, frame);
      const pix = await assertCaptionPixelsVisible(frame, { minBright: 40 });
      return `brightPixels=${pix.bright}`;
    });
  }

  const summary = {
    runId,
    outDir,
    passed: rows.filter((r) => r.status === "pass").length,
    failed: rows.filter((r) => r.status === "fail").length,
    skipped: rows.filter((r) => r.status === "skip").length,
    rows,
  };
  writeFileSync(path.join(outDir, "report.json"), JSON.stringify(summary, null, 2));

  const md = [
    `# Caption studio smoke — ${runId}`,
    "",
    `| Status | Count |`,
    `| --- | --- |`,
    `| pass | ${summary.passed} |`,
    `| fail | ${summary.failed} |`,
    `| skip | ${summary.skipped} |`,
    "",
    `| ID | Locale | Status | Detail | ms |`,
    `| --- | --- | --- | --- | --- |`,
    ...rows.map(
      (r) =>
        `| ${r.id} | ${r.locale} | ${r.status} | ${r.detail.replace(/\|/g, "/")} | ${r.ms} |`,
    ),
    "",
  ].join("\n");
  writeFileSync(path.join(outDir, "report.md"), md);

  log(`\n${md}`);
  if (summary.failed > 0) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
