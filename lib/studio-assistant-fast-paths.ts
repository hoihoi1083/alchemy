import type { Locale } from "@/lib/i18n";
import type { StudioAssistantIntent } from "@/lib/studio-assistant-intent";
import { detectStudioAssistantIntent } from "@/lib/studio-assistant-intent";
import { detectAssistantTurnMode } from "@/lib/studio-assistant-turn-mode";
import {
  isLandingLikeSurface,
  isToolAssistantSurface,
} from "@/lib/studio-assistant-surface";
import type {
  StudioAssistantMessage,
  StudioAssistantSnapshot,
} from "@/lib/studio-assistant-types";
import {
  buildCoachReply,
  extractCampaignHint,
  getNextStudioCoachTask,
  shouldUseCoachFastPath,
  type CoachTaskKind,
} from "@/lib/studio-assistant-coach";

const LANDING_INTENTS = new Set<StudioAssistantIntent>([
  "website_video",
  "website_image",
  "physical_product",
  "physical_image_post",
  "captions_only",
  "edit_image",
  "reference_ad",
  "pro_canvas",
  "brand_kit",
  "pricing",
  "library",
  "ugc",
]);

export function shouldUseLandingCoachFastPath(
  userText: string,
  snapshot: StudioAssistantSnapshot,
): boolean {
  if (detectAssistantTurnMode(userText, detectStudioAssistantIntent(userText)) === "ask") {
    return false;
  }
  if (snapshot.surface === "studio") return false;
  if (isToolAssistantSurface(snapshot.surface)) {
    return (
      shouldUseCoachFastPath(userText) ||
      /how|怎|點|点|字幕|燒|烧|修圖|修图|inpaint|bgm|配樂|配乐|voice|配音|匯出|导出|upload|上傳|上传/i.test(
        userText,
      )
    );
  }
  if (!isLandingLikeSurface(snapshot.surface)) return false;
  const intent = detectStudioAssistantIntent(userText);
  if (LANDING_INTENTS.has(intent)) return true;
  if (/storyboard|分鏡|分镜|multi.?scene|多場|多场/i.test(userText)) return true;
  return false;
}

export function tryStudioAssistantFastPath(
  userText: string,
  snapshot: StudioAssistantSnapshot,
  locale: Locale,
  messages?: StudioAssistantMessage[],
  detectedUrl?: string,
  intent?: StudioAssistantIntent,
  previousCoachTask?: CoachTaskKind | null,
): string | null {
  const trimmed = userText.trim();
  if (trimmed.length < 2) return null;
  // In-studio step coaching is disabled — wizard UI only. Landing keeps Q&A + action buttons.
  if (snapshot.surface === "studio") return null;
  if (detectAssistantTurnMode(trimmed, intent) === "ask") return null;

  const resolvedIntent = intent ?? detectStudioAssistantIntent(trimmed);
  const useCoach =
    shouldUseCoachFastPath(trimmed) || shouldUseLandingCoachFastPath(trimmed, snapshot);
  if (!useCoach) return null;

  const task = getNextStudioCoachTask(snapshot, {
    intent: resolvedIntent,
    detectedUrl,
    userText: trimmed,
  });
  const campaignHint = messages ? extractCampaignHint(messages) : "";

  return buildCoachReply(task, snapshot, locale, {
    campaignHint,
    detectedUrl,
    userText: trimmed,
    intent: resolvedIntent,
    previousCoachTask,
  });
}

export function sanitizeAssistantReply(text: string): string {
  return text.replaceAll("**", "").trim();
}

export {
  normalizeAssistantActionLinks,
  appendPrimaryActionIfMissing,
  userWritesEnglish,
  replyHasValidActionLink,
} from "@/lib/studio-assistant-action-links";

export { stripInvalidActionLinks } from "@/lib/studio-assistant-coach";
