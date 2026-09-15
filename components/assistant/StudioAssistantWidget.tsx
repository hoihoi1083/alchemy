"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { AssistantMascotLauncher } from "@/components/assistant/AssistantMascotLauncher";
import { useLocale } from "@/components/LocaleProvider";
import { useOptionalWizard } from "@/components/studio/WizardContext";
import {
  actionNavigatesAway,
  actionNeedsBrandAnalyze,
  parseStudioAssistantActionId,
  runStudioAssistantAction,
} from "@/lib/studio-assistant-actions";
import {
  clearAssistantChat,
  consumeAssistantReopenFlag,
  readAssistantChat,
  writeAssistantChat,
} from "@/lib/studio-assistant-chat-storage";
import { buildDefaultAssistantSnapshot } from "@/lib/studio-assistant-default-snapshot";
import { buildStudioAssistantSnapshot } from "@/lib/studio-assistant-snapshot";
import { extractUrlFromText } from "@/lib/studio-assistant-url";
import {
  ackCoachTask,
  clearCoachAck,
  readCoachAck,
} from "@/lib/studio-assistant-coach-progress";
import { shouldAckCoachTaskOnNext } from "@/lib/studio-assistant-coach-completion";
import type { CoachTaskKind } from "@/lib/studio-assistant-coach-profile";
import {
  isLandingLikeSurface,
  usesDarkAssistantChrome,
} from "@/lib/studio-assistant-surface";
import type {
  AssistantSurface,
  StudioAssistantMessage,
} from "@/lib/studio-assistant-types";
import { ContentResearchPanel } from "@/components/content-research/ContentResearchPanel";
import { readCaptionHandoff } from "@/lib/caption-studio-draft";
import { IMAGE_CANVAS_DRAFT_KEY } from "@/lib/image-canvas-studio-draft";
import { isSafeAssistantPath } from "@/lib/studio-assistant-allowed-paths";
import { isCoachContinueReply } from "@/lib/studio-assistant-continue";
import {
  trackAssistantActionClick,
  trackAssistantError,
  trackAssistantOpened,
  trackAssistantQuotaExceeded,
  trackAssistantReply,
  trackAssistantSend,
} from "@/lib/analytics-assistant";
import { followUpAutoSends, followUpPromptForChip } from "@/lib/studio-assistant-follow-ups";
import { useUserPlanEntitlements } from "@/hooks/useUserPlanEntitlements";
import {
  consumeAssistantSignInDraft,
  writeAssistantSignInDraft,
} from "@/lib/studio-assistant-attribution";
import { extractCampaignHint } from "@/lib/studio-assistant-coach";

const ASSISTANT_VISIT_KEY = "alchemy-assistant-visit-v1";

type FollowUpChip = { id: string; label: string };
type ChatMessage = StudioAssistantMessage & { _id?: string };

function welcomeForSurface(
  surface: AssistantSurface,
  sa: {
    welcome: string;
    welcomeLanding: string;
    welcomeStart: string;
    welcomeEditImage: string;
    welcomeCaptions: string;
    welcomePro: string;
    welcomeBrandKit: string;
    welcomeLibrary: string;
    welcomeUgc: string;
    welcomeSite: string;
  },
): string {
  switch (surface) {
    case "landing":
      return sa.welcomeLanding;
    case "start":
      return sa.welcomeStart;
    case "edit-image":
      return sa.welcomeEditImage;
    case "captions":
      return sa.welcomeCaptions;
    case "pro":
      return sa.welcomePro;
    case "brand-kit":
      return sa.welcomeBrandKit;
    case "library":
      return sa.welcomeLibrary;
    case "ugc":
      return sa.welcomeUgc;
    case "site":
      return sa.welcomeSite;
    default:
      return sa.welcome;
  }
}

