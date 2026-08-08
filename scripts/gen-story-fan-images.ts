/**
 * Generate portrait story-fan cards for landing StoryWheel.
 *
 *   npx tsx scripts/gen-story-fan-images.ts
 *
 * Writes: public/images/landing/story-fan-{transform,reference,canvas}.jpg
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fal } from "@fal-ai/client";

function loadEnvLocal() {
  const p = path.join(process.cwd(), ".env.local");
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    let val = m[2]!.trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[m[1]!]) process.env[m[1]!] = val;
  }
}

loadEnvLocal();
const FAL_KEY = process.env.FAL_KEY;
if (!FAL_KEY) {
  console.error("Missing FAL_KEY");
  process.exit(1);
}
fal.config({ credentials: FAL_KEY });

const OUT_DIR = path.join(process.cwd(), "public/images/landing");
mkdirSync(OUT_DIR, { recursive: true });

const CARDS = [
  {
    id: "transform",
    out: "story-fan-transform.jpg",
    prompt: `Vertical 9:16 marketing UI mockup for a phone screen. Premium skincare serum dropper bottle transformation.
Top half: plain product photo on white seamless background labeled BEFORE.
Bottom half: same bottle in a warm studio lifestyle scene with soft daylight, dried flowers, labeled AFTER.
Clean modern SaaS aesthetic, soft violet accent UI chrome, subtle rounded panels, high-end commercial photography, no tiny unreadable text, no watermarks, no logos of real brands.`,
  },
  {
    id: "reference",
    out: "story-fan-reference.jpg",
    prompt: `Vertical 9:16 marketing visual for a phone screen. Style-reference workflow.
Left or top: an Instagram-style reference post of lavender aesthetic beauty content.
Right or bottom: the user's amber serum bottle restyled into that same lavender lifestyle look.
Arrow or glow connecting reference style to product result. Soft purple accents, clean premium ad creative, commercial photography, no watermarks, no real brand logos, minimal crisp labels only.`,
  },
  {
    id: "canvas",
    out: "story-fan-canvas.jpg",
    prompt: `Vertical 9:16 marketing visual for a phone screen. Fully editable design canvas.
A beauty product ad on a dark filmstrip-style canvas: amber serum bottle, headline Glow Naturally, circular badge, purple selection handles and a floating text toolbar.
Left tool rail icons for text image color. Feels like a polished in-app editor, soft violet accents, high-end UI mock, commercial photography product, no watermarks, no real brand logos.`,
  },
] as const;

function extractImageUrl(data: unknown): string | undefined {
  if (!data || typeof data !== "object") return undefined;
  const images = (data as { images?: Array<{ url?: string }> }).images;
  if (images?.[0]?.url) return images[0].url;
  const image = (data as { image?: { url?: string } }).image;
  if (image?.url) return image.url;
  return undefined;
}

async function genOne(card: (typeof CARDS)[number], attempt = 1) {
  console.log(`[${card.id}] nano-banana-2 (attempt ${attempt})…`);
  try {
    const result = await fal.subscribe("fal-ai/nano-banana-2", {
      input: {
        prompt: card.prompt,
        aspect_ratio: "9:16",
        num_images: 1,
      },
      logs: true,
    });
    const url = extractImageUrl(result.data);
    if (!url) throw new Error(`No image URL: ${JSON.stringify(result.data).slice(0, 300)}`);
    const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
    const dest = path.join(OUT_DIR, card.out);
    writeFileSync(dest, buf);
    console.log(`[${card.id}] saved ${dest} (${(buf.length / 1024).toFixed(0)} KB)`);
  } catch (e: unknown) {
    const err = e as { status?: number; body?: unknown; message?: string };
    console.error(`[${card.id}] error`, err.status, JSON.stringify(err.body)?.slice(0, 400) || err.message);
    if (attempt < 3) {
      await new Promise((r) => setTimeout(r, 3000));
      return genOne(card, attempt + 1);
    }
    throw e;
  }
}

async function main() {
  const only = process.argv.slice(2);
  const queue = only.length
    ? CARDS.filter((c) => only.includes(c.id))
    : [...CARDS];
  for (const card of queue) await genOne(card);
  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
