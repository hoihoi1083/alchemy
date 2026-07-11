import {
  detectPlatformFromPostUrl,
  normalizePostUrlInput,
  xhsNoteIdFromUrl,
  xhsShareHintsFromUrl,
} from "@/lib/content-research-post-url";
import { asRecord, fetchJustOneApi, pickString } from "@/lib/justoneapi-client";

const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function canonicalXhsExploreUrl(noteId: string, hintUrl: string): string {
  const hints = xhsShareHintsFromUrl(hintUrl);
  const base = `https://www.xiaohongshu.com/explore/${noteId}`;
  if (!hints.xsecToken && !hints.shareType) return base;
  const u = new URL(base);
  if (hints.xsecToken) u.searchParams.set("xsec_token", hints.xsecToken);
  if (hints.shareType) u.searchParams.set("type", hints.shareType);
  return u.href;
}

async function followRedirectChain(startUrl: string): Promise<string> {
  let current = startUrl;
  for (let hop = 0; hop < 10; hop++) {
    const res = await fetch(current, {
      method: "GET",
      redirect: "manual",
      headers: { "User-Agent": BROWSER_UA, Accept: "text/html,application/xhtml+xml" },
      signal: AbortSignal.timeout(12_000),
    });

    const idFromCurrent = xhsNoteIdFromUrl(current);
    if (idFromCurrent) {
      return canonicalXhsExploreUrl(idFromCurrent, current);
    }

    const location = res.headers.get("location");
    if (location && [301, 302, 303, 307, 308].includes(res.status)) {
      current = new URL(location, current).href;
      const idFromHop = xhsNoteIdFromUrl(current);
      if (idFromHop) {
        return canonicalXhsExploreUrl(idFromHop, current);
      }
      continue;
    }

    return res.url || current;
  }
  return current;
}

async function resolveViaJustOneShareApi(shareUrl: string): Promise<string | null> {
  const body = await fetchJustOneApi(
    "/api/xiaohongshu/share-url-transfer/v1",
    { shareUrl },
    "XHS share resolve",
  );
  const data = asRecord(body.data) ?? body;
  const noteId = pickString(
    data.noteId,
    data.note_id,
    data.id,
    asRecord(data.note)?.note_id,
    asRecord(data.note)?.id,
  );
  const resolvedUrl = pickString(
    data.url,
    data.note_url,
    data.link,
    data.share_url,
    asRecord(data.note)?.url,
  );
  if (noteId) {
    return canonicalXhsExploreUrl(noteId, resolvedUrl || shareUrl);
  }
  if (resolvedUrl && xhsNoteIdFromUrl(resolvedUrl)) {
    return resolvedUrl;
  }
  return null;
}

/** Resolve xhslink / share URLs to a canonical explore URL with note id. */
export async function resolveXhsShareUrl(rawUrl: string): Promise<string> {
  const normalized = normalizePostUrlInput(rawUrl);
  if (!normalized) return normalized;

  const idInInput = xhsNoteIdFromUrl(normalized);
  if (idInInput) {
    return canonicalXhsExploreUrl(idInInput, normalized);
  }

  let resolved = normalized;
  try {
    resolved = await followRedirectChain(normalized);
  } catch {
    resolved = normalized;
  }

  if (xhsNoteIdFromUrl(resolved)) {
    return resolved;
  }

  const isShortLink =
    normalized.includes("xhslink") ||
    detectPlatformFromPostUrl(normalized) === "xiaohongshu";

  if (isShortLink) {
    try {
      const fromApi = await resolveViaJustOneShareApi(normalized);
      if (fromApi && xhsNoteIdFromUrl(fromApi)) {
        return fromApi;
      }
    } catch {
      // fall through to error below
    }
  }

  return resolved;
}
