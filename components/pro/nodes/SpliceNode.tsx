"use client";

import { useEffect, useMemo } from "react";
import type { NodeProps } from "@xyflow/react";
import { ExportToLibraryButton } from "@/components/pro/ExportToLibraryButton";
import { ProNodeShell } from "@/components/pro/ProNodeShell";
import { StaleOutputBadge } from "@/components/pro/StaleOutputBadge";
import { useProCanvasActions } from "@/components/pro/ProCanvasActions";
import { useLocale } from "@/components/LocaleProvider";
import type { ProCanvasNodeData, SpliceNodeData } from "@/lib/pro-canvas-types";
import {
  resolveSpliceClipOrder,
  upstreamVideoNodesSorted,
  videoUrlFromNode,
} from "@/lib/pro-canvas-graph";
import { isHttpOrLibraryMediaUrl } from "@/lib/storage/library-asset-url";

export function SpliceNode({ id, data }: NodeProps & { data: SpliceNodeData }) {
  const { runSpliceNode, updateNodeData, boardBusy, estimateSpliceTokenCost, isNodeStale, nodes, edges } =
    useProCanvasActions();
  const { m } = useLocale();
  const sp = m.ultraCanvas.spliceOrder;
  const tokenCost = useMemo(() => estimateSpliceTokenCost(id), [estimateSpliceTokenCost, id]);

  const upstreamVideos = useMemo(
    () => upstreamVideoNodesSorted(id, nodes, edges),
    [edges, id, nodes],
  );

  const clipOrder = useMemo(
    () => resolveSpliceClipOrder(data.clipOrder, upstreamVideos),
    [data.clipOrder, upstreamVideos],
  );

  const upstreamKey = upstreamVideos.map((n) => n.id).join("|");

  // Keep clipOrder in sync when wires change (preserve user order for known ids).
  useEffect(() => {
    const next = resolveSpliceClipOrder(data.clipOrder, upstreamVideos);
    const prev = data.clipOrder ?? [];
    if (next.length === prev.length && next.every((v, i) => v === prev[i])) return;
    updateNodeData(id, { clipOrder: next });
  }, [data.clipOrder, id, updateNodeData, upstreamKey, upstreamVideos]);

  const moveClip = (index: number, dir: -1 | 1) => {
    const next = [...clipOrder];
    const j = index + dir;
    if (j < 0 || j >= next.length) return;
    const tmp = next[index]!;
    next[index] = next[j]!;
    next[j] = tmp;
    updateNodeData(id, { clipOrder: next });
  };

  return (
    <ProNodeShell accent="cyan" label={data.label} sourceHandle targetHandle>
      <p className="text-[10px] text-slate-400">{m.ultraCanvas.spliceHint}</p>

      <div
        className="nodrag nopan nowheel mt-2 rounded-lg border border-cyan-500/20 bg-slate-950/50 p-2"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-cyan-200/90">
          {sp.title}
        </p>
        {clipOrder.length === 0 ? (
          <p className="text-[9px] leading-snug text-slate-500">{sp.empty}</p>
        ) : (
          <ul className="space-y-1">
            {clipOrder.map((nodeId, index) => {
              const node = upstreamVideos.find((n) => n.id === nodeId);
              const d = node?.data as ProCanvasNodeData | undefined;
              const label =
                (d && "alias" in d && d.alias?.trim()) ||
                d?.label ||
                nodeId.slice(0, 8);
              const url = node ? videoUrlFromNode(node) : undefined;
              const ready = isHttpOrLibraryMediaUrl(url);
              return (
                <li
                  key={nodeId}
                  className="flex items-center gap-1.5 rounded-md border border-slate-700/80 bg-slate-900/80 px-1.5 py-1"
                >
                  <span className="w-4 shrink-0 text-center text-[10px] font-bold text-cyan-300/90">
                    {index + 1}
                  </span>
                  {ready && url ? (
                    // eslint-disable-next-line jsx-a11y/media-has-caption
                    <video
                      src={url}
                      muted
                      playsInline
                      className="h-8 w-8 shrink-0 rounded object-cover ring-1 ring-slate-600"
                    />
                  ) : (
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-slate-800 text-[8px] text-amber-200/90 ring-1 ring-slate-600">
                      …
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[10px] font-medium text-slate-100">{label}</p>
                    <p className="text-[8px] text-slate-500">
                      {ready ? sp.ready : sp.waiting}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col gap-0.5">
                    <button
                      type="button"
                      disabled={boardBusy || index === 0}
                      aria-label={sp.moveUp}
                      title={sp.moveUp}
                      onClick={() => moveClip(index, -1)}
                      className="rounded border border-slate-600 px-1 text-[9px] text-slate-200 hover:border-cyan-400/50 disabled:opacity-30"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      disabled={boardBusy || index === clipOrder.length - 1}
                      aria-label={sp.moveDown}
                      title={sp.moveDown}
                      onClick={() => moveClip(index, 1)}
                      className="rounded border border-slate-600 px-1 text-[9px] text-slate-200 hover:border-cyan-400/50 disabled:opacity-30"
                    >
                      ↓
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <p className="mt-1.5 text-[8px] leading-snug text-slate-500">{sp.hint}</p>
      </div>

      <button
        type="button"
        disabled={data.busy || boardBusy || clipOrder.length < 1}
        onClick={() => runSpliceNode(id)}
        className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-cyan-600 to-teal-600 px-3 py-1.5 text-xs font-semibold text-white shadow-[0_0_16px_rgba(34,211,238,0.2)] disabled:opacity-40"
      >
        {data.busy ? m.ultraCanvas.running : m.ultraCanvas.runSplice}
        {!data.busy && tokenCost > 0 ? (
          <span className="rounded-full bg-black/25 px-1.5 py-0.5 text-[10px] font-medium">
            ~{m.ultraCanvas.tokenBadge.replace("{n}", String(tokenCost))}
          </span>
        ) : null}
      </button>
      {data.videoUrl ? (
        <>
          {isNodeStale(id) ? <StaleOutputBadge /> : null}
          <video
            src={data.videoUrl}
            controls
            className="nodrag nopan nowheel mt-2 max-h-36 w-full rounded-lg ring-1 ring-slate-700/80"
          />
          <ExportToLibraryButton
            url={data.videoUrl}
            kind="video"
            onExported={(libraryUrl) => updateNodeData(id, { videoUrl: libraryUrl })}
          />
          <a
            href={`/captions?video=${encodeURIComponent(data.videoUrl)}`}
            className="nodrag nopan mt-2 block w-full rounded-lg border border-cyan-500/30 bg-cyan-950/30 px-3 py-1.5 text-center text-xs font-medium text-cyan-200 hover:bg-cyan-950/50"
          >
            {m.ultraCanvas.openCaptions}
          </a>
        </>
      ) : null}
      {data.error ? <p className="mt-2 text-xs text-red-400">{data.error}</p> : null}
    </ProNodeShell>
  );
}
