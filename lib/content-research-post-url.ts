import type { ContentPlatform } from "@/lib/content-research-types";
import { exploreIdFromUrl } from "@/lib/content-research-enrich";
import { resolveXhsShareUrl } from "@/lib/resolve-xhs-share-url";

const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export function normalizePostUrlInput(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function detectPlatformFromPostUrl(url: string): ContentPlatform | null {
  try {
    const host = new URL(normalizePostUrlInput(url)).hostname.toLowerCase();
    if (host.includes("xiaohongshu") || host.includes("xhslink") || host.includes("xhs.cn")) {
      return "xiaohongshu";
    }
    if (host.includes("instagram") || host === "instagr.am") return "instagram";
    if (host.includes("tiktok")) return "tiktok";
    if (host.includes("facebook") || host.includes("fb.watch") || host === "fb.com") {
      return "facebook";
    }
  } catch {
    return null;
  }
  return null;
}

/** Follow redirects (xhslink.com → xiaohongshu.com/explore/…). */
export async function resolvePostUrl(url: string): Promise<string> {
  const normalized = normalizePostUrlInput(url);
  if (!normalized) return normalized;

  const platform = detectPlatformFromPostUrl(normalized);
  if (
    platform === "xiaohongshu" ||
    normalized.includes("xhslink") ||
    normalized.includes("xhs.cn")
  ) {
    return resolveXhsShareUrl(normalized);
  }

  try {
    const res = await fetch(normalized, {
      method: "GET",
      redirect: "follow",
      headers: { "User-Agent": BROWSER_UA },
      signal: AbortSignal.timeout(12_000),
    });
    return res.url || normalized;
  } catch {
    return normalized;
  }
}

export function xhsNoteIdFromUrl(url: string): string | null {
  const fromExplore = exploreIdFromUrl(url);
  if (fromExplore) return fromExplore;
  const discovery = url.match(/\/discovery\/item\/([a-f0-9]+)/i)?.[1];
  if (discovery) return discovery.toLowerCase();
  return null;
}

/** Hints from a share link query string (xhslink → discovery/item?type=normal). */
export function xhsShareHintsFromUrl(url: string): {
  shareType?: string;
  xsecToken?: string;
} {
  try {
    const u = new URL(normalizePostUrlInput(url));
    const shareType = u.searchParams.get("type")?.trim();
    const xsecToken = u.searchParams.get("xsec_token")?.trim();
    return {
      shareType: shareType || undefined,
      xsecToken: xsecToken || undefined,
    };
  } catch {
    return {};
  }
}

export function instagramShortcodeFromUrl(url: string): string | null {
  const m = url.match(/\/(?:reel|p|tv)\/([^/?#]+)/i);
  return m?.[1] ?? null;
}

export function tiktokVideoIdFromUrl(url: string): string | null {
  const m = url.match(/\/video\/(\d+)/i);
  return m?.[1] ?? null;
}

export function extractPostRefFromUrl(
  platform: ContentPlatform,
  url: string,
): { noteId?: string; igCode?: string; tiktokVideoId?: string } {
  switch (platform) {
    case "xiaohongshu": {
      const noteId = xhsNoteIdFromUrl(url);
      return noteId ? { noteId } : {};
    }
    case "instagram": {
      const igCode = instagramShortcodeFromUrl(url);
      return igCode ? { igCode } : {};
    }
    case "tiktok": {
      const tiktokVideoId = tiktokVideoIdFromUrl(url);
      return tiktokVideoId ? { tiktokVideoId } : {};
    }
    default:
      return {};
  }
}

export function directPostUrlSupported(platform: ContentPlatform): boolean {
  return platform === "xiaohongshu" || platform === "instagram";
}
