/**
 * Golden-path style packs for /try/style.
 * Add a new post → add a pack with locked reference stills + shot briefs.
 *
 * Strategy: transfer STYLE DNA (palette, light, mood, typography vibe) from the
 * reference, then ADAPT composition to the product’s real-world scale so a car
 * doesn’t become a toy next to a phone cord.
 */

import { imageTokensForResolution } from "@/lib/billing/token-costs";

export type StylePackShot = {
  id: string;
  /** Public path under /public (e.g. /images/style-packs/...). */
  refPath: string;
  label: string;
  /**
   * Role of this shot in the pack (used in prompts).
   * cover = eye-catch graphic; lifestyle = adapted editorial still.
   */
  role: "cover" | "lifestyle";
  /** Fixed edit brief — product swaps in; user never writes a prompt. */
  brief: string;
  aspectRatio: "1:1" | "4:5" | "4:3" | "16:9" | "9:16";
};

export type StylePack = {
  id: string;
  title: string;
  subtitle: string;
  coverPath: string;
  /** Tokens charged = shots.length × 1K image rate (see estimateStylePackTokens). */
  shots: StylePackShot[];
};

/** Shared style DNA for milk-tea-p1 — keep look, don’t force cup-scale props. */
const STYLE_DNA = `STYLE DNA from image 2 (keep this look):
- Warm cream / beige surfaces, soft editorial luxury lighting
- Cherry-red / deep burgundy accents
- Clean high-end still photography or matching graphic treatment
- Calm, premium, “PromptFree” social-ad mood

PRODUCT from image 1 (lock identity):
- Use image 1 as the ONLY product (shape, materials, colors, logos on the product).
- Keep correct REAL-WORLD SCALE — never shrink a car/furniture into a handheld toy.
- Do not invent a different product. No watermarks. No Alchemy / competing brand marks.`;

const ADAPT_RULES = `ADAPT the scene to the product (do NOT copy props blindly):
- If the product is handheld (drink, bottle, cosmetics, snack): you MAY keep similar prop ideas from image 2 at matching scale.
- If the product is large (car, furniture, appliance, bike): keep only the STYLE DNA. Redesign the set so the product is hero at true scale — e.g. cream studio floor, cherry accents as set design, red rotary phone as a tiny background prop OR omit it, red gloves as a person standing beside/leaning on the product (not holding it like a cup).
- Prefer a sensible lifestyle/editorial composition over a literal 1:1 prop clone.`;

export const STYLE_PACKS: readonly StylePack[] = [
  {
    id: "milk-tea-p1",
    title: "PromptFree · Milk Tea editorial",
    subtitle:
      "Same cream + cherry look as our FB / IG post 1 — cover + lifestyle stills. Style locked; scenes adapt to your product’s scale.",
    coverPath: "/images/style-packs/milk-tea-p1/cover-promptfree.jpg",
    shots: [
      {
        id: "cover",
        role: "cover",
        refPath: "/images/style-packs/milk-tea-p1/cover-promptfree.jpg",
        label: "Cover · eye-catch",
        aspectRatio: "4:5",
        brief: `${STYLE_DNA}
This is the KEY cover / eye-catch frame.
Match image 2’s GRAPHIC layout: solid deep cherry/burgundy field, product centered as the hero, bold boxed headlines in the same style (“NO PROMPTS” and “HANDS-FREE” or equivalent short English punch lines), clean bottom URL treatment if present.
Swap ONLY the product for image 1 — keep typography hierarchy, margins, and poster energy.
If the product is large (car etc.), show a strong hero crop that still reads as a poster on burgundy, not a tiny model on a table.`,
      },
      {
        id: "phone-cord",
        role: "lifestyle",
        refPath: "/images/style-packs/milk-tea-p1/ref-phone-cord.jpg",
        label: "Retro phone cord",
        aspectRatio: "4:3",
        brief: `${STYLE_DNA}
${ADAPT_RULES}
Shot role inspired by image 2: “retro red phone + cream fabric” editorial.
Small products: cord + phone can interact with the product like the reference.
Large products: cream draped / soft set beside a full-size product; red rotary phone as small accent in frame (never giant relative to the product); black cord as a thin styling accent only if it still looks real.`,
      },
      {
        id: "hands-frame",
        role: "lifestyle",
        refPath: "/images/style-packs/milk-tea-p1/ref-hands-frame.jpg",
        label: "Hands frame",
        aspectRatio: "4:3",
        brief: `${STYLE_DNA}
${ADAPT_RULES}
Shot role inspired by image 2: elegant human hands + beige studio light framing the hero.
Small products: hands may frame or hold like the reference.
Large products: hands silhouette at the EDGE of frame only (or a person gently touching the product) — product stays full-scale center; never cupped in palms as a miniature.`,
      },
      {
        id: "golden-bokeh",
        role: "lifestyle",
        refPath: "/images/style-packs/milk-tea-p1/ref-golden-bokeh.jpg",
        label: "Golden bokeh frame",
        aspectRatio: "4:3",
        brief: `${STYLE_DNA}
${ADAPT_RULES}
Shot role inspired by image 2: centered hero on reflective cream surface with warm golden out-of-focus frames left/right.
This composition usually scales well — keep product true-to-size, luxury auto/product-ad framing if the product is a vehicle.`,
      },
      {
        id: "red-gloves",
        role: "lifestyle",
        refPath: "/images/style-packs/milk-tea-p1/ref-red-gloves.jpg",
        label: "Red gloves POV",
        aspectRatio: "4:3",
        brief: `${STYLE_DNA}
${ADAPT_RULES}
Shot role inspired by image 2: cherry-red leather gloves + cream clothing, intimate POV.
Small products: gloves may hold the product like the reference.
Large products: POV of red-gloved hands on the product in a natural way (steering wheel / door handle / resting on hood) with cream coat visible — product remains full-size in scene, not a palm toy.`,
      },
    ],
  },
] as const;

export function getStylePack(id: string | null | undefined): StylePack | null {
  const key = (id ?? "").trim();
  if (!key) return STYLE_PACKS[0] ?? null;
  return STYLE_PACKS.find((p) => p.id === key) ?? null;
}

export function listStylePacks(): StylePack[] {
  return [...STYLE_PACKS];
}

/** Tokens for a full pack run at the given resolution (default 1K). */
export function estimateStylePackTokens(
  pack: StylePack,
  resolution: string | null | undefined = "1K",
): number {
  return imageTokensForResolution(resolution) * pack.shots.length;
}
