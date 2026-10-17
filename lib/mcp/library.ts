import { randomUUID } from "node:crypto";
import { getAssetForUser, insertAsset, listAssetsForUser } from "@/lib/db/assets";
import type { McpJobErr } from "@/lib/mcp/fal-result";
import { parsePublicHttpsMediaUrl } from "@/lib/mcp/public-media-url";
import { isMongoConfigured } from "@/lib/mongodb";
import { isR2Configured, putR2Object, signR2GetUrl } from "@/lib/storage/r2";

const SIGNED_TTL_SEC = 3600;
/** Keep under typical serverless / MCP JSON body limits. */
export const MCP_UPLOAD_MAX_BYTES = 8 * 1024 * 1024;

export type McpLibraryItem = {
  id: string;
  kind: string;
  name: string | null;
  contentType: string;
  createdAt: string;
  url: string;
  urlExpiresInSec: number;
};

async function signedUrlForAsset(asset: {
  r2Key: string;
  sourceUrl: string;
  contentType: string;
}): Promise<string | null> {
  if (asset.r2Key && isR2Configured()) {
    try {
      return await signR2GetUrl(asset.r2Key, SIGNED_TTL_SEC, {
        contentType: asset.contentType,
      });
    } catch {
      /* fall through */
    }
  }
  const src = asset.sourceUrl.trim();
  if (src.startsWith("https://")) return src;
  return null;
}

export async function listLibraryForMcp(input: {
  clerkId: string;
  kind?: "image" | "video" | null;
  limit?: number | null;
}): Promise<{ ok: true; assets: McpLibraryItem[] } | McpJobErr> {
  if (!isMongoConfigured()) {
    return { ok: false, error: "Library needs the database.", status: 503 };
  }
  const limit = Math.max(1, Math.min(40, input.limit ?? 20));
  const rows = await listAssetsForUser(input.clerkId, 80);
  const filtered = input.kind
    ? rows.filter((a) => a.kind === input.kind)
    : rows;
  const assets: McpLibraryItem[] = [];
  for (const a of filtered.slice(0, limit)) {
    const url = await signedUrlForAsset(a);
    if (!url) continue;
    assets.push({
      id: String(a._id),
      kind: a.kind,
      name: a.name ?? null,
      contentType: a.contentType,
      createdAt: a.createdAt.toISOString(),
      url,
      urlExpiresInSec: SIGNED_TTL_SEC,
    });
  }
  return { ok: true, assets };
}

export async function resolveMcpMediaUrl(input: {
  clerkId: string;
  imageUrl?: string | null;
  libraryAssetId?: string | null;
}): Promise<{ ok: true; url: string; libraryAssetId?: string } | McpJobErr> {
  const id = input.libraryAssetId?.trim();
  if (id) {
    if (!isMongoConfigured()) {
      return { ok: false, error: "Library needs the database.", status: 503 };
    }
    const asset = await getAssetForUser(input.clerkId, id);
    if (!asset) {
      return { ok: false, error: "Library asset not found.", status: 404 };
    }
    const url = await signedUrlForAsset(asset);
    if (!url) {
      return { ok: false, error: "Could not mint a public URL for that asset.", status: 502 };
    }
    return { ok: true, url, libraryAssetId: id };
  }
  const raw = input.imageUrl?.trim();
  if (!raw) {
    return {
      ok: false,
      error: "Provide image_url or library_asset_id (from alchemy_list_library).",
      status: 400,
    };
  }
  const url = parsePublicHttpsMediaUrl(raw);
  if (!url) {
    return {
      ok: false,
      error: "image_url must be a public https:// URL, or pass library_asset_id from alchemy_list_library.",
      status: 400,
    };
  }
  return { ok: true, url };
}

export async function resolveOptionalMcpMediaUrl(input: {
  clerkId: string;
  imageUrl?: string | null;
  libraryAssetId?: string | null;
}): Promise<{ ok: true; url?: string; libraryAssetId?: string } | McpJobErr> {
  if (!input.imageUrl?.trim() && !input.libraryAssetId?.trim()) {
    return { ok: true };
  }
  return resolveMcpMediaUrl(input);
}

export type DecodedMcpImage = {
  bytes: Buffer;
  contentType: string;
  ext: string;
};

function extForImageContentType(contentType: string): string {
  if (contentType.includes("png")) return "png";
  if (contentType.includes("webp")) return "webp";
  if (contentType.includes("gif")) return "gif";
  return "jpg";
}

/** Sniff magic bytes; fall back to hint / jpeg. */
export function normalizeMcpImageBytes(
  bytes: Buffer,
  contentTypeHint?: string | null,
): DecodedMcpImage | { error: string } {
  if (!bytes.length) return { error: "Decoded image is empty." };
  if (bytes.length > MCP_UPLOAD_MAX_BYTES) {
    return {
      error: `Image too large (${Math.round(bytes.length / 1024 / 1024)}MB). Max is ${MCP_UPLOAD_MAX_BYTES / 1024 / 1024}MB.`,
    };
  }

  let contentType = (contentTypeHint ?? "").trim().toLowerCase().split(";")[0] || "";
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    contentType = "image/png";
  } else if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    contentType = "image/jpeg";
  } else if (
    bytes.length >= 12 &&
    bytes.toString("ascii", 0, 4) === "RIFF" &&
    bytes.toString("ascii", 8, 12) === "WEBP"
  ) {
    contentType = "image/webp";
  } else if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) {
    contentType = "image/gif";
  } else if (!contentType.startsWith("image/")) {
    contentType = "image/jpeg";
  }

  if (!contentType.startsWith("image/")) {
    return { error: "Only image uploads are supported (image/jpeg, image/png, image/webp)." };
  }

  return { bytes, contentType, ext: extForImageContentType(contentType) };
}

