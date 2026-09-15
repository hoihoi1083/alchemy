import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { callDeepSeekChat, streamDeepSeekChat } from "@/lib/deepseek-client";
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
import { extractUrlFromMessages, shouldLoadSitePreviewForTurn } from "@/lib/studio-assistant-url";
import { requireAppUser } from "@/lib/require-app-user";
import { assertAnonymousDeepSeekQuota, assertFreeDeepSeekQuota } from "@/lib/rate-limit-deepseek";
import { clientKeyFromRequest } from "@/lib/request-client-key";
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
import { getUserPlan } from "@/lib/billing/get-user-plan";
import { getUserBalance } from "@/lib/billing/ledger";
import { buildAssistantFollowUps } from "@/lib/studio-assistant-follow-ups";
import { buildDegradedKnowledgeReply } from "@/lib/studio-assistant-degraded-reply";

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

function anonymousQuotaKey(request: Request): string {
  const key = clientKeyFromRequest(request);
  if (key === "anon:unknown" && process.env.NODE_ENV === "development") {
    return "anon:dev-local";
  }
  return key;
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

async function enrichSnapshotBilling(
  snapshot: StudioAssistantSnapshot,
  userId: string | null,
): Promise<StudioAssistantSnapshot> {
  if (!userId) {
    return { ...snapshot, signedIn: false, userPlan: null, tokenBalance: null };
  }
  try {
    const [plan, wallet] = await Promise.all([
      getUserPlan(userId),
      getUserBalance(userId),
    ]);
    return {
      ...snapshot,
      signedIn: true,
      userPlan: plan,
      tokenBalance: wallet?.balance ?? null,
    };
  } catch {
    return { ...snapshot, signedIn: true, userPlan: null, tokenBalance: null };
  }
}

async function loadSitePreview(url: string): Promise<string> {
  try {
    const { text } = await fetchWebsiteText(url);
    return text.slice(0, 2000);
  } catch {
    return "";
  }
}

function wantsStream(request: Request, body: { stream?: unknown }): boolean {
  if (body.stream === true) return true;
  const accept = request.headers.get("accept") || "";
  return accept.includes("text/event-stream");
}

function sseEncode(obj: unknown): string {
  return `data: ${JSON.stringify(obj)}\n\n`;
}

export async function POST(request: Request) {
  const { userId } = await auth();

  let body: {
    messages?: unknown;
    locale?: unknown;
    snapshot?: unknown;
    previousCoachTask?: unknown;
    stream?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: SERVER_ERRORS.invalidInput }, { status: 400 });
  }

  const locale = parseLocale(body.locale);
  const messages = parseMessages(body.messages);
  const parsedSnapshot = parseSnapshot(body.snapshot);
  const stream = wantsStream(request, body);

  if (!parsedSnapshot) {
    return NextResponse.json(
      { success: false, error: "Invalid assistant snapshot." },
      { status: 400 },
    );
  }

  if (parsedSnapshot.surface === "studio" && !userId) {
    const authGate = await requireAppUser();
    if (!authGate.ok) return authGate.response;
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

  const snapshot = await enrichSnapshotBilling(parsedSnapshot, userId ?? null);

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

  const campaignHint = extractCampaignHint(messages);

  const meta = {
    fastPath: false,
    degraded: false,
    streamed: false,
    detectedUrl: detectedUrl ?? null,
    intent,
    turnMode,
    surface: snapshot.surface,
    signedIn: Boolean(snapshot.signedIn),
    userPlan: snapshot.userPlan ?? null,
    knowledgeIds: [] as string[],
  };

  const buildFollowUps = (coachTask: CoachTaskKind | null) =>
    buildAssistantFollowUps({
      locale,
      turnMode,
      intent,
      coachTask,
      signedIn: Boolean(snapshot.signedIn),
    });

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
      campaignHint,
      hasWebsiteUrl: Boolean(detectedUrl),
      turnMode,
    });
    const followUps = buildFollowUps(finalized.coachTask);
    return NextResponse.json({
      success: true,
      reply: finalized.reply,
      followUps,
      meta: { ...meta, fastPath: true, coachTask: finalized.coachTask },
    });
  }

  if (!userId) {
    const quota = await assertAnonymousDeepSeekQuota(anonymousQuotaKey(request));
    if (!quota.ok) return quota.response;
  } else {
    const quota = await assertFreeDeepSeekQuota(userId);
    if (!quota.ok) return quota.response;
  }

  const sitePreview =
    detectedUrl && shouldLoadSitePreviewForTurn(lastUser.content, detectedUrl)
      ? await loadSitePreview(detectedUrl)
      : "";
  const knowledgeChunks = retrieveAssistantKnowledge(lastUser.content, {
    locale: knowledgeLocaleFromApp(locale),
    limit: turnMode === "ask" ? 6 : 4,
    alwaysCore: turnMode !== "ask",
  });
  meta.knowledgeIds = knowledgeChunks.map((c) => c.id);

  const finalizeOpts = {
    detectedUrl,
    campaignHint,
    hasWebsiteUrl: Boolean(detectedUrl),
    turnMode,
  } as const;

  const polish = (raw: string) => {
    let reply = sanitizeAssistantReply(raw);
    reply = normalizeAssistantActionLinks(reply);
    reply = stripInvalidActionLinks(reply, snapshot);
    return finalizeAssistantReply(reply, snapshot, locale, intent, lastUser.content, finalizeOpts);
  };

  const systemContent = buildStudioAssistantSystemPrompt(locale, snapshot, {
    detectedUrl,
    sitePreview,
    intent,
    turnMode,
    knowledgeChunks,
    userText: lastUser.content,
  });
  const chatMessages = [
    { role: "system" as const, content: systemContent },
    ...messages,
  ];

  // Guide turns inject action links in polish() — stream raw then rewrite flickers.
  // Ask mode keeps SSE; guide uses polished JSON.
  const useStream = stream && turnMode === "ask";

  if (useStream) {
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        const push = (obj: unknown) => controller.enqueue(encoder.encode(sseEncode(obj)));
        try {
          push({ type: "meta", meta: { ...meta, streamed: true } });
          let acc = "";
          for await (const delta of streamDeepSeekChat(chatMessages, {
            temperature: 0.65,
            max_tokens: 900,
          })) {
            acc += delta;
            push({ type: "delta", text: delta });
          }
          const finalized = polish(acc);
          const followUps = buildFollowUps(finalized.coachTask);
          push({
            type: "done",
            reply: finalized.reply,
            followUps,
            meta: {
              ...meta,
              streamed: true,
              coachTask: finalized.coachTask,
            },
          });
        } catch {
          const degradedRaw = buildDegradedKnowledgeReply(knowledgeChunks, locale);
          const finalized = polish(degradedRaw);
          const followUps = buildFollowUps(finalized.coachTask);
          push({
            type: "done",
            reply: finalized.reply,
            followUps,
            meta: {
              ...meta,
              streamed: true,
              degraded: true,
              coachTask: finalized.coachTask,
            },
          });
        } finally {
          controller.close();
        }
      },
    });
    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  }

  try {
    const replyRaw = await callDeepSeekChat(chatMessages, {
      temperature: 0.65,
      max_tokens: 900,
    });
    const finalized = polish(replyRaw);
    const followUps = buildFollowUps(finalized.coachTask);
    return NextResponse.json({
      success: true,
      reply: finalized.reply,
      followUps,
      meta: {
        ...meta,
        coachTask: finalized.coachTask,
      },
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : SERVER_ERRORS.generationFailed;
    if (message.includes("DEEPSEEK") && !knowledgeChunks.length) {
      return NextResponse.json({ success: false, error: message }, { status: 503 });
    }
    // Prefer grounded facts over a blank error when the model is down.
    const degradedRaw = buildDegradedKnowledgeReply(knowledgeChunks, locale);
    const finalized = polish(degradedRaw);
    const followUps = buildFollowUps(finalized.coachTask);
    return NextResponse.json({
      success: true,
      reply: finalized.reply,
      followUps,
      meta: {
        ...meta,
        degraded: true,
        coachTask: finalized.coachTask,
        modelError: message.slice(0, 200),
      },
    });
  }
}
