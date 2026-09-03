"use client";

import { ProNodeShell } from "@/components/pro/ProNodeShell";
import { StaleOutputBadge } from "@/components/pro/StaleOutputBadge";
import { useProCanvasActions } from "@/components/pro/ProCanvasActions";
import { useLocale } from "@/components/LocaleProvider";
import {
  ULTRA_SCRIPT_SCENE_COUNT_DEFAULT,
  ULTRA_SCRIPT_SCENE_COUNT_MAX,
  ULTRA_SCRIPT_SCENE_COUNT_MIN,
  type ScriptSceneBeat,
} from "@/lib/pro-canvas-script-plan";
import { canvasScriptUsesPlanQuota } from "@/lib/ultra-pro-controls";
import type { ScriptNodeData } from "@/lib/pro-canvas-types";
import type { NodeProps } from "@xyflow/react";

function normalizeBeats(
  beats: ScriptSceneBeat[] | undefined,
  count: number,
): ScriptSceneBeat[] {
  const rows = [...(beats ?? [])];
  while (rows.length < count) rows.push({});
  return rows.slice(0, count);
}

export function ScriptNode({ id, data }: NodeProps & { data: ScriptNodeData }) {
  const { runScriptNode, spawnSceneNodes, spawnScenePipeline, updateNodeData, boardBusy, isNodeStale } =
    useProCanvasActions();
  const { m } = useLocale();
  const sn = m.ultraCanvas.scriptNode;
  const usesPlanQuota = canvasScriptUsesPlanQuota();
  const sceneCount =
    data.sceneCount ??
    ULTRA_SCRIPT_SCENE_COUNT_DEFAULT;
  const scenePromptCount = data.scenePrompts?.length ?? 0;
  const beats = normalizeBeats(data.sceneBeats, sceneCount);

  const setSceneCount = (n: number) => {
    const clamped = Math.min(
      ULTRA_SCRIPT_SCENE_COUNT_MAX,
      Math.max(ULTRA_SCRIPT_SCENE_COUNT_MIN, n),
    );
    updateNodeData(id, {
      sceneCount: clamped,
      sceneBeats: normalizeBeats(data.sceneBeats, clamped),
    });
  };

  const patchBeat = (index: number, patch: Partial<ScriptSceneBeat>) => {
    const next = normalizeBeats(data.sceneBeats, sceneCount);
    next[index] = { ...next[index], ...patch };
    updateNodeData(id, { sceneBeats: next });
  };

  return (
    <ProNodeShell accent="rose" label={data.label} targetHandle sourceHandle widthClass="w-80">
      <textarea
        value={data.brief}
        onChange={(e) => updateNodeData(id, { brief: e.target.value })}
        placeholder={m.ultraCanvas.scriptBriefPlaceholder}
        className="h-20 w-full resize-none rounded-lg border border-slate-700/80 bg-slate-950/80 px-2 py-1.5 text-xs text-white placeholder:text-slate-600 focus:border-rose-500/40 focus:outline-none"
      />
      <div className="mt-2 flex items-center justify-between gap-2">
        <label className="text-[10px] text-slate-400">{sn.sceneCountLabel}</label>
        <select
          value={sceneCount}
          onChange={(e) => setSceneCount(Number(e.target.value))}
          className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-[10px] text-slate-200"
        >
          {Array.from(
            { length: ULTRA_SCRIPT_SCENE_COUNT_MAX - ULTRA_SCRIPT_SCENE_COUNT_MIN + 1 },
            (_, i) => ULTRA_SCRIPT_SCENE_COUNT_MIN + i,
          ).map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>
      <details className="mt-2 rounded-lg border border-rose-500/20 bg-rose-950/10 px-2 py-1.5">
        <summary className="cursor-pointer text-[10px] font-medium text-rose-200/90">
          {sn.beatsTitle}
        </summary>
        <div className="mt-2 max-h-52 space-y-2 overflow-y-auto">
          {beats.map((beat, i) => (
            <div key={i} className="space-y-1 rounded-md border border-slate-800/80 p-1.5">
              <p className="text-[10px] font-semibold text-rose-300/80">
                {m.ultraCanvas.scriptSceneLabel.replace("{n}", String(i + 1))}
              </p>
              <input
                value={beat.time ?? ""}
                onChange={(e) => patchBeat(i, { time: e.target.value })}
                placeholder={sn.beatTimePlaceholder}
                className="w-full rounded border border-slate-700/80 bg-slate-950/80 px-1.5 py-1 text-[10px] text-white placeholder:text-slate-600"
              />
              <input
                value={beat.emotion ?? ""}
                onChange={(e) => patchBeat(i, { emotion: e.target.value })}
                placeholder={sn.beatEmotionPlaceholder}
                className="w-full rounded border border-slate-700/80 bg-slate-950/80 px-1.5 py-1 text-[10px] text-white placeholder:text-slate-600"
              />
              <input
                value={beat.framing ?? ""}
                onChange={(e) => patchBeat(i, { framing: e.target.value })}
                placeholder={sn.beatFramingPlaceholder}
                className="w-full rounded border border-slate-700/80 bg-slate-950/80 px-1.5 py-1 text-[10px] text-white placeholder:text-slate-600"
              />
              <input
                value={beat.camera ?? ""}
                onChange={(e) => patchBeat(i, { camera: e.target.value })}
                placeholder={sn.beatCameraPlaceholder}
                className="w-full rounded border border-slate-700/80 bg-slate-950/80 px-1.5 py-1 text-[10px] text-white placeholder:text-slate-600"
              />
              <input
                value={beat.blocking ?? ""}
                onChange={(e) => patchBeat(i, { blocking: e.target.value })}
                placeholder={sn.beatBlockingPlaceholder}
                className="w-full rounded border border-slate-700/80 bg-slate-950/80 px-1.5 py-1 text-[10px] text-white placeholder:text-slate-600"
              />
              <input
                value={beat.line ?? ""}
                onChange={(e) => patchBeat(i, { line: e.target.value })}
                placeholder={sn.beatLinePlaceholder}
                className="w-full rounded border border-slate-700/80 bg-slate-950/80 px-1.5 py-1 text-[10px] text-white placeholder:text-slate-600"
              />
            </div>
          ))}
        </div>
      </details>
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
      {scenePromptCount > 0 ? (
        <>
          <button
            type="button"
            disabled={boardBusy}
            onClick={() => spawnSceneNodes(id)}
            className="mt-2 w-full rounded-lg border border-rose-500/40 bg-rose-950/30 px-3 py-1.5 text-xs font-medium text-rose-200 hover:bg-rose-950/50"
          >
            {m.ultraCanvas.spawnScenes.replace("{n}", String(scenePromptCount))}
          </button>
          <button
            type="button"
            disabled={boardBusy}
            onClick={() => spawnScenePipeline(id)}
            className="mt-1.5 w-full rounded-lg border border-violet-500/40 bg-violet-950/30 px-3 py-1.5 text-xs font-medium text-violet-200 hover:bg-violet-950/50"
          >
            {m.ultraCanvas.spawnPipeline.replace("{n}", String(scenePromptCount))}
          </button>
          <p className="mt-1.5 text-[10px] leading-relaxed text-slate-400">{sn.spawnCastHint}</p>
        </>
      ) : null}
      {data.scriptText ? (
        <>
          {isNodeStale(id) ? <StaleOutputBadge /> : null}
          <pre className="mt-2 max-h-32 overflow-y-auto whitespace-pre-wrap rounded-lg bg-slate-950/80 p-2 text-[10px] text-slate-300 ring-1 ring-slate-800">
            {data.scriptText}
          </pre>
        </>
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
