import type { ContentPlatform, ContentResearchMediaFilter, ContentResearchPost } from "@/lib/content-research-types";
import { RESEARCH_POSTS_FETCH_LIMIT } from "@/lib/content-research-enrich";
import { filterPostsByMedia, platformMediaMismatch } from "@/lib/content-research-media-filter";
import type { PromptMarket } from "@/lib/prompt-variables";
import {
  finalizeXhsPost,
  preferFetchableXhsCover,
  xhsCoverUrlLooksFetchable,
} from "@/lib/research-cover-url";
import {
  asRecord,
  fetchJustOneApi,
  flattenSearchItems,
  pickImageUrl,
  pickImageUrlsFromList,
  pickNumber,
  pickString,
  pickVideoUrl,
} from "@/lib/justoneapi-client";

/** XHS 图文/carousel vs video — avoid false video when API embeds stream metadata on image notes. */
export function inferXhsMediaType(
  noteType: string,
  shareType: string | undefined,
  imageCount: number,
  videoUrl: string | undefined,
): "image" | "video" {
  if (imageCount >= 2) return "image";
  const t = `${noteType} ${shareType ?? ""}`.toLowerCase();
  if (t.includes("normal") || t.includes("image") || t.includes("图")) return "image";
  // Search listings for video notes often ship only a cover frame (no stream URL yet).
  if (t.includes("video") || shareType === "video") return "video";
  if (videoUrl && imageCount < 2) return "video";
  if (imageCount >= 1) return "image";
  return videoUrl ? "video" : "image";
}

function xhsImagesListFromNote(note: Record<string, unknown>, item: Record<string, unknown>) {
  const imageInfo = asRecord(note.image_info) ?? asRecord(note.imageInfo);
  const carousel = note.carousel_list ?? note.carouselList ?? note.carousel_media;
  return (
    (Array.isArray(note.images_list) ? note.images_list : undefined) ??
    (Array.isArray(note.image_list) ? note.image_list : undefined) ??
    (Array.isArray(note.images) ? note.images : undefined) ??
    (Array.isArray(imageInfo?.images_list) ? imageInfo.images_list : undefined) ??
    (Array.isArray(imageInfo?.images) ? imageInfo.images : undefined) ??
    (Array.isArray(note.carousel_list) ? note.carousel_list : undefined) ??
    (Array.isArray(carousel) ? carousel : undefined) ??
    (Array.isArray(asRecord(item.note_card)?.images_list)
      ? asRecord(item.note_card)!.images_list
      : undefined) ??
    (Array.isArray(asRecord(item.noteCard)?.images_list)
      ? asRecord(item.noteCard)!.images_list
      : undefined)
  );
}

function tiktokRegionForMarket(market?: PromptMarket): string {
  switch (market) {
    case "cn":
      return "CN";
    case "en":
      return "US";
    case "hk":
    default:
      return "HK";
  }
}

function noteUrlFromId(noteId: string, xsecToken?: string): string {
  if (!noteId) return "";
  const base = `https://www.xiaohongshu.com/explore/${noteId}`;
  if (xsecToken) return `${base}?xsec_token=${encodeURIComponent(xsecToken)}`;
  return base;
}

