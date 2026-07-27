"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useLocale } from "@/components/LocaleProvider";
import { DEFAULT_BRAND_KIT, loadBrandKitFromStorage } from "@/lib/brand-kit";
import { seedBrandCanvasLayers } from "@/lib/brand-merge";
import type { ImageCanvasLayer } from "@/lib/image-canvas-layers";
import {
  clearImageCanvasHandoff,
  normalizeImageCanvasHandoffUrl,
  readImageCanvasHandoff,
} from "@/lib/image-canvas-handoff";
import { downloadMediaUrl } from "@/lib/download-media";
import { withCacheBust } from "@/lib/caption-studio-url";
import { isLibraryAssetUrl } from "@/lib/storage/library-asset-url";
import { readImageCanvasDraft, writeImageCanvasDraft } from "@/lib/image-canvas-studio-draft";
import { isPipelineFileUrl } from "@/lib/pipeline/safe-url";
import { LibraryAssetPicker } from "@/components/LibraryAssetPicker";

const ImageInpaintMaskEditor = dynamic(
  () => import("@/components/studio/ImageInpaintMaskEditor").then((m) => m.ImageInpaintMaskEditor),
  {
    ssr: false,
    loading: () => <p className="text-xs text-slate-400">Loading cleanup brush…</p>,
  },
);

const KonvaImageLayerEditor = dynamic(
  () =>
    import("@/components/studio/KonvaImageLayerEditor").then((m) => ({
      default: m.KonvaImageLayerEditor,
    })),
  {
    ssr: false,
    loading: () => <p className="text-xs text-slate-400">Loading canvas editor…</p>,
  },
);

type SourceKind = "file" | "url";
type EditStep = "upload" | "clean" | "design" | "export";

type CleanImageFrame = {
  pipelineUrl: string | null;
  displayUrl: string;
};

const WORKFLOW_STEPS: EditStep[] = ["upload", "clean", "design", "export"];

function revokeBlobUrls(urls: string[]) {
  for (const url of urls) {
    if (url.startsWith("blob:")) URL.revokeObjectURL(url);
  }
}

function pipelineAbsoluteUrl(relative: string): string {
  if (relative.startsWith("http")) return relative;
  if (typeof window === "undefined") return relative;
  return `${window.location.origin}${relative.startsWith("/") ? "" : "/"}${relative}`;
}

/** Same-origin preview URL — library assets need inline=1 to stream bytes (not 302). */
function previewFetchUrl(url: string): string {
  let next = withCacheBust(url);
  if (isLibraryAssetUrl(next) && !next.includes("inline=1")) {
    next += `${next.includes("?") ? "&" : "?"}inline=1`;
  }
  return next;
}

async function fetchPreviewBlob(url: string): Promise<Blob> {
  const res = await fetch(previewFetchUrl(url), {
    credentials: "include",
    cache: "no-store",
  });
  if (!res.ok) {
    let detail = "";
    try {
      const data = (await res.json()) as { error?: string };
      if (data.error) detail = ` — ${data.error}`;
    } catch {
      /* not json */
    }
    throw new Error(`${res.status}${detail}`);
  }
  const blob = await res.blob();
  if (blob.size < 512) throw new Error("empty");
  return blob;
}

async function burnImageLayers(input: {
  file: File | null;
  url: string | null;
  layers: ImageCanvasLayer[];
}): Promise<string> {
  let res: Response;
  if (input.file) {
    const fd = new FormData();
    fd.set("image_file", input.file);
    fd.set("layers", JSON.stringify(input.layers));
    res = await fetch("/api/burn-image-text", { method: "POST", credentials: "include", body: fd });
  } else if (input.url) {
    res = await fetch("/api/burn-image-text", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ image_url: input.url, layers: input.layers }),
    });
  } else {
    throw new Error("No image source");
  }
  const data = (await res.json()) as { imageUrl?: string; error?: string };
  if (!res.ok) throw new Error(data.error ?? "Burn failed");
  if (!data.imageUrl) throw new Error("Missing image URL");
  return normalizeImageCanvasHandoffUrl(data.imageUrl);
}

