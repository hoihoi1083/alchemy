"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Stage,
  Layer,
  Group,
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
import { LibraryAssetPicker } from "@/components/LibraryAssetPicker";
import {
  blurPunchBackground,
  brushStrokesImageBBox,
  buildBrushMaskCanvas,
  canvasDisplayUrl,
  cutoutFromSourceAndMask,
  dataUrlToBlob,
  loadImage,
  sampleTextStyleFromCrop,
  type BrushStroke,
} from "@/lib/edit-image-2-brush-cutout";
import { EXPAND_PRESETS } from "@/lib/edit-image-2-expand";
import { parseMagicChatIntent } from "@/lib/edit-image-2-magic-chat";
import {
  contentBBoxFromCrop,
  contentBBoxToImage,
  tryKeyTextCrop,
  type ImageBBox,
} from "@/lib/edit-image-2-perfect-lift";
import { MagicBoardChat } from "@/components/edit-image-2/MagicBoardChat";
import {
  estimateInpaintTokens,
  estimateSmartLayersDetectTokens,
  estimateSmartLayersQwenTokens,
  estimateSmartLayersSandwichTokens,
  TOKEN_COST,
} from "@/lib/billing/token-costs";
import { isLibraryAssetUrl } from "@/lib/storage/library-asset-url";
import { useLocale } from "@/components/LocaleProvider";

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
  cropDataUrl: string;
  cropUrl?: string;
  bbox?: { left: number; top: number; width: number; height: number };
  shapeKind?: ShapeKind;
  editText?: string;
  useLiveText?: boolean;
  role?: "title" | "body" | "pill" | "label";
  visible?: boolean;
  locked?: boolean;
  fontSize?: number;
  fill?: string;
  fontBold?: boolean;
  matted?: boolean;
  /** Style already sampled from crop when switching to live text. */
  styleSampled?: boolean;
  /** Hole already punched from background for this layer. */
  holeCleared?: boolean;
};

type DecomposeResult = {
  width: number;
  height: number;
  backgroundDataUrl?: string;
  backgroundUrl?: string;
  /** Untouched source plate — fallback if healed bg fails to load. */
  originalBackgroundUrl?: string;
  layers: DecLayer[];
  warning?: string;
  debug?: {
    textDetected: number;
    objectsDetected: number;
    samRefined?: number;
    backgroundMode?: string;
  };
};

type GuideLine = { orientation: "h" | "v"; pos: number };

const HISTORY_MAX = 40;
const SNAP_PX = 6;
const DETECT_TOKENS = estimateSmartLayersDetectTokens({ sam: false });
/** Aug-style full split: Florence + SAM + BiRefNet subject. */
const DETECT_SAM_TOKENS =
  estimateSmartLayersDetectTokens({ sam: true }) + TOKEN_COST.smart_layers_matte;
const QWEN_TOKENS = estimateSmartLayersQwenTokens();
const SANDWICH_TOKENS = estimateSmartLayersSandwichTokens();
const ERASE_PER_MP = estimateInpaintTokens(1);
const HEAL_LOCAL_TOKENS = TOKEN_COST.smart_layers_heal;
const MATTE_TOKENS = TOKEN_COST.smart_layers_matte;
const EXPAND_TOKENS = TOKEN_COST.smart_layers_expand;
const SESSION_KEY = "alchemy-edit-image-2-v1";

type SessionSnap = {
  sourceUrl: string | null;
  result: DecomposeResult;
  history: DecLayer[][];
  historyIndex: number;
  selectedId: string | null;
  lastTokens: number | null;
};

function loadSession(): SessionSnap | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SessionSnap;
    if (!parsed?.result?.width || !Array.isArray(parsed.history)) return null;
    if (parsed.historyIndex < 0 || parsed.historyIndex >= parsed.history.length) {
      parsed.historyIndex = Math.max(0, parsed.history.length - 1);
    }
    // Prefer history tip; fall back to result.layers only if history is empty.
    const at = parsed.history[parsed.historyIndex];
    const seed = parsed.result.layers;
    if ((!at || at.length === 0) && Array.isArray(seed) && seed.length > 0) {
      parsed.history = [seed];
      parsed.historyIndex = 0;
    }
    // Keep result.layers aligned with the tip for future restores.
    const tip = parsed.history[parsed.historyIndex] ?? [];
    parsed.result = { ...parsed.result, layers: tip };
    return parsed;
  } catch {
    return null;
  }
}

function saveSession(snap: SessionSnap | null) {
  if (typeof window === "undefined") return;
  try {
    if (!snap) {
      sessionStorage.removeItem(SESSION_KEY);
      return;
    }
    const tip = snap.history[snap.historyIndex] ?? [];
    const synced: SessionSnap = {
      ...snap,
      result: { ...snap.result, layers: tip },
    };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(synced));
  } catch {
    // quota / private mode — ignore
  }
}

function layerBitmapUrl(layer: DecLayer): string | null {
  return canvasDisplayUrl(layer.cropUrl || layer.cropDataUrl || null);
}

function useHtmlImage(url: string | null, fallbackUrl?: string | null) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    if (!url) {
      setImg(null);
      return;
    }
    let cancelled = false;
    const load = (src: string, allowFallback: boolean) => {
      const el = new window.Image();
      if (/^https?:\/\//i.test(src)) el.crossOrigin = "anonymous";
      el.onload = () => {
        if (!cancelled) setImg(el);
      };
      el.onerror = () => {
        if (!cancelled && allowFallback && fallbackUrl && fallbackUrl !== src) {
          load(fallbackUrl, false);
          return;
        }
        if (!cancelled) setImg(null);
      };
      el.src = src;
    };
    load(url, true);
    return () => {
      cancelled = true;
    };
  }, [url, fallbackUrl]);
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

function snapRect(
  x: number,
  y: number,
  w: number,
  h: number,
  stageW: number,
  stageH: number,
): { x: number; y: number; guides: GuideLine[] } {
  const guides: GuideLine[] = [];
  let nx = x;
  let ny = y;
  const cx = x + w / 2;
  const cy = y + h / 2;
  const midX = stageW / 2;
  const midY = stageH / 2;

  if (Math.abs(cx - midX) <= SNAP_PX) {
    nx = midX - w / 2;
    guides.push({ orientation: "v", pos: midX });
  } else if (Math.abs(x) <= SNAP_PX) {
    nx = 0;
    guides.push({ orientation: "v", pos: 0 });
  } else if (Math.abs(x + w - stageW) <= SNAP_PX) {
    nx = stageW - w;
    guides.push({ orientation: "v", pos: stageW });
  }

  if (Math.abs(cy - midY) <= SNAP_PX) {
    ny = midY - h / 2;
    guides.push({ orientation: "h", pos: midY });
  } else if (Math.abs(y) <= SNAP_PX) {
    ny = 0;
    guides.push({ orientation: "h", pos: 0 });
  } else if (Math.abs(y + h - stageH) <= SNAP_PX) {
    ny = stageH - h;
    guides.push({ orientation: "h", pos: stageH });
  }

  return { x: nx, y: ny, guides };
}

