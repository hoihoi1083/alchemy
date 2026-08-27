import { nameIsClaimImage1IsObjectLine } from "@/lib/prompt-balance-contract";

/**
 * Composition remap: IMAGE 1 = composition shell (reference board).
 * IMAGE 2 (when present) = user's product photo — mandatory SKU identity in hub props.
 * Shell stays first so layout wins; product is never packshot-first.
 */

/** Extra identity lock when composition-remap dual pixels are attached. */
export function compositionRemapProductIdentityHint(): string {
  return [
    "COMPOSITION REMAP PRODUCT LOCK: IMAGE 2 is the user's exact product photo.",
    "Every bottle/pack/SKU on the output board must match IMAGE 2 pixels (shape, materials, colors, cap).",
    "Do not invent a different product from the topic name. Hub hero may hold IMAGE 2; floor/table props near the hub must also be IMAGE 2.",
    "IMAGE 1 remains board geometry only — never copy IMAGE 1's original product props.",
  ].join(" ");
}
export async function buildFalCompositionRemapImageUrls(input: {
  upload: (file: File) => Promise<string>;
  styleRef: File | null;
  productRef?: File | null;
}): Promise<string[]> {
  const urls: string[] = [];
  if (input.styleRef) {
    urls.push(await input.upload(input.styleRef));
  }
  if (input.productRef) {
    urls.push(await input.upload(input.productRef));
  }
  return urls;
}

/**
 * Build fal `image_urls` for physical product + style reference.
 *
 * nano-banana /edit treats the FIRST image as the primary subject to transform.
 * So product MUST come first; style reference second.
 *
 * Contract (research cover and manual style upload both use styleRef):
 * - productRef → IMAGE 1 (product identity / hero to keep) — user 主圖
 * - styleRef  → IMAGE 2 (layout / mood only) — research post OR user style upload
 * - angles    → IMAGE 3+ (optional same-SKU detail) — user 其他角度 only
 */
export async function buildFalLayoutTransferImageUrls(input: {
  upload: (file: File) => Promise<string>;
  styleRef: File | null;
  productRef: File | null;
  productAngles?: File[];
}): Promise<string[]> {
  const urls: string[] = [];
  if (input.productRef) {
    urls.push(await input.upload(input.productRef));
  }
  if (input.styleRef) {
    urls.push(await input.upload(input.styleRef));
  }
  for (const angle of input.productAngles ?? []) {
    urls.push(await input.upload(angle));
  }
  return urls;
}

/** Extra prompt guard when dual pixels are present (product = IMAGE 1, style = IMAGE 2). */
export function dualProductIdentityHint(hasProductAngles: boolean): string {
  const base =
    "IMAGE 1 is the user's exact product hero — preserve that item's identity (shape, materials, character/mascot look). IMAGE 2 is style/layout reference ONLY — borrow composition, lighting mood, and typography energy from IMAGE 2; never show IMAGE 2's product, jewelry, or props as the hero.";
  if (!hasProductAngles) return base;
  return `${base} Additional photos after IMAGE 2 are optional alternate angles of the SAME user product from IMAGE 1 only.`;
}

/**
 * Hard lock for multi-slide outputs when the user uploaded a product photo.
 * Tip/edu slides otherwise invent substitute jewelry, diagrams, or mascots.
 */
export function carouselProductHeroLock(input?: {
  productName?: string;
  hasProductAngles?: boolean;
}): string {
  const name = input?.productName?.trim() || "the user's product";
  const parts = [
    "PRODUCT HERO LOCK (this slide and every slide): IMAGE 1 pixels ARE the product. Show that SAME photographed item as a clear hero — same shape, materials, colors, cap/packaging.",
    nameIsClaimImage1IsObjectLine(name === "the user's product" ? undefined : name),
    "Match IMAGE 1 colors exactly — do not recolor beads/metal (e.g. brown goldstone must not become pink/peach).",
    "Even tip / educational / metaphor slides: keep IMAGE 1's item in frame (flat-lay, macro, held, or gently worn) in the SAME art medium as the shared series DNA.",
    "Do NOT replace it with a different jewelry SKU, crystal, bottle, cartoon bead face, stock prop, power bank, power station, charger brick, or science diagram substitute.",
    "TIP / SELLING-POINT / FEATURE copy (fast charging, mAh, ports, safety, capacity, etc.) is typography only — never illustrate the topic by drawing a different gadget than IMAGE 1 (e.g. a 快速充電 tip must not become a charger if IMAGE 1 is a bottle).",
    "Do NOT invent cute brand mascots (flask/beaker/lab characters, cartoon faces) instead of the product.",
    "Teach with typography and staging around IMAGE 1 — never invent a different product to illustrate the tip.",
    "If teaching wear/care tips: stage the product in the series aesthetic (soft set / vanity / cloth) — do NOT jump to a photoreal bathroom/gym/yoga lifestyle cutaway that breaks the carousel look.",
  ];
  if (input?.hasProductAngles) {
    parts.push(
      "Extra product-angle photos (if attached) are the SAME SKU only — use them for alternate views, not a different item.",
    );
  }
  return parts.join(" ");
}

