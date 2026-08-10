/**
 * Shared prompt-balance contract for fal video scripts.
 *
 * Priority when inputs conflict (any combo — not one SKU pair):
 * 1. @Video1 (user / research MP4) = spine (shots, locations, camera, pacing)
 * 2. @Image1 (uploaded product photo) = on-screen OBJECT — pixels win
 * 3. Name + title/headline = CLAIM only (captions / poster type / voice) — never a new SKU
 * 4. Research angle / viral cover = tone + IMAGE 2 layout/grade — not a new hero
 * 5. Duration = compress the chosen spine into N seconds
 * 6. Look (art style) = grade only — never a new plot
 */

/** Still + carousel: typed name never redraws the uploaded hero. */
export function nameIsClaimImage1IsObjectLine(productName?: string): string {
  const name = productName?.trim();
  const named = name ? `"${name}"` : "the product name";
  return `NAME VS PHOTO: ${named} is CLAIM only (topic / captions / why-buy). IMAGE 1 pixels are the on-screen OBJECT. If ${named} names a different category than IMAGE 1 (e.g. power bank vs bottle), KEEP IMAGE 1's exact item — never invent a substitute SKU that matches the name.`;
}

export const PROMPT_BALANCE_PRIORITY = [
  "video1_spine",
  "image1_object",
  "name_title_claim",
  "research_tone",
  "duration_compress",
  "look_grade",
] as const;

/**
 * Canonical @Video1 spine sentence. H3 converts @Image/@Video tags via
 * seedancePromptToMinimaxH3. Never call Video 1 “optional pacing.”
 */
export const VIDEO1_SPINE_SCREENPLAY =
  "@Video1 is the spine / screenplay. Follow its shot order, locations, camera path, and cut rhythm for the full duration. " +
  "@Image1…N are wardrobe only — lock product/face/room identity. Do not invent a new commercial. " +
  "If @Video1 goes shop → cream → hand → logo, the output must too.";

/** Identity lock — same wording for product-assistant, refine, R2V, storyboard. */
export function productIdentityContractLines(opts?: {
  /** When true, emphasize @Video1 spine + @Image1 object swap. */
  hasReferenceVideo?: boolean;
  /** Concept/service shorts — no packshot packaging language. */
  conceptMode?: boolean;
}): string[] {
  if (opts?.conceptMode && opts?.hasReferenceVideo) {
    return [
      "IDENTITY CONTRACT (mandatory — CONCEPT / SERVICE):",
      VIDEO1_SPINE_SCREENPLAY,
      "- @Video1 = SPINE / SCREENPLAY: shot order, locations, camera path, cut rhythm for the full duration.",
      "- NAME + TITLE/HEADLINE = CLAIM: the service / idea / offer being sold.",
      "- Stills are wardrobe only (room, hands, props) — NOT a SKU packaging swap and NOT a new commercial.",
      "- Do NOT invent a studio-only packshot catalog that ignores @Video1 locations/structure.",
      "- Do NOT recreate reference faces, brands, logos, or on-screen text.",
      "- Prefer atmosphere, hands, tools, rooms, silhouettes that sell the SERVICE / IDEA.",
    ];
  }
  if (opts?.conceptMode) {
    return [
      "IDENTITY CONTRACT (mandatory — CONCEPT / SERVICE):",
      "- NAME + TITLE/HEADLINE = CLAIM: the service / idea / offer being sold.",
      "- Optional stills lock scene mood (room, hands, props) — not a product SKU catalog.",
      "- PHOTO VISION guesses are appearance-only — never override the named service topic.",
      "- Prefer atmosphere, hands, tools, rooms, silhouettes over fake product packshots.",
    ];
  }
  if (opts?.hasReferenceVideo) {
    return [
      "IDENTITY CONTRACT (mandatory):",
      VIDEO1_SPINE_SCREENPLAY,
      "- @Video1 = SPINE / SCREENPLAY: shot order, locations, camera path, cut rhythm for the full duration.",
      "- @Image1…N = WARDROBE / OBJECT ONLY: lock product/face/room identity in those same shots. Do not invent a new commercial.",
      "- Product NAME + TITLE/HEADLINE = CLAIM only (what it is / why buy). They must not change the on-screen object away from @Image1.",
      "- If name/headline category disagrees with @Image1 pixels, KEEP @Image1 appearance and sell the named use-case around that object.",
      "- If @Video1 demos a different gadget category, keep @Video1 scenes/settings/camera and show @Image1 as the held/placed hero — do not copy wrong UI/cables.",
      "- Do NOT invent a studio-only packshot story that ignores @Video1 locations/structure.",
      "- Do NOT recreate reference faces, brands, logos, or on-screen text.",
    ];
  }
  return [
    "IDENTITY CONTRACT (mandatory):",
    "- @Image1 (uploaded product photo) = on-screen OBJECT. Pixels win: shape, color, materials, packaging.",
    "- Product NAME + TITLE/HEADLINE = CLAIM only (what we sell / why buy / captions / poster type). They must not redraw the object.",
    `- ${nameIsClaimImage1IsObjectLine()}`,
    "- Research angle = tone / hook for captions only — not a new product and not new locations that replace IMAGE 1.",
    "- Research / reference stills = IMAGE 2 layout or grade only — never replace the IMAGE 1 hero.",
    "- Do not morph @Image1 into a different-looking item.",
  ];
}

/** Final fal prompt tail for research/reference R2V. */
export const R2V_FAL_GUARDRAILS =
  VIDEO1_SPINE_SCREENPLAY +
  " " +
  "@Image1 replaces ONLY the product object (shape/color/packaging) in those shots. " +
  "Product name and title are labels only — they must not change the on-screen object away from @Image1. " +
  "Do not recreate reference faces, brands, or on-screen text.";

/** Concept/service R2V tail — no packshot packaging assumption. */
export const R2V_CONCEPT_FAL_GUARDRAILS =
  VIDEO1_SPINE_SCREENPLAY +
  " " +
  "Sell the named SERVICE / IDEA / OFFER from the title — not a product packaging swap. " +
  "Stills are wardrobe only (room/hands/props), not a SKU. " +
  "Do not recreate reference faces, brands, or on-screen text.";

const CAMERA_LANGUAGE_RE =
  /\b(push[- ]?in|pull[- ]?out|orbit|pan|tilt|dolly|truck|handheld|crane|tracking|whip|rack\s*focus|parallax|arc\s*shot|static\s+locked|slow\s+push|slow\s+pull|camera\s+movement|@\s*Video\s*1)\b/i;

/** True when DeepSeek / R2V script already specifies motion — do not append template Slow Push In. */
export function promptAlreadySpecifiesCamera(prompt: string): boolean {
  return CAMERA_LANGUAGE_RE.test(prompt);
}

/** True when this generate is reference-to-video with a motion spine. */
export function promptHasVideo1(prompt: string): boolean {
  return /@\s*Video\s*1\b/i.test(prompt) || /\bVideo\s+1\b/i.test(prompt);
}
