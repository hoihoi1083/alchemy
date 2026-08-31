"use client";

import { useState } from "react";
import { useLocale } from "@/components/LocaleProvider";
import { PlanGateDialog } from "@/components/billing/PlanGateDialog";
import { useWizard } from "@/components/studio/WizardContext";
import { useUserPlanEntitlements } from "@/hooks/useUserPlanEntitlements";
import {
  canUseStoryboard,
  minPlanForFeature,
} from "@/lib/billing/plan-gates";
import {
  resolveConceptCopyFocus,
} from "@/lib/concept-copy-focus";
import {
  resolveCreativeCopyFieldHints,
  type CopyFieldBadgeKind,
} from "@/lib/creative-copy-field-hints";
import {
  buildIntakeTemplateCards,
  intakeShowsStoryboardRecipes,
  intakeShowsVideoRecipes,
  type IntakeTemplateCard,
} from "@/lib/intake-template-styles";
import type { StoryboardRecipeId } from "@/lib/storyboard-recipes";
import type { VisualStyleId } from "@/lib/visual-styles";
import type { VideoSubpath } from "@/lib/wizard-micro-steps.types";
import type { WorkflowMode } from "@/lib/workflow-mode";

type Props = {
  workflowMode: WorkflowMode;
  isConcept: boolean;
  /** Direct = blank / no preset template. */
  selectedMode: "template" | "direct" | null;
  /** Selected video recipe subpath (video-only). */
  selectedVideoSubpath?: VideoSubpath | null;
  onSelectDirect: () => void;
  onSelectTemplateStyle: (styleId: VisualStyleId) => void;
  /** Video-only: pick a shot-recipe style. */
  onSelectVideoStyle?: (subpath: VideoSubpath) => void;
  /** Combined / storyboard: pick Classic TVC or Luxury birth. */
  onSelectStoryboardRecipe?: (recipeId: StoryboardRecipeId) => void;
};

