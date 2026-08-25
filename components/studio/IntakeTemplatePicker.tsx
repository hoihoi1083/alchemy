"use client";

import { useState } from "react";
import { useLocale } from "@/components/LocaleProvider";
import { useWizard } from "@/components/studio/WizardContext";
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
      onSelectStoryboardRecipe(card.storyboardRecipeId);
      return;
    }
    if (card.kind === "visual" && card.visualStyleId) {
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
          return (
            <button
              key={card.id}
              type="button"
              onClick={() => onPickCard(card)}
              className={`flex items-start gap-2.5 overflow-hidden rounded-xl border p-2.5 text-left transition ${
                on
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
    </div>
  );
}

const ON_CREATIVE_FIELD_CLASS =
  "block rounded-xl border border-violet-300 bg-violet-50/60 p-3 ring-1 ring-violet-200";

function OnCreativeBadge({ label }: { label: string }) {
  return (
    <span className="ml-1.5 rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-semibold text-violet-700">
      {label}
    </span>
  );
}

/** Product-side DeepSeek brief helper for Template / Direct path. */
export function ProductBriefAssistantPanel() {
  const { m } = useLocale();
  const wizard = useWizard();
  const fuse = m.microWizard.intakeFuse;
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const isVideoWorkflow =
    wizard.workflowMode === "video-only" || wizard.workflowMode === "combined";
  const onCreativeBadge = isVideoWorkflow
    ? m.microWizard.preVideoSetup.inVideoBadge
    : m.microWizard.preGenerateSetup.onImageBadge;

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
          <p className="mt-0.5 text-[12px] text-slate-500">
            {fuse.productAssistHint}
          </p>
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

      <label className={ON_CREATIVE_FIELD_CLASS}>
        <span className="mb-1 block text-[12px] font-semibold text-slate-700">
          {fuse.copyHookLabel}
          <span className="text-violet-600"> *</span>
          <OnCreativeBadge label={onCreativeBadge} />
        </span>
        <input
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
          value={wizard.headline}
          onChange={(e) => wizard.setHeadline(e.target.value)}
          placeholder={fuse.copyHookPlaceholder}
        />
      </label>
      <label className={ON_CREATIVE_FIELD_CLASS}>
        <span className="mb-1 block text-[12px] font-semibold text-slate-700">
          {fuse.copySublineLabel}
          <OnCreativeBadge label={onCreativeBadge} />
        </span>
        <input
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
          value={wizard.subline}
          onChange={(e) => wizard.setSubline(e.target.value)}
          placeholder={fuse.copySublinePlaceholder}
        />
      </label>
      <label className={ON_CREATIVE_FIELD_CLASS}>
        <span className="mb-1 block text-[12px] font-semibold text-slate-700">
          {fuse.copyOfferLabel}
          <OnCreativeBadge label={onCreativeBadge} />
        </span>
        <input
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
          value={wizard.offer}
          onChange={(e) => wizard.setOffer(e.target.value)}
          placeholder={fuse.copyOfferPlaceholder}
        />
      </label>
      {note ? <p className="text-xs text-emerald-800">{note}</p> : null}
    </div>
  );
}
