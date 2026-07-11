"use client";

import { useRef, useState } from "react";
import { useWizard } from "@/components/studio/WizardContext";
import dynamic from "next/dynamic";
import { ImageRegionFixEditor } from "@/components/studio/ImageRegionFixEditor";
import type { LogoPlacement } from "@/lib/image-refine-prompt";
import type { ImageEditRegion } from "@/lib/image-edit-region";
import { regionsInpaintPrompt } from "@/lib/regions-to-inpaint-mask";

const ImageInpaintMaskEditor = dynamic(
  () => import("@/components/studio/ImageInpaintMaskEditor").then((m) => m.ImageInpaintMaskEditor),
  { ssr: false, loading: () => <p className="text-xs text-slate-400">Loading mask editor…</p> },
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

const LOGO_PLACEMENTS: LogoPlacement[] = [
  "bottom-right",
  "bottom-left",
  "top-right",
  "top-left",
  "center",
  "replace",
];

type FixTab = "presets" | "regions" | "text" | "inpaint";

type QuickFixImagePanelProps = {
  variant?: "light" | "dark";
};

export function QuickFixImagePanel({ variant = "dark" }: QuickFixImagePanelProps) {
  const {
    applyImageCanvasOverlay,
    brandKit,
    campaignSlideLabel,
    campaignSlides,
    imageBusy,
    imageGenKey,
    imagePreOverlayUrl,
    imageTextOverlaySeedLayers,
    imageUrl,
    inpaintFromRegions,
    inpaintGeneratedImage,
    isCampaignOutput,
    m,
    onQuickFixLogoSelected,
    quickFixCredits,
    quickFixImage,
    quickFixLogoFile,
    quickFixLogoPlacement,
    quickFixLogoPreviewUrl,
    refineGeneratedImage,
    refineGeneratedImageWithLogo,
    refineGeneratedImageWithRegions,
    restoreImageBeforeTextOverlay,
    selectedVariantIndex,
    setQuickFixLogoPlacement,
    stripImageTextForOverlay,
  } = useWizard();

  const [tab, setTab] = useState<FixTab>("presets");
  const [customNote, setCustomNote] = useState("");
  const [logoNote, setLogoNote] = useState("");
  const [inpaintSeedRegions, setInpaintSeedRegions] = useState<ImageEditRegion[] | null>(null);
  const [inpaintSeedPrompt, setInpaintSeedPrompt] = useState("");
  const [textEditorReady, setTextEditorReady] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const logoSectionRef = useRef<HTMLDivElement>(null);

  const w = m.wizard;
  const isDark = variant === "dark";
  const disabled = imageBusy;
  const previewUrl =
    imageUrl && imageUrl.startsWith("http")
      ? `${imageUrl}${imageUrl.includes("?") ? "&" : "?"}v=${imageGenKey}`
      : null;

  const presetClass = isDark
    ? "rounded-lg border border-slate-600 px-3 py-2 text-xs text-slate-200 disabled:opacity-40"
    : "rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700 disabled:opacity-40";
  const inputClass = isDark
    ? "w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-500"
    : "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400";
  const selectClass = isDark
    ? "w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white"
    : "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900";
  const applyClass = isDark
    ? "rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
    : "rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40";
  const panelClass = isDark
    ? "rounded-xl border border-slate-700 bg-slate-900/40 p-4"
    : "rounded-xl border border-emerald-200 bg-emerald-50/60 p-4";
  const subPanelClass = isDark
    ? "mt-4 rounded-xl border border-slate-600 bg-slate-950/40 p-4"
    : "mt-4 rounded-xl border border-slate-200 bg-white/80 p-4";
  const titleClass = isDark ? "text-sm font-semibold text-white" : "text-sm font-semibold text-slate-900";
  const hintClass = isDark ? "mt-1 text-xs text-slate-400" : "mt-1 text-xs text-slate-600";
  const creditClass = isDark ? "mt-1 text-xs text-slate-500" : "mt-1 text-xs text-slate-500";
  const labelClass = isDark ? "text-xs font-medium text-slate-300" : "text-xs font-medium text-slate-700";
  const tabClass = (active: boolean) =>
    isDark
      ? `rounded-lg px-3 py-2 text-xs font-medium ${active ? "bg-emerald-600 text-white" : "border border-slate-600 text-slate-300"}`
      : `rounded-lg px-3 py-2 text-xs font-medium ${active ? "bg-emerald-600 text-white" : "border border-slate-300 text-slate-700"}`;

  async function applyCustomFix() {
    const note = customNote.trim();
    if (!note || disabled) return;
    await refineGeneratedImage(note);
    setCustomNote("");
  }

  function focusLogoSection() {
    setTab("presets");
    logoSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    logoInputRef.current?.click();
  }

  function onLogoFileChange(file: File | null) {
    if (!file || !file.type.startsWith("image/")) return;
    onQuickFixLogoSelected(file);
  }

  async function prepareTextEditor() {
    await stripImageTextForOverlay();
    setTextEditorReady(true);
  }

  const editingSlide =
    isCampaignOutput && campaignSlides.length > 1
      ? campaignSlides[selectedVariantIndex]
      : null;

  if (!previewUrl) return null;

  return (
    <div className={panelClass}>
      <p className={titleClass}>{w.quickFixTitle}</p>
      {editingSlide && (
        <p className={`mt-1 text-xs font-medium ${isDark ? "text-emerald-300" : "text-emerald-700"}`}>
          {w.quickFixEditingSlide.replace(
            "{label}",
            campaignSlideLabel(editingSlide.role, editingSlide.title),
          )}
        </p>
      )}
      <p className={creditClass}>
        {quickFixCredits > 0 ? w.quickFixCreditReady : w.quickFixCreditUsed}
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className={tabClass(tab === "presets")} onClick={() => setTab("presets")}>
          {w.quickFixTabPresets}
        </button>
        <button type="button" className={tabClass(tab === "regions")} onClick={() => setTab("regions")}>
          {w.quickFixTabRegions}
        </button>
        <button type="button" className={tabClass(tab === "text")} onClick={() => setTab("text")}>
          {w.quickFixTabTextEditor}
        </button>
        <button type="button" className={tabClass(tab === "inpaint")} onClick={() => setTab("inpaint")}>
          {w.quickFixTabInpaint}
        </button>
      </div>

      {tab === "presets" && (
        <>
          <p className={`${hintClass} mt-3`}>{w.quickFixImageHint}</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <button
              type="button"
              disabled={disabled}
              onClick={() => quickFixImage("Improve skin and material realism only.")}
              className={presetClass}
            >
              {w.quickFixRealism}
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => quickFixImage("Remove all on-image text and logos.")}
              className={presetClass}
            >
              {w.quickFixText}
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => quickFixImage("Make the lighting warmer and softer.")}
              className={presetClass}
            >
              {w.quickFixLighting}
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={focusLogoSection}
              className={`${presetClass} border-emerald-600/60 text-emerald-200`}
            >
              {w.quickFixLogoTitle}
            </button>
          </div>

          <div ref={logoSectionRef} className={subPanelClass}>
            <p className={titleClass}>{w.quickFixLogoTitle}</p>
            <p className={hintClass}>{w.quickFixLogoHint}</p>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                onLogoFileChange(file);
                e.target.value = "";
              }}
            />
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={disabled}
                onClick={() => logoInputRef.current?.click()}
                className={presetClass}
              >
                {quickFixLogoFile ? w.quickFixLogoChangeBtn : w.quickFixLogoUploadBtn}
              </button>
              {quickFixLogoPreviewUrl && (
                <img
                  src={quickFixLogoPreviewUrl}
                  alt=""
                  className="h-12 w-12 rounded-lg border border-slate-600 bg-white/10 object-contain p-1"
                />
              )}
            </div>
            <label className={`mt-4 block ${labelClass}`}>{w.quickFixLogoPlacementLabel}</label>
            <select
              value={quickFixLogoPlacement}
              disabled={disabled}
              onChange={(e) => setQuickFixLogoPlacement(e.target.value as LogoPlacement)}
              className={`mt-2 ${selectClass}`}
            >
              {LOGO_PLACEMENTS.map((placement) => (
                <option key={placement} value={placement}>
                  {w.quickFixLogoPlacements[placement]}
                </option>
              ))}
            </select>
            <label className={`mt-4 block ${labelClass}`}>{w.quickFixLogoNoteLabel}</label>
            <input
              type="text"
              value={logoNote}
              disabled={disabled}
              onChange={(e) => setLogoNote(e.target.value)}
              placeholder={w.quickFixLogoNotePlaceholder}
              className={`mt-2 ${inputClass}`}
            />
            <button
              type="button"
              disabled={disabled || !quickFixLogoFile}
              onClick={() => void refineGeneratedImageWithLogo(logoNote)}
              className={`${applyClass} mt-4`}
            >
              {imageBusy ? w.quickFixRefining : w.quickFixLogoApplyBtn}
            </button>
          </div>

          <label className={`mt-4 block ${labelClass}`}>{w.quickFixCustomLabel}</label>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void applyCustomFix();
              }}
              placeholder={w.quickFixCustomPlaceholder}
              className={inputClass}
            />
            <button
              type="button"
              disabled={disabled || !customNote.trim()}
              onClick={() => void applyCustomFix()}
              className={`${applyClass} shrink-0`}
            >
              {imageBusy ? w.quickFixRefining : w.quickFixApplyBtn}
            </button>
          </div>
        </>
      )}

      {tab === "regions" && (
        <div className="mt-3">
          <ImageRegionFixEditor
            imageUrl={previewUrl}
            disabled={disabled}
            labels={{
              hint: w.quickFixRegionHint,
              drawHint: w.quickFixRegionDrawHint,
              zoneLabel: w.quickFixRegionZoneLabel,
              instructionPlaceholder: w.quickFixRegionInstructionPlaceholder,
              addZoneBtn: w.quickFixRegionAddZoneBtn,
              removeZoneBtn: w.quickFixRegionRemoveZoneBtn,
              applyBtn: w.quickFixRegionApplyBtn,
              applying: w.quickFixRefining,
              needZone: w.quickFixRegionNeedZone,
              maxZones: w.quickFixRegionMaxZones,
              inpaintBtn: w.quickFixRegionInpaintBtn,
              inpaintDirectBtn: w.quickFixRegionInpaintDirectBtn,
            }}
            onApply={refineGeneratedImageWithRegions}
            onConvertToInpaint={(regions) => {
              setInpaintSeedRegions(regions);
              setInpaintSeedPrompt(regionsInpaintPrompt(regions));
              setTab("inpaint");
            }}
            onInpaintDirect={inpaintFromRegions}
          />
        </div>
      )}

      {tab === "text" && (
        <div className="mt-3 space-y-4">
          <p className={hintClass}>{w.quickFixTextEditorHint}</p>
          {!textEditorReady && (
            <button
              type="button"
              disabled={disabled}
              onClick={() => void prepareTextEditor()}
              className={`${applyClass} w-full`}
            >
              {imageBusy ? w.quickFixRefining : w.quickFixStripTextBtn}
            </button>
          )}
          {(textEditorReady || imagePreOverlayUrl) && previewUrl && (
            <KonvaImageLayerEditor
              imageUrl={previewUrl}
              disabled={disabled}
              brandKit={brandKit}
              initialLayers={imageTextOverlaySeedLayers()}
              labels={{
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
                applyBtn: w.quickFixTextApplyBtn,
                applying: w.quickFixRefining,
                needLayer: w.quickFixTextNeedLayer,
                restoreBtn: w.quickFixTextRestoreBtn,
              }}
              onApply={applyImageCanvasOverlay}
              onRestore={imagePreOverlayUrl ? restoreImageBeforeTextOverlay : undefined}
            />
          )}
        </div>
      )}

      {tab === "inpaint" && previewUrl && (
        <div className="mt-3">
          <ImageInpaintMaskEditor
            imageUrl={previewUrl}
            disabled={disabled}
            initialRegions={inpaintSeedRegions}
            initialPrompt={inpaintSeedPrompt}
            labels={{
              hint: w.quickFixInpaintHint,
              brushLabel: w.quickFixInpaintBrush,
              clearBtn: w.quickFixInpaintClear,
              promptPlaceholder: w.quickFixInpaintPrompt,
              applyBtn: w.quickFixInpaintApply,
              applying: w.quickFixRefining,
              needMask: w.quickFixInpaintNeedMask,
            }}
            onApply={inpaintGeneratedImage}
          />
        </div>
      )}
    </div>
  );
}
