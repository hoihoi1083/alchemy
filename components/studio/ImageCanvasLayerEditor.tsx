"use client";

import { useCallback, useRef, useState } from "react";
import { useLocale } from "@/components/LocaleProvider";
import {
  CAPTION_STYLE_PRESET_IDS,
  CAPTION_STYLE_PRESETS,
  type CaptionStylePresetId,
} from "@/lib/caption-burn-styles";
import {
  newImageCanvasTextLayer,
  newImageShapeLayer,
  type ImageCanvasLayer,
  type ImageShapeKind,
} from "@/lib/image-canvas-layers";

type DragState = { layerId: string; offsetX: number; offsetY: number };

type ImageCanvasLayerEditorProps = {
  imageUrl: string;
  disabled?: boolean;
  initialLayers?: ImageCanvasLayer[];
  labels: {
    hint: string;
    dragHint: string;
    textLayerLabel: string;
    shapeLayerLabel: string;
    textPlaceholder: string;
    styleLabel: string;
    colorLabel: string;
    addTextBtn: string;
    addShapeBtn: string;
    removeLayerBtn: string;
    applyBtn: string;
    applying: string;
    needLayer: string;
    restoreBtn?: string;
  };
  onApply: (layers: ImageCanvasLayer[]) => Promise<void>;
  onRestore?: () => void;
};

