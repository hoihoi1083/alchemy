"use client";

import { useCallback, useRef, useState } from "react";
import {
  MAX_IMAGE_EDIT_REGIONS,
  clampRegion,
  newImageEditRegion,
  type ImageEditRegion,
} from "@/lib/image-edit-region";

type DrawState = {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
};

type ImageRegionFixEditorProps = {
  imageUrl: string;
  disabled?: boolean;
  labels: {
    hint: string;
    drawHint: string;
    zoneLabel: string;
    instructionPlaceholder: string;
    addZoneBtn: string;
    removeZoneBtn: string;
    applyBtn: string;
    applying: string;
    needZone: string;
    maxZones: string;
    inpaintBtn: string;
    inpaintDirectBtn: string;
  };
  onApply: (regions: ImageEditRegion[]) => Promise<void>;
  onConvertToInpaint?: (regions: ImageEditRegion[]) => void;
  onInpaintDirect?: (regions: ImageEditRegion[]) => Promise<void>;
};

function pctFromPointer(
  clientX: number,
  clientY: number,
  box: DOMRect,
): { xPct: number; yPct: number } {
  const xPct = Math.min(98, Math.max(2, ((clientX - box.left) / box.width) * 100));
  const yPct = Math.min(98, Math.max(2, ((clientY - box.top) / box.height) * 100));
  return { xPct, yPct };
}

function rectFromDraw(draw: DrawState, box: DOMRect): Pick<ImageEditRegion, "xPct" | "yPct" | "wPct" | "hPct"> {
  const start = pctFromPointer(draw.startX, draw.startY, box);
  const end = pctFromPointer(draw.currentX, draw.currentY, box);
  const xPct = Math.min(start.xPct, end.xPct);
  const yPct = Math.min(start.yPct, end.yPct);
  const wPct = Math.abs(end.xPct - start.xPct);
  const hPct = Math.abs(end.yPct - start.yPct);
  return clampRegion(newImageEditRegion({ xPct, yPct, wPct, hPct }));
}

