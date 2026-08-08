/**
 * Generate expanded landing template-card stills (3:4) for each filter tab.
 *
 *   npx tsx scripts/gen-template-showcase-cards.ts
 *   npx tsx scripts/gen-template-showcase-cards.ts xhs instagram
 *
 * Writes: public/images/landing/tpl-show-{id}.jpg (900×1125)
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync, unlinkSync } from "node:fs";
import path from "node:path";
import { fal } from "@fal-ai/client";
import { execFileSync } from "node:child_process";
import sharp from "sharp";

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

const OUT = path.join(process.cwd(), "public/images/landing");
mkdirSync(OUT, { recursive: true });

const TEXT_RULE =
  "No Chinese, no logos, no watermarks, no fake brand names, no tiny UI gibberish. Product labels blank white. At most one short clean English word or phrase if named in the prompt.";

type Tab = "product" | "instagram" | "facebook" | "xhs" | "video" | "service";

type Card = {
  id: string;
  tab: Tab;
  /** i18n title key suffix after tplCard */
  titleKey: string;
  captionKey: "tplCapIg" | "tplCapFb" | "tplCapXhs" | "tplCapReel" | "tplCapService" | "tplCapProduct";
  prompt: string;
};

/** ~6 cards per filter tab so each category feels full. */
const CARDS: Card[] = [
  // —— Product Ads ——
  {
    id: "product-serum",
    tab: "product",
    titleKey: "tplCardProductSerum",
    captionKey: "tplCapProduct",
    prompt: `Vertical 3:4 premium product ad. Amber glass serum dropper bottle on white marble, soft daylight, lavender accents. Commercial beauty photography. ${TEXT_RULE}`,
  },
  {
    id: "product-pack",
    tab: "product",
    titleKey: "tplCardProductPack",
    captionKey: "tplCapProduct",
    prompt: `Vertical 3:4 product packshot. Three skincare bottles lined on a soft lilac seamless backdrop, clean catalog lighting. ${TEXT_RULE}`,
  },
  {
    id: "product-hero",
    tab: "product",
    titleKey: "tplCardProductHero",
    captionKey: "tplCapProduct",
    prompt: `Vertical 3:4 hero product visual. White sneaker floating above soft gradient purple floor, dramatic soft studio light. ${TEXT_RULE}`,
  },
  {
    id: "product-flatlay",
    tab: "product",
    titleKey: "tplCardProductFlatlay",
    captionKey: "tplCapProduct",
    prompt: `Vertical 3:4 e-commerce flat-lay. Cosmetic jars, brush, and petals arranged neatly on warm cream paper. ${TEXT_RULE}`,
  },
  {
    id: "product-luxury",
    tab: "product",
    titleKey: "tplCardProductLuxury",
    captionKey: "tplCapProduct",
    prompt: `Vertical 3:4 luxury product still. Matte black perfume bottle on dark stone with soft rim light. ${TEXT_RULE}`,
  },
  {
    id: "product-kit",
    tab: "product",
    titleKey: "tplCardProductKit",
    captionKey: "tplCapProduct",
    prompt: `Vertical 3:4 gift kit product shot. Open beige box with serum and cream jars, tissue paper, soft daylight. ${TEXT_RULE}`,
  },

  // —— Instagram ——
  {
    id: "ig-skincare",
    tab: "instagram",
    titleKey: "tplCardIgSkincare",
    captionKey: "tplCapIg",
    prompt: `Vertical 3:4 Instagram-style skincare post. Purple serum bottles with soft BRIGHTEN vibe, lifestyle beauty feed aesthetic. One short word allowed: BRIGHTEN. ${TEXT_RULE}`,
  },
  {
    id: "ig-cafe",
    tab: "instagram",
    titleKey: "tplCardIgCafe",
    captionKey: "tplCapIg",
    prompt: `Vertical 3:4 Instagram cafe flat-lay. Latte art, croissant, soft morning light, aesthetic feed photo. ${TEXT_RULE}`,
  },
  {
    id: "ig-fashion",
    tab: "instagram",
    titleKey: "tplCardIgFashion",
    captionKey: "tplCapIg",
    prompt: `Vertical 3:4 Instagram fashion look. Minimal outfit flat-lay with sneakers and bag on clean floor, soft shadows. ${TEXT_RULE}`,
  },
  {
    id: "ig-testimonial",
    tab: "instagram",
    titleKey: "tplCardIgTestimonial",
    captionKey: "tplCapIg",
    prompt: `Vertical 3:4 Instagram testimonial style. Purple pump bottle centered, soft pastel backdrop, empty quote-mark shapes (no readable quote text). ${TEXT_RULE}`,
  },
  {
    id: "ig-routine",
    tab: "instagram",
    titleKey: "tplCardIgRoutine",
    captionKey: "tplCapIg",
    prompt: `Vertical 3:4 Instagram morning routine. Vanity with skincare bottles, mirror reflection soft bokeh. ${TEXT_RULE}`,
  },
  {
    id: "ig-color",
    tab: "instagram",
    titleKey: "tplCardIgColor",
    captionKey: "tplCapIg",
    prompt: `Vertical 3:4 Instagram colorful product pop. Lipstick and blush on bold coral backdrop, playful commercial. ${TEXT_RULE}`,
  },

  // —— Facebook Ads ——
  {
    id: "fb-sale",
    tab: "facebook",
    titleKey: "tplCardFbSale",
    captionKey: "tplCapFb",
    prompt: `Vertical 3:4 Facebook ad sale creative. Yellow pump bottles, soft SALE feel. One short phrase allowed: SALE 50%. ${TEXT_RULE}`,
  },
  {
    id: "fb-coffee",
    tab: "facebook",
    titleKey: "tplCardFbCoffee",
    captionKey: "tplCapFb",
    prompt: `Vertical 3:4 Facebook ad for cold brew. Iced coffee glass on wood, appetizing warm light. ${TEXT_RULE}`,
  },
  {
    id: "fb-fitness",
    tab: "facebook",
    titleKey: "tplCardFbFitness",
    captionKey: "tplCapFb",
    prompt: `Vertical 3:4 Facebook ad fitness promo. Athlete smiling in studio, soft gray backdrop. One short phrase allowed: TRAIN. ${TEXT_RULE}`,
  },
  {
    id: "fb-offer",
    tab: "facebook",
    titleKey: "tplCardFbOffer",
    captionKey: "tplCapFb",
    prompt: `Vertical 3:4 Facebook offer ad. Product bottle with soft purple gradient banner area (blank), clean conversion creative. ${TEXT_RULE}`,
  },
  {
    id: "fb-bundle",
    tab: "facebook",
    titleKey: "tplCardFbBundle",
    captionKey: "tplCapFb",
    prompt: `Vertical 3:4 Facebook bundle ad. Two product bottles side by side with gift ribbon, bright studio. ${TEXT_RULE}`,
  },
  {
    id: "fb-launch",
    tab: "facebook",
    titleKey: "tplCardFbLaunch",
    captionKey: "tplCapFb",
    prompt: `Vertical 3:4 Facebook new launch ad. Sleek gadget-like cream jar on reflective surface, modern tech-beauty light. ${TEXT_RULE}`,
  },

  // —— 小红书 / RedNote ——
  {
    id: "xhs-haul",
    tab: "xhs",
    titleKey: "tplCardXhsHaul",
    captionKey: "tplCapXhs",
    prompt: `Vertical 3:4 Xiaohongshu-style beauty haul flat-lay. Multiple mini skincare bottles on soft pink cloth, soft daylight UGC aesthetic. ${TEXT_RULE}`,
  },
  {
    id: "xhs-ootd",
    tab: "xhs",
    titleKey: "tplCardXhsOotd",
    captionKey: "tplCapXhs",
    prompt: `Vertical 3:4 Xiaohongshu OOTD aesthetic. Soft outfit and shoes on wooden floor near window light, lifestyle UGC. ${TEXT_RULE}`,
  },
  {
    id: "xhs-foodie",
    tab: "xhs",
    titleKey: "tplCardXhsFoodie",
    captionKey: "tplCapXhs",
    prompt: `Vertical 3:4 Xiaohongshu foodie post. Aesthetic dessert plate and latte on marble cafe table, warm soft light. ${TEXT_RULE}`,
  },
  {
    id: "xhs-desk",
    tab: "xhs",
    titleKey: "tplCardXhsDesk",
    captionKey: "tplCapXhs",
    prompt: `Vertical 3:4 Xiaohongshu desk setup. Clean aesthetic desk with notebook, candle, and plant, soft natural light. ${TEXT_RULE}`,
  },
  {
    id: "xhs-skincare",
    tab: "xhs",
    titleKey: "tplCardXhsSkincare",
    captionKey: "tplCapXhs",
    prompt: `Vertical 3:4 Xiaohongshu skincare routine mirror selfie vibe (no face), hands holding serum bottle, soft bathroom light. ${TEXT_RULE}`,
  },
  {
    id: "xhs-home",
    tab: "xhs",
    titleKey: "tplCardXhsHome",
    captionKey: "tplCapXhs",
    prompt: `Vertical 3:4 Xiaohongshu home aesthetic. Cozy corner with throw blanket, vase, and candle, soft evening light. ${TEXT_RULE}`,
  },
  {
    id: "xhs-travel",
    tab: "xhs",
    titleKey: "tplCardXhsTravel",
    captionKey: "tplCapXhs",
    prompt: `Vertical 3:4 Xiaohongshu travel lifestyle. Coffee cup and camera on hotel windowsill overlooking soft city bokeh. ${TEXT_RULE}`,
  },

  // —— Reels / Video ——
  {
    id: "reel-storyboard",
    tab: "video",
    titleKey: "tplCardReelBoard",
    captionKey: "tplCapReel",
    prompt: `Vertical 3:4 reels storyboard frame. Three stacked scene thumbnails of a product story with purple 1 2 3 badges, soft SaaS UI feel. Only numbers 1 2 3 allowed. ${TEXT_RULE}`,
  },
  {
    id: "reel-unbox",
    tab: "video",
    titleKey: "tplCardReelUnbox",
    captionKey: "tplCapReel",
    prompt: `Vertical 3:4 reel still. Hands opening a product box, excited unboxing moment, soft studio light. ${TEXT_RULE}`,
  },
  {
    id: "reel-tips",
    tab: "video",
    titleKey: "tplCardReelTips",
    captionKey: "tplCapReel",
    prompt: `Vertical 3:4 tip-style reel still. Split soft panels suggesting step tips for skincare, clean modern layout, no readable tip text. ${TEXT_RULE}`,
  },
  {
    id: "reel-before",
    tab: "video",
    titleKey: "tplCardReelBefore",
    captionKey: "tplCapReel",
    prompt: `Vertical 3:4 before-after reel still. Split frame product on plain white vs lifestyle scene, badges BEFORE and AFTER only. ${TEXT_RULE}`,
  },
  {
    id: "reel-ugc",
    tab: "video",
    titleKey: "tplCardReelUgc",
    captionKey: "tplCapReel",
    prompt: `Vertical 3:4 UGC reel still. Phone filming a product on kitchen counter, casual authentic vibe. ${TEXT_RULE}`,
  },
  {
    id: "reel-hook",
    tab: "video",
    titleKey: "tplCardReelHook",
    captionKey: "tplCapReel",
    prompt: `Vertical 3:4 hook-frame reel still. Extreme close-up of product texture with soft motion-ready lighting. ${TEXT_RULE}`,
  },

  // —— Service ——
  {
    id: "svc-fitness",
    tab: "service",
    titleKey: "tplCardSvcFitness",
    captionKey: "tplCapService",
    prompt: `Vertical 3:4 service promo for personal training. Confident trainer in studio, soft gray backdrop, professional. ${TEXT_RULE}`,
  },
  {
    id: "svc-clinic",
    tab: "service",
    titleKey: "tplCardSvcClinic",
    captionKey: "tplCapService",
    prompt: `Vertical 3:4 clinic service promo. Bright modern clinic lobby with soft plants, clean trustworthy feel. ${TEXT_RULE}`,
  },
  {
    id: "svc-salon",
    tab: "service",
    titleKey: "tplCardSvcSalon",
    captionKey: "tplCapService",
    prompt: `Vertical 3:4 salon service promo. Elegant salon chair and soft pink lighting, premium beauty service. ${TEXT_RULE}`,
  },
  {
    id: "svc-coach",
    tab: "service",
    titleKey: "tplCardSvcCoach",
    captionKey: "tplCapService",
    prompt: `Vertical 3:4 coaching service promo. Laptop video-call desk setup with notebook and coffee, calm education vibe. ${TEXT_RULE}`,
  },
  {
    id: "svc-spa",
    tab: "service",
    titleKey: "tplCardSvcSpa",
    captionKey: "tplCapService",
    prompt: `Vertical 3:4 spa service promo. Soft towels, stones, and candle on wood tray, serene wellness atmosphere. ${TEXT_RULE}`,
  },
  {
    id: "svc-consult",
    tab: "service",
    titleKey: "tplCardSvcConsult",
    captionKey: "tplCapService",
    prompt: `Vertical 3:4 consulting service promo. Modern meeting table with laptop charts soft-focus, professional blue-gray light. ${TEXT_RULE}`,
  },
];