function readToolSourceFlags(): {
  hasEditImageSource: boolean;
  hasCaptionSource: boolean;
} {
  if (typeof window === "undefined") {
    return { hasEditImageSource: false, hasCaptionSource: false };
  }
  let hasEditImageSource = false;
  try {
    const raw = localStorage.getItem(IMAGE_CANVAS_DRAFT_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { sourceKey?: string; layers?: unknown[] };
      hasEditImageSource = Boolean(parsed.sourceKey) || (Array.isArray(parsed.layers) && parsed.layers.length > 0);
    }
  } catch {
    /* ignore */
  }
  let hasCaptionSource = false;
  try {
    hasCaptionSource = Boolean(readCaptionHandoff()?.videoUrl?.trim());
    if (!hasCaptionSource) {
      hasCaptionSource = Boolean(localStorage.getItem("alchemy-caption-draft"));
    }
  } catch {
    /* ignore */
  }
  return { hasEditImageSource, hasCaptionSource };
}

function renderMessageContent(
  text: string,
  onAction: (actionId: string) => void,
): React.ReactNode {
  if (!text) return null;
  const re = /\[([^\]]+)\]\(([^)]+)\)/g;
  const out: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) {
      out.push(
        <span key={`t-${key++}`} className="whitespace-pre-wrap">
          {text.slice(last, m.index)}
        </span>,
      );
    }
    const href = m[2];
    const label = m[1];
    const actionId = parseStudioAssistantActionId(href);
    if (actionId) {
      out.push(
        <button
          key={`a-${key++}`}
          type="button"
          data-coach-id="coach-landing-action"
          onClick={() => onAction(actionId)}
          className="font-medium text-violet-700 underline underline-offset-2 hover:text-violet-900"
        >
          {label}
        </button>,
      );
    } else if (href.startsWith("/") && isSafeAssistantPath(href)) {
      out.push(
        <Link
          key={`l-${key++}`}
          href={href}
          className="font-medium text-violet-700 underline underline-offset-2 hover:text-violet-900"
        >
          {label}
        </Link>,
      );
    } else {
      out.push(
        <span key={`t-${key++}`} className="whitespace-pre-wrap">
          {m[0]}
        </span>,
      );
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) {
    out.push(
      <span key={`t-${key++}`} className="whitespace-pre-wrap">
        {text.slice(last)}
      </span>,
    );
  }
  return out.length ? out : text;
}

function lastUserMessage(msgs: ChatMessage[]): string | undefined {
  for (let i = msgs.length - 1; i >= 0; i--) {
    if (msgs[i].role === "user") return msgs[i].content;
  }
  return undefined;
}