function mapXhsItem(raw: unknown, index: number): ContentResearchPost | null {
  const item = asRecord(raw);
  if (!item) return null;

  const note =
    asRecord(item.note) ??
    asRecord(item.note_card) ??
    asRecord(item.noteCard) ??
    item;
  const noteCard = asRecord(item.note_card) ?? asRecord(item.noteCard) ?? note;
  const interact =
    asRecord(note.interact_info) ??
    asRecord(note.interactInfo) ??
    asRecord(noteCard.interact_info) ??
    asRecord(item.interact_info);

  const noteId = pickString(
    note.note_id,
    note.noteId,
    note.id,
    noteCard.id,
    item.id,
    item.note_id,
  );
  const xsecToken = pickString(note.xsec_token, note.xsecToken, item.xsec_token);
  const title = pickString(
    note.display_title,
    note.title,
    noteCard.display_title,
    noteCard.title,
    item.title,
    item.display_title,
  );
  const desc = pickString(note.desc, note.description, noteCard.desc, item.desc, item.snippet);
  const author = pickString(
    asRecord(note.user)?.nickname,
    asRecord(note.user)?.nick_name,
    asRecord(noteCard.user)?.nickname,
    asRecord(item.user)?.nickname,
    note.nickname,
  );

  const imagesList = xhsImagesListFromNote(note, item);
  const coverIndex =
    typeof note.cover_image_index === "number" && note.cover_image_index >= 0
      ? note.cover_image_index
      : 0;
  const coverItem = Array.isArray(imagesList)
    ? imagesList[coverIndex] ?? imagesList[0]
    : undefined;

  const coverImageUrl = pickImageUrl(
    coverItem,
    note.cover,
    noteCard.cover,
    item.cover,
  );
  const imageUrls = pickImageUrlsFromList(imagesList);
  if (!imageUrls.length && coverImageUrl) imageUrls.push(coverImageUrl);
  const sortedImageUrls = [...imageUrls].sort((a, b) => {
    const aOk = xhsCoverUrlLooksFetchable(a) ? 0 : 1;
    const bOk = xhsCoverUrlLooksFetchable(b) ? 0 : 1;
    return aOk - bOk;
  });
  const bestCover = preferFetchableXhsCover(...sortedImageUrls, coverImageUrl);
  const videoUrl = pickVideoUrl(
    note.video,
    noteCard.video,
    note.video_info_v2,
    note.video_info,
    noteCard.video_info_v2,
    noteCard.video_info,
    asRecord(note.video)?.consumer,
    asRecord(note.video)?.media,
    note.native_video,
    noteCard.native_video,
  );
  const noteType = pickString(note.type, noteCard.type, note.note_type, item.share_type, item.shareType);
  const shareType = pickString(item.share_type, item.shareType);
  const mediaType = inferXhsMediaType(noteType, shareType, imageUrls.length, videoUrl);
  const effectiveVideoUrl = mediaType === "image" ? undefined : videoUrl;
  const url =
    pickString(note.url, noteCard.url, item.url, item.link) ||
    noteUrlFromId(noteId, xsecToken);

  if (!title && !desc && !url && imageUrls.length === 0 && !effectiveVideoUrl) return null;

  return {
    id: noteId || `xhs-${index + 1}`,
    title: title || desc.slice(0, 60) || `筆記 ${index + 1}`,
    url,
    snippet: desc.slice(0, 400),
    coverImageUrl: bestCover,
    imageUrls: sortedImageUrls.length ? sortedImageUrls : undefined,
    videoUrl: effectiveVideoUrl,
    mediaType,
    author: author || undefined,
    likes: pickNumber(
      interact?.liked_count,
      interact?.likedCount,
      note.liked_count,
      note.likedCount,
    ),
    collects: pickNumber(
      interact?.collected_count,
      interact?.collectedCount,
      note.collected_count,
      note.collectedCount,
    ),
    comments: pickNumber(
      interact?.comment_count,
      interact?.commentCount,
      note.comment_count,
      note.comments_count,
    ),
    platform: "xiaohongshu",
  };
}

function mapInstagramItem(raw: unknown, index: number): ContentResearchPost | null {
  const item = asRecord(raw);
  if (!item) return null;

  const media = asRecord(item.media) ?? asRecord(item.node) ?? item;
  const user = asRecord(media.user) ?? asRecord(item.user) ?? asRecord(media.owner);

  const shortcode = pickString(
    media.code,
    media.shortcode,
    item.code,
    item.shortcode,
    media.pk,
    item.pk,
  );
  const caption = pickString(
    asRecord(media.caption)?.text,
    media.caption,
    item.caption,
    item.title,
    item.text,
  );
  const author = pickString(user?.username, user?.full_name, item.username);
  const versions = asRecord(media.image_versions2);
  const candidates = versions?.candidates;
  const sidecar = asRecord(media.edge_sidecar_to_children);
  const sidecarEdges = Array.isArray(sidecar?.edges) ? sidecar.edges : undefined;
  const carouselMedia = Array.isArray(media.carousel_media) ? media.carousel_media : undefined;
  const carouselNodes = sidecarEdges
    ? sidecarEdges.map((edge) => asRecord(edge)?.node ?? edge)
    : carouselMedia;

  const imageUrls =
    carouselNodes && carouselNodes.length > 0
      ? pickImageUrlsFromList(carouselNodes)
      : pickImageUrlsFromList(
          Array.isArray(candidates) ? candidates[0] : undefined,
          media.thumbnail_url,
          media.display_url,
          media.cover,
          item.cover,
          item.thumbnail,
        );
  const coverImageUrl = imageUrls[0] ?? pickImageUrl(
    Array.isArray(candidates) ? candidates[0] : undefined,
    media.thumbnail_url,
    media.display_url,
    media.cover,
    item.cover,
    item.thumbnail,
  );
  const videoUrl = pickVideoUrl(
    media.video_url,
    media.videoUrl,
    Array.isArray(media.video_versions) ? media.video_versions[0] : undefined,
    asRecord(media.clips_metadata)?.original_sound_info,
    media.playback_url,
  );

  const url =
    pickString(media.url, item.url, item.permalink) ||
    (shortcode ? `https://www.instagram.com/reel/${shortcode}/` : "");

  if (!caption && !url) return null;

  return {
    id: shortcode || pickString(media.id, item.id) || `ig-${index + 1}`,
    title: caption.slice(0, 80) || `Reel ${index + 1}`,
    url,
    snippet: caption.slice(0, 400),
    coverImageUrl,
    imageUrls: imageUrls.length > 1 ? imageUrls : undefined,
    videoUrl,
    mediaType: videoUrl ? "video" : "image",
    author: author || undefined,
    likes: pickNumber(
      media.like_count,
      media.likes,
      item.like_count,
      item.likes,
      asRecord(media.edge_media_preview_like)?.count,
    ),
    comments: pickNumber(
      media.comment_count,
      item.comment_count,
      asRecord(media.edge_media_to_comment)?.count,
    ),
    platform: "instagram",
  };
}

