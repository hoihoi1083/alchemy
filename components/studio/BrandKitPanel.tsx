"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale } from "@/components/LocaleProvider";
import { PRODUCT_LOGO_SRC } from "@/lib/brand";
import {
  DEFAULT_BRAND_KIT,
  hydrateBrandKitFromCloud,
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

/** Compress oversized logos so unsigned/local-only fallbacks fit in localStorage. */
async function fileToCompressedDataUrl(file: File, maxSide = 512): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("Could not read logo file."));
      reader.readAsDataURL(file);
    });
  }
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  // Prefer PNG to keep transparency for stamps.
  return canvas.toDataURL("image/png");
}

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
  const kitRef = useRef(kit);
  kitRef.current = kit;
  const light = variant === "light" || variant === "landing";
  const landing = variant === "landing";

  useEffect(() => {
    const local = loadBrandKitFromStorage();
    setKit(local);
    onChange?.(local);
    void hydrateBrandKitFromCloud(local).then((merged) => {
      setKit(merged);
      onChange?.(merged);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once
  }, []);

  function applyKit(updated: BrandKit) {
    setKit(updated);
    saveBrandKitToStorage(updated);
    onChange?.(updated);
  }

  function patch(next: Partial<BrandKit>) {
    applyKit({ ...kitRef.current, ...next, updatedAt: new Date().toISOString() });
  }

  async function persist() {
    setBusy(true);
    setNote(null);
    try {
      const res = await fetch("/api/brand-kit", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ kit: kitRef.current }),
      });
      const data = (await res.json()) as { kit?: BrandKit; error?: string };
      if (!res.ok) {
        setNote(typeof data.error === "string" ? data.error : w.localOnlyNote);
        return;
      }
      if (data.kit) {
        applyKit(data.kit);
      }
      setNote(w.savedNote);
    } catch {
      setNote(w.localOnlyNote);
    } finally {
      setBusy(false);
    }
  }

  async function onLogoFile(file: File | null) {
    if (!file?.type.startsWith("image/")) return;
    setBusy(true);
    setNote(null);
    try {
      const fd = new FormData();
      fd.set("file", file);
      fd.set("kind", "image");
      const res = await fetch("/api/library/upload", {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      if (res.ok) {
        const data = (await res.json()) as { downloadUrl?: string };
        if (typeof data.downloadUrl === "string" && data.downloadUrl) {
          const updated: BrandKit = {
            ...kitRef.current,
            logoUrl: data.downloadUrl,
            updatedAt: new Date().toISOString(),
          };
          applyKit(updated);
          // Keep cloud in sync so remount cannot pull an older kit without logo.
          void fetch("/api/brand-kit", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ kit: updated }),
          })
            .then(async (saveRes) => {
              if (!saveRes.ok) return;
              const saveData = (await saveRes.json()) as { kit?: BrandKit };
              if (saveData.kit) applyKit(saveData.kit);
            })
            .catch(() => {
              /* local durable URL is enough */
            });
          return;
        }
      }
      // Unsigned / storage unavailable — compressed data URL local-only fallback.
      const dataUrl = await fileToCompressedDataUrl(file);
      patch({ logoUrl: dataUrl });
      setNote(w.localOnlyNote);
    } catch {
      try {
        const dataUrl = await fileToCompressedDataUrl(file);
        patch({ logoUrl: dataUrl });
        setNote(w.localOnlyNote);
      } catch {
        setNote(w.localOnlyNote);
      }
    } finally {
      setBusy(false);
    }
  }

  function clearLogo() {
    const updated: BrandKit = {
      ...kitRef.current,
      logoUrl: null,
      useBrandLogo: false,
      updatedAt: new Date().toISOString(),
    };
    applyKit(updated);
    setNote(null);
    void fetch("/api/brand-kit", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ kit: updated }),
    })
      .then(async (saveRes) => {
        if (!saveRes.ok) return;
        const saveData = (await saveRes.json()) as { kit?: BrandKit };
        if (saveData.kit) applyKit(saveData.kit);
      })
      .catch(() => {
        /* local clear is enough */
      });
  }

  const shell = landing
    ? "rounded-2xl border border-violet-100/90 bg-white p-5 shadow-md shadow-violet-100/50 sm:p-6"
    : light
      ? "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
      : "rounded-xl border border-emerald-800/50 bg-emerald-950/20 p-4";
  const titleCls = landing
    ? "text-base font-semibold tracking-tight text-slate-900"
    : light
      ? "text-sm font-semibold text-slate-900"
      : "text-sm font-semibold text-emerald-100";
  const hintCls = landing
    ? "mt-0.5 text-[11px] leading-snug text-slate-500"
    : light
      ? "mt-1 text-xs text-slate-600"
      : "mt-1 text-xs text-emerald-200/70";
  const labelCls = landing
    ? "text-xs font-medium text-slate-600"
    : light
      ? "text-xs text-slate-600"
      : "text-xs text-emerald-200/80";
  const btnSecondary = landing
    ? "rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-800 hover:bg-violet-100 disabled:opacity-40"
    : light
      ? "rounded-full border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-40"
      : "rounded border border-emerald-700 px-3 py-1.5 text-xs text-emerald-100 disabled:opacity-40";
  const logoPreview = landing
    ? "h-11 w-11 shrink-0 rounded-lg border border-violet-100 object-contain bg-violet-50/80 p-1"
    : light
      ? "h-12 w-12 rounded-lg border border-slate-200 object-contain bg-slate-50 p-1"
      : "h-10 w-10 rounded border border-emerald-800 object-contain bg-white/10 p-0.5";
  const colorInput = landing
    ? "mt-1 block h-8 w-full cursor-pointer overflow-hidden rounded-md border border-violet-100 bg-white"
    : light
      ? "mt-1 block h-9 w-full cursor-pointer rounded-lg border border-slate-200"
      : "mt-1 block h-9 w-full cursor-pointer rounded border border-emerald-800";
  const textInput = landing
    ? "mt-1 w-full rounded-lg border border-violet-100 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none ring-violet-400/30 focus:ring-2"
    : light
      ? "mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
      : "mt-1 w-full rounded border border-emerald-800 bg-slate-950 px-2 py-1.5 text-sm text-white";
  const saveBtn = landing
    ? "mt-4 w-full rounded-full bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-violet-600/20 hover:bg-violet-500 disabled:opacity-40"
    : light
      ? "mt-4 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-medium text-white disabled:opacity-40"
      : "mt-3 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40";
  const noteCls = landing
    ? "mt-2 text-center text-xs text-violet-700"
    : light
      ? "mt-2 text-xs text-slate-600"
      : "mt-2 text-xs text-emerald-300/90";
  const checkCls = landing
    ? "h-4 w-4 shrink-0 rounded border-violet-300 text-violet-600 focus:ring-violet-500"
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

      <div className={`flex flex-wrap items-center gap-2 ${landing ? "mt-3.5" : "mt-4"}`}>
        <input
          ref={logoInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            void onLogoFile(e.target.files?.[0] ?? null);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          disabled={disabled || busy}
          onClick={() => logoInputRef.current?.click()}
          className={btnSecondary}
        >
          {busy ? w.saving : kit.logoUrl ? w.changeLogo : w.uploadLogo}
        </button>
        {kit.logoUrl ? (
          <button
            type="button"
            disabled={disabled || busy}
            onClick={() => clearLogo()}
            className={btnSecondary}
          >
            {w.clearLogo}
          </button>
        ) : null}
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

      <div className={`grid sm:grid-cols-3 ${landing ? "mt-3.5 gap-3" : "mt-4 gap-3"}`}>
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

      <label className={`block ${landing ? "mt-3.5" : "mt-4"} ${labelCls}`}>
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
