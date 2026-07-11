import type { ContentAngleCandidate, ContentResearchPost } from "@/lib/content-research-types";

const HEIF_FORMAT_RE = /\/format\/heif|\/format\/heic/i;

function xhsImageUrlHasSignature(url: string): boolean {
  return /(?:\?|&)(?:sign|x-signature|x-sign)=/i.test(url);
}

/** XHS search API recently returns HEIF covers — rewrite breaks CDN signatures, so only use for display hints. */
export function researchImageUrlPrefersBrowser(url: string): boolean {
  return !HEIF_FORMAT_RE.test(url) && !/\.heif(?:\?|$)|\.heic(?:\?|$)/i.test(url);
}

/** XHS CDN URLs our image proxy can fetch (signed rednotecdn or signed xhscdn). */
export function xhsCoverUrlLooksFetchable(url?: string): boolean {
  if (!url) return false;
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host.includes("rednotecdn.com")) return true;
    if (host.includes("xhscdn.com") || host.includes("xhscdn.net")) {
      return xhsImageUrlHasSignature(url);
    }
    return true;
  } catch {
    return false;
  }
}

/** Pick the first cover URL our proxy can actually fetch. */
export function preferFetchableXhsCover(...urls: (string | undefined)[]): string | undefined {
  const candidates = urls.filter((u): u is string => Boolean(u?.startsWith("http")));
  return candidates.find((u) => xhsCoverUrlLooksFetchable(u));
}

/** Ordered unique cover candidates for thumbnails (fetchable URLs first). */
export function researchCoverCandidates(input: {
  sourceCoverImageUrl?: string;
  sourceImageUrls?: string[];
  coverImageUrl?: string;
  imageUrls?: string[];
}): string[] {
  const raw = [
    input.sourceCoverImageUrl ?? input.coverImageUrl,
    ...(input.sourceImageUrls ?? input.imageUrls ?? []),
  ].filter((u): u is string => Boolean(u?.startsWith("http")));

  const seen = new Set<string>();
  const sorted = [...raw].sort((a, b) => {
    const score = (u: string) =>
      (xhsCoverUrlLooksFetchable(u) ? 0 : 2) +
      (researchImageUrlPrefersBrowser(u) ? 0 : 1);
    return score(a) - score(b);
  });
  const out: string[] = [];
  for (const u of sorted) {
    if (seen.has(u)) continue;
    seen.add(u);
    out.push(u);
  }
  return out;
}

export function finalizeXhsPost(post: ContentResearchPost): ContentResearchPost {
  if (post.platform !== "xiaohongshu") return post;
  const urls = researchCoverCandidates({
    coverImageUrl: post.coverImageUrl,
    imageUrls: post.imageUrls,
  });
  const cover = preferFetchableXhsCover(...urls);
  return {
    ...post,
    coverImageUrl: cover,
    imageUrls: urls.length ? urls : undefined,
  };
}

export function finalizeXhsAngle(angle: ContentAngleCandidate): ContentAngleCandidate {
  const urls = researchCoverCandidates({
    sourceCoverImageUrl: angle.sourceCoverImageUrl,
    sourceImageUrls: angle.sourceImageUrls,
  });
  const cover = preferFetchableXhsCover(...urls);
  return {
    ...angle,
    sourceCoverImageUrl: cover,
    sourceImageUrls: urls.length ? urls : angle.sourceImageUrls,
  };
}

export function angleHasReferenceCover(angle: ContentAngleCandidate): boolean {
  return researchCoverCandidates({
    sourceCoverImageUrl: angle.sourceCoverImageUrl,
    sourceImageUrls: angle.sourceImageUrls,
  }).some((u) => xhsCoverUrlLooksFetchable(u));
}