function mapTiktokItem(raw: unknown, index: number): ContentResearchPost | null {
  const item = asRecord(raw);
  if (!item) return null;

  const aweme = asRecord(item.aweme_info) ?? asRecord(item.aweme) ?? item;
  const author = asRecord(aweme.author) ?? asRecord(item.author);
  const stats = asRecord(aweme.statistics) ?? asRecord(aweme.stats) ?? asRecord(item.statistics);

  const videoId = pickString(aweme.aweme_id, aweme.id, item.id, item.aweme_id);
  const username = pickString(author?.unique_id, author?.uniqueId, author?.nickname);
  const desc = pickString(aweme.desc, aweme.title, item.desc, item.title, item.description);

  const coverImageUrl = pickImageUrl(
    asRecord(aweme.video)?.cover,
    asRecord(aweme.video)?.origin_cover,
    asRecord(aweme.video)?.dynamic_cover,
    asRecord(aweme.video)?.ai_dynamic_cover,
    aweme.cover,
    item.cover,
    item.thumbnail,
  );
  const imageUrls = coverImageUrl ? [coverImageUrl] : undefined;
  const videoUrl = pickVideoUrl(
    asRecord(aweme.video)?.play_addr,
    asRecord(aweme.video)?.download_addr,
    asRecord(aweme.video)?.bit_rate,
    aweme.video,
  );

  const url =
    pickString(aweme.share_url, item.share_url, item.url) ||
    (username && videoId
      ? `https://www.tiktok.com/@${username}/video/${videoId}`
      : videoId
        ? `https://www.tiktok.com/video/${videoId}`
        : "");

  if (!desc && !url) return null;

  return {
    id: videoId || `tiktok-${index + 1}`,
    title: desc.slice(0, 80) || `Video ${index + 1}`,
    url,
    snippet: desc.slice(0, 400),
    coverImageUrl,
    imageUrls,
    videoUrl,
    mediaType: "video",
    author: username || undefined,
    likes: pickNumber(stats?.digg_count, stats?.like_count, aweme.digg_count, item.likes),
    comments: pickNumber(stats?.comment_count, aweme.comment_count, item.comment_count),
    collects: pickNumber(stats?.collect_count, stats?.favorite_count),
    platform: "tiktok",
  };
}

function mapFacebookItem(raw: unknown, index: number): ContentResearchPost | null {
  const item = asRecord(raw);
  if (!item) return null;

  const post = asRecord(item.post) ?? asRecord(item.node) ?? item;
  const actor = asRecord(post.actor) ?? asRecord(post.author) ?? asRecord(item.actor);

  const title = pickString(post.message, post.text, post.title, item.message, item.text, item.title);
  const author = pickString(actor?.name, post.author_name, item.author);
  const postId = pickString(post.post_id, post.id, item.post_id, item.id);

  const attachmentData = asRecord(post.attachments)?.data ?? asRecord(item.attachments)?.data;
  const imageUrls = pickImageUrlsFromList(
    attachmentData,
    post.media,
    item.media,
    post.full_picture,
    post.picture,
    post.image,
    post.thumbnail,
    item.image,
    item.thumbnail,
    item.full_picture,
    item.picture,
  );
  const coverImageUrl =
    imageUrls[0] ??
    pickImageUrl(
      post.full_picture,
      post.picture,
      asRecord(post.media)?.image,
      asRecord(item.media)?.image,
      item.full_picture,
    );
  const videoUrl = pickVideoUrl(
    asRecord(post.attachments)?.data,
    post.source,
    post.video,
    item.video,
  );

  const url = pickString(post.url, post.permalink_url, item.url, item.link) ||
    (postId ? `https://www.facebook.com/${postId}` : "");

  if (!title && !url) return null;

  return {
    id: postId || `fb-${index + 1}`,
    title: title.slice(0, 80) || `Post ${index + 1}`,
    url,
    snippet: title.slice(0, 400),
    coverImageUrl,
    imageUrls: imageUrls.length > 1 ? imageUrls : undefined,
    videoUrl,
    mediaType: videoUrl ? "video" : "image",
    author: author || undefined,
    likes: pickNumber(
      post.reaction_count,
      post.likes,
      asRecord(post.reactions)?.summary,
      item.likes,
    ),
    comments: pickNumber(post.comment_count, post.comments, item.comment_count),
    platform: "facebook",
  };
}

