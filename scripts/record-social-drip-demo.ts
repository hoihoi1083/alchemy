/**
 * Record video-only → Social drip (three-panel) with a live generate.
 * Final beat: still of the output, then the clip plays independently.

 *
 *   npx tsx scripts/record-social-drip-demo.ts
 *   npx tsx scripts/record-social-drip-demo.ts --mux-only
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium, type Locator, type Page } from "playwright";
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { appendHeroOutput, probeDuration } from "./lib/append-hero-output";
import { savePageResultVideo } from "./lib/save-result-video";

function loadEnvLocal() {
  const p = path.join(process.cwd(), ".env.local");
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (!m) continue;
    const key = m[1]!.trim();
    let val = m[2]!.trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnvLocal();

const PORT = Number(process.env.PORT ?? 3000);
const BASE = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${PORT}`;
const BURGER = path.join(process.cwd(), "public/images/landing/demo-burger.png");
const OUT_DIR = path.join(process.cwd(), "public/videos/landing");
const POSTER_DIR = path.join(process.cwd(), "public/images/landing");
const RAW_DIR = path.join(process.cwd(), ".demo-record/social-drip");
const MARKS_JSON = path.join(RAW_DIR, "marks.json");
const OUT_MP4 = path.join(OUT_DIR, "social-drip-workflow-demo.mp4");
const OUT_POSTER = path.join(POSTER_DIR, "social-drip-demo-poster.jpg");
const OUTPUT_CLIP = path.join(RAW_DIR, "output.mp4");
const MARKS_TS = path.join(process.cwd(), "lib/landing-demo.ts");
const VIEW = { width: 1440, height: 900 };
const W = 1280;
const H = 800;

type Seg = { start: number; end: number; rate: number };

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function clerkSignInToken(userId: string): Promise<string> {
  const res = await fetch("https://api.clerk.com/v1/sign_in_tokens", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ user_id: userId, expires_in_seconds: 300 }),
  });
  const body = (await res.json()) as { token?: string };
  if (!res.ok || !body.token) {
    throw new Error(`sign_in_tokens failed: ${JSON.stringify(body)}`);
  }
  return body.token;
}

async function hideChrome(page: Page) {
  await page.addStyleTag({
    content: `
      button[aria-label="Open studio assistant"],
      .landing-float-cta,
      [class*="LandingFloatingCta"],
      iframe[title*="issue"],
      iframe[title*="Sentry"] { display: none !important; }
    `,
  });
}

async function clickName(page: Page, name: RegExp | string) {
  const loc = page.getByRole("button", { name });
  await loc.first().waitFor({ timeout: 25_000 });
  await loc.first().click();
}

async function continueMicro(page: Page) {
  await page.getByRole("button", { name: /^Continue$/i }).last().click();
}

async function fillSlow(locator: Locator, text: string, delay = 32) {
  await locator.click();
  await locator.fill("");
  await locator.pressSequentially(text, { delay });
}

async function dump(page: Page, name: string) {
  await page
    .screenshot({ path: path.join(RAW_DIR, name), fullPage: true, type: "jpeg", quality: 70 })
    .catch(() => {});
}

async function waitForResultVideo(page: Page, timeoutMs: number) {
  await page.waitForFunction(
    () => {
      const videos = Array.from(document.querySelectorAll("video")) as HTMLVideoElement[];
      return videos.some(
        (v) =>
          v.readyState >= 2 &&
          v.videoWidth > 80 &&
          Number.isFinite(v.duration) &&
          v.duration > 1,
      );
    },
    undefined,
    { timeout: timeoutMs },
  );
}

/** Brief hold on the Studio review UI — the real clip is muxed on independently. */
async function holdResultUi(page: Page) {
  await page.evaluate(() => {
    const videos = Array.from(document.querySelectorAll("video")) as HTMLVideoElement[];
    const v =
      videos.find(
        (el) => el.videoWidth > 80 && Number.isFinite(el.duration) && el.duration > 1,
      ) ?? videos[0];
    if (!v) return;
    v.scrollIntoView({ block: "center", inline: "center" });
    v.pause();
    try {
      v.currentTime = 0;
    } catch {
      /* ignore */
    }
  });
  await wait(2200);
}