export function ImageCanvasStudioClient() {
  const { m } = useLocale();
  const t = m.imageCanvas;
  const w = m.wizard;
  const searchParams = useSearchParams();

  const [step, setStep] = useState<EditStep>("upload");
  const [sourceKind, setSourceKind] = useState<SourceKind | null>(null);
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [sourceLabel, setSourceLabel] = useState("");
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const [processedImageUrl, setProcessedImageUrl] = useState<string | null>(null);
  const [resultPreviewUrl, setResultPreviewUrl] = useState<string | null>(null);
  const [resultReloadKey, setResultReloadKey] = useState(0);
  const [initialLayers, setInitialLayers] = useState<ImageCanvasLayer[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [downloadBusy, setDownloadBusy] = useState(false);
  const [cleanFrames, setCleanFrames] = useState<CleanImageFrame[]>([]);
  const [cleanFrameIndex, setCleanFrameIndex] = useState(0);
  const [originalSourceKind, setOriginalSourceKind] = useState<SourceKind | null>(null);
  const [originalSourceFile, setOriginalSourceFile] = useState<File | null>(null);
  const [originalSourceUrl, setOriginalSourceUrl] = useState<string | null>(null);
  const [visitedSteps, setVisitedSteps] = useState<Set<EditStep>>(new Set());
  const [inpaintEditorKey, setInpaintEditorKey] = useState(0);
  const [brandKit] = useState(() =>
    typeof window !== "undefined" ? loadBrandKitFromStorage() : DEFAULT_BRAND_KIT,
  );
  const [libraryPickerOpen, setLibraryPickerOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const sourceKey = sourceFile
    ? `file:${sourceFile.name}:${sourceFile.size}`
    : sourceUrl
      ? `url:${sourceUrl}`
      : "";

  const editorImageUrl =
    step === "clean" && cleanFrames[cleanFrameIndex]
      ? cleanFrames[cleanFrameIndex]!.displayUrl
      : (localPreviewUrl ?? "");
  const hasWorkspace = Boolean(localPreviewUrl && sourceKind);

  const stepLabels: Record<EditStep, string> = {
    upload: t.stepUpload,
    clean: t.stepClean,
    design: t.stepDesign,
    export: t.stepExport,
  };

  const loadSource = useCallback(
    (kind: SourceKind, opts: { file?: File; url?: string; label?: string; layers?: ImageCanvasLayer[] }) => {
      if (localPreviewUrl?.startsWith("blob:")) URL.revokeObjectURL(localPreviewUrl);
      if (resultPreviewUrl?.startsWith("blob:")) URL.revokeObjectURL(resultPreviewUrl);
      setCleanFrames((prev) => {
        revokeBlobUrls(prev.map((f) => f.displayUrl));
        return [];
      });
      setCleanFrameIndex(0);

      setProcessedImageUrl(null);
      setResultPreviewUrl(null);
      setResultReloadKey(0);
      setNote(null);
      setError(null);
      setSourceKind(kind);
      setStep("clean");
      setVisitedSteps(new Set(["upload", "clean"]));
      setInpaintEditorKey(0);

      setOriginalSourceKind(kind);
      if (kind === "file" && opts.file) {
        setOriginalSourceFile(opts.file);
        setOriginalSourceUrl(null);
      } else if (kind === "url" && opts.url) {
        setOriginalSourceFile(null);
        setOriginalSourceUrl(normalizeImageCanvasHandoffUrl(opts.url));
      }

      if (kind === "file" && opts.file) {
        const blobUrl = URL.createObjectURL(opts.file);
        setSourceFile(opts.file);
        setSourceUrl(null);
        setSourceLabel(opts.label ?? opts.file.name);
        setLocalPreviewUrl(blobUrl);
        setCleanFrames([{ pipelineUrl: null, displayUrl: blobUrl }]);
      } else if (kind === "url" && opts.url) {
        setSourceFile(null);
        const rel = normalizeImageCanvasHandoffUrl(opts.url);
        setSourceUrl(rel);
        setSourceLabel(opts.label ?? t.sourceFromStudio);
        setLocalPreviewUrl(rel);
        setCleanFrames([{ pipelineUrl: rel, displayUrl: rel }]);
      }
      setCleanFrameIndex(0);

      const key =
        kind === "file" && opts.file
          ? `file:${opts.file.name}:${opts.file.size}`
          : opts.url
            ? `url:${normalizeImageCanvasHandoffUrl(opts.url)}`
            : "";
      const draft = key ? readImageCanvasDraft(key) : null;
      const seeded =
        opts.layers ??
        draft ??
        seedBrandCanvasLayers({
          headline: "",
          subline: "",
          brandKit,
          brandProfile: null,
        });
      setInitialLayers(seeded.length ? seeded : []);
    },
    [brandKit, localPreviewUrl, resultPreviewUrl, t.sourceFromStudio],
  );

  useEffect(() => {
    const handoff = readImageCanvasHandoff();
    const imageParam = searchParams.get("image")?.trim();
    const url = handoff?.imageUrl ?? imageParam ?? null;
    if (url) {
      loadSource("url", {
        url,
        label: handoff?.label,
        layers: handoff?.initialLayers,
      });
      clearImageCanvasHandoff();
    }
  }, [searchParams, loadSource]);

  useEffect(() => {
    return () => {
      if (localPreviewUrl?.startsWith("blob:")) URL.revokeObjectURL(localPreviewUrl);
      if (resultPreviewUrl?.startsWith("blob:")) URL.revokeObjectURL(resultPreviewUrl);
    };
  }, [localPreviewUrl, resultPreviewUrl]);

  function workingImageInput(): { file: File | null; url: string | null } {
    if (sourceKind === "file" && sourceFile) return { file: sourceFile, url: null };
    if (sourceUrl) return { file: null, url: sourceUrl };
    return { file: null, url: null };
  }

  async function commitProcessedImage(pipelineUrl: string) {
    const rel = normalizeImageCanvasHandoffUrl(pipelineUrl);
    try {
      const blob = await fetchPreviewBlob(rel);
      const blobUrl = URL.createObjectURL(blob);
      setProcessedImageUrl(rel);
      setResultPreviewUrl((prev) => {
        if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
        return blobUrl;
      });
      setResultReloadKey((k) => k + 1);
    } catch {
      throw new Error(t.previewLoadFailed);
    }
  }

  function onFileSelected(file: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError(t.invalidImageType);
      return;
    }
    loadSource("file", { file });
  }

  async function applyInpaint(maskBlob: Blob, prompt: string, mode: "erase" | "fill" = "erase") {
    const frame = cleanFrames[cleanFrameIndex];
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      if (frame?.pipelineUrl) {
        fd.set("source_image_url", pipelineAbsoluteUrl(frame.pipelineUrl));
      } else if (sourceFile) {
        fd.set("image_file", sourceFile);
      } else if (sourceUrl) {
        fd.set("source_image_url", pipelineAbsoluteUrl(sourceUrl));
      } else {
        throw new Error(t.needImage);
      }
      fd.set("prompt", prompt);
      fd.set("inpaint_mode", mode);
      fd.set("mask_image", new File([maskBlob], "mask.png", { type: "image/png" }));
      if (mode === "fill") fd.set("brand_kit", JSON.stringify(brandKit));
      const res = await fetch("/api/inpaint-image", { method: "POST", credentials: "include", body: fd });
      const data = (await res.json()) as { imageUrl?: string; error?: string; mode?: string };
      if (!res.ok) throw new Error(data.error ?? w.quickFixInpaintNeedMask);

      const cleaned = normalizeImageCanvasHandoffUrl(data.imageUrl!);
      let blobUrl: string;
      try {
        const blob = await fetchPreviewBlob(cleaned);
        blobUrl = URL.createObjectURL(blob);
      } catch {
        throw new Error(t.previewLoadFailed);
      }
      setCleanFrames((prev) => {
        const trimmed = prev.slice(0, cleanFrameIndex + 1);
        return [...trimmed, { pipelineUrl: cleaned, displayUrl: blobUrl }];
      });
      setCleanFrameIndex((i) => i + 1);
      setInpaintEditorKey((k) => k + 1);
      setNote(data.mode === "erase" ? t.cleanApplyNote : t.cleanApplyNote);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : w.quickFixRefining);
    } finally {
      setBusy(false);
    }
  }

  function acceptCleanResult() {
    const frame = cleanFrames[cleanFrameIndex];
    if (frame?.pipelineUrl) {
      setSourceKind("url");
      setSourceFile(null);
      setSourceUrl(frame.pipelineUrl);
      setLocalPreviewUrl(frame.pipelineUrl);
    }
    setVisitedSteps((prev) => new Set([...prev, "design"]));
    setStep("design");
  }

  function recoverCleanFrame(index: number) {
    setCleanFrameIndex(index);
    setInpaintEditorKey((k) => k + 1);
  }

  function cleanFramePrev() {
    if (cleanFrameIndex <= 0) return;
    recoverCleanFrame(cleanFrameIndex - 1);
  }

  function cleanFrameNext() {
    if (cleanFrameIndex >= cleanFrames.length - 1) return;
    recoverCleanFrame(cleanFrameIndex + 1);
  }

  async function applyLayers(layers: ImageCanvasLayer[]) {
    const input = workingImageInput();
    if (!input.file && !input.url) {
      setError(t.needImage);
      return;
    }
    if (sourceKey) writeImageCanvasDraft(sourceKey, layers);
    setBusy(true);
    setError(null);
    try {
      const outUrl = await burnImageLayers({ ...input, layers });
      await commitProcessedImage(outUrl);
      setNote(t.appliedNote);
      setVisitedSteps((prev) => new Set([...prev, "export"]));
      setStep("export");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t.burnFailed);
    } finally {
      setBusy(false);
    }
  }

  function resetToSource() {
    setProcessedImageUrl(null);
    setResultPreviewUrl((prev) => {
      if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
      return null;
    });
    setResultReloadKey((k) => k + 1);
    setNote(null);
    setStep("design");
    if (sourceKind === "file" && sourceFile) {
      setLocalPreviewUrl((prev) => {
        if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
        return URL.createObjectURL(sourceFile);
      });
    } else if (sourceUrl) {
      setLocalPreviewUrl(sourceUrl);
    }
  }

  function isOnOriginalImage(): boolean {
    if (step === "clean") return cleanFrameIndex === 0;
    if (!originalSourceKind) return true;
    if (originalSourceKind === "file") {
      return sourceKind === "file" && sourceFile === originalSourceFile;
    }
    return sourceKind === "url" && sourceUrl === originalSourceUrl;
  }

  function recoverOriginalImage() {
    if (!originalSourceKind) return;
    setProcessedImageUrl(null);
    setResultPreviewUrl((prev) => {
      if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
      return null;
    });
    setResultReloadKey((k) => k + 1);
    setNote(null);
    setInpaintEditorKey((k) => k + 1);

    setCleanFrames((prev) => {
      revokeBlobUrls(prev.map((f) => f.displayUrl));
      return [];
    });

    if (originalSourceKind === "file" && originalSourceFile) {
      const blobUrl = URL.createObjectURL(originalSourceFile);
      setSourceKind("file");
      setSourceFile(originalSourceFile);
      setSourceUrl(null);
      setLocalPreviewUrl(blobUrl);
      setCleanFrames([{ pipelineUrl: null, displayUrl: blobUrl }]);
    } else if (originalSourceUrl) {
      setSourceKind("url");
      setSourceFile(null);
      setSourceUrl(originalSourceUrl);
      setLocalPreviewUrl(originalSourceUrl);
      setCleanFrames([{ pipelineUrl: originalSourceUrl, displayUrl: originalSourceUrl }]);
    }
    setCleanFrameIndex(0);
    setStep("clean");
  }

  function goToStep(target: EditStep) {
    if (target === "upload") {
      setStep("upload");
      return;
    }
    if (!hasWorkspace) return;
    const targetIdx = WORKFLOW_STEPS.indexOf(target);
    const currentIdx = WORKFLOW_STEPS.indexOf(step);
    if (target === "export" && !resultPreviewUrl && !visitedSteps.has("export")) return;
    if (targetIdx > currentIdx && !visitedSteps.has(target)) return;
    setStep(target);
  }

  useEffect(() => {
    setVisitedSteps((prev) => new Set([...prev, step]));
  }, [step]);

  const editorLabels = {
    hint: w.quickFixTextOverlayHint,
    dragHint: w.quickFixTextOverlayDragHint,
    textLayerLabel: w.quickFixTextLayerLabel,
    shapeLayerLabel: w.quickFixShapeLayerLabel,
    textPlaceholder: w.quickFixTextLayerPlaceholder,
    styleLabel: w.quickFixTextStyleLabel,
    colorLabel: w.quickFixColorLabel,
    fillColorLabel: w.quickFixFillColorLabel,
    strokeColorLabel: w.quickFixStrokeColorLabel,
    alignLabel: w.quickFixAlignLabel,
    alignLeft: w.quickFixAlignLeft,
    alignCenter: w.quickFixAlignCenter,
    alignRight: w.quickFixAlignRight,
    opacityLabel: w.quickFixOpacityLabel,
    strokeWidthLabel: w.quickFixStrokeWidthLabel,
    fontSizeLabel: w.quickFixFontSizeLabel,
    layersLabel: w.quickFixLayersLabel,
    marketingTitle: w.quickFixMarketingTitle,
    marketingHint: w.quickFixMarketingHint,
    shapeRect: w.quickFixShapeRect,
    shapeCapsule: w.quickFixShapeCapsule,
    shapeCircle: w.quickFixShapeCircle,
    shapeLine: w.quickFixShapeLine,
    shapeArrow: w.quickFixShapeArrow,
    shapeBadge: w.quickFixShapeBadge,
    shapeButton: w.quickFixShapeButton,
    shapeCheck: w.quickFixShapeCheck,
    marketingSlideNum: w.quickFixMarketingSlideNum,
    marketingTitleBlock: w.quickFixMarketingTitleBlock,
    marketingCapsule: w.quickFixMarketingCapsule,
    marketingBullet: w.quickFixMarketingBullet,
    marketingDivider: w.quickFixMarketingDivider,
    marketingCta: w.quickFixMarketingCta,
    addTextBtn: w.quickFixTextAddLayerBtn,
    addShapeBtn: w.quickFixAddShapeBtn,
    addLogoBtn: w.brandKit.addLogoToCanvas,
    removeLayerBtn: w.quickFixTextRemoveLayerBtn,
    applyBtn: t.applyBtn,
    applying: t.applying,
    needLayer: w.quickFixTextNeedLayer,
    canvasPrev: t.canvasPrev,
    canvasNext: t.canvasNext,
    recoverOriginal: t.recoverOriginal,
    canvasRecoverEdits: t.canvasRecoverEdits,
    canvasVersion: t.canvasVersion,
  };

  return (
    <div className="space-y-6">
      {!hasWorkspace ? (
        <div className="flex min-h-[min(56vh,520px)] items-center justify-center px-2 py-8">
          <section className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-950/70 p-8 text-center shadow-xl">
            <h2 className="text-xl font-semibold text-white">{t.uploadTitle}</h2>
            <p className="mx-auto mt-2 max-w-sm text-sm text-slate-400">{t.uploadHint}</p>
            <div className="mt-6 flex flex-col items-center gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="rounded-full bg-cyan-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-cyan-500"
              >
                {t.chooseFile}
              </button>
              <button
                type="button"
                onClick={() => setLibraryPickerOpen(true)}
                className="rounded-full border border-slate-600 px-6 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-900"
              >
                {t.chooseFromLibrary}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/*"
                className="hidden"
                onChange={(e) => onFileSelected(e.target.files?.[0] ?? null)}
              />
            </div>
            <p className="mt-6 text-xs text-slate-500">
              {t.studioHint}{" "}
              <Link href="/start" className="text-emerald-400 underline hover:text-emerald-300">
                {t.studioLink}
              </Link>
            </p>
          </section>
        </div>
      ) : (
        <>
          <nav className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-1">
                {WORKFLOW_STEPS.filter((s) => s !== "upload").map((s) => {
                  const stepIdx = WORKFLOW_STEPS.indexOf(s);
                  const currentIdx = WORKFLOW_STEPS.indexOf(step);
                  const reachable =
                    stepIdx <= currentIdx ||
                    visitedSteps.has(s) ||
                    (s === "design" && visitedSteps.has("clean"));
                  const disabledStep =
                    busy ||
                    !reachable ||
                    (s === "export" && !resultPreviewUrl && !visitedSteps.has("export"));
                  return (
                    <button
                      key={s}
                      type="button"
                      disabled={disabledStep}
                      onClick={() => goToStep(s)}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                        step === s
                          ? "bg-cyan-600 text-white"
                          : visitedSteps.has(s)
                            ? "border border-slate-600 text-slate-300 hover:border-cyan-600/50"
                            : "border border-slate-700 text-slate-500"
                      } disabled:cursor-not-allowed disabled:opacity-40`}
                    >
                      {stepLabels[s]}
                    </button>
                  );
                })}
              </div>
            </div>
            <p className="mt-2 text-[11px] text-slate-500">{t.workflowNote}</p>
          </nav>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs text-slate-400 underline underline-offset-2 hover:text-slate-300"
              >
                {t.changeImage}
              </button>
              <button
                type="button"
                onClick={() => setLibraryPickerOpen(true)}
                className="text-xs text-cyan-300 underline underline-offset-2 hover:text-cyan-200"
              >
                {t.chooseFromLibrary}
              </button>
            </div>
            <span className="text-xs text-slate-500">{sourceLabel}</span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/*"
              className="hidden"
              onChange={(e) => onFileSelected(e.target.files?.[0] ?? null)}
            />
          </div>

          {sourceUrl && isPipelineFileUrl(sourceUrl) && (
            <p className="text-xs text-emerald-300">{t.pipelineSourceNote}</p>
          )}

          {step === "clean" && (
            <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
              <p className="text-sm font-semibold text-slate-200">{t.cleanTitle}</p>
              <p className="mt-1 text-xs text-slate-400">{t.cleanHint}</p>
              <p className="mt-1 text-[10px] text-amber-300/90">{t.cleanCostNote}</p>
              <div className="mt-4">
                <ImageInpaintMaskEditor
                  key={`inpaint-${inpaintEditorKey}-${editorImageUrl}`}
                  imageUrl={editorImageUrl}
                  disabled={busy}
                  eraseMode
                  labels={{
                    hint: t.cleanHint,
                    brushLabel: w.quickFixInpaintBrush,
                    boxLabel: t.cleanBoxHint,
                    multiRegionHint: t.cleanMultiRegionHint,
                    regionCountLabel: t.cleanRegionCount,
                    removeRegionBtn: t.cleanRemoveRegion,
                    deleteSelectedBtn: t.cleanDeleteSelected,
                    undoBrushBtn: t.cleanUndoBrush,
                    maxRegions: t.cleanMaxRegions,
                    modeBrush: t.cleanModeBrush,
                    modeBox: t.cleanModeBox,
                    clearBtn: w.quickFixInpaintClear,
                    promptPlaceholder: t.cleanPromptPlaceholder,
                    applyBtn: w.quickFixInpaintApply,
                    applying: w.quickFixRefining,
                    needMask: w.quickFixInpaintNeedMask,
                    presetRemoveText: t.cleanPresetRemoveText,
                    presetRemoveLogo: t.cleanPresetRemoveLogo,
                    presetSeamless: t.cleanPresetSeamless,
                    eraseBtn: t.cleanEraseBtn,
                    fillBtn: t.cleanFillBtn,
                  }}
                  onApply={applyInpaint}
                  imageHistory={{
                    canPrev: cleanFrameIndex > 0,
                    canNext: cleanFrameIndex < cleanFrames.length - 1,
                    onPrev: cleanFramePrev,
                    onNext: cleanFrameNext,
                    prevLabel: t.canvasPrev,
                    nextLabel: t.canvasNext,
                    versionLabel: t.canvasVersion(cleanFrameIndex + 1, cleanFrames.length),
                    recoverLabel: t.recoverOriginal,
                    onRecover: recoverOriginalImage,
                    canRecover: cleanFrameIndex > 0 || cleanFrames.length > 1,
                  }}
                />
              </div>
              {cleanFrames.length > 1 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={acceptCleanResult}
                    className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white"
                  >
                    {t.cleanAcceptBtn}
                  </button>
                </div>
              )}
              <button
                type="button"
                disabled={busy}
                onClick={() => setStep("design")}
                className="mt-4 text-xs text-slate-400 underline hover:text-slate-300"
              >
                {t.stepSkipClean}
              </button>
            </div>
          )}

          {step === "design" && (
            <div className="grid gap-6 xl:grid-cols-[minmax(320px,1fr)_minmax(280px,360px)]">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                <p className="mb-3 text-sm font-semibold text-slate-200">{t.editorTitle}</p>
                <KonvaImageLayerEditor
                  key={`${sourceKey}-${initialLayers.length}`}
                  imageUrl={editorImageUrl}
                  disabled={busy}
                  brandKit={brandKit}
                  initialLayers={initialLayers}
                  labels={editorLabels}
                  onApply={applyLayers}
                />
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                <p className="text-sm font-semibold text-slate-200">{t.previewTitle}</p>
                <p className="mt-2 text-xs text-slate-400">{t.previewEmptyHint}</p>
                <p className="mt-4 text-xs text-slate-500">{t.reeditHint}</p>
              </div>
            </div>
          )}

          {step === "export" && (
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                <p className="text-sm font-semibold text-slate-200">{t.previewTitle}</p>
                {resultPreviewUrl ? (
                  <>
                    <img
                      key={resultReloadKey}
                      src={resultPreviewUrl}
                      alt=""
                      className="mt-3 w-full rounded-xl border border-slate-700 object-contain"
                    />
                    <p className="mt-2 text-xs text-emerald-300">{note ?? t.previewResultHint}</p>
                    <button
                      type="button"
                      disabled={downloadBusy || !processedImageUrl}
                      onClick={async () => {
                        if (!processedImageUrl) return;
                        setDownloadBusy(true);
                        try {
                          await downloadMediaUrl(processedImageUrl, "marketing-image.png");
                        } catch (e: unknown) {
                          setError(e instanceof Error ? e.message : t.downloadFailed);
                        } finally {
                          setDownloadBusy(false);
                        }
                      }}
                      className="mt-3 w-full rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      {downloadBusy ? t.downloading : t.downloadBtn}
                    </button>
                    <button
                      type="button"
                      onClick={() => setStep("design")}
                      className="mt-2 w-full rounded-xl border border-slate-600 py-2 text-xs text-slate-300"
                    >
                      {t.backToCanvas}
                    </button>
                  </>
                ) : (
                  <p className="mt-3 text-xs text-slate-400">{t.previewEmptyHint}</p>
                )}
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                <p className="text-xs text-slate-400">{t.workflowNote}</p>
                <button
                  type="button"
                  onClick={resetToSource}
                  className="mt-4 w-full rounded-xl border border-slate-600 py-2 text-xs text-slate-300"
                >
                  {t.showOriginal}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {error && (
        <p className="rounded-xl border border-red-900/50 bg-red-950/40 px-4 py-3 text-sm text-red-200">
          {error}
        </p>
      )}

      <LibraryAssetPicker
        open={libraryPickerOpen}
        kinds={["image"]}
        onClose={() => setLibraryPickerOpen(false)}
        onPick={(asset) => {
          setLibraryPickerOpen(false);
          loadSource("url", {
            url: asset.downloadUrl,
            label: asset.name?.trim() || t.sourceFromLibrary,
          });
          setStep("clean");
        }}
        labels={{
          title: t.libraryPickerTitle,
          loading: t.libraryPickerLoading,
          empty: t.libraryPickerEmpty,
          loadError: t.libraryPickerLoadError,
          cancel: t.libraryPickerCancel,
          useThis: t.libraryPickerUse,
          close: t.libraryPickerClose,
        }}
      />
    </div>
  );
}