function mapItems(
  platform: ContentPlatform,
  items: unknown[],
  limit: number,
  mediaFilter?: ContentResearchMediaFilter,
): ContentResearchPost[] {
  const mapper =
    platform === "xiaohongshu"
      ? mapXhsItem
      : platform === "instagram"
        ? mapInstagramItem
        : platform === "tiktok"
          ? mapTiktokItem
          : mapFacebookItem;

  const mapped = items
    .map((item, i) => mapper(item, i))
    .filter((p): p is ContentResearchPost => Boolean(p));

  return filterPostsByMedia(mapped, mediaFilter).slice(0, limit);
}

/** Unwrap get-note-detail/v5|v7 JSON into a single note object. */
export function extractXhsNoteFromDetailResponse(
  body: Record<string, unknown>,
): Record<string, unknown> | null {
  const rawData = body.data;

  // v7 often returns data: [{ note_list: [{ id, title, images_list, ... }] }]
  if (Array.isArray(rawData)) {
    for (const entry of rawData) {
      const block = asRecord(entry);
      if (!block) continue;
      const noteList = block.note_list ?? block.noteList;
      if (Array.isArray(noteList)) {
        for (const item of noteList) {
          const note = asRecord(item);
          if (note && (note.id || note.note_id || note.title || note.desc)) return note;
        }
      }
      if (block.id || block.note_id || block.title || block.desc) return block;
    }
    return null;
  }

  const data = asRecord(rawData);
  if (!data || Object.keys(data).length === 0) return null;

  const noteList = data.note_list ?? data.noteList;
  if (Array.isArray(noteList) && noteList.length > 0) {
    const note = asRecord(noteList[0]);
    if (note) return note;
  }

  return (
    asRecord(data.note) ??
    asRecord(data.note_detail) ??
    asRecord(data.noteDetail) ??
    asRecord(data.item) ??
    data
  );
}

export { preferFetchableXhsCover, xhsCoverUrlLooksFetchable } from "@/lib/research-cover-url";

const XHS_COVER_HYDRATE_PATHS = [
  "/api/xiaohongshu/get-note-detail/v1",
  "/api/xiaohongshu/get-note-detail/v4",
  "/api/xiaohongshu/get-note-detail/v2",
  "/api/xiaohongshu/get-note-detail/v5",
  "/api/xiaohongshu/get-note-detail/v7",
] as const;

async function upgradeXhsPostCover(post: ContentResearchPost): Promise<ContentResearchPost> {
  const noteId = post.id?.trim();
  if (!noteId || noteId.startsWith("xhs-")) return post;

  const detailParams: Record<string, string> = { noteId };
  if (post.url) detailParams.noteUrl = post.url;

  for (const path of XHS_COVER_HYDRATE_PATHS) {
    try {
      const body = await fetchJustOneApi(path, detailParams, "XHS cover hydrate");
      const note = extractXhsNoteFromDetailResponse(asRecord(body) ?? {});
      if (!note) continue;
      const refreshed = mapRawPlatformPost(
        "xiaohongshu",
        { note, note_id: noteId, url: post.url },
        0,
      );
      const cover = preferFetchableXhsCover(
        refreshed?.coverImageUrl,
        ...(refreshed?.imageUrls ?? []),
      );
      if (cover && xhsCoverUrlLooksFetchable(cover)) {
        return finalizeXhsPost({
          ...post,
          coverImageUrl: cover,
          imageUrls: refreshed?.imageUrls ?? post.imageUrls ?? [cover],
        });
      }
    } catch {
      continue;
    }
  }
  return post;
}