async function main() {
  if (process.argv.includes("--mux-only")) {
    const marks = JSON.parse(readFileSync(MARKS_JSON, "utf8")) as Record<string, number>;
    const webmName = readdirSync(RAW_DIR).find((f) => f.endsWith(".webm"));
    if (!webmName) throw new Error("No .webm in .demo-record/social-drip — record first");
    mux(path.join(RAW_DIR, webmName), marks);
    return;
  }

  const userId = process.env.E2E_CLERK_USER_ID?.trim();
  const sk = process.env.CLERK_SECRET_KEY?.trim();
  if (!userId || !sk) throw new Error("Need E2E_CLERK_USER_ID + CLERK_SECRET_KEY");
  if (!existsSync(BURGER)) {
    throw new Error("Missing demo-burger.png");
  }

  await clerkSetup();
  rmSync(RAW_DIR, { recursive: true, force: true });
  mkdirSync(RAW_DIR, { recursive: true });
  mkdirSync(OUT_DIR, { recursive: true });
  mkdirSync(POSTER_DIR, { recursive: true });

  const browser = await chromium.launch({
    headless: true,
    args: [
      "--autoplay-policy=no-user-gesture-required",
      "--disable-web-security",
      "--disable-features=IsolateOrigins,site-per-process",
    ],
  });
  const authCtx = await browser.newContext({ viewport: VIEW });
  const authPage = await authCtx.newPage();
  await setupClerkTestingToken({ page: authPage });
  const ticket = await clerkSignInToken(userId);
  await authPage.goto(`${BASE}/sign-in?__clerk_ticket=${encodeURIComponent(ticket)}`);
  await authPage.waitForURL((u) => !u.pathname.startsWith("/sign-in"), { timeout: 45_000 });
  await authPage.goto(`${BASE}/`).catch(() => {});
  await authPage.goto(`${BASE}/start`).catch(() => {});
  const storage = await authCtx.storageState();
  await authCtx.close();

  const recCtx = await browser.newContext({
    viewport: VIEW,
    storageState: storage,
    locale: "en-US",
    bypassCSP: true,
    ignoreHTTPSErrors: true,
    recordVideo: { dir: RAW_DIR, size: VIEW },
  });
  const page = await recCtx.newPage();
  await page.addInitScript(() => localStorage.setItem("ams-locale", "en"));
  await setupClerkTestingToken({ page });

  const t0 = Date.now();
  const mark = (id: string) => {
    const sec = (Date.now() - t0) / 1000;
    console.log(`[mark] ${id} @ ${sec.toFixed(2)}s`);
    return sec;
  };
  const marks: Record<string, number> = {};

  await page.goto(`${BASE}/`);
  await hideChrome(page);
  await page.getByRole("heading", { level: 1 }).first().waitFor({ timeout: 20_000 });
  marks.landing = mark("landing");
  await wait(1200);
  await page.goto(`${BASE}/start`);
  await page.waitForURL(/\/start/, { timeout: 20_000 });
  await hideChrome(page);
  marks.start = mark("start");
  await wait(700);

  await clickName(page, /Physical Products/i);
  await wait(400);
  await page.locator(".start-continue-btn").click();
  await page.waitForURL(/\/studio/, { timeout: 60_000 });
  await hideChrome(page);
  marks.studio = mark("studio");
  await wait(600);

  await clickName(page, /Generate video only/i);
  await wait(700);
  await continueMicro(page);
  marks.path = mark("path");

  await page
    .locator('[data-coach-id="coach-product"] input, [data-coach-id="coach-product"]')
    .first()
    .waitFor({ timeout: 20_000 });
  const nameInput = page.locator("input.pn-input, [data-coach-id='coach-product']").first();
  await fillSlow(nameInput, "Smash Cheeseburger", 28);
  await wait(400);
  await continueMicro(page);
  marks.name = mark("name");

  const directTab = page.getByRole("tab", { name: /Direct create/i });
  if (await directTab.count()) {
    await directTab.click();
    await wait(700);
    await continueMicro(page);
  } else {
    const tabBtn = page.locator("button.if-tab").nth(1);
    if (await tabBtn.isVisible().catch(() => false)) {
      await tabBtn.click();
      await wait(700);
      await continueMicro(page);
    }
  }
  marks.setup = mark("setup");

  const dripBtn = page.getByRole("button", { name: /Social drip/i }).first();
  await dripBtn.waitFor({ timeout: 25_000 });
  await dripBtn.scrollIntoViewIfNeeded();
  await wait(400);
  await dripBtn.click();
  marks.drip = mark("drip");
  await wait(900);

  const pour = page.getByRole("button", { name: /^Pour$/i }).first();
  if (await pour.count()) {
    await pour.scrollIntoViewIfNeeded();
    await pour.click().catch(() => {});
    await wait(500);
  }

  const headline = page
    .locator("label")
    .filter({ hasText: /Main hook/i })
    .locator("input.pg-input, input, textarea")
    .first();
  await headline.waitFor({ timeout: 20_000 });
  await fillSlow(headline, "Cheese pull that stops the scroll", 22);
  await wait(400);

  const photoTitle = page.getByRole("heading", { name: /Product photo/i }).first();
  if (await photoTitle.count()) {
    await photoTitle.scrollIntoViewIfNeeded();
  }
  const fileInput = page.locator('input[type="file"][accept*="image"]').first();
  await fileInput.waitFor({ state: "attached", timeout: 20_000 });
  await fileInput.setInputFiles(BURGER);
  await wait(1800);
  marks.photo = mark("photo");
  await wait(800);

  const generateBtn = page
    .getByRole("button", { name: /Approve & generate video|Generate video/i })
    .first();
  await generateBtn.waitFor({ timeout: 25_000 });
  await generateBtn.scrollIntoViewIfNeeded();
  await page.waitForFunction(
    () => {
      const buttons = Array.from(document.querySelectorAll("button"));
      return buttons.some(
        (b) =>
          /generate video/i.test(b.textContent || "") &&
          !(b as HTMLButtonElement).disabled,
      );
    },
    undefined,
    { timeout: 40_000 },
  );
  await wait(500);
  await generateBtn.click();
  marks.generate = mark("generate");
  await dump(page, "generating.jpg");

  try {
    await waitForResultVideo(page, 900_000);
  } catch {
    await dump(page, "video-timeout.jpg");
    const errText = await page.locator("body").innerText();
    throw new Error(`Social drip video never appeared. UI snippet: ${errText.slice(0, 1200)}`);
  }
  marks.videoReady = mark("video-ready");
  await dump(page, "result-still.jpg");
  try {
    await savePageResultVideo(page, OUTPUT_CLIP);
    console.log(`Saved result clip ${OUTPUT_CLIP}`);
  } catch (err) {
    console.warn("Could not download result clip — mux will keep in-app playback", err);
  }
  await holdResultUi(page);
  marks.videoPlayed = mark("video-played");
  await wait(400);

  marks.end = mark("end");
  writeFileSync(MARKS_JSON, JSON.stringify(marks, null, 2));

  const video = page.video();
  await recCtx.close();
  await browser.close();
  if (!video) throw new Error("No Playwright video");
  mux(await video.path(), marks);
}

