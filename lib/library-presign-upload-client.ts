import { isSafeForServerUpload } from "@/lib/upload-limits";
import { withLibraryInline } from "@/lib/storage/library-asset-url";

/**
 * Browser → R2 via /api/library/presign-upload, with small same-origin fallback.
 * Avoids Vercel ~4.5MB body limit for edit-image-2 / captions / Ultra.
 */

export type LibraryUploadKind = "image" | "video" | "audio" | "voiceover";

const DEFAULT_FAIL = "Upload failed";
const DEFAULT_LARGE =
  "File is too large for the server upload path (~4.5MB). Enable R2 CORS for direct upload, compress the file, or Choose from library.";

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

function defaultContentType(kind: LibraryUploadKind, file: File): string {
  if (file.type) return file.type;
  if (kind === "video" || kind === "voiceover") return "video/mp4";
  if (kind === "audio") return "audio/mpeg";
  return "image/png";
}

export type PresignLibraryUploadOptions = {
  kind: LibraryUploadKind;
  failMessage?: string;
  largeFileMessage?: string;
  name?: string;
  /**
   * Extra same-origin FormData fallbacks after library/upload
   * (e.g. /api/upload-edit-image or /api/upload-canvas-asset).
   */
  extraFallbacks?: Array<{
    url: string;
    /** Extra form fields besides `file`. */
    fields?: Record<string, string>;
    /** Response JSON key that holds the durable URL (default `url`). */
    urlKey?: "url" | "downloadUrl";
  }>;
};

/**
 * Upload a File via R2 presign when possible; return a durable library/http URL
 * (library URLs are forced to `?inline=1` for board / video / Konva use).
 */
export async function uploadFileViaLibraryPresign(
  file: File,
  opts: PresignLibraryUploadOptions,
): Promise<string> {
  const failMsg = opts.failMessage?.trim() || DEFAULT_FAIL;
  const largeMsg = opts.largeFileMessage?.trim() || DEFAULT_LARGE;
  const kind = opts.kind;
  const contentType = defaultContentType(kind, file);
  const name = opts.name?.trim() || file.name || `upload-${kind}`;

  const presignRes = await fetch("/api/library/presign-upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      kind,
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
      if (putRes.ok) {
        return withLibraryInline(presign.downloadUrl as string);
      }
    } catch {
      /* fall through */
    }
    purgeOrphan();
  }

  if (!isSafeForServerUpload(file.size)) {
    const presignErr =
      typeof presign.error === "string" ? presign.error : null;
    throw new Error(
      presignErr && !presignRes.ok ? `${largeMsg} (${presignErr})` : largeMsg,
    );
  }

  const libFd = new FormData();
  libFd.set("file", file);
  libFd.set("kind", kind);
  const proxyRes = await fetch("/api/library/upload", {
    method: "POST",
    credentials: "include",
    body: libFd,
  });
  const proxy = await readApiJson(proxyRes);
  if (proxyRes.ok && typeof proxy.downloadUrl === "string") {
    return withLibraryInline(proxy.downloadUrl as string);
  }

  for (const fb of opts.extraFallbacks ?? []) {
    const fd = new FormData();
    fd.set("file", file);
    for (const [k, v] of Object.entries(fb.fields ?? {})) {
      fd.set(k, v);
    }
    const res = await fetch(fb.url, {
      method: "POST",
      credentials: "include",
      body: fd,
    });
    const json = await readApiJson(res);
    const key = fb.urlKey ?? "url";
    if (res.ok && typeof json[key] === "string") {
      return withLibraryInline(json[key] as string);
    }
  }

  const err =
    (typeof proxy.error === "string" && proxy.error) ||
    (typeof presign.error === "string" && !presignRes.ok && (presign.error as string)) ||
    failMsg;
  throw new Error(err);
}
