/** Default fal image endpoints for the marketing wizard (Nano Banana 2). */
export const BANANA2_EDIT_ENDPOINT = "fal-ai/nano-banana-2/edit";
export const BANANA2_TEXT_ENDPOINT = "fal-ai/nano-banana-2";

export function defaultEditEndpoint(): string {
  return process.env.FAL_IMAGE_EDIT_ENDPOINT?.trim() || BANANA2_EDIT_ENDPOINT;
}

export function defaultTextEndpoint(): string {
  return process.env.FAL_IMAGE_ENDPOINT?.trim() || BANANA2_TEXT_ENDPOINT;
}

/**
 * Known-good fal image endpoints the wizard is allowed to call. Requests may
 * pass an `endpoint` field, but we must never forward arbitrary strings to
 * `fal.subscribe` — that would let an authenticated user run any (expensive)
 * fal model at our expense. Anything not on this list falls back to the plan
 * default.
 */
const ALLOWED_IMAGE_ENDPOINTS = new Set<string>([
  BANANA2_EDIT_ENDPOINT,
  BANANA2_TEXT_ENDPOINT,
  "fal-ai/nano-banana/edit",
  "fal-ai/nano-banana",
  "fal-ai/nano-banana-pro/edit",
  "fal-ai/nano-banana-pro",
]);

/**
 * Return `raw` only if it is a recognised (or operator-configured) fal image
 * endpoint; otherwise return `fallback`. Never throws.
 */
export function sanitizeImageEndpoint(
  raw: string | null | undefined,
  fallback: string,
): string {
  const value = raw?.trim();
  if (!value) return fallback;
  const envAllowed = [
    process.env.FAL_IMAGE_EDIT_ENDPOINT?.trim(),
    process.env.FAL_IMAGE_ENDPOINT?.trim(),
  ].filter((v): v is string => Boolean(v));
  if (ALLOWED_IMAGE_ENDPOINTS.has(value) || envAllowed.includes(value)) {
    return value;
  }
  return fallback;
}

/** Prefer edit when we must pass image_urls (e.g. Mode B brand logo). */
export function resolveEditEndpointWhenNeeded(
  raw: string | null | undefined,
  needsImageUrls: boolean,
): string {
  if (needsImageUrls) {
    const preferred = defaultEditEndpoint();
    const sanitized = sanitizeImageEndpoint(raw, preferred);
    // Client often sends text-to-image; that path ignores logo refs — force edit.
    if (!sanitized.includes("/edit")) return preferred;
    return sanitized;
  }
  return sanitizeImageEndpoint(raw, defaultTextEndpoint());
}

/** Seedance video endpoints we intentionally support. */
const ALLOWED_VIDEO_ENDPOINTS = new Set<string>([
  "bytedance/seedance-2.0/text-to-video",
  "bytedance/seedance-2.0/image-to-video",
  "bytedance/seedance-2.0/reference-to-video",
  "bytedance/seedance-2.0/fast/text-to-video",
  "bytedance/seedance-2.0/fast/image-to-video",
  "bytedance/seedance-2.0/fast/reference-to-video",
  "minimax/h3/text-to-video",
  "minimax/h3/image-to-video",
  "minimax/h3/reference-to-video",
]);

/**
 * Same idea as sanitizeImageEndpoint, for Seedance video routes.
 * Client-supplied `endpoint_text|image|reference` must match the allowlist.
 */
export function sanitizeVideoEndpoint(
  raw: string | null | undefined,
  fallback: string,
): string {
  const value = raw?.trim();
  if (!value) return fallback;
  const envAllowed = [
    process.env.FAL_VIDEO_ENDPOINT?.trim(),
    process.env.FAL_VIDEO_FAST_ENDPOINT?.trim(),
  ].filter((v): v is string => Boolean(v));
  if (ALLOWED_VIDEO_ENDPOINTS.has(value) || envAllowed.includes(value)) {
    return value;
  }
  return fallback;
}
