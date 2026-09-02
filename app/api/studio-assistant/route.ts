import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { callDeepSeekChat } from "@/lib/deepseek-client";
import { fetchWebsiteText } from "@/lib/brand-analyze";
import { buildStudioAssistantSystemPrompt } from "@/lib/studio-assistant-facts";
import {
  knowledgeLocaleFromApp,
  retrieveAssistantKnowledge,
} from "@/lib/studio-assistant-knowledge";
import { detectAssistantTurnMode } from "@/lib/studio-assistant-turn-mode";
import { extractCampaignHint } from "@/lib/studio-assistant-coach";
import {
  getNextStudioCoachTask,
  type CoachTaskKind,
} from "@/lib/studio-assistant-coach-profile";
import {
  appendPrimaryActionIfMissing,
  normalizeAssistantActionLinks,
  sanitizeAssistantReply,
  stripInvalidActionLinks,
  tryStudioAssistantFastPath,
  userWritesEnglish,
} from "@/lib/studio-assistant-fast-paths";
import { detectStudioAssistantIntent } from "@/lib/studio-assistant-intent";
import type { StudioAssistantIntent } from "@/lib/studio-assistant-intent";
import { enforceLandingCoachAction } from "@/lib/studio-assistant-enforce-coach";
import { extractUrlFromMessages } from "@/lib/studio-assistant-url";
import { requireAppUser } from "@/lib/require-app-user";
import { assertFreeDeepSeekQuota } from "@/lib/rate-limit-deepseek";
import { isAssistantSurface } from "@/lib/studio-assistant-surface";
import type {
  AssistantSurface,
  StudioAssistantMessage,
  StudioAssistantSnapshot,
} from "@/lib/studio-assistant-types";
import type { Locale } from "@/lib/i18n";
import { SERVER_ERRORS } from "@/lib/api/server-errors";
import type { PromotionMode } from "@/lib/promotion-mode";
import type { VisualStyleId } from "@/lib/visual-styles";

export const runtime = "nodejs";
export const maxDuration = 60;

function finalizeAssistantReply(
  reply: string,
  snapshot: StudioAssistantSnapshot,
  locale: Locale,
  intent: StudioAssistantIntent,
  lastUserContent: string,
  opts: {
    detectedUrl?: string;
    campaignHint?: string;
    hasWebsiteUrl: boolean;
    turnMode: "ask" | "guide";
  },
): { reply: string; coachTask: CoachTaskKind | null } {
  if (opts.turnMode === "ask") {
    const askReply = reply
      .replace(/\[([^\]]+)\]\(studio-action:[^)]+\)/gi, "$1")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    return { reply: askReply, coachTask: null };
  }
  const coachTask = getNextStudioCoachTask(snapshot, {
    intent,
    detectedUrl: opts.detectedUrl,
    userText: lastUserContent,
  });
  let out = reply;
  out = appendPrimaryActionIfMissing(out, {
    snapshot,
    locale,
    userWritesEnglish: userWritesEnglish(lastUserContent),
    hasWebsiteUrl: opts.hasWebsiteUrl,
    campaignHint: opts.campaignHint,
    detectedUrl: opts.detectedUrl,
    userText: lastUserContent,
    intent,
  });
  out = enforceLandingCoachAction(
    out,
    coachTask,
    snapshot,
    userWritesEnglish(lastUserContent),
  );
  return { reply: out, coachTask };
}

const MAX_MESSAGES = 14;

function parseLocale(raw: unknown): Locale {
  if (raw === "zh" || raw === "zh-cn" || raw === "zh-tw" || raw === "en") return raw;
  return "en";
}

function parseMessages(raw: unknown): StudioAssistantMessage[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (m): m is StudioAssistantMessage =>
        Boolean(m) &&
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string",
    )
    .map((m) => ({
      role: m.role,
      content: m.content.slice(0, 4000),
    }))
    .slice(-MAX_MESSAGES);
}

function parseSurface(raw: unknown): AssistantSurface {
  if (isAssistantSurface(raw)) return raw;
  return "landing";
}