function extractImageUrl(data: unknown): string | undefined {
  if (!data || typeof data !== "object") return undefined;
  const images = (data as { images?: Array<{ url?: string }> }).images;
  if (images?.[0]?.url) return images[0].url;
  const image = (data as { image?: { url?: string } }).image;
  if (image?.url) return image.url;
  return undefined;
}

async function download(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function genCard(card: Card, attempt = 1): Promise<void> {
  const dest = path.join(OUT, `tpl-show-${card.id}.jpg`);
  if (existsSync(dest) && process.env.FORCE !== "1") {
    console.log(`[skip] ${card.id} exists`);
    return;
  }
  console.log(`[${card.tab}/${card.id}] still (attempt ${attempt})…`);
  try {
    const result = await fal.subscribe("fal-ai/nano-banana-2", {
      input: {
        prompt: card.prompt,
        aspect_ratio: "3:4",
        num_images: 1,
      },
      logs: false,
    });
    const url = extractImageUrl(result.data);
    if (!url) throw new Error("No image URL");
    const buf = await download(url);
    const tmp = path.join(OUT, `tpl-show-${card.id}.tmp.png`);
    writeFileSync(tmp, buf);
    await sharp(tmp)
      .resize(900, 1125, { fit: "cover", position: "centre" })
      .jpeg({ quality: 86, mozjpeg: true })
      .toFile(dest);
    try {
      unlinkSync(tmp);
    } catch {
      /* ignore */
    }
    console.log(`[ok] ${dest}`);
  } catch (e: unknown) {
    const err = e as { status?: number; body?: unknown; message?: string };
    console.error(`[fail] ${card.id}`, err.status, JSON.stringify(err.body)?.slice(0, 300) || err.message);
    if (attempt < 3) {
      await new Promise((r) => setTimeout(r, 2500));
      return genCard(card, attempt + 1);
    }
    throw e;
  }
}

async function main() {
  const only = process.argv.slice(2);
  const queue = only.length
    ? CARDS.filter((c) => only.includes(c.tab) || only.includes(c.id))
    : [...CARDS];
  console.log(`Generating ${queue.length} cards…`);
  for (const card of queue) {
    await genCard(card);
  }
  // Write a small manifest for the React component to stay in sync.
  const manifest = queue.length === CARDS.length ? CARDS : CARDS;
  writeFileSync(
    path.join(process.cwd(), "scripts/template-showcase-manifest.json"),
    JSON.stringify(
      manifest.map((c) => ({
        id: c.id,
        tab: c.tab,
        titleKey: c.titleKey,
        captionKey: c.captionKey,
        src: `/images/landing/tpl-show-${c.id}.jpg`,
      })),
      null,
      2,
    ),
  );
  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