function mapRawToOut(raw: number, segs: Seg[]): number {
  let out = 0;
  for (const s of segs) {
    if (raw <= s.start) return out;
    const clipEnd = Math.min(raw, s.end);
    out += (clipEnd - s.start) / s.rate;
    if (raw < s.end) return out;
  }
  return out;
}

function ensureSoftBed(): string {
  const calm = path.join(process.cwd(), "public/bgm/calm.mp3");
  if (existsSync(calm)) return calm;
  const bed = path.join(RAW_DIR, "demo-bed.mp3");
  const r = spawnSync(
    "ffmpeg",
    [
      "-y",
      "-f",
      "lavfi",
      "-i",
      "sine=frequency=174.61:duration=40",
      "-t",
      "40",
      "-ac",
      "2",
      "-ar",
      "44100",
      "-c:a",
      "libmp3lame",
      "-q:a",
      "4",
      bed,
    ],
    { stdio: "inherit" },
  );
  if (r.status !== 0) throw new Error("Could not build demo BGM bed");
  return bed;
}

function mux(webm: string, marks: Record<string, number>) {
  const start = marks.start ?? 1.5;
  const pathMark = marks.path ?? start;
  const drip = marks.drip ?? pathMark;
  const photo = marks.photo ?? drip;
  const generate = marks.generate ?? photo;
  const videoReady = marks.videoReady ?? generate;
  const videoPlayed = marks.videoPlayed ?? marks.end ?? videoReady;
  const end = marks.end ?? videoPlayed;
  const landingStart = Math.max(0, start - 2.0);

  const segs: Seg[] = [
    { start: landingStart, end: start, rate: 1 },
    { start, end: pathMark, rate: 1.2 },
    { start: pathMark, end: drip, rate: 1.15 },
    { start: drip, end: generate, rate: 1.15 },
    { start: generate, end: videoReady, rate: 16 },
    { start: videoReady, end: videoPlayed, rate: 1 },
    { start: videoPlayed, end: Math.max(videoPlayed + 0.2, end), rate: 1 },
  ].filter((s) => s.end - s.start > 0.12);

  const parts = segs.map(
    (s, i) =>
      `[0:v]trim=${s.start.toFixed(2)}:${s.end.toFixed(2)},setpts=(PTS-STARTPTS)/${s.rate}[v${i}]`,
  );
  const concat =
    segs.map((_, i) => `[v${i}]`).join("") +
    `concat=n=${segs.length}:v=1:a=0,fps=30,format=yuv420p,scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:color=0x0c0a12,setsar=1[ui]`;
  const sped = path.join(RAW_DIR, "sped.mp4");
  const r = spawnSync(
    "ffmpeg",
    ["-y", "-i", webm, "-filter_complex", [...parts, concat].join(";"), "-map", "[ui]", "-an", "-c:v", "libx264", "-pix_fmt", "yuv420p", sped],
    { stdio: "inherit" },
  );
  if (r.status !== 0) throw new Error("ffmpeg ui failed");

  const bed = ensureSoftBed();
  const dur = Math.max(8, probeDuration(sped) || 30);
  const fadeOutAt = Math.max(2, dur - 2.4);
  const mix = spawnSync(
    "ffmpeg",
    [
      "-y",
      "-i",
      sped,
      "-stream_loop",
      "-1",
      "-i",
      bed,
      "-filter_complex",
      `[1:a]volume=0.12,afade=t=in:st=0:d=1.6,afade=t=out:st=${fadeOutAt.toFixed(2)}:d=2.2[a]`,
      "-map",
      "0:v",
      "-map",
      "[a]",
      "-t",
      dur.toFixed(2),
      "-c:v",
      "libx264",
      "-crf",
      "22",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "aac",
      "-b:a",
      "128k",
      "-movflags",
      "+faststart",
      OUT_MP4,
    ],
    { stdio: "inherit" },
  );
  if (mix.status !== 0) throw new Error("ffmpeg mux failed");

  if (existsSync(OUTPUT_CLIP)) {
    const walkDur = probeDuration(OUT_MP4);
    const hero = appendHeroOutput({
      walkMp4: OUT_MP4,
      outputMp4: OUTPUT_CLIP,
      destMp4: OUT_MP4,
      destPoster: OUT_POSTER,
      trimWalkTo: walkDur,
      stillHoldSec: 1.7,
    });
    console.log("Appended independent output", hero);
  } else {
    const still = path.join(RAW_DIR, "result-still.jpg");
    if (existsSync(still)) {
      spawnSync("cp", [still, OUT_POSTER]);
    } else {
      const posterAt = mapRawToOut(videoReady, segs) + 1.2;
      spawnSync(
        "ffmpeg",
        ["-y", "-ss", String(Math.min(posterAt, Math.max(0, dur - 1))), "-i", OUT_MP4, "-frames:v", "1", "-q:v", "4", OUT_POSTER],
        { stdio: "inherit" },
      );
    }
  }

  const stepMarks = [
    0,
    Number(mapRawToOut(drip, segs).toFixed(2)),
    Number(mapRawToOut(photo, segs).toFixed(2)),
    Number(mapRawToOut(videoReady, segs).toFixed(2)),
  ];

  const src = readFileSync(MARKS_TS, "utf8");
  const next = src.replace(
    /video: \{[\s\S]*?stepMarks: \[[^\]]+\],\n  \},/,
    `video: {
    video: "/videos/landing/social-drip-workflow-demo.mp4?v=${Date.now()}",
    poster: "/images/landing/social-drip-demo-poster.jpg?v=${Date.now()}",
    stepMarks: [${stepMarks.join(", ")}],
  },`,
  );
  if (next === src) {
    console.warn("Could not patch video block in lib/landing-demo.ts — update stepMarks by hand");
  } else {
    writeFileSync(MARKS_TS, next);
  }
  console.log(`Wrote ${OUT_MP4}`);
  console.log("VIDEO STEP_MARKS", stepMarks);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