/**
 * Keep every carousel slide in one visual family (avoids tip slides flipping to
 * photoreal lifestyle while cover/tips stay soft 3D / illustrated).
 * Consistency = medium/palette/product — NOT the same photo with swapped text.
 */
export function carouselSeriesConsistencyLock(
  visualDna?: string,
  opts?: { modelWear?: boolean },
): string {
  const dna = visualDna?.trim() || "same medium, palette, lighting, and character language";
  if (opts?.modelWear) {
    return [
      `SERIES CONSISTENCY LOCK: Shared visual DNA for ALL slides: ${dna}.`,
      "SERIES MODEL-WEAR LOCK: Every slide MUST show a real person wearing or using IMAGE 1's product — hands, wrist, neck, or held clearly in frame.",
      "Vary pose, crop, wardrobe framing, and secondary props per slide — NEVER reuse the same photo with only text changed.",
      "Keep the same art medium and lighting family across the carousel (photoreal lifestyle stays photoreal lifestyle).",
      "No product-only catalog cutouts, no empty table still life with no person, no cute mascot/flask character replacing the model.",
    ].join(" ");
  }
  return [
    `SERIES CONSISTENCY LOCK: Shared visual DNA for ALL slides: ${dna}.`,
    "This slide must clearly belong in the SAME carousel — same art medium (photoreal vs soft 3D/illustration vs flat vector), same lighting softness, same product/character identity.",
    "CRITICAL MEDIUM LOCK: Never mix styles inside one carousel (e.g. flat vector + photoreal + Pixar CGI). Match the cover's render medium exactly.",
    "CRITICAL VARIATION: Each slide MUST use a DISTINCT composition / camera crop / prop arrangement — NEVER reuse the same flat-lay or hand pose with only text changed.",
    "Cover = hero poster; point/tip slides = new angle, crop, or staging (macro detail, alternate flat-lay, list/card layout, side props rearranged); summary = recap layout.",
    "Tip/point slides may change layout and secondary props, but MUST NOT switch medium mid-series.",
    "If a character/mascot appears on the cover, reuse that SAME character design — do not invent a new robot, costume, or art style on later slides.",
    "Do NOT make one tip slide a photorealistic human wrist/bathroom/gym lifestyle cutaway if other slides are soft product flat-lays.",
    "Do NOT invent a one-off photoreal model-wear scene or a cartoon mascot that breaks series cohesion.",
  ].join(" ");
}

/** Role-specific staging so tip slides do not clone the cover. */
export function carouselSlideRoleVariationHint(input: {
  role: string;
  index: number;
  total: number;
  /** When true, every role must keep a real person wearing/using the product. */
  modelWear?: boolean;
}): string {
  const role = input.role.trim().toLowerCase();
  if (input.modelWear) {
    if (role === "hero" || role === "cover" || input.index <= 1) {
      return `SLIDE VARIATION (${input.index}/${input.total}, ${role || "hero"}): Lifestyle hero — real person wearing/using the product, strong title hierarchy, product clearly visible.`;
    }
    if (role === "offer" || role === "summary" || input.index >= input.total) {
      return `SLIDE VARIATION (${input.index}/${input.total}, ${role || "offer"}): CTA / outro lifestyle — NEW pose or crop of a person with the product (e.g. closer wrist detail, different angle). Do NOT clone the hero photo.`;
    }
    return `SLIDE VARIATION (${input.index}/${input.total}, ${role || "point"}): Feature / tip lifestyle — MUST differ from hero: new crop (macro of product on body, alternate pose, or props rearranged) with a real person still wearing/using IMAGE 1. Do NOT paste hero pixels with only headline swapped.`;
  }
  if (role === "hero") {
    return `SLIDE VARIATION (${input.index}/${input.total}, hero): Full hero poster — product dominant, strong title hierarchy, generous negative space.`;
  }
  if (role === "selling-points") {
    return `SLIDE VARIATION (${input.index}/${input.total}, selling-points): Feature / bullet layout — MUST differ from hero: new crop or angle of the SAME product, rearranged props, or typography-led feature panel. Do NOT paste hero pixels with only headline swapped.`;
  }
  if (role === "offer") {
    return `SLIDE VARIATION (${input.index}/${input.total}, offer): CTA / shop mood — DIFFERENT composition from hero (badge band, split panel, or alternate product staging). Same product, new layout.`;
  }
  if (role === "cover" || input.index <= 1) {
    return `SLIDE VARIATION (${input.index}/${input.total}, cover): Full hero poster — product dominant, strong title hierarchy, generous negative space.`;
  }
  if (role === "summary" || input.index >= input.total) {
    return `SLIDE VARIATION (${input.index}/${input.total}, summary): Recap / checklist / outro card — DIFFERENT layout from cover (e.g. bottom nav bar, tip list, or split panel). Same product, new composition.`;
  }
  return `SLIDE VARIATION (${input.index}/${input.total}, ${role || "point"}): Educational tip card — MUST differ from cover: new crop or angle of the SAME product, rearranged props, or typography-led tip layout. Do NOT paste cover pixels with only headline swapped. Do NOT invent a charger, power station, or new SKU to illustrate the tip headline.`;
}

