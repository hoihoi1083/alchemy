export const JUSTONEAPI_SEARCH_TIMEOUT_MS = 90_000;

export function justOneApiToken(): string | null {
  const token = process.env.JUSTONEAPI_TOKEN?.trim();
  if (!token || token === "your_justoneapi_token_here") return null;
  return token;
}

export function justOneApiBaseUrl(): string {
  const custom = process.env.JUSTONEAPI_BASE_URL?.trim();
  if (custom) return custom.replace(/\/$/, "");
  return "https://api.justoneapi.com";
}

export function hasJustOneApiConfigured(): boolean {
  return justOneApiToken() !== null;
}

export function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function pickString(...values: unknown[]): string {
  for (const v of values) {
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number" && Number.isFinite(v)) return String(v);
  }
  return "";
}

/** Prefer signed CDN URLs (XHS rednotecdn) when a platform returns multiple mirrors. */
export function pickBestImageUrlFromList(urlList: unknown[]): string | undefined {
  const candidates: string[] = [];
  for (const entry of urlList) {
    const fromList = pickString(entry);
    if (fromList.startsWith("http")) candidates.push(fromList);
  }
  if (!candidates.length) return undefined;
  const signed = (u: string) =>
    u.includes("rednotecdn.com") || u.includes("sign=") || u.includes("x-signature");
  const browserOk = (u: string) => !/\/format\/heif|\/format\/heic/i.test(u);
  return (
    candidates.find((u) => signed(u) && browserOk(u)) ??
    candidates.find(browserOk) ??
    candidates.find(signed) ??
    candidates[0]
  );
}

export function pickNumber(...values: unknown[]): number | undefined {
  for (const v of values) {
    const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
    if (Number.isFinite(n) && n >= 0) return Math.round(n);
  }
  return undefined;
}

export function pickImageUrl(...values: unknown[]): string | undefined {
  for (const v of values) {
    if (typeof v === "string" && v.startsWith("http")) return v;
    const rec = asRecord(v);
    if (rec) {
      const urlList = rec.url_list ?? rec.urlList;
      if (Array.isArray(urlList)) {
        const fromList = pickBestImageUrlFromList(urlList);
        if (fromList) return fromList;
      }
      const nested = pickString(
        rec.url_size_large,
        rec.urlSizeLarge,
        rec.original,
        rec.url_default,
        rec.url,
        rec.urlDefault,
        rec.origin,
        rec.display_url,
        rec.displayUrl,
        rec.cover,
        rec.thumbnail_url,
        rec.thumbnailUrl,
        rec.image_url,
        rec.imageUrl,
        rec.src,
        rec.uri,
        rec.picture,
        rec.full_picture,
        rec.thumbnail,
      );
      if (nested.startsWith("http")) return nested;

      const fromMedia = pickImageUrl(
        asRecord(rec.media)?.image,
        asRecord(rec.media)?.photo,
        asRecord(rec.media)?.thumbnail,
        asRecord(rec.image)?.src,
        rec.photo,
      );
      if (fromMedia) return fromMedia;
    }
  }
  return undefined;
}

/** Collect unique image URLs from a list of platform media objects. */
export function pickImageUrlsFromList(...values: unknown[]): string[] {
  const urls: string[] = [];
  const seen = new Set<string>();

  function add(url: string | undefined) {
    if (!url || !url.startsWith("http") || seen.has(url)) return;
    seen.add(url);
    urls.push(url);
  }

  for (const v of values) {
    if (Array.isArray(v)) {
      for (const item of v) {
        add(pickImageUrl(item));
      }
      continue;
    }
    const rec = asRecord(v);
    if (rec) {
      const nested = asRecord(rec.node) ?? rec;
      add(pickImageUrl(nested));
      const subattachments = asRecord(nested.subattachments)?.data;
      if (Array.isArray(subattachments)) {
        for (const item of subattachments) add(pickImageUrl(item));
      }
      const subItems = nested.carousel_media ?? nested.children ?? nested.items;
      if (Array.isArray(subItems)) {
        for (const item of subItems) add(pickImageUrl(item));
      }
      const media = asRecord(nested.media);
      if (media) add(pickImageUrl(media.image, media.photo, media.thumbnail));
    } else {
      add(pickImageUrl(v));
    }
  }

  return urls;
}

function looksLikeVideoUrl(url: string): boolean {
  const lower = url.toLowerCase();
  if (lower.includes("m3u8")) return false;
  return (
    lower.includes(".mp4") ||
    lower.includes("/stream/") ||
    lower.includes("video") ||
    lower.includes("tiktokv") ||
    lower.includes("mime_type=video")
  );
}

function pickVideoFromStreamObject(streamLike: Record<string, unknown>): string | undefined {
  const stream = asRecord(streamLike.stream) ?? streamLike;
  for (const codec of ["h264", "h265", "av1", "h266"]) {
    const variants = stream[codec];
    if (!Array.isArray(variants)) continue;
    for (const variant of variants) {
      const row = asRecord(variant);
      const fromStream = pickVideoUrl(row?.master_url, row?.masterUrl, row?.backup_urls, row?.backupUrls);
      if (fromStream) return fromStream;
    }
  }
  return undefined;
}