function parseSnapshot(raw: unknown): StudioAssistantSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const s = raw as Partial<StudioAssistantSnapshot>;
  const surface = parseSurface(s.surface);
  const promotionMode: PromotionMode | null =
    s.promotionMode === "physical" || s.promotionMode === "concept"
      ? s.promotionMode
      : null;

  if (
    surface === "studio" &&
    promotionMode !== "physical" &&
    promotionMode !== "concept"
  ) {
    return null;
  }

  if (
    s.workflowMode !== "image-only" &&
    s.workflowMode !== "video-only" &&
    s.workflowMode !== "combined"
  ) {
    return null;
  }
  if (
    s.stepKey !== "setup" &&
    s.stepKey !== "image" &&
    s.stepKey !== "video" &&
    s.stepKey !== "done"
  ) {
    return null;
  }
  if (typeof s.visualStyleId !== "string") return null;

  return {
    surface,
    promotionMode,
    workflowMode: s.workflowMode,
    stepKey: s.stepKey,
    visualStyleId: s.visualStyleId as VisualStyleId,
    promptMarket:
      s.promptMarket === "hk" ||
      s.promptMarket === "tw" ||
      s.promptMarket === "cn" ||
      s.promptMarket === "en"
        ? s.promptMarket
        : "hk",
    product: String(s.product ?? "").slice(0, 500),
    business: String(s.business ?? "").slice(0, 500),
    headline: String(s.headline ?? "").slice(0, 500),
    subline: String(s.subline ?? "").slice(0, 1000),
    offer: String(s.offer ?? "").slice(0, 500),
    conceptIdea: String(s.conceptIdea ?? "").slice(0, 2000),
    creativeVideoBrief: String(s.creativeVideoBrief ?? "").slice(0, 2000),
    brandWebsiteUrl: String(s.brandWebsiteUrl ?? "").slice(0, 500),
    hasBrandProfile: Boolean(s.hasBrandProfile),
    hasProductPhoto: Boolean(s.hasProductPhoto),
    hasKeyframe: Boolean(s.hasKeyframe),
    hasStoryboardScenes: Boolean(s.hasStoryboardScenes),
    hasVideo: Boolean(s.hasVideo),
    cinematicSceneCount: Number(s.cinematicSceneCount) || 1,
    cinematicScenesCount: Number(s.cinematicScenesCount) || 0,
    storyboardBrief: String(s.storyboardBrief ?? "").slice(0, 2000),
    usesCompositor: Boolean(s.usesCompositor),
    error: s.error ? String(s.error).slice(0, 500) : null,
    voiceoverEnabled: Boolean(s.voiceoverEnabled),
    captionBurnEnabled: Boolean(s.captionBurnEnabled),
    imageOutputMode:
      s.imageOutputMode === "single" ||
      s.imageOutputMode === "ab" ||
      s.imageOutputMode === "campaign" ||
      s.imageOutputMode === "teaching-carousel" ||
      s.imageOutputMode === "carousel"
        ? s.imageOutputMode
        : "single",
    imageCreativeMode:
      s.imageCreativeMode === "promo-ai" || s.imageCreativeMode === "reference-concept"
        ? s.imageCreativeMode
        : undefined,
    hasStyleReference: Boolean(s.hasStyleReference),
    hasEditImageSource: Boolean(s.hasEditImageSource),
    hasCaptionSource: Boolean(s.hasCaptionSource),
    coachAck: Array.isArray(s.coachAck)
      ? (s.coachAck as CoachTaskKind[]).filter((t) => typeof t === "string")
      : undefined,
  };
}

async function loadSitePreview(url: string): Promise<string> {
  try {
    const { text } = await fetchWebsiteText(url);
    return text.slice(0, 2000);
  } catch {
    return "";
  }
}

