"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useLocale } from "@/components/LocaleProvider";
import { DEFAULT_BRAND_KIT, hydrateBrandKitFromCloud, loadBrandKitFromStorage } from "@/lib/brand-kit";
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

/** Strip query so burn/inpaint APIs get a stable library id path. */
function libraryPipelineUrl(url: string): string {
  if (!isLibraryAssetUrl(url)) return url;
  return url.split("?")[0] ?? url;
}

/**
 * Same-origin preview URL — library assets need inline=1 to stream bytes (not 302 to R2).
 * Konva/HTMLImage with crossOrigin=anonymous does not send cookies, so auth-gated
 * `/api/...` URLs must be fetched with credentials and shown as blob: URLs.
 */
function previewFetchUrl(url: string): string {
  let next = withCacheBust(url);
  if (isLibraryAssetUrl(next) && !next.includes("inline=1")) {
    next += `${next.includes("?") ? "&" : "?"}inline=1`;
  }
  return next;
}

function needsCredentialedPreview(url: string): boolean {
  const path = url.startsWith("http")
    ? (() => {
        try {
          return new URL(url).pathname;
        } catch {
          return url;
        }
      })()
    : url.split("?")[0] ?? url;
  return (
    isLibraryAssetUrl(url) ||
    isPipelineFileUrl(url) ||
    path.startsWith("/api/library/download/") ||
    path.startsWith("/api/pipeline-files/")
  );
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
  const [brandKit, setBrandKit] = useState(() =>
    typeof window !== "undefined" ? loadBrandKitFromStorage() : DEFAULT_BRAND_KIT,
  );
  const [libraryPickerOpen, setLibraryPickerOpen] = useState(false);
  const [returnTo, setReturnTo] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewLoadGenRef = useRef(0);
  const localPreviewUrlRef = useRef<string | null>(null);
  const resultPreviewUrlRef = useRef<string | null>(null);
  const bootstrappedFromQueryRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void hydrateBrandKitFromCloud().then((kit) => {
      if (!cancelled) setBrandKit(kit);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    localPreviewUrlRef.current = localPreviewUrl;
  }, [localPreviewUrl]);
  useEffect(() => {
    resultPreviewUrlRef.current = resultPreviewUrl;
  }, [resultPreviewUrl]);

  const sourceKey = sourceFile
    ? `file:${sourceFile.name}:${sourceFile.size}`
    : sourceUrl
      ? `url:${sourceUrl}`
      : "";

  const editorImageUrl =
    step === "clean" && cleanFrames[cleanFrameIndex]
      ? cleanFrames[cleanFrameIndex]!.displayUrl
      : (localPreviewUrl ?? "");
  // Keep workspace visible while credentialed library/pipeline previews hydrate into blob URLs.
  const hasWorkspace = Boolean(sourceKind && (localPreviewUrl || busy || sourceUrl || sourceFile));

  const stepLabels: Record<EditStep, string> = {
    upload: t.stepUpload,
    clean: t.stepClean,
    design: t.stepDesign,
    export: t.stepExport,
  };

  const loadSource = useCallback(
    (kind: SourceKind, opts: { file?: File; url?: string; label?: string; layers?: ImageCanvasLayer[] }) => {
      const prevLocal = localPreviewUrlRef.current;
      const prevResult = resultPreviewUrlRef.current;
      if (prevLocal?.startsWith("blob:")) URL.revokeObjectURL(prevLocal);
      if (prevResult?.startsWith("blob:")) URL.revokeObjectURL(prevResult);
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
        setOriginalSourceUrl(libraryPipelineUrl(normalizeImageCanvasHandoffUrl(opts.url)));
      }

      if (kind === "file" && opts.file) {
        previewLoadGenRef.current += 1;
        const blobUrl = URL.createObjectURL(opts.file);
        setSourceFile(opts.file);
        setSourceUrl(null);
        setSourceLabel(opts.label ?? opts.file.name);
        setLocalPreviewUrl(blobUrl);
        setCleanFrames([{ pipelineUrl: null, displayUrl: blobUrl }]);
        setCleanFrameIndex(0);
      } else if (kind === "url" && opts.url) {
        setSourceFile(null);
        const rel = libraryPipelineUrl(normalizeImageCanvasHandoffUrl(opts.url));
        setSourceUrl(rel);
        setSourceLabel(opts.label ?? t.sourceFromStudio);
        setCleanFrameIndex(0);

        if (needsCredentialedPreview(rel)) {
          const gen = ++previewLoadGenRef.current;
          setLocalPreviewUrl(null);
          setCleanFrames([]);
          setBusy(true);
          void (async () => {
            try {
              const blob = await fetchPreviewBlob(rel);
              if (gen !== previewLoadGenRef.current) return;
              const blobUrl = URL.createObjectURL(blob);
              setLocalPreviewUrl(blobUrl);
              setCleanFrames([{ pipelineUrl: rel, displayUrl: blobUrl }]);
              setError(null);
            } catch (e: unknown) {
              if (gen !== previewLoadGenRef.current) return;
              const detail = e instanceof Error ? e.message : "";
              setError(detail ? `${t.sourcePreviewFailed} (${detail})` : t.sourcePreviewFailed);
              setLocalPreviewUrl(null);
              setCleanFrames([]);
            } finally {
              if (gen === previewLoadGenRef.current) setBusy(false);
            }
          })();
        } else {
          previewLoadGenRef.current += 1;
          setLocalPreviewUrl(rel);
          setCleanFrames([{ pipelineUrl: rel, displayUrl: rel }]);
        }
      }

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
    [brandKit, t.sourcePreviewFailed, t.sourceFromStudio],
  );

  useEffect(() => {
    const handoff = readImageCanvasHandoff();
    const imageParam = searchParams.get("image")?.trim();
    const returnParam = searchParams.get("returnTo")?.trim();
    const url = handoff?.imageUrl ?? imageParam ?? null;
    const nextReturn = handoff?.returnTo?.trim() || returnParam || null;
    if (nextReturn) setReturnTo(nextReturn);

    if (!url) return;
    // Bootstrap once per distinct URL. Do not re-run just because loadSource changed —
    // that cancelled in-flight library blob fetches and left a blank canvas.
    const bootKey = libraryPipelineUrl(normalizeImageCanvasHandoffUrl(url));
    if (bootstrappedFromQueryRef.current === bootKey) return;
    bootstrappedFromQueryRef.current = bootKey;
    loadSource("url", {
      url,
      label: handoff?.label,
      layers: handoff?.initialLayers,
    });
    clearImageCanvasHandoff();
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
    const pageY = window.scrollY;
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
      setNote(data.mode === "erase" ? t.cleanApplyNote : t.cleanFillNote);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : w.quickFixRefining);
    } finally {
      setBusy(false);
      requestAnimationFrame(() => {
        window.scrollTo({ top: pageY, left: window.scrollX });
      });
    }
  }

  function acceptCleanResult() {
    const frame = cleanFrames[cleanFrameIndex];
    if (frame?.pipelineUrl) {
      setSourceKind("url");
      setSourceFile(null);
      setSourceUrl(frame.pipelineUrl);
      // Prefer blob displayUrl — Konva cannot load auth-gated /api URLs with crossOrigin=anonymous.
      setLocalPreviewUrl(frame.displayUrl || frame.pipelineUrl);
    } else if (frame?.displayUrl) {
      setLocalPreviewUrl(frame.displayUrl);
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
      if (needsCredentialedPreview(sourceUrl)) {
        const gen = ++previewLoadGenRef.current;
        setBusy(true);
        void (async () => {
          try {
            const blob = await fetchPreviewBlob(sourceUrl);
            if (gen !== previewLoadGenRef.current) return;
            setLocalPreviewUrl((prev) => {
              if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
              return URL.createObjectURL(blob);
            });
          } catch {
            if (gen !== previewLoadGenRef.current) return;
            setError(t.sourcePreviewFailed);
          } finally {
            if (gen === previewLoadGenRef.current) setBusy(false);
          }
        })();
      } else {
        setLocalPreviewUrl(sourceUrl);
      }
    }
  }

  function retryPreviewLoad() {
    if (!sourceUrl) return;
    const rel = libraryPipelineUrl(sourceUrl);
    if (!needsCredentialedPreview(rel)) {
      setCleanFrames((prev) => {
        revokeBlobUrls(prev.map((f) => f.displayUrl));
        return [{ pipelineUrl: rel, displayUrl: rel }];
      });
      setLocalPreviewUrl((prev) => {
        if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
        return rel;
      });
      setError(null);
      return;
    }
    const gen = ++previewLoadGenRef.current;
    setBusy(true);
    setError(null);
    void (async () => {
      try {
        const blob = await fetchPreviewBlob(rel);
        if (gen !== previewLoadGenRef.current) return;
        const blobUrl = URL.createObjectURL(blob);
        setCleanFrames((prev) => {
          revokeBlobUrls(prev.map((f) => f.displayUrl));
          return [{ pipelineUrl: rel, displayUrl: blobUrl }];
        });
        setLocalPreviewUrl((prev) => {
          if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
          return blobUrl;
        });
        setError(null);
      } catch (e: unknown) {
        if (gen !== previewLoadGenRef.current) return;
        const detail = e instanceof Error ? e.message : "";
        setError(detail ? `${t.sourcePreviewFailed} (${detail})` : t.sourcePreviewFailed);
      } finally {
        if (gen === previewLoadGenRef.current) setBusy(false);
      }
    })();
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
      const rel = libraryPipelineUrl(originalSourceUrl);
      setSourceKind("url");
      setSourceFile(null);
      setSourceUrl(rel);
      if (needsCredentialedPreview(rel)) {
        const gen = ++previewLoadGenRef.current;
        setLocalPreviewUrl(null);
        setCleanFrames([]);
        setBusy(true);
        void (async () => {
          try {
            const blob = await fetchPreviewBlob(rel);
            if (gen !== previewLoadGenRef.current) return;
            const blobUrl = URL.createObjectURL(blob);
            setLocalPreviewUrl(blobUrl);
            setCleanFrames([{ pipelineUrl: rel, displayUrl: blobUrl }]);
          } catch {
            if (gen !== previewLoadGenRef.current) return;
            setError(t.sourcePreviewFailed);
          } finally {
            if (gen === previewLoadGenRef.current) setBusy(false);
          }
        })();
      } else {
        previewLoadGenRef.current += 1;
        setLocalPreviewUrl(rel);
        setCleanFrames([{ pipelineUrl: rel, displayUrl: rel }]);
      }
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
    duplicateLayerBtn: w.quickFixDuplicateLayerBtn,
    bringForwardBtn: w.quickFixBringForwardBtn,
    sendBackwardBtn: w.quickFixSendBackwardBtn,
    noLogoHint: w.quickFixNoLogoHint,
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
      {(returnTo || hasWorkspace) && (
        <div className="flex flex-wrap items-center justify-center gap-3 rounded-2xl border border-violet-500/20 bg-slate-950/50 px-4 py-3 text-xs">
          {returnTo?.includes("/studio") ? (
            <Link
              href={returnTo}
              className="rounded-full bg-violet-600 px-4 py-2 font-medium text-white hover:bg-violet-500"
            >
              {t.backToResults}
            </Link>
          ) : null}
          {returnTo?.includes("/library") ? (
            <Link
              href="/library"
              className="rounded-full bg-violet-600 px-4 py-2 font-medium text-white hover:bg-violet-500"
            >
              {t.backToLibrary}
            </Link>
          ) : null}
          {!returnTo?.includes("/library") ? (
            <Link
              href="/library"
              className="rounded-full border border-slate-600 px-4 py-2 font-medium text-slate-200 hover:bg-slate-900"
            >
              {t.backToLibrary}
            </Link>
          ) : null}
          <button
            type="button"
            onClick={() => setLibraryPickerOpen(true)}
            className="rounded-full border border-violet-600/60 px-4 py-2 font-medium text-violet-100 hover:bg-violet-950/40"
          >
            {t.editAnotherFromLibrary}
          </button>
        </div>
      )}

      {!hasWorkspace ? (
        <div className="flex min-h-[min(52vh,480px)] items-center justify-center px-2 py-6">
          <section className="w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-950/70 p-7 text-center shadow-xl sm:p-8">
            <h2 className="text-xl font-semibold text-white">{t.uploadTitle}</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">{t.uploadHint}</p>
            <div className="mx-auto mt-6 grid w-full max-w-sm gap-3 sm:max-w-none sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setLibraryPickerOpen(true)}
                className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-violet-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-violet-500"
              >
                {t.chooseFromLibrary}
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-slate-600 px-5 py-2.5 text-sm font-medium text-slate-100 hover:border-violet-400 hover:bg-violet-950/40"
              >
                {t.chooseFile}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/*"
                className="hidden"
                onChange={(e) => onFileSelected(e.target.files?.[0] ?? null)}
              />
            </div>
            <p className="mt-4 text-[11px] leading-relaxed text-slate-500">{t.workflowNote}</p>
          </section>
        </div>
      ) : (
        <>
          <nav className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-1">
                {WORKFLOW_STEPS.map((s) => {
                  const stepIdx = WORKFLOW_STEPS.indexOf(s);
                  const currentIdx = WORKFLOW_STEPS.indexOf(step);
                  const reachable =
                    s === "upload" ||
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
                          ? "bg-violet-600 text-white"
                          : visitedSteps.has(s)
                            ? "border border-slate-600 text-slate-300 hover:border-violet-500/50"
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
                className="text-xs text-violet-300 underline underline-offset-2 hover:text-violet-200"
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

          {step === "upload" && (
            <section className="rounded-2xl border border-slate-800 bg-slate-950/50 p-5 text-center sm:p-6">
              <h2 className="text-lg font-semibold text-white">{t.uploadTitle}</h2>
              <p className="mx-auto mt-1.5 max-w-md text-sm text-slate-400">{t.uploadHint}</p>
              <div className="mx-auto mt-5 grid w-full max-w-sm gap-3 sm:max-w-md sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setLibraryPickerOpen(true)}
                  className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-violet-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-violet-500"
                >
                  {t.chooseFromLibrary}
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-slate-600 px-5 py-2.5 text-sm font-medium text-slate-100 hover:border-violet-400 hover:bg-violet-950/40"
                >
                  {t.changeImage}
                </button>
              </div>
              {sourceLabel ? (
                <p className="mt-3 text-xs text-slate-500">{sourceLabel}</p>
              ) : null}
              <button
                type="button"
                disabled={busy || !editorImageUrl}
                onClick={() => setStep("clean")}
                className="mt-5 rounded-full border border-emerald-500/40 px-5 py-2 text-xs font-medium text-emerald-300 hover:bg-emerald-950/40 disabled:opacity-40"
              >
                {t.stepNext}
              </button>
            </section>
          )}

          {step === "clean" && (
            <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
              <p className="text-sm font-semibold text-slate-200">{t.cleanTitle}</p>
              <p className="mt-1 text-xs text-slate-400">{t.cleanHint}</p>
              <p className="mt-1 text-[10px] text-amber-300/90">{t.cleanCostNote}</p>
              <div className="mt-4">
                {busy && !editorImageUrl ? (
                  <p className="rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-16 text-center text-sm text-slate-400">
                    {t.previewLoading}
                  </p>
                ) : !editorImageUrl ? (
                  <div className="rounded-xl border border-amber-800/50 bg-amber-950/30 px-4 py-10 text-center">
                    <p className="text-sm text-amber-100">{error ?? t.sourcePreviewFailed}</p>
                    {sourceUrl ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => retryPreviewLoad()}
                        className="mt-4 rounded-full bg-violet-600 px-5 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-40"
                      >
                        {t.retryPreview}
                      </button>
                    ) : null}
                  </div>
                ) : (
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
                    brushSizeLabel: t.cleanBrushSize,
                    aiStepsHint: t.cleanAiStepsHint,
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
                    versionLabel: t.canvasVersion(
                      Math.min(cleanFrameIndex + 1, Math.max(cleanFrames.length, 1)),
                      cleanFrames.length,
                    ),
                    recoverLabel: t.recoverOriginal,
                    onRecover: recoverOriginalImage,
                    canRecover: cleanFrameIndex > 0 || cleanFrames.length > 1,
                  }}
                />
                )}
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
              {note ? (
                <p className="mt-3 text-xs text-emerald-300">{note}</p>
              ) : null}
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

      <p className="text-center text-xs text-slate-500">
        {t.reeditHint}{" "}
        <Link href="/start" className="text-emerald-400 underline underline-offset-2">
          {t.studioLink}
        </Link>
        {" · "}
        <Link href="/" className="text-slate-400 underline underline-offset-2 hover:text-slate-300">
          {m.header.homeLink}
        </Link>
      </p>

      <LibraryAssetPicker
        open={libraryPickerOpen}
        kinds={["image"]}
        onClose={() => setLibraryPickerOpen(false)}
        onPick={(asset) => {
          setLibraryPickerOpen(false);
          setReturnTo((prev) => prev ?? "/library");
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
