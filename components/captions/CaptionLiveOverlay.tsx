"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CaptionLine, CaptionLineStyle } from "@/lib/ad-pack-types";
import {
  CAPTION_STYLE_PRESETS,
  isCaptionStylePresetId,
  resolveLineCaptionStyle,
  type CaptionBurnStyle,
  type CaptionStylePresetId,
} from "@/lib/caption-burn-styles";

function pctFromPosition(position: CaptionLine["position"]): { x: number; y: number } {
  switch (position ?? "bottom") {
    case "top":
      return { x: 50, y: 12 };
    case "center":
      return { x: 50, y: 50 };
    case "top-left":
      return { x: 18, y: 12 };
    case "top-right":
      return { x: 82, y: 12 };
    case "bottom-left":
      return { x: 18, y: 88 };
    case "bottom-right":
      return { x: 82, y: 88 };
    case "bottom":
    default:
      return { x: 50, y: 88 };
  }
}

function resolveCssStyle(
  line: CaptionLine,
  fallbackPreset: CaptionStylePresetId,
): {
  color: string;
  WebkitTextStroke: string;
  fontSize: string;
  fontWeight: number;
  textShadow: string;
} {
  const base = resolveLineCaptionStyle(line.stylePreset, {
    preset: fallbackPreset,
    ...CAPTION_STYLE_PRESETS[fallbackPreset],
  } as CaptionBurnStyle);
  const o = line.style ?? {};
  const fill = o.fill ?? base.fill ?? "#ffffff";
  const stroke = o.stroke ?? base.stroke ?? "#000000";
  const strokeW = o.strokeWidth ?? Math.max(1, (base.strokeWidthScale ?? 1) * 2);
  const scale = o.fontSizeScale ?? base.fontSizeScale ?? 1;
  const shadowColor = o.shadowColor ?? "rgba(0,0,0,0.65)";
  const shadowBlur = o.shadowBlur ?? 4;
  return {
    color: fill,
    WebkitTextStroke: `${strokeW}px ${stroke}`,
    fontSize: `${Math.round(22 * scale)}px`,
    fontWeight: base.fontWeight ?? 700,
    textShadow: `0 0 ${shadowBlur}px ${shadowColor}, 0 2px 4px ${shadowColor}`,
  };
}

type Props = {
  lines: CaptionLine[];
  playheadSec: number;
  selectedIndex: number;
  defaultStylePreset: CaptionStylePresetId;
  onSelect: (index: number) => void;
  onUpdate: (index: number, patch: Partial<CaptionLine>) => void;
  labels?: {
    fontSize?: string;
    fill?: string;
    outline?: string;
    shadow?: string;
    shadowColor?: string;
    dragHint?: string;
  };
};

const PANEL_W = 280;
const PANEL_H = 150;

