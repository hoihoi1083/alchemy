"use client";

import { useMemo } from "react";
import type { NodeProps } from "@xyflow/react";
import { ExportToLibraryButton } from "@/components/pro/ExportToLibraryButton";
import { ProNodeShell } from "@/components/pro/ProNodeShell";
import { useProCanvasActions } from "@/components/pro/ProCanvasActions";
import { useLocale } from "@/components/LocaleProvider";
import { estimateCanvasSpliceTokens } from "@/lib/ultra-pro-controls";
import type { SpliceNodeData } from "@/lib/pro-canvas-types";

export function SpliceNode({ id, data }: NodeProps & { data: SpliceNodeData }) {
  const { runSpliceNode, updateNodeData } = useProCanvasActions();
  const { m } = useLocale();
  const tokenCost = useMemo(() => estimateCanvasSpliceTokens({ videoCount: 2, hasMusic: true }), []);

  return (
    <ProNodeShell accent="cyan" label={data.label} sourceHandle targetHandle>
      <p className="text-[10px] text-slate-400">{m.ultraCanvas.spliceHint}</p>
      <button
        type="button"
        disabled={data.busy}
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
          <video src={data.videoUrl} controls className="mt-2 max-h-36 w-full rounded-lg ring-1 ring-slate-700/80" />
          <ExportToLibraryButton
            url={data.videoUrl}
            kind="video"
            onExported={(libraryUrl) => updateNodeData(id, { videoUrl: libraryUrl })}
          />
          <a
            href={`/captions?video=${encodeURIComponent(data.videoUrl)}`}
            className="mt-2 block w-full rounded-lg border border-cyan-500/30 bg-cyan-950/30 px-3 py-1.5 text-center text-xs font-medium text-cyan-200 hover:bg-cyan-950/50"
          >
            {m.ultraCanvas.openCaptions}
          </a>
        </>
      ) : null}
      {data.error ? <p className="mt-2 text-xs text-red-400">{data.error}</p> : null}
    </ProNodeShell>
  );
}
