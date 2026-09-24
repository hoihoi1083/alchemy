import { messageHasVendorName } from "@/lib/api/errors";
import type { ContentResearchPlan } from "@/lib/content-research-types";

/** Prefix stored in plan.researchWarning — localized on the client. */
export const RESEARCH_WARNING_CODE_PREFIX = "code:";

export type ResearchWarningCode =
  | "justone_gateway"
  | "justone_permission"
  | "justone_balance"
  | "justone_budget"
  | "justone_rate_limit"
  | "justone_generic"
  | "category_broadened";

export function researchWarningCode(value: ResearchWarningCode): string {
  return `${RESEARCH_WARNING_CODE_PREFIX}${value}`;
}

export function parseResearchWarningCode(
  raw: string | null | undefined,
): ResearchWarningCode | null {
  const t = String(raw ?? "").trim();
  if (!t.startsWith(RESEARCH_WARNING_CODE_PREFIX)) return null;
  const code = t.slice(RESEARCH_WARNING_CODE_PREFIX.length) as ResearchWarningCode;
  return code || null;
}

export type ContentResearchUiCopy = {
  platforms: Record<string, string>;
  sourceNoteJustOneLive: (platform: string) => string;
  /** Live web fallback note — never include a provider/vendor name. */
  sourceNoteWebLive: string;
  sourceNotePlaybook: string;
  sourceNoteDirectPost: string;
  sourceNoteDirectPostImage: string;
  sourceNoteDirectPostVideo: string;
  justOneFallbackGateway: string;
  justOneFallbackPermission: (platform: string) => string;
  justOneFallbackBalance: string;
  justOneFallbackBudget: string;
  justOneFallbackRateLimit: (detail: string) => string;
  justOneFallbackGeneric: (detail: string) => string;
  categoryBroadened: string;
  failed: string;
};

/** Drop env keys / vendor names from API errors before showing them. */
export function sanitizeResearchUserMessage(
  raw: string | null | undefined,
  fallback: string,
): string {
  const t = String(raw ?? "").trim();
  if (!t) return fallback;
  if (
    messageHasVendorName(t) ||
    /JUSTONE|TAVILY|SERPER|DEEPSEEK|\.env|API[_ ]?KEY|token budget|code\s*60[0-2]/i.test(t)
  ) {
    return fallback;
  }
  return t;
}

export function researchSourceNote(
  plan: ContentResearchPlan,
  cr: ContentResearchUiCopy,
  mode: "keyword" | "direct-post" = "keyword",
): string {
  if (mode === "direct-post") {
    if (plan.mediaFilter === "image") return cr.sourceNoteDirectPostImage;
    if (plan.mediaFilter === "video") return cr.sourceNoteDirectPostVideo;
    return cr.sourceNoteDirectPost;
  }

  const platformLabel =
    cr.platforms[plan.platform] ?? plan.platformLabel ?? plan.platform;

  if (plan.researchMode === "live-web") {
    if (plan.searchProvider === "justoneapi") {
      return cr.sourceNoteJustOneLive(platformLabel);
    }
    return cr.sourceNoteWebLive;
  }

  return cr.sourceNotePlaybook;
}

export function localizeResearchWarning(
  raw: string | null | undefined,
  cr: ContentResearchUiCopy,
  platform: string,
): string | null {
  const t = String(raw ?? "").trim();
  if (!t) return null;

  const code = parseResearchWarningCode(t);
  if (!code) {
    return sanitizeResearchUserMessage(t, cr.justOneFallbackGeneric(""));
  }

  const platformLabel = cr.platforms[platform] ?? platform;
  switch (code) {
    case "justone_gateway":
      return cr.justOneFallbackGateway;
    case "justone_permission":
      return cr.justOneFallbackPermission(platformLabel);
    case "justone_balance":
      return cr.justOneFallbackBalance;
    case "justone_budget":
      return cr.justOneFallbackBudget;
    case "justone_rate_limit":
      return cr.justOneFallbackRateLimit("");
    case "category_broadened":
      return cr.categoryBroadened;
    case "justone_generic":
    default:
      return cr.justOneFallbackGeneric("");
  }
}