export function CaptionLiveOverlay({
  lines,
  playheadSec,
  selectedIndex,
  defaultStylePreset,
  onSelect,
  onUpdate,
  labels,
}: Props) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [draggingCaption, setDraggingCaption] = useState(false);
  /** Panel position in px relative to stage (top-left of panel). */
  const [panelPos, setPanelPos] = useState<{ x: number; y: number } | null>(null);
  const panelDragRef = useRef<{
    originX: number;
    originY: number;
    startLeft: number;
    startTop: number;
  } | null>(null);

  const active = lines
    .map((line, index) => ({ line, index }))
    .filter(
      ({ line }) =>
        line.text.trim() &&
        playheadSec >= line.startSec - 0.02 &&
        playheadSec <= line.endSec + 0.02,
    );

  const onPointerDown = useCallback(
    (index: number, e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onSelect(index);
      const stage = stageRef.current;
      if (!stage) return;
      const rect = stage.getBoundingClientRect();
      setDraggingCaption(true);
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);

      const move = (ev: PointerEvent) => {
        const xPct = Math.min(
          92,
          Math.max(8, ((ev.clientX - rect.left) / rect.width) * 100),
        );
        const yPct = Math.min(
          94,
          Math.max(6, ((ev.clientY - rect.top) / rect.height) * 100),
        );
        onUpdate(index, { xPct, yPct });
      };
      const up = () => {
        setDraggingCaption(false);
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    },
    [onSelect, onUpdate],
  );

  const selected = lines[selectedIndex];
  const showInspector =
    selected &&
    selected.text.trim() &&
    playheadSec >= selected.startSec - 0.05 &&
    playheadSec <= selected.endSec + 0.05;

  // Default panel near top-center so it doesn't cover video controls.
  useEffect(() => {
    if (!showInspector || panelPos) return;
    const stage = stageRef.current;
    if (!stage) return;
    const w = stage.clientWidth;
    const x = Math.max(8, (w - Math.min(PANEL_W, w * 0.92)) / 2);
    setPanelPos({ x, y: 8 });
  }, [showInspector, panelPos]);

  const onPanelHandleDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const stage = stageRef.current;
    if (!stage || !panelPos) return;
    panelDragRef.current = {
      originX: e.clientX,
      originY: e.clientY,
      startLeft: panelPos.x,
      startTop: panelPos.y,
    };
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);

    const move = (ev: PointerEvent) => {
      const drag = panelDragRef.current;
      if (!drag || !stage) return;
      const rect = stage.getBoundingClientRect();
      const panelW = Math.min(PANEL_W, rect.width * 0.92);
      const dx = ev.clientX - drag.originX;
      const dy = ev.clientY - drag.originY;
      const nextX = Math.min(
        Math.max(4, drag.startLeft + dx),
        Math.max(4, rect.width - panelW - 4),
      );
      const nextY = Math.min(
        Math.max(4, drag.startTop + dy),
        Math.max(4, rect.height - PANEL_H - 4),
      );
      setPanelPos({ x: nextX, y: nextY });
    };
    const up = () => {
      panelDragRef.current = null;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const patchStyle = (partial: CaptionLineStyle) => {
    if (!selected) return;
    onUpdate(selectedIndex, {
      style: { ...(selected.style ?? {}), ...partial },
    });
  };

  const styleBase = selected
    ? resolveCssStyle(selected, defaultStylePreset)
    : null;
  const fillVal = selected?.style?.fill ?? styleBase?.color ?? "#ffffff";
  const strokeVal =
    selected?.style?.stroke ??
    (isCaptionStylePresetId(selected?.stylePreset ?? "")
      ? CAPTION_STYLE_PRESETS[selected!.stylePreset as CaptionStylePresetId].stroke
      : "#000000");
  const sizeScale = selected?.style?.fontSizeScale ?? 1;
  const shadowBlur = selected?.style?.shadowBlur ?? 4;
  const shadowColor = selected?.style?.shadowColor ?? "#000000";

  return (
    <div
      ref={stageRef}
      className="pointer-events-none absolute inset-0 z-10"
      aria-hidden={active.length === 0 && !showInspector}
    >
      {active.map(({ line, index }) => {
        const fallback = pctFromPosition(line.position);
        const x = typeof line.xPct === "number" ? line.xPct : fallback.x;
        const y = typeof line.yPct === "number" ? line.yPct : fallback.y;
        const css = resolveCssStyle(line, defaultStylePreset);
        const isSelected = index === selectedIndex;
        return (
          <button
            key={`${index}-${line.startSec}`}
            type="button"
            className={`pointer-events-auto absolute max-w-[86%] -translate-x-1/2 -translate-y-1/2 cursor-grab touch-none rounded px-2 py-1 text-center leading-tight ${
              isSelected
                ? "ring-2 ring-cyan-400 ring-offset-1 ring-offset-black/40"
                : "hover:ring-1 hover:ring-white/50"
            } ${draggingCaption && isSelected ? "cursor-grabbing" : ""}`}
            style={{
              left: `${x}%`,
              top: `${y}%`,
              color: css.color,
              WebkitTextStroke: css.WebkitTextStroke,
              paintOrder: "stroke fill",
              fontSize: css.fontSize,
              fontWeight: css.fontWeight,
              textShadow: css.textShadow,
            }}
            onPointerDown={(e) => onPointerDown(index, e)}
          >
            {line.text}
          </button>
        );
      })}

      {showInspector && selected && panelPos ? (
        <div
          className="pointer-events-auto absolute z-20 w-[min(280px,92%)] rounded-xl border border-slate-600 bg-slate-950/95 shadow-xl"
          style={{ left: panelPos.x, top: panelPos.y }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div
            role="button"
            tabIndex={0}
            className="flex cursor-grab touch-none items-center justify-between gap-2 border-b border-white/10 px-2 py-1.5 active:cursor-grabbing"
            onPointerDown={onPanelHandleDown}
            title={labels?.dragHint ?? "Drag to move"}
          >
            <span className="text-[10px] font-medium text-slate-300">
              {labels?.dragHint ?? "Drag to move · Style"}
            </span>
            <span className="text-[10px] text-slate-500" aria-hidden>
              ⋮⋮
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 p-2 text-[10px] text-slate-200">
            <label className="space-y-0.5">
              <span>{labels?.fontSize ?? "Size"}</span>
              <input
                type="range"
                min={70}
                max={160}
                step={5}
                value={Math.round(sizeScale * 100)}
                onChange={(e) =>
                  patchStyle({ fontSizeScale: Number(e.target.value) / 100 })
                }
                className="w-full accent-cyan-500"
              />
            </label>
            <label className="space-y-0.5">
              <span>{labels?.shadow ?? "Shadow"}</span>
              <input
                type="range"
                min={0}
                max={16}
                step={1}
                value={shadowBlur}
                onChange={(e) =>
                  patchStyle({ shadowBlur: Number(e.target.value) })
                }
                className="w-full accent-cyan-500"
              />
            </label>
            <label className="flex items-center justify-between gap-1">
              <span>{labels?.fill ?? "Fill"}</span>
              <input
                type="color"
                value={/^#/.test(fillVal) ? fillVal : "#ffffff"}
                onChange={(e) => patchStyle({ fill: e.target.value })}
                className="h-6 w-8 cursor-pointer rounded border-0 bg-transparent"
              />
            </label>
            <label className="flex items-center justify-between gap-1">
              <span>{labels?.outline ?? "Outline"}</span>
              <input
                type="color"
                value={/^#/.test(String(strokeVal)) ? String(strokeVal) : "#000000"}
                onChange={(e) => patchStyle({ stroke: e.target.value })}
                className="h-6 w-8 cursor-pointer rounded border-0 bg-transparent"
              />
            </label>
            <label className="col-span-2 flex items-center justify-between gap-1">
              <span>{labels?.shadowColor ?? "Shadow color"}</span>
              <input
                type="color"
                value={/^#/.test(shadowColor) ? shadowColor : "#000000"}
                onChange={(e) => patchStyle({ shadowColor: e.target.value })}
                className="h-6 w-8 cursor-pointer rounded border-0 bg-transparent"
              />
            </label>
          </div>
        </div>
      ) : null}
    </div>
  );
}