export async function POST(request: Request) {
  const { userId } = await auth();

  let body: {
    messages?: unknown;
    locale?: unknown;
    snapshot?: unknown;
    previousCoachTask?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: SERVER_ERRORS.invalidInput }, { status: 400 });
  }

  const locale = parseLocale(body.locale);
  const messages = parseMessages(body.messages);
  const snapshot = parseSnapshot(body.snapshot);

  if (!snapshot) {
    return NextResponse.json(
      { success: false, error: "Invalid assistant snapshot." },
      { status: 400 },
    );
  }

  if (snapshot.surface === "studio" && !userId) {
    const auth = await requireAppUser();
    if (!auth.ok) return auth.response;
  }

  if (messages.length === 0) {
    return NextResponse.json(
      { success: false, error: "No messages." },
      { status: 400 },
    );
  }

  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  if (!lastUser) {
    return NextResponse.json(
      { success: false, error: "No user message." },
      { status: 400 },
    );
  }

  const detectedUrl =
    extractUrlFromMessages(messages) || snapshot.brandWebsiteUrl.trim() || undefined;
  const intent = detectStudioAssistantIntent(lastUser.content);
  const turnMode =
    snapshot.surface === "studio"
      ? "ask"
      : detectAssistantTurnMode(lastUser.content, intent);
  const previousCoachTask =
    typeof body.previousCoachTask === "string"
      ? (body.previousCoachTask as CoachTaskKind)
      : null;

  const meta = {
    fastPath: false,
    detectedUrl: detectedUrl ?? null,
    intent,
    turnMode,
    surface: snapshot.surface,
    knowledgeIds: [] as string[],
  };

  const fast = tryStudioAssistantFastPath(
    lastUser.content,
    snapshot,
    locale,
    messages,
    detectedUrl,
    intent,
    previousCoachTask,
  );
  if (fast) {
    let reply = sanitizeAssistantReply(fast);
    reply = normalizeAssistantActionLinks(reply);
    reply = stripInvalidActionLinks(reply, snapshot);
    const finalized = finalizeAssistantReply(reply, snapshot, locale, intent, lastUser.content, {
      detectedUrl,
      campaignHint: extractCampaignHint(messages),
      hasWebsiteUrl: Boolean(detectedUrl),
      turnMode,
    });
    return NextResponse.json({
      success: true,
      reply: finalized.reply,
      meta: { ...meta, fastPath: true, coachTask: finalized.coachTask },
    });
  }

  if (!userId) {
    const anonReply =
      locale === "en"
        ? "Sign in for open-ended Q&A (tokens, pricing, engines). Quick routes still work — try “help me make a product reel”, “explosion unbox video”, or tap a chip above."
        : locale === "zh-cn"
          ? "登录后可问额度、方案和引擎等开放问题。快捷路径仍可用 — 试试「帮我出产品短片」「爆炸开箱视频」，或点上方按钮。"
          : locale === "zh-tw"
            ? "登入後可問額度、方案和引擎等開放問題。快捷路徑仍可用 — 試試「幫我出產品短片」「爆炸開箱影片」，或點上方按鈕。"
            : "登入後可問額度、方案同引擎等開放問題。快捷路徑仍可用 — 試「幫我出產品 Reel」「爆炸開箱片」，或撳上面掣。";
    return NextResponse.json({
      success: true,
      reply: anonReply,
      meta: { ...meta, fastPath: true, anonAskBlocked: true },
    });
  }

  const quota = await assertFreeDeepSeekQuota(userId);
  if (!quota.ok) return quota.response;

  const sitePreview = detectedUrl ? await loadSitePreview(detectedUrl) : "";
  const knowledgeChunks = retrieveAssistantKnowledge(lastUser.content, {
    locale: knowledgeLocaleFromApp(locale),
    limit: turnMode === "ask" ? 6 : 4,
  });
  meta.knowledgeIds = knowledgeChunks.map((c) => c.id);

  try {
    const systemContent = buildStudioAssistantSystemPrompt(locale, snapshot, {
      detectedUrl,
      sitePreview,
      intent,
      turnMode,
      knowledgeChunks,
      userText: lastUser.content,
    });
    const replyRaw = await callDeepSeekChat(
      [{ role: "system", content: systemContent }, ...messages],
      { temperature: 0.65, max_tokens: 900 },
    );
    let reply = sanitizeAssistantReply(replyRaw);
    reply = normalizeAssistantActionLinks(reply);
    reply = stripInvalidActionLinks(reply, snapshot);
    const finalized = finalizeAssistantReply(reply, snapshot, locale, intent, lastUser.content, {
      detectedUrl,
      campaignHint: extractCampaignHint(messages),
      hasWebsiteUrl: Boolean(detectedUrl),
      turnMode,
    });
    return NextResponse.json({
      success: true,
      reply: finalized.reply,
      meta: {
        ...meta,
        coachTask: finalized.coachTask,
      },
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : SERVER_ERRORS.generationFailed;
    const status = message.includes("DEEPSEEK") ? 503 : 502;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
