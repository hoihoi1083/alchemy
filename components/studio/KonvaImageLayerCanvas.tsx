"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Stage,
  Layer,
  Image as KonvaImage,
  Text,
  Rect,
  Circle,
  Line,
  Arrow,
  Group,
  Transformer,
} from "react-konva";
import type Konva from "konva";
import {
  CAPTION_STYLE_PRESET_IDS,
  CAPTION_STYLE_PRESETS,
  type CaptionStylePresetId,
} from "@/lib/caption-burn-styles";
import {
  newImageCanvasTextLayer,
  newImageShapeLayer,
  newImageLogoLayer,
  type ImageCanvasLayer,
  type ImageShapeKind,
  type ImageShapeLayer,
  type ImageCanvasTextLayer,
} from "@/lib/image-canvas-layers";
import {
  buildMarketingBlock,
  type MarketingBlockId,
} from "@/lib/image-canvas-marketing";
import { applyTextStylePreset, effectiveTextStrokeWidth } from "@/lib/image-canvas-style";
import {
  textBoxHeightPx,
  wrappedLineCount,
} from "@/lib/image-canvas-text-layout";
import { fitImageInBox, logoPctFromAspect } from "@/lib/image-canvas-layout";
import type { BrandKit } from "@/lib/brand-kit";
import { brandKitFontFamily } from "@/lib/brand-merge";
import { useLocale } from "@/components/LocaleProvider";
import { CanvasHistoryNav } from "@/components/studio/CanvasHistoryNav";

const STAGE_WIDTH = 400;

const SHAPE_KINDS: ImageShapeKind[] = [
  "rect",
  "capsule",
  "circle",
  "line",
  "arrow",
  "badge",
  "button",
  "check-badge",
];

const MARKETING_BLOCKS: MarketingBlockId[] = [
  "slide-number",
  "title",
  "capsule-label",
  "bullet-item",
  "divider-line",
  "cta-button",
];

type CanvasLabels = {
  hint: string;
  dragHint: string;
  textLayerLabel: string;
  shapeLayerLabel: string;
  textPlaceholder: string;
  styleLabel: string;
  colorLabel: string;
  addTextBtn: string;
  addShapeBtn: string;
  addLogoBtn: string;
  removeLayerBtn: string;
  applyBtn: string;
  applying: string;
  needLayer: string;
  restoreBtn?: string;
  fillColorLabel?: string;
  strokeColorLabel?: string;
  alignLabel?: string;
  alignLeft?: string;
  alignCenter?: string;
  alignRight?: string;
  opacityLabel?: string;
  strokeWidthLabel?: string;
  fontSizeLabel?: string;
  layersLabel?: string;
  marketingTitle?: string;
  marketingHint?: string;
  shapeRect?: string;
  shapeCapsule?: string;
  shapeCircle?: string;
  shapeLine?: string;
  shapeArrow?: string;
  shapeBadge?: string;
  shapeButton?: string;
  shapeCheck?: string;
  marketingSlideNum?: string;
  marketingTitleBlock?: string;
  marketingCapsule?: string;
  marketingBullet?: string;
  marketingDivider?: string;
  marketingCta?: string;
  canvasPrev?: string;
  canvasNext?: string;
  recoverOriginal?: string;
  canvasRecoverEdits?: string;
  canvasVersion?: (current: number, total: number) => string;
};

type KonvaImageLayerCanvasProps = {
  imageUrl: string;
  disabled?: boolean;
  initialLayers?: ImageCanvasLayer[];
  brandKit?: BrandKit | null;
  labels: CanvasLabels;
  onApply: (layers: ImageCanvasLayer[]) => Promise<void>;
  onRestore?: () => void;
};

function useHtmlImage(src: string) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    if (!src) {
      setImage(null);
      return;
    }
    const img = new window.Image();
    // blob:/data: are same-origin; crossOrigin can break load in some browsers.
    if (!src.startsWith("blob:") && !src.startsWith("data:")) {
      img.crossOrigin = "anonymous";
    }
    img.onload = () => setImage(img);
    img.onerror = () => setImage(null);
    img.src = src;
    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [src]);
  return image;
}

function presetLabel(id: CaptionStylePresetId, zh: boolean) {
  const p = CAPTION_STYLE_PRESETS[id];
  return zh ? p.labelZh : p.labelEn;
}

