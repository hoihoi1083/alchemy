"use client";

import { useCallback, useRef, useState } from "react";
import { useLocale } from "@/components/LocaleProvider";
import {
  CAPTION_STYLE_PRESET_IDS,
  CAPTION_STYLE_PRESETS,
  type CaptionStylePresetId,
} from "@/lib/caption-burn-styles";
import { newImageTextLayer, type ImageTextLayer } from "@/lib/image-text-overlay-types";

type DragState = {
  layerId: string;
  offsetX: number;
  offsetY: number;
};

type ImageTextOverlayEditorProps = {
  imageUrl: string;
  disabled?: boolean;
  initialLayers?: ImageTextLayer[];
  labels: {
    hint: string;
    dragHint: string;
    layerLabel: string;
    textPlaceholder: string;
    styleLabel: string;
    addLayerBtn: string;
    removeLayerBtn: string;
    applyBtn: string;
    applying: string;
    needLayer: string;
    restoreBtn?: string;
  };
  onApply: (layers: ImageTextLayer[]) => Promise<void>;
  onRestore?: () => void;
};

export function ImageTextOverlayEditor({
  imageUrl,
  disabled,
  initialLayers,
  labels,
  onApply,
  onRestore,
}: ImageTextOverlayEditorProps) {
  const { locale } = useLocale();
  const [layers, setLayers] = useState<ImageTextLayer[]>(
    initialLayers?.length ? initialLayers : [newImageTextLayer({ text: "Headline" })],
  );
  const [selectedId, setSelectedId] = useState<string | null>(layers[0]?.id ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);

  const selected = layers.find((l) => l.id === selectedId) ?? layers[0] ?? null;
  const labelLocale = locale === "zh-cn" || locale === "zh" ? "zh" : "en";

  const updateLayer = useCallback((id: string, patch: Partial<ImageTextLayer>) => {
    setLayers((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }, []);

  const startDrag = (e: React.PointerEvent, layer: ImageTextLayer) => {
    if (disabled || busy) return;
    e.preventDefault();
    setSelectedId(layer.id);
    const box = boxRef.current?.getBoundingClientRect();
    if (!box) return;
    const elX = (layer.xPct / 100) * box.width;
    const elY = (layer.yPct / 100) * box.height;
    dragRef.current = {
      layerId: layer.id,
      offsetX: e.clientX - box.left - elX,
      offsetY: e.clientY - box.top - elY,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const moveDrag = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    const box = boxRef.current?.getBoundingClientRect();
    if (!drag || !box) return;
    const x = e.clientX - box.left - drag.offsetX;
    const y = e.clientY - box.top - drag.offsetY;
    const xPct = Math.min(98, Math.max(2, (x / box.width) * 100));
    const yPct = Math.min(98, Math.max(2, (y / box.height) * 100));
    updateLayer(drag.layerId, { xPct, yPct });
  };

  const endDrag = () => {
    dragRef.current = null;
  };

  async function handleApply() {
    const ready = layers.filter((l) => l.text.trim());
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

      <div
        ref={boxRef}
        className={`relative mx-auto max-w-sm overflow-hidden rounded-xl border border-slate-600 bg-slate-950 ${disabled ? "opacity-60" : ""}`}
      >
        <img src={imageUrl} alt="" className="block w-full object-contain" draggable={false} />
        {layers
          .filter((l) => l.text.trim())
          .map((layer) => (
            <button
              key={layer.id}
              type="button"
              disabled={disabled || busy}
              onPointerDown={(e) => startDrag(e, layer)}
              onPointerMove={moveDrag}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              onClick={() => setSelectedId(layer.id)}
              className={`absolute max-w-[88%] -translate-x-1/2 -translate-y-1/2 cursor-move whitespace-pre-wrap px-1 text-center text-sm font-bold leading-tight text-white [text-shadow:0_0_4px_rgba(0,0,0,0.9),0_2px_8px_rgba(0,0,0,0.6)] ${
                selectedId === layer.id ? "ring-2 ring-violet-400 ring-offset-1 ring-offset-transparent" : ""
              }`}
              style={{ left: `${layer.xPct}%`, top: `${layer.yPct}%` }}
            >
              {layer.text}
            </button>
          ))}
      </div>

      <div className="space-y-3">
        {layers.map((layer, index) => (
          <div
            key={layer.id}
            className={`rounded-lg border p-3 ${
              selectedId === layer.id ? "border-emerald-500/60 bg-emerald-950/20" : "border-slate-600 bg-slate-950/50"
            }`}
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium text-slate-200">
                {labels.layerLabel.replace("{n}", String(index + 1))}
              </span>
              <button
                type="button"
                disabled={disabled || busy || layers.length <= 1}
                onClick={() => {
                  setLayers((prev) => prev.filter((l) => l.id !== layer.id));
                  if (selectedId === layer.id) setSelectedId(layers[0]?.id ?? null);
                }}
                className="text-[10px] text-slate-400 hover:text-red-300 disabled:opacity-40"
              >
                {labels.removeLayerBtn}
              </button>
            </div>
            <textarea
              value={layer.text}
              disabled={disabled || busy}
              rows={2}
              onChange={(e) => updateLayer(layer.id, { text: e.target.value })}
              onFocus={() => setSelectedId(layer.id)}
              placeholder={labels.textPlaceholder}
              className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-500"
            />
            <label className="mt-2 block text-[10px] font-medium text-slate-400">{labels.styleLabel}</label>
            <select
              value={layer.stylePreset}
              disabled={disabled || busy}
              onChange={(e) =>
                updateLayer(layer.id, { stylePreset: e.target.value as CaptionStylePresetId })
              }
              className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white"
            >
              {CAPTION_STYLE_PRESET_IDS.map((id) => (
                <option key={id} value={id}>
                  {labelLocale === "zh"
                    ? CAPTION_STYLE_PRESETS[id].labelZh
                    : CAPTION_STYLE_PRESETS[id].labelEn}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      {error && <p className="text-xs text-red-300">{error}</p>}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={disabled || busy || layers.length >= 8}
          onClick={() => {
            const layer = newImageTextLayer({ text: "", yPct: 30 + layers.length * 12 });
            setLayers((prev) => [...prev, layer]);
            setSelectedId(layer.id);
          }}
          className="rounded-lg border border-slate-600 px-3 py-2 text-xs text-slate-200 disabled:opacity-40"
        >
          {labels.addLayerBtn}
        </button>
        {onRestore && labels.restoreBtn && (
          <button
            type="button"
            disabled={disabled || busy}
            onClick={onRestore}
            className="rounded-lg border border-slate-600 px-3 py-2 text-xs text-slate-300 disabled:opacity-40"
          >
            {labels.restoreBtn}
          </button>
        )}
      </div>

      <button
        type="button"
        disabled={disabled || busy}
        onClick={() => void handleApply()}
        className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
      >
        {busy ? labels.applying : labels.applyBtn}
      </button>
    </div>
  );
}
