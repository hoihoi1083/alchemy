import { readFileSync, writeFileSync } from "fs";
import path from "path";
import { fal } from "@fal-ai/client";
import { buildWatercolorStylizePrompt } from "../lib/compositor/journey-watercolor/constants";

function loadEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local");
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i > 0) process.env[t.slice(0, i)] = t.slice(i + 1).trim();
  }
}

function extractImageUrl(data: unknown): string | undefined {
  if (!data || typeof data !== "object") return undefined;
  return (data as { images?: Array<{ url?: string }> }).images?.[0]?.url;
}

async function main() {
  loadEnvLocal();
  fal.config({ credentials: process.env.FAL_KEY! });
  const ASSETS = path.join(
    process.env.HOME!,
    ".cursor/projects/Users-michaelng-Desktop-ai-marketing-studio/assets",
  );
  const src = path.join(ASSETS, "_____2026-06-03___9.06.38-29cd37dd-6bb5-4e9f-a54b-01498f9d05dd.png");
  const ref = path.join(ASSETS, "01-future-fork-181eb871-f73d-47cb-b107-4a1aebc3bd59.png");
  async function up(f: string) {
    return fal.storage.upload(new Blob([readFileSync(f)], { type: "image/png" }));
  }
  const srcUrl = await up(src);
  const refUrl = await up(ref);
  const prompt = buildWatercolorStylizePrompt();
  const tries: Array<{ name: string; ep: string; urls: string[]; extra?: Record<string, unknown> }> = [
    { name: "pro-2img-4x5", ep: "fal-ai/nano-banana-pro/edit", urls: [srcUrl, refUrl], extra: { resolution: "2K" } },
    { name: "pro-style-first", ep: "fal-ai/nano-banana-pro/edit", urls: [refUrl, srcUrl], extra: { resolution: "2K" } },
    { name: "banana2-edit", ep: "fal-ai/nano-banana-2/edit", urls: [srcUrl, refUrl] },
    { name: "edit-1img-long", ep: "fal-ai/nano-banana/edit", urls: [srcUrl] },
  ];
  const outDir = path.join(process.env.HOME!, "Desktop");
  for (const t of tries) {
    try {
      const r = await fal.subscribe(t.ep, {
        input: { prompt, image_urls: t.urls, aspect_ratio: "4:5", num_images: 1, limit_generations: true, ...t.extra },
        logs: false,
      });
      const url = extractImageUrl(r.data);
      if (!url) throw new Error("no url");
      const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
      const p = path.join(outDir, `test-02-${t.name}.png`);
      writeFileSync(p, buf);
      console.log("OK", t.name, "->", p);
    } catch (e) {
      const err = e as { status?: number; body?: unknown; message?: string };
      console.log("FAIL", t.name, err.status, JSON.stringify(err.body)?.slice(0, 200) || err.message);
    }
  }
}

main();