export function IntakeTemplatePicker({
  workflowMode,
  isConcept,
  selectedMode,
  selectedVideoSubpath = null,
  onSelectDirect,
  onSelectTemplateStyle,
  onSelectVideoStyle,
  onSelectStoryboardRecipe,
}: Props) {
  const { m } = useLocale();
  const wizard = useWizard();
  const { plan } = useUserPlanEntitlements();
  const storyboardAllowed = canUseStoryboard(plan);
  const [storyboardGateOpen, setStoryboardGateOpen] = useState(false);
  const fuse = m.microWizard.intakeFuse;
  const showVideoRecipes = intakeShowsVideoRecipes(workflowMode);
  const showStoryboardRecipes = intakeShowsStoryboardRecipes(workflowMode);

  const cards = buildIntakeTemplateCards({
    workflowMode,
    isConcept,
    copy: {
      pathQuickTitle: m.wizard.pathQuickTitle,
      pathQuickVideoDesc: m.wizard.pathQuickVideoDesc,
      pathReferenceVideoTitle: m.wizard.pathReferenceVideoTitle,
      pathReferenceVideoDesc: m.wizard.pathReferenceVideoDesc,
      sceneReelTitle: m.wizard.sceneReelTitle,
      sceneReelDesc: m.wizard.sceneReelDesc,
      videoCreativeModes: m.wizard.videoCreativeModes as Record<
        string,
        { title: string; description: string }
      >,
      visualStyles: m.wizard.visualStyles as Record<
        string,
        { title?: string; name?: string; description?: string }
      >,
      storyboardRecipes: m.wizard.storyboardRecipes as Record<
        string,
        { title: string; desc: string }
      >,
    },
  });

  function isCardSelected(card: IntakeTemplateCard): boolean {
    if (selectedMode !== "template") return false;
    if (card.kind === "video") {
      return selectedVideoSubpath === card.videoSubpath;
    }
    if (card.kind === "storyboard") {
      return wizard.storyboardRecipeId === card.storyboardRecipeId;
    }
    return wizard.visualStyleId === card.visualStyleId;
  }

  function onPickCard(card: IntakeTemplateCard) {
    if (card.kind === "video" && card.videoSubpath && onSelectVideoStyle) {
      onSelectVideoStyle(card.videoSubpath);
      return;
    }
    if (
      card.kind === "storyboard" &&
      card.storyboardRecipeId &&
      onSelectStoryboardRecipe
    ) {
      if (!storyboardAllowed) {
        setStoryboardGateOpen(true);
        return;
      }
      onSelectStoryboardRecipe(card.storyboardRecipeId);
      return;
    }
    if (card.kind === "visual" && card.visualStyleId) {
      if (card.visualStyleId === "storyboard-video" && !storyboardAllowed) {
        setStoryboardGateOpen(true);
        return;
      }
      onSelectTemplateStyle(card.visualStyleId);
    }
  }

  const selectedLabel = (() => {
    if (selectedMode !== "template") return null;
    if (showVideoRecipes && selectedVideoSubpath) {
      const hit = cards.find((c) => c.videoSubpath === selectedVideoSubpath);
      return hit?.title ?? selectedVideoSubpath;
    }
    if (showStoryboardRecipes) {
      const hit = cards.find(
        (c) => c.storyboardRecipeId === wizard.storyboardRecipeId,
      );
      return hit?.title ?? wizard.storyboardRecipeId;
    }
    if (wizard.visualStyleId) {
      const hit = cards.find((c) => c.visualStyleId === wizard.visualStyleId);
      return hit?.title ?? wizard.visualStyleId;
    }
    return null;
  })();

  return (
    <div className="space-y-3">
      <p className="text-[13px] leading-relaxed text-slate-600">
        {fuse.templateIntro}
      </p>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={onSelectDirect}
          className={`rounded-xl border p-3 text-left transition ${
            selectedMode === "direct"
              ? "border-violet-600 bg-violet-50 ring-1 ring-violet-200"
              : "border-slate-200 bg-white hover:border-slate-300"
          }`}
        >
          <p className="text-[13px] font-bold text-slate-900">
            {fuse.templateDirectTitle}
          </p>
          <p className="mt-1 text-[11px] leading-snug text-slate-500">
            {fuse.templateDirectBody}
          </p>
        </button>

        {cards.map((card) => {
          const on = isCardSelected(card);
          const storyboardLocked =
            (card.kind === "storyboard" || card.visualStyleId === "storyboard-video") &&
            !storyboardAllowed;
          return (
            <button
              key={card.id}
              type="button"
              aria-disabled={storyboardLocked}
              onClick={() => onPickCard(card)}
              className={`flex items-start gap-2.5 overflow-hidden rounded-xl border p-2.5 text-left transition ${
                storyboardLocked
                  ? "cursor-pointer border-dashed border-slate-300 bg-slate-50/80 opacity-90"
                  : on
                    ? "border-violet-600 bg-violet-50 ring-1 ring-violet-200"
                    : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={card.previewSrc}
                alt=""
                className="h-14 w-14 shrink-0 rounded-lg object-cover bg-slate-100"
              />
              <span className="min-w-0">
                <span className="block text-[13px] font-semibold text-slate-900">
                  {card.title}
                </span>
                {card.description ? (
                  <span className="mt-0.5 block text-[11px] leading-snug text-slate-500 line-clamp-2">
                    {card.description}
                  </span>
                ) : null}
                {storyboardLocked ? (
                  <span className="mt-1 block text-[10px] font-semibold text-amber-800">
                    {m.pricing.plans.pro.name}+
                  </span>
                ) : null}
              </span>
            </button>
          );
        })}
      </div>

      {selectedLabel ? (
        <p className="text-[12px] text-violet-800">
          {fuse.templateSelectedNote.replace("{name}", selectedLabel)}
        </p>
      ) : null}
      <PlanGateDialog
        open={storyboardGateOpen}
        onClose={() => setStoryboardGateOpen(false)}
        requiredPlan={minPlanForFeature("storyboard")}
        featureLabel={m.wizard.visualStyles["storyboard-video"].title}
      />
    </div>
  );
}

const ON_CREATIVE_FIELD_CLASS =
  "block rounded-xl border border-violet-300 bg-violet-50/60 p-3 ring-1 ring-violet-200";
const QUIET_FIELD_CLASS = "block";

function OnCreativeBadge({
  label,
  quiet,
}: {
  label: string;
  quiet?: boolean;
}) {
  return (
    <span
      className={
        quiet
          ? "ml-1.5 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600"
          : "ml-1.5 rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-semibold text-violet-700"
      }
    >
      {label}
    </span>
  );
}

/** Product-side DeepSeek brief helper for Template / Direct path. */
export function ProductBriefAssistantPanel() {
  const { m } = useLocale();
  const wizard = useWizard();
  const fuse = m.microWizard.intakeFuse;
  const pg = m.microWizard.preGenerateSetup;
  const pv = m.microWizard.preVideoSetup;
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const copyHints = resolveCreativeCopyFieldHints({
    workflowMode: wizard.workflowMode,
    visualStyleId: wizard.visualStyleId,
    videoCreativeMode: wizard.videoCreativeMode,
    imageTextMode: wizard.imageTextMode,
    imageOutputMode: wizard.imageOutputMode,
  });

  function badgeLabel(kind: CopyFieldBadgeKind): string | null {
    if (!kind) return null;
    if (kind === "on-image") return pg.onImageBadge;
    if (kind === "on-video") return pv.inVideoBadge;
    if (kind === "on-end-still") return fuse.onEndStillBadge;
    if (kind === "ig-caption") return fuse.igCaptionBadge;
    if (kind === "mood-only") return fuse.moodOnlyBadge;
    return null;
  }

  const panelHint =
    copyHints.hintKind === "textless-video"
      ? fuse.productAssistTextlessHint
      : copyHints.hintKind === "textless-image"
        ? fuse.productAssistTextlessImageHint
        : copyHints.hintKind === "end-still"
          ? fuse.productAssistEndStillHint
          : copyHints.hintKind === "ig-caption"
            ? fuse.productAssistIgCaptionHint
            : fuse.productAssistHint;

  const copyFocus = resolveConceptCopyFocus(
    wizard.visualStyleId,
    pg.conceptCopyFocus,
  );
  const emphasis = copyHints.emphasize;
  const hookLabel =
    (copyFocus && "hookLabel" in copyFocus && copyFocus.hookLabel) ||
    pg.hookLabel;
  const supportingLabel = copyFocus?.supportingLabel ?? pg.supportingLabel;
  const offerLabel =
    (copyFocus && "offerLabel" in copyFocus && copyFocus.offerLabel) ||
    pg.offerLabel;
  const hookPlaceholder =
    (copyFocus && "hookPlaceholder" in copyFocus && copyFocus.hookPlaceholder) ||
    fuse.copyHookPlaceholder;
  const supportingPlaceholder =
    copyFocus?.supportingPlaceholder ?? fuse.copySublinePlaceholder;
  const offerPlaceholder =
    (copyFocus &&
      "offerPlaceholder" in copyFocus &&
      copyFocus.offerPlaceholder) ||
    fuse.copyOfferPlaceholder;

  const hookBadge = badgeLabel(copyHints.badge.hook);
  const supportingBadge = badgeLabel(copyHints.badge.supporting);
  const offerBadge = badgeLabel(copyHints.badge.offer);

  async function fillWithAi() {
    if (!wizard.product.trim()) {
      wizard.setError(fuse.productAssistNeedProduct);
      return;
    }
    setBusy(true);
    setNote(null);
    wizard.setError(null);
    try {
      const res = await fetch("/api/plan-product-brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product: wizard.product.trim(),
          business: wizard.business.trim() || undefined,
          headline: wizard.headline.trim() || undefined,
          subline: wizard.subline.trim() || undefined,
          offer: wizard.offer.trim() || undefined,
          promptExtra: wizard.promptExtra.trim() || undefined,
          visualStyleId: wizard.visualStyleId,
          workflowMode: wizard.workflowMode,
          market: wizard.promptMarket,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? fuse.productAssistFailed);
      const draft = data.draft as {
        headline?: string;
        subline?: string;
        offer?: string;
        notes?: string;
      };
      if (draft.headline?.trim()) wizard.setHeadline(draft.headline.trim());
      if (draft.subline?.trim()) wizard.setSubline(draft.subline.trim());
      if (draft.offer?.trim()) wizard.setOffer(draft.offer.trim());
      if (draft.notes?.trim()) {
        wizard.setPromptExtra((prev: string) =>
          [prev.trim(), draft.notes!.trim()].filter(Boolean).join(" | "),
        );
      }
      setNote(fuse.productAssistDone);
    } catch (e: unknown) {
      wizard.setError(e instanceof Error ? e.message : fuse.productAssistFailed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[13px] font-bold text-slate-900">
            {fuse.productAssistTitle}
          </p>
          <p className="mt-0.5 text-[12px] text-slate-500">{panelHint}</p>
          {copyFocus && copyHints.hintKind === "prints" ? (
            <p className="mt-1 text-[11px] leading-snug text-violet-800">
              <span className="font-semibold">{copyFocus.title}</span>
              {" — "}
              {copyFocus.body}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => void fillWithAi()}
          className="rounded-full bg-violet-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
        >
          {busy ? fuse.productAssistBusy : fuse.productAssistCta}
        </button>
      </div>

      <label className={emphasis.hook ? ON_CREATIVE_FIELD_CLASS : QUIET_FIELD_CLASS}>
        <span className="mb-1 block text-[12px] font-semibold text-slate-700">
          {hookLabel}
          <span className="text-violet-600"> *</span>
          {hookBadge ? (
            <OnCreativeBadge
              label={hookBadge}
              quiet={copyHints.badge.hook === "mood-only"}
            />
          ) : null}
        </span>
        <input
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
          value={wizard.headline}
          onChange={(e) => wizard.setHeadline(e.target.value)}
          placeholder={hookPlaceholder}
        />
      </label>
      <label
        className={
          emphasis.supporting ? ON_CREATIVE_FIELD_CLASS : QUIET_FIELD_CLASS
        }
      >
        <span className="mb-1 block text-[12px] font-semibold text-slate-700">
          {supportingLabel}
          {supportingBadge ? (
            <OnCreativeBadge
              label={supportingBadge}
              quiet={copyHints.badge.supporting === "mood-only"}
            />
          ) : null}
        </span>
        <input
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
          value={wizard.subline}
          onChange={(e) => wizard.setSubline(e.target.value)}
          placeholder={supportingPlaceholder}
        />
      </label>
      <label
        className={emphasis.offer ? ON_CREATIVE_FIELD_CLASS : QUIET_FIELD_CLASS}
      >
        <span className="mb-1 block text-[12px] font-semibold text-slate-700">
          {offerLabel}
          {offerBadge ? (
            <OnCreativeBadge
              label={offerBadge}
              quiet={copyHints.badge.offer === "mood-only"}
            />
          ) : null}
        </span>
        <input
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
          value={wizard.offer}
          onChange={(e) => wizard.setOffer(e.target.value)}
          placeholder={offerPlaceholder}
        />
      </label>
      {note ? <p className="text-xs text-emerald-800">{note}</p> : null}
    </div>
  );
}
