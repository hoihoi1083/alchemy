"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SignInButton, useAuth } from "@clerk/nextjs";
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
import { dispatchCoachSpotlight } from "@/lib/studio-assistant-spotlight-bus";
import { shouldShowSpotlight } from "@/lib/studio-assistant-coach-targets";
import type { CoachTaskKind } from "@/lib/studio-assistant-coach-profile";
import type {
  AssistantSurface,
  StudioAssistantMessage,
} from "@/lib/studio-assistant-types";
import { ContentResearchPanel } from "@/components/content-research/ContentResearchPanel";

const LAUNCHER_IMAGE_SRC = "/alchemy-logo.png";

type ChatMessage = StudioAssistantMessage & { _id?: string };

function welcomeForSurface(
  surface: AssistantSurface,
  sa: {
    welcome: string;
    welcomeLanding: string;
    welcomeStart: string;
  },
): string {
  if (surface === "landing") return sa.welcomeLanding;
  if (surface === "start") return sa.welcomeStart;
  return sa.welcome;
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
    } else if (href.startsWith("/")) {
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
  const { isSignedIn, isLoaded } = useAuth();
  const { m, locale } = useLocale();
  const sa = m.studioAssistant;
  const wizard = useOptionalWizard();

  const [hydrated, setHydrated] = useState(false);
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const typingMsgIdRef = useRef<string | null>(null);
  const pendingUrlRef = useRef<string | null>(null);
  const lastCoachTaskRef = useRef<CoachTaskKind | null>(null);
  const [coachAckTick, setCoachAckTick] = useState(0);
  const [showContentResearch, setShowContentResearch] = useState(false);

  const needsSignIn = surface === "landing" && isLoaded && !isSignedIn;
  const hasUserTyped = messages.some((msg) => msg.role === "user");
  const showQuickChips = surface !== "studio" && hasUserTyped;

  const snapshot = useMemo(() => {
    const base =
      surface === "studio" && wizard
        ? buildStudioAssistantSnapshot(wizard, "studio")
        : buildDefaultAssistantSnapshot(surface);
    return { ...base, coachAck: readCoachAck() };
  }, [surface, wizard, coachAckTick]);

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
      const url = resolvePendingUrl() ?? undefined;
      const wizardApi = surface === "studio" ? wizard : null;
      const campaignMessage = opts?.campaignMessage ?? lastUserMessage(messages);

      if (actionNavigatesAway(parsed) && surface !== "studio") {
        const note =
          parsed === "setup-website-reel" ? sa.openingStudio : sa.openingStudio;
        const nextMessages: ChatMessage[] = [
          ...messages,
          { role: "assistant", content: note },
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

  const send = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    if (/^(下一步|next|continue|繼續|继续)$/i.test(trimmed) && lastCoachTaskRef.current) {
      if (shouldAckCoachTaskOnNext(lastCoachTaskRef.current, snapshot)) {
        ackCoachTask(lastCoachTaskRef.current);
        setCoachAckTick((t) => t + 1);
      }
    }

    const snapshotForApi = {
      ...(surface === "studio" && wizard
        ? buildStudioAssistantSnapshot(wizard, "studio")
        : buildDefaultAssistantSnapshot(surface)),
      coachAck: readCoachAck(),
    };

    const userMsg: ChatMessage = { role: "user", content: trimmed };
    const historyForApi: StudioAssistantMessage[] = [...messages, userMsg].map(
      ({ role, content }) => ({ role, content }),
    );
    setInput("");
    setMessages((prev) => [...prev, userMsg]);

    if (needsSignIn) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: sa.signInToChat },
      ]);
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/studio-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: historyForApi,
          locale,
          snapshot: snapshotForApi,
          previousCoachTask: lastCoachTaskRef.current,
        }),
      });

      const data = await res.json();
      if (res.status === 401) {
        throw new Error("unauthorized");
      }
      if (!data.success) {
        throw new Error(data.error || "request failed");
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
      const msgId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      typingMsgIdRef.current = msgId;

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "", _id: msgId },
      ]);

      if (typingTimerRef.current) clearInterval(typingTimerRef.current);

      let i = 0;
      const step = () => {
        if (typingMsgIdRef.current !== msgId) {
          if (typingTimerRef.current) clearInterval(typingTimerRef.current);
          return;
        }
        i += Math.max(1, Math.floor(full.length / 120));
        const slice = full.slice(0, i);
        setMessages((prev) =>
          prev.map((msg) => (msg._id === msgId ? { ...msg, content: slice } : msg)),
        );
        if (i >= full.length) {
          if (typingTimerRef.current) clearInterval(typingTimerRef.current);
          if (coachTask && shouldShowSpotlight(coachTask)) {
            window.setTimeout(() => dispatchCoachSpotlight(coachTask), 80);
          }
          return;
        }
      };

      typingTimerRef.current = setInterval(step, 20);
      step();
    } catch (err) {
      const content =
        err instanceof Error && err.message === "unauthorized"
          ? sa.signInToChat
          : sa.errorNetwork;
      setMessages((prev) => [...prev, { role: "assistant", content }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, locale, snapshot, sa.errorNetwork, sa.signInToChat, needsSignIn]);

  const wizardStepKey = wizard?.stepKey;
  const studioMobileBarVisible =
    surface === "studio" &&
    (wizardStepKey === "setup" || wizardStepKey === "image" || wizardStepKey === "video");

  const launcherBottom = studioMobileBarVisible
    ? "max(calc(4.75rem + env(safe-area-inset-bottom)), 5.5rem)"
    : "max(1.25rem, env(safe-area-inset-bottom))";

  return (
    <div
      className="pointer-events-none fixed z-[100] flex flex-col items-end gap-3"
      style={{
        bottom: launcherBottom,
        right: "max(1rem, env(safe-area-inset-right))",
      }}
    >
      {open && (
        <div
          className="pointer-events-auto flex max-h-[min(72vh,520px)] w-[min(100vw-1.5rem,400px)] animate-in fade-in slide-in-from-bottom-4 flex-col overflow-hidden rounded-2xl border border-violet-200/80 bg-white shadow-2xl shadow-violet-900/10 ring-1 ring-black/5 duration-200"
          role="dialog"
          aria-label={sa.dialogLabel}
        >
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-violet-100 bg-gradient-to-r from-violet-50 to-white px-4 py-3">
            <div className="min-w-0">
              <p className="text-base font-semibold text-violet-950">{sa.title}</p>
              <p className="truncate text-xs text-violet-600/90">{sa.subtitle}</p>
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
            {showContentResearch && (
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
                    surface !== "studio" ? (path) => router.push(path) : undefined
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
                onClick={() => setShowContentResearch((v) => !v)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  showContentResearch
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
                onClick={() => void handleAction("setup-website-reel")}
                className="rounded-full border border-violet-300 bg-violet-50 px-3 py-1.5 text-xs font-medium text-violet-800 transition hover:bg-violet-100"
              >
                {sa.chipSetupWebsite}
              </button>
            </div>
            )}
            {needsSignIn && (
              <p className="mb-2 text-xs text-violet-700">
                {sa.signInToChat}{" "}
                <SignInButton mode="modal">
                  <button
                    type="button"
                    className="font-semibold text-violet-900 underline underline-offset-2"
                  >
                    {m.auth.signIn}
                  </button>
                </SignInButton>
              </p>
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
        onClick={() => setOpen((v) => !v)}
        className="pointer-events-auto inline-flex items-center bg-transparent p-0 shadow-none transition hover:scale-[1.02] active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
        aria-expanded={open}
        aria-label={sa.openLauncher}
      >
        <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl sm:h-[100px] sm:w-[100px] md:h-[140px] md:w-[140px]">
          <Image
            src={LAUNCHER_IMAGE_SRC}
            alt="alchemy.ai logo"
            width={200}
            height={200}
            className="h-full w-full rounded-2xl object-contain drop-shadow-lg"
            priority
          />
        </span>
      </button>
    </div>
  );
}