export function ImageCanvasLayerEditor({
  imageUrl,
  disabled,
  initialLayers,
  labels,
  onApply,
  onRestore,
}: ImageCanvasLayerEditorProps) {
  const { locale } = useLocale();
  const [layers, setLayers] = useState<ImageCanvasLayer[]>(
    initialLayers?.length ? initialLayers : [newImageCanvasTextLayer({ text: "Headline" })],
  );
  const [selectedId, setSelectedId] = useState<string | null>(layers[0]?.id ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const selected = layers.find((l) => l.id === selectedId) ?? layers[0] ?? null;
  const labelLocale = locale === "zh-cn" || locale === "zh" || locale === "zh-tw" ? "zh" : "en";

  const updateLayer = useCallback((id: string, patch: Partial<ImageCanvasLayer>) => {
    setLayers((prev) => prev.map((l) => (l.id === id ? ({ ...l, ...patch } as ImageCanvasLayer) : l)));
  }, []);

  const startDrag = (e: React.PointerEvent, layer: ImageCanvasLayer) => {
    if (disabled || busy) return;
    e.preventDefault();
    setSelectedId(layer.id);
    const box = boxRef.current?.getBoundingClientRect();
    if (!box) return;
    const elX = (layer.xPct / 100) * box.width;
    const elY = (layer.yPct / 100) * box.height;
    dragRef.current = { layerId: layer.id, offsetX: e.clientX - box.left - elX, offsetY: e.clientY - box.top - elY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const moveDrag = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    const box = boxRef.current?.getBoundingClientRect();
    if (!drag || !box) return;
    const xPct = Math.min(98, Math.max(2, ((e.clientX - box.left - drag.offsetX) / box.width) * 100));
    const yPct = Math.min(98, Math.max(2, ((e.clientY - box.top - drag.offsetY) / box.height) * 100));
    updateLayer(drag.layerId, { xPct, yPct });
  };

  const endDrag = () => {
    dragRef.current = null;
  };

  function addShape(shape: ImageShapeKind) {
    const layer = newImageShapeLayer({ shape, yPct: 20 + layers.length * 8 });
    setLayers((prev) => [...prev, layer]);
    setSelectedId(layer.id);
  }

  async function handleApply() {
    const ready = layers.filter((l) => (l.kind === "text" ? l.text.trim() : true));
    if (!ready.length) {
      setError(labels.needLayer);
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
      <p className="text-[10px] text-slate-500">{labels.dragHint}</p>
      <div ref={boxRef} className={`relative mx-auto max-w-sm overflow-hidden rounded-xl border border-slate-600 bg-slate-950 ${disabled ? "opacity-60" : ""}`}>
        <img src={imageUrl} alt="" className="block w-full object-contain" draggable={false} />
        {layers.map((layer) => {
          if (layer.kind === "shape") {
            return (
              <div
                key={layer.id}
                className={`absolute border-2 ${selectedId === layer.id ? "border-emerald-400" : "border-white/70"}`}
                style={{
                  left: `${layer.xPct}%`,
                  top: `${layer.yPct}%`,
                  width: `${layer.wPct}%`,
                  height: `${layer.hPct}%`,
                  backgroundColor: `${layer.color}33`,
                  borderColor: layer.color,
                }}
                onPointerDown={(e) => startDrag(e, layer)}
                onPointerMove={moveDrag}
                onPointerUp={endDrag}
              />
            );
          }
          if (layer.kind === "logo") return null;
          if (layer.kind !== "text" || !layer.text.trim()) return null;
          return (
            <button
              key={layer.id}
              type="button"
              disabled={disabled || busy}
              onPointerDown={(e) => startDrag(e, layer)}
              onPointerMove={moveDrag}
              onPointerUp={endDrag}
              onClick={() => setSelectedId(layer.id)}
              className={`absolute max-w-[88%] -translate-x-1/2 -translate-y-1/2 cursor-move whitespace-pre-wrap px-1 text-center text-sm font-bold text-white [text-shadow:0_0_4px_rgba(0,0,0,0.9)] ${selectedId === layer.id ? "ring-2 ring-emerald-400" : ""}`}
              style={{ left: `${layer.xPct}%`, top: `${layer.yPct}%` }}
            >
              {layer.text}
            </button>
          );
        })}
      </div>
      {selected && (
        <div className="rounded-lg border border-slate-600 bg-slate-950/50 p-3">
          {selected.kind === "text" ? (
            <>
              <textarea
                value={selected.text}
                disabled={disabled || busy}
                rows={2}
                onChange={(e) => updateLayer(selected.id, { text: e.target.value })}
                placeholder={labels.textPlaceholder}
                className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white"
              />
              <select
                value={selected.stylePreset}
                disabled={disabled || busy}
                onChange={(e) => updateLayer(selected.id, { stylePreset: e.target.value as CaptionStylePresetId })}
                className="mt-2 w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white"
              >
                {CAPTION_STYLE_PRESET_IDS.map((id) => (
                  <option key={id} value={id}>
                    {labelLocale === "zh" ? CAPTION_STYLE_PRESETS[id].labelZh : CAPTION_STYLE_PRESETS[id].labelEn}
                  </option>
                ))}
              </select>
            </>
          ) : selected.kind === "shape" ? (
            <>
              <label className="text-xs text-slate-400">{labels.colorLabel}</label>
              <input
                type="color"
                value={selected.color}
                disabled={disabled || busy}
                onChange={(e) => updateLayer(selected.id, { color: e.target.value })}
                className="mt-1 h-10 w-full"
              />
            </>
          ) : null}
        </div>
      )}
      {error && <p className="text-xs text-red-300">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={disabled || busy} onClick={() => { const l = newImageCanvasTextLayer(); setLayers((p) => [...p, l]); setSelectedId(l.id); }} className="rounded-lg border border-slate-600 px-3 py-2 text-xs text-slate-200">{labels.addTextBtn}</button>
        <button type="button" disabled={disabled || busy} onClick={() => addShape("rect")} className="rounded-lg border border-slate-600 px-3 py-2 text-xs text-slate-200">{labels.addShapeBtn} ▭</button>
        <button type="button" disabled={disabled || busy} onClick={() => addShape("circle")} className="rounded-lg border border-slate-600 px-3 py-2 text-xs text-slate-200">○</button>
        <button type="button" disabled={disabled || busy} onClick={() => addShape("line")} className="rounded-lg border border-slate-600 px-3 py-2 text-xs text-slate-200">／</button>
        <button type="button" disabled={disabled || busy} onClick={() => addShape("arrow")} className="rounded-lg border border-slate-600 px-3 py-2 text-xs text-slate-200">→</button>
        {onRestore && labels.restoreBtn && (
          <button type="button" disabled={disabled || busy} onClick={onRestore} className="rounded-lg border border-slate-600 px-3 py-2 text-xs text-slate-300">{labels.restoreBtn}</button>
        )}
      </div>
      <button type="button" disabled={disabled || busy} onClick={() => void handleApply()} className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40">{busy ? labels.applying : labels.applyBtn}</button>
    </div>
  );
}
