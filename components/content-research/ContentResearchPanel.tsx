"use client";

import { useEffect, useState } from "react";
import { useLocale } from "@/components/LocaleProvider";
import {
  applyContentAngleToWizard,
  buildContentAngleHandoff,
  type ContentAngleWizardApi,
  type PendingContentResearchPick,
} from "@/lib/content-research-apply";
import type { ResearchRefAttachResult } from "@/lib/content-research-apply-refs";
import { enrichAngleVideoFromPlan } from "@/lib/content-research-angle-video";
import {
  CONTENT_PLATFORMS,
  type ContentAngleCandidate,
  type ContentPlatform,
  type ContentResearchPlan,
} from "@/lib/content-research-types";
import { ResearchAngleCards } from "@/components/content-research/ResearchAngleCards";
import { ResearchPlatformLogo } from "@/components/content-research/ResearchPlatformLogo";
import { displayResearchAngles } from "@/lib/content-research-enrich";
import {
  mediaFilterFromWorkflowMode,
  platformMediaMismatch,
} from "@/lib/content-research-media-filter";
import { ResearchPostCards } from "@/components/content-research/ResearchPostCards";
import { writeStudioAssistantHandoff } from "@/lib/studio-assistant-handoff";
import { markAssistantReopenAfterNavigate } from "@/lib/studio-assistant-chat-storage";
import { studioHref } from "@/lib/promotion-mode";
import type { PromptMarket } from "@/lib/prompt-variables";
import type { PromotionMode } from "@/lib/promotion-mode";
import type { WorkflowMode } from "@/lib/workflow-mode";

const LAST_RESEARCH_AT_KEY = "alchemy:last-research-at";
const RESEARCH_CLIENT_COOLDOWN_MS = 3_000;

type ContentResearchPanelProps = {
  /** Category keyword for finding viral posts (e.g. 水晶手串). */
  defaultTopic?: string;
  /** Fixed promote target — physical SKU or the user's conceptIdea. Copy must be about this. */
  promoteProduct?: string;
  onPromoteProductChange?: (value: string) => void;
  promotionMode: PromotionMode;
  market: PromptMarket;
  /** Syncs with Step 1 workflow picker — image-only / video-only filter research results. */
  workflowMode?: WorkflowMode;
  wizard?: ContentAngleWizardApi;
  onApplied?: (
    angle: ContentAngleCandidate,
    plan: ContentResearchPlan,
    result?: { message: string; warning?: string; refs: ResearchRefAttachResult },
  ) => void;
  compact?: boolean;
  /** When false, search keyword stays independent from product name (physical promos). */
  syncTopicFromProduct?: boolean;
  /** Hide physical/concept mode toggle (mode already fixed by studio entry). */
  hidePromotionModeToggle?: boolean;
  /** Hide promote-product field when name was collected on the previous step. */
  hidePromoteProduct?: boolean;
  /** Violet chrome for fuse intake (matches purple wizard steps). */
  tone?: "default" | "violet";
  /** When set, picking an angle navigates to studio with handoff. */
  navigateOnApply?: (path: string) => void;
  /**
   * Fuse intake: selecting a card only marks it pending;
   * Continue on the wizard applies the angle.
   */
  deferApply?: boolean;
  onPendingPickChange?: (pick: PendingContentResearchPick | null) => void;
};

