import type { ContentPlatform, ContentResearchPost } from "@/lib/content-research-types";
import {
  asRecord,
  fetchJustOneApi,
  flattenSearchItems,
  hasJustOneApiConfigured,
  pickString,
} from "@/lib/justoneapi-client";
import { finalizeXhsPost, xhsCoverUrlLooksFetchable } from "@/lib/research-cover-url";
import {
  extractXhsNoteFromDetailResponse,
  mapRawPlatformPost,
} from "@/lib/justoneapi-platform-search";
import { XHS_NOTE_DETAIL_PATHS, xhsNoteDetailParams } from "@/lib/xhs-note-detail";
import {
  detectPlatformFromPostUrl,
  directPostUrlSupported,
  extractPostRefFromUrl,
  facebookPostRefFromUrl,
  normalizePostUrlInput,
  resolvePostUrl,
  xhsShareHintsFromUrl,
} from "@/lib/content-research-post-url";
import {
  mediaFilterMismatchMessage,
  postHasImageMedia,
  postMatchesMediaFilter,
} from "@/lib/content-research-media-filter";
import type { ContentResearchMediaFilter } from "@/lib/content-research-types";

/** Prefer v1/v4 (signed rednotecdn images). v5 is flaky; v7 often returns dead xhscdn URLs. */
const XHS_DETAIL_PATHS = XHS_NOTE_DETAIL_PATHS;

function mapXhsDetailNote(
  note: Record<string, unknown>,
  noteId: string,
  canonicalUrl: string,
  shareType?: string,
): ContentResearchPost | null {
  return (
    mapRawPlatformPost(
      "xiaohongshu",
      {
        note,
        note_id: noteId,
        url: canonicalUrl,
        share_type: shareType,
      },
      0,
    ) ?? mapRawPlatformPost("xiaohongshu", note, 0)
  );
}

async function fetchXhsPostByNoteId(noteId: string, canonicalUrl: string): Promise<ContentResearchPost> {
  const shareHints = xhsShareHintsFromUrl(canonicalUrl);
  const detailParams = xhsNoteDetailParams(noteId, canonicalUrl);

  let lastEmpty = false;
  let fallback: ContentResearchPost | null = null;

  for (const path of XHS_DETAIL_PATHS) {
    const body = await fetchJustOneApi(path, detailParams, "XHS note detail by URL");
    const note = extractXhsNoteFromDetailResponse(asRecord(body) ?? {});
    if (!note) {
      lastEmpty = true;
      continue;
    }

    const post = mapXhsDetailNote(note, noteId, canonicalUrl, shareHints.shareType);
    if (!post) continue;

    const normalized = { ...post, url: post.url || canonicalUrl, platform: "xiaohongshu" as const };
    if (postHasImageMedia(normalized) && !fallback) fallback = normalized;
    if (xhsCoverUrlLooksFetchable(normalized.coverImageUrl)) {
      return finalizeXhsPost(normalized);
    }
  }

  if (fallback) return finalizeXhsPost(fallback);

  if (lastEmpty) {
    throw new Error(
      "RedNote API returned empty note data (COLLECT FAILED or link expired). Wait a moment and try again, or copy the full xiaohongshu.com/explore/… link from the app.",
    );
  }

  throw new Error("Could not parse this RedNote note. Try the full xiaohongshu.com link.");
}

async function fetchInstagramPostByCode(code: string, canonicalUrl: string): Promise<ContentResearchPost> {
  const body = await fetchJustOneApi(
    "/api/instagram/get-media/v1",
    { code },
    "Instagram media by URL",
  );
  const data = asRecord(body.data) ?? body;
  const items = data.items;
  const first = Array.isArray(items) ? asRecord(items[0]) : null;
  const media = asRecord(data.media) ?? first ?? data;
  const post =
    mapRawPlatformPost("instagram", { media, code, url: canonicalUrl }, 0) ??
    mapRawPlatformPost("instagram", media, 0);
  if (!post) {
    throw new Error("Could not parse this Instagram post. Check the link is public.");
  }
  return { ...post, url: post.url || canonicalUrl, platform: "instagram" };
}

