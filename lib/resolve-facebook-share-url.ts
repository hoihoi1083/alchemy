import { assertPublicHttpUrl } from "@/lib/pipeline/safe-url";

function normalizeUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

/** Facebook crawler UA — share/p short links 400 for normal Chrome UAs. */
const FACEBOOK_SHARE_UA =
  "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)";

export function isFacebookShareShortUrl(url: string): boolean {
  try {
    const u = new URL(normalizeUrl(url));
    const host = u.hostname.toLowerCase();
    if (!host.includes("facebook") && host !== "fb.com" && !host.includes("fb.watch")) {
      return false;
    }
    return /^\/share\//i.test(u.pathname);
  } catch {
    return false;
  }
}

function looksLikeResolvedFacebookPostUrl(url: string): boolean {
  try {
    const path = new URL(url).pathname;
    if (/\/share\//i.test(path)) return false;
    return (
      /\/(?:posts|videos|photos|reel)\//i.test(path) ||
      /\/permalink\.php$/i.test(path) ||
      /\/photo\.php$/i.test(path) ||
      /\/watch\//i.test(path)
    );
  } catch {
    return false;
  }
}

function pickCanonicalFromHtml(html: string, baseUrl: string): string | null {
  const patterns = [
    /property=["']og:url["']\s+content=["']([^"']+)["']/i,
    /content=["']([^"']+)["']\s+property=["']og:url["']/i,
    /rel=["']canonical["']\s+href=["']([^"']+)["']/i,
    /href=["']([^"']+)["']\s+rel=["']canonical["']/i,
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (!m?.[1]) continue;
    try {
      const absolute = new URL(m[1].replace(/&amp;/g, "&"), baseUrl).toString();
      assertPublicHttpUrl(absolute);
      if (looksLikeResolvedFacebookPostUrl(absolute)) return absolute;
    } catch {
      /* continue */
    }
  }
  return null;
}

/**
 * Expand facebook.com/share/p/… (and similar) to a canonical page post URL.
 * Uses Facebook's externalhit UA; Chrome gets HTTP 400 on these short links.
 */
export async function resolveFacebookShareUrl(rawUrl: string): Promise<string> {
  const normalized = normalizeUrl(rawUrl);
  if (!normalized || !isFacebookShareShortUrl(normalized)) return normalized;

  try {
    assertPublicHttpUrl(normalized);
    const res = await fetch(normalized, {
      method: "GET",
      redirect: "manual",
      headers: {
        "User-Agent": FACEBOOK_SHARE_UA,
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(12_000),
    });

    const location = res.headers.get("location")?.trim();
    if (location) {
      const absolute = new URL(location, normalized).toString();
      assertPublicHttpUrl(absolute);
      if (looksLikeResolvedFacebookPostUrl(absolute)) return absolute;
      // Rare: intermediate hop — one more follow with the same UA.
      if (isFacebookShareShortUrl(absolute) || absolute.includes("facebook.com")) {
        const hop = await fetch(absolute, {
          method: "GET",
          redirect: "follow",
          headers: { "User-Agent": FACEBOOK_SHARE_UA, Accept: "text/html" },
          signal: AbortSignal.timeout(12_000),
        });
        const finalUrl = hop.url || absolute;
        assertPublicHttpUrl(finalUrl);
        if (looksLikeResolvedFacebookPostUrl(finalUrl)) return finalUrl;
        const html = await hop.text();
        return pickCanonicalFromHtml(html, finalUrl) ?? finalUrl;
      }
      return absolute;
    }

    if (res.ok) {
      const html = await res.text();
      const fromHtml = pickCanonicalFromHtml(html, normalized);
      if (fromHtml) return fromHtml;
    }
  } catch {
    /* fall through */
  }

  return normalized;
}