function shapeLabel(kind: ImageShapeKind, labels: CanvasLabels): string {
  const map: Record<ImageShapeKind, string | undefined> = {
    rect: labels.shapeRect,
    capsule: labels.shapeCapsule,
    circle: labels.shapeCircle,
    line: labels.shapeLine,
    arrow: labels.shapeArrow,
    badge: labels.shapeBadge,
    button: labels.shapeButton,
    "check-badge": labels.shapeCheck,
  };
  return map[kind] ?? kind;
}

function marketingBlockLabel(id: MarketingBlockId, labels: CanvasLabels): string {
  const map: Record<MarketingBlockId, string | undefined> = {
    "slide-number": labels.marketingSlideNum,
    title: labels.marketingTitleBlock,
    "capsule-label": labels.marketingCapsule,
    "bullet-item": labels.marketingBullet,
    "divider-line": labels.marketingDivider,
    "cta-button": labels.marketingCta,
  };
  return map[id] ?? id;
}

function layerSummary(layer: ImageCanvasLayer): string {
  if (layer.kind === "text") {
    const t = layer.text.trim();
    return t.length > 18 ? `${t.slice(0, 18)}…` : t || "Text";
  }
  if (layer.kind === "shape") return layer.shape;
  return "Logo";
}

function StyleSwatchGrid({
  selectedId,
  disabled,
  zh,
  onSelect,
}: {
  selectedId: CaptionStylePresetId;
  disabled?: boolean;
  zh: boolean;
  onSelect: (id: CaptionStylePresetId) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
      {CAPTION_STYLE_PRESET_IDS.map((id) => {
        const p = CAPTION_STYLE_PRESETS[id];
        const active = id === selectedId;
        return (
          <button
            key={id}
            type="button"
            disabled={disabled}
            title={presetLabel(id, zh)}
            onClick={() => onSelect(id)}
            className={`flex flex-col items-center gap-0.5 rounded-lg border px-1 py-1.5 text-[9px] leading-tight transition ${
              active
                ? "border-cyan-500 bg-cyan-950/50 text-cyan-100"
                : "border-slate-700 bg-slate-900 text-slate-400 hover:border-slate-500"
            }`}
          >
            <span
              className="flex h-8 w-full items-center justify-center rounded text-base font-bold"
              style={{
                color: p.fill === "transparent" ? p.stroke : p.fill,
                WebkitTextStroke: p.fill === "transparent" ? `1px ${p.stroke}` : undefined,
                background:
                  id.startsWith("carousel-") && p.fill === "#ffffff"
                    ? "linear-gradient(135deg,#6b5344,#8b6f5c)"
                    : id.startsWith("carousel-")
                      ? "#f5f0eb"
                      : "#1e293b",
              }}
            >
              Aa
            </span>
            <span className="line-clamp-2 text-center">{presetLabel(id, zh)}</span>
          </button>
        );
      })}
    </div>
  );
}

