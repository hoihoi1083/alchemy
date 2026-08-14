import type { Locale } from "@/lib/i18n";
import type { StudioAssistantIntent } from "@/lib/studio-assistant-intent";
import { formatCoachChecklistForPrompt } from "@/lib/studio-assistant-coach";
import {
  formatKnowledgeForPrompt,
  knowledgeLocaleFromApp,
  retrieveAssistantKnowledge,
  type AssistantKnowledgeChunk,
} from "@/lib/studio-assistant-knowledge";
import type { AssistantTurnMode } from "@/lib/studio-assistant-turn-mode";
import {
  isLandingLikeSurface,
  isToolAssistantSurface,
} from "@/lib/studio-assistant-surface";
import type { StudioAssistantSnapshot } from "@/lib/studio-assistant-types";

function langLine(_locale: Locale): string {
  return "Reply in the SAME language as the user's latest message (English → English; 中文 → 繁體 or 简体 per locale setting if user wrote Chinese).";
}

function askFormatRule(): string {
  return [
    "【Ask mode — product Q&A】",
    "Answer the user's question about Alchemy using 【Product knowledge】 + current context only.",
    "If knowledge does not cover it, say you don't know. Never invent features, buttons, prices, or engines.",
    "Do NOT force Step 1 or studio-action links unless they clearly ask to start making something now.",
    "Real paths you may mention as markdown: [/](/) [/start](/start) [/studio](/studio) [/captions](/captions) [/edit-image](/edit-image) [/pro](/pro) [/brand-kit](/brand-kit) [/library](/library) [/ugc](/ugc) [/pricing](/pricing).",
    "Homepage finishable video-recipe cards are HIDDEN — do not tell users to click them.",
    "Ask-AI launcher is landing-only (small logo). Hidden on studio, captions, edit-image, brand-kit, pricing, pro, and all other pages.",
    "Plain text; no **.",
  ].join("\n");
}

function guideFormatRule(locale: Locale): string {
  const captions =
    locale === "en"
      ? "[Caption studio](/captions)"
      : "[字幕工具](/captions)";
  return [
    "【Guide mode — one next step】",
    "1. User's LATEST message defines the campaign. Never substitute crystals or default products unless THEY asked.",
    "2. Homepage excerpt = background facts only.",
    "3. ONLY Step 1 — must match 【Coach】 block (path + task id).",
    "4. Max ONE action link. Copy EXACTLY — never invent IDs:",
    "   English landing: [Set up & open studio](studio-action:setup-website-reel)",
    "   中文 landing: [一鍵設定並進入工作室](studio-action:setup-website-reel)",
    "   Physical product: [Open product image studio](studio-action:open-physical-studio)",
    "   Captions: [Caption studio](studio-action:open-captions) or " + captions,
    "   Edit image: [Image editor](studio-action:open-edit-image)",
    "5. In studio: no landing-only links (setup-website-reel, open-*-studio).",
    "6. Plain text; no **.",
  ].join("\n");
}

export function getStudioAssistantFacts(locale: Locale): string {
  const isZh = locale === "zh" || locale === "zh-cn" || locale === "zh-tw";
  if (isZh) {
    return `
【Alchemy 硬事實 — 唔好同下面知識庫矛盾】
- 免寫 Prompt；Tokens 按次。免費註冊一次 500。
- /start：實體 vs 概念。/studio 引導 wizard。/captions 燒字幕。/edit-image 修圖。/pro 節點畫布（Master）。
- 分鏡 TVC 無參考片：先 MiniMax H3（一鏡）；額度唔夠先問 Kling 拼接。有參考 MP4：Seedance R2V。
- 12 秒 H3 ≈ 1140 tokens，免費 500 唔夠；Kling 4×5s ≈ 440 可能夠。
- 首頁「可完成影片配方」卡已隱藏。問 AI 只喺首頁細 Logo；其他頁關閉。
`.trim();
  }
  return `
【Alchemy hard facts — do not contradict knowledge below】
- Prompt-free; tokens pay-per-use. Free signup grant 500 once.
- /start: physical vs concept. /studio guided wizard. /captions burn-in. /edit-image retouch. /pro node canvas (Master).
- Stills TVC without reference MP4: MiniMax H3 first (one take); offer Kling stitch if H3 does not fit. Reference reel: Seedance R2V.
- 12s H3 ≈ 1140 tokens — free 500 cannot cover it; Kling 4×5s ≈ 440 may fit.
- Homepage finishable recipe cards are hidden. Ask-AI is landing-only (small logo); off everywhere else.
`.trim();
}