/**
 * Tip-slide image_urls: product (+ style) refs only.
 * Do not append the generated cover — nano-banana/edit clones cover pixels and only swaps text.
 */
export function teachingCarouselTipImageUrls(
  baseUrls: string[] | null | undefined,
): string[] | null {
  if (!baseUrls?.length) return baseUrls ?? null;
  return [...baseUrls];
}

/**
 * After the cover already used the reference poster: tip slides share look, not that frame.
 * Stronger than generic variation — layout-transfer otherwise copies IMAGE 2 pose onto every card.
 */
export function carouselTipSlideLookFollowHint(input?: {
  hasStyleReference?: boolean;
}): string {
  const parts = [
    "TIP/SUMMARY SLIDE — FOLLOW SERIES LOOK, NOT THE COVER FRAME:",
    "The COVER already used the reference poster layout. This slide MUST NOT reuse that same photo, pose, crop, or poster grid with only headline/body swapped.",
    "Keep the same visual family: palette, lighting softness, photography/illustration medium, and typography energy.",
  ];
  if (input?.hasStyleReference !== false) {
    parts.push(
      "IMAGE 2 is series look only on this slide — borrow color, light, and type mood. Do NOT copy IMAGE 2's model pose, camera distance, or centered-hero staging (COVER-only).",
      "OVERRIDE: ignore any 'Staging pose: KEEP' or SCENE ESSAY composition lock for this slide — those apply to the cover only.",
    );
  }
  parts.push(
    "IMAGE 1 product must still appear clearly. Teach with a NEW crop, angle, or layout (macro, list/tip panel, split, recap).",
  );
  return parts.join(" ");
}

/**
 * Series look guidance for tip slides after the cover exists.
 * Prefer text DNA over feeding cover pixels — cover-as-image_url makes models clone the cover.
 * Never attach the cover as the ONLY / first image_url (nano-banana/edit treats IMAGE 1 as the edit subject).
 */
export function carouselCoverSeriesAnchorHint(input?: {
  hasProductPhoto?: boolean;
  /** When true, cover is attached as last image_urls entry (after product/style refs). */
  pixelAnchor?: boolean;
}): string {
  const pixel = Boolean(input?.pixelAnchor);
  const parts = pixel
    ? [
        "SERIES COVER ANCHOR: The LAST image in image_urls is the already-generated COVER slide — use it ONLY for palette / medium / character identity cues.",
        "DO NOT clone the cover composition, prop positions, camera framing, OR any on-image text from the cover.",
        "Create a NEW layout for this tip/summary slide and paint ONLY this slide's unique headline/body (never the cover headline).",
        "Match that cover's art medium EXACTLY (photoreal stays photoreal; flat vector stays flat vector; 3D CGI stays 3D CGI) — never switch to a different render style.",
        "If the cover shows a character, keep that SAME character design — do not invent a new robot, mascot, or costume.",
      ]
    : [
        "SERIES LOOK (text DNA only — no cover pixels attached): Keep the same art medium, palette, and setting family as the carousel cover.",
        "This tip/summary slide MUST use a NEW composition and NEW on-image copy — do not redesign the cover with the same headline.",
        "If any human or character appears, keep the SAME identity/costume language across the series — do not invent a new robot, mascot, or cartoon figure on later slides.",
      ];
  if (input?.hasProductPhoto !== false) {
    parts.push(
      "IMAGE 1 is still the exact product hero — show IMAGE 1's product clearly (same colors/materials).",
      "Do not invent mascots, different jewelry colors, or a new photography style that conflicts with the series.",
    );
  } else {
    parts.push(
      "Match topic, typography, and shared series DNA — do not invent a fake product SKU or mascot.",
      "Do not invent a new photography style that conflicts with the series.",
    );
  }
  return parts.join(" ");
}

/** Force tip slides to paint their own copy — stops cover-headline reuse across the carousel. */
export function carouselUniqueCopyHint(slide: {
  index: number;
  role: string;
  title: string;
  body?: string;
  takeaway?: string;
}): string {
  const title = slide.title.trim();
  const body = slide.body?.trim() || "";
  const takeaway = slide.takeaway?.trim() || "";
  return [
    `UNIQUE SLIDE COPY LOCK (slide ${slide.index}, role ${slide.role}):`,
    title ? `Paint headline EXACTLY ONCE: "${title}".` : "",
    body && body !== title ? `Paint supporting line EXACTLY ONCE: "${body}".` : "",
    takeaway && takeaway !== title && takeaway !== body
      ? `Optional closing line once: "${takeaway}".`
      : "",
    "This slide's on-image wording MUST differ from the cover and from every other slide — never reuse one shared headline across the carousel.",
  ]
    .filter(Boolean)
    .join(" ");
}
