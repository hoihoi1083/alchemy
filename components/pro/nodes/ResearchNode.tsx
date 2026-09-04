"use client";

import { CanvasTextarea } from "@/components/pro/CanvasTextField";
import { useEffect, useRef } from "react";
import type { NodeProps } from "@xyflow/react";
import { ProNodeShell } from "@/components/pro/ProNodeShell";
import { useProCanvasActions } from "@/components/pro/ProCanvasActions";
import { useLocale } from "@/components/LocaleProvider";
import type { ResearchNodeData } from "@/lib/pro-canvas-types";
import {
  clearUltraResearchHandoff,
  formatResearchSummaryForCanvas,
  readUltraResearchHandoff,
} from "@/lib/ultra-research-handoff";

export function ResearchNode({ id, data }: NodeProps & { data: ResearchNodeData }) {
  const { updateNodeData, showBoardNotice } = useProCanvasActions();
  const { m } = useLocale();
  const rn = m.ultraCanvas.researchNode;
  const handoffAppliedRef = useRef(false);

  useEffect(() => {
    if (handoffAppliedRef.current || data.summary?.trim()) return;
    const handoff = readUltraResearchHandoff();
    if (!handoff) return;
    handoffAppliedRef.current = true;
    updateNodeData(id, { summary: formatResearchSummaryForCanvas(handoff) });
    clearUltraResearchHandoff();
  }, [data.summary, id, updateNodeData]);

  const importHandoff = () => {
    const handoff = readUltraResearchHandoff();
    if (!handoff) {
      showBoardNotice(rn.handoffMissing);
      return;
    }
    updateNodeData(id, { summary: formatResearchSummaryForCanvas(handoff) });
    clearUltraResearchHandoff();
    showBoardNotice(rn.handoffImported);
  };

  return (
    <ProNodeShell
      accent="cyan"
      label={data.label}
      sourceHandle
      targetHandle={false}
      widthClass="w-72"
    >
      <p className="mb-2 text-[10px] text-slate-400">{rn.hint}</p>
      <CanvasTextarea
        value={data.summary}
        onChange={(summary) => updateNodeData(id, { summary })}
        placeholder={rn.summaryPlaceholder}
        className="h-24 w-full resize-none rounded-lg border border-slate-700/80 bg-slate-950/80 px-2 py-1.5 text-[10px] text-white placeholder:text-slate-600 focus:border-cyan-500/40 focus:outline-none"
      />
      <button
        type="button"
        onClick={importHandoff}
        className="mt-2 w-full rounded-lg border border-cyan-500/35 bg-cyan-950/30 px-3 py-1.5 text-xs font-medium text-cyan-100 hover:bg-cyan-950/50"
      >
        {rn.importHandoff}
      </button>
      <a
        href="/studio"
        className="mt-1.5 block text-center text-[10px] text-cyan-400/90 underline-offset-2 hover:underline"
      >
        {rn.openStudioResearch}
      </a>
    </ProNodeShell>
  );
}
