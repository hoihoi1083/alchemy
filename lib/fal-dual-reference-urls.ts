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
    `PRODUCT HERO LOCK (this slide and every slide): IMAGE 1 is the exact photo of ${name}.`,
    "Show that SAME product as a clear, recognizable hero — same shape, materials, colors, beads/charm/packaging details.",
    "Match IMAGE 1 colors exactly — do not recolor beads/metal (e.g. brown goldstone must not become pink/peach).",
    "Even tip / educational / metaphor slides: keep IMAGE 1's product in frame (flat-lay, macro, held, or gently worn) in the SAME art medium as the shared series DNA.",
    "Do NOT replace it with a different jewelry SKU, crystal, bottle, cartoon bead face, stock prop, or science diagram substitute.",
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
export function carouselSeriesConsistencyLock(visualDna?: string): string {
  const dna = visualDna?.trim() || "same medium, palette, lighting, and character language";
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
}): string {
  const role = input.role.trim().toLowerCase();
  if (role === "cover" || input.index <= 1) {
    return `SLIDE VARIATION (${input.index}/${input.total}, cover): Full hero poster — product dominant, strong title hierarchy, generous negative space.`;
  }
  if (role === "summary" || input.index >= input.total) {
    return `SLIDE VARIATION (${input.index}/${input.total}, summary): Recap / checklist / outro card — DIFFERENT layout from cover (e.g. bottom nav bar, tip list, or split panel). Same product, new composition.`;
  }
  return `SLIDE VARIATION (${input.index}/${input.total}, ${role || "point"}): Educational tip card — MUST differ from cover: new crop or angle of the SAME product, rearranged props, or typography-led tip layout. Do NOT paste cover pixels with only headline swapped.`;
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
