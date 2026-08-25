"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Stage,
  Layer,
  Image as KonvaImage,
  Transformer,
  Text as KonvaText,
  Rect,
  Circle,
  Line,
} from "react-konva";
import type Konva from "konva";
import type { Stage as StageType } from "konva/lib/Stage";
import {
  DEFAULT_BRAND_KIT,
  hydrateBrandKitFromCloud,
  loadBrandKitFromStorage,
  type BrandKit,
} from "@/lib/brand-kit";
import {
  blurPunchBackground,
  buildBrushMaskCanvas,
  cutoutFromSourceAndMask,
  dataUrlToBlob,
  loadImage,
  type BrushStroke,
} from "@/lib/edit-image-2-brush-cutout";
import { isLibraryAssetUrl } from "@/lib/storage/library-asset-url";

type ShapeKind = "rect" | "capsule" | "circle";

type DecLayer = {
  id: string;
  kind: "text" | "object" | "logo" | "shape";
  label: string;
  text: string;
  xPct: number;
  yPct: number;
  wPct: number;
  hPct: number;
  /** Cutout / logo bitmap — empty for live text & shapes. */
  cropDataUrl: string;
  shapeKind?: ShapeKind;
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

async function resolveLogoDisplayUrl(url: string): Promise<{ displayUrl: string; revoke: string | null }> {
  if (isLibraryAssetUrl(url) || url.includes("/api/library/download/")) {
    const res = await fetch(url, { credentials: "include", cache: "no-store" });
    if (!res.ok) throw new Error("Could not load brand logo");
    const blob = await res.blob();
    const revoke = URL.createObjectURL(blob);
    return { displayUrl: revoke, revoke };
  }
  return { displayUrl: url, revoke: null };
}

function LayerSprite({
  layer,
  stageW,
  stageH,
  selected,
  interactive,
  onSelect,
  onChange,
}: {
  layer: DecLayer;
  stageW: number;
  stageH: number;
  selected: boolean;
  /** False while brush-cutout mode is active. */
  interactive: boolean;
  onSelect: () => void;
  onChange: (patch: Partial<DecLayer>) => void;
}) {
  const img = useHtmlImage(
    layer.kind === "shape" || (layer.kind === "text" && layer.useLiveText)
      ? null
      : layer.cropDataUrl || null,
  );
  const imageRef = useRef<Konva.Image>(null);
  const textRef = useRef<Konva.Text>(null);
  const rectRef = useRef<Konva.Rect>(null);
  const circleRef = useRef<Konva.Circle>(null);
  const trRef = useRef<Konva.Transformer>(null);

  const activeNode = () => {
    if (layer.kind === "shape" && layer.shapeKind === "circle") return circleRef.current;
    if (layer.kind === "shape") return rectRef.current;
    if (layer.kind === "text" && layer.useLiveText) return textRef.current;
    return imageRef.current;
  };

  useEffect(() => {
    const node = activeNode();
    if (!selected || !trRef.current || !node) return;
    trRef.current.nodes([node]);
    trRef.current.getLayer()?.batchDraw();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- activeNode reads layer refs
  }, [
    selected,
    layer.useLiveText,
    layer.visible,
    layer.kind,
    layer.shapeKind,
    img,
    layer.fontSize,
    layer.fill,
  ]);

  if (layer.visible === false) return null;

  const x = (layer.xPct / 100) * stageW;
  const y = (layer.yPct / 100) * stageH;
  const w = (layer.wPct / 100) * stageW;
  const h = (layer.hPct / 100) * stageH;
  const draggable = interactive && !layer.locked;
  const fontSize = layer.fontSize ?? Math.max(12, h * 0.72);
  const fill = layer.fill ?? (layer.kind === "shape" ? "#8b5cf6" : "#111827");

  const onDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    const n = e.target;
    onChange({
      xPct: (n.x() / stageW) * 100,
      yPct: (n.y() / stageH) * 100,
    });
  };

  const onTransformEnd = () => {
    const n = activeNode();
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
    if (layer.kind === "text" && layer.useLiveText) {
      next.fontSize = Math.max(8, fontSize * scaleY);
    }
    onChange(next);
  };

  const common = {
    id: layer.id,
    draggable,
    listening: interactive,
    onClick: onSelect,
    onTap: onSelect,
    onDragEnd,
    onTransformEnd,
  };

  return (
    <>
      {layer.kind === "shape" && layer.shapeKind === "circle" ? (
        <Circle
          ref={circleRef}
          x={x + w / 2}
          y={y + h / 2}
          radius={Math.min(w, h) / 2}
          fill={fill}
          id={layer.id}
          draggable={draggable}
          listening={interactive}
          onClick={onSelect}
          onTap={onSelect}
          onDragEnd={(e) => {
            const n = e.target as Konva.Circle;
            const r = n.radius();
            onChange({
              xPct: ((n.x() - r) / stageW) * 100,
              yPct: ((n.y() - r) / stageH) * 100,
            });
          }}
          onTransformEnd={() => {
            const n = circleRef.current;
            if (!n) return;
            const scaleX = n.scaleX();
            n.scaleX(1);
            n.scaleY(1);
            const r = n.radius() * scaleX;
            onChange({
              xPct: ((n.x() - r) / stageW) * 100,
              yPct: ((n.y() - r) / stageH) * 100,
              wPct: ((r * 2) / stageW) * 100,
              hPct: ((r * 2) / stageH) * 100,
            });
          }}
        />
      ) : layer.kind === "shape" ? (
        <Rect
          ref={rectRef}
          x={x}
          y={y}
          width={w}
          height={h}
          cornerRadius={layer.shapeKind === "capsule" ? Math.min(w, h) / 2 : 4}
          fill={fill}
          {...common}
        />
      ) : layer.kind === "text" && layer.useLiveText ? (
        <KonvaText
          ref={textRef}
          x={x}
          y={y}
          width={w}
          text={layer.editText ?? layer.text}
          fontSize={fontSize}
          fontStyle={layer.fontBold === false ? "normal" : "bold"}
          fill={fill}
          {...common}
        />
      ) : img ? (
        <KonvaImage
          ref={imageRef}
          x={x}
          y={y}
          image={img}
          width={w}
          height={h}
          {...common}
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
          listening={interactive}
          onClick={onSelect}
          onTap={onSelect}
          onDragEnd={onDragEnd}
        />
      )}
      {selected && interactive && (
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
  title,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      title={title}
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

function kindDotClass(kind: DecLayer["kind"]) {
  if (kind === "text") return "bg-sky-400";
  if (kind === "logo") return "bg-emerald-400";
  if (kind === "shape") return "bg-fuchsia-400";
  return "bg-amber-400";
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
  const [brandKit, setBrandKit] = useState<BrandKit>(() =>
    typeof window !== "undefined" ? loadBrandKitFromStorage() : DEFAULT_BRAND_KIT,
  );
  const [logoBusy, setLogoBusy] = useState(false);
  const [brushMode, setBrushMode] = useState(false);
  const [brushSize, setBrushSize] = useState(28);
  const [brushLines, setBrushLines] = useState<BrushStroke[]>([]);
  const [brushBusy, setBrushBusy] = useState(false);
  const drawingRef = useRef(false);

  const layers = history[historyIndex] ?? [];
  const bgImg = useHtmlImage(result?.backgroundDataUrl ?? null);
  const selected = layers.find((l) => l.id === selectedId) ?? null;
  const canEdit = Boolean(result);
  const hasBrandLogo = Boolean(brandKit.logoUrl?.trim());

  useEffect(() => {
    let cancelled = false;
    void hydrateBrandKitFromCloud().then((kit) => {
      if (!cancelled) setBrandKit(kit);
    });
    return () => {
      cancelled = true;
    };
  }, []);

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
    setBrushMode(false);
    setBrushLines([]);
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

  function pushLayer(layer: DecLayer) {
    commitLayers((prev) => [...prev, layer]);
    setSelectedId(layer.id);
  }

  function addTextLayer() {
    if (!canEdit) return;
    const n = layers.length;
    pushLayer({
      id: crypto.randomUUID(),
      kind: "text",
      label: "New text",
      text: "New text",
      editText: "New text",
      useLiveText: true,
      cropDataUrl: "",
      xPct: 12 + (n % 5) * 4,
      yPct: 18 + (n % 5) * 6,
      wPct: 55,
      hPct: 8,
      visible: true,
      locked: false,
      fontBold: true,
      fontSize: 28,
      fill: "#111827",
    });
  }

  function addShapeLayer(shapeKind: ShapeKind) {
    if (!canEdit) return;
    const n = layers.length;
    const square = shapeKind === "circle";
    pushLayer({
      id: crypto.randomUUID(),
      kind: "shape",
      shapeKind,
      label: shapeKind,
      text: "",
      cropDataUrl: "",
      xPct: 20 + (n % 4) * 5,
      yPct: 25 + (n % 4) * 5,
      wPct: square ? 18 : 36,
      hPct: square ? 18 : shapeKind === "capsule" ? 8 : 14,
      visible: true,
      locked: false,
      fill: shapeKind === "capsule" ? "#8b5cf6" : "#a78bfa",
    });
  }

  async function addBrandLogoLayer() {
    if (!canEdit || !brandKit.logoUrl?.trim()) return;
    setLogoBusy(true);
    setError(null);
    let revoke: string | null = null;
    try {
      const resolved = await resolveLogoDisplayUrl(brandKit.logoUrl.trim());
      revoke = resolved.revoke;
      const img = new window.Image();
      if (!resolved.displayUrl.startsWith("blob:") && !resolved.displayUrl.startsWith("data:")) {
        img.crossOrigin = "anonymous";
      }
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Logo failed to load"));
        img.src = resolved.displayUrl;
      });
      const aspect = img.naturalWidth / Math.max(1, img.naturalHeight);
      const wPct = 18;
      const hPct = wPct / aspect;
      // Keep a durable data URL on the layer when we fetched a blob.
      let cropDataUrl = resolved.displayUrl;
      if (revoke) {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          cropDataUrl = canvas.toDataURL("image/png");
        }
      }
      pushLayer({
        id: crypto.randomUUID(),
        kind: "logo",
        label: "Brand logo",
        text: "",
        cropDataUrl,
        xPct: 78,
        yPct: 86,
        wPct,
        hPct: Math.min(22, hPct),
        visible: true,
        locked: false,
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not add brand logo");
    } finally {
      if (revoke) URL.revokeObjectURL(revoke);
      setLogoBusy(false);
    }
  }

  async function createLayerFromBrush() {
    if (!canEdit || !result || brushLines.length === 0) {
      setError("Paint over the missed area first.");
      return;
    }
    setBrushBusy(true);
    setError(null);
    try {
      const mask = buildBrushMaskCanvas(
        brushLines,
        brushSize,
        stageSize.w,
        stageSize.h,
        result.width,
        result.height,
      );
      const sourceImg = await loadImage(result.backgroundDataUrl);
      const cut = cutoutFromSourceAndMask(sourceImg, mask);
      if (!cut) {
        setError("Brush area is empty — paint a bit more.");
        return;
      }

      pushLayer({
        id: crypto.randomUUID(),
        kind: "object",
        label: "Brush cutout",
        text: "",
        cropDataUrl: cut.cropDataUrl,
        xPct: cut.xPct,
        yPct: cut.yPct,
        wPct: cut.wPct,
        hPct: cut.hPct,
        visible: true,
        locked: false,
      });

      // Heal the hole on the background (FLUX erase), blur fallback if it fails.
      let nextBg = result.backgroundDataUrl;
      try {
        const fd = new FormData();
        fd.set("image_file", dataUrlToBlob(result.backgroundDataUrl), "bg.png");
        fd.set("mask_image", dataUrlToBlob(mask.toDataURL("image/png")), "mask.png");
        fd.set("inpaint_mode", "erase");
        const res = await fetch("/api/inpaint-image", { method: "POST", body: fd });
        const json = (await res.json()) as { imageUrl?: string; error?: string };
        if (!res.ok || !json.imageUrl) throw new Error(json.error || "Erase failed");
        nextBg = json.imageUrl;
      } catch {
        nextBg = await blurPunchBackground(result.backgroundDataUrl, cut.bbox);
      }

      setResult((prev) => (prev ? { ...prev, backgroundDataUrl: nextBg } : prev));
      setBrushLines([]);
      setBrushMode(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Brush cutout failed");
    } finally {
      setBrushBusy(false);
    }
  }

  function brushPointerPos(stage: StageType | null): { x: number; y: number } | null {
    if (!stage) return null;
    const pos = stage.getPointerPosition();
    if (!pos) return null;
    return { x: pos.x, y: pos.y };
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
        const title =
          l.kind === "text"
            ? `Text: ${(l.editText || l.text || l.label).slice(0, 28)}`
            : l.kind === "logo"
              ? `Logo: ${l.label.slice(0, 28)}`
              : l.kind === "shape"
                ? `Shape: ${l.shapeKind ?? l.label}`
                : `Object: ${l.label.slice(0, 28)}`;
        return { ...l, title, stackIndex: i };
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
          heals the background — move text and the hole should look like real scene, not blur. Add your own
          text, shapes, or Brand Kit logo on top.
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

      {/* Canva-like text / shape toolbar */}
      {selected && (selected.kind === "text" || selected.kind === "shape") && (
        <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center justify-center gap-2 rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2">
          {selected.kind === "text" ? (
            <>
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
            </>
          ) : null}
          <label className="flex items-center gap-1 text-xs text-slate-300">
            Color
            <input
              type="color"
              value={selected.fill ?? (selected.kind === "shape" ? "#8b5cf6" : "#111827")}
              onChange={(e) =>
                patchLayer(selected.id, {
                  fill: e.target.value,
                  ...(selected.kind === "text" ? { useLiveText: true } : {}),
                })
              }
            />
          </label>
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
                style={{ cursor: brushMode ? "crosshair" : "default" }}
                onMouseDown={(e: Konva.KonvaEventObject<MouseEvent>) => {
                  if (brushMode) {
                    drawingRef.current = true;
                    const pos = brushPointerPos(e.target.getStage());
                    if (pos) setBrushLines((prev) => [...prev, [pos.x, pos.y]]);
                    return;
                  }
                  if (e.target === e.target.getStage()) setSelectedId(null);
                }}
                onMousemove={(e: Konva.KonvaEventObject<MouseEvent>) => {
                  if (!brushMode || !drawingRef.current) return;
                  const pos = brushPointerPos(e.target.getStage());
                  if (!pos) return;
                  setBrushLines((prev) => {
                    const next = [...prev];
                    const last = next[next.length - 1];
                    if (!last) return prev;
                    next[next.length - 1] = last.concat([pos.x, pos.y]);
                    return next;
                  });
                }}
                onMouseup={() => {
                  drawingRef.current = false;
                }}
                onMouseLeave={() => {
                  drawingRef.current = false;
                }}
                onTouchStart={(e: Konva.KonvaEventObject<TouchEvent>) => {
                  if (!brushMode) return;
                  e.evt.preventDefault();
                  drawingRef.current = true;
                  const pos = brushPointerPos(e.target.getStage());
                  if (pos) setBrushLines((prev) => [...prev, [pos.x, pos.y]]);
                }}
                onTouchMove={(e: Konva.KonvaEventObject<TouchEvent>) => {
                  if (!brushMode || !drawingRef.current) return;
                  e.evt.preventDefault();
                  const pos = brushPointerPos(e.target.getStage());
                  if (!pos) return;
                  setBrushLines((prev) => {
                    const next = [...prev];
                    const last = next[next.length - 1];
                    if (!last) return prev;
                    next[next.length - 1] = last.concat([pos.x, pos.y]);
                    return next;
                  });
                }}
                onTouchEnd={() => {
                  drawingRef.current = false;
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
                      selected={!brushMode && layer.id === selectedId}
                      interactive={!brushMode}
                      onSelect={() => setSelectedId(layer.id)}
                      onChange={(patch) => patchLayer(layer.id, patch)}
                    />
                  ))}
                  {brushMode &&
                    brushLines.map((pts, i) => (
                      <Line
                        key={`brush-${i}`}
                        points={pts}
                        stroke="#c4b5fd"
                        strokeWidth={brushSize}
                        opacity={0.55}
                        lineCap="round"
                        lineJoin="round"
                        tension={0.2}
                        listening={false}
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

          <div className="space-y-2 rounded-xl border border-white/10 bg-black/20 p-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Add layer
            </p>
            <div className="flex flex-wrap gap-1.5">
              <ToolBtn label="Text" onClick={addTextLayer} disabled={!canEdit || brushMode} />
              <ToolBtn
                label={logoBusy ? "Logo…" : "Brand logo"}
                onClick={() => void addBrandLogoLayer()}
                disabled={!canEdit || !hasBrandLogo || logoBusy || brushMode}
                title={
                  hasBrandLogo
                    ? "Add logo from Brand Kit"
                    : "Upload a logo on Brand Kit first"
                }
              />
              <ToolBtn
                label="Rect"
                onClick={() => addShapeLayer("rect")}
                disabled={!canEdit || brushMode}
              />
              <ToolBtn
                label="Capsule"
                onClick={() => addShapeLayer("capsule")}
                disabled={!canEdit || brushMode}
              />
              <ToolBtn
                label="Circle"
                onClick={() => addShapeLayer("circle")}
                disabled={!canEdit || brushMode}
              />
            </div>
            {!hasBrandLogo ? (
              <p className="text-[11px] text-slate-500">
                No brand logo yet —{" "}
                <Link href="/brand-kit" className="text-violet-300 hover:underline">
                  open Brand Kit
                </Link>{" "}
                to upload one.
              </p>
            ) : (
              <p className="text-[11px] text-slate-500">Brand Kit logo ready to place.</p>
            )}

            <div className="space-y-1.5 border-t border-white/10 pt-2">
              <ToolBtn
                label={brushMode ? "Brush on" : "Brush cutout"}
                active={brushMode}
                disabled={!canEdit || brushBusy}
                onClick={() => {
                  setBrushMode((v) => !v);
                  if (brushMode) setBrushLines([]);
                  setSelectedId(null);
                }}
                title="Paint a missed object, then turn it into a movable layer"
              />
              {brushMode ? (
                <>
                  <label className="flex items-center gap-2 text-[11px] text-slate-300">
                    Size
                    <input
                      type="range"
                      min={10}
                      max={64}
                      value={brushSize}
                      onChange={(e) => setBrushSize(Number(e.target.value))}
                      className="flex-1"
                    />
                    <span className="w-6 tabular-nums text-slate-500">{brushSize}</span>
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    <ToolBtn
                      label="Undo stroke"
                      disabled={brushLines.length === 0 || brushBusy}
                      onClick={() => setBrushLines((prev) => prev.slice(0, -1))}
                    />
                    <ToolBtn
                      label="Clear"
                      disabled={brushLines.length === 0 || brushBusy}
                      onClick={() => setBrushLines([])}
                    />
                    <ToolBtn
                      label={brushBusy ? "Cutting…" : "Make layer"}
                      disabled={brushLines.length === 0 || brushBusy}
                      active
                      onClick={() => void createLayerFromBrush()}
                    />
                  </div>
                  <p className="text-[11px] leading-snug text-slate-500">
                    Paint over what OCR/SAM missed on the background. Make layer cuts it out and
                    heals the hole (uses 1 image credit when erase succeeds).
                  </p>
                </>
              ) : null}
            </div>
          </div>

          <ul className="max-h-[320px] space-y-1 overflow-auto text-sm">
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
                  <span className={`h-2 w-2 shrink-0 rounded-full ${kindDotClass(l.kind)}`} />
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
