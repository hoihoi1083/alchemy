"use client";

import { useMemo, useState } from "react";
import type { NodeProps } from "@xyflow/react";
import { ProNodeShell } from "@/components/pro/ProNodeShell";
import { useProCanvasActions } from "@/components/pro/ProCanvasActions";
import { useLocale } from "@/components/LocaleProvider";
import type { StoryboardNodeData } from "@/lib/pro-canvas-types";
import {
  flattenStoryboardPanels,
  plannedVoWindowForScene,
} from "@/lib/pro-canvas-storyboard";
import {
  DEFAULT_ULTRA_VIDEO_PRO,
  estimateCanvasImageTokens,
  estimateCanvasVideoTokens,
} from "@/lib/ultra-pro-controls";

function sceneDescPreview(stillPrompt: string, max = 120): string {
  const t = stillPrompt.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

export function StoryboardNode({ id, data }: NodeProps & { data: StoryboardNodeData }) {
  const {
    syncStoryboardFromScript,
    spawnScenePipelineFromStoryboard,
    applyStoryboardStillsToScenes,
    runStoryboardPanelKeyframe,
    runStoryboardActKeyframes,
    runStoryboardPanelVideo,
    runStoryboardActVideos,
    updateNodeData,
    boardBusy,
    nodes,
  } = useProCanvasActions();
  const { m } = useLocale();
  const sb = m.ultraCanvas.storyboardNode;
  const [editKey, setEditKey] = useState<string | null>(null);
  const acts = data.acts?.length
    ? data.acts
    : data.panels?.length
      ? [{ id: "act-1", title: "Act 1", panels: data.panels }]
      : [];
  const flatCount = useMemo(() => flattenStoryboardPanels(data).length, [data]);
  const imageTok = estimateCanvasImageTokens();
  const videoTok = estimateCanvasVideoTokens({
    resolution: DEFAULT_ULTRA_VIDEO_PRO.resolution,
    duration: DEFAULT_ULTRA_VIDEO_PRO.duration,
    fast: DEFAULT_ULTRA_VIDEO_PRO.fast,
  });

  return (
    <ProNodeShell
      accent="violet"
      label={data.label}
      sourceHandle
      targetHandle
      widthClass="w-[22rem]"
    >
      <p className="mb-2 text-[10px] text-slate-400">{sb.hint}</p>
      <div className="flex gap-1.5">
        <button
          type="button"
          disabled={boardBusy}
          onClick={() => syncStoryboardFromScript(id)}
          className="flex-1 rounded-lg border border-violet-500/40 bg-violet-950/40 px-2 py-1.5 text-[10px] font-semibold text-violet-100 hover:bg-violet-950/70 disabled:opacity-40"
        >
          {sb.syncFromScript}
        </button>
        <button
          type="button"
          disabled={boardBusy || flatCount === 0}
          onClick={() => spawnScenePipelineFromStoryboard(id)}
          className="flex-1 rounded-lg bg-gradient-to-r from-fuchsia-600 to-violet-600 px-2 py-1.5 text-[10px] font-semibold text-white disabled:opacity-40"
        >
          {sb.spawnClips}
        </button>
      </div>
      <button
        type="button"
        disabled={boardBusy || flatCount === 0}
        onClick={() => applyStoryboardStillsToScenes()}
        className="mt-1.5 w-full rounded-lg border border-emerald-500/35 bg-emerald-950/25 px-2 py-1.5 text-[10px] font-semibold text-emerald-100 hover:bg-emerald-950/45 disabled:opacity-40"
      >
        {sb.applyStillsToScenes}
      </button>
      {acts.length === 0 ? (
        <p className="mt-2 rounded-lg border border-dashed border-slate-700 px-2 py-3 text-center text-[10px] text-slate-500">
          {sb.empty}
        </p>
      ) : (
        <div className="mt-2 max-h-[28rem] space-y-2.5 overflow-y-auto">
          {acts.map((act, actIdx) => {
            const stillCount = act.panels.filter((p) => p.imageUrl).length;
            const actImageTok = imageTok * act.panels.length;
            const actVideoTok = videoTok * Math.max(1, stillCount);
            return (
              <div
                key={act.id}
                className="rounded-lg border border-violet-500/25 bg-violet-950/25 px-1.5 py-1.5"
              >
                <div className="mb-1.5 flex flex-wrap items-center justify-between gap-1.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-violet-200">
                    {act.title || sb.actLabel.replace("{n}", String(actIdx + 1))}
                    <span className="ml-1 font-normal normal-case text-slate-500">
                      · {act.panels.length} {sb.panelsWord}
                    </span>
                  </p>
                  <div className="flex flex-wrap gap-1">
                    <button
                      type="button"
                      disabled={boardBusy || data.busy || act.panels.length === 0}
                      onClick={() => void runStoryboardActKeyframes(id, actIdx)}
                      className="shrink-0 rounded-md bg-gradient-to-r from-violet-600 to-fuchsia-600 px-2 py-1 text-[8px] font-semibold text-white disabled:opacity-40"
                    >
                      {data.busy ? sb.generatingAct : sb.generateAct}
                      <span className="ml-1 rounded bg-black/25 px-1 py-0.5 text-[7px]">
                        {m.ultraCanvas.tokenBadge.replace("{n}", String(actImageTok))}
                      </span>
                    </button>
                    <button
                      type="button"
                      disabled={boardBusy || data.busy || stillCount === 0}
                      onClick={() => void runStoryboardActVideos(id, actIdx)}
                      className="shrink-0 rounded-md border border-fuchsia-400/50 bg-fuchsia-950/50 px-2 py-1 text-[8px] font-semibold text-fuchsia-100 disabled:opacity-40"
                    >
                      {data.busy ? sb.generatingActVideos : sb.generateActVideos}
                      <span className="ml-1 rounded bg-black/25 px-1 py-0.5 text-[7px]">
                        {m.ultraCanvas.tokenBadge.replace("{n}", String(actVideoTok))}
                      </span>
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  {act.panels.map((panel, i) => {
                    const globalIndex =
                      acts.slice(0, actIdx).reduce((n, a) => n + a.panels.length, 0) + i;
                    const cellKey = `${act.id}-${i}`;
                    const vo = plannedVoWindowForScene(nodes, globalIndex);
                    const editing = editKey === cellKey;
                    const hasStill = Boolean(panel.imageUrl);
                    return (
                      <div
                        key={cellKey}
                        className="min-w-0 rounded-md border border-violet-500/20 bg-slate-950/60 p-1"
                      >
                        <div className="mb-0.5 flex items-center justify-between gap-0.5">
                          <span className="truncate text-[8px] font-semibold text-violet-200">
                            {sb.shotLabel.replace("{n}", String(i + 1))}
                          </span>
                          <span className="shrink-0 font-mono text-[7px] text-slate-500">
                            {vo.startSec.toFixed(0)}–{vo.endSec.toFixed(0)}s
                          </span>
                        </div>
                        <div className="relative h-[4.5rem] overflow-hidden rounded bg-slate-900 ring-1 ring-violet-500/15">
                          {panel.videoUrl ? (
                            <video
                              src={panel.videoUrl}
                              className="h-full w-full object-cover"
                              muted
                              playsInline
                              controls
                            />
                          ) : panel.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={panel.imageUrl}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center px-1 text-center text-[7px] text-slate-600">
                              {sb.statusPending}
                            </div>
                          )}
                        </div>
                        {(panel.speaker || panel.dialogue) && (
                          <p className="mt-0.5 line-clamp-2 text-[7px] leading-snug text-violet-200/80">
                            {panel.speaker ? `${panel.speaker}: ` : ""}
                            {panel.dialogue}
                          </p>
                        )}
                        {panel.stillPrompt?.trim() ? (
                          <p className="mt-0.5 line-clamp-3 text-[7px] leading-snug text-slate-500">
                            {sceneDescPreview(panel.stillPrompt)}
                          </p>
                        ) : null}
                        <button
                          type="button"
                          disabled={boardBusy || data.busy}
                          onClick={() => void runStoryboardPanelKeyframe(id, globalIndex)}
                          className="mt-1 w-full rounded border border-violet-500/30 px-1 py-0.5 text-[8px] font-semibold text-violet-100 disabled:opacity-40"
                        >
                          {panel.imageUrl ? sb.regenerateKeyframe : sb.generateKeyframe}
                          <span className="ml-0.5 text-[7px] opacity-70">
                            {m.ultraCanvas.tokenBadge.replace("{n}", String(imageTok))}
                          </span>
                        </button>
                        <button
                          type="button"
                          disabled={boardBusy || data.busy || !hasStill}
                          onClick={() => void runStoryboardPanelVideo(id, globalIndex)}
                          className="mt-0.5 w-full rounded border border-fuchsia-500/40 bg-fuchsia-950/30 px-1 py-0.5 text-[8px] font-semibold text-fuchsia-100 disabled:opacity-40"
                        >
                          {panel.videoUrl ? sb.regenerateVideo : sb.generateVideo}
                          <span className="ml-0.5 text-[7px] opacity-70">
                            {m.ultraCanvas.tokenBadge.replace("{n}", String(videoTok))}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditKey(editing ? null : cellKey)}
                          className="mt-0.5 w-full text-[7px] text-slate-500 hover:text-slate-300"
                        >
                          {editing ? sb.hidePrompt : sb.editPrompt}
                        </button>
                        {editing ? (
                          <textarea
                            value={panel.stillPrompt}
                            onChange={(e) => {
                              const nextActs = acts.map((a, ai) => {
                                if (ai !== actIdx) return a;
                                return {
                                  ...a,
                                  panels: a.panels.map((p, pi) =>
                                    pi === i ? { ...p, stillPrompt: e.target.value } : p,
                                  ),
                                };
                              });
                              updateNodeData(id, {
                                acts: nextActs,
                                panels: nextActs.flatMap((a) => a.panels),
                              });
                            }}
                            className="mt-0.5 h-14 w-full resize-none rounded border border-slate-700/80 bg-slate-950/80 px-1 py-0.5 text-[8px] text-slate-200"
                            placeholder={sb.stillPlaceholder}
                          />
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {data.error ? <p className="mt-2 text-xs text-red-400">{data.error}</p> : null}
    </ProNodeShell>
  );
}