export function StudioAssistantWidget({ surface }: { surface: AssistantSurface }) {
  const router = useRouter();
  const { m, locale } = useLocale();
  const sa = m.studioAssistant;
  const { isSignedIn } = useAuth();
  const { plan, creditBalance } = useUserPlanEntitlements();
  const wizard = useOptionalWizard();

  const [hydrated, setHydrated] = useState(false);
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [followUps, setFollowUps] = useState<FollowUpChip[]>([]);
  const [returningNudge, setReturningNudge] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const typingMsgIdRef = useRef<string | null>(null);
  const pendingFullReplyRef = useRef<string>("");
  const pendingUrlRef = useRef<string | null>(null);
  const lastCoachTaskRef = useRef<CoachTaskKind | null>(null);
  const [coachAckTick, setCoachAckTick] = useState(0);
  const [showContentResearch, setShowContentResearch] = useState(false);

  const showQuickChips = isLandingLikeSurface(surface);
  const darkChrome = usesDarkAssistantChrome(surface);

  const snapshot = useMemo(() => {
    const base =
      surface === "studio" && wizard
        ? buildStudioAssistantSnapshot(wizard, "studio")
        : buildDefaultAssistantSnapshot(surface);
    const tools = readToolSourceFlags();
    return {
      ...base,
      ...tools,
      coachAck: readCoachAck(),
      signedIn: Boolean(isSignedIn),
      userPlan: isSignedIn ? plan : null,
      tokenBalance: isSignedIn && typeof creditBalance === "number" ? creditBalance : null,
    };
  }, [surface, wizard, coachAckTick, isSignedIn, plan, creditBalance]);

  const appendAssistant = useCallback((content: string) => {
    setMessages((prev) => [...prev, { role: "assistant", content }]);
  }, []);

  const resolvePendingUrl = useCallback(() => {
    return (
      pendingUrlRef.current?.trim() ||
      extractUrlFromText(wizard?.brandWebsiteUrl ?? "") ||
      null
    );
  }, [wizard?.brandWebsiteUrl]);

  useEffect(() => {
    if (surface === "studio" && wizard?.product?.trim()) {
      ackCoachTask("fill-product-name");
      setCoachAckTick((t) => t + 1);
    }
  }, [surface, wizard?.product]);

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    });
  };

  useEffect(() => {
    const stored = readAssistantChat();
    const reopen = consumeAssistantReopenFlag();
    if (stored?.messages?.length) {
      let msgs: ChatMessage[] = stored.messages;
      if (reopen) {
        msgs = [...msgs, { role: "assistant", content: sa.studioContinued }];
        setOpen(true);
      } else {
        setOpen(stored.open);
      }
      setMessages(msgs);
      if (stored.pendingUrl) pendingUrlRef.current = stored.pendingUrl;
    } else {
      setMessages([{ role: "assistant", content: welcomeForSurface(surface, sa) }]);
      if (reopen) setOpen(true);
    }
    try {
      const prev = localStorage.getItem(ASSISTANT_VISIT_KEY);
      const now = Date.now();
      if (prev) {
        const last = Number(prev);
        if (Number.isFinite(last) && now - last > 1000 * 60 * 60 * 12) {
          setReturningNudge(sa.returningNudge);
        }
      }
      localStorage.setItem(ASSISTANT_VISIT_KEY, String(now));
    } catch {
      /* ignore */
    }
    const signInDraft = consumeAssistantSignInDraft();
    if (signInDraft) {
      setInput(signInDraft);
      setOpen(true);
    }
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hydrate once on mount
  }, []);

  useEffect(() => {
    if (!hydrated || messages.length === 0) return;
    writeAssistantChat({
      messages: messages.map(({ role, content }) => ({ role, content })),
      pendingUrl: pendingUrlRef.current ?? undefined,
      open,
      updatedAt: new Date().toISOString(),
    });
  }, [messages, open, hydrated]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, open, loading]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    return () => {
      if (typingTimerRef.current) clearInterval(typingTimerRef.current);
    };
  }, []);

  const persistChatNow = useCallback(
    (nextMessages: ChatMessage[], keepOpen: boolean) => {
      writeAssistantChat({
        messages: nextMessages.map(({ role, content }) => ({ role, content })),
        pendingUrl: pendingUrlRef.current ?? undefined,
        open: keepOpen,
        updatedAt: new Date().toISOString(),
      });
    },
    [],
  );

  const handleAction = useCallback(
    async (actionId: string, opts?: { campaignMessage?: string }) => {
      const parsed = parseStudioAssistantActionId(`studio-action:${actionId}`);
      if (!parsed) {
        appendAssistant(sa.unknownAction);
        return;
      }
      trackAssistantActionClick({ actionId: parsed, surface });
      const url = resolvePendingUrl() ?? undefined;
      const wizardApi = surface === "studio" ? wizard : null;
      const campaignMessage =
        opts?.campaignMessage ??
        (extractCampaignHint(messages.map(({ role, content }) => ({ role, content }))) ||
          lastUserMessage(messages));

      if (actionNavigatesAway(parsed) && surface !== "studio") {
        const nextMessages: ChatMessage[] = [
          ...messages,
          { role: "assistant", content: sa.openingStudio },
        ];
        setMessages(nextMessages);
        persistChatNow(nextMessages, true);
      }

      runStudioAssistantAction(parsed, wizardApi, {
        websiteUrl: url,
        surface,
        campaignMessage,
        navigate: (path) => router.push(path),
      });

      if (actionNeedsBrandAnalyze(parsed) && wizardApi) {
        appendAssistant(sa.analyzingBrand);
        try {
          const profile = await wizardApi.analyzeBrand(
            url ? { websiteUrl: url } : undefined,
          );
          if (profile?.businessName) {
            appendAssistant(
              sa.brandAnalyzed.replace("{name}", profile.businessName).replace(
                "{headline}",
                profile.suggestedHeadline || "—",
              ),
            );
          } else {
            appendAssistant(sa.brandAnalyzeFailed);
          }
        } catch {
          appendAssistant(sa.brandAnalyzeFailed);
        }
        return;
      }

      if (parsed === "setup-website-reel" && surface === "studio") {
        appendAssistant(sa.websiteReelApplied);
      }
    },
    [
      wizard,
      surface,
      router,
      sa,
      messages,
      resolvePendingUrl,
      appendAssistant,
      persistChatNow,
    ],
  );

  const renewConversation = useCallback(() => {
    if (loading) return;
    if (typingTimerRef.current) {
      clearInterval(typingTimerRef.current);
      typingTimerRef.current = null;
    }
    typingMsgIdRef.current = null;
    pendingUrlRef.current = null;
    lastCoachTaskRef.current = null;
    clearCoachAck();
    setCoachAckTick((t) => t + 1);
    setInput("");
    setLoading(false);
    setFollowUps([]);
    setReturningNudge(null);
    const fresh: ChatMessage[] = [
      { role: "assistant", content: welcomeForSurface(surface, sa) },
    ];
    setMessages(fresh);
    clearAssistantChat();
    writeAssistantChat({
      messages: fresh.map(({ role, content }) => ({ role, content })),
      open: true,
      updatedAt: new Date().toISOString(),
    });
  }, [loading, surface, sa]);

  const flushActiveTyping = useCallback(() => {
    const msgId = typingMsgIdRef.current;
    const full = pendingFullReplyRef.current;
    if (msgId && full) {
      if (typingTimerRef.current) clearInterval(typingTimerRef.current);
      setMessages((prev) =>
        prev.map((msg) => (msg._id === msgId ? { ...msg, content: full } : msg)),
      );
    }
    typingMsgIdRef.current = null;
    pendingFullReplyRef.current = "";
  }, []);

  const sendMessage = useCallback(
    async (textOverride?: string) => {
    const trimmed = (textOverride ?? input).trim();
    if (!trimmed || loading) return;

    flushActiveTyping();
    setFollowUps([]);
    setReturningNudge(null);

    if (isCoachContinueReply(trimmed) && lastCoachTaskRef.current) {
      if (shouldAckCoachTaskOnNext(lastCoachTaskRef.current, snapshot)) {
        ackCoachTask(lastCoachTaskRef.current);
        setCoachAckTick((t) => t + 1);
      }
    }

    const snapshotForApi = {
      ...(surface === "studio" && wizard
        ? buildStudioAssistantSnapshot(wizard, "studio")
        : buildDefaultAssistantSnapshot(surface)),
      ...readToolSourceFlags(),
      coachAck: readCoachAck(),
      signedIn: Boolean(isSignedIn),
      userPlan: isSignedIn ? plan : null,
      tokenBalance: isSignedIn && typeof creditBalance === "number" ? creditBalance : null,
    };

    const userMsg: ChatMessage = { role: "user", content: trimmed };
    const historyForApi: StudioAssistantMessage[] = [...messages, userMsg].map(
      ({ role, content }) => ({ role, content }),
    );
    setInput("");
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);
    trackAssistantSend({ surface, signedIn: Boolean(isSignedIn) });

    const streamMsgId = `stream-${Date.now()}`;
    let streamedAny = false;

    try {
      const res = await fetch("/api/studio-assistant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
        },
        body: JSON.stringify({
          messages: historyForApi,
          locale,
          snapshot: snapshotForApi,
          previousCoachTask: lastCoachTaskRef.current,
          stream: true,
        }),
      });

      if (res.status === 401) {
        throw new Error("unauthorized");
      }
      if (res.status === 429) {
        throw new Error("quota_exceeded");
      }

      const ctype = res.headers.get("content-type") || "";
      if (ctype.includes("text/event-stream") && res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let finalReply = "";
        let finalFollowUps: FollowUpChip[] = [];
        let meta: Record<string, unknown> = {};

        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "", _id: streamMsgId },
        ]);
        typingMsgIdRef.current = streamMsgId;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split("\n\n");
          buffer = parts.pop() ?? "";
          for (const part of parts) {
            const line = part
              .split("\n")
              .map((l) => l.trim())
              .find((l) => l.startsWith("data:"));
            if (!line) continue;
            const raw = line.slice(5).trim();
            if (!raw) continue;
            let evt: {
              type?: string;
              text?: string;
              reply?: string;
              followUps?: FollowUpChip[];
              meta?: Record<string, unknown>;
            };
            try {
              evt = JSON.parse(raw);
            } catch {
              continue;
            }
            if (evt.type === "meta" && evt.meta) {
              meta = evt.meta;
            } else if (evt.type === "delta" && typeof evt.text === "string") {
              streamedAny = true;
              setLoading(false);
              setMessages((prev) =>
                prev.map((msg) =>
                  msg._id === streamMsgId
                    ? { ...msg, content: `${msg.content}${evt.text}` }
                    : msg,
                ),
              );
            } else if (evt.type === "done") {
              finalReply = String(evt.reply || "");
              finalFollowUps = Array.isArray(evt.followUps) ? evt.followUps : [];
              if (evt.meta) meta = { ...meta, ...evt.meta };
            }
          }
        }

        const detected = meta.detectedUrl;
        if (typeof detected === "string" && detected.trim()) {
          pendingUrlRef.current = detected.trim();
        } else {
          const fromUser = extractUrlFromText(trimmed);
          if (fromUser) pendingUrlRef.current = fromUser;
        }
        const coachTask = meta.coachTask as CoachTaskKind | undefined;
        lastCoachTaskRef.current = coachTask ?? null;

        const full = finalReply || "";
        pendingFullReplyRef.current = full;
        setMessages((prev) =>
          prev.map((msg) =>
            msg._id === streamMsgId ? { ...msg, content: full || msg.content } : msg,
          ),
        );
        typingMsgIdRef.current = null;
        setFollowUps(finalFollowUps);
        trackAssistantReply({
          surface,
          fastPath: Boolean(meta.fastPath),
          degraded: Boolean(meta.degraded),
          streamed: true,
          intent: typeof meta.intent === "string" ? meta.intent : null,
          turnMode: typeof meta.turnMode === "string" ? meta.turnMode : null,
        });
      } else {
        const data = await res.json().catch(() => null);
        if (!data?.success) {
          throw new Error(
            typeof data?.error === "string" ? data.error : "request failed",
          );
        }

        const detected = data.meta?.detectedUrl;
        if (typeof detected === "string" && detected.trim()) {
          pendingUrlRef.current = detected.trim();
        } else {
          const fromUser = extractUrlFromText(trimmed);
          if (fromUser) pendingUrlRef.current = fromUser;
        }

        const coachTask = data.meta?.coachTask as CoachTaskKind | undefined;
        lastCoachTaskRef.current = coachTask ?? null;

        const full = String(data.reply || "");
        setMessages((prev) => [...prev, { role: "assistant", content: full }]);
        if (Array.isArray(data.followUps)) setFollowUps(data.followUps);
        trackAssistantReply({
          surface,
          fastPath: Boolean(data.meta?.fastPath),
          degraded: Boolean(data.meta?.degraded),
          streamed: false,
          intent: data.meta?.intent ?? null,
          turnMode: data.meta?.turnMode ?? null,
        });
      }
    } catch (err) {
      if (streamedAny) {
        // Keep partial stream; still show error note.
      }
      const content =
        err instanceof Error && err.message === "unauthorized"
          ? sa.signInToChat
          : err instanceof Error && err.message === "quota_exceeded"
            ? sa.quotaExceeded
            : sa.errorNetwork;
      if (err instanceof Error && err.message === "quota_exceeded") {
        trackAssistantQuotaExceeded({ surface, signedIn: Boolean(isSignedIn) });
        writeAssistantSignInDraft(trimmed);
      } else if (err instanceof Error && err.message === "unauthorized") {
        writeAssistantSignInDraft(trimmed);
      } else {
        trackAssistantError({
          surface,
          reason: err instanceof Error ? err.message.slice(0, 80) : "unknown",
        });
      }
      setMessages((prev) => {
        const withoutEmptyStream = prev.filter(
          (msg) => !(msg._id === streamMsgId && !msg.content.trim()),
        );
        return [...withoutEmptyStream, { role: "assistant", content }];
      });
      if (
        (err instanceof Error && err.message === "quota_exceeded" && !isSignedIn) ||
        (err instanceof Error && err.message === "unauthorized")
      ) {
        setFollowUps([{ id: "go-signin", label: sa.signInLink }]);
      }
    } finally {
      setLoading(false);
      typingMsgIdRef.current = null;
    }
  }, [
    flushActiveTyping,
    input,
    loading,
    messages,
    locale,
    snapshot,
    sa.errorNetwork,
    sa.quotaExceeded,
    sa.signInToChat,
    sa.signInLink,
    surface,
    wizard,
    isSignedIn,
    plan,
    creditBalance,
  ]);

  const send = useCallback(async () => {
    await sendMessage();
  }, [sendMessage]);

  const applyFollowUpChip = useCallback(
    (chip: FollowUpChip) => {
      if (chip.id === "go-signin") {
        const draft = input.trim() || lastUserMessage(messages) || "";
        if (draft) writeAssistantSignInDraft(draft);
        router.push(`/sign-in?redirect_url=${encodeURIComponent("/")}`);
        return;
      }
      if (chip.id === "open-ultra") {
        void handleAction("open-ultra-canvas");
        return;
      }
      if (chip.id === "open-physical") {
        void handleAction("open-physical-studio", {
          campaignMessage:
            lastUserMessage(messages) ||
            "I want a post with images about my product",
        });
        return;
      }
      if (chip.id === "open-studio") {
        void handleAction("setup-website-reel");
        return;
      }
      if (chip.id === "open-concept") {
        void handleAction("open-concept-studio", {
          campaignMessage: lastUserMessage(messages),
        });
        return;
      }
      const prompt = followUpPromptForChip(chip.id, locale);
      if (!prompt) return;
      if (followUpAutoSends(chip.id)) {
        void sendMessage(prompt);
        return;
      }
      setInput(prompt);
    },
    [handleAction, locale, router, input, messages, sendMessage],
  );

  const wizardStepKey = wizard?.stepKey;
  const studioMobileBarVisible =
    surface === "studio" &&
    (wizardStepKey === "setup" || wizardStepKey === "image" || wizardStepKey === "video");

  const launcherBottom =
    surface === "studio"
      ? "max(calc(5.75rem + env(safe-area-inset-bottom)), 6.75rem)"
      : surface === "landing"
        ? // Match LandingFloatingCta bottom so mascot sits level with “立即開始”
          "max(1.25rem, calc(env(safe-area-inset-bottom) + 0.75rem))"
        : surface === "pro"
          ? "max(1.25rem, env(safe-area-inset-bottom))"
        : surface === "captions"
          ? "max(calc(5.25rem + env(safe-area-inset-bottom)), 6rem)"
        : studioMobileBarVisible
          ? "max(calc(4.75rem + env(safe-area-inset-bottom)), 5.5rem)"
          : "max(1.25rem, env(safe-area-inset-bottom))";

  const landingLevelWithCta = surface === "landing";

  return (
    <div
      data-studio-assistant-root
      className="pointer-events-none fixed z-[200] flex flex-col items-end gap-3"
      style={{
        bottom: launcherBottom,
        right: landingLevelWithCta
          ? "max(1.25rem, calc(env(safe-area-inset-right) + 0.5rem))"
          : "max(1rem, env(safe-area-inset-right))",
      }}
    >
      {open && (
        <div
          data-studio-assistant-panel
          className="pointer-events-auto flex max-h-[min(72vh,520px)] w-[min(100vw-1.5rem,400px)] animate-in fade-in slide-in-from-bottom-4 flex-col overflow-hidden rounded-2xl border border-violet-200/80 bg-white shadow-2xl shadow-violet-900/10 ring-1 ring-black/5 duration-200"
          role="dialog"
          aria-label={sa.dialogLabel}
        >
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-violet-100 bg-gradient-to-r from-violet-50 to-white px-4 py-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <AssistantMascotLauncher
                alt=""
                size="md"
                animated={false}
                className="!h-10 !w-10 !rounded-xl !ring-1 !ring-violet-300/70"
              />
              <div className="min-w-0">
                <p className="text-base font-semibold text-violet-950">{sa.title}</p>
                <p className="truncate text-xs text-violet-600/90">{sa.subtitle}</p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-0.5">
              <button
                type="button"
                onClick={renewConversation}
                disabled={loading}
                className="rounded-full px-2.5 py-2 text-xs font-medium text-violet-700 transition hover:bg-violet-100 hover:text-violet-950 disabled:opacity-40"
                aria-label={sa.renewConversation}
                title={sa.renewConversation}
              >
                {sa.renewConversation}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full p-2 text-gray-500 transition hover:bg-violet-100 hover:text-gray-800"
                aria-label={sa.close}
              >
                <span className="text-lg leading-none" aria-hidden>
                  ×
                </span>
              </button>
            </div>
          </div>

          <div
            ref={scrollRef}
            className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-3 py-3"
          >
            {returningNudge ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
                {renderMessageContent(returningNudge, (id) => void handleAction(id))}
                <button
                  type="button"
                  className="ml-2 text-[11px] font-medium text-amber-800/80 underline"
                  onClick={() => setReturningNudge(null)}
                >
                  ×
                </button>
              </div>
            ) : null}
            {messages.map((msg, i) => (
              <div
                key={msg._id ?? i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[92%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "rounded-br-md bg-violet-600 text-white"
                      : "rounded-bl-md bg-slate-100 text-slate-800"
                  }`}
                >
                  {msg.role === "assistant" ? (
                    <div className="break-words">
                      {renderMessageContent(msg.content, (id) => void handleAction(id))}
                    </div>
                  ) : (
                    <span className="whitespace-pre-wrap">{msg.content}</span>
                  )}
                </div>
              </div>
            ))}
            {followUps.length > 0 && !loading ? (
              <div className="flex flex-wrap gap-2 pl-1">
                <span className="w-full text-[11px] font-medium uppercase tracking-wide text-slate-400">
                  {sa.followUpsLabel}
                </span>
                {followUps.map((chip) => (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => applyFollowUpChip(chip)}
                    className="rounded-full border border-violet-200 bg-white px-3 py-1.5 text-xs font-medium text-violet-800 transition hover:bg-violet-50"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            ) : null}
            {loading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl rounded-bl-md bg-slate-100 px-3.5 py-2.5 text-sm text-slate-600">
                  <span
                    className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-violet-300 border-t-violet-600"
                    aria-hidden
                  />
                  {sa.thinking}
                </div>
              </div>
            )}
          </div>

          <div className="shrink-0 border-t border-violet-100 p-3">
            {showContentResearch && isSignedIn && (
              <div className="mb-3 max-h-[min(40vh,320px)] overflow-y-auto rounded-xl border border-emerald-200 bg-emerald-50/40 p-2">
                <ContentResearchPanel
                  compact
                  defaultTopic={
                    wizard?.conceptIdea?.trim() ||
                    wizard?.product?.trim() ||
                    wizard?.headline?.trim() ||
                    ""
                  }
                  promotionMode={wizard?.promotionMode ?? "concept"}
                  market={wizard?.promptMarket ?? "hk"}
                  workflowMode={wizard?.workflowMode ?? "image-only"}
                  wizard={
                    wizard
                      ? {
                          setHeadline: wizard.setHeadline,
                          setSubline: wizard.setSubline,
                          setOffer: wizard.setOffer,
                          setConceptIdea: wizard.setConceptIdea,
                          setProduct: wizard.setProduct,
                          setPromptExtra: wizard.setPromptExtra,
                          setImageOutputMode: wizard.setImageOutputMode,
                          setImageAspectRatio: wizard.setImageAspectRatio,
                          setCampaignTheme: wizard.setCampaignTheme,
                          selectVisualStyle: wizard.selectVisualStyle,
                          onWorkflowModeChange: wizard.onWorkflowModeChange,
                          setContentResearchApplyRef: wizard.setContentResearchApplyRef,
                        }
                      : undefined
                  }
                  navigateOnApply={
                    isLandingLikeSurface(surface) ? (path) => router.push(path) : undefined
                  }
                  onApplied={() => {
                    appendAssistant(m.contentResearch.applied);
                    setShowContentResearch(false);
                  }}
                />
              </div>
            )}
            {showQuickChips && (
            <div className="mb-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  if (!isSignedIn) {
                    setShowContentResearch(false);
                    appendAssistant(sa.researchNeedsSignIn);
                    return;
                  }
                  setShowContentResearch((v) => !v);
                }}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  showContentResearch && isSignedIn
                    ? "border-emerald-500 bg-emerald-100 text-emerald-950"
                    : "border-emerald-300 bg-emerald-50 text-emerald-900 hover:bg-emerald-100"
                }`}
              >
                {sa.chipContentResearch}
              </button>
              <button
                type="button"
                onClick={() =>
                  void handleAction("open-physical-studio", {
                    campaignMessage:
                      "I want a post with images about my product",
                  })
                }
                className="rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-900 transition hover:bg-emerald-100"
              >
                {sa.chipProductImagePost}
              </button>
              <button
                type="button"
                onClick={() => void handleAction("open-ultra-canvas")}
                className="rounded-full border border-fuchsia-300 bg-fuchsia-50 px-3 py-1.5 text-xs font-medium text-fuchsia-900 transition hover:bg-fuchsia-100"
              >
                {sa.chipUltraCanvas}
              </button>
              <button
                type="button"
                onClick={() => void handleAction("setup-website-reel")}
                className="rounded-full border border-violet-300 bg-violet-50 px-3 py-1.5 text-xs font-medium text-violet-800 transition hover:bg-violet-100"
              >
                {sa.chipSetupWebsite}
              </button>
            </div>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void send();
                  }
                }}
                placeholder={sa.placeholder}
                className="min-w-0 flex-1 rounded-full border border-violet-200 bg-violet-50/50 px-4 py-2.5 text-sm outline-none ring-violet-400/30 focus:border-violet-500 focus:ring-2"
                disabled={loading}
                maxLength={2000}
              />
              <button
                type="button"
                onClick={() => void send()}
                disabled={loading || !input.trim()}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-violet-600 text-white transition hover:bg-violet-700 disabled:opacity-40"
                aria-label={sa.send}
              >
                <span aria-hidden>➤</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => {
          setOpen((v) => {
            const next = !v;
            if (next) {
              trackAssistantOpened({ surface, signedIn: Boolean(isSignedIn) });
            }
            return next;
          });
        }}
        className={
          darkChrome
            ? "pointer-events-auto inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-slate-950/85 p-1.5 pr-3 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.7)] backdrop-blur-md transition hover:scale-[1.02] hover:border-violet-300/50 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 motion-safe:animate-[assistant-mascot-float_3.2s_ease-in-out_infinite]"
            : // Landing: no float bob — stay level with the bottom CTA pill
              "pointer-events-auto inline-flex items-center bg-transparent p-0 shadow-none transition hover:scale-[1.03] active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
        }
        aria-expanded={open}
        aria-label={sa.openLauncher}
      >
        <AssistantMascotLauncher
          alt="Alchemy AI Lab mascot"
          size={darkChrome ? "md" : "lg"}
        />
        {darkChrome ? (
          <span className="pr-0.5 text-sm font-semibold tracking-wide text-white">
            {sa.shortLabel}
          </span>
        ) : null}
      </button>
    </div>
  );
}
