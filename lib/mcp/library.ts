import { getAssetForUser, listAssetsForUser } from "@/lib/db/assets";
import type { McpJobErr } from "@/lib/mcp/fal-result";
import { parsePublicHttpsMediaUrl } from "@/lib/mcp/public-media-url";
import { isMongoConfigured } from "@/lib/mongodb";
import { isR2Configured, signR2GetUrl } from "@/lib/storage/r2";

const SIGNED_TTL_SEC = 3600;

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
