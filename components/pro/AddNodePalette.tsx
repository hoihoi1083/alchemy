"use client";

import { useEffect, useRef } from "react";
import type { AddableNodeType } from "@/lib/pro-canvas-types";

type Props = {
  labels: Record<string, string>;
  onAdd: (kind: AddableNodeType["kind"]) => void;
  disabled?: boolean;
  className?: string;
  onClose?: () => void;
};

type Accent = "upload" | "textVideo" | "cyan" | "amber" | "slate";

type Row =
  | { type: "hint" }
  | { type: "section"; key: "resource" | "modifier" }
  | { type: "item"; kind: AddableNodeType["kind"]; label: string; accent: Accent };

const ROWS: Row[] = [
  { type: "hint" },
  { type: "item", kind: "upload", label: "Upload", accent: "upload" },
  { type: "item", kind: "text", label: "Text", accent: "cyan" },
  { type: "item", kind: "image", label: "Image", accent: "cyan" },
  { type: "item", kind: "textVideo", label: "Text-to-video", accent: "textVideo" },
  { type: "item", kind: "video", label: "Video", accent: "cyan" },
  { type: "item", kind: "audio", label: "Audio", accent: "cyan" },
  { type: "item", kind: "voice", label: "Voice", accent: "cyan" },
  { type: "item", kind: "brainstorm", label: "Brainstorm", accent: "cyan" },
  { type: "item", kind: "splice", label: "Video splice", accent: "cyan" },
  { type: "item", kind: "script", label: "Script planning", accent: "cyan" },
  { type: "item", kind: "storyboard", label: "Storyboard", accent: "cyan" },
  { type: "item", kind: "camera", label: "Camera angle", accent: "cyan" },
  { type: "section", key: "resource" },
  { type: "item", kind: "character", label: "Character", accent: "slate" },
  { type: "item", kind: "world", label: "World / scene", accent: "slate" },
  { type: "item", kind: "research", label: "Research", accent: "slate" },
  { type: "item", kind: "brand", label: "Brand kit", accent: "slate" },
  { type: "section", key: "modifier" },
  { type: "item", kind: "lighting", label: "Lighting", accent: "amber" },
  { type: "item", kind: "background", label: "Background", accent: "amber" },
  { type: "item", kind: "grade", label: "Look grade", accent: "amber" },
];

function itemTone(accent: Accent): { row: string; plus: string } {
  switch (accent) {
    case "upload":
      return {
        row: "border border-emerald-500/40 bg-emerald-950/35 text-emerald-50 hover:bg-emerald-950/55",
        plus: "text-emerald-300",
      };
    case "textVideo":
      return {
        row: "border border-violet-500/35 bg-violet-950/40 text-violet-50 hover:bg-violet-950/60",
        plus: "text-violet-300",
      };
    case "amber":
      return {
        row: "text-slate-200 hover:bg-amber-950/30 hover:text-amber-100",
        plus: "text-amber-500/80",
      };
    case "slate":
      return {
        row: "text-slate-200 hover:bg-slate-800",
        plus: "text-slate-500",
      };
    default:
      return {
        row: "text-slate-200 hover:bg-cyan-950/40 hover:text-cyan-100",
        plus: "text-cyan-500/80",
      };
  }
}

/**
 * Half-height floating card — when the column is ~half viewport, list overflows and scroll works.
 * Height is fixed in px (not flex %); wheel is applied manually so React Flow cannot steal it.
 */
export function AddNodePalette({
  labels,
  onAdd,
  disabled = false,
  className = "",
  onClose,
}: Props) {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopImmediatePropagation();
      el.scrollTop += e.deltaY;
    };
    el.addEventListener("wheel", onWheel, { capture: true, passive: false });
    return () => el.removeEventListener("wheel", onWheel, true);
  }, []);

  return (
    <div
      data-add-node-palette
      className={`nodrag nopan flex w-52 flex-col overflow-hidden rounded-xl border border-cyan-500/20 bg-slate-900/95 shadow-[0_0_32px_rgba(34,211,238,0.08)] backdrop-blur ${className}`}
      style={{ height: "min(420px, 50vh)" }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="flex h-9 shrink-0 items-center justify-between gap-2 border-b border-slate-800/80 px-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-cyan-300/90">
          {labels.addNode}
        </p>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-600 bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-200 hover:border-cyan-500/50 hover:text-cyan-100"
            aria-label="Close"
          >
            {labels.railClose ?? "−"}
          </button>
        ) : null}
      </div>

      <div
        ref={listRef}
        className="min-h-0 flex-1 p-3"
        style={{
          overflowY: "scroll",
          overscrollBehavior: "contain",
          scrollbarWidth: "thin",
          scrollbarColor: "#94a3b8 #0f172a",
          touchAction: "pan-y",
        }}
      >
        <div className="space-y-1 pb-2">
          {ROWS.map((row) => {
            if (row.type === "hint") {
              if (!labels.paletteTextVideoHint) return null;
              return (
                <p
                  key="hint"
                  className="mb-2 rounded-md border border-violet-500/25 bg-violet-950/30 px-2 py-1.5 text-[9px] leading-snug text-violet-100/90"
                >
                  {labels.paletteTextVideoHint}
                </p>
              );
            }
            if (row.type === "section") {
              return (
                <p
                  key={`section-${row.key}`}
                  className={`mt-3 text-[10px] font-semibold uppercase tracking-[0.14em] ${
                    row.key === "modifier" ? "text-amber-400/80" : "text-slate-500"
                  }`}
                >
                  {row.key === "modifier" ? labels.addModifier : labels.addResource}
                </p>
              );
            }
            const tone = itemTone(row.accent);
            return (
              <button
                key={row.kind}
                type="button"
                disabled={disabled}
                onClick={() => onAdd(row.kind)}
                className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition ${tone.row}`}
              >
                <span className={tone.plus}>+</span>
                {labels[row.kind] ?? row.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
