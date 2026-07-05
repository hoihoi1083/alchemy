import { NextResponse } from "next/server";
import { callDeepSeekChat } from "@/lib/deepseek-client";
import { fetchWebsiteText } from "@/lib/brand-analyze";
import { buildStudioAssistantSystemPrompt } from "@/lib/studio-assistant-facts";
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
  },
): { reply: string; coachTask: CoachTaskKind } {
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
  if (raw === "zh" || raw === "zh-cn" || raw === "en") return raw;
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
  if (raw === "landing" || raw === "start" || raw === "studio") return raw;
  return "studio";
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
      s.imageOutputMode === "teaching-carousel"
        ? s.imageOutputMode
        : "single",
    imageCreativeMode:
      s.imageCreativeMode === "promo-ai" || s.imageCreativeMode === "reference-concept"
        ? s.imageCreativeMode
        : undefined,
    hasStyleReference: Boolean(s.hasStyleReference),
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
  const auth = await requireAppUser();
  if (!auth.ok) return auth.response;

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
  const sitePreview = detectedUrl ? await loadSitePreview(detectedUrl) : "";
  const intent = detectStudioAssistantIntent(lastUser.content);
  const previousCoachTask =
    typeof body.previousCoachTask === "string"
      ? (body.previousCoachTask as CoachTaskKind)
      : null;

  const meta = {
    fastPath: false,
    detectedUrl: detectedUrl ?? null,
    intent,
    surface: snapshot.surface,
  };

  // Only ultra-short utility queries skip the LLM (e.g. "next step" on studio).
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
    });
    return NextResponse.json({
      success: true,
      reply: finalized.reply,
      meta: { ...meta, fastPath: true, coachTask: finalized.coachTask },
    });
  }

  try {
    const systemContent = buildStudioAssistantSystemPrompt(locale, snapshot, {
      detectedUrl,
      sitePreview,
      intent,
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
