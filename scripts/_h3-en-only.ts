import { fal } from "@fal-ai/client";
import { existsSync, readFileSync, writeFileSync, statSync } from "node:fs";
import path from "node:path";
import { downloadToFile } from "../lib/pipeline/ffmpeg";

function loadEnv() {
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (!m) continue;
    const k = m[1]!.trim();
    const v = m[2]!.trim().replace(/^["']|["']$/g, "");
    if (!process.env[k]) process.env[k] = v;
  }
}

loadEnv();
const key = process.env.FAL_KEY?.trim();
if (!key) {
  console.error("Missing FAL_KEY");
  process.exit(1);
}
fal.config({ credentials: key });

const dir = path.join(process.cwd(), ".tmp/week1-reel-v5-edit/en");
const stills = ["01", "02", "03", "04"].map((i) => path.join(dir, `${i}.jpg`));
for (const p of stills) {
  if (!existsSync(p)) throw new Error(`missing ${p}`);
}

async function upload(p: string) {
  return fal.storage.upload(new Blob([readFileSync(p)], { type: "image/jpeg" }));
}

const prompt = [
  "@Image1 @Image2 @Image3 @Image4",
  "Vertical 9:16 Alchemy AI Lab SaaS marketing Reel, clean light UI, premium motion.",
  "0-3s: Image1 — one product photo + campaign due today; Prompt struck out; No prompt needed.",
  "3-6s: Image2 — AI Research; four cards Audience/Competitors/Content Angle/Visual Direction pop in.",
  "6-9s: Image3 — Storyboard First; Scene 01-04 hold readable; Plan first Generate second.",
  "9-12s: Image4 — different creative directions then clean CTA One photo Full campaign; Alchemy AI Lab lockup bottom-left only.",
  "Keep on-screen text sharp. No gibberish. Smooth transitions. Keep flask mascot identity. Brand is Alchemy AI Lab.",
].join(" ");

async function main() {
  console.log("uploading 4 stills…");
  const refs: string[] = [];
  for (const p of stills) {
    refs.push(await upload(p));
    console.log("  uploaded", path.basename(p));
  }

  console.log("calling minimax/h3/reference-to-video …");
  try {
    const result = await fal.subscribe("minimax/h3/reference-to-video", {
      input: {
        prompt,
        reference_image_urls: refs,
        duration: 12,
        resolution: "768P",
        aspect_ratio: "9:16",
      },
      logs: true,
      onQueueUpdate: (u) => {
        const last = (u as { logs?: Array<{ message?: string }> }).logs?.at(-1)?.message ?? "";
        console.log("queue:", u.status, last);
      },
    });
    const data = result.data as { video?: { url?: string }; video_url?: string };
    const url = data.video?.url ?? data.video_url;
    console.log("video url", url);
    if (!url) {
      console.error(JSON.stringify(result.data, null, 2));
      process.exit(1);
    }
    const out = path.join(dir, "week1-reel-v5-en.mp4");
    await downloadToFile(url, out);
    console.log("saved", out, statSync(out).size);
    const dest = path.join(
      process.env.HOME!,
      "Downloads/Alchemy Week 1 Marketing/Reel 1/week1-reel-v5-en.mp4",
    );
    writeFileSync(dest, readFileSync(out));
    console.log("copied", dest);
  } catch (e: unknown) {
    const err = e as { status?: number; body?: unknown; message?: string };
    console.error("FAIL", err.status, err.body ?? err.message ?? e);
    if (err.body) console.error(JSON.stringify(err.body, null, 2));
    process.exit(1);
  }
}

main();
