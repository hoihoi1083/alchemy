"use client";

import { useMemo, useState } from "react";
import { useLocale } from "@/components/LocaleProvider";
import {
  visualStylesForWorkflow,
  type VisualStyleId,
} from "@/lib/visual-styles";
import type { WorkflowMode } from "@/lib/workflow-mode";
import type { PromotionMode } from "@/lib/promotion-mode";
import { conceptPrimaryVisualStyleIds, physicalPrimaryVisualStyleIds } from "@/lib/promotion-styles";

type Props = {
  value: VisualStyleId;
  onChange: (id: VisualStyleId) => void;
  workflowMode: WorkflowMode;
  promotionMode: PromotionMode;
};

export function VisualStylePicker({ value, onChange, workflowMode, promotionMode }: Props) {
  const { m } = useLocale();
  const styles = visualStylesForWorkflow(workflowMode, promotionMode);
  const [showAll, setShowAll] = useState(false);

  const coreStyles = useMemo(() => {
    const coreIds =
      promotionMode === "concept"
        ? conceptPrimaryVisualStyleIds()
        : physicalPrimaryVisualStyleIds();
    const coreSet = new Set(coreIds);
    const core = styles.filter((s) => coreSet.has(s.id));
    return core.length > 0 ? core : styles;
  }, [styles, promotionMode]);

  const displayedStyles = showAll ? styles : coreStyles;

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-slate-700">{m.wizard.visualStyleLabel}</p>
      <p className="text-xs text-slate-500">
        {workflowMode === "video-only"
          ? m.wizard.visualStyleHintVideoOnly
          : workflowMode === "combined"
            ? m.wizard.visualStyleHintCombined
            : m.wizard.visualStyleHint}
      </p>
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-slate-500">{m.wizard.styleModeLabel}</p>
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="rounded-full border border-slate-300 px-3 py-1 text-[11px] text-slate-600 hover:border-slate-400"
        >
          {showAll ? m.wizard.styleModeSimple : m.wizard.styleModeAll}
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {displayedStyles.map((s) => {
          const copy = m.wizard.visualStyles[s.id];
          const selected = value === s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onChange(s.id)}
              className={`overflow-hidden rounded-xl border bg-white text-left transition ${
                selected
                  ? "border-violet-500 ring-1 ring-violet-400"
                  : "border-slate-200 hover:border-violet-200"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s.previewSrc} alt="" className="aspect-square w-full object-cover" />
              <span className="block px-2 py-2">
                <span className="block text-xs font-semibold leading-tight text-slate-900">
                  {copy.title}
                </span>
                <span className="mt-0.5 block text-[11px] leading-snug text-slate-500">
                  {copy.description}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
