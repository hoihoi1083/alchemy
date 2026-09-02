"use client";

import { useMemo } from "react";
import type { NodeProps } from "@xyflow/react";
import { ExportToLibraryButton } from "@/components/pro/ExportToLibraryButton";
import { ProNodeShell } from "@/components/pro/ProNodeShell";
import { ProVideoControlFields } from "@/components/pro/ProVideoControlFields";
import { useProCanvasActions } from "@/components/pro/ProCanvasActions";
import { MentionInput } from "@/components/pro/MentionInput";
import { useLocale } from "@/components/LocaleProvider";
import type { VideoNodeData } from "@/lib/pro-canvas-types";
import {
  estimateCanvasVideoTokens,
  videoProFromNodeData,
} from "@/lib/ultra-pro-controls";

export function VideoNode({ id, data }: NodeProps & { data: VideoNodeData }) {
  const { runVideoNode, updateNodeData, nodes, boardBusy } = useProCanvasActions();
  const { m } = useLocale();
  const pro = videoProFromNodeData(data);
  const tokenCost = useMemo(
    () =>
      estimateCanvasVideoTokens({
        resolution: pro.resolution,
        duration: pro.duration,
        fast: pro.fast,
      }),
    [pro.duration, pro.fast, pro.resolution],
  );

  return (
    <ProNodeShell accent="violet" label={data.label}>
      <MentionInput
        nodeId={id}
        nodes={nodes}
        value={data.prompt}
        onChange={(prompt) => updateNodeData(id, { prompt })}
        placeholder={m.ultraCanvas.videoPromptPlaceholder}
        rows={3}
        className="h-16 w-full resize-none rounded-lg border border-slate-700/80 bg-slate-950/80 px-2 py-1.5 text-xs text-white placeholder:text-slate-600 focus:border-violet-500/40 focus:outline-none"
      />
      {data.sceneIndex != null ? (
        <p className="mt-1 text-[10px] text-violet-300/80">
          {m.ultraCanvas.scriptSceneLabel.replace("{n}", String(data.sceneIndex + 1))}
        </p>
      ) : null}
      <ProVideoControlFields
        value={pro}
        onChange={(patch) => updateNodeData(id, patch)}
        showCamera
      />
      <button
        type="button"
        disabled={data.busy || boardBusy}
        onClick={() => runVideoNode(id)}
        className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 px-3 py-1.5 text-xs font-semibold text-white shadow-[0_0_16px_rgba(139,92,246,0.25)] disabled:opacity-40"
      >
        {data.busy ? m.ultraCanvas.running : m.ultraCanvas.runVideo}
        {!data.busy ? (
          <span className="rounded-full bg-black/25 px-1.5 py-0.5 text-[10px] font-medium">
            {m.ultraCanvas.tokenBadge.replace("{n}", String(tokenCost))}
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
