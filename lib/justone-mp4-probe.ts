import type { ContentPlatform, ContentResearchPost } from "@/lib/content-research-types";
import { resolvePostVideoUrl } from "@/lib/justoneapi-resolve-video";
import { searchPlatformPostsByKeyword } from "@/lib/justoneapi-platform-search";
import {
  bufferLooksLikeMp4,
  fetchResearchPostVideoBytes,
  type ResearchVideoFetchResult,
} from "@/lib/research-post-video-fetch";

export type Mp4ProbeRow = {
  postId: string;
  title: string;
  postUrl: string;
  searchVideoUrl?: string;
  resolvedVideoUrl?: string;
  finalVideoUrl?: string;
  download: ResearchVideoFetchResult;
  looksLikeMp4?: boolean;
};

export type Mp4ProbeReport = {
  platform: ContentPlatform;
  keyword: string;
  searchOk: boolean;
  searchError?: string;
  endpoint?: string;
  requestId?: string;
  postsFound: number;
  rows: Mp4ProbeRow[];
  /** At least one post: resolve/download succeeded with video-ish bytes */
  anyDownloadOk: boolean;
  /** Download succeeded and buffer sniff looks like MP4 */
  anyMp4Ok: boolean;
};

export type Mp4ProbeDeps = {
  searchPosts: typeof searchPlatformPostsByKeyword;
  resolveVideo: typeof resolvePostVideoUrl;
  downloadVideo: typeof fetchResearchPostVideoBytes;
};

const defaultDeps: Mp4ProbeDeps = {
  searchPosts: searchPlatformPostsByKeyword,
  resolveVideo: resolvePostVideoUrl,
  downloadVideo: fetchResearchPostVideoBytes,
};

async function probePost(
  post: ContentResearchPost,
  platform: ContentPlatform,
  deps: Mp4ProbeDeps,
): Promise<Mp4ProbeRow> {
  const searchVideoUrl = post.videoUrl?.trim() || undefined;
  let resolvedVideoUrl: string | undefined;
  let finalVideoUrl = searchVideoUrl;

  if (!finalVideoUrl) {
    resolvedVideoUrl =
      (await deps.resolveVideo(platform, post.id, post.url)) ?? undefined;
    finalVideoUrl = resolvedVideoUrl;
  }

  if (!finalVideoUrl) {
    return {
      postId: post.id,
      title: post.title,
      postUrl: post.url,
      searchVideoUrl,
      resolvedVideoUrl,
      download: { ok: false, error: "no_video_url" },
    };
  }

  const download = await deps.downloadVideo(finalVideoUrl, platform);
  const looksLikeMp4 =
    download.ok && download.buffer ? bufferLooksLikeMp4(download.buffer) : undefined;

  return {
    postId: post.id,
    title: post.title,
    postUrl: post.url,
    searchVideoUrl,
    resolvedVideoUrl,
    finalVideoUrl,
    download,
    looksLikeMp4,
  };
}

/** Live probe: Just One search → resolve MP4 URL → CDN download (billed search + detail calls). */
export async function probeJustOneMp4Pipeline(
  input: {
    platform?: ContentPlatform;
    keyword: string;
    maxPosts?: number;
  },
  deps: Mp4ProbeDeps = defaultDeps,
): Promise<Mp4ProbeReport> {
  const platform = input.platform ?? "xiaohongshu";
  const maxPosts = input.maxPosts ?? 5;

  let posts: ContentResearchPost[] = [];
  let endpoint: string | undefined;
  let requestId: string | undefined;

  try {
    const search = await deps.searchPosts(platform, input.keyword, {
      limit: maxPosts,
      mediaFilter: "video",
    });
    posts = search.posts;
    endpoint = search.endpoint;
    requestId = search.requestId;
  } catch (e) {
    return {
      platform,
      keyword: input.keyword,
      searchOk: false,
      searchError: e instanceof Error ? e.message : String(e),
      postsFound: 0,
      rows: [],
      anyDownloadOk: false,
      anyMp4Ok: false,
    };
  }

  const rows: Mp4ProbeRow[] = [];
  for (const post of posts.slice(0, maxPosts)) {
    rows.push(await probePost(post, platform, deps));
  }

  const anyDownloadOk = rows.some((r) => r.download.ok);
  const anyMp4Ok = rows.some((r) => r.download.ok && r.looksLikeMp4 === true);

  return {
    platform,
    keyword: input.keyword,
    searchOk: true,
    endpoint,
    requestId,
    postsFound: posts.length,
    rows,
    anyDownloadOk,
    anyMp4Ok,
  };
}

export function formatMp4ProbeReport(report: Mp4ProbeReport): string {
  const lines: string[] = [
    `Just One MP4 probe — ${report.platform} · "${report.keyword}"`,
    report.searchOk
      ? `Search OK (${report.endpoint ?? "?"}) · ${report.postsFound} video posts · requestId=${report.requestId ?? "n/a"}`
      : `Search FAILED: ${report.searchError}`,
    "",
  ];

  for (const [i, row] of report.rows.entries()) {
    lines.push(`[${i + 1}] ${row.title.slice(0, 50)}`);
    lines.push(`    post: ${row.postUrl}`);
    lines.push(`    searchUrl: ${row.searchVideoUrl ? "yes" : "no"}`);
    lines.push(`    resolvedUrl: ${row.resolvedVideoUrl ? "yes" : "no"}`);
    if (row.download.ok) {
      lines.push(
        `    download: OK ${row.download.bytes} bytes · ${row.download.contentType} · ftyp=${row.looksLikeMp4 ? "yes" : "no"}`,
      );
    } else {
      lines.push(`    download: FAIL (${row.download.error ?? "unknown"})`);
    }
    lines.push("");
  }

  lines.push(
    `RESULT: anyDownloadOk=${report.anyDownloadOk} anyMp4Ok=${report.anyMp4Ok}`,
  );
  return lines.join("\n");
}
