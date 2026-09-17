import { isSafeForServerUpload } from "@/lib/upload-limits";

/**
 * Browser upload for /edit-image-2.
 * Prefer direct R2 PUT (presign) so large posters never hit Vercel's ~4.5MB
 * body limit ("Request Entity Too Large" → non-JSON parse errors).
 */

const DEFAULT_FAIL = "Upload failed";
const DEFAULT_LARGE =
  "File is too large for the server upload path (~4.5MB). Enable R2 CORS for direct upload, compress the image, or Choose from library.";

async function readApiJson(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text();
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    if (res.status === 413 || /request entity too large/i.test(text)) {
      return { error: DEFAULT_LARGE, code: "REQUEST_TOO_LARGE" };
    }
    return { error: text.slice(0, 160) || "Request failed." };
  }
}

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
  const failMsg = opts.failMessage?.trim() || DEFAULT_FAIL;
  const largeMsg = opts.largeFileMessage?.trim() || DEFAULT_LARGE;
  const contentType = file.type || "image/png";
  const name = opts.name?.trim() || file.name || "edit-image-2-upload";

  const presignRes = await fetch("/api/library/presign-upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      kind: "image",
      contentType,
      name,
      sizeBytes: file.size,
    }),
  });
  const presign = await readApiJson(presignRes);

  if (
    presignRes.ok &&
    typeof presign.uploadUrl === "string" &&
    typeof presign.downloadUrl === "string"
  ) {
    const orphanId =
      typeof presign.assetId === "string" ? (presign.assetId as string) : null;
    const purgeOrphan = () => {
      if (!orphanId) return;
      void fetch(`/api/library/download/${orphanId}`, {
        method: "DELETE",
        credentials: "include",
      }).catch(() => undefined);
    };
    try {
      const putRes = await fetch(presign.uploadUrl as string, {
        method: "PUT",
        headers: { "Content-Type": contentType },
        body: file,
      });
      if (putRes.ok) return presign.downloadUrl as string;
    } catch {
      /* fall through to same-origin proxy */
    }
    purgeOrphan();
  }

  if (!isSafeForServerUpload(file.size)) {
    const presignErr =
      typeof presign.error === "string" ? presign.error : null;
    throw new Error(presignErr && !presignRes.ok ? `${largeMsg} (${presignErr})` : largeMsg);
  }

  const fd = new FormData();
  fd.set("file", file);
  const up = await fetch("/api/upload-edit-image", {
    method: "POST",
    credentials: "include",
    body: fd,
  });
  const upJson = await readApiJson(up);
  if (up.ok && typeof upJson.url === "string") return upJson.url;

  // Last resort: library multipart proxy (also capped ~4.5MB on Vercel).
  const libFd = new FormData();
  libFd.set("file", file);
  libFd.set("kind", "image");
  const proxyRes = await fetch("/api/library/upload", {
    method: "POST",
    credentials: "include",
    body: libFd,
  });
  const proxy = await readApiJson(proxyRes);
  if (proxyRes.ok && typeof proxy.downloadUrl === "string") {
    return proxy.downloadUrl as string;
  }

  const err =
    (typeof upJson.error === "string" && upJson.error) ||
    (typeof proxy.error === "string" && proxy.error) ||
    failMsg;
  throw new Error(err);
}