/**
 * Accept `data:image/...;base64,...` or raw base64. Used by alchemy_upload_image
 * so Grok can push a chat attachment without a public CDN URL.
 */
export function decodeMcpImageBase64(
  raw: string,
  contentTypeHint?: string | null,
): DecodedMcpImage | { error: string } {
  const trimmed = raw.trim();
  if (!trimmed) return { error: "image_base64 is empty." };

  let contentType = (contentTypeHint ?? "").trim().toLowerCase() || "";
  let b64 = trimmed;
  const dataUrl = /^data:([^;]+);base64,([\s\S]+)$/i.exec(trimmed);
  if (dataUrl) {
    contentType = dataUrl[1].trim().toLowerCase() || contentType;
    b64 = dataUrl[2].replace(/\s+/g, "");
  } else {
    b64 = trimmed.replace(/\s+/g, "");
  }

  let bytes: Buffer;
  try {
    bytes = Buffer.from(b64, "base64");
  } catch {
    return { error: "image_base64 is not valid base64." };
  }
  return normalizeMcpImageBytes(bytes, contentType || contentTypeHint);
}

async function persistMcpImageBytes(input: {
  clerkId: string;
  bytes: Buffer;
  contentType: string;
  ext: string;
  name?: string | null;
}): Promise<
  | { ok: true; libraryAssetId: string; url: string; contentType: string; urlExpiresInSec: number }
  | McpJobErr
> {
  if (!isMongoConfigured()) {
    return { ok: false, error: "Library needs the database.", status: 503 };
  }
  if (!isR2Configured()) {
    return { ok: false, error: "Storage is not configured.", status: 503 };
  }
  if (input.bytes.length > MCP_UPLOAD_MAX_BYTES) {
    return {
      ok: false,
      error: `Image too large. Max is ${MCP_UPLOAD_MAX_BYTES / 1024 / 1024}MB.`,
      status: 413,
    };
  }

  const key = `users/${input.clerkId}/image/${randomUUID()}.${input.ext}`;
  try {
    await putR2Object(key, input.bytes, input.contentType);
    const asset = await insertAsset({
      clerkId: input.clerkId,
      kind: "image",
      sourceUrl: `upload://${key}`,
      r2Key: key,
      contentType: input.contentType,
      name: input.name?.trim() || `mcp-upload-${Date.now()}`,
      sizeBytes: input.bytes.length,
    });
    const libraryAssetId = String(asset._id);
    const url = await signedUrlForAsset(asset);
    if (!url) {
      return { ok: false, error: "Upload saved but could not mint a signed URL.", status: 502 };
    }
    return {
      ok: true,
      libraryAssetId,
      url,
      contentType: input.contentType,
      urlExpiresInSec: SIGNED_TTL_SEC,
    };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Upload failed.";
    return { ok: false, error: message, status: 502 };
  }
}

/**
 * Store an image into the user's Alchemy library for later MCP edit/generate.
 * Prefer image_base64 when Grok has a chat attachment; image_url for public https.
 */
export async function uploadImageForMcp(input: {
  clerkId: string;
  imageBase64?: string | null;
  imageUrl?: string | null;
  contentType?: string | null;
  name?: string | null;
}): Promise<
  | { ok: true; libraryAssetId: string; url: string; contentType: string; urlExpiresInSec: number }
  | McpJobErr
> {
  const hasB64 = Boolean(input.imageBase64?.trim());
  const hasUrl = Boolean(input.imageUrl?.trim());
  if (hasB64 === hasUrl) {
    return {
      ok: false,
      error: "Pass exactly one of image_base64 (chat attachment) or image_url (public https).",
      status: 400,
    };
  }

  if (hasB64) {
    const decoded = decodeMcpImageBase64(input.imageBase64!, input.contentType);
    if ("error" in decoded) {
      return { ok: false, error: decoded.error, status: 400 };
    }
    return persistMcpImageBytes({
      clerkId: input.clerkId,
      bytes: decoded.bytes,
      contentType: decoded.contentType,
      ext: decoded.ext,
      name: input.name,
    });
  }

  const url = parsePublicHttpsMediaUrl(input.imageUrl);
  if (!url) {
    return {
      ok: false,
      error: "image_url must be a public https:// URL (not localhost).",
      status: 400,
    };
  }

  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(30_000),
      headers: { accept: "image/*,*/*;q=0.8" },
    });
    if (!res.ok) {
      return {
        ok: false,
        error: `Could not download image_url (${res.status}).`,
        status: 502,
      };
    }
    const buf = Buffer.from(await res.arrayBuffer());
    const headerType = (res.headers.get("content-type") ?? "").split(";")[0]?.trim() || "";
    const decoded = normalizeMcpImageBytes(buf, headerType || input.contentType);
    if ("error" in decoded) {
      return { ok: false, error: decoded.error, status: 400 };
    }
    return persistMcpImageBytes({
      clerkId: input.clerkId,
      bytes: decoded.bytes,
      contentType: decoded.contentType,
      ext: decoded.ext,
      name: input.name,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Download failed.";
    return { ok: false, error: message, status: 502 };
  }
}
