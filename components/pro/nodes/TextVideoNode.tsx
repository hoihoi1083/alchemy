"use client";

import { useMemo } from "react";
import type { NodeProps } from "@xyflow/react";
import { DirectorPromptChips } from "@/components/pro/DirectorPromptChips";
import { ExportToLibraryButton } from "@/components/pro/ExportToLibraryButton";
import { ProNodeShell } from "@/components/pro/ProNodeShell";
import { ProVideoControlFields } from "@/components/pro/ProVideoControlFields";
import { StaleOutputBadge } from "@/components/pro/StaleOutputBadge";
import { useProCanvasActions } from "@/components/pro/ProCanvasActions";
import { MentionInput } from "@/components/pro/MentionInput";
import { useLocale } from "@/components/LocaleProvider";
import type { TextVideoNodeData } from "@/lib/pro-canvas-types";
import {
  estimateCanvasVideoTokens,
  videoProFromNodeData,
} from "@/lib/ultra-pro-controls";

const STRUCTURE_SNIPPETS: Record<string, string> = {
  subject: "Subject: [product / person]. ",
  action: "Action: [what happens]. ",
  setting: "Setting: [place / lighting]. ",
  camera: "Camera: [move / framing]. ",
};

export function TextVideoNode({ id, data }: NodeProps & { data: TextVideoNodeData }) {
  const {
    runTextVideoNode,
    updateNodeData,
    nodes,
    boardBusy,
    isNodeStale,
    uxVariant,
    focusNodeByKind,
    connectVideoToSplice,
  } = useProCanvasActions();
  const { m } = useLocale();
  const u2 = m.ultraCanvas2.textVideo;
  const isV2 = uxVariant === "v2";
  const pro = videoProFromNodeData(data);
  const tokenCost = useMemo(
    () =>
      estimateCanvasVideoTokens({
        resolution: pro.resolution,
        duration: pro.duration,
        fast: pro.fast,
        videoEngine: pro.videoEngine,
      }),
    [pro.duration, pro.fast, pro.resolution, pro.videoEngine],
  );

  function insertStructure(key: keyof typeof STRUCTURE_SNIPPETS) {
    const snip = STRUCTURE_SNIPPETS[key];
    if (!snip) return;
    const next = data.prompt?.includes(snip.trim())
      ? data.prompt
      : `${data.prompt?.trim() ? `${data.prompt.trim()} ` : ""}${snip}`;
    updateNodeData(id, { prompt: next });
  }

  return (
    <ProNodeShell accent="violet" label={data.label} nodeKind="textVideo">
      {isV2 ? (
        <>
          <p className="mb-1 text-[9px] font-medium text-violet-200/90">{u2.purpose}</p>
          <p className="mb-1.5 rounded-md border border-cyan-500/25 bg-cyan-950/30 px-2 py-1 text-[9px] leading-snug text-cyan-100/90">
            {u2.useWhen}
          </p>
          <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-wide text-cyan-300/80">
            {u2.noImageNeeded}
          </p>
          <div className="mb-1.5 flex flex-wrap gap-1">
            {(
              [
                ["subject", u2.subject],
                ["action", u2.action],
                ["setting", u2.setting],
                ["camera", u2.camera],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                disabled={boardBusy}
                onClick={() => insertStructure(key)}
                className="nodrag nopan rounded-full border border-violet-500/40 px-2 py-0.5 text-[9px] text-violet-100 hover:bg-violet-950/50 disabled:opacity-40"
              >
                {label}
              </button>
            ))}
          </div>
        </>
      ) : (
        <p className="mb-1.5 rounded-md border border-violet-500/25 bg-violet-950/30 px-2 py-1 text-[9px] leading-snug text-violet-100/90">
          {m.ultraCanvas.textVideoPromptHint}
        </p>
      )}
      <MentionInput
        nodeId={id}
        nodes={nodes}
        value={data.prompt}
        onChange={(prompt) => updateNodeData(id, { prompt })}
        placeholder={m.ultraCanvas.textVideoPromptPlaceholder}
        rows={4}
        className="h-20 w-full resize-none rounded-lg border border-slate-700/80 bg-slate-950/80 px-2 py-1.5 text-xs text-white placeholder:text-slate-600 focus:border-violet-500/40 focus:outline-none"
      />
      {isV2 ? (
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <p className="text-[9px] text-slate-500">{u2.tip}</p>
          <button
            type="button"
            disabled={boardBusy}
            onClick={() => updateNodeData(id, { prompt: u2.example })}
            className="nodrag nopan text-[9px] font-medium text-cyan-300 underline"
          >
            {u2.useExample}
          </button>
        </div>
      ) : null}
      <DirectorPromptChips
        labels={m.ultraCanvas.directorChips}
        hint={m.ultraCanvas.directorChipsHint}
        prompt={data.prompt}
        disabled={boardBusy}
        onInsert={(prompt) => updateNodeData(id, { prompt })}
      />
      {data.sceneIndex != null ? (
        <p className="mt-1 text-[10px] text-violet-300/80">
          {m.ultraCanvas.scriptSceneLabel.replace("{n}", String(data.sceneIndex + 1))}
        </p>
      ) : null}
      <ProVideoControlFields
        value={pro}
        onChange={(patch) => updateNodeData(id, patch)}
        showCamera={false}
      />
      <button
        type="button"
        disabled={data.busy || boardBusy}
        onClick={() => runTextVideoNode(id)}
        className="nodrag nopan mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 px-3 py-1.5 text-xs font-semibold text-white shadow-[0_0_16px_rgba(139,92,246,0.25)] disabled:opacity-40"
      >
        {data.busy
          ? m.ultraCanvas.running
          : isV2
            ? u2.generateClip
            : m.ultraCanvas.runTextVideo}
        {!data.busy ? (
          <span className="rounded-full bg-black/25 px-1.5 py-0.5 text-[10px] font-medium">
            {m.ultraCanvas.tokenBadge.replace("{n}", String(tokenCost))}
          </span>
        ) : null}
      </button>
      {data.videoUrl ? (
        <>
          {isNodeStale(id) ? <StaleOutputBadge /> : null}
          {isV2 ? (
            <p className="mt-2 text-[9px] font-medium text-slate-400">{u2.outputOne}</p>
          ) : null}
          <video
            src={data.videoUrl}
            controls
            className="nodrag nopan nowheel mt-2 max-h-36 w-full rounded-lg ring-1 ring-slate-700/80"
          />
          {isV2 ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              <a
                href={data.videoUrl}
                target="_blank"
                rel="noreferrer"
                className="nodrag nopan rounded-lg border border-slate-600 px-2.5 py-1 text-[10px] text-slate-200 hover:bg-slate-800"
              >
                {u2.preview}
              </a>
              <button
                type="button"
                className="nodrag nopan rounded-lg border border-violet-500/40 px-2.5 py-1 text-[10px] text-violet-100 hover:bg-violet-950/40"
                onClick={() => {
                  focusNodeByKind?.("voice");
                  focusNodeByKind?.("audio");
                }}
              >
                {u2.addVoiceMusic}
              </button>
              <button
                type="button"
                className="nodrag nopan rounded-lg border border-cyan-500/40 px-2.5 py-1 text-[10px] text-cyan-100 hover:bg-cyan-950/40"
                onClick={() => connectVideoToSplice?.(id)}
              >
                {u2.addToFinal}
              </button>
            </div>
          ) : null}
          <ExportToLibraryButton
            url={data.videoUrl}
            kind="video"
            onExported={(libraryUrl) => updateNodeData(id, { videoUrl: libraryUrl })}
          />
          <a
            href={`/captions-2?video=${encodeURIComponent(data.videoUrl)}`}
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
