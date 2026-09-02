"use client";

import { ProNodeShell } from "@/components/pro/ProNodeShell";
import { useProCanvasActions } from "@/components/pro/ProCanvasActions";
import { useLocale } from "@/components/LocaleProvider";
import { canvasScriptUsesPlanQuota } from "@/lib/ultra-pro-controls";
import type { ScriptNodeData } from "@/lib/pro-canvas-types";
import type { NodeProps } from "@xyflow/react";

export function ScriptNode({ id, data }: NodeProps & { data: ScriptNodeData }) {
  const { runScriptNode, spawnSceneNodes, spawnScenePipeline, updateNodeData, boardBusy } =
    useProCanvasActions();
  const { m } = useLocale();
  const usesPlanQuota = canvasScriptUsesPlanQuota();
  const sceneCount = data.scenePrompts?.length ?? 0;

  return (
    <ProNodeShell accent="rose" label={data.label} targetHandle sourceHandle>
      <textarea
        value={data.brief}
        onChange={(e) => updateNodeData(id, { brief: e.target.value })}
        placeholder={m.ultraCanvas.scriptBriefPlaceholder}
        className="h-20 w-full resize-none rounded-lg border border-slate-700/80 bg-slate-950/80 px-2 py-1.5 text-xs text-white placeholder:text-slate-600 focus:border-rose-500/40 focus:outline-none"
      />
      <button
        type="button"
        disabled={data.busy || boardBusy}
        onClick={() => runScriptNode(id)}
        className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-rose-600 to-pink-600 px-3 py-1.5 text-xs font-semibold text-white shadow-[0_0_16px_rgba(244,63,94,0.2)] disabled:opacity-40"
      >
        {data.busy ? m.ultraCanvas.running : m.ultraCanvas.runScript}
        {!data.busy && usesPlanQuota ? (
          <span className="rounded-full bg-black/25 px-1.5 py-0.5 text-[10px] font-medium">
            {m.ultraCanvas.scriptPlanBadge}
          </span>
        ) : null}
      </button>
      {sceneCount > 0 ? (
        <>
          <button
            type="button"
            disabled={boardBusy}
            onClick={() => spawnSceneNodes(id)}
            className="mt-2 w-full rounded-lg border border-rose-500/40 bg-rose-950/30 px-3 py-1.5 text-xs font-medium text-rose-200 hover:bg-rose-950/50"
          >
            {m.ultraCanvas.spawnScenes.replace("{n}", String(sceneCount))}
          </button>
          <button
            type="button"
            disabled={boardBusy}
            onClick={() => spawnScenePipeline(id)}
            className="mt-1.5 w-full rounded-lg border border-violet-500/40 bg-violet-950/30 px-3 py-1.5 text-xs font-medium text-violet-200 hover:bg-violet-950/50"
          >
            {m.ultraCanvas.spawnPipeline.replace("{n}", String(sceneCount))}
          </button>
        </>
      ) : null}
      {data.scriptText ? (
        <pre className="mt-2 max-h-32 overflow-y-auto whitespace-pre-wrap rounded-lg bg-slate-950/80 p-2 text-[10px] text-slate-300 ring-1 ring-slate-800">
          {data.scriptText}
        </pre>
      ) : null}
      {data.scenePrompts?.length ? (
        <ul className="mt-2 space-y-1">
          {data.scenePrompts.map((scene, i) => (
            <li
              key={i}
              className="rounded-md border border-slate-800 bg-slate-950/60 px-2 py-1 text-[10px] text-slate-400"
            >
              <span className="font-semibold text-rose-300/90">
                {m.ultraCanvas.scriptSceneLabel.replace("{n}", String(i + 1))}
              </span>
              {" — "}
              {scene.slice(0, 80)}
              {scene.length > 80 ? "…" : ""}
            </li>
          ))}
        </ul>
      ) : null}
      {data.error ? <p className="mt-2 text-xs text-red-400">{data.error}</p> : null}
    </ProNodeShell>
  );
}
