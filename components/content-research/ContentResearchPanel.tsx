"use client";

import { useEffect, useState } from "react";
import { useLocale } from "@/components/LocaleProvider";
import {
  applyContentAngleToWizard,
  buildContentAngleHandoff,
  type ContentAngleWizardApi,
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

type ContentResearchPanelProps = {
  /** Category keyword for finding viral posts (e.g. 水晶手串). */
  defaultTopic?: string;
  /** Actual product/SKU to promote — hooks and copy must be about this. */
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
  /** When set, picking an angle navigates to studio with handoff. */
  navigateOnApply?: (path: string) => void;
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
}: ContentResearchPanelProps) {
  const { m } = useLocale();
  const cr = m.contentResearch;
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
    setBusy(true);
    setError(null);
    setNote(null);
    setWarning(null);
    setPlan(null);
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
    setApplyingAngleId(angle.id);
    setError(null);
    setWarning(null);
    setNote(null);
    try {
      if (wizard) {
        const { refs } = await applyContentAngleToWizard(
          angleToApply,
          plan,
          promotionMode,
          wizard,
          promoteProduct.trim() || undefined,
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
            promoteProduct.trim() || undefined,
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
          ? "space-y-3"
          : "space-y-3 rounded-xl border border-emerald-200 bg-emerald-50/60 px-4 py-3"
      }
    >
      {!compact && (
        <p className="text-sm font-semibold text-emerald-950">{cr.title}</p>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setPromotionMode("physical")}
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            promotionMode === "physical"
              ? "bg-emerald-700 text-white"
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
              ? "bg-emerald-700 text-white"
              : "border border-emerald-300 bg-white text-emerald-900"
          }`}
        >
          {cr.concept}
        </button>
      </div>

      <label className="block text-xs font-medium text-emerald-900">{cr.searchKeywordLabel}</label>
      <input
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        placeholder={cr.searchKeywordPlaceholder}
        className="w-full rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm text-slate-900"
      />

      {promotionMode === "physical" && (
        <>
          <label className="block text-xs font-medium text-emerald-900">
            {cr.promoteProductLabel} *
          </label>
          <input
            value={promoteProduct}
            onChange={(e) => updatePromoteProduct(e.target.value)}
            placeholder={cr.promoteProductPlaceholder}
            required
            className="w-full rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm text-slate-900"
          />
          <p className="text-[11px] leading-relaxed text-emerald-900/80">{cr.promoteProductHint}</p>
        </>
      )}

      <div className="flex flex-wrap gap-2">
        {CONTENT_PLATFORMS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPlatform(p)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium ${
              platform === p
                ? "bg-slate-900 text-white"
                : "border border-slate-200 bg-white text-slate-700"
            }`}
          >
            {cr.platforms[p]}
          </button>
        ))}
      </div>

      <p className="text-[11px] text-slate-600">
        {mediaFilter === "image"
          ? cr.researchMediaImage
          : mediaFilter === "video"
            ? cr.researchMediaVideo
            : cr.researchMediaBoth}
      </p>
      {platformMismatch && (
        <p className="text-[11px] text-amber-800">{cr.tiktokImageWarning}</p>
      )}

      <button
        type="button"
        onClick={() => void runResearch()}
        disabled={busy || Boolean(platformMismatch)}
        className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-50"
      >
        {busy ? cr.busy : cr.researchBtn}
      </button>

      <div className="rounded-lg border border-dashed border-emerald-300/80 bg-white/60 px-3 py-3">
        <p className="text-xs font-semibold text-emerald-950">{cr.directPostTitle}</p>
        <p className="mt-1 text-[11px] leading-relaxed text-emerald-900/75">{cr.directPostHint}</p>
        <label className="mt-2 block text-xs font-medium text-emerald-900">{cr.directPostUrlLabel}</label>
        <input
          value={postUrl}
          onChange={(e) => setPostUrl(e.target.value)}
          placeholder={cr.directPostUrlPlaceholder}
          className="mt-1 w-full rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm text-slate-900"
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
          className="mt-2 w-full rounded-lg border border-emerald-600 bg-white px-4 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-50 disabled:opacity-50"
        >
          {busy ? cr.busy : cr.directPostBtn}
        </button>
        {promotionMode === "physical" && !promoteProduct.trim() && (
          <p className="mt-1.5 text-[11px] text-amber-800">{cr.promoteProductRequired}</p>
        )}
      </div>

      {error && <p className="text-xs text-red-700">{error}</p>}

      {plan && (
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
          <p className="text-xs font-semibold text-slate-800">{cr.topPicksTitle}</p>
          {plan.posts && plan.posts.length > 0 && plan.searchProvider === "justoneapi" ? (
            <>
              {(() => {
                const { angles, hiddenWithoutCover } = displayResearchAngles(plan, {
                  videoOnly: workflowMode === "video-only",
                });
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
                      videoOnly={workflowMode === "video-only"}
                      applyingAngleId={applyingAngleId}
                      pickDisabled={promotionMode === "physical" && !promoteProduct.trim()}
                      pickDisabledHint={cr.promoteProductRequired}
                      onPick={pickAngle}
                      labels={{
                        scoreLabel: cr.scoreLabel,
                        inspiredBy: cr.inspiredBy,
                        yourAngle: cr.yourAngle,
                        useAngle: cr.useAngle,
                        applyingAngle: cr.applyingAngle,
                        openNote: cr.openNote,
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
                  className="rounded-lg border border-emerald-200 bg-white p-3 shadow-sm"
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
                  <p className="mt-2 text-[11px] leading-relaxed text-slate-600">
                    {angle.whyItWorks}
                  </p>
                  {angle.bulletPoints.length > 0 && (
                    <ul className="mt-2 list-inside list-disc text-[11px] text-slate-600">
                      {angle.bulletPoints.map((b) => (
                        <li key={b}>{b}</li>
                      ))}
                    </ul>
                  )}
                  {angle.sourceUrl && (
                    <a
                      href={angle.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 block truncate text-[10px] text-sky-700 underline"
                    >
                      {cr.sourceLabel}: {angle.sourceTitle || angle.sourceUrl}
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => void pickAngle(angle)}
                    disabled={Boolean(applyingAngleId)}
                    className="mt-3 w-full rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-500 disabled:opacity-50"
                  >
                    {applyingAngleId === angle.id ? cr.applyingAngle : cr.useAngle}
                  </button>
                </div>
              ))}
            </div>
          )}
          <div id="content-research-apply-result" className="space-y-2">
            {applyingAngleId && (
              <p className="rounded-lg border border-violet-300 bg-violet-50 px-3 py-2 text-sm font-medium text-violet-900">
                {cr.applyingAngle}
              </p>
            )}
            {error && (
              <p className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900">
                {error}
              </p>
            )}
            {warning && !error && (
              <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm leading-relaxed text-amber-950">
                {warning}
              </p>
            )}
            {note && !error && (
              <p className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-900">
                {note}
              </p>
            )}
          </div>
          {plan.posts && plan.posts.length > 0 && plan.searchProvider === "justoneapi" && (
            <details className="text-xs text-slate-600">
              <summary className="cursor-pointer font-medium text-slate-700">
                {cr.allPostsTitle} ({plan.posts.length})
              </summary>
              <div className="mt-2">
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
              </div>
            </details>
          )}
          <details className="text-xs text-slate-600">
            <summary className="cursor-pointer font-medium text-slate-700">
              {cr.allAnglesTitle} ({plan.candidates.length})
            </summary>
            <ul className="mt-2 space-y-1">
              {plan.candidates.map((angle) => (
                <li key={angle.id} className="flex flex-wrap items-baseline gap-x-2">
                  <span className="font-medium text-slate-800">{angle.title}</span>
                  <span className="text-slate-500">— {angle.hook}</span>
                </li>
              ))}
            </ul>
          </details>
          {plan.sources && plan.sources.length > 0 && (
            <details className="text-xs text-slate-600">
              <summary className="cursor-pointer font-medium text-slate-700">
                {cr.sourcesTitle} ({plan.sources.length})
              </summary>
              <ul className="mt-2 space-y-2">
                {plan.sources.slice(0, 8).map((s) => (
                  <li key={s.url}>
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-sky-700 underline"
                    >
                      {s.title || s.url}
                    </a>
                    {s.snippet && (
                      <p className="mt-0.5 line-clamp-2 text-[10px] text-slate-500">{s.snippet}</p>
                    )}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
