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
 */
export function carouselSeriesConsistencyLock(visualDna?: string): string {
  const dna = visualDna?.trim() || "same medium, palette, lighting, and character language";
  return [
    `SERIES CONSISTENCY LOCK: Shared visual DNA for ALL slides: ${dna}.`,
    "This slide must clearly belong in the SAME carousel — same art medium (photoreal vs soft 3D/illustration), same lighting softness, same prop language.",
    "Tip/point slides may change layout and props, but MUST NOT switch medium mid-series.",
    "Do NOT make one tip slide a photorealistic human wrist/bathroom/gym lifestyle cutaway if other slides are soft product flat-lays.",
    "Do NOT invent a one-off photoreal model-wear scene or a cartoon mascot that breaks series cohesion.",
  ].join(" ");
}

/** After cover is generated: later slides see cover pixels as the last image_urls entry. */
export function carouselCoverSeriesAnchorHint(input?: {
  hasProductPhoto?: boolean;
}): string {
  const parts = [
    "SERIES COVER ANCHOR: The LAST image in image_urls is the already-generated COVER slide of THIS carousel.",
    "Match that cover's art medium, lighting softness, surface/prop language, and overall look.",
  ];
  if (input?.hasProductPhoto !== false) {
    parts.push(
      "IMAGE 1 is still the exact product hero — this tip/summary slide MUST show IMAGE 1's product clearly (same colors/materials as IMAGE 1 and the cover).",
      "Do not invent mascots, different jewelry colors, or a new photography style that conflicts with the cover.",
    );
  } else {
    parts.push(
      "Match topic, typography, and shared series DNA from the cover — do not invent a fake product SKU or mascot.",
      "Do not invent a new photography style that conflicts with the cover.",
    );
  }
  return parts.join(" ");
}
