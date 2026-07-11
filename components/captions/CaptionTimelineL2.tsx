"use client";

import { useCallback, useRef, useState } from "react";
import type { CaptionLine } from "@/lib/ad-pack-types";
import { snapToNearestBeat } from "@/lib/beat-detect";

type CaptionTimelineL2Props = {
  durationSec: number;
  lines: CaptionLine[];
  selectedIndex: number;
  videoTrimIn: number;
  videoTrimOut: number;
  beatMarkers: number[];
  snapToBeats: boolean;
  onSelect: (index: number) => void;
  onUpdate: (index: number, patch: Partial<CaptionLine>) => void;
  onVideoTrimChange: (trimIn: number, trimOut: number) => void;
  onSnapToggle: (enabled: boolean) => void;
  labels: {
    title: string;
    hint: string;
    videoTrack: string;
    captionTrack: string;
    bgmTrack: string;
    trimIn: string;
    trimOut: string;
    snapBeats: string;
    trimVideoIn: string;
    trimVideoOut: string;
  };
};

type DragKind = "caption-move" | "caption-start" | "caption-end" | "video-in" | "video-out";

export function CaptionTimelineL2({
  durationSec,
  lines,
  selectedIndex,
  videoTrimIn,
  videoTrimOut,
  beatMarkers,
  snapToBeats,
  onSelect,
  onUpdate,
  onVideoTrimChange,
  onSnapToggle,
  labels,
}: CaptionTimelineL2Props) {
  const safeDuration = Math.max(1, durationSec);
  const trackRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ kind: DragKind; index: number; startX: number; origStart: number; origEnd: number } | null>(null);

  const pct = (sec: number) => `${(sec / safeDuration) * 100}%`;
  const secFromClientX = useCallback(
    (clientX: number) => {
      const box = trackRef.current?.getBoundingClientRect();
      if (!box) return 0;
      const ratio = Math.min(1, Math.max(0, (clientX - box.left) / box.width));
      let sec = ratio * safeDuration;
      if (snapToBeats && beatMarkers.length) sec = snapToNearestBeat(sec, beatMarkers);
      return Math.round(sec * 10) / 10;
    },
    [safeDuration, snapToBeats, beatMarkers],
  );

  const onPointerMove = useCallback(
    (e: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      const sec = secFromClientX(e.clientX);
      if (drag.kind === "video-in") {
        onVideoTrimChange(Math.min(sec, videoTrimOut - 0.2), videoTrimOut);
      } else if (drag.kind === "video-out") {
        onVideoTrimChange(videoTrimIn, Math.max(sec, videoTrimIn + 0.2));
      } else if (drag.kind === "caption-start") {
        const line = lines[drag.index];
        if (!line) return;
        onUpdate(drag.index, { startSec: Math.min(sec, line.endSec - 0.1) });
      } else if (drag.kind === "caption-end") {
        const line = lines[drag.index];
        if (!line) return;
        onUpdate(drag.index, { endSec: Math.max(sec, line.startSec + 0.1) });
      } else if (drag.kind === "caption-move") {
        const line = lines[drag.index];
        if (!line) return;
        const len = drag.origEnd - drag.origStart;
        const delta = sec - drag.origStart;
        onUpdate(drag.index, {
          startSec: Math.max(0, Math.min(safeDuration - len, line.startSec + delta)),
          endSec: Math.max(len, Math.min(safeDuration, line.endSec + delta)),
        });
      }
    },
    [lines, onUpdate, onVideoTrimChange, secFromClientX, safeDuration, videoTrimIn, videoTrimOut],
  );

  const endDrag = useCallback(() => {
    dragRef.current = null;
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", endDrag);
  }, [onPointerMove]);

  function startDrag(kind: DragKind, index: number, e: React.PointerEvent, line?: CaptionLine) {
    e.preventDefault();
    dragRef.current = {
      kind,
      index,
      startX: e.clientX,
      origStart: line?.startSec ?? videoTrimIn,
      origEnd: line?.endSec ?? videoTrimOut,
    };
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", endDrag);
  }

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-white">{labels.title}</p>
          <p className="mt-1 text-xs text-slate-400">{labels.hint}</p>
        </div>
        <label className="flex items-center gap-2 text-xs text-slate-300">
          <input type="checkbox" checked={snapToBeats} onChange={(e) => onSnapToggle(e.target.checked)} />
          {labels.snapBeats}
        </label>
      </div>

      <div ref={trackRef} className="relative mt-4 space-y-2">
        {beatMarkers.map((b) => (
          <div
            key={`beat-${b}`}
            className="pointer-events-none absolute top-0 bottom-0 w-px bg-amber-500/30"
            style={{ left: pct(b) }}
          />
        ))}

        <div>
          <p className="mb-1 text-[10px] uppercase tracking-wide text-slate-500">{labels.videoTrack}</p>
          <div className="relative h-10 rounded-lg bg-slate-950">
            <div
              className="absolute inset-y-1 rounded bg-cyan-900/50 border border-cyan-600/60"
              style={{ left: pct(videoTrimIn), right: `${100 - (videoTrimOut / safeDuration) * 100}%` }}
            />
            <button
              type="button"
              className="absolute top-0 bottom-0 w-2 -ml-1 cursor-ew-resize rounded bg-cyan-400"
              style={{ left: pct(videoTrimIn) }}
              onPointerDown={(e) => startDrag("video-in", -1, e)}
              aria-label={labels.trimVideoIn}
            />
            <button
              type="button"
              className="absolute top-0 bottom-0 w-2 -ml-1 cursor-ew-resize rounded bg-cyan-400"
              style={{ left: pct(videoTrimOut) }}
              onPointerDown={(e) => startDrag("video-out", -1, e)}
              aria-label={labels.trimVideoOut}
            />
          </div>
        </div>

        <div>
          <p className="mb-1 text-[10px] uppercase tracking-wide text-slate-500">{labels.bgmTrack}</p>
          <div className="relative h-6 rounded-lg bg-gradient-to-r from-violet-950 via-violet-800/40 to-violet-950">
            <div className="absolute inset-0 opacity-40" style={{ backgroundImage: "repeating-linear-gradient(90deg, transparent, transparent 6px, rgba(255,255,255,0.08) 6px, rgba(255,255,255,0.08) 8px)" }} />
          </div>
        </div>

        <div>
          <p className="mb-1 text-[10px] uppercase tracking-wide text-slate-500">{labels.captionTrack}</p>
          <div className="relative h-14 rounded-lg bg-slate-950">
            {lines.map((line, index) => {
              const left = (line.startSec / safeDuration) * 100;
              const width = Math.max(3, ((line.endSec - line.startSec) / safeDuration) * 100);
              const active = selectedIndex === index;
              return (
                <div
                  key={`cap-block-${index}`}
                  className={`absolute top-2 h-10 rounded-md border text-[10px] ${active ? "border-emerald-400 bg-emerald-900/50 text-emerald-100" : "border-slate-600 bg-slate-800 text-slate-200"}`}
                  style={{ left: `${left}%`, width: `${width}%` }}
                  onClick={() => onSelect(index)}
                >
                  <button type="button" className="absolute left-0 top-0 bottom-0 w-1.5 cursor-ew-resize bg-white/20" onPointerDown={(e) => { onSelect(index); startDrag("caption-start", index, e, line); }} />
                  <button type="button" className="absolute inset-0 px-2 text-left" onPointerDown={(e) => { onSelect(index); startDrag("caption-move", index, e, line); }}>
                    <span className="line-clamp-2">{line.text || `#${index + 1}`}</span>
                  </button>
                  <button type="button" className="absolute right-0 top-0 bottom-0 w-1.5 cursor-ew-resize bg-white/20" onPointerDown={(e) => { onSelect(index); startDrag("caption-end", index, e, line); }} />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {lines[selectedIndex] && (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <label className="text-xs text-slate-400">
            {labels.trimIn}
            <input type="number" min={0} max={safeDuration} step={0.1} value={lines[selectedIndex].startSec} onChange={(e) => onUpdate(selectedIndex, { startSec: Number(e.target.value) })} className="mt-1 w-full rounded border border-slate-600 bg-slate-950 px-2 py-1 text-sm text-white" />
          </label>
          <label className="text-xs text-slate-400">
            {labels.trimOut}
            <input type="number" min={0} max={safeDuration} step={0.1} value={lines[selectedIndex].endSec} onChange={(e) => onUpdate(selectedIndex, { endSec: Number(e.target.value) })} className="mt-1 w-full rounded border border-slate-600 bg-slate-950 px-2 py-1 text-sm text-white" />
          </label>
        </div>
      )}

      <div className="mt-2 grid gap-2 sm:grid-cols-2 text-xs text-cyan-300/80">
        <span>{labels.trimVideoIn}: {videoTrimIn.toFixed(1)}s</span>
        <span>{labels.trimVideoOut}: {videoTrimOut.toFixed(1)}s</span>
      </div>
    </div>
  );
}
