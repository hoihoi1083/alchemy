"use client";

import type { NodeProps } from "@xyflow/react";
import { ProNodeShell } from "@/components/pro/ProNodeShell";
import { useProCanvasActions } from "@/components/pro/ProCanvasActions";
import { useLocale } from "@/components/LocaleProvider";
import type { BrainstormNodeData } from "@/lib/pro-canvas-types";
import { canvasScriptUsesPlanQuota } from "@/lib/ultra-pro-controls";

const DURATION_OPTIONS = [8, 12, 15, 20, 30, 45, 60];

export function BrainstormNode({ id, data }: NodeProps & { data: BrainstormNodeData }) {
  const {
    updateNodeData,
    runBrainstormNode,
    applyBrainstormOption,
    boardBusy,
  } = useProCanvasActions();
  const { m } = useLocale();
  const bn = m.ultraCanvas.brainstormNode;
  const usesPlanQuota = canvasScriptUsesPlanQuota();
  const options = data.options ?? [];

  return (
    <ProNodeShell accent="rose" label={data.label} sourceHandle targetHandle={false} widthClass="w-80">
      <p className="mb-2 text-[10px] text-slate-400">{bn.hint}</p>
      <textarea
        value={data.idea}
        onChange={(e) => updateNodeData(id, { idea: e.target.value })}
        placeholder={bn.ideaPlaceholder}
        className="h-20 w-full resize-none rounded-lg border border-slate-700/80 bg-slate-950/80 px-2 py-1.5 text-[10px] text-white placeholder:text-slate-600 focus:border-rose-500/40 focus:outline-none"
      />
      <div className="mt-2 flex items-center justify-between gap-2">
        <label className="text-[10px] text-slate-400">{bn.durationLabel}</label>
        <select
          value={data.durationSec}
          onChange={(e) => updateNodeData(id, { durationSec: Number(e.target.value) })}
          className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-[10px] text-slate-200"
        >
          {DURATION_OPTIONS.map((n) => (
            <option key={n} value={n}>
              {n}s
            </option>
          ))}
        </select>
      </div>
      <button
        type="button"
        disabled={data.busy || boardBusy || !data.idea.trim()}
        onClick={() => void runBrainstormNode(id)}
        className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-rose-600 to-pink-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
      >
        {data.busy ? bn.brainstorming : bn.brainstorm}
        {usesPlanQuota && !data.busy ? (
          <span className="rounded-full bg-black/25 px-1.5 py-0.5 text-[10px] font-medium">
            {m.ultraCanvas.scriptPlanBadge}
          </span>
        ) : null}
      </button>
      {options.length ? (
        <ul className="mt-2 max-h-56 space-y-1.5 overflow-y-auto">
          {options.map((opt) => {
            const selected = data.selectedOptionId === opt.id;
            return (
              <li key={opt.id}>
                <button
                  type="button"
                  disabled={boardBusy}
                  onClick={() => applyBrainstormOption(id, opt.id)}
                  className={`w-full rounded-lg border px-2 py-1.5 text-left transition ${
                    selected
                      ? "border-rose-400/60 bg-rose-950/50"
                      : "border-slate-700/80 bg-slate-950/60 hover:border-rose-500/35"
                  }`}
                >
                  <p className="text-[10px] font-semibold text-rose-100">{opt.title}</p>
                  <p className="mt-0.5 text-[9px] text-slate-300">{opt.hook}</p>
                  <p className="mt-0.5 text-[9px] text-slate-500 line-clamp-2">{opt.brief}</p>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
      {data.error ? <p className="mt-2 text-xs text-red-400">{data.error}</p> : null}
    </ProNodeShell>
  );
}
