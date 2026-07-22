"use client";

import { useEffect, useRef, useState } from "react";
import { Stage, Layer, Image as KonvaImage, Line, Rect } from "react-konva";
import type Konva from "konva";
import {
  clampRegion,
  MAX_IMAGE_EDIT_REGIONS,
  newImageEditRegion,
  type ImageEditRegion,
} from "@/lib/image-edit-region";
import { drawRegionsOnMaskCanvas } from "@/lib/regions-to-inpaint-mask";
import { CanvasHistoryNav } from "@/components/studio/CanvasHistoryNav";

const DEFAULT_STAGE_WIDTH = 400;
const BRUSH_SIZE = 24;

type MaskMode = "brush" | "box";

type ImageInpaintMaskEditorProps = {
  imageUrl: string;
  disabled?: boolean;
  initialRegions?: ImageEditRegion[] | null;
  initialPrompt?: string;
  labels: {
    hint: string;
    brushLabel: string;
    boxLabel?: string;
    modeBrush?: string;
    modeBox?: string;
    clearBtn: string;
    promptPlaceholder: string;
    applyBtn: string;
    applying: string;
    needMask: string;
    presetRemoveText?: string;
    presetRemoveLogo?: string;
    presetSeamless?: string;
    eraseBtn?: string;
    fillBtn?: string;
    multiRegionHint?: string;
    regionCountLabel?: (n: number) => string;
    removeRegionBtn?: string;
    deleteSelectedBtn?: string;
    undoBrushBtn?: string;
    maxRegions?: string;
  };
  onApply: (maskBlob: Blob, prompt: string, mode?: "erase" | "fill") => Promise<void>;
  /** When true, primary action erases masked area (no prompt required). */
  eraseMode?: boolean;
  imageHistory?: {
    canPrev: boolean;
    canNext: boolean;
    onPrev: () => void;
    onNext: () => void;
    prevLabel: string;
    nextLabel: string;
    versionLabel?: string;
    recoverLabel?: string;
    onRecover?: () => void;
    canRecover?: boolean;
  };
};

function useHtmlImage(src: string) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => setImage(img);
    img.src = src;
  }, [src]);
  return image;
}

function pointInBox(
  px: number,
  py: number,
  box: ImageEditRegion,
  stageW: number,
  stageH: number,
): boolean {
  const x = (box.xPct / 100) * stageW;
  const y = (box.yPct / 100) * stageH;
  const w = (box.wPct / 100) * stageW;
  const h = (box.hPct / 100) * stageH;
  return px >= x && px <= x + w && py >= y && py <= y + h;
}

function boxFromDrag(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  stageW: number,
  stageH: number,
): Pick<ImageEditRegion, "xPct" | "yPct" | "wPct" | "hPct"> {
  const left = Math.min(x0, x1);
  const top = Math.min(y0, y1);
  const w = Math.abs(x1 - x0);
  const h = Math.abs(y1 - y0);
  return clampRegion(
    newImageEditRegion({
      xPct: (left / stageW) * 100,
      yPct: (top / stageH) * 100,
      wPct: (w / stageW) * 100,
      hPct: (h / stageH) * 100,
    }),
  );
}