function LayerSprite({
  layer,
  stageW,
  stageH,
  selected,
  interactive,
  onSelect,
  onChange,
  onGuides,
  onAfterMove,
  onMoveStart,
}: {
  layer: DecLayer;
  stageW: number;
  stageH: number;
  selected: boolean;
  interactive: boolean;
  onSelect: () => void;
  onChange: (patch: Partial<DecLayer>) => void;
  onGuides: (guides: GuideLine[]) => void;
  onAfterMove?: () => void;
  /** Fire as soon as the user starts dragging (clear plate hole early). */
  onMoveStart?: () => void;
}) {
  const img = useHtmlImage(
    layer.kind === "shape" || (layer.kind === "text" && layer.useLiveText)
      ? null
      : layerBitmapUrl(layer),
  );
  const imageRef = useRef<Konva.Image>(null);
  const textRef = useRef<Konva.Text>(null);
  const rectRef = useRef<Konva.Rect>(null);
  const circleRef = useRef<Konva.Circle>(null);
  const trRef = useRef<Konva.Transformer>(null);
  /** While dragging, ignore controlled x/y so guide setState doesn't rubber-band. */
  const draggingRef = useRef(false);
  const [dragging, setDragging] = useState(false);
  const lastGuidesKey = useRef("");

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
  const keepRatio = layer.kind === "object" || layer.kind === "logo";

  const commitBox = (bx: number, by: number, bw: number, bh: number, extra?: Partial<DecLayer>) => {
    onGuides([]);
    lastGuidesKey.current = "";
    onChange({
      xPct: (bx / stageW) * 100,
      yPct: (by / stageH) * 100,
      wPct: (bw / stageW) * 100,
      hPct: (bh / stageH) * 100,
      ...extra,
    });
  };

  const publishGuides = (guides: GuideLine[]) => {
    const key = guides.map((g) => `${g.orientation}:${Math.round(g.pos)}`).join("|");
    if (key === lastGuidesKey.current) return;
    lastGuidesKey.current = key;
    onGuides(guides);
  };

  const onDragMoveBox = (node: Konva.Node, bw: number, bh: number) => {
    const snapped = snapRect(node.x(), node.y(), bw, bh, stageW, stageH);
    node.position({ x: snapped.x, y: snapped.y });
    publishGuides(snapped.guides);
  };

  const onDragEndBox = (node: Konva.Node, bw: number, bh: number) => {
    const snapped = snapRect(node.x(), node.y(), bw, bh, stageW, stageH);
    node.position({ x: snapped.x, y: snapped.y });
    draggingRef.current = false;
    setDragging(false);
    commitBox(snapped.x, snapped.y, bw, bh);
    onAfterMove?.();
  };

  const onTransformEndBox = () => {
    const n = activeNode();
    if (!n) return;
    const scaleX = n.scaleX();
    const scaleY = n.scaleY();
    n.scaleX(1);
    n.scaleY(1);
    const bw = Math.max(8, n.width() * scaleX);
    const bh = Math.max(8, n.height() * scaleY);
    const next: Partial<DecLayer> = {};
    if (layer.kind === "text" && layer.useLiveText) {
      next.fontSize = Math.max(8, fontSize * scaleY);
    }
    commitBox(n.x(), n.y(), bw, bh, next);
    onAfterMove?.();
  };

  // Free placement across / around the photo — no hard wall at the poster edge.
  const dragBound = (pos: { x: number; y: number }) => ({
    x: Math.min(stageW * 1.35, Math.max(-stageW * 0.85 - w, pos.x)),
    y: Math.min(stageH * 1.35, Math.max(-stageH * 0.85 - h, pos.y)),
  });

  const common = {
    id: layer.id,
    draggable,
    listening: interactive,
    dragBoundFunc: dragBound,
    // Controlled x/y only when idle — otherwise guide updates reset the drag.
    ...(dragging ? {} : { x, y }),
    onClick: (e: Konva.KonvaEventObject<MouseEvent>) => {
      e.cancelBubble = true;
      onSelect();
    },
    onTap: (e: Konva.KonvaEventObject<Event>) => {
      e.cancelBubble = true;
      onSelect();
    },
    onDragMove: (e: Konva.KonvaEventObject<DragEvent>) => onDragMoveBox(e.target, w, h),
    onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => onDragEndBox(e.target, w, h),
    onTransformStart: () => {
      onMoveStart?.();
    },
    onTransformEnd: onTransformEndBox,
    onMouseEnter: (e: Konva.KonvaEventObject<MouseEvent>) => {
      const stage = e.target.getStage();
      if (stage && draggable) stage.container().style.cursor = "grab";
    },
    onMouseLeave: (e: Konva.KonvaEventObject<MouseEvent>) => {
      const stage = e.target.getStage();
      if (stage && !draggingRef.current) stage.container().style.cursor = "default";
    },
    onDragStart: (e: Konva.KonvaEventObject<DragEvent>) => {
      draggingRef.current = true;
      setDragging(true);
      const stage = e.target.getStage();
      if (stage) stage.container().style.cursor = "grabbing";
      onSelect();
      onMoveStart?.();
    },
  };

  return (
    <>
      {layer.kind === "shape" && layer.shapeKind === "circle" ? (
        <Circle
          ref={circleRef}
          {...(dragging ? {} : { x: x + w / 2, y: y + h / 2 })}
          radius={Math.min(w, h) / 2}
          fill={fill}
          id={layer.id}
          draggable={draggable}
          listening={interactive}
          dragBoundFunc={(pos) => ({
            x: Math.min(stageW * 1.35, Math.max(-stageW * 0.85, pos.x)),
            y: Math.min(stageH * 1.35, Math.max(-stageH * 0.85, pos.y)),
          })}
          onClick={common.onClick}
          onTap={common.onTap}
          onDragStart={common.onDragStart}
          onMouseEnter={common.onMouseEnter}
          onMouseLeave={common.onMouseLeave}
          onDragMove={(e) => {
            const n = e.target as Konva.Circle;
            const r = n.radius();
            const snapped = snapRect(n.x() - r, n.y() - r, r * 2, r * 2, stageW, stageH);
            n.position({ x: snapped.x + r, y: snapped.y + r });
            publishGuides(snapped.guides);
          }}
          onDragEnd={(e) => {
            const n = e.target as Konva.Circle;
            const r = n.radius();
            const snapped = snapRect(n.x() - r, n.y() - r, r * 2, r * 2, stageW, stageH);
            n.position({ x: snapped.x + r, y: snapped.y + r });
            draggingRef.current = false;
            setDragging(false);
            commitBox(snapped.x, snapped.y, r * 2, r * 2);
            onAfterMove?.();
          }}
          onTransformEnd={() => {
            const n = circleRef.current;
            if (!n) return;
            const scaleX = n.scaleX();
            n.scaleX(1);
            n.scaleY(1);
            const r = Math.max(4, n.radius() * scaleX);
            commitBox(n.x() - r, n.y() - r, r * 2, r * 2);
            onAfterMove?.();
          }}
        />
      ) : layer.kind === "shape" ? (
        <Rect
          ref={rectRef}
          width={w}
          height={h}
          cornerRadius={layer.shapeKind === "capsule" ? Math.min(w, h) / 2 : 4}
          fill={fill}
          {...common}
        />
      ) : layer.kind === "text" && layer.useLiveText ? (
        <KonvaText
          ref={textRef}
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
          image={img}
          width={w}
          height={h}
          {...common}
        />
      ) : (
        <Rect
          width={w}
          height={h}
          stroke="#a78bfa"
          dash={[4, 4]}
          {...common}
        />
      )}
      {selected && interactive && (
        <Transformer
          ref={trRef}
          rotateEnabled={false}
          keepRatio={keepRatio}
          enabledAnchors={
            keepRatio
              ? ["top-left", "top-right", "bottom-left", "bottom-right"]
              : undefined
          }
          borderStroke="#a78bfa"
          anchorStroke="#a78bfa"
          anchorFill="#fff"
          anchorSize={9}
          anchorCornerRadius={2}
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
  className = "",
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  title?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      title={title}
      onClick={onClick}
      className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition disabled:opacity-40 ${
        active
          ? "bg-violet-500 text-white shadow-sm shadow-violet-500/30"
          : "border border-white/10 bg-white/[0.03] text-slate-200 hover:bg-white/[0.07]"
      } ${className}`}
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
  const { m } = useLocale();
  const ic = m.imageCanvas;
  const t = m.editImage2;
  const fileRef = useRef<HTMLInputElement>(null);
  const stageRef = useRef<StageType>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [bootSnap] = useState<SessionSnap | null>(() => loadSession());

  const [sourceUrl, setSourceUrl] = useState<string | null>(bootSnap?.sourceUrl ?? null);
  const [busy, setBusy] = useState<
    "upload" | "decompose" | "export" | "matte" | "rewrite" | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [result, setResult] = useState<DecomposeResult | null>(bootSnap?.result ?? null);
  const [history, setHistory] = useState<DecLayer[][]>(bootSnap?.history ?? [[]]);
  const [historyIndex, setHistoryIndex] = useState(bootSnap?.historyIndex ?? 0);
  const historyRef = useRef(bootSnap?.history ?? [[]]);
  const historyIndexRef = useRef(bootSnap?.historyIndex ?? 0);
  const resultRef = useRef<DecomposeResult | null>(bootSnap?.result ?? null);
  resultRef.current = result;
  const healingIdsRef = useRef<Set<string>>(new Set());
  const healChainRef = useRef<Promise<void>>(Promise.resolve());
  /** Serial Flux/local heals so multi-move holes compound on one HTTPS plate. */
  const healServerChainRef = useRef<Promise<void>>(Promise.resolve());
  /** Last https plate used for sequential server heals (optimistic punches are data URLs). */
  const lastHttpBgRef = useRef<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(bootSnap?.selectedId ?? null);
  /** Workspace pixel size — stage is derived from this so the image always fills the panel. */
  const [viewportSize, setViewportSize] = useState({ w: 0, h: 0 });
  const [viewScale, setViewScale] = useState(1);
  const [viewPos, setViewPos] = useState({ x: 0, y: 0 });
  const [spaceDown, setSpaceDown] = useState(false);
  const [panning, setPanning] = useState(false);
  const panLastRef = useRef<{ x: number; y: number } | null>(null);
  const [guides, setGuides] = useState<GuideLine[]>([]);
  const [brandKit, setBrandKit] = useState<BrandKit>(() =>
    typeof window !== "undefined" ? loadBrandKitFromStorage() : DEFAULT_BRAND_KIT,
  );
  const [logoBusy, setLogoBusy] = useState(false);
  const [brushMode, setBrushMode] = useState(false);
  /** When brushMode: lift cutout vs erase painted area */
  const [brushIntent, setBrushIntent] = useState<"lift" | "erase">("lift");
  const [boxMode, setBoxMode] = useState(false);
  /** Click-to-grab: tap a piece on the photo */
  const [grabMode, setGrabMode] = useState(false);
  /** boxMode intent: lift | Qwen region | erase | AI edit region */
  const [boxIntent, setBoxIntent] = useState<"lift" | "qwen" | "erase" | "ai">("lift");
  /** Inspector: change words vs freeform AI on the selected crop */
  const [cropEditMode, setCropEditMode] = useState<"text" | "ai">("ai");
  const [editInstruction, setEditInstruction] = useState("");
  const instructionRef = useRef<HTMLTextAreaElement | null>(null);
  const [boxDrag, setBoxDrag] = useState<{
    x0: number;
    y0: number;
    x1: number;
    y1: number;
  } | null>(null);
  const [brushSize, setBrushSize] = useState(28);
  const [brushLines, setBrushLines] = useState<BrushStroke[]>([]);
  const brushLinesRef = useRef<BrushStroke[]>([]);
  brushLinesRef.current = brushLines;
  const [brushBusy, setBrushBusy] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [lastTokens, setLastTokens] = useState<number | null>(bootSnap?.lastTokens ?? null);
  const [dragOver, setDragOver] = useState(false);
  const drawingRef = useRef(false);
  const originalBgRef = useRef<string | null>(bootSnap?.sourceUrl ?? null);

  const layers = useMemo(() => history[historyIndex] ?? [], [history, historyIndex]);
  const backgroundUrl = result?.backgroundUrl || result?.backgroundDataUrl || null;
  const originalBgUrl = result?.originalBackgroundUrl || null;
  const bgImg = useHtmlImage(
    canvasDisplayUrl(backgroundUrl),
    canvasDisplayUrl(originalBgUrl),
  );
  const selected = layers.find((l) => l.id === selectedId) ?? null;
  const canEdit = Boolean(result);
  const hasBrandLogo = Boolean(brandKit.logoUrl?.trim());

  useEffect(() => {
    if (!selected) return;
    if (selected.kind === "text") setCropEditMode("text");
    else if (selected.kind === "object") setCropEditMode("ai");
    setEditInstruction("");
  }, [selected?.id, selected?.kind]);

  // Full workspace panel (Ultra-style). The photo is contain-fitted inside — not a tiny floating card.
  const stageSize = useMemo(() => {
    const vw = viewportSize.w;
    const vh = viewportSize.h;
    if (vw < 80 || vh < 80) return { w: 800, h: 600 };
    return { w: Math.round(vw), h: Math.round(vh) };
  }, [viewportSize.w, viewportSize.h]);

  /** Where the photo sits inside the full-panel stage (contain). Layer % map to this rect. */
  const imageLayout = useMemo(() => {
    const iw = Math.max(1, result?.width ?? 1);
    const ih = Math.max(1, result?.height ?? 1);
    const pad = 16;
    const maxW = Math.max(1, stageSize.w - pad * 2);
    const maxH = Math.max(1, stageSize.h - pad * 2);
    const scale = Math.min(maxW / iw, maxH / ih);
    const w = Math.max(1, Math.round(iw * scale));
    const h = Math.max(1, Math.round(ih * scale));
    return {
      x: Math.round((stageSize.w - w) / 2),
      y: Math.round((stageSize.h - h) / 2),
      w,
      h,
    };
  }, [result?.width, result?.height, stageSize.w, stageSize.h]);

  // Track the real workspace size.
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const measure = () => {
      const rect = el.getBoundingClientRect();
      const w = Math.round(rect.width);
      const h = Math.round(rect.height);
      if (w >= 40 && h >= 40) setViewportSize({ w, h });
    };
    measure();
    requestAnimationFrame(measure);
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    ro?.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [result]);

  // Persist workspace so Fast Refresh / remount does not wipe layers mid-edit.
  useEffect(() => {
    if (!result) return;
    saveSession({
      sourceUrl,
      result,
      history,
      historyIndex,
      selectedId,
      lastTokens,
    });
  }, [sourceUrl, result, history, historyIndex, selectedId, lastTokens]);

  // One-shot repair if a prior bug left result but empty history.
  useEffect(() => {
    const seed = result?.layers;
    if (!seed?.length) return;
    const cur = historyRef.current[historyIndexRef.current];
    if (cur && cur.length > 0) return;
    historyRef.current = [seed];
    historyIndexRef.current = 0;
    setHistory([seed]);
    setHistoryIndex(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount / result seed only
  }, [result?.width, result?.height, result?.layers?.length]);

  useEffect(() => {
    let cancelled = false;
    void hydrateBrandKitFromCloud().then((kit) => {
      if (!cancelled) setBrandKit(kit);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * Undo stack commit. Must NOT mutate refs inside a setState updater —
   * React Strict Mode double-invokes updaters and that wiped all layers on
   * the first drag (idx advanced mid-pass → empty `cur` → empty board).
   */
  const commitLayers = useCallback(
    (next: DecLayer[] | ((prev: DecLayer[]) => DecLayer[])) => {
      const h = historyRef.current;
      const idx = Math.min(historyIndexRef.current, Math.max(0, h.length - 1));
      const cur = h[idx] ?? [];
      const resolved = typeof next === "function" ? next(cur) : next;
      // Guard: never replace a full board with an accidental empty stack.
      if (cur.length > 1 && resolved.length === 0) {
        console.error("[edit-image-2] blocked empty layer commit");
        return;
      }
      const trimmed = h.slice(0, idx + 1);
      const stacked = [...trimmed, resolved].slice(-HISTORY_MAX);
      const newIndex = stacked.length - 1;
      historyRef.current = stacked;
      historyIndexRef.current = newIndex;
      setHistory(stacked);
      setHistoryIndex(newIndex);
      // Keep result.layers in sync for session restore (selective-lift lives in history).
      setResult((prev) => (prev ? { ...prev, layers: resolved } : prev));
    },
    [],
  );

  const undo = useCallback(() => {
    const next = Math.max(0, historyIndexRef.current - 1);
    historyIndexRef.current = next;
    setHistoryIndex(next);
  }, []);
  const redo = useCallback(() => {
    const next = Math.min(historyRef.current.length - 1, historyIndexRef.current + 1);
    historyIndexRef.current = next;
    setHistoryIndex(next);
  }, []);

  // Reset zoom/pan whenever a new image (pixel size) is opened.
  useEffect(() => {
    setViewScale(1);
    setViewPos({ x: 0, y: 0 });
  }, [result?.width, result?.height]);

  const patchLayer = useCallback(
    (id: string, patch: Partial<DecLayer>) => {
      commitLayers((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
    },
    [commitLayers],
  );

  const healBackgroundHoleRef = useRef<
    (
      bgUrl: string,
      hole: { left: number; top: number; width: number; height: number },
      opts?: { mode?: "auto" | "erase" | "fill" | "local" },
    ) => Promise<{
      backgroundUrl: string;
      tokensCharged?: number;
      mode: "erase" | "fill" | "local" | "blur";
    }>
  >(async () => {
    throw new Error("heal not ready");
  });
  const applyHealedBackgroundRef = useRef<
    (healed: {
      backgroundUrl: string;
      tokensCharged?: number;
      mode: "erase" | "fill" | "local" | "blur";
    }) => void
  >(() => {});

  /** Pick local (flat poster) vs Flux fill (photo plate) from ring colour stats. */
  async function pickHealModeForHole(
    bgUrl: string,
    hole: { left: number; top: number; width: number; height: number },
  ): Promise<"local" | "auto"> {
    try {
      const src = canvasDisplayUrl(bgUrl) ?? bgUrl;
      const img = await loadImage(src);
      const ring = Math.max(6, Math.round(Math.min(hole.width, hole.height) * 0.12));
      const sx = Math.max(0, hole.left - ring);
      const sy = Math.max(0, hole.top - ring);
      const sw = Math.min(img.naturalWidth - sx, hole.width + ring * 2);
      const sh = Math.min(img.naturalHeight - sy, hole.height + ring * 2);
      if (sw < 4 || sh < 4) return "auto";
      const c = document.createElement("canvas");
      c.width = sw;
      c.height = sh;
      const ctx = c.getContext("2d", { willReadFrequently: true });
      if (!ctx) return "auto";
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
      const data = ctx.getImageData(0, 0, sw, sh).data;
      const holeL = hole.left - sx;
      const holeT = hole.top - sy;
      let n = 0;
      let sum = 0;
      let sumSq = 0;
      for (let y = 0; y < sh; y++) {
        for (let x = 0; x < sw; x++) {
          if (
            x >= holeL &&
            x < holeL + hole.width &&
            y >= holeT &&
            y < holeT + hole.height
          ) {
            continue;
          }
          const i = (y * sw + x) * 4;
          const lum = (data[i]! + data[i + 1]! + data[i + 2]!) / 3;
          sum += lum;
          sumSq += lum * lum;
          n += 1;
        }
      }
      if (n < 8) return "auto";
      const mean = sum / n;
      const variance = sumSq / n - mean * mean;
      // Flat white/cream poster only → local. Photos → Flux erase (never fill — weird walls).
      if (mean >= 210 && variance < 900) return "local";
      return "auto";
    } catch {
      return "auto";
    }
  }

  /** Punch this layer's bbox out of the background so move/edit is not a ghost. */
  const clearHoleIfNeeded = useCallback(
    async (id: string) => {
      const run = async () => {
        const cur = historyRef.current[historyIndexRef.current] ?? [];
        const layer = cur.find((l) => l.id === id);
        if (!layer || layer.holeCleared || !layer.bbox) return;
        if (healingIdsRef.current.has(id)) return;
        const board = resultRef.current;
        const bgUrl = board?.backgroundUrl || board?.backgroundDataUrl;
        if (!bgUrl) return;
        healingIdsRef.current.add(id);
        const b = layer.bbox;
        const pad = Math.max(8, Math.round(Math.min(b.width, b.height) * 0.1));
        const imgW = board?.width ?? b.left + b.width;
        const imgH = board?.height ?? b.top + b.height;
        const hole = {
          left: Math.max(0, b.left - pad),
          top: Math.max(0, b.top - pad),
          width: Math.min(imgW - Math.max(0, b.left - pad), b.width + pad * 2),
          height: Math.min(imgH - Math.max(0, b.top - pad), b.height + pad * 2),
        };
        try {
          // 1) Instant client punch — kill the ghost while drag starts (Aug feel).
          const display =
            canvasDisplayUrl(bgUrl) ??
            (sourceUrl ? canvasDisplayUrl(sourceUrl) : null) ??
            bgUrl;
          try {
            const quick = await blurPunchBackground(display, hole);
            applyHealedBackgroundRef.current({
              backgroundUrl: quick,
              mode: "blur",
            });
          } catch {
            /* server refine still runs */
          }
          patchLayer(id, { holeCleared: true });
        } catch {
          patchLayer(id, { holeCleared: false });
          healingIdsRef.current.delete(id);
          return;
        }
        healingIdsRef.current.delete(id);

        // Server refine queued separately — keeps HTTPS plate sequential (Aug fill-in).
        const holeForServer = hole;
        const boardOrig = board.originalBackgroundUrl;
        healServerChainRef.current = healServerChainRef.current.then(async () => {
          try {
            const httpPlate =
              lastHttpBgRef.current ||
              (bgUrl.startsWith("http") || isLibraryAssetUrl(bgUrl) ? bgUrl : null) ||
              boardOrig ||
              originalBgRef.current;
            if (
              !httpPlate ||
              (!httpPlate.startsWith("http") && !isLibraryAssetUrl(httpPlate))
            ) {
              return;
            }
            const mode = await pickHealModeForHole(httpPlate, holeForServer);
            const healed = await healBackgroundHoleRef.current(
              httpPlate,
              holeForServer,
              { mode },
            );
            if (resultRef.current) {
              applyHealedBackgroundRef.current(healed);
            }
          } catch {
            /* keep optimistic punch */
          }
        });
      };
      // Optimistic punches can run back-to-back; server heals stay ordered.
      void run();
    },
    [patchLayer, sourceUrl],
  );

  /** Turn a crop text layer into editable Konva text (clears plate first, with timeout). */
  const enableLiveText = useCallback(
    async (id: string) => {
      const cur = historyRef.current[historyIndexRef.current] ?? [];
      const layer = cur.find((l) => l.id === id);
      if (!layer || layer.kind !== "text") return;
      if (layer.useLiveText) return;

      // Switch to live text immediately so typing never freezes waiting on heal.
      const boardH = resultRef.current?.height ?? 1000;
      const earlyPatch: Partial<DecLayer> = {
        useLiveText: true,
        fontSize:
          layer.fontSize ??
          Math.max(14, Math.round((layer.hPct / 100) * boardH * 0.78)),
      };
      if (!layer.styleSampled) {
        const crop = layer.cropUrl || layer.cropDataUrl;
        if (crop) {
          try {
            const style = await sampleTextStyleFromCrop(crop);
            earlyPatch.fill = style.fill;
            earlyPatch.fontBold = style.fontBold;
            earlyPatch.styleSampled = true;
          } catch {
            earlyPatch.fill = layer.fill ?? "#111827";
            earlyPatch.styleSampled = true;
          }
        } else {
          earlyPatch.fill = layer.fill ?? "#111827";
          earlyPatch.styleSampled = true;
        }
      }
      patchLayer(id, earlyPatch);
      setNotice(t.textEditableNow);

      if (!layer.holeCleared && layer.bbox) {
        setNotice(t.enablingText);
        try {
          await Promise.race([
            clearHoleIfNeeded(id),
            new Promise<void>((resolve) => {
              window.setTimeout(resolve, 25_000);
            }),
          ]);
        } catch {
          /* still editable */
        }
        setNotice(t.textEditableNow);
      }
    },
    [clearHoleIfNeeded, patchLayer, t],
  );

  /** Draft wording in the inspector (does not switch to Konva live text). */
  const replaceTextOnLayer = useCallback(
    (id: string, editText: string) => {
      const cur = historyRef.current[historyIndexRef.current] ?? [];
      const layer = cur.find((l) => l.id === id);
      if (!layer || (layer.kind !== "text" && layer.kind !== "object")) return;

      patchLayer(id, {
        kind: layer.kind === "object" ? "text" : layer.kind,
        editText,
        text: editText,
        label: editText.slice(0, 80) || layer.label,
      });
    },
    [patchLayer, enableLiveText],
  );

  const duplicateSelected = useCallback(() => {
    if (!selectedId) return;
    const cur = historyRef.current[historyIndexRef.current] ?? [];
    const selected = cur.find((l) => l.id === selectedId);
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
  }, [selectedId, commitLayers]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      const typing = tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable;
      if (e.code === "Space" && !typing) {
        e.preventDefault();
        setSpaceDown(true);
        return;
      }
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
      if (meta && e.key.toLowerCase() === "d" && selectedId && !typing) {
        e.preventDefault();
        duplicateSelected();
        return;
      }
      if (e.key === "Escape") {
        setSelectedId(null);
        setBrushMode(false);
        setBoxMode(false);
        setBoxDrag(null);
        setGuides([]);
        return;
      }
      if ((e.key === "Delete" || e.key === "Backspace") && selectedId && !typing) {
        e.preventDefault();
        commitLayers((prev) => prev.filter((l) => l.id !== selectedId));
        setSelectedId(null);
        return;
      }
      if (!typing && selectedId && ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        e.preventDefault();
        const step = e.shiftKey ? 2 : 0.4;
        const dx = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
        const dy = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
        const tip = historyRef.current[historyIndexRef.current] ?? [];
        const cur = tip.find((l) => l.id === selectedId);
        if (!cur) return;
        patchLayer(selectedId, {
          xPct: Math.min(98, Math.max(-5, cur.xPct + dx)),
          yPct: Math.min(98, Math.max(-5, cur.yPct + dy)),
        });
      }
    }
    function onKeyUp(e: KeyboardEvent) {
      if (e.code === "Space") {
        setSpaceDown(false);
        setPanning(false);
        panLastRef.current = null;
      }
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [undo, redo, selectedId, commitLayers, duplicateSelected, patchLayer]);

  /**
   * Clear plate hole after lift.
   * Prefer local ring-fill — Flux Fill invents junk (wood doors) on white posters and is slow.
   */
  async function healBackgroundHole(
    bgUrl: string,
    hole: { left: number; top: number; width: number; height: number },
    opts?: { mode?: "auto" | "erase" | "fill" | "local" },
  ): Promise<{
    backgroundUrl: string;
    tokensCharged?: number;
    mode: "erase" | "fill" | "local" | "blur";
  }> {
    const healMode = opts?.mode ?? "local";
    const healUrl =
      bgUrl.startsWith("http") || isLibraryAssetUrl(bgUrl) ? bgUrl : null;
    if (healUrl) {
      try {
        const healRes = await fetch("/api/layer-heal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            background_url: healUrl,
            hole,
            mode: healMode,
          }),
        });
        const healJson = (await healRes.json()) as {
          backgroundUrl?: string;
          tokensCharged?: number;
          mode?: "erase" | "fill" | "local";
          error?: string;
        };
        if (healRes.ok && healJson.backgroundUrl) {
          return {
            backgroundUrl: healJson.backgroundUrl,
            tokensCharged: healJson.tokensCharged,
            mode: healJson.mode === "erase" || healJson.mode === "fill" ? healJson.mode : "local",
          };
        }
      } catch {
        // fall through
      }
    }
    const blurSource =
      (sourceUrl && (sourceUrl.startsWith("http") || isLibraryAssetUrl(sourceUrl))
        ? canvasDisplayUrl(sourceUrl)
        : null) ??
      canvasDisplayUrl(bgUrl) ??
      bgUrl;
    const blurUrl = await blurPunchBackground(blurSource, hole);
    return { backgroundUrl: blurUrl, mode: "blur" };
  }
  healBackgroundHoleRef.current = healBackgroundHole;

  function applyHealedBackground(
    healed: {
      backgroundUrl: string;
      tokensCharged?: number;
      mode: "erase" | "fill" | "local" | "blur";
    },
  ) {
    if (
      healed.backgroundUrl.startsWith("http") ||
      isLibraryAssetUrl(healed.backgroundUrl)
    ) {
      lastHttpBgRef.current = healed.backgroundUrl;
    }
    setResult((prev) => {
      if (!prev) return prev;
      const next = {
        ...prev,
        backgroundUrl: healed.backgroundUrl,
        backgroundDataUrl: healed.backgroundUrl,
        debug: {
          textDetected: prev.debug?.textDetected ?? 0,
          objectsDetected: prev.debug?.objectsDetected ?? 0,
          ...prev.debug,
          backgroundMode:
            healed.mode === "erase" || healed.mode === "fill"
              ? "erase"
              : healed.mode === "local"
                ? "local-heal"
                : prev.debug?.backgroundMode,
        },
      };
      resultRef.current = next;
      return next;
    });
    if (typeof healed.tokensCharged === "number") {
      setLastTokens(healed.tokensCharged);
      setNotice(
        healed.mode === "erase" || healed.mode === "fill"
          ? t.chargedErase(healed.tokensCharged)
          : healed.mode === "local"
            ? t.chargedHeal(healed.tokensCharged)
            : t.blurPunchFallback,
      );
    } else if (healed.mode === "blur") {
      // Quiet — optimistic punch; server refine will speak if needed.
    }
  }
  applyHealedBackgroundRef.current = applyHealedBackground;

  async function openSourceOnCanvas(imageUrl: string) {
    const display = canvasDisplayUrl(imageUrl) ?? imageUrl;
    const img = await loadImage(display);
    const width = img.naturalWidth || 1;
    const height = img.naturalHeight || 1;
    const nextResult: DecomposeResult = {
      width,
      height,
      backgroundUrl: imageUrl,
      backgroundDataUrl: imageUrl,
      originalBackgroundUrl: imageUrl,
      layers: [],
      debug: { textDetected: 0, objectsDetected: 0, backgroundMode: "original" },
    };
    if (imageUrl.startsWith("http") || isLibraryAssetUrl(imageUrl)) {
      lastHttpBgRef.current = imageUrl;
    }
    resultRef.current = nextResult;
    setResult(nextResult);
    historyRef.current = [[]];
    historyIndexRef.current = 0;
    setHistory([[]]);
    setHistoryIndex(0);
    setSelectedId(null);
    setBrushMode(false);
    setBoxMode(true);
    setBoxDrag(null);
    setBrushLines([]);
    setNotice(t.readyManualHint);
  }

  function seedLayersFromApi(
    decJson: DecomposeResult & {
      tokensCharged?: number;
      warning?: string;
      append?: boolean;
    },
    imageUrl: string,
    opts?: { append?: boolean; holeCleared?: boolean },
  ) {
    const bg = decJson.backgroundUrl || decJson.backgroundDataUrl || imageUrl;
    if (bg.startsWith("http") || isLibraryAssetUrl(bg)) {
      lastHttpBgRef.current = bg;
    }
    const append = opts?.append ?? Boolean(decJson.append);
    const holeCleared = opts?.holeCleared ?? true;
    const seeded = (decJson.layers ?? []).map((l) => {
      const crop = l.cropUrl || l.cropDataUrl || "";
      const preferLive = Boolean(l.useLiveText) && Boolean((l.text || "").trim());
      const boardH = decJson.height || 1000;
      return {
        ...l,
        cropUrl: crop,
        cropDataUrl: crop,
        editText: l.text || l.editText || "",
        text: l.text || "",
        useLiveText: preferLive,
        visible: true,
        locked: false,
        fontBold: l.fontBold !== false,
        fill: l.fill || "#111827",
        fontSize:
          l.fontSize ??
          (preferLive
            ? Math.max(14, Math.round((l.hPct / 100) * boardH * 0.78))
            : undefined),
        matted: false,
        styleSampled: preferLive ? false : Boolean(l.styleSampled),
        holeCleared,
        role: l.role,
      };
    });

    const nextLayers = append
      ? [...(historyRef.current[historyIndexRef.current] ?? []), ...seeded]
      : seeded;

    const nextResult = {
      ...decJson,
      backgroundUrl: bg,
      backgroundDataUrl: bg,
      originalBackgroundUrl:
        append
          ? resultRef.current?.originalBackgroundUrl ||
            decJson.originalBackgroundUrl ||
            imageUrl
          : decJson.originalBackgroundUrl || imageUrl,
      layers: nextLayers,
      width: decJson.width || resultRef.current?.width || 1,
      height: decJson.height || resultRef.current?.height || 1,
    };
    resultRef.current = nextResult;
    setResult(nextResult);
    if (append) {
      commitLayers(() => nextLayers);
    } else {
      historyRef.current = [nextLayers];
      historyIndexRef.current = 0;
      setHistory([nextLayers]);
      setHistoryIndex(0);
    }
    const pick = seeded[seeded.length - 1] ?? nextLayers[0];
    if (pick) setSelectedId(pick.id);
    else if (!append) setSelectedId(null);
    if (typeof decJson.tokensCharged === "number") {
      setLastTokens(decJson.tokensCharged);
    }

    // Sample ink colour for confident live-text layers (async, non-blocking).
    for (const l of seeded) {
      if (!l.useLiveText || l.styleSampled) continue;
      const crop = l.cropUrl || l.cropDataUrl;
      if (!crop) continue;
      void sampleTextStyleFromCrop(crop)
        .then((style) => {
          patchLayer(l.id, {
            fill: style.fill,
            fontBold: style.fontBold,
            styleSampled: true,
          });
        })
        .catch(() => {
          patchLayer(l.id, { styleSampled: true });
        });
    }

    return { seeded, nextLayers, warning: decJson.warning };
  }

  /** Hybrid: Florence text → BiRefNet hero → Qwen remainder (Qwen fills plate). */
  async function runSandwichSplit(imageUrl: string) {
    setBusy("decompose");
    setError(null);
    setNotice(t.sandwichSplitting);
    setBoxMode(false);
    setBrushMode(false);
    const dec = await fetch("/api/decompose-sandwich-layers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        image_url: imageUrl,
        num_layers: 6,
      }),
    });
    const decJson = (await dec.json()) as DecomposeResult & {
      error?: string;
      warning?: string;
      tokensCharged?: number;
      originalBackgroundUrl?: string;
      debug?: {
        qwenSkipped?: boolean;
        qwenObjectCount?: number;
        subjectLifted?: boolean;
        mode?: string;
      };
    };
    if (!dec.ok) throw new Error(decJson.error || t.decomposeFailed);

    if (typeof decJson.tokensCharged === "number") {
      setLastTokens(decJson.tokensCharged);
    }

    const plate =
      decJson.backgroundUrl ||
      decJson.backgroundDataUrl ||
      imageUrl;
    const displayJson = {
      ...decJson,
      backgroundUrl: plate,
      backgroundDataUrl: plate,
      originalBackgroundUrl: decJson.originalBackgroundUrl || imageUrl,
    };
    if (plate.startsWith("http") || isLibraryAssetUrl(plate)) {
      lastHttpBgRef.current = plate;
    }

    const { seeded, warning } = seedLayersFromApi(displayJson, imageUrl, {
      append: false,
      holeCleared: true,
    });
    if (!seeded.length) {
      setError(warning || t.noLayersDetected);
      setBoxMode(true);
      setBoxIntent("lift");
      setNotice(t.emptyLiftHint);
    } else if (decJson.debug?.qwenSkipped || warning === "qwen_skipped_tokens") {
      setError(t.sandwichPartialTokens);
      setNotice(t.sandwichPartialTokens);
      setBoxMode(false);
      setCropEditMode("ai");
    } else if (warning === "qwen_no_objects" || decJson.debug?.qwenObjectCount === 0) {
      // Text + hero still movable; plate should be punched under them.
      setNotice(
        seeded.length > 0
          ? t.sandwichReadyPartial(seeded.length)
          : t.sandwichNoObjects,
      );
      setBoxMode(false);
      setGrabMode(false);
      setBrushMode(false);
      setCropEditMode("ai");
    } else {
      setNotice(t.sandwichReady);
      setBoxMode(false);
      setGrabMode(false);
      setBrushMode(false);
      setCropEditMode("ai");
    }
  }

  /** Qwen-Image-Layered spike: one-shot RGBA layers + filled plate (no Florence heal). */
  async function runQwenSplit(imageUrl: string, crop?: { left: number; top: number; width: number; height: number }) {
    setBusy("decompose");
    setError(null);
    setNotice(crop ? t.qwenRegionSplitting : t.qwenSplitting);
    setBoxMode(false);
    setBrushMode(false);
    const dec = await fetch("/api/decompose-qwen-layers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        image_url: imageUrl,
        num_layers: crop ? 4 : 6,
        ...(crop ? { crop } : {}),
      }),
    });
    const decJson = (await dec.json()) as DecomposeResult & {
      error?: string;
      warning?: string;
      tokensCharged?: number;
      append?: boolean;
      originalBackgroundUrl?: string;
      debug?: { backgroundMode?: string; qwenLayerCount?: number };
    };
    if (!dec.ok) throw new Error(decJson.error || t.decomposeFailed);

    if (typeof decJson.tokensCharged === "number") {
      setLastTokens(decJson.tokensCharged);
    }

    const plate =
      decJson.backgroundUrl ||
      decJson.backgroundDataUrl ||
      imageUrl;
    const displayJson = {
      ...decJson,
      backgroundUrl: plate,
      backgroundDataUrl: plate,
      originalBackgroundUrl: decJson.originalBackgroundUrl || imageUrl,
    };
    if (plate.startsWith("http") || isLibraryAssetUrl(plate)) {
      lastHttpBgRef.current = plate;
    }

    const { seeded, warning } = seedLayersFromApi(displayJson, imageUrl, {
      append: Boolean(crop),
      holeCleared: true,
    });
    if (!seeded.length) {
      setError(warning || t.noLayersDetected);
      setBoxMode(true);
      setBoxIntent("lift");
      setNotice(t.emptyLiftHint);
    } else {
      setNotice(crop ? t.qwenRegionReady : t.qwenFullReady(seeded.length));
      setBoxMode(false);
      setCropEditMode("ai");
    }
  }

  /**
   * Aug 25: Florence cutouts → erase each hole on the working plate → empty bg.
   * Layers sit on the healed plate (holes already cleared).
   */
  async function runDecompose(
    imageUrl: string,
    opts?: { textOnly?: boolean; sam?: boolean },
  ) {
    const textOnly = Boolean(opts?.textOnly);
    const wantSam = opts?.sam !== false && !textOnly;
    setBusy("decompose");
    setError(null);
    setNotice(textOnly ? t.suggestingText : t.splittingLayers);
    setBoxMode(false);
    setBrushMode(false);
    const dec = await fetch("/api/decompose-image-layers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        image_url: imageUrl,
        sam: wantSam,
        // Layer-by-layer erase → final empty background (Aug 25).
        heal: true,
        text_only: textOnly,
        subject_matte: false,
      }),
    });
    const decJson = (await dec.json()) as DecomposeResult & {
      error?: string;
      warning?: string;
      tokensCharged?: number;
      creditBalance?: number;
      originalBackgroundUrl?: string;
      debug?: {
        samRefined?: number;
        subjectLifted?: boolean;
        backgroundMode?: string;
        sequentialErased?: number;
      };
    };
    if (!dec.ok) throw new Error(decJson.error || t.decomposeFailed);

    if (typeof decJson.tokensCharged === "number") {
      setLastTokens(decJson.tokensCharged);
    }

    const bgMode = decJson.debug?.backgroundMode ?? "original";
    const healed =
      bgMode !== "original" &&
      Boolean(decJson.backgroundUrl) &&
      decJson.backgroundUrl !== decJson.originalBackgroundUrl;
    const plate = healed
      ? decJson.backgroundUrl!
      : decJson.originalBackgroundUrl || imageUrl;
    const displayJson = {
      ...decJson,
      backgroundUrl: plate,
      backgroundDataUrl: plate,
      originalBackgroundUrl: decJson.originalBackgroundUrl || imageUrl,
    };

    const { seeded, warning } = seedLayersFromApi(displayJson, imageUrl, {
      append: false,
      holeCleared: Boolean(healed),
    });
    if (plate.startsWith("http") || isLibraryAssetUrl(plate)) {
      lastHttpBgRef.current = plate;
    }
    if (!seeded.length) {
      setError(warning || t.noLayersDetected);
      setBoxMode(true);
      setBoxIntent("lift");
      setNotice(t.emptyLiftHint);
    } else {
      const samN = decJson.debug?.samRefined ?? 0;
      const erasedN = decJson.debug?.sequentialErased ?? 0;
      setNotice(
        healed
          ? erasedN > 0
            ? t.florenceSamReady(seeded.length, Math.max(samN, erasedN))
            : samN > 0
              ? t.florenceSamReady(seeded.length, samN)
              : t.florenceSamReady(seeded.length, 0)
          : samN > 0
            ? t.florenceSamMatchReady(seeded.length, samN)
            : t.florenceMatchReady(seeded.length),
      );
      setBoxMode(false);
      setCropEditMode("ai");
    }
  }

  function resetWorkspace() {
    saveSession(null);
    resultRef.current = null;
    setResult(null);
    historyRef.current = [[]];
    historyIndexRef.current = 0;
    setHistory([[]]);
    setHistoryIndex(0);
    setSelectedId(null);
    setBrushMode(false);
    setBoxMode(false);
    setBoxDrag(null);
    setBrushLines([]);
    setLastTokens(null);
    setSourceUrl(null);
    originalBgRef.current = null;
    healingIdsRef.current.clear();
  }

  async function onPickFile(file: File) {
    setError(null);
    setNotice(null);
    resetWorkspace();
    setBusy("upload");
    try {
      if (file.size > 25 * 1024 * 1024) throw new Error(t.imageTooLarge);
      if (file.type && !file.type.startsWith("image/")) throw new Error(t.chooseImageFile);
      const fd = new FormData();
      fd.set("file", file);
      const up = await fetch("/api/upload-edit-image", {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      const upJson = (await up.json()) as { url?: string; error?: string };
      if (!up.ok || !upJson.url) throw new Error(upJson.error || t.uploadFailed);
      setSourceUrl(upJson.url);
      originalBgRef.current = upJson.url;
      await openSourceOnCanvas(upJson.url);
      // Keep original intact — selective lift + perfect cutout is the default path.
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t.somethingFailed);
    } finally {
      setBusy(null);
    }
  }

  async function onPickLibrary(url: string) {
    setError(null);
    setNotice(null);
    resetWorkspace();
    setLibraryOpen(false);
    setSourceUrl(url);
    originalBgRef.current = url;
    setBusy("upload");
    try {
      await openSourceOnCanvas(url);
      // Keep original intact — selective lift + perfect cutout is the default path.
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t.somethingFailed);
    } finally {
      setBusy(null);
    }
  }

  async function onDetectAll() {
    const url = sourceUrl || result?.originalBackgroundUrl || result?.backgroundUrl;
    if (!url) return;
    setBusy("decompose");
    setError(null);
    try {
      // Primary = Aug 25 Florence + SAM + heal (not Qwen).
      await runDecompose(url, { textOnly: false, sam: true });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t.somethingFailed);
    } finally {
      setBusy(null);
    }
  }

  /** Spike: fal Qwen-Image-Layered full split (compare vs Florence). */
  async function onQwenSplit() {
    const url = sourceUrl || result?.originalBackgroundUrl || result?.backgroundUrl;
    if (!url) return;
    setBusy("decompose");
    setError(null);
    try {
      await runQwenSplit(url);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t.somethingFailed);
    } finally {
      setBusy(null);
    }
  }

  async function onSuggestText() {
    const url = sourceUrl || result?.originalBackgroundUrl || result?.backgroundUrl;
    if (!url) return;
    setBusy("decompose");
    setError(null);
    try {
      await runDecompose(url, { textOnly: true, sam: false });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t.somethingFailed);
    } finally {
      setBusy(null);
    }
  }

  /** Hybrid Split: Florence text + BiRefNet hero + Qwen remainder. */
  async function onHybridSplit() {
    const url = sourceUrl || result?.originalBackgroundUrl || result?.backgroundUrl;
    if (!url) return;
    setBusy("decompose");
    setError(null);
    try {
      await runSandwichSplit(url);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t.somethingFailed);
    } finally {
      setBusy(null);
    }
  }

  /** Optional advanced: old sandwich + Qwen peel (kept for experiments). */
  async function onSandwichAdvanced() {
    await onHybridSplit();
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
      label: t.newText,
      text: t.newText,
      editText: t.newText,
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
        img.onerror = () => reject(new Error(t.logoLoadFailed));
        img.src = resolved.displayUrl;
      });
      const aspect = img.naturalWidth / Math.max(1, img.naturalHeight);
      const wPct = 18;
      const hPct = wPct / aspect;
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
        label: t.brandLogoLabel,
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
      setError(e instanceof Error ? e.message : t.couldNotAddLogo);
    } finally {
      if (revoke) URL.revokeObjectURL(revoke);
      setLogoBusy(false);
    }
  }

  /**
   * After a selective lift: key text plates or BiRefNet-matte objects, then heal
   * using the tight opaque content bbox (not the loose selection rect).
   */
  async function perfectLiftCutout(opts: {
    layerId: string;
    cropDataUrl: string;
    bbox: ImageBBox;
    bgUrl: string;
    /** Skip AI matte (e.g. AI-edit region needs context). Still heals. */
    skipMatte?: boolean;
  }): Promise<void> {
    const { layerId, bbox, bgUrl, skipMatte } = opts;
    let cropDataUrl = opts.cropDataUrl;
    let healHole: ImageBBox = bbox;
    let matted = false;
    let matteFailed = false;

    if (!skipMatte) {
      setBusy("matte");
      setNotice(t.cuttingCleanly);
      try {
        const keyed = await tryKeyTextCrop(cropDataUrl);
        if (keyed) {
          cropDataUrl = keyed.cropDataUrl;
          healHole = contentBBoxToImage(bbox, keyed.contentBBox);
          matted = true;
          patchLayer(layerId, {
            kind: "text",
            cropUrl: cropDataUrl,
            cropDataUrl,
            matted: true,
            label: t.text,
          });
        } else {
          const layer = {
            id: layerId,
            cropUrl: cropDataUrl,
            cropDataUrl,
          } as DecLayer;
          const httpCrop = await ensureHttpCrop(layer);
          if (httpCrop) {
            const res = await fetch("/api/layer-matte", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({ crop_url: httpCrop }),
            });
            const json = (await res.json()) as {
              cropUrl?: string;
              tokensCharged?: number;
              error?: string;
            };
            if (res.ok && json.cropUrl) {
              cropDataUrl = json.cropUrl;
              matted = true;
              patchLayer(layerId, {
                cropUrl: json.cropUrl,
                cropDataUrl: json.cropUrl,
                matted: true,
              });
              if (typeof json.tokensCharged === "number") {
                setLastTokens(json.tokensCharged);
              }
              const content = await contentBBoxFromCrop(json.cropUrl);
              if (content) {
                healHole = contentBBoxToImage(bbox, content);
                // Tighten layer placement to opaque content.
                const board = resultRef.current;
                const imgW = board?.width ?? bbox.left + bbox.width;
                const imgH = board?.height ?? bbox.top + bbox.height;
                const tightLeft = bbox.left + content.left;
                const tightTop = bbox.top + content.top;
                patchLayer(layerId, {
                  bbox: {
                    left: tightLeft,
                    top: tightTop,
                    width: content.width,
                    height: content.height,
                  },
                  xPct: (tightLeft / imgW) * 100,
                  yPct: (tightTop / imgH) * 100,
                  wPct: (content.width / imgW) * 100,
                  hPct: (content.height / imgH) * 100,
                });
              }
            } else {
              matteFailed = true;
            }
          } else {
            matteFailed = true;
          }
        }
      } catch {
        matteFailed = true;
      } finally {
        setBusy(null);
      }
    }

    // Clamp heal hole to board.
    const board = resultRef.current;
    const imgW = board?.width ?? healHole.left + healHole.width;
    const imgH = board?.height ?? healHole.top + healHole.height;
    const hole: ImageBBox = {
      left: Math.max(0, Math.min(healHole.left, imgW - 1)),
      top: Math.max(0, Math.min(healHole.top, imgH - 1)),
      width: Math.max(1, Math.min(healHole.width, imgW - Math.max(0, healHole.left))),
      height: Math.max(1, Math.min(healHole.height, imgH - Math.max(0, healHole.top))),
    };

    try {
      const healed = await healBackgroundHole(bgUrl, hole);
      applyHealedBackground(healed);
      patchLayer(layerId, { holeCleared: true });
      if (matteFailed) {
        setNotice(t.matteSkippedFallback);
      } else if (matted || skipMatte) {
        setNotice(t.cutReadyHealed);
      }
    } catch {
      if (matteFailed) setNotice(t.matteSkippedFallback);
      /* hole clears on first move */
    }

    // Ensure HTTP crop for later AI rewrite even after local keying.
    if (cropDataUrl.startsWith("data:")) {
      void ensureHttpCrop({
        id: layerId,
        cropUrl: cropDataUrl,
        cropDataUrl,
      } as DecLayer);
    }
  }

  async function createLayerFromBrush() {
    const strokes = brushLinesRef.current;
    if (!canEdit || !result || strokes.length === 0) {
      setError(t.paintFirst);
      return;
    }
    if (brushIntent === "erase") {
      await eraseBrushRegion();
      return;
    }
    // Sanity: strokes should land on the photo, not the empty letterbox.
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    let points = 0;
    for (const s of strokes) {
      for (let i = 0; i + 1 < s.length; i += 2) {
        const x = s[i]!;
        const y = s[i + 1]!;
        if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
        points += 1;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
    if (
      points < 2 ||
      maxX < 0 ||
      maxY < 0 ||
      minX > imageLayout.w ||
      minY > imageLayout.h
    ) {
      setError(t.brushMappedWrong);
      return;
    }

    setBrushBusy(true);
    setError(null);
    const layerId = crypto.randomUUID();
    try {
      const bgUrl =
        resultRef.current?.backgroundUrl ||
        resultRef.current?.backgroundDataUrl ||
        result.backgroundUrl ||
        result.backgroundDataUrl;
      if (!bgUrl) throw new Error(t.somethingFailed);
      const sourceImg = await loadImage(canvasDisplayUrl(bgUrl) ?? bgUrl);
      const imgW = sourceImg.naturalWidth || result.width;
      const imgH = sourceImg.naturalHeight || result.height;
      // Keep board size in sync with the bitmap we cut from (heal can change URLs).
      if (imgW !== result.width || imgH !== result.height) {
        setResult((prev) => (prev ? { ...prev, width: imgW, height: imgH } : prev));
      }
      const mask = buildBrushMaskCanvas(
        strokes,
        Math.max(brushSize, 24),
        imageLayout.w,
        imageLayout.h,
        imgW,
        imgH,
      );
      const cut = cutoutFromSourceAndMask(sourceImg, mask);
      if (!cut) {
        setError(t.brushEmpty);
        return;
      }
      // Area fraction (0–1). Old check used wPct*hPct > 65 which rejected ~every real cut.
      const areaFrac = (cut.wPct / 100) * (cut.hPct / 100);
      if (areaFrac > 0.85) {
        setError(t.brushMappedWrong);
        return;
      }

      pushLayer({
        id: layerId,
        kind: "object",
        label: t.brushCutoutLabel,
        text: "",
        cropDataUrl: cut.cropDataUrl,
        cropUrl: cut.cropDataUrl,
        bbox: cut.bbox,
        xPct: cut.xPct,
        yPct: cut.yPct,
        wPct: cut.wPct,
        hPct: cut.hPct,
        visible: true,
        locked: false,
        holeCleared: false,
      });

      setBrushLines([]);
      brushLinesRef.current = [];
      setBrushMode(false);
      setNotice(t.cuttingCleanly);

      await perfectLiftCutout({
        layerId,
        cropDataUrl: cut.cropDataUrl,
        bbox: cut.bbox,
        bgUrl,
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t.brushFailed);
    } finally {
      setBrushBusy(false);
    }
  }

  async function eraseBrushRegion() {
    const strokes = brushLinesRef.current;
    if (!canEdit || !result || strokes.length === 0) {
      setError(t.paintFirst);
      return;
    }
    setBrushBusy(true);
    setError(null);
    try {
      const bgUrl =
        resultRef.current?.backgroundUrl ||
        resultRef.current?.backgroundDataUrl ||
        result.backgroundUrl ||
        result.backgroundDataUrl;
      if (!bgUrl) throw new Error(t.somethingFailed);
      const sourceImg = await loadImage(canvasDisplayUrl(bgUrl) ?? bgUrl);
      const imgW = sourceImg.naturalWidth || result.width;
      const imgH = sourceImg.naturalHeight || result.height;
      const bbox = brushStrokesImageBBox(
        strokes,
        Math.max(brushSize, 24),
        imageLayout.w,
        imageLayout.h,
        imgW,
        imgH,
      );
      if (!bbox || bbox.width < 8 || bbox.height < 8) {
        setError(t.brushEmpty);
        return;
      }
      setNotice(t.erasingHole);
      const healed = await healBackgroundHole(bgUrl, bbox, { mode: "local" });
      applyHealedBackground(healed);
      setBrushLines([]);
      brushLinesRef.current = [];
      setBrushMode(false);
      setNotice(t.erasePaintedDone);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t.somethingFailed);
    } finally {
      setBrushBusy(false);
    }
  }

  /** Click-grab: auto box around the tap, lift + heal. */
  async function grabAtStagePoint(pos: { x: number; y: number }) {
    if (!canEdit || !result) return;
    const side = Math.max(56, Math.min(imageLayout.w, imageLayout.h) * 0.32);
    const x = Math.max(0, Math.min(imageLayout.w - side, pos.x - side / 2));
    const y = Math.max(0, Math.min(imageLayout.h - side, pos.y - side / 2));
    const w = Math.min(side, imageLayout.w - x);
    const h = Math.min(side, imageLayout.h - y);
    setGrabMode(false);
    setBoxIntent("lift");
    setBoxMode(false);
    await createLayerFromBox({ x, y, w, h });
    setNotice(t.grabClickReady);
  }

  async function runMagicExpand(presetId: "square" | "story" | "landscape" | "wider") {
    if (!canEdit || !result) return;
    const bgUrl =
      resultRef.current?.backgroundUrl ||
      resultRef.current?.backgroundDataUrl ||
      result.backgroundUrl ||
      result.backgroundDataUrl;
    if (!bgUrl || (!bgUrl.startsWith("http") && !isLibraryAssetUrl(bgUrl))) {
      setError(t.expandNeedHttpBg);
      return;
    }
    setBusy("export");
    setError(null);
    setNotice(t.expanding);
    try {
      const res = await fetch("/api/layer-expand", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ image_url: bgUrl, preset: presetId }),
      });
      const json = (await res.json()) as {
        imageUrl?: string;
        width?: number;
        height?: number;
        tokensCharged?: number;
        warning?: string;
        error?: string;
      };
      if (!res.ok || !json.imageUrl) throw new Error(json.error || t.expandFailed);

      const oldW = result.width;
      const oldH = result.height;
      const newW = json.width || oldW;
      const newH = json.height || oldH;
      const dxPct = ((newW - oldW) / 2 / Math.max(1, newW)) * 100;
      const dyPct = ((newH - oldH) / 2 / Math.max(1, newH)) * 100;
      const sx = oldW / Math.max(1, newW);
      const sy = oldH / Math.max(1, newH);

      const shifted = (historyRef.current[historyIndexRef.current] ?? []).map((l) => ({
        ...l,
        xPct: l.xPct * sx + dxPct,
        yPct: l.yPct * sy + dyPct,
        wPct: l.wPct * sx,
        hPct: l.hPct * sy,
        bbox: l.bbox
          ? {
              left: Math.round(l.bbox.left + (newW - oldW) / 2),
              top: Math.round(l.bbox.top + (newH - oldH) / 2),
              width: l.bbox.width,
              height: l.bbox.height,
            }
          : l.bbox,
      }));

      const nextResult = {
        ...result,
        width: newW,
        height: newH,
        backgroundUrl: json.imageUrl,
        backgroundDataUrl: json.imageUrl,
        layers: shifted,
      };
      resultRef.current = nextResult;
      setResult(nextResult);
      historyRef.current = [shifted];
      historyIndexRef.current = 0;
      setHistory([shifted]);
      setHistoryIndex(0);
      if (typeof json.tokensCharged === "number" && json.tokensCharged > 0) {
        setLastTokens(json.tokensCharged);
      }
      setNotice(json.warning === "already_aspect" ? t.expandAlready : t.expandDone);
      setViewScale(1);
      setViewPos({ x: 0, y: 0 });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t.expandFailed);
    } finally {
      setBusy(null);
    }
  }

  async function handleMagicChat(raw: string) {
    const intent = parseMagicChatIntent(raw);
    switch (intent.type) {
      case "help":
        setNotice(t.magicChatHelp);
        return;
      case "split":
        await onDetectAll();
        return;
      case "grab_mode":
        setGrabMode(true);
        setBoxMode(false);
        setBrushMode(false);
        setSelectedId(null);
        setNotice(t.grabClickHint);
        return;
      case "brush_erase_mode":
        setBrushIntent("erase");
        setBrushMode(true);
        setGrabMode(false);
        setBoxMode(false);
        setSelectedId(null);
        setNotice(t.brushEraseHint);
        return;
      case "erase_mode":
        setBoxIntent("erase");
        setBoxMode(true);
        setGrabMode(false);
        setBrushMode(false);
        setSelectedId(null);
        setNotice(t.eraseHint);
        return;
      case "expand":
        await runMagicExpand(intent.preset);
        return;
      case "rewrite": {
        if (!selected || (selected.kind !== "text" && selected.kind !== "object")) {
          setError(t.magicChatNeedText);
          return;
        }
        const wording = (intent.text || selected.editText || selected.text || "").trim();
        if (!wording) {
          setError(t.magicChatNeedText);
          setCropEditMode("text");
          return;
        }
        setCropEditMode("text");
        patchLayer(selected.id, {
          editText: wording,
          text: wording,
          label: wording.slice(0, 80),
        });
        setBusy("rewrite");
        setError(null);
        setNotice(t.aiRewriting);
        try {
          await clearHoleIfNeeded(selected.id);
          const crop = await ensureHttpCrop(selected);
          if (!crop) {
            setNotice(t.aiRewriteNeedHttpCrop);
            if (selected.kind === "text") await enableLiveText(selected.id);
            return;
          }
          const json = await runCropAiEdit({
            id: selected.id,
            cropUrl: crop,
            newText: wording,
            oldText: selected.text || selected.label || "",
          });
          patchLayer(selected.id, {
            kind: "text",
            cropUrl: json.cropUrl,
            cropDataUrl: json.cropUrl,
            text: wording,
            editText: wording,
            label: wording.slice(0, 80),
            useLiveText: false,
          });
          if (typeof json.tokensCharged === "number") setLastTokens(json.tokensCharged);
          setNotice(t.aiRewriteDone);
        } catch (e: unknown) {
          setError(e instanceof Error ? e.message : t.aiRewriteFailed);
        } finally {
          setBusy(null);
        }
        return;
      }
      case "ai_edit": {
        if (!selected || (selected.kind !== "text" && selected.kind !== "object")) {
          setError(t.magicChatNeedLayer);
          return;
        }
        setCropEditMode("ai");
        setEditInstruction(intent.instruction);
        await new Promise((r) => requestAnimationFrame(() => r(null)));
        // Run with explicit instruction (state may lag)
        setBusy("rewrite");
        setError(null);
        setNotice(t.aiEditingCrop);
        try {
          await clearHoleIfNeeded(selected.id);
          const crop = await ensureHttpCrop(selected);
          if (!crop) throw new Error(t.aiEditCropFailed);
          const json = await runCropAiEdit({
            id: selected.id,
            cropUrl: crop,
            instruction: intent.instruction,
          });
          patchLayer(selected.id, {
            cropUrl: json.cropUrl,
            cropDataUrl: json.cropUrl,
          });
          if (typeof json.tokensCharged === "number") setLastTokens(json.tokensCharged);
          setNotice(t.aiEditCropDone);
          setEditInstruction("");
        } catch (e: unknown) {
          setError(e instanceof Error ? e.message : t.aiEditCropFailed);
        } finally {
          setBusy(null);
        }
        return;
      }
      default:
        setNotice(t.magicChatHelp);
    }
  }

  async function eraseBoxRegion(stageRect: {
    x: number;
    y: number;
    w: number;
    h: number;
  }) {
    if (!canEdit || !result) return;
    setBrushBusy(true);
    setError(null);
    try {
      const bgUrl =
        resultRef.current?.backgroundUrl ||
        resultRef.current?.backgroundDataUrl ||
        result.backgroundUrl ||
        result.backgroundDataUrl;
      if (!bgUrl) throw new Error(t.somethingFailed);
      const sourceImg = await loadImage(canvasDisplayUrl(bgUrl) ?? bgUrl);
      const imgW = sourceImg.naturalWidth || result.width;
      const imgH = sourceImg.naturalHeight || result.height;
      const sx = imgW / Math.max(1, imageLayout.w);
      const sy = imgH / Math.max(1, imageLayout.h);
      const left = Math.max(0, Math.floor(Math.min(stageRect.x, stageRect.x + stageRect.w) * sx));
      const top = Math.max(0, Math.floor(Math.min(stageRect.y, stageRect.y + stageRect.h) * sy));
      const width = Math.max(
        1,
        Math.min(imgW - left, Math.ceil(Math.abs(stageRect.w) * sx)),
      );
      const height = Math.max(
        1,
        Math.min(imgH - top, Math.ceil(Math.abs(stageRect.h) * sy)),
      );
      if (width < 8 || height < 8) {
        setError(t.brushEmpty);
        return;
      }
      setNotice(t.erasingHole);
      const healed = await healBackgroundHole(bgUrl, { left, top, width, height });
      applyHealedBackground(healed);
      setBoxMode(false);
      setBoxDrag(null);
      setNotice(t.eraseDone);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t.somethingFailed);
    } finally {
      setBrushBusy(false);
    }
  }

  async function qwenBoxRegion(stageRect: {
    x: number;
    y: number;
    w: number;
    h: number;
  }) {
    if (!canEdit || !result) return;
    setBrushBusy(true);
    setError(null);
    try {
      const bgUrl =
        resultRef.current?.backgroundUrl ||
        resultRef.current?.backgroundDataUrl ||
        result.backgroundUrl ||
        result.backgroundDataUrl;
      if (!bgUrl || (!bgUrl.startsWith("http") && !isLibraryAssetUrl(bgUrl))) {
        throw new Error(t.qwenNeedHttpBg);
      }
      const sourceImg = await loadImage(canvasDisplayUrl(bgUrl) ?? bgUrl);
      const imgW = sourceImg.naturalWidth || result.width;
      const imgH = sourceImg.naturalHeight || result.height;
      const sx = imgW / Math.max(1, imageLayout.w);
      const sy = imgH / Math.max(1, imageLayout.h);
      const left = Math.max(0, Math.floor(Math.min(stageRect.x, stageRect.x + stageRect.w) * sx));
      const top = Math.max(0, Math.floor(Math.min(stageRect.y, stageRect.y + stageRect.h) * sy));
      const width = Math.max(
        1,
        Math.min(imgW - left, Math.ceil(Math.abs(stageRect.w) * sx)),
      );
      const height = Math.max(
        1,
        Math.min(imgH - top, Math.ceil(Math.abs(stageRect.h) * sy)),
      );
      if (width < 16 || height < 16) {
        setError(t.brushEmpty);
        return;
      }
      if ((width * height) / (imgW * imgH) > 0.85) {
        setError(t.boxTooLarge);
        return;
      }
      setBoxMode(false);
      setBoxDrag(null);
      setBusy("decompose");
      await runQwenSplit(bgUrl, { left, top, width, height });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t.somethingFailed);
    } finally {
      setBrushBusy(false);
      setBusy(null);
    }
  }

  async function createLayerFromBox(stageRect: {
    x: number;
    y: number;
    w: number;
    h: number;
  }) {
    if (!canEdit || !result) return;
    if (boxIntent === "erase") {
      await eraseBoxRegion(stageRect);
      return;
    }
    if (boxIntent === "qwen") {
      await qwenBoxRegion(stageRect);
      return;
    }
    const forAiEdit = boxIntent === "ai";
    setBrushBusy(true);
    setError(null);
    const layerId = crypto.randomUUID();
    try {
      const bgUrl =
        resultRef.current?.backgroundUrl ||
        resultRef.current?.backgroundDataUrl ||
        result.backgroundUrl ||
        result.backgroundDataUrl;
      if (!bgUrl) throw new Error(t.somethingFailed);
      const sourceImg = await loadImage(canvasDisplayUrl(bgUrl) ?? bgUrl);
      const imgW = sourceImg.naturalWidth || result.width;
      const imgH = sourceImg.naturalHeight || result.height;
      if (imgW !== result.width || imgH !== result.height) {
        setResult((prev) => (prev ? { ...prev, width: imgW, height: imgH } : prev));
      }
      const sx = imgW / Math.max(1, imageLayout.w);
      const sy = imgH / Math.max(1, imageLayout.h);
      const left = Math.max(0, Math.floor(Math.min(stageRect.x, stageRect.x + stageRect.w) * sx));
      const top = Math.max(0, Math.floor(Math.min(stageRect.y, stageRect.y + stageRect.h) * sy));
      const width = Math.max(
        1,
        Math.min(imgW - left, Math.ceil(Math.abs(stageRect.w) * sx)),
      );
      const height = Math.max(
        1,
        Math.min(imgH - top, Math.ceil(Math.abs(stageRect.h) * sy)),
      );
      if (width < 8 || height < 8) {
        setError(t.brushEmpty);
        return;
      }
      if ((width * height) / (imgW * imgH) > 0.85) {
        setError(t.boxTooLarge);
        return;
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error(t.somethingFailed);
      ctx.drawImage(sourceImg, left, top, width, height, 0, 0, width, height);
      let cropDataUrl: string;
      try {
        cropDataUrl = canvas.toDataURL("image/png");
      } catch {
        throw new Error(t.brushFailed);
      }
      const bbox = { left, top, width, height };
      pushLayer({
        id: layerId,
        kind: "object",
        label: forAiEdit ? t.aiEditRegion : t.boxLift,
        text: "",
        cropDataUrl,
        cropUrl: cropDataUrl,
        bbox,
        xPct: (left / imgW) * 100,
        yPct: (top / imgH) * 100,
        wPct: (width / imgW) * 100,
        hPct: (height / imgH) * 100,
        visible: true,
        locked: false,
        holeCleared: false,
      });

      setBoxMode(false);
      setBoxDrag(null);
      if (forAiEdit) {
        setCropEditMode("ai");
        setEditInstruction("");
        setNotice(t.aiEditRegionReady);
        window.setTimeout(() => instructionRef.current?.focus(), 180);
        // AI-edit keeps context crop; still heal the plate hole under the box.
        void perfectLiftCutout({
          layerId,
          cropDataUrl,
          bbox,
          bgUrl,
          skipMatte: true,
        }).then(async () => {
          const layer = {
            id: layerId,
            cropUrl: cropDataUrl,
            cropDataUrl,
          } as DecLayer;
          await ensureHttpCrop(layer);
        });
      } else {
        setNotice(t.cuttingCleanly);
        await perfectLiftCutout({
          layerId,
          cropDataUrl,
          bbox,
          bgUrl,
        });
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t.brushFailed);
    } finally {
      setBrushBusy(false);
    }
  }

  async function makeSelectedEditableText() {
    if (!selected || (selected.kind !== "object" && selected.kind !== "text")) return;
    const id = selected.id;
    const raw = (selected.editText || selected.text || "").trim();
    // Brush/box lifts use tool names as labels — don't burn those in as copy.
    const toolLabel = /cutout|框选|框選|笔刷|筆刷|抠图|摳圖|去背|box select/i.test(
      selected.label || "",
    );
    const wording =
      selected.kind === "object" && (!raw || toolLabel) ? t.newText : raw || t.newText;
    if (selected.kind === "object") {
      patchLayer(id, {
        kind: "text",
        useLiveText: false,
        editText: wording,
        text: wording,
        label: wording.slice(0, 80),
      });
      await new Promise((r) => requestAnimationFrame(() => r(null)));
    } else {
      patchLayer(id, {
        editText: wording,
        text: wording,
        label: wording.slice(0, 80),
      });
    }
    await enableLiveText(id);
  }

  /**
   * Canva-like text change: keep crop as style reference, AI redraws new wording.
   * Clears the plate hole first so old letters are not left underneath.
   */
  async function ensureHttpCrop(layer: DecLayer): Promise<string | null> {
    const crop = layer.cropUrl || layer.cropDataUrl;
    if (!crop) return null;
    if (crop.startsWith("http") || isLibraryAssetUrl(crop)) return crop;
    if (!crop.startsWith("data:")) return null;
    try {
      const blob = dataUrlToBlob(crop);
      const fd = new FormData();
      fd.set("file", new File([blob], `layer-${layer.id.slice(0, 8)}.png`, { type: "image/png" }));
      const up = await fetch("/api/upload-edit-image", {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      const upJson = (await up.json()) as { url?: string; error?: string };
      if (!up.ok || !upJson.url) return null;
      patchLayer(layer.id, { cropUrl: upJson.url, cropDataUrl: upJson.url });
      return upJson.url;
    } catch {
      return null;
    }
  }

  async function runCropAiEdit(opts: {
    id: string;
    cropUrl: string;
    newText?: string;
    oldText?: string;
    instruction?: string;
  }) {
    const res = await fetch("/api/layer-crop-edit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        crop_url: opts.cropUrl,
        new_text: opts.newText,
        old_text: opts.oldText,
        instruction: opts.instruction,
      }),
    });
    const json = (await res.json()) as {
      cropUrl?: string;
      tokensCharged?: number;
      error?: string;
      mode?: string;
    };
    if (!res.ok || !json.cropUrl) {
      throw new Error(json.error || t.aiEditCropFailed);
    }
    return json;
  }

  async function aiRewriteSelectedText() {
    if (!selected || (selected.kind !== "text" && selected.kind !== "object")) return;
    const id = selected.id;
    const newText = (selected.editText ?? selected.text ?? "").trim();
    if (!newText) {
      setError(t.aiRewriteNeedText);
      return;
    }

    setBusy("rewrite");
    setError(null);
    setNotice(t.aiRewriting);
    try {
      await clearHoleIfNeeded(id);
      const crop = await ensureHttpCrop(selected);
      if (!crop) {
        setNotice(t.aiRewriteNeedHttpCrop);
        if (selected.kind === "text") await enableLiveText(id);
        return;
      }
      const json = await runCropAiEdit({
        id,
        cropUrl: crop,
        newText,
        oldText: selected.text || selected.label || "",
      });
      patchLayer(id, {
        kind: "text",
        cropUrl: json.cropUrl,
        cropDataUrl: json.cropUrl,
        text: newText,
        editText: newText,
        label: newText.slice(0, 80),
        useLiveText: false,
        holeCleared: true,
      });
      if (typeof json.tokensCharged === "number") {
        setLastTokens(json.tokensCharged);
        setNotice(t.chargedAiRewrite(json.tokensCharged));
      } else {
        setNotice(t.aiRewriteDone);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t.aiRewriteFailed);
    } finally {
      setBusy(null);
    }
  }

  async function aiEditSelectedCrop() {
    if (!selected || (selected.kind !== "text" && selected.kind !== "object")) return;
    const id = selected.id;
    const instruction = editInstruction.trim();
    if (!instruction) {
      setError(t.aiEditNeedInstruction);
      return;
    }

    setBusy("rewrite");
    setError(null);
    setNotice(t.aiEditingCrop);
    try {
      await clearHoleIfNeeded(id);
      const crop = await ensureHttpCrop(selected);
      if (!crop) {
        setError(t.aiRewriteNeedHttpCrop);
        return;
      }
      const json = await runCropAiEdit({ id, cropUrl: crop, instruction });
      patchLayer(id, {
        cropUrl: json.cropUrl,
        cropDataUrl: json.cropUrl,
        useLiveText: false,
        holeCleared: true,
        label: instruction.slice(0, 40) || selected.label,
      });
      if (typeof json.tokensCharged === "number") {
        setLastTokens(json.tokensCharged);
        setNotice(t.chargedAiEditCrop(json.tokensCharged));
      } else {
        setNotice(t.aiEditCropDone);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t.aiEditCropFailed);
    } finally {
      setBusy(null);
    }
  }

  function brushPointerPos(stage: StageType | null): { x: number; y: number } | null {
    if (!stage) return null;
    // Prefer image-plane local coords — correctly handles Stage scale/pan.
    const plane = stage.findOne("#image-plane");
    if (plane) {
      const rel = plane.getRelativePointerPosition();
      if (rel && Number.isFinite(rel.x) && Number.isFinite(rel.y)) {
        return { x: rel.x, y: rel.y };
      }
    }
    const pos = stage.getPointerPosition();
    if (!pos) return null;
    const abs = stage.getAbsoluteTransform().copy().invert();
    const p = abs.point(pos);
    return { x: p.x - imageLayout.x, y: p.y - imageLayout.y };
  }

  function stageToPngDataUrl(): string {
    const stage = stageRef.current;
    if (!stage || !result) throw new Error(t.nothingToExport);
    const prev = {
      scaleX: stage.scaleX(),
      scaleY: stage.scaleY(),
      x: stage.x(),
      y: stage.y(),
    };
    stage.scale({ x: 1, y: 1 });
    stage.position({ x: 0, y: 0 });
    stage.batchDraw();
    try {
      return stage.toDataURL({
        pixelRatio: result.width / Math.max(1, imageLayout.w),
        mimeType: "image/png",
        x: imageLayout.x,
        y: imageLayout.y,
        width: imageLayout.w,
        height: imageLayout.h,
      });
    } finally {
      stage.scale({ x: prev.scaleX, y: prev.scaleY });
      stage.position({ x: prev.x, y: prev.y });
      stage.batchDraw();
    }
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

  async function refineMatteSelected() {
    if (!selected || selected.kind === "shape") return;
    const crop = selected.cropUrl || selected.cropDataUrl;
    if (!crop || selected.matted) return;
    setBusy("matte");
    setError(null);
    try {
      let body: { crop_url?: string; image_url?: string; bbox?: DecLayer["bbox"] } | null = null;
      if (crop.startsWith("http") || isLibraryAssetUrl(crop)) {
        body = { crop_url: crop };
      } else if (sourceUrl && selected.bbox) {
        body = { image_url: sourceUrl, bbox: selected.bbox };
      }
      if (!body) throw new Error(t.noCropForMatte);
      const res = await fetch("/api/layer-matte", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as {
        cropUrl?: string;
        tokensCharged?: number;
        error?: string;
      };
      if (!res.ok || !json.cropUrl) throw new Error(json.error || t.matteFailed);
      patchLayer(selected.id, {
        cropUrl: json.cropUrl,
        cropDataUrl: json.cropUrl,
        matted: true,
      });
      if (typeof json.tokensCharged === "number") {
        setLastTokens(json.tokensCharged);
        setNotice(t.chargedMatte(json.tokensCharged));
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t.matteFailed);
    } finally {
      setBusy(null);
    }
  }

  async function downloadPng() {
    if (!result) return;
    setSelectedId(null);
    setBrushMode(false);
    setBoxMode(false);
    setBrushLines([]);
    setBoxDrag(null);
    setBusy("export");
    setError(null);
    try {
      await new Promise((r) => requestAnimationFrame(() => r(null)));
      await new Promise((r) => requestAnimationFrame(() => r(null)));
      const uri = stageToPngDataUrl();
      if (!uri || uri.length < 100) {
        throw new Error(t.exportFailedLoading);
      }
      const a = document.createElement("a");
      a.href = uri;
      a.download = "alchemy-smart-layers.png";
      a.click();
      setNotice(t.downloaded);
    } catch (e: unknown) {
      setError(
        e instanceof Error
          ? e.message
          : t.exportFailedGeneric,
      );
    } finally {
      setBusy(null);
    }
  }

  async function saveToLibrary() {
    if (!result) return;
    setSelectedId(null);
    setBrushMode(false);
    setBoxMode(false);
    setBrushLines([]);
    setBoxDrag(null);
    setBusy("export");
    setError(null);
    try {
      await new Promise((r) => requestAnimationFrame(() => r(null)));
      await new Promise((r) => requestAnimationFrame(() => r(null)));
      const uri = stageToPngDataUrl();
      const blob = dataUrlToBlob(uri);
      const fd = new FormData();
      fd.set("file", new File([blob], "alchemy-smart-layers.png", { type: "image/png" }));
      const up = await fetch("/api/upload-edit-image", {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      const upJson = (await up.json()) as { url?: string; error?: string };
      if (!up.ok || !upJson.url) throw new Error(upJson.error || t.saveFailed);
      setNotice(t.savedLibrary);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t.saveFailed);
    } finally {
      setBusy(null);
    }
  }

  const zoomBy = (factor: number, pivot?: { x: number; y: number }) => {
    setViewScale((s) => {
      const next = Math.min(5, Math.max(0.25, s * factor));
      if (pivot && viewportRef.current) {
        const rect = viewportRef.current.getBoundingClientRect();
        const px = pivot.x - rect.left;
        const py = pivot.y - rect.top;
        setViewPos((pos) => ({
          x: px - ((px - pos.x) * next) / s,
          y: py - ((py - pos.y) * next) / s,
        }));
      }
      return next;
    });
  };

  const resetView = () => {
    setViewScale(1);
    setViewPos({ x: 0, y: 0 });
  };

  const clearAll = () => {
    if (!result && !layers.length) return;
    if (!window.confirm(t.clearAllConfirm)) return;
    resetWorkspace();
    setNotice(null);
    setError(null);
  };

  const layerList = useMemo(
    () =>
      [...layers].reverse().map((l, revI) => {
        const i = layers.length - 1 - revI;
        const title =
          l.kind === "text"
            ? t.layerText((l.editText || l.text || l.label).slice(0, 28))
            : l.kind === "logo"
              ? t.layerLogo(l.label.slice(0, 28))
              : l.kind === "shape"
                ? t.layerShape(l.shapeKind ?? l.label)
                : t.layerObject(l.label.slice(0, 28));
        return { ...l, title, stackIndex: i };
      }),
    [layers, t],
  );

  const layerCounts = useMemo(() => {
    let text = 0;
    let object = 0;
    for (const l of layers) {
      if (l.kind === "text") text += 1;
      else if (l.kind === "object" || l.kind === "logo") object += 1;
    }
    return { text, object };
  }, [layers]);

  const cursorClass = brushMode || boxMode
    ? "cursor-crosshair"
    : spaceDown || panning || (result && !selectedId)
      ? "cursor-grab"
      : "cursor-default";

  return (
    <div
      className="flex min-h-0 w-full flex-1 flex-col bg-[#0b1020] text-slate-100"
      style={{ flex: "1 1 0%", minHeight: 0, height: "100%" }}
    >
      {/* Top chrome — Canva-like */}
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-white/10 bg-[#0e1424]/95 px-3 py-2 backdrop-blur sm:px-4">
        <div className="mr-auto min-w-0">
          <p className="truncate text-sm font-semibold text-white">{t.title}</p>
          <p className="truncate text-[11px] text-slate-500">{t.subtitleShortcuts}</p>
        </div>
        <ToolBtn
          label={t.upload}
          disabled={!!busy}
          onClick={() => fileRef.current?.click()}
          className="!bg-violet-500 !border-violet-400/40 !text-white"
        />
        <ToolBtn label={ic.chooseFromLibrary} disabled={!!busy} onClick={() => setLibraryOpen(true)} />
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
        <div className="mx-1 hidden h-5 w-px bg-white/10 sm:block" />
        <ToolBtn label={t.undo} onClick={undo} disabled={historyIndex <= 0 || !!busy || brushBusy} />
        <ToolBtn
          label={t.redo}
          onClick={redo}
          disabled={historyIndex >= history.length - 1 || !!busy || brushBusy}
        />
        <ToolBtn label="−" title={t.zoomOut} onClick={() => zoomBy(1 / 1.15)} disabled={!result} />
        <span className="min-w-[3rem] text-center text-[11px] tabular-nums text-slate-400">
          {Math.round(viewScale * 100)}%
        </span>
        <ToolBtn label="+" title={t.zoomIn} onClick={() => zoomBy(1.15)} disabled={!result} />
        <ToolBtn label={t.fit} onClick={resetView} disabled={!result} />
        <ToolBtn
          label={busy === "export" ? "…" : t.download}
          onClick={() => void downloadPng()}
          disabled={!result || !!busy}
        />
        <ToolBtn
          label={t.save}
          onClick={() => void saveToLibrary()}
          disabled={!result || !!busy}
        />
        <ToolBtn
          label={t.clearAll}
          title={t.clearAllConfirm}
          onClick={clearAll}
          disabled={(!result && !layers.length) || !!busy || brushBusy}
          className="!border-red-500/25 !text-red-200 hover:!bg-red-950/40"
        />
      </div>

      {(notice || error) && (
        <div className="shrink-0 px-3 pt-2 sm:px-4">
          {notice && (
            <p className="rounded-lg border border-emerald-500/25 bg-emerald-950/40 px-3 py-1.5 text-center text-xs text-emerald-100">
              {notice}
            </p>
          )}
          {error && (
            <p className="mt-1 rounded-lg border border-red-500/35 bg-red-950/40 px-3 py-1.5 text-center text-xs text-red-200">
              {error}
            </p>
          )}
        </div>
      )}

      <LibraryAssetPicker
        open={libraryOpen}
        kinds={["image"]}
        onClose={() => setLibraryOpen(false)}
        onPick={(asset) => void onPickLibrary(asset.downloadUrl || asset.previewUrl)}
        labels={{
          title: ic.libraryPickerTitle,
          loading: ic.libraryPickerLoading,
          empty: ic.libraryPickerEmpty,
          loadError: ic.libraryPickerLoadError,
          cancel: ic.libraryPickerCancel,
          useThis: ic.libraryPickerUse,
          close: ic.libraryPickerClose,
        }}
      />

      <div className="flex min-h-0 flex-1" style={{ flex: "1 1 0%", minHeight: 0 }}>
        {/* Canvas viewport */}
        <div
          ref={viewportRef}
          className={`relative min-w-0 flex-1 overflow-hidden ${cursorClass}`}
          style={{ minHeight: 0 }}
          onWheel={(e) => {
            if (!result) return;
            e.preventDefault();
            const factor = e.deltaY > 0 ? 1 / 1.08 : 1.08;
            zoomBy(factor, { x: e.clientX, y: e.clientY });
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const f = e.dataTransfer.files?.[0];
            if (f?.type.startsWith("image/")) void onPickFile(f);
          }}
        >
          {/* Checkerboard + vignette */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.35]"
            style={{
              backgroundImage:
                "linear-gradient(45deg,#1a2033 25%,transparent 25%),linear-gradient(-45deg,#1a2033 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#1a2033 75%),linear-gradient(-45deg,transparent 75%,#1a2033 75%)",
              backgroundSize: "20px 20px",
              backgroundPosition: "0 0,0 10px,10px -10px,-10px 0",
            }}
          />

          {!result ? (
            <button
              type="button"
              disabled={!!busy}
              onClick={() => fileRef.current?.click()}
              className={`absolute inset-3 flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-8 text-center transition sm:inset-4 ${
                dragOver
                  ? "border-violet-400 bg-violet-500/10"
                  : "border-white/15 bg-black/25 hover:border-violet-400/50 hover:bg-violet-500/5"
              }`}
            >
              {busy ? (
                <>
                  <span className="h-8 w-8 animate-spin rounded-full border-2 border-violet-400 border-t-transparent" />
                  <p className="text-sm text-slate-300">
                    {busy === "upload"
                      ? t.uploading
                      : busy === "matte"
                        ? t.cuttingCleanly
                        : t.uploading}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-lg font-medium text-white sm:text-xl">{t.dropTitle}</p>
                  <p className="max-w-md text-sm text-slate-400">{t.dropHint}</p>
                  <p className="max-w-lg text-[11px] text-slate-500">
                    {t.tokenHint(
                      DETECT_SAM_TOKENS,
                      ERASE_PER_MP,
                      HEAL_LOCAL_TOKENS,
                      MATTE_TOKENS,
                      TOKEN_COST.image,
                    )}
                  </p>
                </>
              )}
            </button>
          ) : (
            <div className="absolute inset-0">
              <Stage
                  ref={stageRef}
                  width={stageSize.w}
                  height={stageSize.h}
                  scaleX={viewScale}
                  scaleY={viewScale}
                  x={viewPos.x}
                  y={viewPos.y}
                  onMouseDown={(e: Konva.KonvaEventObject<MouseEvent>) => {
                    if (spaceDown || e.evt.button === 1) {
                      e.evt.preventDefault();
                      setPanning(true);
                      panLastRef.current = { x: e.evt.clientX, y: e.evt.clientY };
                      return;
                    }
                    if (grabMode) {
                      const pos = brushPointerPos(e.target.getStage());
                      if (pos) void grabAtStagePoint(pos);
                      return;
                    }
                    if (boxMode) {
                      const pos = brushPointerPos(e.target.getStage());
                      if (pos) setBoxDrag({ x0: pos.x, y0: pos.y, x1: pos.x, y1: pos.y });
                      return;
                    }
                    if (brushMode) {
                      drawingRef.current = true;
                      const pos = brushPointerPos(e.target.getStage());
                      if (pos) setBrushLines((prev) => [...prev, [pos.x, pos.y]]);
                      return;
                    }
                    // Empty panel / photo → deselect + pan
                    if (e.target === e.target.getStage() || e.target.name() === "photo-bg") {
                      setSelectedId(null);
                      setGuides([]);
                      setPanning(true);
                      panLastRef.current = { x: e.evt.clientX, y: e.evt.clientY };
                    }
                  }}
                  onMousemove={(e: Konva.KonvaEventObject<MouseEvent>) => {
                    if (panning && panLastRef.current) {
                      const dx = e.evt.clientX - panLastRef.current.x;
                      const dy = e.evt.clientY - panLastRef.current.y;
                      panLastRef.current = { x: e.evt.clientX, y: e.evt.clientY };
                      setViewPos((p) => ({ x: p.x + dx, y: p.y + dy }));
                      return;
                    }
                    if (boxMode && boxDrag) {
                      const pos = brushPointerPos(e.target.getStage());
                      if (pos) setBoxDrag((d) => (d ? { ...d, x1: pos.x, y1: pos.y } : d));
                      return;
                    }
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
                    if (boxMode && boxDrag) {
                      const x = Math.min(boxDrag.x0, boxDrag.x1);
                      const y = Math.min(boxDrag.y0, boxDrag.y1);
                      const w = Math.abs(boxDrag.x1 - boxDrag.x0);
                      const h = Math.abs(boxDrag.y1 - boxDrag.y0);
                      setBoxDrag(null);
                      if (w >= 6 && h >= 6) void createLayerFromBox({ x, y, w, h });
                      return;
                    }
                    drawingRef.current = false;
                    setPanning(false);
                    panLastRef.current = null;
                    setGuides([]);
                  }}
                  onMouseLeave={() => {
                    // Finish an in-progress box instead of discarding it (felt like “nothing happened”).
                    if (boxMode && boxDrag) {
                      const x = Math.min(boxDrag.x0, boxDrag.x1);
                      const y = Math.min(boxDrag.y0, boxDrag.y1);
                      const w = Math.abs(boxDrag.x1 - boxDrag.x0);
                      const h = Math.abs(boxDrag.y1 - boxDrag.y0);
                      setBoxDrag(null);
                      if (w >= 6 && h >= 6) void createLayerFromBox({ x, y, w, h });
                    }
                    drawingRef.current = false;
                    setPanning(false);
                    panLastRef.current = null;
                    setGuides([]);
                  }}
                  onTouchStart={(e: Konva.KonvaEventObject<TouchEvent>) => {
                    if (boxMode) {
                      e.evt.preventDefault();
                      const pos = brushPointerPos(e.target.getStage());
                      if (pos) setBoxDrag({ x0: pos.x, y0: pos.y, x1: pos.x, y1: pos.y });
                      return;
                    }
                    if (!brushMode) return;
                    e.evt.preventDefault();
                    drawingRef.current = true;
                    const pos = brushPointerPos(e.target.getStage());
                    if (pos) setBrushLines((prev) => [...prev, [pos.x, pos.y]]);
                  }}
                  onTouchMove={(e: Konva.KonvaEventObject<TouchEvent>) => {
                    if (boxMode && boxDrag) {
                      e.evt.preventDefault();
                      const pos = brushPointerPos(e.target.getStage());
                      if (pos) setBoxDrag((d) => (d ? { ...d, x1: pos.x, y1: pos.y } : d));
                      return;
                    }
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
                    if (boxMode && boxDrag) {
                      const x = Math.min(boxDrag.x0, boxDrag.x1);
                      const y = Math.min(boxDrag.y0, boxDrag.y1);
                      const w = Math.abs(boxDrag.x1 - boxDrag.x0);
                      const h = Math.abs(boxDrag.y1 - boxDrag.y0);
                      setBoxDrag(null);
                      if (w >= 6 && h >= 6) void createLayerFromBox({ x, y, w, h });
                      return;
                    }
                    drawingRef.current = false;
                  }}
                >
                  <Layer>
                    <Group id="image-plane" x={imageLayout.x} y={imageLayout.y}>
                      {bgImg && (
                        <KonvaImage
                          name="photo-bg"
                          image={bgImg}
                          width={imageLayout.w}
                          height={imageLayout.h}
                          listening={false}
                        />
                      )}
                      {(brushMode || boxMode) && (
                        <Rect
                          name="paint-hit"
                          width={imageLayout.w}
                          height={imageLayout.h}
                          fill="rgba(0,0,0,0.001)"
                        />
                      )}
                      {layers.map((layer) => (
                        <LayerSprite
                          key={layer.id}
                          layer={layer}
                          stageW={imageLayout.w}
                          stageH={imageLayout.h}
                          selected={!brushMode && !boxMode && layer.id === selectedId}
                          interactive={!brushMode && !boxMode && !grabMode && !spaceDown}
                          onSelect={() => setSelectedId(layer.id)}
                          onChange={(patch) => patchLayer(layer.id, patch)}
                          onGuides={setGuides}
                          onMoveStart={() => void clearHoleIfNeeded(layer.id)}
                          onAfterMove={() => {
                            /* hole already cleared on drag start — avoid second Flux/local round-trip */
                          }}
                        />
                      ))}
                      {guides.map((g, i) =>
                        g.orientation === "v" ? (
                          <Line
                            key={`gv-${i}`}
                            points={[g.pos, 0, g.pos, imageLayout.h]}
                            stroke="#f0abfc"
                            strokeWidth={1}
                            dash={[4, 4]}
                            listening={false}
                          />
                        ) : (
                          <Line
                            key={`gh-${i}`}
                            points={[0, g.pos, imageLayout.w, g.pos]}
                            stroke="#f0abfc"
                            strokeWidth={1}
                            dash={[4, 4]}
                            listening={false}
                          />
                        ),
                      )}
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
                      {boxMode && boxDrag && (
                        <Rect
                          x={Math.min(boxDrag.x0, boxDrag.x1)}
                          y={Math.min(boxDrag.y0, boxDrag.y1)}
                          width={Math.abs(boxDrag.x1 - boxDrag.x0)}
                          height={Math.abs(boxDrag.y1 - boxDrag.y0)}
                          stroke="#a78bfa"
                          strokeWidth={1.5}
                          dash={[6, 4]}
                          fill="rgba(167,139,250,0.12)"
                          listening={false}
                        />
                      )}
                    </Group>
                  </Layer>
                </Stage>
            </div>
          )}

          {brushBusy && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
              <div className="rounded-xl border border-white/10 bg-slate-950/90 px-5 py-4 text-center shadow-xl">
                <span className="mx-auto mb-2 block h-7 w-7 animate-spin rounded-full border-2 border-violet-400 border-t-transparent" />
                <p className="text-sm text-slate-200">{t.lifting}</p>
              </div>
            </div>
          )}
          {busy === "decompose" && result && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
              <div className="rounded-xl border border-white/10 bg-slate-950/90 px-5 py-4 text-center shadow-xl">
                <span className="mx-auto mb-2 block h-7 w-7 animate-spin rounded-full border-2 border-violet-400 border-t-transparent" />
                <p className="text-sm text-slate-200">{t.splittingLayers}</p>
                <p className="mt-1 text-[11px] text-slate-500">{t.detecting(DETECT_SAM_TOKENS)}</p>
              </div>
            </div>
          )}
          {busy === "rewrite" && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
              <div className="rounded-xl border border-white/10 bg-slate-950/90 px-5 py-4 text-center shadow-xl">
                <span className="mx-auto mb-2 block h-7 w-7 animate-spin rounded-full border-2 border-violet-400 border-t-transparent" />
                <p className="text-sm text-slate-200">
                  {cropEditMode === "ai" ? t.aiEditingCrop : t.aiRewriting}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right inspector */}
        <aside className="flex w-[300px] shrink-0 flex-col gap-3 overflow-y-auto border-l border-white/10 bg-[#0e1424] p-3">
          <div>
            <h2 className="text-sm font-semibold text-white">{t.layers}</h2>
            <p className="mt-0.5 text-[10px] leading-snug text-slate-500">
              {t.itemsCount(layers.length)}
              {` · ${t.ocrObj(layerCounts.text, layerCounts.object)}`}
              {lastTokens != null ? ` · ${t.lastTokens(lastTokens)}` : ""}
            </p>
          </div>

          {/* Canva-like selection toolbar */}
          {selected && (
            <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-violet-400/25 bg-violet-500/10 p-2">
              <ToolBtn label={t.duplicate} onClick={duplicateSelected} />
              <ToolBtn
                label={selected.locked ? t.unlock : t.lock}
                active={!!selected.locked}
                onClick={() => patchLayer(selected.id, { locked: !selected.locked })}
              />
              <ToolBtn label={t.forward} title={t.titleForward} onClick={() => moveLayer("up")} />
              <ToolBtn label={t.backward} title={t.titleBackward} onClick={() => moveLayer("down")} />
              <ToolBtn label={t.toFront} onClick={() => moveLayer("top")} />
              <ToolBtn label={t.toBack} onClick={() => moveLayer("bottom")} />
              {(selected.kind === "object" || selected.kind === "text") && !selected.useLiveText && (
                <ToolBtn
                  label={t.makeEditableText}
                  disabled={!!busy || brushBusy}
                  onClick={() => void makeSelectedEditableText()}
                />
              )}
              {(selected.kind === "object" || selected.kind === "logo" || selected.kind === "text") &&
              !selected.useLiveText &&
              !selected.matted ? (
                <ToolBtn
                  label={busy === "matte" ? t.matting : t.matte(MATTE_TOKENS)}
                  disabled={!!busy}
                  onClick={() => void refineMatteSelected()}
                />
              ) : null}
              <ToolBtn
                label={t.delete}
                className="!border-red-500/30 !text-red-200"
                onClick={() => {
                  commitLayers((prev) => prev.filter((l) => l.id !== selected.id));
                  setSelectedId(null);
                }}
              />
              {selected.kind === "text" || selected.kind === "shape" ? (
                <>
                  {selected.kind === "text" ? (
                    <>
                      <ToolBtn
                        label={t.liveText}
                        active={!!selected.useLiveText}
                        onClick={() => {
                          if (selected.useLiveText) {
                            patchLayer(selected.id, { useLiveText: false });
                            return;
                          }
                          void enableLiveText(selected.id);
                        }}
                      />
                      <label className="flex items-center gap-1 text-[11px] text-slate-300">
                        {t.size}
                        <input
                          type="number"
                          min={8}
                          max={200}
                          className="w-12 rounded border border-white/15 bg-black/40 px-1 py-0.5"
                          value={Math.round(
                            selected.fontSize ??
                              Math.max(12, (selected.hPct / 100) * imageLayout.h * 0.72),
                          )}
                          onChange={(e) => {
                            const size = Number(e.target.value) || 16;
                            patchLayer(selected.id, { fontSize: size });
                            if (!selected.useLiveText) void enableLiveText(selected.id);
                            else if (!selected.holeCleared) void clearHoleIfNeeded(selected.id);
                          }}
                        />
                      </label>
                      <ToolBtn
                        label={t.bold}
                        active={selected.fontBold !== false}
                        onClick={() => {
                          patchLayer(selected.id, {
                            fontBold: selected.fontBold === false,
                          });
                          if (!selected.useLiveText) void enableLiveText(selected.id);
                        }}
                      />
                    </>
                  ) : null}
                  <label className="flex items-center gap-1 text-[11px] text-slate-300">
                    {t.color}
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
                </>
              ) : null}
            </div>
          )}

          {/* Primary edit surface — always near top so users don't scroll past the layer list */}
          {selected &&
          (selected.kind === "text" || selected.kind === "object") &&
          !!(selected.cropUrl || selected.cropDataUrl) ? (
            <div className="space-y-2 rounded-xl border border-violet-400/30 bg-violet-500/10 p-2.5">
              <div className="flex items-start gap-2">
                {(selected.cropUrl || selected.cropDataUrl) && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={
                      canvasDisplayUrl(selected.cropUrl || selected.cropDataUrl) ||
                      selected.cropUrl ||
                      selected.cropDataUrl
                    }
                    alt=""
                    className="h-12 w-12 shrink-0 rounded-md border border-white/10 object-cover bg-black/40"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-violet-200/90">
                    {t.cropEditTitle}
                  </p>
                  <p className="text-[10px] leading-snug text-slate-400">{t.cropEditHow}</p>
                </div>
              </div>
              <div className="flex gap-1 rounded-lg border border-white/10 bg-black/30 p-0.5">
                <button
                  type="button"
                  className={`flex-1 rounded-md px-2 py-1.5 text-[11px] font-medium transition ${
                    cropEditMode === "ai"
                      ? "bg-violet-600 text-white"
                      : "text-slate-400 hover:text-white"
                  }`}
                  onClick={() => setCropEditMode("ai")}
                >
                  {t.cropEditModeAi}
                </button>
                <button
                  type="button"
                  className={`flex-1 rounded-md px-2 py-1.5 text-[11px] font-medium transition ${
                    cropEditMode === "text"
                      ? "bg-violet-600 text-white"
                      : "text-slate-400 hover:text-white"
                  }`}
                  onClick={() => setCropEditMode("text")}
                >
                  {t.cropEditModeText}
                </button>
              </div>

              {cropEditMode === "ai" ? (
                <>
                  <textarea
                    ref={instructionRef}
                    className="min-h-[72px] w-full rounded-lg border border-violet-500/40 bg-black/40 px-2 py-1.5 text-sm text-white placeholder:text-slate-600"
                    value={editInstruction}
                    onChange={(e) => setEditInstruction(e.target.value)}
                    onKeyDown={(e) => {
                      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                        e.preventDefault();
                        void aiEditSelectedCrop();
                      }
                    }}
                    placeholder={t.editInstructionPlaceholder}
                  />
                  <ToolBtn
                    label={
                      busy === "rewrite"
                        ? t.aiEditingCrop
                        : t.aiEditCrop(TOKEN_COST.image)
                    }
                    disabled={!!busy || brushBusy || !editInstruction.trim()}
                    active
                    className="w-full"
                    onClick={() => void aiEditSelectedCrop()}
                  />
                  <p className="text-[10px] leading-snug text-slate-500">{t.aiEditCropHint}</p>
                </>
              ) : (
                <>
                  <textarea
                    className="min-h-[64px] w-full rounded-lg border border-violet-500/40 bg-black/40 px-2 py-1.5 text-sm text-white"
                    value={selected.editText ?? selected.text}
                    onChange={(e) => replaceTextOnLayer(selected.id, e.target.value)}
                    onKeyDown={(e) => {
                      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                        e.preventDefault();
                        void aiRewriteSelectedText();
                      }
                    }}
                    placeholder={t.editTextPlaceholder}
                  />
                  <ToolBtn
                    label={
                      busy === "rewrite"
                        ? t.aiRewriting
                        : t.changeWordsOneTap(TOKEN_COST.image)
                    }
                    disabled={!!busy || brushBusy}
                    active
                    className="w-full !bg-violet-500 !text-white"
                    onClick={() => void aiRewriteSelectedText()}
                  />
                  <p className="text-[10px] leading-snug text-slate-500">{t.changeWordsHint}</p>
                  <div className="flex flex-wrap gap-1.5">
                    <ToolBtn
                      label={t.liveText}
                      active={!!selected.useLiveText}
                      disabled={!!busy || brushBusy}
                      onClick={() => {
                        if (selected.useLiveText) {
                          patchLayer(selected.id, { useLiveText: false });
                          return;
                        }
                        void enableLiveText(selected.id);
                      }}
                    />
                  </div>
                </>
              )}
            </div>
          ) : canEdit && !boxMode ? (
            <div className="rounded-xl border border-dashed border-white/15 bg-black/20 px-2.5 py-2">
              <p className="text-[10px] leading-snug text-slate-400">{t.cropEditIdle}</p>
              <div className="mt-1.5">
                <ToolBtn
                  label={t.aiEditRegion}
                  disabled={brushBusy || !!busy}
                  active
                  onClick={() => {
                    setBoxIntent("ai");
                    setBoxMode(true);
                    setBrushMode(false);
                    setBrushLines([]);
                    setBoxDrag(null);
                    setSelectedId(null);
                    setCropEditMode("ai");
                  }}
                />
              </div>
            </div>
          ) : null}

          <div className="space-y-2 rounded-xl border border-white/10 bg-black/20 p-2.5">
            <ToolBtn
              label={
                busy === "decompose"
                  ? t.sandwichSplitting
                  : t.hybridSplit(SANDWICH_TOKENS)
              }
              disabled={!canEdit || !!busy || brushBusy}
              active
              className="w-full !bg-violet-500 !text-white"
              onClick={() => void onHybridSplit()}
            />
            <p className="text-[10px] leading-snug text-slate-500">{t.hybridSplitHow}</p>
            <ToolBtn
              label={
                busy === "decompose"
                  ? t.splittingLayers
                  : t.detectAllFlorence(DETECT_SAM_TOKENS)
              }
              disabled={!canEdit || !!busy || brushBusy}
              className="w-full"
              onClick={() => void onDetectAll()}
            />
            <p className="text-[10px] leading-snug text-slate-500">{t.florenceSplitHow}</p>
            <ToolBtn
              label={
                busy === "decompose"
                  ? t.qwenSplitting
                  : t.qwenFullSplit(QWEN_TOKENS)
              }
              disabled={!canEdit || !!busy || brushBusy}
              className="w-full"
              onClick={() => void onQwenSplit()}
            />
            <p className="text-[10px] leading-snug text-slate-500">{t.qwenSplitHow}</p>

            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              {t.liftTools}
            </p>
            <p className="text-[10px] leading-snug text-slate-500">{t.liftToolsHint}</p>
            <div className="flex flex-wrap gap-1.5">
              <ToolBtn
                label={boxMode && boxIntent === "lift" ? t.boxLiftOn : t.boxLift}
                active={boxMode && boxIntent === "lift"}
                disabled={!canEdit || brushBusy || !!busy}
                className="!bg-violet-500 !text-white"
                onClick={() => {
                  setBoxIntent("lift");
                  setBoxMode(true);
                  setGrabMode(false);
                  setBrushMode(false);
                  setBrushLines([]);
                  setBoxDrag(null);
                  setSelectedId(null);
                }}
              />
              <ToolBtn
                label={grabMode ? t.grabClickOn : t.grabClick}
                active={grabMode}
                disabled={!canEdit || brushBusy || !!busy}
                onClick={() => {
                  setGrabMode((v) => !v);
                  setBoxMode(false);
                  setBrushMode(false);
                  setBrushLines([]);
                  setBoxDrag(null);
                  setSelectedId(null);
                }}
              />
              <ToolBtn
                label={
                  brushMode && brushIntent === "lift" ? t.brushOn : t.brushCutout
                }
                active={brushMode && brushIntent === "lift"}
                disabled={!canEdit || brushBusy || !!busy}
                onClick={() => {
                  const next = !(brushMode && brushIntent === "lift");
                  setBrushIntent("lift");
                  setBrushMode(next);
                  setGrabMode(false);
                  setBoxMode(false);
                  setBoxDrag(null);
                  if (!next) setBrushLines([]);
                  setSelectedId(null);
                }}
              />
              <ToolBtn
                label={boxMode && boxIntent === "erase" ? t.eraseOn : t.erase}
                active={boxMode && boxIntent === "erase"}
                disabled={!canEdit || brushBusy || !!busy}
                onClick={() => {
                  setBoxIntent("erase");
                  setBoxMode(true);
                  setGrabMode(false);
                  setBrushMode(false);
                  setBrushLines([]);
                  setBoxDrag(null);
                  setSelectedId(null);
                }}
              />
            </div>
            {grabMode ? (
              <p className="text-[10px] text-slate-500">{t.grabClickHint}</p>
            ) : boxMode && boxIntent === "lift" ? (
              <p className="text-[10px] text-slate-500">{t.boxLiftHint}</p>
            ) : boxMode && boxIntent === "erase" ? (
              <p className="text-[10px] text-slate-500">{t.eraseHint}</p>
            ) : brushMode && brushIntent === "lift" ? (
              <p className="text-[10px] text-slate-500">{t.makeLayerHint}</p>
            ) : null}
            {brushMode && brushIntent === "lift" ? (
              <>
                <label className="flex items-center gap-2 text-[11px] text-slate-300">
                  {t.size}
                  <input
                    type="range"
                    min={10}
                    max={64}
                    value={brushSize}
                    onChange={(e) => setBrushSize(Number(e.target.value))}
                    className="flex-1"
                  />
                </label>
                <div className="flex flex-wrap gap-1.5">
                  <ToolBtn
                    label={t.undoStroke}
                    disabled={brushLines.length === 0 || brushBusy}
                    onClick={() => setBrushLines((prev) => prev.slice(0, -1))}
                  />
                  <ToolBtn
                    label={t.clear}
                    disabled={brushLines.length === 0 || brushBusy}
                    onClick={() => setBrushLines([])}
                  />
                  <ToolBtn
                    label={brushBusy ? t.lifting : t.makeLayer}
                    disabled={brushBusy}
                    active
                    onClick={() => void createLayerFromBrush()}
                  />
                </div>
                <p className="text-[10px] text-slate-500">{t.healTok(ERASE_PER_MP)}</p>
              </>
            ) : null}

            <div className="space-y-1.5 border-t border-white/10 pt-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                {t.expandTitle}
              </p>
              <p className="text-[10px] leading-snug text-slate-500">{t.expandHow}</p>
              <div className="flex flex-wrap gap-1.5">
                {EXPAND_PRESETS.map((p) => (
                  <ToolBtn
                    key={p.id}
                    label={
                      busy === "export"
                        ? t.expanding
                        : t[p.labelKey](EXPAND_TOKENS)
                    }
                    disabled={!canEdit || !!busy || brushBusy}
                    onClick={() => void runMagicExpand(p.id)}
                  />
                ))}
              </div>
            </div>

            <MagicBoardChat
              disabled={!canEdit || !!busy || brushBusy}
              title={t.magicChatTitle}
              hint={t.magicChatHint}
              placeholder={t.magicChatPlaceholder}
              sendLabel={t.magicChatSend}
              onSend={handleMagicChat}
            />

            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              {t.add}
            </p>
            <div className="flex flex-wrap gap-1.5">
              <ToolBtn label={t.text} onClick={addTextLayer} disabled={!canEdit || brushMode || boxMode} />
              <ToolBtn
                label={logoBusy ? t.logoBusy : t.logo}
                onClick={() => void addBrandLogoLayer()}
                disabled={!canEdit || !hasBrandLogo || logoBusy || brushMode || boxMode}
                title={hasBrandLogo ? t.titleBrandLogo : t.titleNeedBrandLogo}
              />
              <ToolBtn label={t.rect} onClick={() => addShapeLayer("rect")} disabled={!canEdit || brushMode || boxMode} />
              <ToolBtn
                label={t.capsule}
                onClick={() => addShapeLayer("capsule")}
                disabled={!canEdit || brushMode || boxMode}
              />
              <ToolBtn
                label={t.circle}
                onClick={() => addShapeLayer("circle")}
                disabled={!canEdit || brushMode || boxMode}
              />
            </div>
            {!hasBrandLogo && (
              <p className="text-[10px] text-slate-500">
                <Link href="/brand-kit" className="text-violet-300 hover:underline">
                  {t.brandKitHint}
                </Link>{" "}
                {t.brandKitForLogo}
              </p>
            )}

            <div className="space-y-1.5 border-t border-white/10 pt-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                {t.missTools}
              </p>
              <p className="text-[10px] leading-snug text-slate-500">{t.missToolsHint}</p>
              <div className="flex flex-wrap gap-1.5">
                <ToolBtn
                  label={boxMode && boxIntent === "ai" ? t.aiEditRegionOn : t.aiEditRegion}
                  active={boxMode && boxIntent === "ai"}
                  disabled={!canEdit || brushBusy || !!busy}
                  onClick={() => {
                    setBoxIntent("ai");
                    setBoxMode(true);
                    setGrabMode(false);
                    setBrushMode(false);
                    setBrushLines([]);
                    setBoxDrag(null);
                    setSelectedId(null);
                    setCropEditMode("ai");
                  }}
                />
                <ToolBtn
                  label={boxMode && boxIntent === "lift" ? t.boxLiftOn : t.boxLift}
                  active={boxMode && boxIntent === "lift"}
                  disabled={!canEdit || brushBusy || !!busy}
                  onClick={() => {
                    setBoxIntent("lift");
                    setBoxMode(true);
                    setGrabMode(false);
                    setBrushMode(false);
                    setBrushLines([]);
                    setBoxDrag(null);
                    setSelectedId(null);
                  }}
                />
                <ToolBtn
                  label={
                    boxMode && boxIntent === "qwen"
                      ? t.qwenBoxOn
                      : t.qwenBox(QWEN_TOKENS)
                  }
                  active={boxMode && boxIntent === "qwen"}
                  disabled={!canEdit || brushBusy || !!busy}
                  onClick={() => {
                    setBoxIntent("qwen");
                    setBoxMode(true);
                    setGrabMode(false);
                    setBrushMode(false);
                    setBrushLines([]);
                    setBoxDrag(null);
                    setSelectedId(null);
                  }}
                />
                <ToolBtn
                  label={boxMode && boxIntent === "erase" ? t.eraseOn : t.erase}
                  active={boxMode && boxIntent === "erase"}
                  disabled={!canEdit || brushBusy || !!busy}
                  onClick={() => {
                    setBoxIntent("erase");
                    setBoxMode(true);
                    setGrabMode(false);
                    setBrushMode(false);
                    setBrushLines([]);
                    setBoxDrag(null);
                    setSelectedId(null);
                  }}
                />
                <ToolBtn
                  label={grabMode ? t.grabClickOn : t.grabClick}
                  active={grabMode}
                  disabled={!canEdit || brushBusy || !!busy}
                  onClick={() => {
                    setGrabMode((v) => !v);
                    setBoxMode(false);
                    setBrushMode(false);
                    setBrushLines([]);
                    setBoxDrag(null);
                    setSelectedId(null);
                  }}
                />
                <ToolBtn
                  label={
                    brushMode && brushIntent === "lift" ? t.brushOn : t.brushCutout
                  }
                  active={brushMode && brushIntent === "lift"}
                  disabled={!canEdit || brushBusy || !!busy}
                  onClick={() => {
                    const next = !(brushMode && brushIntent === "lift");
                    setBrushIntent("lift");
                    setBrushMode(next);
                    setGrabMode(false);
                    setBoxMode(false);
                    setBoxDrag(null);
                    if (!next) setBrushLines([]);
                    setSelectedId(null);
                  }}
                />
                <ToolBtn
                  label={
                    brushMode && brushIntent === "erase" ? t.brushEraseOn : t.brushErase
                  }
                  active={brushMode && brushIntent === "erase"}
                  disabled={!canEdit || brushBusy || !!busy}
                  onClick={() => {
                    const next = !(brushMode && brushIntent === "erase");
                    setBrushIntent("erase");
                    setBrushMode(next);
                    setGrabMode(false);
                    setBoxMode(false);
                    setBoxDrag(null);
                    if (!next) setBrushLines([]);
                    setSelectedId(null);
                  }}
                />
              </div>
              {grabMode ? (
                <p className="text-[10px] text-slate-500">{t.grabClickHint}</p>
              ) : null}
              {boxMode && boxIntent === "ai" ? (
                <p className="text-[10px] text-slate-500">{t.aiEditRegionHint}</p>
              ) : null}
              {boxMode && boxIntent === "lift" ? (
                <p className="text-[10px] text-slate-500">{t.boxLiftHint}</p>
              ) : null}
              {boxMode && boxIntent === "qwen" ? (
                <p className="text-[10px] text-slate-500">{t.qwenBoxHint}</p>
              ) : null}
              {boxMode && boxIntent === "erase" ? (
                <p className="text-[10px] text-slate-500">{t.eraseHint}</p>
              ) : null}
              {brushMode ? (
                <>
                  <label className="flex items-center gap-2 text-[11px] text-slate-300">
                    {t.size}
                    <input
                      type="range"
                      min={10}
                      max={64}
                      value={brushSize}
                      onChange={(e) => setBrushSize(Number(e.target.value))}
                      className="flex-1"
                    />
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    <ToolBtn
                      label={t.undoStroke}
                      disabled={brushLines.length === 0 || brushBusy}
                      onClick={() => setBrushLines((prev) => prev.slice(0, -1))}
                    />
                    <ToolBtn
                      label={t.clear}
                      disabled={brushLines.length === 0 || brushBusy}
                      onClick={() => setBrushLines([])}
                    />
                    <ToolBtn
                      label={
                        brushBusy
                          ? brushIntent === "erase"
                            ? t.erasingHole
                            : t.lifting
                          : brushIntent === "erase"
                            ? t.erasePainted
                            : t.makeLayer
                      }
                      disabled={brushBusy}
                      active
                      onClick={() => void createLayerFromBrush()}
                    />
                  </div>
                  <p className="text-[10px] text-slate-500">
                    {brushIntent === "erase" ? t.brushEraseHint : t.makeLayerHint}
                  </p>
                  <p className="text-[10px] text-slate-500">{t.healTok(ERASE_PER_MP)}</p>
                </>
              ) : null}
            </div>
          </div>

          <ul className="min-h-0 flex-1 space-y-0.5 overflow-auto text-sm">
            {layerList.map((l) => {
              const thumb = l.cropUrl || l.cropDataUrl;
              return (
              <li key={l.id}>
                <div
                  className={`flex items-center gap-1.5 rounded-lg px-1.5 py-1 ${
                    l.id === selectedId ? "bg-violet-500/25" : "hover:bg-white/[0.04]"
                  }`}
                >
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 items-center gap-2 truncate text-left text-xs text-slate-200"
                    onClick={() => setSelectedId(l.id)}
                  >
                    {thumb && (l.kind === "object" || l.kind === "logo" || l.kind === "text") ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={canvasDisplayUrl(thumb) ?? thumb}
                        alt=""
                        className="h-8 w-8 shrink-0 rounded border border-white/10 object-cover bg-black/40"
                      />
                    ) : (
                      <span
                        className={`inline-block h-8 w-8 shrink-0 rounded border border-white/10 ${kindDotClass(l.kind)} opacity-80`}
                      />
                    )}
                    <span className="min-w-0 truncate">{l.title}</span>
                  </button>
                  <button
                    type="button"
                    title={l.visible === false ? t.titleShow : t.titleHide}
                    className="rounded px-1 text-[10px] text-slate-400 hover:bg-white/10 hover:text-white"
                    onClick={() => {
                      const nextVisible = l.visible === false;
                      patchLayer(l.id, { visible: nextVisible });
                      // Hiding a piece should clear the plate so the original doesn't ghost.
                      if (!nextVisible) void clearHoleIfNeeded(l.id);
                    }}
                  >
                    {l.visible === false ? t.show : t.hide}
                  </button>
                  <button
                    type="button"
                    title={l.locked ? t.titleUnlock : t.titleLock}
                    className="rounded px-1 text-[10px] text-slate-400 hover:bg-white/10 hover:text-white"
                    onClick={() => patchLayer(l.id, { locked: !l.locked })}
                  >
                    {l.locked ? t.unlock : t.lock}
                  </button>
                </div>
              </li>
              );
            })}
            {!layerList.length && (
              <li className="space-y-2 px-1 py-2 text-xs text-slate-400">
                <p>{t.noLayersYet}</p>
                <p className="text-[11px] leading-snug text-slate-500">{t.emptyLiftHint}</p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <ToolBtn
                    label={
                      busy === "decompose"
                        ? t.sandwichSplitting
                        : t.hybridSplit(SANDWICH_TOKENS)
                    }
                    disabled={!canEdit || !!busy || brushBusy}
                    active
                    onClick={() => void onHybridSplit()}
                  />
                  <ToolBtn
                    label={
                      busy === "decompose"
                        ? t.splittingLayers
                        : t.detectAllFlorence(DETECT_SAM_TOKENS)
                    }
                    disabled={!canEdit || !!busy || brushBusy}
                    onClick={() => void onDetectAll()}
                  />
                  <ToolBtn
                    label={
                      busy === "decompose"
                        ? t.qwenSplitting
                        : t.qwenFullSplit(QWEN_TOKENS)
                    }
                    disabled={!canEdit || !!busy || brushBusy}
                    onClick={() => void onQwenSplit()}
                  />
                  <ToolBtn
                    label={t.boxLift}
                    active={boxMode && boxIntent === "lift"}
                    disabled={!canEdit || brushBusy}
                    onClick={() => {
                      setBoxIntent("lift");
                      setBoxMode(true);
                      setBrushMode(false);
                      setBrushLines([]);
                      setSelectedId(null);
                    }}
                  />
                </div>
              </li>
            )}
          </ul>
        </aside>
      </div>
    </div>
  );
}
