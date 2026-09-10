"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CaptionLine, VoClip } from "@/lib/ad-pack-types";
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
  zoomFit?: string;
  zoomLabel?: string;
  cutAt?: string;
  emptyVideo: string;
  emptyCaption?: string;
  bgmLane: string;
  voLane: string;
  selected: string;
  shortcuts?: string;
};

const ZOOM_MIN = 24;
const ZOOM_MAX = 400;
const ZOOM_STEP = 1.25;

function clampZoom(n: number) {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(n)));
}

type DragKind =
  | { kind: "playhead" }
  | {
      kind: "clip-in";
      clipId: string;
      originSourceIn: number;
      originClientX: number;
    }
  | {
      kind: "clip-out";
      clipId: string;
      originSourceOut: number;
      originClientX: number;
    }
  | {
      kind: "clip-pending";
      clipId: string;
      fromIndex: number;
      originClientX: number;
    }
  | { kind: "clip-move"; clipId: string; fromIndex: number }
  | { kind: "caption-move"; index: number; origStart: number; origEnd: number }
  | { kind: "caption-start"; index: number; origEnd: number }
  | { kind: "caption-end"; index: number; origStart: number }
  | { kind: "bgm-move"; origStart: number; duration: number; grabOffsetSec: number }
  | { kind: "bgm-in"; origStart: number; origEnd: number }
  | { kind: "bgm-out"; origStart: number; origEnd: number }
  | { kind: "vo-start"; id: string; origStart: number };

