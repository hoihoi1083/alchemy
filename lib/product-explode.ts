/**
 * Stylized product explode (产品拆解动效) — MiniMax H3 start→end (Seedance fallback).
 * Start: intact assembled packshot.
 * End: exploded teardown along assembly axes — not unboxing.
 * Video: parts travel along those axes (~4–5s). H3 native stereo; library BGM only if Seedance runs.
 *
 * Honest UX: stylized shells + simple geometric internals — not CAD-accurate PCBs.
 */

import { nameIsClaimImage1IsObjectLine } from "@/lib/prompt-balance-contract";

export const PRODUCT_EXPLODE_DURATION_SEC = 4;

export type ProductExplodeFrame = "start" | "end";

export type ProductExplodePromptInput = {
  product: string;
  conceptMode?: boolean;
  aspectRatio?: string;
  frame: ProductExplodeFrame;
};

const NO_TEXT =
  "TEXTLESS: no captions, no callout labels, no watermarks, no UI, no invented brand words. Keep real logo readable if already on @Image1.";

const SOLID_BACKDROP =
  "Solid seamless light-gray studio backdrop only — no checkerboard, no transparency, no cutout matte.";

function subject(input: ProductExplodePromptInput): string {
  return (
    input.product.trim() ||
    (input.conceptMode ? "brand device / mascot product" : "the product")
  );
}

function photoIdentityLock(productName: string): string {
  const named = productName.trim();
  return [
    "IMAGE 1 pixels are the ONLY product identity for this still.",
    nameIsClaimImage1IsObjectLine(named || undefined),
    named
      ? `Call it "${named}" as a label only — keep @Image1's real category and silhouette (car stays a car, phone stays a phone, serum bottle stays a bottle).`
      : "Keep @Image1's exact object — shape, materials, colors, packaging.",
    "Do not invent a different SKU because of the typed name.",
  ].join(" ");
}

/** Nano Banana still — start = whole hero, end = stylized explode. */
export function buildProductExplodeStillPrompt(
  input: ProductExplodePromptInput,
): string {
  const hero = subject(input);
  const ar = input.aspectRatio?.trim() || "16:9";
  const lock = photoIdentityLock(hero);

  if (input.frame === "start") {
    return [
      `Photoreal commercial still, ${ar}, soft even studio light.`,
      SOLID_BACKDROP,
      lock,
      `START frame: centered INTACT assembled hero packshot of the @Image1 object — premium tech advertising.`,
      "Whole product assembled as sold in @Image1. No hands, no clutter, no substitute category.",
      "If @Image1 is earbuds + case: buds SEATED in the wells. If @Image1 is a phone/car/bottle: show that object intact — not earbuds.",
      NO_TEXT,
    ].join(" ");
  }

  return [
    `Photoreal commercial still, ${ar}, same solid light-gray studio backdrop as the start plate.`,
    SOLID_BACKDROP,
    lock,
    `END frame: MECHANICAL exploded teardown of the SAME @Image1 object — parts separated along real assembly axes, like a premium product CGI teardown.`,
    "NOT unboxing: do not float the hero above an empty shell unless @Image1 is literally that layout.",
    "Teardown axes must match @Image1's category (phone panels, car body, bottle cap, earbud stem, etc.) — never swap to earbuds/power bank if @Image1 is something else.",
    "Internals: simple solid cylinders or discs. NEVER liquid-metal blobs, mercury, organic goo, or readable PCB brands.",
    "Keep the main silhouette recognizable. Parts hover with even gaps. Minimalist tech commercial.",
    NO_TEXT,
  ].join(" ");
}

/** H3 image-to-video with start + end frames (same dual-plate contract as Seedance). */
export function buildProductExplodeVideoPrompt(input: {
  product: string;
  conceptMode?: boolean;
  durationSec?: number;
}): string {
  const hero =
    input.product.trim() ||
    (input.conceptMode ? "brand device" : "the product");
  const sec = input.durationSec ?? PRODUCT_EXPLODE_DURATION_SEC;
  return [
    `Stylized product TEARDOWN animation, ${sec}s, continuous morph from Image 1 (intact assembled @Image1 object) to Image 2 (exploded parts of the same object).`,
    nameIsClaimImage1IsObjectLine(hero),
    "Motion: parts travel along assembly axes and hover — shells split, panels separate. Premium tech commercial, solid light-gray studio.",
    "Keep Image 1 identity locked — same category, colors, and outer form; only separation state changes.",
    "FORBIDDEN: swapping to a different product category, unboxing the wrong SKU, liquid-metal internals, checkerboard background, hard cuts, on-screen labels, violent destruction.",
  ].join(" ");
}
