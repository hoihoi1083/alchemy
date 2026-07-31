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
