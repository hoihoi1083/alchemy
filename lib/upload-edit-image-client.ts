import { uploadFileViaLibraryPresign } from "@/lib/library-presign-upload-client";

/**
 * Browser upload for /edit-image-2.
 * Prefer direct R2 PUT (presign) so large posters never hit Vercel's ~4.5MB
 * body limit ("Request Entity Too Large" → non-JSON parse errors).
 */

export type UploadEditImageOptions = {
  failMessage?: string;
  largeFileMessage?: string;
  /** Asset display name in library. */
  name?: string;
};

/**
 * Upload an image File; returns a durable http(s) / library asset URL.
 */
export async function uploadEditImageFile(
  file: File,
  opts: UploadEditImageOptions = {},
): Promise<string> {
  return uploadFileViaLibraryPresign(file, {
    kind: "image",
    failMessage: opts.failMessage,
    largeFileMessage: opts.largeFileMessage,
    name: opts.name?.trim() || file.name || "edit-image-2-upload",
    extraFallbacks: [
      {
        url: "/api/upload-edit-image",
        urlKey: "url",
      },
    ],
  });
}