async function hydrateXhsPostCovers(posts: ContentResearchPost[]): Promise<ContentResearchPost[]> {
  const out = [...posts];
  const targets = posts
    .map((p, i) => ({ p, i }))
    .filter(
      ({ p }) =>
        p.platform === "xiaohongshu" &&
        (p.imageUrls?.length || p.coverImageUrl) &&
        !xhsCoverUrlLooksFetchable(p.coverImageUrl),
    );

  const concurrency = 4;
  for (let start = 0; start < targets.length; start += concurrency) {
    const batch = targets.slice(start, start + concurrency);
    const upgraded = await Promise.all(batch.map(({ p }) => upgradeXhsPostCover(p)));
    batch.forEach(({ i }, j) => {
      out[i] = upgraded[j]!;
    });
  }
  return out.map((p) => (p.platform === "xiaohongshu" ? finalizeXhsPost(p) : p));
}

/** Map a single search/detail API item to a research post card. */
export function mapRawPlatformPost(
  platform: ContentPlatform,
  raw: unknown,
  index = 0,
): ContentResearchPost | null {
  const mapper =
    platform === "xiaohongshu"
      ? mapXhsItem
      : platform === "instagram"
        ? mapInstagramItem
        : platform === "tiktok"
          ? mapTiktokItem
          : mapFacebookItem;
  return mapper(raw, index);
}

function hashtagFromKeyword(keyword: string): string {
  return keyword.trim().replace(/^#/, "").replace(/\s+/g, "").slice(0, 80);
}

export async function searchPlatformPostsByKeyword(
  platform: ContentPlatform,
  keyword: string,
  options?: { limit?: number; market?: PromptMarket; mediaFilter?: ContentResearchMediaFilter },
): Promise<{ posts: ContentResearchPost[]; requestId?: string; endpoint: string }> {
  const limit = options?.limit ?? RESEARCH_POSTS_FETCH_LIMIT;
  const mediaFilter = options?.mediaFilter;
  const mismatch = platformMediaMismatch(platform, mediaFilter);
  if (mismatch === "tiktok-image") {
    throw new Error(
      "TikTok search returns videos only. Pick 小紅書 or Instagram for image research, or switch workflow to Video.",
    );
  }

  const k = keyword.trim();
  if (!k) throw new Error("Keyword is required.");

  let body: Record<string, unknown>;
  let endpoint: string;

  switch (platform) {
    case "xiaohongshu":
      endpoint = "/api/xiaohongshu/search-note/v2";
      body = await fetchJustOneApi(endpoint, {
        keyword: k,
        page: "1",
        sort: "collect_descending",
        noteType: mediaFilter === "video" ? "_1" : mediaFilter === "image" ? "_2" : "_0",
      }, "XHS note search");
      break;
    case "instagram":
      if (mediaFilter === "image") {
        endpoint = "/api/instagram/search-hashtag-posts/v1";
        body = await fetchJustOneApi(
          endpoint,
          { hashtag: hashtagFromKeyword(k) },
          "Instagram hashtag posts search",
        );
      } else {
        endpoint = "/api/instagram/search-reels/v1";
        body = await fetchJustOneApi(endpoint, { keyword: k }, "Instagram reels search");
      }
      break;
    case "tiktok":
      endpoint = "/api/tiktok/search-post/v1";
      body = await fetchJustOneApi(
        endpoint,
        {
          keyword: k,
          offset: "0",
          sortType: "MOST_LIKED",
          publishTime: "ALL",
          region: tiktokRegionForMarket(options?.market),
        },
        "TikTok post search",
      );
      break;
    case "facebook":
      endpoint = "/api/facebook/search-post/v1";
      body = await fetchJustOneApi(endpoint, { keyword: k }, "Facebook post search");
      break;
  }

  const items = flattenSearchItems(body);
  let posts = mapItems(platform, items, limit, mediaFilter);

  if (posts.length < 1) {
    const label =
      mediaFilter === "image"
        ? "image/carousel"
        : mediaFilter === "video"
          ? "video/reel"
          : "";
    throw new Error(
      label
        ? `${platform} search returned no ${label} posts for this keyword. Try a broader keyword or another platform.`
        : `${platform} search returned no posts for this keyword.`,
    );
  }

  if (platform === "xiaohongshu") {
    posts = await hydrateXhsPostCovers(posts);
  }

  return {
    posts,
    requestId: pickString(body.requestId) || undefined,
    endpoint,
  };
}
