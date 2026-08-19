/**
 * Vacuum inflate (真空充气) — MiniMax H3 start→end (Seedance fallback).
 * Auto stills: vacuum-tight wrap → inflated clear bubble → ~4s morph (H3 floor 5s).
 * The uploaded SKU stays the hero (phone stays a phone). The bag/bubble is the effect.
 */

export const VACUUM_INFLATE_DURATION_SEC = 4;

export type VacuumInflateFrame = "start" | "end";

export type VacuumInflatePromptInput = {
  product: string;
  conceptMode?: boolean;
  aspectRatio?: string;
  frame: VacuumInflateFrame;
};

const NO_TEXT =
  "TEXTLESS: no captions, no watermarks, no UI, no invented brand words, no fake product names (no Vitamin C Essence, no 维他命, no net-weight labels). Keep any real logo already on @Image1 readable.";

function subject(input: VacuumInflatePromptInput): string {
  return (
    input.product.trim() ||
    (input.conceptMode ? "the uploaded brand mark" : "the uploaded product")
  );
}

const NO_SWAP = (hero: string) =>
  [
    `Hero is ${hero}. Reproduce that exact object (silhouette, materials, camera module, colors).`,
    "Do NOT convert it into a foil sachet, seasoning packet, skincare pouch, or any other SKU.",
    "Do NOT invent a different product category just because the effect is 'inflate'.",
  ].join(" ");

const WRAP_RULES =
  "If the upload is already a flexible pouch/pack, vacuum/inflate THAT same pouch. If it is a rigid product (phone, bottle, box, device), keep the product unchanged and wrap it in a CLEAR transparent vacuum film / inflatable bubble — the product must stay large and fully recognizable inside.";

/** Nano Banana still — start = vacuum-tight, end = inflated bubble. */
export function buildVacuumInflateStillPrompt(
  input: VacuumInflatePromptInput,
): string {
  const hero = subject(input);
  const ar = input.aspectRatio?.trim() || "9:16";

  if (input.frame === "start") {
    return [
      `Photoreal commercial still, ${ar}, studio soft light on a clean light-gray seamless backdrop.`,
      `Identity lock: @Image1 is the ONLY hero — ${hero}.`,
      NO_SWAP(hero),
      WRAP_RULES,
      `START frame: ${hero} from @Image1 is the hero, occupying most of the frame.`,
      "A clear vacuum film is sucked tight around it — wrinkles, seal edges, airless cling wrap. The product itself is NOT flattened into a 2D packet; you can still clearly see it is the same object.",
      NO_TEXT,
    ].join(" ");
  }

  return [
    `Photoreal commercial still, ${ar}, studio soft light on the SAME seamless backdrop as the start plate.`,
    "@Image1 is the vacuum-flat start plate (continuity). If @Image2 is present, that is the original product — match it exactly.",
    NO_SWAP(hero),
    WRAP_RULES,
    `END frame: the SAME ${hero} still large and centered, now inside a FULLY AIR-INFLATED clear bubble / taut transparent pack.`,
    "Only the wrap volume changes — plump, rounded, glossy film with air. The product inside must remain obviously the uploaded SKU, not a generic pouch.",
    NO_TEXT,
  ].join(" ");
}

/** Start→end video prompt (H3 first, Seedance fallback). */
export function buildVacuumInflateVideoPrompt(input: {
  product: string;
  conceptMode?: boolean;
  durationSec?: number;
}): string {
  const hero =
    input.product.trim() ||
    (input.conceptMode ? "the uploaded brand mark" : "the uploaded product");
  const sec = input.durationSec ?? VACUUM_INFLATE_DURATION_SEC;
  return [
    `Vacuum-inflate effect, ${sec}s, continuous motion from Image 1 (vacuum-tight wrap) to Image 2 (inflated clear bubble).`,
    `Keep ${hero} identity locked and VISIBLE in every frame — same silhouette, materials, and colors.`,
    "Only the transparent bag/bubble inflates: air rushes in, wrinkles smooth, wrap expands around the unchanged product.",
    "Never morph the product into a foil sachet or a different SKU. No hard cuts, no on-screen text, no invented labels.",
  ].join(" ");
}
