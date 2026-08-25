"use client";

import { useState } from "react";
import { useLocale } from "@/components/LocaleProvider";
import { useWizard } from "@/components/studio/WizardContext";
import {
  getVisualStyle,
  visualStylesForWorkflow,
  type VisualStyleId,
} from "@/lib/visual-styles";
import type { WorkflowMode } from "@/lib/workflow-mode";

type Props = {
  workflowMode: WorkflowMode;
  isConcept: boolean;
  /** Direct = blank / no preset template. */
  selectedMode: "template" | "direct" | null;
  onSelectDirect: () => void;
  onSelectTemplateStyle: (styleId: VisualStyleId) => void;
};

export function IntakeTemplatePicker({
  workflowMode,
  isConcept,
  selectedMode,
  onSelectDirect,
  onSelectTemplateStyle,
}: Props) {
  const { m } = useLocale();
  const wizard = useWizard();
  const fuse = m.microWizard.intakeFuse;
  const styles = visualStylesForWorkflow(
    workflowMode,
    isConcept ? "concept" : "physical",
  );
  const styleLabels = m.wizard.visualStyles as Record<
    string,
    { title?: string; name?: string; description?: string }
  >;

  return (
    <div className="space-y-3">
      <p className="text-[13px] leading-relaxed text-slate-600">
        {fuse.templateIntro}
      </p>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
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

        {styles.slice(0, 11).map((style) => {
          const label =
            styleLabels[style.id]?.title ??
            styleLabels[style.id]?.name ??
            style.id;
          const on =
            selectedMode === "template" && wizard.visualStyleId === style.id;
          return (
            <button
              key={style.id}
              type="button"
              onClick={() => onSelectTemplateStyle(style.id)}
              className={`overflow-hidden rounded-xl border text-left transition ${
                on
                  ? "border-violet-600 ring-1 ring-violet-200"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={style.previewSrc}
                alt=""
                className="aspect-square w-full object-cover bg-slate-100"
              />
              <div className="px-2.5 py-2">
                <p className="truncate text-[12px] font-semibold text-slate-900">
                  {style.icon} {label}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {selectedMode === "template" && wizard.visualStyleId ? (
        <p className="text-[12px] text-violet-800">
          {fuse.templateSelectedNote.replace(
            "{name}",
            styleLabels[wizard.visualStyleId]?.title ??
              styleLabels[wizard.visualStyleId]?.name ??
              getVisualStyle(wizard.visualStyleId).id,
          )}
        </p>
      ) : null}
    </div>
  );
}

/** Product-side DeepSeek brief helper for Template / Direct path. */
export function ProductBriefAssistantPanel() {
  const { m } = useLocale();
  const wizard = useWizard();
  const fuse = m.microWizard.intakeFuse;
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

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
    <div className="space-y-3 rounded-xl border border-violet-100 bg-violet-50/50 p-3">
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

      <label className="block">
        <span className="mb-1 block text-[12px] font-semibold text-slate-700">
          {fuse.copyHookLabel}
          <span className="text-violet-600"> *</span>
        </span>
        <input
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
          value={wizard.headline}
          onChange={(e) => wizard.setHeadline(e.target.value)}
          placeholder={fuse.copyHookPlaceholder}
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-[12px] font-semibold text-slate-700">
          {fuse.copySublineLabel}
        </span>
        <input
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
          value={wizard.subline}
          onChange={(e) => wizard.setSubline(e.target.value)}
          placeholder={fuse.copySublinePlaceholder}
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-[12px] font-semibold text-slate-700">
          {fuse.copyOfferLabel}
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
