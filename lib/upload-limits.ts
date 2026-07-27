/**
 * Vercel serverless request body is ~4.5MB. Only use same-origin
 * `/api/library/upload` as a fallback under this size.
 */
export const VERCEL_SAFE_UPLOAD_BYTES = 4 * 1024 * 1024;

export function isSafeForServerUpload(sizeBytes: number): boolean {
  return Number.isFinite(sizeBytes) && sizeBytes > 0 && sizeBytes <= VERCEL_SAFE_UPLOAD_BYTES;
}
