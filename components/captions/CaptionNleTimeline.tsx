"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CaptionLine } from "@/lib/ad-pack-types";
import {
  clipDurationSec,
  packClipsMagnetically,
  type TimelineClip,
} from "@/lib/captions/timeline-project";
import { ClipFilmstrip } from "@/components/captions/ClipFilmstrip";

export type CaptionNleLabels = {
  title: string;
  hint: string;
  videoTrack: string;
  captionTrack: string;
  audioTrack: string;
  split: string;
  deleteClip: string;
  undo: string;
  zoomIn: string;
  zoomOut: string;
  emptyVideo: string;
  bgmLane: string;
  voLane: string;
  selected: string;
  shortcuts?: string;
};

type DragKind =
  | { kind: "playhead" }
  | { kind: "clip-in"; clipId: string }
  | { kind: "clip-out"; clipId: string }
  | { kind: "clip-move"; clipId: string; fromIndex: number }
  | { kind: "caption-move"; index: number; origStart: number; origEnd: number }
  | { kind: "caption-start"; index: number; origEnd: number }
  | { kind: "caption-end"; index: number; origStart: number }
  | { kind: "bgm-start" };

export function CaptionNleTimeline(props: {
  clips: TimelineClip[];
  captions: CaptionLine[];
  selectedClipId: string | null;
  selectedCaptionIndex: number;
  playheadSec: number;
  bgmStartSec: number;
  bgmLabel: string;
  voUrl?: string | null;
  voStartSec: number;
  pxPerSec: number;
  canUndo: boolean;
  labels: CaptionNleLabels;
  onPlayhead: (sec: number) => void;
  onSelectClip: (id: string | null) => void;
  onSelectCaption: (index: number) => void;
  onHistoryCheckpoint?: () => void;
  onTrimClip: (clipId: string, edge: "in" | "out", sourceSec: number) => void;
  onReorderClip: (fromIndex: number, toIndex: number) => void;
  onSplit: () => void;
  onDeleteSelected: () => void;
  onUndo: () => void;
  onUpdateCaption: (index: number, patch: Partial<CaptionLine>) => void;
  onBgmStart: (sec: number) => void;
  onPxPerSec: (n: number) => void;
  /** Selecting the BGM lane should open Audio props. */
  onSelectAudio?: () => void;
}) {
  const {
    clips,
    captions,
    selectedClipId,
    selectedCaptionIndex,
    playheadSec,
    bgmStartSec,
    bgmLabel,
    voUrl,
    voStartSec,
    pxPerSec,
    canUndo,
    labels: L,
    onPlayhead,
    onSelectClip,
    onSelectCaption,
    onHistoryCheckpoint,
    onTrimClip,
    onReorderClip,
    onSplit,
    onDeleteSelected,
    onUndo,
    onUpdateCaption,
    onBgmStart,
    onPxPerSec,
    onSelectAudio,
  } = props;

  const packed = useMemo(() => packClipsMagnetically(clips), [clips]);
  const durationSec = useMemo(
    () => Math.max(1, packed.reduce((m, c) => Math.max(m, c.timelineEndSec), 0)),
    [packed],
  );
  const trackWidth = Math.max(320, durationSec * pxPerSec + 48);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragKind | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  const secFromClientX = useCallback(
    (clientX: number) => {
      const el = scrollerRef.current;
      if (!el) return 0;
      const box = el.getBoundingClientRect();
      const x = clientX - box.left + el.scrollLeft - 8;
      return Math.max(0, Math.min(durationSec, x / pxPerSec));
    },
    [durationSec, pxPerSec],
  );

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      const sec = secFromClientX(e.clientX);
      if (drag.kind === "playhead") {
        onPlayhead(sec);
      } else if (drag.kind === "clip-in" || drag.kind === "clip-out") {
        const packedHit = packed.find((c) => c.id === drag.clipId);
        if (!packedHit) return;
        const local = sec - packedHit.timelineStartSec;
        const sourceSec =
          drag.kind === "clip-in"
            ? packedHit.sourceInSec + local
            : packedHit.sourceInSec + local;
        // Edge drag in timeline space maps to source edges:
        if (drag.kind === "clip-in") {
          const newIn =
            packedHit.sourceOutSec -
            (packedHit.timelineEndSec - sec);
          onTrimClip(drag.clipId, "in", newIn);
        } else {
          const newOut =
            packedHit.sourceInSec + (sec - packedHit.timelineStartSec);
          onTrimClip(drag.clipId, "out", newOut);
        }
        void sourceSec;
      } else if (drag.kind === "clip-move") {
        const idx = packed.findIndex((c) => c.id === drag.clipId);
        if (idx < 0) return;
        let target = 0;
        for (let i = 0; i < packed.length; i++) {
          const mid =
            (packed[i]!.timelineStartSec + packed[i]!.timelineEndSec) / 2;
          if (sec >= mid) target = i;
        }
        setDropIndex(target);
      } else if (drag.kind === "caption-move") {
        const len = drag.origEnd - drag.origStart;
        const start = Math.max(0, Math.min(durationSec - len, sec - len / 2));
        onUpdateCaption(drag.index, {
          startSec: start,
          endSec: start + len,
        });
      } else if (drag.kind === "caption-start") {
        onUpdateCaption(drag.index, {
          startSec: Math.max(0, Math.min(sec, drag.origEnd - 0.1)),
        });
      } else if (drag.kind === "caption-end") {
        onUpdateCaption(drag.index, {
          endSec: Math.min(durationSec, Math.max(sec, drag.origStart + 0.1)),
        });
      } else if (drag.kind === "bgm-start") {
        onBgmStart(Math.max(0, Math.min(durationSec - 0.2, sec)));
      }
    };
    const onUp = () => {
      const drag = dragRef.current;
      if (drag?.kind === "clip-move" && dropIndex != null) {
        onReorderClip(drag.fromIndex, dropIndex);
      }
      dragRef.current = null;
      setDropIndex(null);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [
    durationSec,
    dropIndex,
    onBgmStart,
    onPlayhead,
    onReorderClip,
    onTrimClip,
    onUpdateCaption,
    packed,
    secFromClientX,
  ]);

  const startDrag = (kind: DragKind, e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (
      kind.kind === "clip-in" ||
      kind.kind === "clip-out" ||
      kind.kind === "clip-move" ||
      kind.kind === "caption-move" ||
      kind.kind === "caption-start" ||
      kind.kind === "caption-end" ||
      kind.kind === "bgm-start"
    ) {
      onHistoryCheckpoint?.();
    }
    dragRef.current = kind;
  };

  const selected = selectedClipId
    ? packed.find((c) => c.id === selectedClipId)
    : null;

  return (
    <div className="flex h-full min-h-0 flex-col rounded-none border-0 bg-transparent p-0">
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 pb-1">
        <div>
          <p className="text-xs font-semibold text-white">{L.title}</p>
          <p className="text-[10px] text-slate-500">{L.hint}</p>
          {L.shortcuts ? (
            <p className="text-[10px] text-slate-600">{L.shortcuts}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            disabled={!selectedClipId && selectedCaptionIndex < 0}
            onClick={onSplit}
            className="rounded-lg border border-cyan-400/40 bg-cyan-500/15 px-2.5 py-1.5 text-[11px] font-semibold text-cyan-100 disabled:opacity-40"
            title={L.split}
          >
            ✂ {L.split}
          </button>
          <button
            type="button"
            disabled={!selectedClipId}
            onClick={onDeleteSelected}
            className="rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-[11px] text-slate-200 disabled:opacity-40"
          >
            {L.deleteClip}
          </button>
          <button
            type="button"
            disabled={!canUndo}
            onClick={onUndo}
            className="rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-[11px] text-slate-200 disabled:opacity-40"
          >
            {L.undo}
          </button>
          <button
            type="button"
            onClick={() => onPxPerSec(Math.max(24, pxPerSec / 1.25))}
            className="rounded-lg border border-white/15 bg-white/5 px-2 py-1.5 text-[11px] text-slate-200"
          >
            {L.zoomOut}
          </button>
          <button
            type="button"
            onClick={() => onPxPerSec(Math.min(160, pxPerSec * 1.25))}
            className="rounded-lg border border-white/15 bg-white/5 px-2 py-1.5 text-[11px] text-slate-200"
          >
            {L.zoomIn}
          </button>
        </div>
      </div>

      {selected ? (
        <p className="mt-2 text-[10px] text-slate-500">
          {L.selected}: {selected.label || selected.id.slice(0, 8)} ·{" "}
          {clipDurationSec(selected).toFixed(1)}s · In{" "}
          {selected.sourceInSec.toFixed(1)}s → Out{" "}
          {selected.sourceOutSec.toFixed(1)}s
        </p>
      ) : null}

      <div
        ref={scrollerRef}
        className="relative mt-3 overflow-x-auto overflow-y-hidden rounded-xl border border-white/5 bg-black/40"
        onPointerDown={(e) => {
          if ((e.target as HTMLElement).closest("[data-nle-handle]")) return;
          onPlayhead(secFromClientX(e.clientX));
          startDrag({ kind: "playhead" }, e);
        }}
      >
        <div className="relative min-h-[168px] p-2" style={{ width: trackWidth }}>
          {/* Ruler */}
          <div className="relative mb-2 h-5 border-b border-white/10">
            {Array.from({ length: Math.ceil(durationSec) + 1 }, (_, i) => (
              <span
                key={`tick-${i}`}
                className="absolute top-0 text-[9px] text-slate-500"
                style={{ left: i * pxPerSec }}
              >
                {i}s
              </span>
            ))}
          </div>

          {/* Video track */}
          <p className="mb-1 text-[10px] uppercase tracking-wide text-slate-500">
            {L.videoTrack}
          </p>
          <div className="relative mb-3 h-14 rounded-lg bg-slate-900/80">
            {packed.length === 0 ? (
              <p className="absolute inset-0 flex items-center justify-center text-[11px] text-slate-500">
                {L.emptyVideo}
              </p>
            ) : null}
            {packed.map((clip, index) => {
              const left = clip.timelineStartSec * pxPerSec;
              const width = Math.max(8, clipDurationSec(clip) * pxPerSec);
              const selectedCls =
                clip.id === selectedClipId
                  ? "border-cyan-300 ring-1 ring-cyan-300/50"
                  : "border-cyan-700/50";
              const dropCls =
                dropIndex === index ? "outline outline-1 outline-amber-300" : "";
              return (
                <div
                  key={clip.id}
                  role="button"
                  tabIndex={0}
                  className={`absolute top-1 bottom-1 overflow-hidden rounded-md border bg-cyan-950/80 text-left ${selectedCls} ${dropCls}`}
                  style={{ left, width }}
                  onPointerDown={(e) => {
                    onSelectClip(clip.id);
                    startDrag(
                      {
                        kind: "clip-move",
                        clipId: clip.id,
                        fromIndex: index,
                      },
                      e,
                    );
                  }}
                >
                  <ClipFilmstrip
                    url={clip.url}
                    sourceInSec={clip.sourceInSec}
                    sourceOutSec={clip.sourceOutSec}
                    widthPx={width}
                  />
                  <div className="relative z-[1] bg-gradient-to-t from-black/70 via-black/20 to-transparent">
                    <p className="truncate px-1.5 pt-1 text-[10px] font-medium text-cyan-50 drop-shadow">
                      {clip.label || `Clip ${index + 1}`}
                    </p>
                    <p className="px-1.5 pb-0.5 text-[9px] text-cyan-100/80 drop-shadow">
                      {clipDurationSec(clip).toFixed(1)}s
                    </p>
                  </div>
                  <button
                    type="button"
                    data-nle-handle
                    aria-label="Trim in"
                    className="absolute inset-y-0 left-0 z-[2] w-2 cursor-ew-resize bg-cyan-300/90"
                    onPointerDown={(e) =>
                      startDrag({ kind: "clip-in", clipId: clip.id }, e)
                    }
                  />
                  <button
                    type="button"
                    data-nle-handle
                    aria-label="Trim out"
                    className="absolute inset-y-0 right-0 z-[2] w-2 cursor-ew-resize bg-cyan-300/90"
                    onPointerDown={(e) =>
                      startDrag({ kind: "clip-out", clipId: clip.id }, e)
                    }
                  />
                </div>
              );
            })}
          </div>

          {/* Caption track */}
          <p className="mb-1 text-[10px] uppercase tracking-wide text-slate-500">
            {L.captionTrack}
          </p>
          <div className="relative mb-3 h-10 rounded-lg bg-slate-900/80">
            {captions.map((line, index) => {
              const left = line.startSec * pxPerSec;
              const width = Math.max(
                8,
                (line.endSec - line.startSec) * pxPerSec,
              );
              const active =
                index === selectedCaptionIndex
                  ? "border-violet-300 bg-violet-500/35"
                  : "border-violet-700/40 bg-violet-900/40";
              return (
                <div
                  key={`cap-${index}-${line.startSec}`}
                  className={`absolute top-1 bottom-1 overflow-hidden rounded border ${active}`}
                  style={{ left, width }}
                  onPointerDown={(e) => {
                    onSelectCaption(index);
                    startDrag(
                      {
                        kind: "caption-move",
                        index,
                        origStart: line.startSec,
                        origEnd: line.endSec,
                      },
                      e,
                    );
                  }}
                >
                  <p className="truncate px-1.5 pt-1 text-[10px] text-violet-50">
                    {line.text || "…"}
                  </p>
                  <button
                    type="button"
                    data-nle-handle
                    className="absolute inset-y-0 left-0 w-1.5 cursor-ew-resize bg-violet-200/80"
                    onPointerDown={(e) =>
                      startDrag(
                        {
                          kind: "caption-start",
                          index,
                          origEnd: line.endSec,
                        },
                        e,
                      )
                    }
                  />
                  <button
                    type="button"
                    data-nle-handle
                    className="absolute inset-y-0 right-0 w-1.5 cursor-ew-resize bg-violet-200/80"
                    onPointerDown={(e) =>
                      startDrag(
                        {
                          kind: "caption-end",
                          index,
                          origStart: line.startSec,
                        },
                        e,
                      )
                    }
                  />
                </div>
              );
            })}
          </div>

          {/* Audio track */}
          <p className="mb-1 text-[10px] uppercase tracking-wide text-slate-500">
            {L.audioTrack}
          </p>
          <div className="relative h-8 rounded-lg bg-slate-900/80">
            <div
              className="absolute top-1 bottom-1 rounded border border-emerald-600/50 bg-emerald-900/40"
              style={{
                left: bgmStartSec * pxPerSec,
                width: Math.max(24, (durationSec - bgmStartSec) * pxPerSec),
              }}
              onPointerDown={(e) => {
                onSelectAudio?.();
                startDrag({ kind: "bgm-start" }, e);
              }}
            >
              <p className="truncate px-1.5 pt-0.5 text-[9px] text-emerald-100">
                {L.bgmLane}: {bgmLabel}
              </p>
            </div>
            {voUrl ? (
              <div
                className="absolute top-1 bottom-1 rounded border border-amber-500/40 bg-amber-900/35"
                style={{
                  left: voStartSec * pxPerSec,
                  width: Math.max(20, durationSec * 0.35 * pxPerSec),
                }}
              >
                <p className="truncate px-1.5 pt-0.5 text-[9px] text-amber-100">
                  {L.voLane}
                </p>
              </div>
            ) : null}
          </div>

          {/* Playhead */}
          <div
            data-nle-handle
            className="pointer-events-none absolute top-0 bottom-2 z-10 w-0.5 bg-rose-400"
            style={{ left: 8 + playheadSec * pxPerSec }}
          >
            <div className="pointer-events-auto absolute -left-1.5 top-0 h-3 w-3 cursor-ew-resize rounded-full bg-rose-400"
              onPointerDown={(e) => startDrag({ kind: "playhead" }, e)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