export function ImageInpaintMaskEditor({
  imageUrl,
  disabled,
  initialRegions,
  initialPrompt,
  labels,
  onApply,
  eraseMode = false,
  imageHistory,
}: ImageInpaintMaskEditorProps) {
  const bgImage = useHtmlImage(imageUrl);
  const [stageWidth, setStageWidth] = useState(DEFAULT_STAGE_WIDTH);
  const [stageHeight, setStageHeight] = useState(640);
  const [mode, setMode] = useState<MaskMode>("box");
  const [lines, setLines] = useState<number[][]>([]);
  const [boxes, setBoxes] = useState<ImageEditRegion[]>([]);
  const [selectedBoxId, setSelectedBoxId] = useState<string | null>(null);
  const [boxDrag, setBoxDrag] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(
    null,
  );
  const [drawing, setDrawing] = useState(false);
  const [prompt, setPrompt] = useState(initialPrompt ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const stageBoxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = stageBoxRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const apply = () => {
      const w = Math.max(280, Math.min(720, Math.floor(el.clientWidth)));
      setStageWidth(w);
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!bgImage?.naturalWidth) return;
    setStageHeight(Math.round(stageWidth * (bgImage.naturalHeight / bgImage.naturalWidth)));
  }, [bgImage, stageWidth]);

  useEffect(() => {
    if (initialPrompt) setPrompt(initialPrompt);
  }, [initialPrompt]);

  useEffect(() => {
    if (initialRegions?.length) {
      setBoxes(initialRegions.map((r) => newImageEditRegion({ ...r, instruction: "" })));
    }
  }, [initialRegions]);

  function removeBox(id: string) {
    setBoxes((prev) => prev.filter((b) => b.id !== id));
    setSelectedBoxId((prev) => (prev === id ? null : prev));
  }

  function undoLastBrushStroke() {
    setLines((prev) => prev.slice(0, -1));
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key !== "Delete" && e.key !== "Backspace") return;
      if (selectedBoxId) {
        e.preventDefault();
        removeBox(selectedBoxId);
      } else if (lines.length > 0) {
        e.preventDefault();
        undoLastBrushStroke();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedBoxId, lines.length]);

  async function exportMask(): Promise<Blob | null> {
    const hasMask = lines.length > 0 || boxes.length > 0 || (initialRegions?.length ?? 0) > 0;
    if (!hasMask || !bgImage) return null;
    const w = bgImage.naturalWidth;
    const h = bgImage.naturalHeight;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, w, h);

    const allBoxes = [
      ...(initialRegions ?? []),
      ...boxes.map((b) => ({ ...b, instruction: "" })),
    ];
    if (allBoxes.length) {
      drawRegionsOnMaskCanvas(ctx, allBoxes, w, h);
    }

    const scaleX = w / stageWidth;
    const scaleY = h / stageHeight;
    ctx.strokeStyle = "white";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = BRUSH_SIZE * scaleX;
    for (const pts of lines) {
      if (pts.length < 4) continue;
      ctx.beginPath();
      ctx.moveTo(pts[0] * scaleX, pts[1] * scaleY);
      for (let i = 2; i < pts.length; i += 2) {
        ctx.lineTo(pts[i] * scaleX, pts[i + 1] * scaleY);
      }
      ctx.stroke();
    }
    return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/png"));
  }

  async function handleApply(mode: "erase" | "fill" = eraseMode ? "erase" : "fill") {
    if (mode === "fill" && !prompt.trim()) {
      setError(labels.promptPlaceholder);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const blob = await exportMask();
      if (!blob) {
        setError(labels.needMask);
        return;
      }
      await onApply(blob, prompt.trim(), mode);
      if (mode === "fill") setPrompt("");
      // Keep boxes/lines visible until user accepts preview (parent updates image).
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Inpaint failed");
    } finally {
      setBusy(false);
    }
  }

  function clearMask() {
    setLines([]);
    setBoxes([]);
    setSelectedBoxId(null);
    setBoxDrag(null);
  }

  const draftBox =
    boxDrag && boxDrag.x1 !== boxDrag.x0 && boxDrag.y1 !== boxDrag.y0
      ? boxFromDrag(boxDrag.x0, boxDrag.y0, boxDrag.x1, boxDrag.y1, stageWidth, stageHeight)
      : null;

  const modeBrushLabel = labels.modeBrush ?? "Brush";
  const modeBoxLabel = labels.modeBox ?? "Highlight box";

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-400">{labels.hint}</p>

      <div className="flex flex-wrap gap-1">
        <button
          type="button"
          disabled={disabled || busy}
          onClick={() => setMode("box")}
          className={`rounded border px-2.5 py-1 text-xs ${
            mode === "box"
              ? "border-violet-500 bg-violet-950/50 text-violet-100"
              : "border-slate-600 text-slate-400"
          }`}
        >
          {modeBoxLabel}
        </button>
        <button
          type="button"
          disabled={disabled || busy}
          onClick={() => setMode("brush")}
          className={`rounded border px-2.5 py-1 text-xs ${
            mode === "brush"
              ? "border-violet-500 bg-violet-950/50 text-violet-100"
              : "border-slate-600 text-slate-400"
          }`}
        >
          {modeBrushLabel}
        </button>
      </div>

      <p className="text-[10px] text-violet-300">
        {mode === "box" ? (labels.boxLabel ?? labels.brushLabel) : labels.brushLabel}
      </p>
      {labels.multiRegionHint && (
        <p className="text-[10px] text-slate-500">{labels.multiRegionHint}</p>
      )}
      {(boxes.length > 0 || lines.length > 0) && labels.regionCountLabel && (
        <p className="text-[10px] text-amber-300/90">
          {labels.regionCountLabel(boxes.length + (lines.length > 0 ? 1 : 0))}
        </p>
      )}
      {boxes.length >= MAX_IMAGE_EDIT_REGIONS && labels.maxRegions && (
        <p className="text-[10px] text-amber-400">{labels.maxRegions}</p>
      )}

      {(selectedBoxId || lines.length > 0) && (
        <div className="flex flex-wrap gap-2">
          {selectedBoxId && (
            <button
              type="button"
              disabled={disabled || busy}
              onClick={() => removeBox(selectedBoxId)}
              className="rounded-lg border border-red-700/60 bg-red-950/30 px-3 py-1 text-xs font-medium text-red-200 hover:bg-red-950/50"
            >
              {labels.deleteSelectedBtn ?? "Delete selected area"}
            </button>
          )}
          {lines.length > 0 && (
            <button
              type="button"
              disabled={disabled || busy}
              onClick={undoLastBrushStroke}
              className="rounded-lg border border-slate-600 px-3 py-1 text-xs text-slate-300 hover:border-slate-500"
            >
              {labels.undoBrushBtn ?? "Undo brush stroke"}
            </button>
          )}
        </div>
      )}

      {boxes.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {boxes.map((box, i) => (
            <div
              key={box.id}
              className={`flex items-center rounded border text-[10px] ${
                selectedBoxId === box.id
                  ? "border-amber-400 bg-amber-950/40 text-amber-100"
                  : "border-slate-600 text-slate-400"
              }`}
            >
              <button
                type="button"
                disabled={disabled || busy}
                onClick={() => setSelectedBoxId(box.id)}
                className="px-2 py-0.5 hover:text-slate-200 disabled:opacity-40"
              >
                {labels.removeRegionBtn ?? "Area"} #{i + 1}
              </button>
              <button
                type="button"
                disabled={disabled || busy}
                onClick={() => removeBox(box.id)}
                aria-label={labels.deleteSelectedBtn ?? "Delete"}
                className="border-l border-slate-600 px-1.5 py-0.5 text-red-400 hover:bg-red-950/40 hover:text-red-300 disabled:opacity-40"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <div ref={stageBoxRef} className="relative w-full overflow-hidden rounded-lg border border-violet-700 bg-black">
        {imageHistory && (
          <CanvasHistoryNav
            disabled={disabled || busy}
            canPrev={imageHistory.canPrev}
            canNext={imageHistory.canNext}
            onPrev={imageHistory.onPrev}
            onNext={imageHistory.onNext}
            prevLabel={imageHistory.prevLabel}
            nextLabel={imageHistory.nextLabel}
            versionLabel={imageHistory.versionLabel}
            recoverLabel={imageHistory.recoverLabel}
            onRecover={imageHistory.onRecover}
            canRecover={imageHistory.canRecover}
          />
        )}
        {bgImage && (
          <Stage
            ref={stageRef}
            width={stageWidth}
            height={stageHeight}
            onPointerDown={(e) => {
              if (disabled || busy) return;
              const pos = e.target.getStage()?.getPointerPosition();
              if (!pos) return;
              if (mode === "box") {
                const hit = [...boxes].reverse().find((b) => pointInBox(pos.x, pos.y, b, stageWidth, stageHeight));
                if (hit) {
                  setSelectedBoxId(hit.id);
                  return;
                }
                setSelectedBoxId(null);
                setBoxDrag({ x0: pos.x, y0: pos.y, x1: pos.x, y1: pos.y });
                return;
              }
              setDrawing(true);
              setLines((prev) => [...prev, [pos.x, pos.y]]);
            }}
            onPointerMove={(e) => {
              const pos = e.target.getStage()?.getPointerPosition();
              if (!pos) return;
              if (mode === "box" && boxDrag) {
                setBoxDrag((d) => (d ? { ...d, x1: pos.x, y1: pos.y } : null));
                return;
              }
              if (!drawing || disabled || busy) return;
              setLines((prev) => {
                const last = prev[prev.length - 1];
                if (!last) return prev;
                return [...prev.slice(0, -1), [...last, pos.x, pos.y]];
              });
            }}
            onPointerUp={() => {
              if (mode === "box" && boxDrag) {
                const next = boxFromDrag(
                  boxDrag.x0,
                  boxDrag.y0,
                  boxDrag.x1,
                  boxDrag.y1,
                  stageWidth,
                  stageHeight,
                );
                if (next.wPct >= 2 && next.hPct >= 2) {
                  setBoxes((prev) => {
                    if (prev.length >= MAX_IMAGE_EDIT_REGIONS) return prev;
                    return [...prev, newImageEditRegion({ ...next, instruction: "" })];
                  });
                }
                setBoxDrag(null);
                return;
              }
              setDrawing(false);
            }}
          >
            <Layer>
              <KonvaImage image={bgImage} width={stageWidth} height={stageHeight} listening={false} />
              {boxes.map((box) => {
                const selected = selectedBoxId === box.id;
                return (
                  <Rect
                    key={box.id}
                    x={(box.xPct / 100) * stageWidth}
                    y={(box.yPct / 100) * stageHeight}
                    width={(box.wPct / 100) * stageWidth}
                    height={(box.hPct / 100) * stageHeight}
                    stroke={selected ? "#34d399" : "#fbbf24"}
                    strokeWidth={selected ? 3 : 2}
                    dash={selected ? undefined : [6, 4]}
                    fill={selected ? "rgba(52,211,153,0.25)" : "rgba(255,255,255,0.2)"}
                    listening={false}
                  />
                );
              })}
              {draftBox && (
                <Rect
                  x={(draftBox.xPct / 100) * stageWidth}
                  y={(draftBox.yPct / 100) * stageHeight}
                  width={(draftBox.wPct / 100) * stageWidth}
                  height={(draftBox.hPct / 100) * stageHeight}
                  stroke="#a78bfa"
                  strokeWidth={2}
                  fill="rgba(167,139,250,0.25)"
                  listening={false}
                />
              )}
              <Rect width={stageWidth} height={stageHeight} fill="transparent" />
              {lines.map((pts, i) => (
                <Line
                  key={`stroke-${i}`}
                  points={pts}
                  stroke="rgba(255,255,255,0.55)"
                  strokeWidth={BRUSH_SIZE}
                  lineCap="round"
                  lineJoin="round"
                />
              ))}
            </Layer>
          </Stage>
        )}
      </div>

      {(labels.presetRemoveText || labels.presetRemoveLogo || labels.presetSeamless) && (
        <div className="flex flex-wrap gap-1">
          {labels.presetRemoveText && (
            <button
              type="button"
              disabled={disabled || busy}
              onClick={() => setPrompt(labels.presetRemoveText!)}
              className="rounded border border-slate-600 px-2 py-0.5 text-[10px] text-slate-300"
            >
              {labels.presetRemoveText}
            </button>
          )}
          {labels.presetRemoveLogo && (
            <button
              type="button"
              disabled={disabled || busy}
              onClick={() => setPrompt(labels.presetRemoveLogo!)}
              className="rounded border border-slate-600 px-2 py-0.5 text-[10px] text-slate-300"
            >
              {labels.presetRemoveLogo}
            </button>
          )}
          {labels.presetSeamless && (
            <button
              type="button"
              disabled={disabled || busy}
              onClick={() => setPrompt(labels.presetSeamless!)}
              className="rounded border border-slate-600 px-2 py-0.5 text-[10px] text-slate-300"
            >
              {labels.presetSeamless}
            </button>
          )}
        </div>
      )}

      <input
        type="text"
        disabled={disabled || busy}
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder={labels.promptPlaceholder}
        className="w-full rounded border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white"
      />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={disabled || busy}
          onClick={clearMask}
          className="rounded border border-slate-600 px-3 py-1 text-xs text-slate-200"
        >
          {labels.clearBtn}
        </button>
        {eraseMode ? (
          <>
            <button
              type="button"
              disabled={disabled || busy}
              onClick={() => void handleApply("erase")}
              className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
            >
              {busy ? labels.applying : labels.eraseBtn ?? labels.applyBtn}
            </button>
            <button
              type="button"
              disabled={disabled || busy}
              onClick={() => void handleApply("fill")}
              className="rounded-lg border border-violet-600 px-4 py-2 text-sm text-violet-200 disabled:opacity-40"
            >
              {labels.fillBtn ?? "Replace with prompt"}
            </button>
          </>
        ) : (
          <button
            type="button"
            disabled={disabled || busy}
            onClick={() => void handleApply("fill")}
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
          >
            {busy ? labels.applying : labels.applyBtn}
          </button>
        )}
      </div>
      {error && <p className="text-xs text-red-300">{error}</p>}
    </div>
  );
}