export function formatSnapshotForPrompt(
  snapshot: StudioAssistantSnapshot,
  locale: Locale,
): string {
  const stepLabels =
    locale === "zh-cn"
      ? { setup: "设置", image: "出图", video: "出片", done: "完成" }
      : locale === "zh"
        ? { setup: "設定", image: "出圖", video: "出片", done: "完成" }
        : { setup: "setup", image: "image", video: "video", done: "done" };

  return [
    "【User's current context】",
    `surface: ${snapshot.surface} (landing/start/site=marketing pages; studio=wizard; edit-image/captions/pro/brand-kit/library/ugc=standalone tools)`,
    snapshot.promotionMode
      ? `promotionMode: ${snapshot.promotionMode}`
      : "promotionMode: not chosen yet",
    `workflowMode: ${snapshot.workflowMode}`,
    `step: ${stepLabels[snapshot.stepKey]} (${snapshot.stepKey})`,
    `visualStyleId: ${snapshot.visualStyleId}`,
    `market: ${snapshot.promptMarket}`,
    snapshot.product ? `product: ${snapshot.product}` : "",
    snapshot.business ? `business: ${snapshot.business}` : "",
    snapshot.headline ? `headline: ${snapshot.headline}` : "",
    snapshot.subline ? `subline: ${snapshot.subline.slice(0, 200)}` : "",
    snapshot.offer ? `offer: ${snapshot.offer}` : "",
    snapshot.conceptIdea ? `conceptIdea: ${snapshot.conceptIdea.slice(0, 300)}` : "",
    snapshot.creativeVideoBrief
      ? `creativeVideoBrief: ${snapshot.creativeVideoBrief.slice(0, 400)}`
      : "",
    snapshot.brandWebsiteUrl ? `brandWebsiteUrl: ${snapshot.brandWebsiteUrl}` : "",
    `hasBrandProfile: ${snapshot.hasBrandProfile}`,
    `hasProductPhoto: ${snapshot.hasProductPhoto}`,
    snapshot.hasStyleReference !== undefined
      ? `hasStyleReference: ${snapshot.hasStyleReference}`
      : "",
    snapshot.imageCreativeMode ? `imageCreativeMode: ${snapshot.imageCreativeMode}` : "",
    snapshot.imageOutputMode ? `imageOutputMode: ${snapshot.imageOutputMode}` : "",
    snapshot.coachAck?.length ? `coachAck: ${snapshot.coachAck.join(", ")}` : "",
    `hasKeyframe: ${snapshot.hasKeyframe}`,
    `hasVideo: ${snapshot.hasVideo}`,
    `cinematicSceneCount: ${snapshot.cinematicSceneCount}`,
    `voiceoverEnabled: ${snapshot.voiceoverEnabled}`,
    `captionBurnEnabled: ${snapshot.captionBurnEnabled}`,
    snapshot.hasEditImageSource !== undefined
      ? `hasEditImageSource: ${snapshot.hasEditImageSource}`
      : "",
    snapshot.hasCaptionSource !== undefined
      ? `hasCaptionSource: ${snapshot.hasCaptionSource}`
      : "",
    snapshot.error ? `lastError: ${snapshot.error.slice(0, 400)}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildStudioAssistantSystemPrompt(
  locale: Locale,
  snapshot: StudioAssistantSnapshot,
  extras?: {
    detectedUrl?: string;
    sitePreview?: string;
    intent?: StudioAssistantIntent;
    turnMode?: AssistantTurnMode;
    knowledgeChunks?: AssistantKnowledgeChunk[];
    userText?: string;
  },
): string {
  const name =
    locale === "zh-cn" ? "小炼" : locale === "zh-tw" || locale === "zh" ? "小煉" : "Alchemy guide";
  const turnMode = extras?.turnMode ?? "ask";
  const facts = getStudioAssistantFacts(locale);
  const stateBlock = formatSnapshotForPrompt(snapshot, locale);
  const siteBlock =
    extras?.detectedUrl && extras.sitePreview
      ? [
          "【Website the user mentioned】",
          `URL: ${extras.detectedUrl}`,
          `Homepage text excerpt (for context only):`,
          extras.sitePreview.slice(0, 1500),
        ].join("\n")
      : extras?.detectedUrl
        ? `【Website URL from user】: ${extras.detectedUrl}`
        : "";

  const chunks =
    extras?.knowledgeChunks ??
    retrieveAssistantKnowledge(extras?.userText ?? "", {
      locale: knowledgeLocaleFromApp(locale),
      limit: turnMode === "ask" ? 6 : 4,
    });
  const knowledgeBlock = formatKnowledgeForPrompt(chunks, knowledgeLocaleFromApp(locale));

  const role =
    turnMode === "ask"
      ? `You are "${name}". You explain how Alchemy AI Lab works — pages, tokens, video engines, and how to start. Warm, accurate, no fluff.`
      : `You are "${name}", a step-by-step coach. Never dump menus. Never ignore what the user said they want to promote.`;

  return [
    role,
    langLine(locale),
    turnMode === "ask" ? askFormatRule() : guideFormatRule(locale),
    facts,
    knowledgeBlock,
    siteBlock,
    stateBlock,
    turnMode === "guide" ? formatCoachChecklistForPrompt(snapshot, locale) : "",
    extras?.intent ? `Detected intent (weak hint only): ${extras.intent}` : "",
    `Turn mode: ${turnMode}`,
    turnMode === "guide" && isToolAssistantSurface(snapshot.surface)
      ? [
          `User is ON the ${snapshot.surface} tool — coach THIS page. Do not send them to /studio unless they ask to generate a new ad.`,
          "No landing-only studio-action links unless they ask to leave.",
        ].join("\n")
      : turnMode === "guide" && isLandingLikeSurface(snapshot.surface)
        ? [
            "User is NOT in studio yet. Step 1 button MUST match what they asked for:",
            "- Real product / product photo / image post → [Open product image studio](studio-action:open-physical-studio) — NOT setup-website-reel.",
            "- Website / service / concept video → setup-website-reel or open-concept-studio.",
            "- Static website launch image → website-launch-image.",
            "- Edit / retouch → open-edit-image. Captions → open-captions. Canvas → open-pro.",
            "Never route a physical product image post to concept 8s Reel.",
          ].join("\n")
        : turnMode === "guide"
          ? "User is IN studio — Step 1 should be a field to fill or a button on the current step."
          : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}
