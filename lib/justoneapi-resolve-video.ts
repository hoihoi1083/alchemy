import type { ContentPlatform } from "@/lib/content-research-types";
import {
  asRecord,
  fetchJustOneApi,
  pickString,
  pickVideoUrl,
} from "@/lib/justoneapi-client";
import { exploreIdFromUrl } from "@/lib/content-research-enrich";

function xhsNoteId(postId: string, postUrl?: string): string | null {
  const fromUrl = postUrl ? exploreIdFromUrl(postUrl) : null;
  if (fromUrl) return fromUrl;
  if (/^[a-f0-9]{24}$/i.test(postId)) return postId;
  return null;
}

function igShortcode(postId: string, postUrl?: string): string | null {
  const fromUrl = postUrl?.match(/\/(?:reel|p)\/([^/?#]+)/)?.[1];
  if (fromUrl) return fromUrl;
  if (postId && !postId.includes("-")) return postId;
  return null;
}

/** Fetch a direct MP4 URL when search results omit video (e.g. XHS note list). */
export async function resolvePostVideoUrl(
  platform: ContentPlatform,
  postId: string,
  postUrl?: string,
): Promise<string | undefined> {
  switch (platform) {
    case "xiaohongshu": {
      const noteId = xhsNoteId(postId, postUrl);
      if (!noteId) return undefined;
      const body = await fetchJustOneApi(
        "/api/xiaohongshu/get-note-detail/v5",
        { noteId },
        "XHS note detail for video",
      );
      const data = asRecord(body.data) ?? body;
      const note = asRecord(data.note) ?? data;
      return pickVideoUrl(note?.video, note?.native_video, note?.video_info);
    }
    case "instagram": {
      const code = igShortcode(postId, postUrl);
      if (!code) return undefined;
      const body = await fetchJustOneApi(
        "/api/instagram/get-media/v1",
        { code },
        "Instagram media detail for video",
      );
      const data = asRecord(body.data) ?? body;
      const items = data.items;
      const first = Array.isArray(items) ? asRecord(items[0]) : null;
      const media = asRecord(data.media) ?? first ?? data;
      return pickVideoUrl(
        media?.video_url,
        Array.isArray(media?.video_versions) ? media.video_versions[0] : undefined,
        media?.video,
      );
    }
    default:
      return undefined;
  }
}