export function CaptionNleTimeline(props: {
  clips: TimelineClip[];
  captions: CaptionLine[];
  selectedClipId: string | null;
  selectedCaptionIndex: number;
  playheadSec: number;
  bgmStartSec: number;
  /** Visible BGM clip length (seconds) on the project timeline. */
  bgmDurationSec: number;
  bgmLabel: string;
  voClips?: VoClip[];
  /** @deprecated prefer voClips */
  voUrl?: string | null;
  voStartSec?: number;
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
  onBgmRange: (startSec: number, durationSec: number) => void;
  onVoStart?: (id: string, sec: number) => void;
  onSelectVo?: (id: string) => void;
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
    bgmDurationSec,
    bgmLabel,
    voClips = [],
    voUrl,
    voStartSec = 0,
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
    onBgmRange,
    onVoStart,
    onSelectVo,
    onPxPerSec,
    onSelectAudio,
  } = props;

  const packed = useMemo(() => packClipsMagnetically(clips), [clips]);
  /** Visible project end (packed clips). */
  const projectEndSec = useMemo(
    () => Math.max(1, packed.reduce((m, c) => Math.max(m, c.timelineEndSec), 0)),
    [packed],
  );
  /**
   * Keep scroll/ruler room for expanding trims back to full source length.
   * Without this, shortening a clip shrinks the timeline and the out-handle
   * cannot drag past the new end.
   */
  const durationSec = useMemo(() => {
    const fullyExpanded = clips.reduce(
      (sum, c) => sum + Math.max(0.2, c.sourceDurationSec || clipDurationSec(c)),
      0,
    );
    return Math.max(1, projectEndSec, fullyExpanded) + 0.75;
  }, [clips, projectEndSec]);
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
        onPlayhead(Math.min(projectEndSec, sec));
      } else if (drag.kind === "clip-pending") {
        if (Math.abs(e.clientX - drag.originClientX) >= 6) {
          onHistoryCheckpoint?.();
          dragRef.current = {
            kind: "clip-move",
            clipId: drag.clipId,
            fromIndex: drag.fromIndex,
          };
          const idx = packed.findIndex((c) => c.id === drag.clipId);
          if (idx >= 0) {
            let target = 0;
            for (let i = 0; i < packed.length; i++) {
              const mid =
                (packed[i]!.timelineStartSec + packed[i]!.timelineEndSec) / 2;
              if (sec >= mid) target = i;
            }
            setDropIndex(target);
          }
        } else {
          onPlayhead(Math.min(projectEndSec, sec));
        }
      } else if (drag.kind === "clip-in" || drag.kind === "clip-out") {
        // Delta from pointer-down so we can expand past the current packed end
        // (and past t=0 for the in-handle) up to sourceDurationSec.
        const deltaSec = (e.clientX - drag.originClientX) / pxPerSec;
        if (drag.kind === "clip-in") {
          onTrimClip(drag.clipId, "in", drag.originSourceIn + deltaSec);
        } else {
          onTrimClip(drag.clipId, "out", drag.originSourceOut + deltaSec);
        }
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
      } else if (drag.kind === "bgm-move") {
        const start = Math.max(
          0,
          Math.min(projectEndSec - drag.duration, sec - drag.grabOffsetSec),
        );
        onBgmRange(start, drag.duration);
      } else if (drag.kind === "bgm-in") {
        const end = drag.origEnd;
        const start = Math.max(0, Math.min(end - 0.2, sec));
        onBgmRange(start, end - start);
      } else if (drag.kind === "bgm-out") {
        const start = drag.origStart;
        const end = Math.max(start + 0.2, Math.min(projectEndSec, sec));
        onBgmRange(start, end - start);
      } else if (drag.kind === "vo-start") {
        onVoStart?.(
          drag.id,
          Math.max(0, Math.min(projectEndSec - 0.2, sec)),
        );
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
    onBgmRange,
    onVoStart,
    onHistoryCheckpoint,
    projectEndSec,
    onPlayhead,
    onReorderClip,
    onTrimClip,
    onUpdateCaption,
    packed,
    projectEndSec,
    pxPerSec,
    secFromClientX,
  ]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      const factor = e.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP;
      onPxPerSec(clampZoom(pxPerSec * factor));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [onPxPerSec, pxPerSec]);

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
      kind.kind === "bgm-move" ||
      kind.kind === "bgm-in" ||
      kind.kind === "bgm-out" ||
      kind.kind === "vo-start"
    ) {
      onHistoryCheckpoint?.();
    }
    dragRef.current = kind;
  };

  const selected = selectedClipId
    ? packed.find((c) => c.id === selectedClipId)
    : null;

  const cutReady = useMemo(() => {
    const hit = packed.find(
      (c) => playheadSec >= c.timelineStartSec && playheadSec <= c.timelineEndSec,
    );
    if (!hit) return false;
    const local = playheadSec - hit.timelineStartSec;
    const dur = clipDurationSec(hit);
    return local >= 0.15 && local <= dur - 0.15;
  }, [packed, playheadSec]);

  const cutLabel = (L.cutAt ?? "Cut @ {t}s").replace(
    "{t}",
    playheadSec.toFixed(1),
  );

  return (
    <div className="flex h-full min-h-0 flex-col rounded-none border-0 bg-transparent p-0">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-1.5 px-1 pb-1">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold text-white">{L.title}</p>
          {L.shortcuts ? (
            <p className="truncate text-[9px] text-slate-600">{L.shortcuts}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            disabled={!cutReady && !selectedClipId && selectedCaptionIndex < 0}
            onClick={onSplit}
            className={`rounded-md border px-2 py-1 text-[10px] font-semibold disabled:opacity-40 ${
              cutReady
                ? "border-rose-400/60 bg-rose-500/20 text-rose-50"
                : "border-cyan-400/40 bg-cyan-500/15 text-cyan-100"
            }`}
            title={L.split}
          >
            ✂ {cutLabel}
          </button>
          <button
            type="button"
            disabled={!selectedClipId}
            onClick={onDeleteSelected}
            className="rounded-md border border-white/15 bg-white/5 px-2 py-1 text-[10px] text-slate-200 disabled:opacity-40"
          >
            {L.deleteClip}
          </button>
          <button
            type="button"
            disabled={!canUndo}
            onClick={onUndo}
            className="rounded-md border border-white/15 bg-white/5 px-2 py-1 text-[10px] text-slate-200 disabled:opacity-40"
          >
            {L.undo}
          </button>
          <div className="ml-0.5 flex items-center gap-0.5 rounded-md border border-white/15 bg-white/5 px-0.5 py-0.5">
            <button
              type="button"
              onClick={() => onPxPerSec(clampZoom(pxPerSec / ZOOM_STEP))}
              className="rounded px-1.5 py-0.5 text-[11px] font-semibold text-slate-100 hover:bg-white/10"
              title={L.zoomOut}
            >
              {L.zoomOut}
            </button>
            <span className="min-w-[2.25rem] text-center text-[9px] tabular-nums text-cyan-100/90">
              {Math.round(pxPerSec)}
            </span>
            <button
              type="button"
              onClick={() => onPxPerSec(clampZoom(pxPerSec * ZOOM_STEP))}
              className="rounded px-1.5 py-0.5 text-[11px] font-semibold text-slate-100 hover:bg-white/10"
              title={L.zoomIn}
            >
              {L.zoomIn}
            </button>
            <button
              type="button"
              onClick={() => {
                const el = scrollerRef.current;
                const usable = Math.max(240, (el?.clientWidth ?? 640) - 48);
                const target = usable / Math.max(0.5, projectEndSec);
                onPxPerSec(clampZoom(target));
              }}
              className="rounded border border-cyan-500/30 bg-cyan-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-cyan-100 hover:bg-cyan-500/20"
              title={L.zoomFit ?? "Fit"}
            >
              {L.zoomFit ?? "Fit"}
            </button>
          </div>
        </div>
      </div>

      {selected ? (
        <p className="shrink-0 truncate px-1 text-[9px] text-slate-500">
          {L.selected}: {selected.label || selected.id.slice(0, 8)} ·{" "}
          {clipDurationSec(selected).toFixed(1)}s · In{" "}
          {selected.sourceInSec.toFixed(1)}s → Out{" "}
          {selected.sourceOutSec.toFixed(1)}s
          {selected.sourceDurationSec > clipDurationSec(selected) + 0.05
            ? ` · / ${selected.sourceDurationSec.toFixed(1)}s`
            : null}
        </p>
      ) : null}

      <div
        ref={scrollerRef}
        className="relative mt-1 min-h-0 flex-1 overflow-x-auto overflow-y-auto rounded-lg border border-white/5 bg-black/40"
        onPointerDown={(e) => {
          if ((e.target as HTMLElement).closest("[data-nle-handle]")) return;
          onPlayhead(secFromClientX(e.clientX));
          startDrag({ kind: "playhead" }, e);
        }}
      >
        <div className="relative p-1.5 pb-2" style={{ width: trackWidth }}>
          {/* Ruler */}
          <div className="relative mb-1 h-4 border-b border-white/10">
            {Array.from({ length: Math.ceil(durationSec) + 1 }, (_, i) => (
              <span
                key={`tick-${i}`}
                className="absolute top-0 text-[8px] text-slate-500"
                style={{ left: i * pxPerSec }}
              >
                {i}s
              </span>
            ))}
          </div>

          {/* Video track */}
          <p className="mb-0.5 text-[9px] uppercase tracking-wide text-slate-500">
            {L.videoTrack}
          </p>
          <div className="relative mb-2 h-10 rounded-md bg-slate-900/80">
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
                    const sec = secFromClientX(e.clientX);
                    onPlayhead(Math.min(projectEndSec, sec));
                    startDrag(
                      {
                        kind: "clip-pending",
                        clipId: clip.id,
                        fromIndex: index,
                        originClientX: e.clientX,
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
                    className="absolute inset-y-0 left-0 z-[2] w-3 cursor-ew-resize bg-cyan-300/90"
                    onPointerDown={(e) =>
                      startDrag(
                        {
                          kind: "clip-in",
                          clipId: clip.id,
                          originSourceIn: clip.sourceInSec,
                          originClientX: e.clientX,
                        },
                        e,
                      )
                    }
                  />
                  <button
                    type="button"
                    data-nle-handle
                    aria-label="Trim out"
                    className="absolute inset-y-0 right-0 z-[2] w-3 cursor-ew-resize bg-cyan-300/90"
                    onPointerDown={(e) =>
                      startDrag(
                        {
                          kind: "clip-out",
                          clipId: clip.id,
                          originSourceOut: clip.sourceOutSec,
                          originClientX: e.clientX,
                        },
                        e,
                      )
                    }
                  />
                </div>
              );
            })}
          </div>

          {/* Caption track */}
          <p className="mb-0.5 text-[9px] uppercase tracking-wide text-slate-500">
            {L.captionTrack}
          </p>
          <div className="relative mb-2 h-7 rounded-md bg-slate-900/80">
            {captions.length === 0 ? (
              <p className="absolute inset-0 flex items-center px-2 text-[9px] text-slate-600">
                {L.emptyCaption ?? "Add lines in Captions — they show here"}
              </p>
            ) : null}
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
          <p className="mb-0.5 text-[9px] uppercase tracking-wide text-slate-500">
            {L.audioTrack}
          </p>
          <div className="relative mb-1 h-6 rounded-md bg-slate-900/80">
            {(() => {
              const dur = Math.max(
                0.4,
                Math.min(bgmDurationSec, Math.max(0.4, projectEndSec - bgmStartSec)),
              );
              return (
                <div
                  className="absolute top-0.5 bottom-0.5 cursor-grab rounded border border-emerald-600/50 bg-emerald-900/40 active:cursor-grabbing"
                  style={{
                    left: bgmStartSec * pxPerSec,
                    width: Math.max(24, dur * pxPerSec),
                  }}
                  onPointerDown={(e) => {
                    if ((e.target as HTMLElement).dataset.nleHandle) return;
                    onSelectAudio?.();
                    const grabOffsetSec = Math.max(
                      0,
                      secFromClientX(e.clientX) - bgmStartSec,
                    );
                    startDrag(
                      {
                        kind: "bgm-move",
                        origStart: bgmStartSec,
                        duration: dur,
                        grabOffsetSec,
                      },
                      e,
                    );
                  }}
                >
                  <button
                    type="button"
                    data-nle-handle
                    className="absolute inset-y-0 left-0 w-1.5 cursor-ew-resize bg-emerald-200/80"
                    onPointerDown={(e) => {
                      onSelectAudio?.();
                      startDrag(
                        {
                          kind: "bgm-in",
                          origStart: bgmStartSec,
                          origEnd: bgmStartSec + dur,
                        },
                        e,
                      );
                    }}
                  />
                  <p className="pointer-events-none truncate px-2 pt-0.5 text-[8px] text-emerald-100">
                    {L.bgmLane}: {bgmLabel}
                  </p>
                  <button
                    type="button"
                    data-nle-handle
                    className="absolute inset-y-0 right-0 w-1.5 cursor-ew-resize bg-emerald-200/80"
                    onPointerDown={(e) => {
                      onSelectAudio?.();
                      startDrag(
                        {
                          kind: "bgm-out",
                          origStart: bgmStartSec,
                          origEnd: bgmStartSec + dur,
                        },
                        e,
                      );
                    }}
                  />
                </div>
              );
            })()}
          </div>
          <p className="mb-0.5 text-[9px] uppercase tracking-wide text-slate-500">
            {L.voLane}
          </p>
          <div className="relative h-6 rounded-md bg-slate-900/80">
            {voClips.length > 0
              ? voClips.map((vo) => (
                  <div
                    key={vo.id}
                    className="absolute top-0.5 bottom-0.5 cursor-grab rounded border border-amber-500/50 bg-amber-900/40 active:cursor-grabbing"
                    style={{
                      left: vo.startSec * pxPerSec,
                      width: Math.max(
                        20,
                        Math.max(0.4, vo.durationSec) * pxPerSec,
                      ),
                    }}
                    onPointerDown={(e) => {
                      onSelectVo?.(vo.id);
                      onSelectAudio?.();
                      startDrag(
                        {
                          kind: "vo-start",
                          id: vo.id,
                          origStart: vo.startSec,
                        },
                        e,
                      );
                    }}
                  >
                    <p className="truncate px-1 pt-0.5 text-[8px] text-amber-100">
                      {vo.label ?? L.voLane}
                    </p>
                  </div>
                ))
              : voUrl
                ? (
                    <div
                      className="absolute top-0.5 bottom-0.5 rounded border border-amber-500/40 bg-amber-900/35"
                      style={{
                        left: voStartSec * pxPerSec,
                        width: Math.max(20, durationSec * 0.35 * pxPerSec),
                      }}
                    >
                      <p className="truncate px-1 pt-0.5 text-[8px] text-amber-100">
                        {L.voLane}
                      </p>
                    </div>
                  )
                : null}
          </div>

          {/* Playhead — cut marker */}
          <div
            data-nle-handle
            className="pointer-events-none absolute top-0 bottom-2 z-20"
            style={{ left: 8 + playheadSec * pxPerSec }}
          >
            <div className="absolute top-0 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold text-white shadow">
              ✂ {playheadSec.toFixed(1)}s
            </div>
            <div className="absolute top-5 bottom-0 left-1/2 w-0.5 -translate-x-1/2 bg-rose-400" />
            <div
              className="pointer-events-auto absolute -left-2 top-5 h-4 w-4 cursor-ew-resize rounded-full border-2 border-white bg-rose-500"
              onPointerDown={(e) => startDrag({ kind: "playhead" }, e)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