function facebookIdsEqual(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

function facebookPostMatchesRef(
  post: ContentResearchPost,
  opts: { postId?: string; canonicalUrl: string },
): boolean {
  if (opts.postId) {
    if (facebookIdsEqual(post.id, opts.postId)) return true;
    if (post.url.toLowerCase().includes(opts.postId.toLowerCase())) return true;
  }
  const a = post.url.replace(/\/$/, "").split("?")[0].toLowerCase();
  const b = opts.canonicalUrl.replace(/\/$/, "").split("?")[0].toLowerCase();
  return Boolean(a && b && a === b);
}

function extractFacebookProfileId(body: Record<string, unknown>): string | null {
  const data = asRecord(body.data) ?? body;
  return (
    pickString(
      data.profileId,
      data.profile_id,
      data.id,
      asRecord(data.profile)?.id,
      asRecord(data.user)?.id,
    ) || null
  );
}

function extractFacebookCursor(body: Record<string, unknown>): string {
  const data = asRecord(body.data) ?? body;
  return pickString(
    data.cursor,
    data.next_cursor,
    data.nextCursor,
    asRecord(data.paging)?.cursors
      ? pickString(
          asRecord(asRecord(data.paging)?.cursors)?.after,
          asRecord(data.paging)?.next,
        )
      : "",
    asRecord(data.paging)?.next,
  );
}

async function resolveFacebookProfileId(opts: {
  profileId?: string;
  profilePath?: string;
}): Promise<string | null> {
  if (opts.profileId) return opts.profileId;
  if (!opts.profilePath) return null;
  const body = await fetchJustOneApi(
    "/api/facebook/get-profile-id/v1",
    { url: opts.profilePath },
    "Facebook profile id by URL",
  );
  return extractFacebookProfileId(asRecord(body) ?? {});
}

/**
 * Just One has no Facebook get-post-by-url. Resolve profile id, then scan
 * get-profile-posts pages for a matching post id / permalink.
 */
async function fetchFacebookPostByUrl(canonicalUrl: string): Promise<ContentResearchPost> {
  const ref = facebookPostRefFromUrl(canonicalUrl);
  const profileId = await resolveFacebookProfileId({
    profileId: ref.profileId,
    profilePath: ref.profilePath,
  });

  if (!profileId) {
    throw new Error(
      "Could not read this Facebook link. Paste a public post URL that includes the page id, e.g. facebook.com/{pageId}/posts/… or /videos/… (share/p short links often omit the page).",
    );
  }

  let cursor = "";
  let fallback: ContentResearchPost | null = null;

  for (let page = 0; page < 4; page++) {
    const params: Record<string, string> = { profileId };
    if (cursor) params.cursor = cursor;
    const body = await fetchJustOneApi(
      "/api/facebook/get-profile-posts/v1",
      params,
      "Facebook profile posts by URL",
    );
    const items = flattenSearchItems(body);
    for (let i = 0; i < items.length; i++) {
      const mapped = mapRawPlatformPost("facebook", items[i], i);
      if (!mapped) continue;
      const normalized = {
        ...mapped,
        url: mapped.url || canonicalUrl,
        platform: "facebook" as const,
      };
      if (!fallback && (normalized.coverImageUrl || normalized.title)) {
        fallback = normalized;
      }
      if (facebookPostMatchesRef(normalized, { postId: ref.postId, canonicalUrl })) {
        return normalized;
      }
    }
    cursor = extractFacebookCursor(asRecord(body) ?? {});
    if (!cursor || items.length < 1) break;
  }

  // Profile root URL with no specific post — return the top public post.
  if (!ref.postId && fallback) return fallback;

  throw new Error(
    "Could not find this Facebook post on the public page feed. Confirm the post is public, or use keyword search.",
  );
}

export async function fetchResearchPostByUrl(
  rawUrl: string,
  opts?: {
    platform?: ContentPlatform;
    mediaFilter?: ContentResearchMediaFilter;
  },
): Promise<ContentResearchPost> {
  if (!hasJustOneApiConfigured()) {
    throw new Error(
      "Direct post links need JUSTONEAPI_TOKEN in .env.local (see docs/XHS_NOTE_SEARCH_SETUP.md).",
    );
  }

  const normalized = normalizePostUrlInput(rawUrl);
  if (!normalized) throw new Error("Paste a post link first.");

  const resolved = await resolvePostUrl(normalized);
  const platform = opts?.platform ?? detectPlatformFromPostUrl(resolved);
  if (!platform) {
    throw new Error("Unrecognized post link — use RedNote, Instagram, TikTok, or Facebook URLs.");
  }
  if (!directPostUrlSupported(platform)) {
    throw new Error(
      "TikTok direct links are not supported yet — use keyword search, or paste the video file in Studio.",
    );
  }

  const ref = extractPostRefFromUrl(platform, resolved);
  let post: ContentResearchPost;

  if (platform === "xiaohongshu") {
    if (!ref.noteId) {
      throw new Error(
        "Could not read this RedNote link. Open the post in the app → Share → Copy link, and paste the full xiaohongshu.com link (xhslink sometimes only opens the homepage).",
      );
    }
    post = await fetchXhsPostByNoteId(ref.noteId, resolved);
  } else if (platform === "facebook") {
    post = await fetchFacebookPostByUrl(resolved);
  } else {
    if (!ref.igCode) {
      throw new Error("Could not read this Instagram link. Use a /p/ or /reel/ URL.");
    }
    post = await fetchInstagramPostByCode(ref.igCode, resolved);
  }

  if (opts?.mediaFilter && !postMatchesMediaFilter(post, opts.mediaFilter)) {
    throw new Error(mediaFilterMismatchMessage(post, opts.mediaFilter));
  }

  return post;
}
