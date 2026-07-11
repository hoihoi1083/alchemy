import type { ContentPlatform, ContentResearchPost } from "@/lib/content-research-types";
import {
  asRecord,
  fetchJustOneApi,
  hasJustOneApiConfigured,
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
      "小紅書 API returned empty note data (COLLECT FAILED or link expired). Wait a moment and try again, or copy the full xiaohongshu.com/explore/… link from the app.",
    );
  }

  throw new Error("Could not parse this Xiaohongshu note. Try the full xiaohongshu.com link.");
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
    throw new Error("Unrecognized post link — use 小紅書, Instagram, TikTok, or Facebook URLs.");
  }
  if (!directPostUrlSupported(platform)) {
    throw new Error(
      platform === "tiktok"
        ? "TikTok direct links are not supported yet — use keyword search, or paste the video file in Studio."
        : "Facebook direct links are not supported yet — use keyword search for Facebook.",
    );
  }

  const ref = extractPostRefFromUrl(platform, resolved);
  let post: ContentResearchPost;

  if (platform === "xiaohongshu") {
    if (!ref.noteId) {
      throw new Error(
        "Could not read this 小紅書 link. Open the post in the app → Share → Copy link, and paste the full xiaohongshu.com link (xhslink sometimes only opens the homepage).",
      );
    }
    post = await fetchXhsPostByNoteId(ref.noteId, resolved);
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
