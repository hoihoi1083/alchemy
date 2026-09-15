const URL_RE =
  /https?:\/\/[^\s<>"')\]]+/i;

export function extractUrlFromText(text: string): string | null {
  const m = text.match(URL_RE);
  if (!m) return null;
  return m[0].replace(/[.,;:!?]+$/, "");
}

export function extractUrlFromMessages(
  messages: Array<{ role: string; content: string }>,
): string | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.role !== "user") continue;
    const url = extractUrlFromText(msg.content);
    if (url) return url;
  }
  return null;
}

export function hostnameFromUrl(url: string): string {
  try {
    return new URL(url.startsWith("http") ? url : `https://${url}`).hostname.replace(
      /^www\./,
      "",
    );
  } catch {
    return url;
  }
}

const SITE_PREVIEW_TOPIC =
  /website|homepage|landing\s*page|brand\s*url|brand\s*site|my\s+site|our\s+site|this\s+(url|link|site)|analyze\s*brand|分析品牌|網址|网址|網站|网站|官網|官网|主頁|主页|promo(te)?\s+(this\s+)?(site|website|url)|promote:?\s*https?/i;

/**
 * Only scrape HTML when this turn needs site context.
 * Detected URLs from earlier turns still drive routing — they must not force a fetch
 * on every token/plan Q&A.
 */
export function shouldLoadSitePreviewForTurn(
  lastUserContent: string,
  detectedUrl: string | undefined,
): boolean {
  if (!detectedUrl?.trim()) return false;
  const t = lastUserContent.trim();
  if (!t) return false;
  if (extractUrlFromText(t)) return true;
  return SITE_PREVIEW_TOPIC.test(t);
}
