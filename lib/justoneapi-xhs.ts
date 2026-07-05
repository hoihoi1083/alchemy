/** @deprecated Import from `@/lib/justoneapi-client` or `@/lib/justoneapi-platform-search`. */
export {
  hasJustOneApiConfigured as hasXhsNoteSearchConfigured,
  justOneApiBaseUrl,
  justOneApiToken,
} from "@/lib/justoneapi-client";

import { searchPlatformPostsByKeyword } from "@/lib/justoneapi-platform-search";
import type { ContentResearchPost } from "@/lib/content-research-types";

export async function searchXhsNotesByKeyword(
  keyword: string,
  options?: { limit?: number },
): Promise<{ posts: ContentResearchPost[]; requestId?: string }> {
  const result = await searchPlatformPostsByKeyword("xiaohongshu", keyword, {
    limit: options?.limit ?? 8,
  });
  return { posts: result.posts, requestId: result.requestId };
}
