"use client";

import { useRef, useState } from "react";
import { useWizard } from "@/components/studio/WizardContext";
import type { LogoPlacement } from "@/lib/image-refine-prompt";

const LOGO_PLACEMENTS: LogoPlacement[] = [
  "bottom-right",
  "bottom-left",
  "top-right",
  "top-left",
  "center",
  "replace",
];

type QuickFixImagePanelProps = {
  variant?: "light" | "dark";
};

export function QuickFixImagePanel({ variant = "dark" }: QuickFixImagePanelProps) {
  const {
    campaignSlideLabel,
    campaignSlides,
    imageBusy,
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
    selectedVariantIndex,
    setQuickFixLogoPlacement,
  } = useWizard();
  const [customNote, setCustomNote] = useState("");
  const [logoNote, setLogoNote] = useState("");
  const logoInputRef = useRef<HTMLInputElement>(null);
  const logoSectionRef = useRef<HTMLDivElement>(null);

  const isDark = variant === "dark";
  const disabled = imageBusy;
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

  async function applyCustomFix() {
    const note = customNote.trim();
    if (!note || disabled) return;
    await refineGeneratedImage(note);
    setCustomNote("");
  }

  function focusLogoSection() {
    logoSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    logoInputRef.current?.click();
  }

  function onLogoFileChange(file: File | null) {
    if (!file || !file.type.startsWith("image/")) return;
    onQuickFixLogoSelected(file);
  }

  const editingSlide =
    isCampaignOutput && campaignSlides.length > 1
      ? campaignSlides[selectedVariantIndex]
      : null;

  return (
    <div className={panelClass}>
      <p className={titleClass}>{m.wizard.quickFixTitle}</p>
      <p className={hintClass}>{m.wizard.quickFixImageHint}</p>
      {editingSlide && (
        <p className={`mt-1 text-xs font-medium ${isDark ? "text-emerald-300" : "text-emerald-700"}`}>
          {m.wizard.quickFixEditingSlide.replace(
            "{label}",
            campaignSlideLabel(editingSlide.role, editingSlide.title),
          )}
        </p>
      )}
      <p className={creditClass}>
        {quickFixCredits > 0
          ? m.wizard.quickFixCreditReady.replace("{count}", String(quickFixCredits))
          : m.wizard.quickFixCreditUsed}
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <button
          type="button"
          disabled={disabled}
          onClick={() => quickFixImage("Improve skin and material realism only.")}
          className={presetClass}
        >
          {m.wizard.quickFixRealism}
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => quickFixImage("Remove all on-image text and logos.")}
          className={presetClass}
        >
          {m.wizard.quickFixText}
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => quickFixImage("Make the lighting warmer and softer.")}
          className={presetClass}
        >
          {m.wizard.quickFixLighting}
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={focusLogoSection}
          className={`${presetClass} border-emerald-600/60 text-emerald-200`}
        >
          {m.wizard.quickFixLogoTitle}
        </button>
      </div>

      <div ref={logoSectionRef} className={subPanelClass}>
        <p className={titleClass}>{m.wizard.quickFixLogoTitle}</p>
        <p className={hintClass}>{m.wizard.quickFixLogoHint}</p>
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
            {quickFixLogoFile ? m.wizard.quickFixLogoChangeBtn : m.wizard.quickFixLogoUploadBtn}
          </button>
          {quickFixLogoPreviewUrl && (
            <img
              src={quickFixLogoPreviewUrl}
              alt=""
              className="h-12 w-12 rounded-lg border border-slate-600 bg-white/10 object-contain p-1"
            />
          )}
        </div>
        <label className={`mt-4 block ${labelClass}`}>{m.wizard.quickFixLogoPlacementLabel}</label>
        <select
          value={quickFixLogoPlacement}
          disabled={disabled}
          onChange={(e) => setQuickFixLogoPlacement(e.target.value as LogoPlacement)}
          className={`mt-2 ${selectClass}`}
        >
          {LOGO_PLACEMENTS.map((placement) => (
            <option key={placement} value={placement}>
              {m.wizard.quickFixLogoPlacements[placement]}
            </option>
          ))}
        </select>
        <label className={`mt-4 block ${labelClass}`}>{m.wizard.quickFixLogoNoteLabel}</label>
        <input
          type="text"
          value={logoNote}
          disabled={disabled}
          onChange={(e) => setLogoNote(e.target.value)}
          placeholder={m.wizard.quickFixLogoNotePlaceholder}
          className={`mt-2 ${inputClass}`}
        />
        <button
          type="button"
          disabled={disabled || !quickFixLogoFile}
          onClick={() => void refineGeneratedImageWithLogo(logoNote)}
          className={`${applyClass} mt-4`}
        >
          {imageBusy ? m.wizard.quickFixRefining : m.wizard.quickFixLogoApplyBtn}
        </button>
      </div>

      <label className={`mt-4 block ${labelClass}`}>{m.wizard.quickFixCustomLabel}</label>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          value={customNote}
          onChange={(e) => setCustomNote(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void applyCustomFix();
          }}
          placeholder={m.wizard.quickFixCustomPlaceholder}
          className={inputClass}
        />
        <button
          type="button"
          disabled={disabled || !customNote.trim()}
          onClick={() => void applyCustomFix()}
          className={`${applyClass} shrink-0`}
        >
          {imageBusy ? m.wizard.quickFixRefining : m.wizard.quickFixApplyBtn}
        </button>
      </div>
    </div>
  );
}
