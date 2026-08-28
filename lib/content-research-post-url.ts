import type { ContentPlatform } from "@/lib/content-research-types";
import { exploreIdFromUrl } from "@/lib/content-research-enrich";
import { assertPublicHttpUrl } from "@/lib/pipeline/safe-url";
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

  // Only resolve known social post hosts; never open-fetch arbitrary URLs.
  if (!platform) return normalized;
  try {
    assertPublicHttpUrl(normalized);
    const res = await fetch(normalized, {
      method: "GET",
      redirect: "follow",
      headers: { "User-Agent": BROWSER_UA },
      signal: AbortSignal.timeout(12_000),
    });
    const finalUrl = res.url || normalized;
    assertPublicHttpUrl(finalUrl);
    return finalUrl;
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

/**
 * Parse a Facebook post/reel/video URL into profile + post ids when possible.
 * Just One has no get-post-by-url — we resolve via get-profile-posts.
 */
export function facebookPostRefFromUrl(url: string): {
  profileId?: string;
  postId?: string;
  /** Path for get-profile-id/v1 (no host), e.g. `/SomePage` or `/people/Name/123`. */
  profilePath?: string;
} {
  try {
    const u = new URL(normalizePostUrlInput(url));
    const path = u.pathname.replace(/\/+$/, "") || "/";

    // /61550019737853/videos/1065421039304574
    // /61550019737853/posts/pfbid…
    let m = path.match(/^\/(\d+)\/(?:posts|videos|photos|reel)\/([^/]+)$/i);
    if (m) return { profileId: m[1], postId: decodeURIComponent(m[2]) };

    // /PageName/posts/pfbid… or /PageName/videos/123
    m = path.match(/^\/([^/]+)\/(?:posts|videos|photos)\/(pfbid[^/]+|\d+)$/i);
    if (m && !/^(watch|reel|share|photo|permalink\.php)$/i.test(m[1])) {
      return {
        profilePath: `/${m[1]}`,
        postId: decodeURIComponent(m[2]),
      };
    }

    // /reel/123
    m = path.match(/^\/reel\/([^/]+)$/i);
    if (m) return { postId: decodeURIComponent(m[1]) };

    // /watch/?v=123
    const watchId = u.searchParams.get("v")?.trim();
    if (/\/watch/i.test(path) && watchId) return { postId: watchId };

    // permalink.php?story_fbid=X&id=Y  or  photo.php?fbid=X&id=Y
    const story =
      u.searchParams.get("story_fbid")?.trim() ||
      u.searchParams.get("fbid")?.trim();
    const ownerId = u.searchParams.get("id")?.trim();
    if (story && ownerId) return { profileId: ownerId, postId: story };
    if (story) return { postId: story };

    // /people/Name/61550019737853
    m = path.match(/^\/people\/[^/]+\/(\d+)$/i);
    if (m) return { profileId: m[1], profilePath: path };

    // /profile.php?id=123
    const profilePhpId = u.searchParams.get("id")?.trim();
    if (/\/profile\.php$/i.test(path) && profilePhpId) {
      return { profileId: profilePhpId };
    }

    // Vanity page root — only useful to list recent posts, not a specific one.
    if (/^\/[A-Za-z0-9._-]+$/.test(path) && !/^\/(watch|reel|share)$/i.test(path)) {
      return { profilePath: path };
    }

    return {};
  } catch {
    return {};
  }
}

export function extractPostRefFromUrl(
  platform: ContentPlatform,
  url: string,
): {
  noteId?: string;
  igCode?: string;
  tiktokVideoId?: string;
  facebookProfileId?: string;
  facebookPostId?: string;
  facebookProfilePath?: string;
} {
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
    case "facebook": {
      const fb = facebookPostRefFromUrl(url);
      return {
        facebookProfileId: fb.profileId,
        facebookPostId: fb.postId,
        facebookProfilePath: fb.profilePath,
      };
    }
    default:
      return {};
  }
}

export function directPostUrlSupported(platform: ContentPlatform): boolean {
  return platform === "xiaohongshu" || platform === "instagram";
}