export function KonvaImageLayerCanvas({
  imageUrl,
  disabled,
  initialLayers,
  brandKit,
  labels,
  onApply,
  onRestore,
}: KonvaImageLayerCanvasProps) {
  const { locale } = useLocale();
  const zh = locale.startsWith("zh");

  const bgImage = useHtmlImage(imageUrl);
  const [stageHeight, setStageHeight] = useState(640);
  const defaultTextLayer = () =>
    newImageCanvasTextLayer({
      text: brandKit?.tagline.trim() || "Headline",
      xPct: 50,
      yPct: 18,
      wPct: 80,
      align: "center",
      stylePreset: "carousel-title",
      fill: brandKit?.primaryColor ?? "#4a3728",
      stroke: "transparent",
      fontFamily: brandKit ? brandKitFontFamily(brandKit.fontPreset) : undefined,
    });
  const seedLayers = initialLayers?.length ? initialLayers : [defaultTextLayer()];
  const [layerHistory, setLayerHistory] = useState<ImageCanvasLayer[][]>(() => [
    structuredClone(seedLayers) as ImageCanvasLayer[],
  ]);
  const [layerHistoryIndex, setLayerHistoryIndex] = useState(0);
  const layerHistoryIndexRef = useRef(0);
  layerHistoryIndexRef.current = layerHistoryIndex;
  const layers = layerHistory[layerHistoryIndex] ?? seedLayers;
  const [selectedId, setSelectedId] = useState<string | null>(layers[0]?.id ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const textDirtyRef = useRef(false);

  useEffect(() => {
    if (!bgImage) return;
    setStageHeight(
      Math.round(STAGE_WIDTH * (bgImage.naturalHeight / bgImage.naturalWidth || 16 / 9)),
    );
  }, [bgImage]);

  const selected = layers.find((l) => l.id === selectedId) ?? null;

  const mutateLayers = useCallback(
    (mutator: (prev: ImageCanvasLayer[]) => ImageCanvasLayer[], recordHistory: boolean) => {
      setLayerHistory((prev) => {
        const idx = layerHistoryIndexRef.current;
        const current = prev[idx] ?? [];
        const next = mutator(current);
        const snap = structuredClone(next) as ImageCanvasLayer[];
        if (!recordHistory) {
          const copy = [...prev];
          copy[idx] = snap;
          return copy;
        }
        return [...prev.slice(0, idx + 1), snap];
      });
      if (recordHistory) setLayerHistoryIndex((i) => i + 1);
    },
    [],
  );

  const updateLayer = useCallback(
    (id: string, patch: Partial<ImageCanvasLayer>, recordHistory = false) => {
      mutateLayers(
        (prev) => prev.map((l) => (l.id === id ? ({ ...l, ...patch } as ImageCanvasLayer) : l)),
        recordHistory,
      );
    },
    [mutateLayers],
  );

  function layerHistoryPrev() {
    setLayerHistoryIndex((i) => Math.max(0, i - 1));
  }

  function layerHistoryNext() {
    setLayerHistoryIndex((i) => Math.min(layerHistory.length - 1, i + 1));
  }

  function recoverLayerHistory() {
    setLayerHistoryIndex(0);
  }

  useEffect(() => {
    const tr = transformerRef.current;
    const stage = stageRef.current;
    if (!tr || !stage) return;
    const node = selectedId ? stage.findOne(`#node-${selectedId}`) : null;
    if (node) {
      tr.nodes([node]);
      tr.getLayer()?.batchDraw();
    } else {
      tr.nodes([]);
      tr.getLayer()?.batchDraw();
    }
  }, [selectedId, layers, stageHeight]);

  function clampPct(n: number, min = 0, max = 100) {
    return Math.min(max, Math.max(min, n));
  }

  function pctFromNode(x: number, y: number, w: number, h: number) {
    return {
      xPct: clampPct(((x + w / 2) / STAGE_WIDTH) * 100),
      yPct: clampPct(((y + h / 2) / stageHeight) * 100),
      wPct: Math.min(95, Math.max(4, (w / STAGE_WIDTH) * 100)),
      hPct: Math.min(95, Math.max(4, (h / stageHeight) * 100)),
    };
  }

  /** Group.width()/height() are unreliable after drag — use layout box size. */
  function textDragCenterPct(layer: ImageCanvasTextLayer, node: Konva.Node) {
    const { height } = textMetrics(layer);
    const w = ((layer.wPct ?? 70) / 100) * STAGE_WIDTH;
    return {
      xPct: clampPct(((node.x() + w / 2) / STAGE_WIDTH) * 100),
      yPct: clampPct(((node.y() + height / 2) / stageHeight) * 100),
    };
  }

  function onDragEnd(id: string, e: Konva.KonvaEventObject<DragEvent>) {
    const node = e.target;
    const layer = layers.find((l) => l.id === id);
    if (
      layer?.kind === "shape" &&
      (layer.shape === "circle" || layer.shape === "check-badge")
    ) {
      updateLayer(
        id,
        {
          xPct: clampPct((node.x() / STAGE_WIDTH) * 100),
          yPct: clampPct((node.y() / stageHeight) * 100),
        },
        true,
      );
      return;
    }
    if (layer?.kind === "text") {
      updateLayer(id, textDragCenterPct(layer, node), true);
      return;
    }
    if (layer?.kind === "logo") {
      const w = Math.max(8, node.width() * node.scaleX());
      const h = Math.max(8, node.height() * node.scaleY());
      updateLayer(
        id,
        {
          xPct: clampPct(((node.x() + w / 2) / STAGE_WIDTH) * 100),
          yPct: clampPct(((node.y() + h / 2) / stageHeight) * 100),
          wPct: Math.min(95, Math.max(4, (w / STAGE_WIDTH) * 100)),
          hPct: Math.min(95, Math.max(4, (h / stageHeight) * 100)),
        },
        true,
      );
      return;
    }
    const w = Math.max(8, node.width() * node.scaleX());
    const h = Math.max(8, node.height() * node.scaleY());
    updateLayer(id, pctFromNode(node.x(), node.y(), w, h), true);
  }

  function onTransformEnd(id: string, e: Konva.KonvaEventObject<Event>) {
    const node = e.target;
    const layer = layers.find((l) => l.id === id);
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    node.scaleX(1);
    node.scaleY(1);
    let w = Math.max(8, node.width() * scaleX);
    let h = Math.max(8, node.height() * scaleY);
    if (layer?.kind === "logo" && layer.aspectRatio) {
      const imageAspect = STAGE_WIDTH / stageHeight;
      h = (w / layer.aspectRatio) * imageAspect;
      node.height(h);
    } else {
      node.width(w);
      node.height(h);
    }
    if (layer?.kind === "text") {
      updateLayer(
        id,
        {
          xPct: clampPct(((node.x() + w / 2) / STAGE_WIDTH) * 100),
          yPct: clampPct(((node.y() + h / 2) / stageHeight) * 100),
          wPct: Math.min(95, Math.max(8, (w / STAGE_WIDTH) * 100)),
        },
        true,
      );
      return;
    }
    if (layer?.kind === "logo") {
      updateLayer(
        id,
        {
          xPct: clampPct(((node.x() + w / 2) / STAGE_WIDTH) * 100),
          yPct: clampPct(((node.y() + h / 2) / stageHeight) * 100),
          wPct: Math.min(95, Math.max(4, (w / STAGE_WIDTH) * 100)),
          hPct: Math.min(95, Math.max(4, (h / stageHeight) * 100)),
        },
        true,
      );
      return;
    }
    w = node.width();
    h = node.height();
    updateLayer(id, pctFromNode(node.x(), node.y(), w, h), true);
  }

  function addShape(shape: ImageShapeKind) {
    const layer = newImageShapeLayer({ shape, yPct: 20 + layers.length * 6 });
    mutateLayers((prev) => [...prev, layer], true);
    setSelectedId(layer.id);
  }

  function addMarketingBlock(blockId: MarketingBlockId) {
    mutateLayers((prev) => {
      const block = buildMarketingBlock(blockId, prev);
      if (block.length) setSelectedId(block[block.length - 1]!.id);
      return [...prev, ...block];
    }, true);
  }

  function addLogo() {
    const url = brandKit?.logoUrl;
    if (!url) return;
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const aspect = img.naturalWidth / img.naturalHeight;
      const imageAspect = bgImage
        ? bgImage.naturalWidth / bgImage.naturalHeight
        : STAGE_WIDTH / stageHeight;
      const { wPct, hPct } = logoPctFromAspect(aspect, imageAspect, 20);
      const layer = newImageLogoLayer({
        url,
        yPct: 88,
        xPct: 88,
        wPct,
        hPct,
        aspectRatio: aspect,
      });
      mutateLayers((prev) => [...prev, layer], true);
      setSelectedId(layer.id);
    };
    img.src = url;
  }

  function applyPreset(layer: ImageCanvasTextLayer, presetId: CaptionStylePresetId) {
    updateLayer(layer.id, applyTextStylePreset(layer, presetId), true);
  }

  async function handleApply() {
    const ready = layers.filter((l) =>
      l.kind === "text" ? l.text.trim() : l.kind === "logo" ? l.url.trim() : true,
    );
    if (!ready.length) {
      setError(labels.needLayer);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onApply(ready);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Apply failed");
    } finally {
      setBusy(false);
    }
  }

  function textMetrics(layer: ImageCanvasTextLayer) {
    const preset = CAPTION_STYLE_PRESETS[layer.stylePreset];
    const fontSize = 18 * (layer.fontSizeScale ?? preset?.fontSizeScale ?? 1);
    const w = ((layer.wPct ?? 70) / 100) * STAGE_WIDTH;
    const lineCount = wrappedLineCount(layer.text, w, fontSize);
    const height = textBoxHeightPx(lineCount, fontSize);
    return { fontSize, height, lineCount, preset };
  }

  function textBoxGeometry(layer: ImageCanvasTextLayer) {
    const anchorX = (layer.xPct / 100) * STAGE_WIDTH;
    const anchorY = (layer.yPct / 100) * stageHeight;
    const w = ((layer.wPct ?? 70) / 100) * STAGE_WIDTH;
    const align = layer.align ?? "center";
    const x = align === "left" ? anchorX : align === "right" ? anchorX - w : anchorX - w / 2;
    const { height } = textMetrics(layer);
    return { x, y: anchorY - height / 2, w, height, align };
  }

  function renderTextLayer(layer: ImageCanvasTextLayer, common: Record<string, unknown>) {
    const { x, y, w, height, align } = textBoxGeometry(layer);
    const { fontSize, preset } = textMetrics(layer);
    const fill = layer.fill ?? preset?.fill ?? "#fff";
    const stroke = layer.stroke ?? preset?.stroke ?? "#000";
    const strokeWidth = effectiveTextStrokeWidth(stroke, fontSize, preset?.strokeWidthScale ?? 1);

    const { onDragEnd, onTransformEnd, ...groupRest } = common as {
      onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => void;
      onTransformEnd: (e: Konva.KonvaEventObject<Event>) => void;
      [key: string]: unknown;
    };

    return (
      <Group
        key={layer.id}
        {...groupRest}
        x={x}
        y={y}
        width={w}
        height={height}
        dragBoundFunc={(pos) => ({
          x: Math.min(STAGE_WIDTH - 8, Math.max(8 - w, pos.x)),
          y: Math.min(stageHeight - 8, Math.max(8 - height, pos.y)),
        })}
        onDragEnd={onDragEnd}
        onTransformEnd={onTransformEnd}
      >
        {/* Full box hit target — Text glyphs alone are hard to grab. */}
        <Rect
          x={0}
          y={0}
          width={w}
          height={Math.max(height, fontSize * 1.2)}
          fill="rgba(0,0,0,0.001)"
        />
        <Text
          x={0}
          y={0}
          width={w}
          height={height}
          text={layer.text}
          fontSize={fontSize}
          fontStyle="bold"
          fontFamily={layer.fontFamily ?? preset?.fontFamily ?? "sans-serif"}
          fill={fill}
          stroke={strokeWidth > 0 ? stroke : undefined}
          strokeWidth={strokeWidth}
          align={align}
          verticalAlign="middle"
          wrap="word"
          lineHeight={1.35}
          listening={false}
        />
      </Group>
    );
  }

  function renderShapeLayer(layer: ImageShapeLayer, common: Record<string, unknown>) {
    const x = (layer.xPct / 100) * STAGE_WIDTH;
    const y = (layer.yPct / 100) * stageHeight;
    const w = (layer.wPct / 100) * STAGE_WIDTH;
    const h = Math.max(4, (layer.hPct / 100) * stageHeight);
    const lx = x - w / 2;
    const ly = y - h / 2;
    const stroke = layer.strokeColor ?? layer.color;
    const cornerRadius =
      layer.shape === "capsule"
        ? h / 2
        : layer.cornerRadius ?? (layer.shape === "button" || layer.shape === "badge" ? 6 : 8);

    if (layer.shape === "check-badge") {
      const r = Math.max(w, h) / 2;
      return (
        <Group key={layer.id} {...common} x={x} y={y}>
          <Circle
            radius={r}
            fill={layer.color}
            opacity={layer.fillOpacity}
            stroke={stroke}
            strokeWidth={layer.strokeWidth}
          />
          <Text
            text="✓"
            fontSize={r * 1.1}
            fontStyle="bold"
            fill={stroke}
            x={-r * 0.55}
            y={-r * 0.55}
            width={r * 1.1}
            align="center"
          />
        </Group>
      );
    }

    if (layer.shape === "circle") {
      return (
        <Circle
          key={layer.id}
          {...common}
          x={x}
          y={y}
          radius={Math.max(w, h) / 2}
          fill={layer.color}
          opacity={layer.fillOpacity}
          stroke={stroke}
          strokeWidth={layer.strokeWidth}
        />
      );
    }

    if (layer.shape === "line") {
      const hitH = Math.max(12, layer.strokeWidth * 3);
      const { onDragEnd, onTransformEnd, ...groupRest } = common as {
        onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => void;
        onTransformEnd: (e: Konva.KonvaEventObject<Event>) => void;
        [key: string]: unknown;
      };
      return (
        <Group
          key={layer.id}
          {...groupRest}
          x={lx}
          y={y - hitH / 2}
          width={w}
          height={hitH}
          onDragEnd={onDragEnd}
          onTransformEnd={onTransformEnd}
        >
          <Line
            points={[0, hitH / 2, w, hitH / 2]}
            stroke={layer.color}
            strokeWidth={layer.strokeWidth}
            lineCap="round"
          />
        </Group>
      );
    }

    if (layer.shape === "arrow") {
      return (
        <Arrow
          key={layer.id}
          {...common}
          points={[lx, ly, lx + w, ly + h]}
          stroke={layer.color}
          fill={layer.color}
          strokeWidth={layer.strokeWidth}
          pointerLength={10}
          pointerWidth={10}
        />
      );
    }

    const isButton = layer.shape === "button";
    return (
      <Rect
        key={layer.id}
        {...common}
        x={lx}
        y={ly}
        width={w}
        height={h}
        fill={isButton ? "#ffffff" : layer.color}
        opacity={isButton ? 1 : layer.fillOpacity}
        stroke={stroke}
        strokeWidth={layer.strokeWidth}
        cornerRadius={cornerRadius}
        shadowColor="#000"
        shadowBlur={isButton ? 6 : 0}
        shadowOpacity={isButton ? 0.15 : 0}
        shadowOffsetY={isButton ? 2 : 0}
      />
    );
  }

  function renderLayer(layer: ImageCanvasLayer) {
    const common = {
      id: `node-${layer.id}`,
      draggable: !disabled && !busy,
      onClick: () => setSelectedId(layer.id),
      onTap: () => setSelectedId(layer.id),
      onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => onDragEnd(layer.id, e),
      onTransformEnd: (e: Konva.KonvaEventObject<Event>) => onTransformEnd(layer.id, e),
    };

    if (layer.kind === "text") return renderTextLayer(layer, common);

    if (layer.kind === "logo") {
      const boxW = (layer.wPct / 100) * STAGE_WIDTH;
      const boxH = (layer.hPct / 100) * stageHeight;
      const cx = (layer.xPct / 100) * STAGE_WIDTH;
      const cy = (layer.yPct / 100) * stageHeight;
      return (
        <LogoNode
          key={layer.id}
          layer={layer}
          url={layer.url}
          x={cx - boxW / 2}
          y={cy - boxH / 2}
          boxW={boxW}
          boxH={boxH}
          common={common}
        />
      );
    }

    return renderShapeLayer(layer, common);
  }

  const fillLabel = labels.fillColorLabel ?? labels.colorLabel;
  const strokeLabel = labels.strokeColorLabel ?? "Outline";

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-400">{labels.hint}</p>
      <p className="text-[10px] text-slate-500">{labels.dragHint}</p>

      <div className="overflow-hidden rounded-lg border border-slate-600 bg-slate-950">
        <CanvasHistoryNav
          disabled={disabled || busy}
          canPrev={layerHistoryIndex > 0}
          canNext={layerHistoryIndex < layerHistory.length - 1}
          onPrev={layerHistoryPrev}
          onNext={layerHistoryNext}
          prevLabel={labels.canvasPrev ?? "Previous edit"}
          nextLabel={labels.canvasNext ?? "Next edit"}
          versionLabel={
            labels.canvasVersion
              ? labels.canvasVersion(layerHistoryIndex + 1, layerHistory.length)
              : `${layerHistoryIndex + 1} / ${layerHistory.length}`
          }
          recoverLabel={labels.canvasRecoverEdits ?? labels.recoverOriginal}
          onRecover={recoverLayerHistory}
          canRecover={layerHistoryIndex > 0}
        />
        {bgImage && (
          <Stage ref={stageRef} width={STAGE_WIDTH} height={stageHeight}>
            <Layer>
              <KonvaImage image={bgImage} width={STAGE_WIDTH} height={stageHeight} listening={false} />
            </Layer>
            <Layer>
              {layers.map(renderLayer)}
              <Transformer
                ref={transformerRef}
                rotateEnabled
                keepRatio={selected?.kind === "logo"}
                boundBoxFunc={(old, next) => (next.width < 8 || next.height < 8 ? old : next)}
              />
            </Layer>
          </Stage>
        )}
      </div>

      {layers.length > 0 && (
        <div className="rounded-lg border border-slate-700 p-2">
          <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-slate-500">
            {labels.layersLabel ?? "Layers"}
          </p>
          <div className="flex flex-wrap gap-1">
            {layers.map((layer, i) => (
              <button
                key={layer.id}
                type="button"
                disabled={disabled || busy}
                onClick={() => setSelectedId(layer.id)}
                className={`rounded border px-2 py-0.5 text-[10px] ${
                  selectedId === layer.id
                    ? "border-cyan-500 bg-cyan-950/40 text-cyan-100"
                    : "border-slate-700 text-slate-400 hover:border-slate-500"
                }`}
              >
                {i + 1}. {layerSummary(layer)}
              </button>
            ))}
          </div>
        </div>
      )}

      {selected?.kind === "text" && (
        <div className="space-y-3 rounded-lg border border-slate-700 p-3">
          <textarea
            rows={2}
            disabled={disabled || busy}
            value={selected.text}
            onChange={(e) => {
              textDirtyRef.current = true;
              updateLayer(selected.id, { text: e.target.value }, false);
            }}
            onBlur={() => {
              if (!textDirtyRef.current) return;
              mutateLayers((prev) => prev, true);
              textDirtyRef.current = false;
            }}
            placeholder={labels.textPlaceholder}
            className="w-full rounded border border-slate-600 bg-slate-900 px-2 py-1 text-sm text-white"
          />

          <div>
            <p className="mb-1.5 text-xs text-slate-400">{labels.styleLabel}</p>
            <StyleSwatchGrid
              selectedId={selected.stylePreset}
              disabled={disabled || busy}
              zh={zh}
              onSelect={(id) => applyPreset(selected, id)}
            />
          </div>

          <label className="block text-xs text-slate-400">
            {labels.fontSizeLabel ?? "Font size"}
            <div className="mt-1 flex items-center gap-2">
              <input
                type="range"
                min={0.5}
                max={2.5}
                step={0.05}
                disabled={disabled || busy}
                value={selected.fontSizeScale ?? CAPTION_STYLE_PRESETS[selected.stylePreset]?.fontSizeScale ?? 1}
                onChange={(e) =>
                  updateLayer(selected.id, { fontSizeScale: Number(e.target.value) }, true)
                }
                className="flex-1"
              />
              <span className="w-10 text-right text-[10px] text-slate-500">
                {Math.round(
                  (selected.fontSizeScale ??
                    CAPTION_STYLE_PRESETS[selected.stylePreset]?.fontSizeScale ??
                    1) * 100,
                )}
                %
              </span>
            </div>
          </label>

          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs text-slate-400">
              {fillLabel}
              <input
                type="color"
                disabled={disabled || busy}
                value={selected.fill?.startsWith("#") ? selected.fill : "#4a3728"}
                onChange={(e) => updateLayer(selected.id, { fill: e.target.value }, true)}
                className="mt-1 block h-9 w-full cursor-pointer rounded border border-slate-600"
              />
            </label>
            <label className="text-xs text-slate-400">
              {strokeLabel}
              <div className="mt-1 flex gap-1">
                <input
                  type="color"
                  disabled={disabled || busy}
                  value={
                    selected.stroke?.startsWith("#")
                      ? selected.stroke
                      : selected.stroke === "transparent"
                        ? "#000000"
                        : "#000000"
                  }
                  onChange={(e) => updateLayer(selected.id, { stroke: e.target.value }, true)}
                  className="h-9 flex-1 cursor-pointer rounded border border-slate-600"
                />
                <button
                  type="button"
                  disabled={disabled || busy}
                  onClick={() => updateLayer(selected.id, { stroke: "transparent" }, true)}
                  className="rounded border border-slate-600 px-2 text-[10px] text-slate-400"
                >
                  ∅
                </button>
              </div>
            </label>
          </div>

          <div className="flex flex-wrap gap-1">
            <span className="w-full text-xs text-slate-400">{labels.alignLabel ?? "Align"}</span>
            {(["left", "center", "right"] as const).map((align) => (
              <button
                key={align}
                type="button"
                disabled={disabled || busy}
                onClick={() => updateLayer(selected.id, { align }, true)}
                className={`rounded border px-2 py-1 text-xs ${
                  (selected.align ?? "center") === align
                    ? "border-cyan-500 text-cyan-200"
                    : "border-slate-600 text-slate-400"
                }`}
              >
                {align === "left"
                  ? (labels.alignLeft ?? "Left")
                  : align === "center"
                    ? (labels.alignCenter ?? "Center")
                    : (labels.alignRight ?? "Right")}
              </button>
            ))}
          </div>
        </div>
      )}

      {selected?.kind === "shape" && (
        <div className="space-y-2 rounded-lg border border-slate-700 p-3">
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs text-slate-400">
              {fillLabel}
              <input
                type="color"
                disabled={disabled || busy}
                value={selected.color.startsWith("#") ? selected.color : "#6b5344"}
                onChange={(e) => updateLayer(selected.id, { color: e.target.value }, true)}
                className="mt-1 block h-9 w-full cursor-pointer rounded border border-slate-600"
              />
            </label>
            <label className="text-xs text-slate-400">
              {strokeLabel}
              <input
                type="color"
                disabled={disabled || busy}
                value={(selected.strokeColor ?? selected.color).startsWith("#") ? (selected.strokeColor ?? selected.color) : "#6b5344"}
                onChange={(e) => updateLayer(selected.id, { strokeColor: e.target.value }, true)}
                className="mt-1 block h-9 w-full cursor-pointer rounded border border-slate-600"
              />
            </label>
          </div>
          <label className="block text-xs text-slate-400">
            {labels.opacityLabel ?? "Opacity"} ({Math.round(selected.fillOpacity * 100)}%)
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              disabled={disabled || busy}
              value={selected.fillOpacity}
              onChange={(e) => updateLayer(selected.id, { fillOpacity: Number(e.target.value) }, true)}
              className="mt-1 w-full"
            />
          </label>
          <label className="block text-xs text-slate-400">
            {labels.strokeWidthLabel ?? "Border width"} ({selected.strokeWidth}px)
            <input
              type="range"
              min={0}
              max={12}
              step={1}
              disabled={disabled || busy}
              value={selected.strokeWidth}
              onChange={(e) => updateLayer(selected.id, { strokeWidth: Number(e.target.value) }, true)}
              className="mt-1 w-full"
            />
          </label>
        </div>
      )}

      <div className="rounded-lg border border-slate-800 p-2">
        <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-slate-500">
          {labels.marketingTitle ?? "Add elements"}
        </p>
        {labels.marketingHint && (
          <p className="mb-1.5 text-[10px] text-slate-500">{labels.marketingHint}</p>
        )}
        <div className="flex flex-wrap gap-1">
          {MARKETING_BLOCKS.map((id) => (
            <button
              key={id}
              type="button"
              disabled={disabled || busy}
              onClick={() => addMarketingBlock(id)}
              className="rounded border border-slate-600 px-2 py-1 text-[10px] text-slate-300 hover:border-slate-400"
            >
              + {marketingBlockLabel(id, labels)}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-slate-800 p-2">
        <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-slate-500">
          {labels.addShapeBtn}
        </p>
        <div className="flex flex-wrap gap-1">
          {SHAPE_KINDS.map((kind) => (
            <button
              key={kind}
              type="button"
              disabled={disabled || busy}
              onClick={() => addShape(kind)}
              className="rounded border border-slate-600 px-2 py-1 text-[10px] text-slate-300 hover:border-slate-400"
            >
              {shapeLabel(kind, labels)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={disabled || busy}
          onClick={() => {
            const l = newImageCanvasTextLayer({
              yPct: 18 + layers.length * 6,
              xPct: 12,
              wPct: 80,
              align: "left",
              stylePreset: "carousel-body",
              fill: "#5c4033",
              stroke: "transparent",
            });
            mutateLayers((p) => [...p, l], true);
            setSelectedId(l.id);
          }}
          className="rounded border border-slate-600 px-2 py-1 text-xs text-slate-200"
        >
          {labels.addTextBtn}
        </button>
        {brandKit?.logoUrl && (
          <button
            type="button"
            disabled={disabled || busy}
            onClick={addLogo}
            className="rounded border border-emerald-700 px-2 py-1 text-xs text-emerald-200"
          >
            {labels.addLogoBtn}
          </button>
        )}
        {selectedId && (
          <button
            type="button"
            disabled={disabled || busy}
            onClick={() => {
              mutateLayers((p) => p.filter((l) => l.id !== selectedId), true);
              setSelectedId(null);
            }}
            className="rounded border border-red-800 px-2 py-1 text-xs text-red-200"
          >
            {labels.removeLayerBtn}
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={disabled || busy}
          onClick={() => void handleApply()}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
        >
          {busy ? labels.applying : labels.applyBtn}
        </button>
        {onRestore && (
          <button
            type="button"
            disabled={disabled || busy}
            onClick={onRestore}
            className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-200"
          >
            {labels.restoreBtn}
          </button>
        )}
      </div>
      {error && <p className="text-xs text-red-300">{error}</p>}
    </div>
  );
}

function LogoNode({
  layer,
  url,
  x,
  y,
  boxW,
  boxH,
  common,
}: {
  layer: ImageCanvasLayer & { kind: "logo" };
  url: string;
  x: number;
  y: number;
  boxW: number;
  boxH: number;
  common: Record<string, unknown>;
}) {
  const img = useHtmlImage(url);
  if (!img) return null;

  const fit = fitImageInBox(img.naturalWidth, img.naturalHeight, boxW, boxH);
  const { onDragEnd, onTransformEnd, ...groupRest } = common as {
    onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => void;
    onTransformEnd: (e: Konva.KonvaEventObject<Event>) => void;
    [key: string]: unknown;
  };

  return (
    <Group
      key={layer.id}
      {...groupRest}
      x={x}
      y={y}
      width={boxW}
      height={boxH}
      onDragEnd={onDragEnd}
      onTransformEnd={onTransformEnd}
    >
      <KonvaImage
        image={img}
        x={fit.offsetX}
        y={fit.offsetY}
        width={fit.w}
        height={fit.h}
      />
    </Group>
  );
}