export function pickVideoUrl(...values: unknown[]): string | undefined {
  for (const v of values) {
    if (Array.isArray(v)) {
      for (const item of v) {
        const fromList = pickVideoUrl(item);
        if (fromList) return fromList;
      }
      continue;
    }
    if (typeof v === "string" && v.startsWith("http") && looksLikeVideoUrl(v)) return v;
    const rec = asRecord(v);
    if (rec) {
      const fromCodecs = pickVideoFromStreamObject(rec);
      if (fromCodecs) return fromCodecs;

      const media = asRecord(rec.media);
      if (media) {
        const fromMedia = pickVideoUrl(media.stream, media.play_url, media.playUrl);
        if (fromMedia) return fromMedia;
      }

      const nested = pickVideoUrl(
        rec.play_addr,
        rec.playAddr,
        rec.download_addr,
        rec.downloadAddr,
        rec.video_url,
        rec.videoUrl,
        rec.play_url,
        rec.playUrl,
        rec.master_url,
        rec.masterUrl,
        rec.backup_urls,
        rec.backupUrls,
      );
      if (nested) return nested;

      const urlList = rec.url_list ?? rec.urlList;
      if (Array.isArray(urlList)) {
        for (const entry of urlList) {
          const fromList = pickString(entry);
          if (fromList.startsWith("http") && looksLikeVideoUrl(fromList)) return fromList;
        }
      }
    }
  }
  return undefined;
}

export function flattenSearchItems(payload: unknown): unknown[] {
  const root = asRecord(payload);
  if (!root) return Array.isArray(payload) ? payload : [];

  const data = asRecord(root.data) ?? root;
  const nested = asRecord(data.data);

  const lists: unknown[] = [
    data.items,
    data.notes,
    data.note_list,
    data.noteList,
    data.list,
    data.results,
    data.result,
    data.posts,
    data.reels,
    data.videos,
    data.medias,
    data.media,
    data.aweme_list,
    data.awemeList,
    data.search_item_list,
    data.searchItemList,
    nested?.items,
    nested?.list,
    nested?.results,
  ];

  for (const list of lists) {
    if (Array.isArray(list) && list.length > 0) return list;
  }

  if (Array.isArray(data)) return data;
  if (Array.isArray(payload)) return payload;
  return [];
}

function logJustOneApiBillableCall(
  path: string,
  label: string,
  params: Record<string, string>,
  requestId?: string,
): void {
  const topic = params.keyword?.trim() || params.hashtag?.trim();
  const topicBit = topic ? ` keyword="${topic.slice(0, 40)}"` : "";
  const rid = requestId ? ` requestId=${requestId}` : "";
  console.warn(`[justoneapi] billed ${path} (${label})${topicBit}${rid}`);
}

const JUSTONEAPI_RETRYABLE =
  /collect failed|send request again|timeout|timed out|econnreset|econnrefused|503|502|429|temporarily unavailable|rate limit/i;

function isJustOneRetryableError(message: string): boolean {
  return JUSTONEAPI_RETRYABLE.test(message);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJustOneApiOnce(
  path: string,
  params: Record<string, string>,
  label: string,
): Promise<Record<string, unknown>> {
  const token = justOneApiToken();
  if (!token) throw new Error("JUSTONEAPI_TOKEN is not configured.");

  const query = new URLSearchParams({ token, ...params });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), JUSTONEAPI_SEARCH_TIMEOUT_MS);

  try {
    const res = await fetch(`${justOneApiBaseUrl()}${path}?${query}`, {
      signal: controller.signal,
      cache: "no-store",
    });
    const raw = await res.text();
    let body: Record<string, unknown>;
    try {
      body = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      throw new Error(`${label} returned invalid JSON (${res.status}).`);
    }

    const code = String(body.code ?? "");
    if (!res.ok || (code && code !== "0")) {
      const message = String(body.message ?? `${label} failed (${res.status}, code ${code}).`);
      if (code === "600") {
        throw new Error(`NO PERMISSION — enable this API in your Just One API dashboard (code 600).`);
      }
      if (code === "601") {
        throw new Error(`INSUFFICIENT BALANCE — top up your Just One API account (code 601).`);
      }
      if (code === "602") {
        throw new Error(`TOKEN BUDGET EXCEEDED — raise token limit in Just One API dashboard (code 602).`);
      }
      throw new Error(message);
    }

    logJustOneApiBillableCall(path, label, params, pickString(body.requestId) || undefined);

    return body;
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchJustOneApi(
  path: string,
  params: Record<string, string>,
  label: string,
): Promise<Record<string, unknown>> {
  const maxAttempts = 3;
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fetchJustOneApiOnce(path, params, label);
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      const retryable =
        lastError.name === "AbortError" || isJustOneRetryableError(lastError.message);
      if (attempt < maxAttempts - 1 && retryable) {
        console.warn(
          `[justoneapi] ${label} attempt ${attempt + 1}/${maxAttempts} failed, retrying: ${lastError.message}`,
        );
        await sleep(900 * (attempt + 1));
        continue;
      }
      throw lastError;
    }
  }

  throw lastError ?? new Error(`${label} failed.`);
}
