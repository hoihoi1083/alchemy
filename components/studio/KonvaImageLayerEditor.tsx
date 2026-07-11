"use client";

import { KonvaImageLayerCanvas } from "@/components/studio/KonvaImageLayerCanvas";
import type { ImageCanvasLayer } from "@/lib/image-canvas-layers";
import type { BrandKit } from "@/lib/brand-kit";

type KonvaImageLayerEditorProps = {
  imageUrl: string;
  disabled?: boolean;
  initialLayers?: ImageCanvasLayer[];
  brandKit?: BrandKit | null;
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
  onApply: (layers: ImageCanvasLayer[]) => Promise<void>;
  onRestore?: () => void;
};

export function KonvaImageLayerEditor(props: KonvaImageLayerEditorProps) {
  return <KonvaImageLayerCanvas {...props} />;
}