export function ImageRegionFixEditor({
  imageUrl,
  disabled,
  labels,
  onApply,
  onConvertToInpaint,
  onInpaintDirect,
}: ImageRegionFixEditorProps) {
  const [regions, setRegions] = useState<ImageEditRegion[]>([]);
  const [draw, setDraw] = useState<DrawState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  const draftRect =
    draw && boxRef.current ? rectFromDraw(draw, boxRef.current.getBoundingClientRect()) : null;

  const finishDraw = useCallback(() => {
    if (!draw || !boxRef.current) {
      setDraw(null);
      return;
    }
    const next = rectFromDraw(draw, boxRef.current.getBoundingClientRect());
    if (next.wPct >= 3 && next.hPct >= 3) {
      setRegions((prev) => {
        if (prev.length >= MAX_IMAGE_EDIT_REGIONS) return prev;
        return [...prev, newImageEditRegion({ ...next, instruction: "" })];
      });
    }
    setDraw(null);
  }, [draw]);

  const updateRegion = (id: string, patch: Partial<ImageEditRegion>) => {
    setRegions((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const removeRegion = (id: string) => {
    setRegions((prev) => prev.filter((r) => r.id !== id));
  };

  async function handleApply() {
    const ready = regions.filter((r) => r.instruction.trim());
    if (!ready.length) {
      setError(labels.needZone);
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await onApply(ready);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-400">{labels.hint}</p>
      <p className="text-[10px] text-slate-500">{labels.drawHint}</p>

      <div
        ref={boxRef}
        className={`relative mx-auto max-w-sm select-none overflow-hidden rounded-xl border border-slate-600 bg-slate-950 ${disabled ? "opacity-60" : ""}`}
        onPointerDown={(e) => {
          if (disabled || regions.length >= MAX_IMAGE_EDIT_REGIONS) return;
          if ((e.target as HTMLElement).closest("[data-region-ui]")) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          setDraw({ startX: e.clientX, startY: e.clientY, currentX: e.clientX, currentY: e.clientY });
        }}
        onPointerMove={(e) => {
          if (!draw) return;
          setDraw((prev) => (prev ? { ...prev, currentX: e.clientX, currentY: e.clientY } : null));
        }}
        onPointerUp={finishDraw}
        onPointerCancel={finishDraw}
      >
        <img src={imageUrl} alt="" className="block w-full object-contain" draggable={false} />
        {regions.map((region, index) => (
          <div
            key={region.id}
            className="pointer-events-none absolute border-2 border-amber-400 bg-amber-400/10"
            style={{
              left: `${region.xPct}%`,
              top: `${region.yPct}%`,
              width: `${region.wPct}%`,
              height: `${region.hPct}%`,
            }}
          >
            <span className="absolute left-1 top-0 text-[10px] font-bold text-amber-200">
              {index + 1}
            </span>
          </div>
        ))}
        {draftRect && (
          <div
            className="pointer-events-none absolute border-2 border-dashed border-emerald-400 bg-emerald-400/10"
            style={{
              left: `${draftRect.xPct}%`,
              top: `${draftRect.yPct}%`,
              width: `${draftRect.wPct}%`,
              height: `${draftRect.hPct}%`,
            }}
          />
        )}
      </div>

      {regions.length >= MAX_IMAGE_EDIT_REGIONS && (
        <p className="text-xs text-amber-300">{labels.maxZones}</p>
      )}

      <div className="space-y-3" data-region-ui>
        {regions.map((region, index) => (
          <div key={region.id} className="rounded-lg border border-slate-600 bg-slate-950/50 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium text-slate-200">
                {labels.zoneLabel.replace("{n}", String(index + 1))}
              </span>
              <button
                type="button"
                disabled={disabled || busy}
                onClick={() => removeRegion(region.id)}
                className="text-[10px] text-slate-400 hover:text-red-300"
              >
                {labels.removeZoneBtn}
              </button>
            </div>
            <input
              type="text"
              value={region.instruction}
              disabled={disabled || busy}
              onChange={(e) => updateRegion(region.id, { instruction: e.target.value })}
              placeholder={labels.instructionPlaceholder}
              className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-500"
            />
          </div>
        ))}
      </div>

      {error && <p className="text-xs text-red-300">{error}</p>}

      <button
        type="button"
        disabled={disabled || busy || regions.length >= MAX_IMAGE_EDIT_REGIONS}
        onClick={() => setRegions((prev) => [...prev, newImageEditRegion()])}
        className="rounded-lg border border-slate-600 px-3 py-2 text-xs text-slate-200 disabled:opacity-40"
      >
        {labels.addZoneBtn}
      </button>

      <button
        type="button"
        disabled={disabled || busy}
        onClick={() => void handleApply()}
        className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
      >
        {busy ? labels.applying : labels.applyBtn}
      </button>

      {onConvertToInpaint && (
        <button
          type="button"
          disabled={disabled || busy || regions.length === 0}
          onClick={() => {
            const ready = regions.filter((r) => r.instruction.trim());
            if (!ready.length) {
              setError(labels.needZone);
              return;
            }
            setError(null);
            onConvertToInpaint(ready);
          }}
          className="w-full rounded-lg border border-violet-600 px-4 py-2.5 text-sm font-semibold text-violet-100 disabled:opacity-40"
        >
          {labels.inpaintBtn}
        </button>
      )}

      {onInpaintDirect && (
        <button
          type="button"
          disabled={disabled || busy || regions.length === 0}
          onClick={() => {
            const ready = regions.filter((r) => r.instruction.trim());
            if (!ready.length) {
              setError(labels.needZone);
              return;
            }
            setError(null);
            setBusy(true);
            void onInpaintDirect(ready).finally(() => setBusy(false));
          }}
          className="w-full rounded-lg bg-violet-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
        >
          {busy ? labels.applying : labels.inpaintDirectBtn}
        </button>
      )}
    </div>
  );
}
