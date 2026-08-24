"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Stage,
  Layer,
  Image as KonvaImage,
  Transformer,
  Text as KonvaText,
  Rect,
} from "react-konva";
import type Konva from "konva";
import type { Stage as StageType } from "konva/lib/Stage";

type DecLayer = {
  id: string;
  kind: "text" | "object";
  label: string;
  text: string;
  xPct: number;
  yPct: number;
  wPct: number;
  hPct: number;
  cropDataUrl: string;
  editText?: string;
  useLiveText?: boolean;
  visible?: boolean;
  locked?: boolean;
  fontSize?: number;
  fill?: string;
  fontBold?: boolean;
};

type DecomposeResult = {
  width: number;
  height: number;
  backgroundDataUrl: string;
  layers: DecLayer[];
  debug?: {
    textDetected: number;
    objectsDetected: number;
    samRefined?: number;
    backgroundMode?: string;
  };
};

const HISTORY_MAX = 40;

function useHtmlImage(url: string | null) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    if (!url) {
      setImg(null);
      return;
    }
    const el = new window.Image();
    el.crossOrigin = "anonymous";
    el.onload = () => setImg(el);
    el.onerror = () => setImg(null);
    el.src = url;
  }, [url]);
  return img;
}

function LayerSprite({
  layer,
  stageW,
  stageH,
  selected,
  onSelect,
  onChange,
}: {
  layer: DecLayer;
  stageW: number;
  stageH: number;
  selected: boolean;
  onSelect: () => void;
  onChange: (patch: Partial<DecLayer>) => void;
}) {
  const img = useHtmlImage(layer.cropDataUrl);
  const imageRef = useRef<Konva.Image>(null);
  const textRef = useRef<Konva.Text>(null);
  const trRef = useRef<Konva.Transformer>(null);

  useEffect(() => {
    const node = layer.useLiveText ? textRef.current : imageRef.current;
    if (!selected || !trRef.current || !node) return;
    trRef.current.nodes([node]);
    trRef.current.getLayer()?.batchDraw();
  }, [selected, layer.useLiveText, layer.visible, img, layer.fontSize, layer.fill]);

  if (layer.visible === false) return null;

  const x = (layer.xPct / 100) * stageW;
  const y = (layer.yPct / 100) * stageH;
  const w = (layer.wPct / 100) * stageW;
  const h = (layer.hPct / 100) * stageH;
  const draggable = !layer.locked;
  const fontSize = layer.fontSize ?? Math.max(12, h * 0.72);

  const onDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    const n = e.target;
    onChange({
      xPct: (n.x() / stageW) * 100,
      yPct: (n.y() / stageH) * 100,
    });
  };

  const onTransformEnd = () => {
    const n = layer.useLiveText ? textRef.current : imageRef.current;
    if (!n) return;
    const scaleX = n.scaleX();
    const scaleY = n.scaleY();
    n.scaleX(1);
    n.scaleY(1);
    const next: Partial<DecLayer> = {
      xPct: (n.x() / stageW) * 100,
      yPct: (n.y() / stageH) * 100,
      wPct: ((n.width() * scaleX) / stageW) * 100,
      hPct: ((n.height() * scaleY) / stageH) * 100,
    };
    if (layer.useLiveText) {
      next.fontSize = Math.max(8, fontSize * scaleY);
    }
    onChange(next);
  };

  return (
    <>
      {layer.kind === "text" && layer.useLiveText ? (
        <KonvaText
          ref={textRef}
          id={layer.id}
          x={x}
          y={y}
          width={w}
          text={layer.editText ?? layer.text}
          fontSize={fontSize}
          fontStyle={layer.fontBold === false ? "normal" : "bold"}
          fill={layer.fill ?? "#111827"}
          draggable={draggable}
          onClick={onSelect}
          onTap={onSelect}
          onDragEnd={onDragEnd}
          onTransformEnd={onTransformEnd}
        />
      ) : img ? (
        <KonvaImage
          ref={imageRef}
          id={layer.id}
          x={x}
          y={y}
          image={img}
          width={w}
          height={h}
          draggable={draggable}
          onClick={onSelect}
          onTap={onSelect}
          onDragEnd={onDragEnd}
          onTransformEnd={onTransformEnd}
        />
      ) : (
        <Rect
          x={x}
          y={y}
          width={w}
          height={h}
          stroke="#a78bfa"
          dash={[4, 4]}
          draggable={draggable}
          onClick={onSelect}
          onTap={onSelect}
          onDragEnd={onDragEnd}
        />
      )}
      {selected && (
        <Transformer
          ref={trRef}
          rotateEnabled={false}
          borderStroke="#8b5cf6"
          anchorStroke="#8b5cf6"
          anchorFill="#fff"
          anchorSize={8}
          boundBoxFunc={(oldBox, newBox) =>
            newBox.width < 8 || newBox.height < 8 ? oldBox : newBox
          }
        />
      )}
    </>
  );
}

