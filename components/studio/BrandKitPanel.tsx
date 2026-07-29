"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale } from "@/components/LocaleProvider";
import { PRODUCT_LOGO_SRC } from "@/lib/brand";
import {
  DEFAULT_BRAND_KIT,
  loadBrandKitFromStorage,
  saveBrandKitToStorage,
  type BrandKit,
} from "@/lib/brand-kit";

type BrandKitPanelProps = {
  disabled?: boolean;
  onChange?: (kit: BrandKit) => void;
  /** studio = emerald wizard; light = slate; landing = violet marketing chrome */
  variant?: "studio" | "light" | "landing";
};

export function BrandKitPanel({
  disabled,
  onChange,
  variant = "studio",
}: BrandKitPanelProps) {
  const { m } = useLocale();
  const w = m.wizard.brandKit;
  const [kit, setKit] = useState<BrandKit>(DEFAULT_BRAND_KIT);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const light = variant === "light" || variant === "landing";
  const landing = variant === "landing";

  useEffect(() => {
    const local = loadBrandKitFromStorage();
    setKit(local);
    onChange?.(local);
    void (async () => {
      try {
        const res = await fetch("/api/brand-kit", { credentials: "include" });
        const data = await res.json();
        if (data.kit) {
          setKit(data.kit);
          saveBrandKitToStorage(data.kit);
          onChange?.(data.kit);
        }
      } catch {
        /* local fallback */
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once
  }, []);

  function patch(next: Partial<BrandKit>) {
    const updated = { ...kit, ...next, updatedAt: new Date().toISOString() };
    setKit(updated);
    saveBrandKitToStorage(updated);
    onChange?.(updated);
  }

  async function persist() {
    setBusy(true);
    setNote(null);
    try {
      const res = await fetch("/api/brand-kit", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ kit }),
      });
      const data = await res.json();
      if (data.kit) {
        setKit(data.kit);
        saveBrandKitToStorage(data.kit);
        onChange?.(data.kit);
      }
      setNote(w.savedNote);
    } catch {
      setNote(w.localOnlyNote);
    } finally {
      setBusy(false);
    }
  }

  function onLogoFile(file: File | null) {
    if (!file?.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => patch({ logoUrl: String(reader.result) });
    reader.readAsDataURL(file);
  }

  const shell = landing
    ? "rounded-xl border border-violet-100/90 bg-white p-3.5 shadow-md shadow-violet-100/50 sm:p-4"
    : light
      ? "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
      : "rounded-xl border border-emerald-800/50 bg-emerald-950/20 p-4";
  const titleCls = landing
    ? "text-sm font-semibold tracking-tight text-slate-900"
    : light
      ? "text-sm font-semibold text-slate-900"
      : "text-sm font-semibold text-emerald-100";
  const hintCls = landing
    ? "mt-0.5 text-[11px] leading-snug text-slate-500"
    : light
      ? "mt-1 text-xs text-slate-600"
      : "mt-1 text-xs text-emerald-200/70";
  const labelCls = landing
    ? "text-[11px] font-medium text-slate-600"
    : light
      ? "text-xs text-slate-600"
      : "text-xs text-emerald-200/80";
  const btnSecondary = landing
    ? "rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-[11px] font-semibold text-violet-800 hover:bg-violet-100 disabled:opacity-40"
    : light
      ? "rounded-full border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-40"
      : "rounded border border-emerald-700 px-3 py-1.5 text-xs text-emerald-100 disabled:opacity-40";
  const logoPreview = landing
    ? "h-9 w-9 shrink-0 rounded-lg border border-violet-100 object-contain bg-violet-50/80 p-1"
    : light
      ? "h-12 w-12 rounded-lg border border-slate-200 object-contain bg-slate-50 p-1"
      : "h-10 w-10 rounded border border-emerald-800 object-contain bg-white/10 p-0.5";
  const colorInput = landing
    ? "mt-1 block h-7 w-full cursor-pointer overflow-hidden rounded-md border border-violet-100 bg-white"
    : light
      ? "mt-1 block h-9 w-full cursor-pointer rounded-lg border border-slate-200"
      : "mt-1 block h-9 w-full cursor-pointer rounded border border-emerald-800";
  const textInput = landing
    ? "mt-1 w-full rounded-lg border border-violet-100 bg-white px-2.5 py-1.5 text-[13px] text-slate-900 placeholder:text-slate-400 outline-none ring-violet-400/30 focus:ring-2"
    : light
      ? "mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
      : "mt-1 w-full rounded border border-emerald-800 bg-slate-950 px-2 py-1.5 text-sm text-white";
  const saveBtn = landing
    ? "mt-3 w-full rounded-full bg-violet-600 px-4 py-2 text-[13px] font-semibold text-white shadow-sm shadow-violet-600/20 hover:bg-violet-500 disabled:opacity-40"
    : light
      ? "mt-4 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-medium text-white disabled:opacity-40"
      : "mt-3 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40";
  const noteCls = landing
    ? "mt-1.5 text-center text-[11px] text-violet-700"
    : light
      ? "mt-2 text-xs text-slate-600"
      : "mt-2 text-xs text-emerald-300/90";
  const checkCls = landing
    ? "h-3.5 w-3.5 shrink-0 rounded border-violet-300 text-violet-600 focus:ring-violet-500"
    : "mt-0.5";

  const previewSrc = kit.logoUrl || (landing ? PRODUCT_LOGO_SRC : null);

  return (
    <div className={shell}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className={titleCls}>{w.title}</p>
          {!landing ? <p className={hintCls}>{w.hint}</p> : null}
        </div>
        {previewSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewSrc} alt="" className={logoPreview} />
        ) : null}
      </div>

      <div className={`flex flex-wrap items-center gap-2 ${landing ? "mt-2.5" : "mt-4"}`}>
        <input
          ref={logoInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            onLogoFile(e.target.files?.[0] ?? null);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          disabled={disabled}
          onClick={() => logoInputRef.current?.click()}
          className={btnSecondary}
        >
          {kit.logoUrl ? w.changeLogo : w.uploadLogo}
        </button>
        {!landing && kit.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={kit.logoUrl} alt="" className={logoPreview} />
        ) : null}
        {landing && kit.logoUrl ? (
          <label className={`inline-flex max-w-full cursor-pointer items-center gap-1.5 ${labelCls}`}>
            <input
              type="checkbox"
              disabled={disabled}
              checked={kit.useBrandLogo}
              onChange={(e) => patch({ useBrandLogo: e.target.checked })}
              className={checkCls}
            />
            <span className="truncate font-medium text-slate-700">{w.useLogoLabel}</span>
          </label>
        ) : null}
      </div>

      {!landing && kit.logoUrl ? (
        <label className={`mt-3 flex cursor-pointer items-start gap-2 ${labelCls}`}>
          <input
            type="checkbox"
            disabled={disabled}
            checked={kit.useBrandLogo}
            onChange={(e) => patch({ useBrandLogo: e.target.checked })}
            className={checkCls}
          />
          <span>
            <span className={`block font-semibold ${light ? "text-slate-800" : "text-emerald-50"}`}>
              {w.useLogoLabel}
            </span>
            <span className={hintCls}>{w.useLogoHint}</span>
          </span>
        </label>
      ) : null}

      <div className={`grid sm:grid-cols-3 ${landing ? "mt-2.5 gap-2" : "mt-4 gap-3"}`}>
        <label className={labelCls}>
          {w.primaryColor}
          <input
            type="color"
            disabled={disabled}
            value={kit.primaryColor}
            onChange={(e) => patch({ primaryColor: e.target.value })}
            className={colorInput}
          />
        </label>
        <label className={labelCls}>
          {w.secondaryColor}
          <input
            type="color"
            disabled={disabled}
            value={kit.secondaryColor}
            onChange={(e) => patch({ secondaryColor: e.target.value })}
            className={colorInput}
          />
        </label>
        <label className={labelCls}>
          {w.accentColor}
          <input
            type="color"
            disabled={disabled}
            value={kit.accentColor}
            onChange={(e) => patch({ accentColor: e.target.value })}
            className={colorInput}
          />
        </label>
      </div>

      <label className={`block ${landing ? "mt-2.5" : "mt-4"} ${labelCls}`}>
        {w.tagline}
        <input
          type="text"
          disabled={disabled}
          value={kit.tagline}
          onChange={(e) => patch({ tagline: e.target.value })}
          placeholder={w.taglinePlaceholder}
          className={textInput}
        />
      </label>

      <button
        type="button"
        disabled={disabled || busy}
        onClick={() => void persist()}
        className={saveBtn}
      >
        {busy ? w.saving : w.saveBtn}
      </button>
      {note ? <p className={noteCls}>{note}</p> : null}
    </div>
  );
}
