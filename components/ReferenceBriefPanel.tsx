"use client";

import type { Messages } from "@/lib/i18n";
import {
  layerPlanLabels,
  referenceStrategyUiSummary,
  type ReferenceStrategy,
  type ReferenceStrategyKind,
} from "@/lib/reference-strategy";
import type { UserReferenceBrief } from "@/lib/user-reference-brief";

type Props = {
  m: Messages;
  brief: UserReferenceBrief | null;
  strategy: ReferenceStrategy;
  busy: boolean;
  note: string | null;
};

const STRATEGY_LABEL_KEY: Record<ReferenceStrategyKind, keyof Messages["wizard"]["referenceStrategyKind"]> = {
  none: "none",
  "style-only": "styleOnly",
  "layout-transfer": "layoutTransfer",
  "product-clone": "productClone",
  "mood-only": "moodOnly",
};

const LAYER_LABEL_KEY: Record<keyof ReturnType<typeof layerPlanLabels>, keyof Messages["wizard"]["referenceLayerLabel"]> = {
  layoutGrammar: "layout",
  visualStyle: "visualStyle",
  contentLane: "topic",
  subjects: "subjects",
  onImageText: "text",
  moodLighting: "mood",
  stagingPose: "staging",
};

const ACTION_LABEL_KEY: Record<string, keyof Messages["wizard"]["referenceLayerAction"]> = {
  keep: "keep",
  adapt: "adapt",
  replace: "replace",
  ignore: "ignore",
};

export function ReferenceBriefPanel({ m, brief, strategy, busy, note }: Props) {
  if (!brief && !busy) return null;

  const labels = layerPlanLabels();
  const { borrow, replace } = referenceStrategyUiSummary(strategy);
  const strategyLabel = m.wizard.referenceStrategyKind[STRATEGY_LABEL_KEY[strategy.kind]];

  return (
    <div className="rounded-xl border border-violet-900/50 bg-violet-950/30 px-4 py-3 text-sm text-violet-100">
      <p className="font-semibold text-violet-50">{m.wizard.referenceBriefTitle}</p>
      {busy ? (
        <p className="mt-2 text-xs text-violet-200/90">{m.wizard.referenceBriefAnalyzing}</p>
      ) : (
        <>
          <p className="mt-2 text-xs text-violet-200/90">
            {m.wizard.referenceBriefStrategyLabel}:{" "}
            <span className="font-medium text-violet-100">{strategyLabel}</span>
          </p>
          {brief?.layoutStyle ? (
            <p className="mt-1 text-xs text-violet-200/80">
              {m.wizard.referenceBriefLayoutDetected}: {brief.layoutStyle}
            </p>
          ) : null}
          {brief?.colorPalette ? (
            <p className="mt-1 text-xs text-violet-200/80">
              {m.wizard.referenceBriefColors}: {brief.colorPalette}
            </p>
          ) : null}
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-300/90">
                {m.wizard.referenceBriefBorrow}
              </p>
              <ul className="mt-1 space-y-0.5 text-xs text-violet-100/90">
                {borrow.map((key) => (
                  <li key={key}>
                    {m.wizard.referenceLayerLabel[LAYER_LABEL_KEY[key]]} ·{" "}
                    {m.wizard.referenceLayerAction[ACTION_LABEL_KEY[strategy.layers[key]]]}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-300/90">
                {m.wizard.referenceBriefReplace}
              </p>
              <ul className="mt-1 space-y-0.5 text-xs text-violet-100/90">
                {replace.map((key) => (
                  <li key={key}>
                    {m.wizard.referenceLayerLabel[LAYER_LABEL_KEY[key]]} ·{" "}
                    {m.wizard.referenceLayerAction[ACTION_LABEL_KEY[strategy.layers[key]]]}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <p className="mt-2 text-[11px] text-violet-300/80">{m.wizard.referenceBriefFootnote}</p>
        </>
      )}
      {note ? <p className="mt-2 text-xs text-violet-200/70">{note}</p> : null}
    </div>
  );
}