function ToolBtn({
  label,
  onClick,
  disabled,
  active,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`rounded-md px-2.5 py-1.5 text-xs font-medium disabled:opacity-40 ${
        active
          ? "bg-violet-500 text-white"
          : "border border-white/15 text-slate-200 hover:bg-white/5"
      }`}
    >
      {label}
    </button>
  );
}

export function EditImage2Client() {
  const fileRef = useRef<HTMLInputElement>(null);
  const stageRef = useRef<StageType>(null);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState<"upload" | "decompose" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DecomposeResult | null>(null);
  const [history, setHistory] = useState<DecLayer[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [stageSize, setStageSize] = useState({ w: 720, h: 720 });

  const layers = history[historyIndex] ?? [];
  const bgImg = useHtmlImage(result?.backgroundDataUrl ?? null);
  const selected = layers.find((l) => l.id === selectedId) ?? null;

  const commitLayers = useCallback(
    (next: DecLayer[] | ((prev: DecLayer[]) => DecLayer[])) => {
      setHistory((h) => {
        const cur = h[historyIndex] ?? [];
        const resolved = typeof next === "function" ? next(cur) : next;
        const trimmed = h.slice(0, historyIndex + 1);
        const stacked = [...trimmed, resolved].slice(-HISTORY_MAX);
        setHistoryIndex(stacked.length - 1);
        return stacked;
      });
    },
    [historyIndex],
  );

  const undo = useCallback(() => {
    setHistoryIndex((i) => Math.max(0, i - 1));
  }, []);
  const redo = useCallback(() => {
    setHistoryIndex((i) => Math.min(history.length - 1, i + 1));
  }, [history.length]);

  const fitStage = useCallback((iw: number, ih: number) => {
    const maxW = Math.min(920, typeof window !== "undefined" ? window.innerWidth - 48 : 920);
    const maxH = typeof window !== "undefined" ? Math.min(680, window.innerHeight - 260) : 680;
    const scale = Math.min(maxW / iw, maxH / ih, 1);
    setStageSize({ w: Math.round(iw * scale), h: Math.round(ih * scale) });
  }, []);

  useEffect(() => {
    if (result) fitStage(result.width, result.height);
  }, [result, fitStage]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }
      if (meta && (e.key.toLowerCase() === "y" || (e.key.toLowerCase() === "z" && e.shiftKey))) {
        e.preventDefault();
        redo();
        return;
      }
      if ((e.key === "Delete" || e.key === "Backspace") && selectedId) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA") return;
        e.preventDefault();
        commitLayers((prev) => prev.filter((l) => l.id !== selectedId));
        setSelectedId(null);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo, selectedId, commitLayers]);

  async function onPickFile(file: File) {
    setError(null);
    setResult(null);
    setHistory([[]]);
    setHistoryIndex(0);
    setSelectedId(null);
    setBusy("upload");
    try {
      const fd = new FormData();
      fd.set("file", file);
      const up = await fetch("/api/upload-canvas-asset", { method: "POST", body: fd });
      const upJson = (await up.json()) as { url?: string; error?: string };
      if (!up.ok || !upJson.url) throw new Error(upJson.error || "Upload failed");
      setSourceUrl(upJson.url);

      setBusy("decompose");
      const dec = await fetch("/api/decompose-image-layers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_url: upJson.url }),
      });
      const decJson = (await dec.json()) as DecomposeResult & { error?: string };
      if (!dec.ok) throw new Error(decJson.error || "Decompose failed");
      setResult(decJson);
      const seeded = (decJson.layers ?? []).map((l) => ({
        ...l,
        editText: l.text,
        useLiveText: false,
        visible: true,
        locked: false,
        fontBold: true,
        fill: "#111827",
      }));
      setHistory([seeded]);
      setHistoryIndex(0);
      if (seeded[0]) setSelectedId(seeded[0].id);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something failed");
    } finally {
      setBusy(null);
    }
  }

  function patchLayer(id: string, patch: Partial<DecLayer>) {
    commitLayers((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }

  function duplicateSelected() {
    if (!selected) return;
    const copy: DecLayer = {
      ...selected,
      id: crypto.randomUUID(),
      xPct: Math.min(92, selected.xPct + 3),
      yPct: Math.min(92, selected.yPct + 3),
      label: `${selected.label} copy`,
    };
    commitLayers((prev) => {
      const idx = prev.findIndex((l) => l.id === selected.id);
      const next = [...prev];
      next.splice(idx + 1, 0, copy);
      return next;
    });
    setSelectedId(copy.id);
  }

  function moveLayer(dir: "up" | "down" | "top" | "bottom") {
    if (!selected) return;
    commitLayers((prev) => {
      const i = prev.findIndex((l) => l.id === selected.id);
      if (i < 0) return prev;
      const next = [...prev];
      const [item] = next.splice(i, 1);
      if (!item) return prev;
      let j = i;
      if (dir === "up") j = Math.min(next.length, i + 1);
      if (dir === "down") j = Math.max(0, i - 1);
      if (dir === "top") j = next.length;
      if (dir === "bottom") j = 0;
      next.splice(j, 0, item);
      return next;
    });
  }

  function downloadPng() {
    const stage = stageRef.current;
    if (!stage || !result) return;
    setSelectedId(null);
    requestAnimationFrame(() => {
      const uri = stage.toDataURL({ pixelRatio: result.width / stageSize.w, mimeType: "image/png" });
      const a = document.createElement("a");
      a.href = uri;
      a.download = "alchemy-smart-layers.png";
      a.click();
    });
  }

  const layerList = useMemo(
    () =>
      [...layers].reverse().map((l, revI) => {
        const i = layers.length - 1 - revI;
        return {
          ...l,
          title:
            l.kind === "text"
              ? `Text: ${(l.editText || l.text || l.label).slice(0, 28)}`
              : `Object: ${l.label.slice(0, 28)}`,
          stackIndex: i,
        };
      }),
    [layers],
  );

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-4 px-3 pb-24 pt-4 sm:px-6 lg:px-8">
      <header className="text-center">
        <p className="text-xs font-medium tracking-wide text-violet-300">TEST · edit-image-2</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          AI smart layers
        </h1>
        <p className="mx-auto mt-2 max-w-2xl text-sm text-slate-400">
          Canva-style: OCR + SAM cutouts, then <strong className="font-medium text-slate-300">FLUX erase</strong>{" "}
          heals the background — move text and the hole should look like real scene, not blur.
        </p>
      </header>

      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          disabled={!!busy}
          onClick={() => fileRef.current?.click()}
          className="rounded-full bg-violet-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-violet-400 disabled:opacity-50"
        >
          {busy === "upload"
            ? "Uploading…"
            : busy === "decompose"
              ? "Analyzing… (OCR + SAM + erase)"
              : "Upload image"}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onPickFile(f);
            e.target.value = "";
          }}
        />
        <ToolBtn label="Undo" onClick={undo} disabled={historyIndex <= 0} />
        <ToolBtn label="Redo" onClick={redo} disabled={historyIndex >= history.length - 1} />
        <ToolBtn label="Download PNG" onClick={downloadPng} disabled={!result} />
        {result && (
          <span className="text-xs text-slate-400">
            {layers.length} layers · OCR {result.debug?.textDetected ?? "?"} · objects{" "}
            {result.debug?.objectsDetected ?? "?"} · SAM {result.debug?.samRefined ?? 0} · bg{" "}
            {result.debug?.backgroundMode ?? "?"}
          </span>
        )}
      </div>

      {error && (
        <p className="rounded-lg border border-red-500/40 bg-red-950/40 px-3 py-2 text-center text-sm text-red-200">
          {error}
        </p>
      )}

      {/* Canva-like text toolbar */}
      {selected?.kind === "text" && (
        <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center justify-center gap-2 rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2">
          <ToolBtn
            label="Live text"
            active={!!selected.useLiveText}
            onClick={() =>
              patchLayer(selected.id, { useLiveText: !selected.useLiveText })
            }
          />
          <label className="flex items-center gap-1 text-xs text-slate-300">
            Size
            <input
              type="number"
              min={8}
              max={200}
              className="w-14 rounded border border-white/15 bg-black/40 px-1 py-0.5"
              value={Math.round(
                selected.fontSize ??
                  Math.max(12, (selected.hPct / 100) * stageSize.h * 0.72),
              )}
              onChange={(e) =>
                patchLayer(selected.id, {
                  fontSize: Number(e.target.value) || 16,
                  useLiveText: true,
                })
              }
            />
          </label>
          <label className="flex items-center gap-1 text-xs text-slate-300">
            Color
            <input
              type="color"
              value={selected.fill ?? "#111827"}
              onChange={(e) =>
                patchLayer(selected.id, { fill: e.target.value, useLiveText: true })
              }
            />
          </label>
          <ToolBtn
            label="Bold"
            active={selected.fontBold !== false}
            onClick={() =>
              patchLayer(selected.id, {
                fontBold: selected.fontBold === false,
                useLiveText: true,
              })
            }
          />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <div className="overflow-auto rounded-2xl border border-white/10 bg-slate-950/60 p-3">
          {!result ? (
            <div className="flex min-h-[360px] items-center justify-center text-sm text-slate-500">
              {busy ? "Working…" : "Upload a marketing image to decompose"}
            </div>
          ) : (
            <div className="mx-auto w-fit">
              <Stage
                ref={stageRef}
                width={stageSize.w}
                height={stageSize.h}
                onMouseDown={(e) => {
                  if (e.target === e.target.getStage()) setSelectedId(null);
                }}
              >
                <Layer>
                  {bgImg && (
                    <KonvaImage
                      image={bgImg}
                      width={stageSize.w}
                      height={stageSize.h}
                      listening={false}
                    />
                  )}
                  {layers.map((layer) => (
                    <LayerSprite
                      key={layer.id}
                      layer={layer}
                      stageW={stageSize.w}
                      stageH={stageSize.h}
                      selected={layer.id === selectedId}
                      onSelect={() => setSelectedId(layer.id)}
                      onChange={(patch) => patchLayer(layer.id, patch)}
                    />
                  ))}
                </Layer>
              </Stage>
            </div>
          )}
        </div>

        <aside className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-slate-950/60 p-3">
          <h2 className="text-sm font-semibold text-white">Layers</h2>
          <p className="text-[11px] text-slate-500">
            ⌘Z undo · ⌘⇧Z redo · Delete removes · drag on canvas
          </p>
          <ul className="max-h-[380px] space-y-1 overflow-auto text-sm">
            {layerList.map((l) => (
              <li key={l.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(l.id)}
                  className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left ${
                    l.id === selectedId
                      ? "bg-violet-500/30 text-white"
                      : "text-slate-300 hover:bg-white/5"
                  }`}
                >
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${
                      l.kind === "text" ? "bg-sky-400" : "bg-amber-400"
                    }`}
                  />
                  <span className="truncate">{l.title}</span>
                </button>
              </li>
            ))}
            {!layerList.length && <li className="text-xs text-slate-500">No layers yet</li>}
          </ul>

          {selected && (
            <div className="space-y-2 border-t border-white/10 pt-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">Selected</p>
              <div className="flex flex-wrap gap-1.5">
                <ToolBtn label="Duplicate" onClick={duplicateSelected} />
                <ToolBtn label="Forward" onClick={() => moveLayer("up")} />
                <ToolBtn label="Backward" onClick={() => moveLayer("down")} />
                <ToolBtn label="To front" onClick={() => moveLayer("top")} />
                <ToolBtn label="To back" onClick={() => moveLayer("bottom")} />
              </div>
              <label className="flex items-center gap-2 text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={selected.visible !== false}
                  onChange={(e) => patchLayer(selected.id, { visible: e.target.checked })}
                />
                Visible
              </label>
              <label className="flex items-center gap-2 text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={!!selected.locked}
                  onChange={(e) => patchLayer(selected.id, { locked: e.target.checked })}
                />
                Locked
              </label>
              {selected.kind === "text" && (
                <textarea
                  className="min-h-[72px] w-full rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-sm text-white"
                  value={selected.editText ?? selected.text}
                  onChange={(e) =>
                    patchLayer(selected.id, {
                      editText: e.target.value,
                      useLiveText: true,
                    })
                  }
                  placeholder="Edit text…"
                />
              )}
              <button
                type="button"
                className="w-full rounded-lg border border-red-400/30 px-2 py-1.5 text-xs text-red-200 hover:bg-red-500/10"
                onClick={() => {
                  commitLayers((prev) => prev.filter((l) => l.id !== selected.id));
                  setSelectedId(null);
                }}
              >
                Delete layer
              </button>
            </div>
          )}

          {sourceUrl && (
            <a
              href={sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="truncate text-[11px] text-violet-300/80 hover:underline"
            >
              Source URL
            </a>
          )}
        </aside>
      </div>
    </div>
  );
}
