import type { CoachTaskKind } from "@/lib/studio-assistant-coach-profile";
import type { StudioAssistantSnapshot } from "@/lib/studio-assistant-types";
import { isCoachTaskAcked } from "@/lib/studio-assistant-coach-progress";

/** Guidance steps — user can reply 下一步 to confirm they read (default choices OK). */
const GUIDANCE_TASKS = new Set<CoachTaskKind>([
  "choose-visual-style",
  "choose-image-output",
  "analyze-concept-ai",
  "upload-concept-reference-photo",
]);

export function isGuidanceCoachTask(task: CoachTaskKind): boolean {
  return GUIDANCE_TASKS.has(task);
}

export function isCoachTaskComplete(
  task: CoachTaskKind,
  snapshot: StudioAssistantSnapshot,
): boolean {
  switch (task) {
    case "fill-product-name":
      return Boolean(snapshot.product.trim());
    case "fill-business":
      return Boolean(snapshot.business.trim());
    case "fill-headline":
      return Boolean(snapshot.headline.trim());
    case "fill-subline":
      return Boolean(snapshot.subline.trim());
    case "fill-offer":
      return Boolean(snapshot.offer.trim());
    case "fill-concept":
      return Boolean(snapshot.conceptIdea.trim());
    case "fill-storyboard-brief":
      return Boolean(snapshot.storyboardBrief.trim());
    case "fill-creative-video-brief":
      return Boolean(snapshot.creativeVideoBrief.trim() || snapshot.conceptIdea.trim());
    case "enter-brand-url":
      return Boolean(snapshot.brandWebsiteUrl.trim());
    case "upload-product-photo":
      return snapshot.hasProductPhoto;
    case "upload-style-reference":
      return Boolean(snapshot.hasStyleReference);
    case "analyze-brand":
    case "analyze-brand-before-image":
      return snapshot.hasBrandProfile;
    case "choose-visual-style":
      return (
        isCoachTaskAcked(task, snapshot.coachAck) ||
        snapshot.visualStyleId !== "product"
      );
    case "choose-image-output":
      return (
        isCoachTaskAcked(task, snapshot.coachAck) ||
        (snapshot.imageOutputMode !== undefined && snapshot.imageOutputMode !== "single")
      );
    case "continue-setup":
      return snapshot.stepKey !== "setup";
    case "generate-image":
      return snapshot.hasKeyframe;
    case "generate-cinematic-keyframe":
      return snapshot.hasKeyframe || snapshot.cinematicScenesCount >= 1;
    case "generate-cinematic-scenes":
      return snapshot.cinematicScenesCount >= snapshot.cinematicSceneCount;
    case "generate-storyboard-scenes":
      return snapshot.hasStoryboardScenes;
    case "generate-video":
    case "generate-cinematic-video":
    case "generate-creative-video":
    case "generate-storyboard-video":
      return snapshot.hasVideo;
    case "plan-ad-pack":
      return snapshot.hasVideo;
    case "done-download":
      return true;
    default:
      return isCoachTaskAcked(task, snapshot.coachAck);
  }
}

export function coachTaskMissingReason(
  task: CoachTaskKind,
  snapshot: StudioAssistantSnapshot,
  en: boolean,
): string {
  switch (task) {
    case "fill-product-name":
      return en
        ? "Product name is still empty in Setup."
        : "Setup 嘅產品名稱仍然係空白。";
    case "fill-concept":
      return en
        ? "Concept description (概念描述) is still empty."
        : "概念描述仍然未填。";
    case "enter-brand-url":
      return en
        ? "Brand website URL is not in the Setup field yet."
        : "品牌網站欄位仍然未貼網址。";
    case "upload-product-photo":
      return en
        ? "No product photo uploaded yet — use the upload zone in Setup or Image step."
        : "仍然未上傳產品相 — 請用 Setup 或出圖步嘅上傳區。";
    case "upload-style-reference":
      return en
        ? "No style reference uploaded yet — use the reference layout zone at the top of the Image step."
        : "仍然未上傳參考排版圖 — 請用出圖步頂部參考區。";
    case "analyze-brand":
    case "analyze-brand-before-image":
      return en
        ? "Brand not analyzed yet — click Analyze brand after URL is pasted."
        : "仍未分析品牌 — 貼好網址後要按「分析品牌」。";
    case "fill-storyboard-brief":
      return en
        ? "Storyboard brief is still empty."
        : "分鏡簡述仍然未填。";
    case "fill-headline":
      return en ? "Headline is still empty." : "主標題仍然空白。";
    case "fill-creative-video-brief":
      return en
        ? "Creative video brief is still empty."
        : "影片創意簡述仍然未填。";
    case "generate-image":
      return en
        ? "Image not generated yet — click Generate image."
        : "仍未出圖 — 請按「生成圖片」。";
    case "generate-cinematic-keyframe":
      return en
        ? "Cinematic keyframe not generated yet."
        : "仍未生成電影感關鍵幀。";
    case "generate-cinematic-scenes":
      return en
        ? `Cinematic scenes incomplete (${snapshot.cinematicScenesCount}/${snapshot.cinematicSceneCount}).`
        : `電影場景未齊（${snapshot.cinematicScenesCount}/${snapshot.cinematicSceneCount}）。`;
    case "generate-storyboard-scenes":
      return en
        ? "Storyboard scene images not generated yet."
        : "仍未生成分鏡場景圖。";
    case "generate-video":
    case "generate-cinematic-video":
    case "generate-creative-video":
    case "generate-storyboard-video":
      return en ? "Video not generated yet." : "仍未生成影片。";
    case "continue-setup":
      return en
        ? "You are still on Setup — click Continue at the bottom."
        : "你仍然喺 Setup — 請按底部「繼續」。";
  }
  return en
    ? "This step is not finished yet."
    : "呢一步仍然未完成。";
}

export function shouldAckCoachTaskOnNext(
  task: CoachTaskKind,
  snapshot: StudioAssistantSnapshot,
): boolean {
  if (isGuidanceCoachTask(task)) return true;
  return isCoachTaskComplete(task, snapshot);
}

export function isCoachRepeatTurn(
  task: CoachTaskKind,
  snapshot: StudioAssistantSnapshot,
  userText?: string,
  previousTask?: CoachTaskKind | null,
): boolean {
  if (!/^(下一步|next|continue|繼續|继续)$/i.test(userText?.trim() ?? "")) {
    return false;
  }
  if (previousTask !== task) return false;
  if (isGuidanceCoachTask(task)) return false;
  return !isCoachTaskComplete(task, snapshot);
}

export function coachRepeatPreamble(
  task: CoachTaskKind,
  snapshot: StudioAssistantSnapshot,
  en: boolean,
): string {
  const reason = coachTaskMissingReason(task, snapshot, en);
  return en
    ? `⏳ Still on this step — you replied "next" but it is not done yet.\nReason: ${reason}\n\n`
    : `⏳ 仍然係呢一步 — 你回覆了「下一步」，但尚未完成。\n原因：${reason}\n\n`;
}