export function ContentResearchPanel({
  defaultTopic = "",
  promoteProduct: promoteProductProp = "",
  onPromoteProductChange,
  promotionMode: initialPromotionMode,
  market,
  workflowMode = "image-only",
  wizard,
  onApplied,
  compact,
  navigateOnApply,
  syncTopicFromProduct = true,
  hidePromotionModeToggle = false,
  hidePromoteProduct = false,
  tone = "default",
  deferApply = false,
  onPendingPickChange,
}: ContentResearchPanelProps) {
  const { m } = useLocale();
  const cr = m.contentResearch;
  const violet = tone === "violet";
  const [promotionMode, setPromotionMode] = useState<PromotionMode>(initialPromotionMode);
  const [platform, setPlatform] = useState<ContentPlatform>("xiaohongshu");
  const [topic, setTopic] = useState(defaultTopic);
  const [postUrl, setPostUrl] = useState("");
  const [promoteProduct, setPromoteProduct] = useState(promoteProductProp);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [plan, setPlan] = useState<ContentResearchPlan | null>(null);
  const [applyingAngleId, setApplyingAngleId] = useState<string | null>(null);
  const [selectedAngleId, setSelectedAngleId] = useState<string | null>(null);
  const mediaFilter = mediaFilterFromWorkflowMode(workflowMode);
  const platformMismatch = platformMediaMismatch(platform, mediaFilter);

  useEffect(() => {
    setPromotionMode(initialPromotionMode);
  }, [initialPromotionMode]);

  useEffect(() => {
    if (defaultTopic.trim()) setTopic(defaultTopic);
  }, [defaultTopic]);

  useEffect(() => {
    setPromoteProduct(promoteProductProp);
  }, [promoteProductProp]);

  useEffect(() => {
    if (!syncTopicFromProduct) return;
    if (promoteProductProp.trim()) setTopic(promoteProductProp);
  }, [promoteProductProp, syncTopicFromProduct]);

  function updatePromoteProduct(value: string) {
    setPromoteProduct(value);
    onPromoteProductChange?.(value);
  }

  async function runResearch() {
    const trimmed = topic.trim();
    if (!trimmed) {
      setError(cr.topicRequired);
      return;
    }
    if (platformMismatch) {
      setError(cr.tiktokImageWarning);
      return;
    }
    const lastAt = Number(sessionStorage.getItem(LAST_RESEARCH_AT_KEY) ?? 0);
    const waitMs = lastAt + RESEARCH_CLIENT_COOLDOWN_MS - Date.now();
    if (waitMs > 0) {
      setError(cr.searchCooldown.replace("{seconds}", String(Math.ceil(waitMs / 1000))));
      return;
    }
    setBusy(true);
    setError(null);
    setNote(null);
    setWarning(null);
    setPlan(null);
    setSelectedAngleId(null);
    onPendingPickChange?.(null);
    try {
      const res = await fetch("/api/research-content-angles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: trimmed,
          product: promoteProduct.trim() || undefined,
          platform,
          market,
          promotionMode,
          mediaFilter,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? cr.failed);
      setPlan(data.plan as ContentResearchPlan);
      setNote(String(data.sourceNote ?? ""));
      setWarning(data.researchWarning ? String(data.researchWarning) : null);
      sessionStorage.setItem(LAST_RESEARCH_AT_KEY, String(Date.now()));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : cr.failed);
    } finally {
      setBusy(false);
    }
  }

  async function runDirectPost() {
    const trimmedUrl = postUrl.trim();
    if (!trimmedUrl) {
      setError(cr.postUrlRequired);
      return;
    }
    if (promotionMode === "physical" && !promoteProduct.trim()) {
      setError(cr.promoteProductRequired);
      return;
    }
    if (platformMismatch) {
      setError(cr.tiktokImageWarning);
      return;
    }
    setBusy(true);
    setError(null);
    setNote(null);
    setWarning(null);
    setPlan(null);
    try {
      const res = await fetch("/api/research-direct-post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postUrl: trimmedUrl,
          topic: topic.trim() || promoteProduct.trim() || undefined,
          product: promoteProduct.trim() || undefined,
          platform,
          market,
          promotionMode,
          mediaFilter,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? cr.directPostFailed);
      setPlan(data.plan as ContentResearchPlan);
      setNote(String(data.sourceNote ?? ""));
      setWarning(data.researchWarning ? String(data.researchWarning) : null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : cr.directPostFailed);
    } finally {
      setBusy(false);
    }
  }

  async function pickAngle(angle: ContentAngleCandidate) {
    if (!plan || applyingAngleId) return;
    if (promotionMode === "physical" && !promoteProduct.trim()) {
      setError(cr.promoteProductRequired);
      scrollToApplyFeedback();
      return;
    }
    const angleToApply = enrichAngleVideoFromPlan(angle, plan);

    if (deferApply && wizard) {
      setSelectedAngleId(angleToApply.id);
      setError(null);
      setWarning(null);
      setNote(cr.selectedContinueHint);
      onPendingPickChange?.({
        angle: angleToApply,
        plan,
        promoteProduct:
          promoteProduct.trim() ||
          (promotionMode === "concept" ? topic.trim() : "") ||
          undefined,
        promotionMode,
      });
      return;
    }

    setApplyingAngleId(angle.id);
    setError(null);
    setWarning(null);
    setNote(null);
    try {
      if (wizard) {
        const promoteForApply =
          promoteProduct.trim() ||
          (promotionMode === "concept" ? topic.trim() : "") ||
          undefined;
        const { refs } = await applyContentAngleToWizard(
          angleToApply,
          plan,
          promotionMode,
          wizard,
          promoteForApply,
          undefined,
          workflowMode,
        );

        let message: string = cr.applied;
        let warningMsg: string | undefined;

        if (refs.videoRequested && refs.videoAttached) {
          message = cr.appliedWithVideoAttached;
        } else if (refs.videoRequested && !refs.videoAttached) {
          warningMsg =
            refs.videoError === "download_failed"
              ? cr.videoDownloadFailed
              : refs.videoError === "resolve_failed"
                ? cr.videoResolveFailed
                : cr.videoUrlMissing;
          message = cr.appliedCoverOnlyVideoFailed;
          wizard.setError?.(warningMsg);
        } else if (!refs.coverAttached && !refs.videoAttached) {
          warningMsg = cr.appliedReferenceImageFailed;
          message = cr.appliedCopyOnlyNoImage;
          wizard.setError?.(warningMsg);
        } else {
          wizard.setError?.(null);
          message =
            refs.coverAttached && (angle.sourceImageUrls?.length ?? 0) > 1
              ? cr.appliedWithCarouselReference
              : refs.coverAttached
                ? cr.appliedWithReference
                : cr.applied;
        }

        setNote(message);
        setWarning(warningMsg ?? null);
        setSelectedAngleId(angleToApply.id);
        onApplied?.(angleToApply, plan, { message, warning: warningMsg, refs });
        scrollToApplyFeedback();
        return;
      }
      if (navigateOnApply) {
        writeStudioAssistantHandoff(
          buildContentAngleHandoff(
            angleToApply,
            plan,
            promotionMode,
            promoteProduct.trim() ||
              (promotionMode === "concept" ? topic.trim() : "") ||
              undefined,
            workflowMode,
          ),
        );
        markAssistantReopenAfterNavigate();
        navigateOnApply(studioHref(promotionMode));
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : cr.failed;
      setError(message);
      wizard?.setError?.(message);
      scrollToApplyFeedback();
    } finally {
      setApplyingAngleId(null);
    }
  }

  function scrollToApplyFeedback() {
    requestAnimationFrame(() => {
      document
        .getElementById("content-research-apply-result")
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      document
        .getElementById("research-reel-setup")
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

  return (
    <div
      className={
        compact
          ? violet
            ? "flex flex-col gap-3.5"
            : "space-y-3.5"
          : violet
            ? "flex flex-col gap-3.5 rounded-xl border border-violet-100 bg-violet-50/40 px-4 py-3"
            : "space-y-3 rounded-xl border border-emerald-200 bg-emerald-50/60 px-4 py-3"
      }
    >
      {!compact && (
        <p className={`text-sm font-semibold ${violet ? "text-violet-950" : "text-emerald-950"}`}>
          {cr.title}
        </p>
      )}

      {!hidePromotionModeToggle && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setPromotionMode("physical")}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              promotionMode === "physical"
                ? violet
                  ? "bg-violet-600 text-white"
                  : "bg-emerald-700 text-white"
                : violet
                  ? "border border-violet-200 bg-white text-violet-900"
                  : "border border-emerald-300 bg-white text-emerald-900"
            }`}
          >
            {cr.physical}
          </button>
          <button
            type="button"
            onClick={() => setPromotionMode("concept")}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              promotionMode === "concept"
                ? violet
                  ? "bg-violet-600 text-white"
                  : "bg-emerald-700 text-white"
                : violet
                  ? "border border-violet-200 bg-white text-violet-900"
                  : "border border-emerald-300 bg-white text-emerald-900"
            }`}
          >
            {cr.concept}
          </button>
        </div>
      )}

      {/* 1. Platforms */}
      <div>
        <div className="mb-2.5">
          <p className={`text-sm font-bold ${violet ? "text-slate-900" : "text-emerald-900"}`}>
            {cr.platformsLabel}
          </p>
          {violet ? (
            <p className="mt-0.5 text-[12px] leading-relaxed text-slate-500">{cr.platformsHint}</p>
          ) : null}
        </div>
        <div className={violet ? "grid grid-cols-2 gap-2.5" : "flex flex-wrap gap-2"}>
          {CONTENT_PLATFORMS.map((p) => {
            const on = platform === p;
            if (violet) {
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPlatform(p)}
                  aria-pressed={on}
                  className={`flex min-h-[3.25rem] min-w-0 items-center gap-2.5 rounded-xl border px-3.5 py-3 text-left transition ${
                    on
                      ? "border-violet-600 bg-violet-50 shadow-[0_0_0_1px_rgba(108,59,255,0.12)]"
                      : "border-slate-200/90 bg-white hover:border-slate-300"
                  }`}
                >
                  <ResearchPlatformLogo platform={p} className="h-7 w-7 shrink-0" />
                  <span
                    className={`min-w-0 flex-1 truncate text-[13px] font-semibold leading-snug ${
                      on ? "text-violet-700" : "text-slate-800"
                    }`}
                  >
                    {cr.platforms[p]}
                  </span>
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center border ${
                      on
                        ? "rounded-full border-violet-600 bg-violet-600 text-white"
                        : "rounded-md border-slate-300 bg-white"
                    }`}
                    aria-hidden
                  >
                    {on ? (
                      <svg viewBox="0 0 12 12" className="h-3 w-3" fill="currentColor">
                        <path d="M4.7 8.6 2.4 6.3l.9-.9 1.4 1.4 3.3-3.4.9.9-4.2 4.3Z" />
                      </svg>
                    ) : null}
                  </span>
                </button>
              );
            }
            return (
              <button
                key={p}
                type="button"
                onClick={() => setPlatform(p)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${
                  on
                    ? "bg-slate-900 text-white"
                    : "border border-slate-200 bg-white text-slate-700"
                }`}
              >
                <ResearchPlatformLogo platform={p} className="h-4 w-4" />
                {cr.platforms[p]}
              </button>
            );
          })}
        </div>
      </div>

      <p className="text-[11px] text-slate-600">
        {mediaFilter === "image"
          ? cr.researchMediaImage
          : mediaFilter === "video"
            ? cr.researchMediaVideo
            : cr.researchMediaBoth}
      </p>
      {platformMismatch ? (
        <p className="text-[11px] text-amber-800">{cr.tiktokImageWarning}</p>
      ) : null}

      {/* 2. Keyword + product */}
      <label className={`block text-xs font-medium ${violet ? "text-slate-700" : "text-emerald-900"}`}>
        {cr.searchKeywordLabel}
      </label>
      <input
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        placeholder={cr.searchKeywordPlaceholder}
        className={`w-full rounded-xl border bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-500/15 ${
          violet ? "border-slate-200" : "border-emerald-200"
        }`}
      />

      {promotionMode === "physical" && !hidePromoteProduct ? (
        <div className="space-y-1.5">
          <label className={`block text-xs font-medium ${violet ? "text-slate-700" : "text-emerald-900"}`}>
            {cr.promoteProductLabel} *
          </label>
          <input
            value={promoteProduct}
            onChange={(e) => updatePromoteProduct(e.target.value)}
            placeholder={cr.promoteProductPlaceholder}
            required
            className={`w-full rounded-xl border bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-500/15 ${
              violet ? "border-slate-200" : "border-emerald-200"
            }`}
          />
          <p className={`text-[11px] leading-relaxed ${violet ? "text-slate-500" : "text-emerald-900/80"}`}>
            {cr.promoteProductHint}
          </p>
        </div>
      ) : null}
      {promotionMode === "physical" && hidePromoteProduct && promoteProduct.trim() ? (
        <p className="rounded-xl border border-violet-100 bg-violet-50 px-3 py-2.5 text-xs text-violet-900">
          <span className="font-semibold">{cr.promoteProductLabel}: </span>
          {promoteProduct.trim()}
        </p>
      ) : null}

      {/* 3. Research button — directly under platforms / keyword */}
      <button
        type="button"
        onClick={() => void runResearch()}
        disabled={busy || Boolean(platformMismatch)}
        className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white disabled:opacity-50 ${
          violet
            ? "w-full bg-violet-600 hover:bg-violet-700"
            : "w-full bg-emerald-700 hover:bg-emerald-600 sm:w-auto"
        }`}
      >
        {violet ? (
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5 shrink-0"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
            <path d="M20 3v4" />
            <path d="M22 5h-4" />
            <path d="M4 17v2" />
            <path d="M5 18H3" />
          </svg>
        ) : null}
        {busy ? cr.busy : cr.researchBtn}
      </button>

      {error ? <p className="text-xs text-red-700">{error}</p> : null}

      {/* 4. Results */}
      {plan ? (
        <div className="space-y-2">
          <p
            className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
              plan.researchMode === "live-web"
                ? "bg-sky-100 text-sky-900"
                : "bg-amber-100 text-amber-900"
            }`}
          >
            {plan.researchMode === "live-web" ? cr.liveBadge : cr.playbookBadge}
          </p>
          {plan.summary && (
            <p className="text-xs leading-relaxed text-slate-700">{plan.summary}</p>
          )}
          {plan.posts && plan.posts.length > 0 && plan.searchProvider !== "justoneapi" && (
            <ResearchPostCards
              posts={plan.posts}
              labels={{
                postsTitle: cr.postsTitle,
                likes: cr.likes,
                collects: cr.collects,
                comments: cr.comments,
                openNote: cr.openNote,
                noCover: cr.noCover,
              }}
            />
          )}
          <p className={`text-xs font-semibold text-slate-800 ${violet ? "sr-only" : ""}`}>
            {cr.topPicksTitle}
          </p>
          {plan.posts && plan.posts.length > 0 && plan.searchProvider === "justoneapi" ? (
            <>
              {(() => {
                const { angles, hiddenWithoutCover } = displayResearchAngles(plan, {
                  videoOnly: workflowMode === "video-only",
                });
                const platformName = cr.platforms[plan.platform] ?? plan.platformLabel;
                return (
                  <>
                    {hiddenWithoutCover > 0 && (
                      <p className="text-[11px] text-slate-500">
                        {cr.researchHiddenNoCover.replace("{count}", String(hiddenWithoutCover))}
                      </p>
                    )}
                    <ResearchAngleCards
                      key={`${plan.topic}-${plan.platform}`}
                      angles={angles}
                      platform={plan.platform}
                      platformLabel={platformName}
                      videoOnly={workflowMode === "video-only"}
                      applyingAngleId={applyingAngleId}
                      selectedAngleId={selectedAngleId}
                      pickDisabled={promotionMode === "physical" && !promoteProduct.trim()}
                      pickDisabledHint={cr.promoteProductRequired}
                      onPick={pickAngle}
                      variant={violet ? "recommendation" : "classic"}
                      selectOnly={deferApply}
                      labels={{
                        scoreLabel: cr.scoreLabel,
                        inspiredBy: cr.inspiredBy,
                        originalPostLabel: cr.originalPostLabel,
                        yourAngle: cr.yourAngle,
                        useAngle: deferApply ? cr.selectAngle : cr.useAngle,
                        applyingAngle: cr.applyingAngle,
                        openNote: cr.openNote,
                        sourceLabel: cr.sourceLabel,
                        likes: cr.likes,
                        collects: cr.collects,
                        noCover: cr.noCover,
                        prevPage: cr.prevPage,
                        nextPage: cr.nextPage,
                        pageOf: cr.pageOf,
                        totalAngles: cr.totalAngles,
                        carouselSlides: cr.carouselSlides,
                        videoReadyUrl: cr.videoReadyUrl,
                        videoReadyResolve: cr.videoReadyResolve,
                        videoReadyMissing: cr.videoReadyMissing,
                        resultTitle: cr.resultTitle,
                        resultSubtitle: cr.resultSubtitleForPlatform(platformName),
                        styleSummaryLabel: cr.styleSummaryLabel,
                        toneLabel: cr.toneLabel,
                        layoutNotesLabel: cr.layoutNotesLabel,
                        viewMoreExamples: cr.viewMoreExamples,
                        sourcePlatformsLabel: cr.sourcePlatformLabel,
                        selectedLabel: cr.selectedLabel,
                        selectedContinueHint: cr.selectedContinueHint,
                      }}
                    />
                  </>
                );
              })()}
            </>
          ) : (
            <div className={`grid gap-2 ${compact ? "" : "sm:grid-cols-1"}`}>
              {plan.topPicks.map((angle, i) => (
                <div
                  key={angle.id}
                  className={`rounded-lg border bg-white p-3 shadow-sm ${
                    selectedAngleId === angle.id
                      ? "border-violet-600 ring-2 ring-violet-500/20"
                      : "border-emerald-200"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-bold text-emerald-800">
                      #{i + 1} · {angle.formatLabel}
                    </p>
                    <span className="shrink-0 text-[10px] text-slate-500">
                      {cr.scoreLabel} {angle.score}/100
                    </span>
                  </div>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{angle.title}</p>
                  <p className="mt-1 text-xs font-medium text-violet-800">{angle.hook}</p>
                  <p className="mt-2 text-[11px] leading-relaxed text-slate-600">{angle.whyItWorks}</p>
                  {angle.bulletPoints.length > 0 && (
                    <ul className="mt-2 list-inside list-disc text-[11px] text-slate-600">
                      {angle.bulletPoints.map((b) => (
                        <li key={b}>{b}</li>
                      ))}
                    </ul>
                  )}
                  {angle.sourceSnippet ? (
                    <p className="mt-2 line-clamp-3 text-[11px] leading-relaxed text-slate-500">
                      {angle.sourceSnippet}
                    </p>
                  ) : null}
                  {angle.sourceUrl && (
                    <a
                      href={angle.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 block truncate text-[10px] text-sky-700 underline"
                    >
                      {cr.openNote}: {angle.sourceTitle || angle.sourceUrl}
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => void pickAngle(angle)}
                    disabled={Boolean(applyingAngleId)}
                    className="mt-3 w-full rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-500 disabled:opacity-50"
                  >
                    {applyingAngleId === angle.id
                      ? cr.applyingAngle
                      : selectedAngleId === angle.id
                        ? cr.selectedLabel
                        : deferApply
                          ? cr.selectAngle
                          : cr.useAngle}
                  </button>
                </div>
              ))}
            </div>
          )}
          {(note || warning || applyingAngleId) && (
            <div id="content-research-apply-result" className="space-y-2">
              {applyingAngleId ? (
                <p className="rounded-lg border border-violet-300 bg-violet-50 px-3 py-2 text-sm font-medium text-violet-900">
                  {cr.applyingAngle}
                </p>
              ) : null}
              {warning && !error ? (
                <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm leading-relaxed text-amber-950">
                  {warning}
                </p>
              ) : null}
              {note && !error ? (
                <p className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-900">
                  {note}
                </p>
              ) : null}
            </div>
          )}
        </div>
      ) : null}

      {/* 5. Paste reference link — emphasized alternate path */}
      <div
        className={`rounded-2xl border-2 px-4 py-4 ${
          violet
            ? "border-violet-400 bg-gradient-to-b from-violet-50 to-white shadow-[0_0_0_4px_rgba(108,59,255,0.08)]"
            : "border-emerald-400 bg-gradient-to-b from-emerald-50 to-white"
        }`}
      >
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wide ${
              violet ? "bg-violet-600 text-white" : "bg-emerald-700 text-white"
            }`}
          >
            {cr.directPostBadge}
          </span>
          <p className={`text-sm font-bold ${violet ? "text-violet-950" : "text-emerald-950"}`}>
            {cr.directPostTitle}
          </p>
        </div>
        <p
          className={`mt-1.5 text-[12px] leading-relaxed ${
            violet ? "text-slate-600" : "text-emerald-900/80"
          }`}
        >
          {cr.directPostHint}
        </p>
        <label
          className={`mt-3 block text-xs font-semibold ${
            violet ? "text-slate-800" : "text-emerald-900"
          }`}
        >
          {cr.directPostUrlLabel}
        </label>
        <input
          value={postUrl}
          onChange={(e) => setPostUrl(e.target.value)}
          placeholder={cr.directPostUrlPlaceholder}
          className={`mt-1.5 w-full rounded-xl border-2 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-500/15 ${
            violet ? "border-violet-200" : "border-emerald-200"
          }`}
        />
        <button
          type="button"
          onClick={() => void runDirectPost()}
          disabled={
            busy ||
            Boolean(platformMismatch) ||
            !postUrl.trim() ||
            (promotionMode === "physical" && !promoteProduct.trim())
          }
          className={`mt-3 w-full rounded-xl px-4 py-3 text-sm font-semibold text-white disabled:opacity-50 ${
            violet
              ? "bg-violet-600 hover:bg-violet-700"
              : "bg-emerald-700 hover:bg-emerald-600"
          }`}
        >
          {busy ? cr.busy : cr.directPostBtn}
        </button>
        {promotionMode === "physical" && !promoteProduct.trim() && (
          <p className="mt-1.5 text-[11px] text-amber-800">{cr.promoteProductRequired}</p>
        )}
      </div>
    </div>
  );
}
