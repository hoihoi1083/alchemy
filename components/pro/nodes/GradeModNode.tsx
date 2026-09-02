"use client";

import type { NodeProps } from "@xyflow/react";
import { ProNodeShell } from "@/components/pro/ProNodeShell";
import { useProCanvasActions } from "@/components/pro/ProCanvasActions";
import { useLocale } from "@/components/LocaleProvider";
import { artStyleIdsForPicker, type ArtStyleId } from "@/lib/art-style";
import type { GradeModNodeData } from "@/lib/pro-canvas-types";

function pill(active: boolean) {
  return active
    ? "border-violet-400/80 bg-violet-600/30 text-violet-100 ring-1 ring-violet-400/40"
    : "border-slate-700 bg-slate-950/60 text-slate-300 hover:border-slate-500";
}

export function GradeModNode({ id, data }: NodeProps & { data: GradeModNodeData }) {
  const { updateNodeData } = useProCanvasActions();
  const { m } = useLocale();
  const pc = m.ultraCanvas.modifierNodes;

  return (
    <ProNodeShell accent="violet" label={data.label} sourceHandle targetHandle={false} widthClass="w-64">
      <p className="mb-2 text-[10px] text-slate-400">{pc.gradeHint}</p>
      <div className="flex flex-wrap gap-1">
        {artStyleIdsForPicker({ videoSafeOnly: true }).map((styleId) => {
          const copy = m.wizard.artStyles[styleId as ArtStyleId];
          return (
            <button
              key={styleId}
              type="button"
              onClick={() => updateNodeData(id, { artStyleId: styleId })}
              className={`rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${pill(data.artStyleId === styleId)}`}
            >
              {copy?.title ?? styleId}
            </button>
          );
        })}
      </div>
    </ProNodeShell>
  );
}
