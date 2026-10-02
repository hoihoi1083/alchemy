/**
 * First-party campaign short links → landing + UTMs.
 * Share `https://www.alchemyailab.com/r/{code}` on RedNote / social so the
 * browser hits our domain and Mixpanel can read utm_* on the destination page.
 */

export type CampaignShortLink = {
  /** URL segment after /r/ — lowercase letters, digits, hyphen */
  code: string;
  /** On-site path only (must start with /). */
  path: string;
  utmSource: string;
  utmMedium?: string;
  utmCampaign: string;
  utmContent?: string;
  utmTerm?: string;
};

/** Static registry — one row per RedNote (or social) post. */
export const CAMPAIGN_SHORT_LINKS: readonly CampaignShortLink[] = [
  // Generic RedNote home (no specific post)
  {
    code: "xhs",
    path: "/",
    utmSource: "xiaohongshu",
    utmMedium: "social",
    utmCampaign: "noprompt_week1",
    utmContent: "unspecified",
  },
  // Per-post short links — change utmContent when you publish a new note
  {
    code: "xhs-p1",
    path: "/",
    utmSource: "xiaohongshu",
    utmMedium: "social",
    utmCampaign: "noprompt_week1",
    utmContent: "post1",
  },
  {
    code: "xhs-p2",
    path: "/",
    utmSource: "xiaohongshu",
    utmMedium: "social",
    utmCampaign: "noprompt_week1",
    utmContent: "post2",
  },
  {
    code: "xhs-p3",
    path: "/",
    utmSource: "xiaohongshu",
    utmMedium: "social",
    utmCampaign: "noprompt_week1",
    utmContent: "post3",
  },
  {
    code: "xhs-sample",
    path: "/get-sample",
    utmSource: "xiaohongshu",
    utmMedium: "social",
    utmCampaign: "noprompt_week1",
    utmContent: "sample",
  },
] as const;

const CODE_RE = /^[a-z0-9][a-z0-9-]{0,31}$/;

export function normalizeShortLinkCode(raw: string): string | null {
  const code = raw.trim().toLowerCase();
  if (!CODE_RE.test(code)) return null;
  return code;
}

export function findCampaignShortLink(rawCode: string): CampaignShortLink | null {
  const code = normalizeShortLinkCode(rawCode);
  if (!code) return null;
  return CAMPAIGN_SHORT_LINKS.find((l) => l.code === code) ?? null;
}

/** Build destination path+query (relative). Rejects open redirects. */
export function buildCampaignShortLinkTarget(
  link: CampaignShortLink,
  extraSearchParams?: URLSearchParams,
): string {
  const path = link.path.trim() || "/";
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("://")) {
    throw new Error("Campaign short link path must be a same-origin absolute path.");
  }

  const params = new URLSearchParams();
  params.set("utm_source", link.utmSource);
  if (link.utmMedium) params.set("utm_medium", link.utmMedium);
  params.set("utm_campaign", link.utmCampaign);
  if (link.utmContent) params.set("utm_content", link.utmContent);
  if (link.utmTerm) params.set("utm_term", link.utmTerm);

  // Allow extra params from the short URL, but never override locked UTMs.
  if (extraSearchParams) {
    for (const [key, value] of extraSearchParams.entries()) {
      if (key.toLowerCase().startsWith("utm_")) continue;
      if (!params.has(key)) params.set(key, value);
    }
  }

  const q = params.toString();
  return q ? `${path}?${q}` : path;
}

export function publicCampaignShortUrl(code: string, siteOrigin?: string): string {
  const normalized = normalizeShortLinkCode(code);
  if (!normalized) throw new Error("Invalid short link code.");
  const origin = (siteOrigin ?? "https://www.alchemyailab.com").replace(/\/$/, "");
  return `${origin}/r/${normalized}`;
}

/**
 * Absolute landing URL with UTMs — prefer this for QR codes.
 * Short `/r/{code}` is optional (handy for text posts); QR can encode this directly.
 */
export function publicCampaignLandingUrl(
  link: CampaignShortLink,
  siteOrigin?: string,
): string {
  const origin = (siteOrigin ?? "https://www.alchemyailab.com").replace(/\/$/, "");
  const target = buildCampaignShortLinkTarget(link);
  return `${origin}${target}`;
}
