"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale } from "@/components/LocaleProvider";
import {
  DEFAULT_BRAND_KIT,
  loadBrandKitFromStorage,
  saveBrandKitToStorage,
  type BrandKit,
} from "@/lib/brand-kit";

type BrandKitPanelProps = {
  disabled?: boolean;
  onChange?: (kit: BrandKit) => void;
};

export function BrandKitPanel({ disabled, onChange }: BrandKitPanelProps) {
  const { m } = useLocale();
  const w = m.wizard.brandKit;
  const [kit, setKit] = useState<BrandKit>(DEFAULT_BRAND_KIT);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

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

  return (
    <div className="rounded-xl border border-emerald-800/50 bg-emerald-950/20 p-4">
      <p className="text-sm font-semibold text-emerald-100">{w.title}</p>
      <p className="mt-1 text-xs text-emerald-200/70">{w.hint}</p>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { onLogoFile(e.target.files?.[0] ?? null); e.target.value = ""; }} />
        <button type="button" disabled={disabled} onClick={() => logoInputRef.current?.click()} className="rounded border border-emerald-700 px-3 py-1.5 text-xs text-emerald-100">{kit.logoUrl ? w.changeLogo : w.uploadLogo}</button>
        {kit.logoUrl && <img src={kit.logoUrl} alt="" className="h-10 w-10 rounded border border-emerald-800 object-contain bg-white/10 p-0.5" />}
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <label className="text-xs text-emerald-200/80">{w.primaryColor}<input type="color" disabled={disabled} value={kit.primaryColor} onChange={(e) => patch({ primaryColor: e.target.value })} className="mt-1 block h-9 w-full cursor-pointer rounded border border-emerald-800" /></label>
        <label className="text-xs text-emerald-200/80">{w.secondaryColor}<input type="color" disabled={disabled} value={kit.secondaryColor} onChange={(e) => patch({ secondaryColor: e.target.value })} className="mt-1 block h-9 w-full cursor-pointer rounded border border-emerald-800" /></label>
        <label className="text-xs text-emerald-200/80">{w.accentColor}<input type="color" disabled={disabled} value={kit.accentColor} onChange={(e) => patch({ accentColor: e.target.value })} className="mt-1 block h-9 w-full cursor-pointer rounded border border-emerald-800" /></label>
      </div>

      <label className="mt-3 block text-xs text-emerald-200/80">
        {w.tagline}
        <input type="text" disabled={disabled} value={kit.tagline} onChange={(e) => patch({ tagline: e.target.value })} placeholder={w.taglinePlaceholder} className="mt-1 w-full rounded border border-emerald-800 bg-slate-950 px-2 py-1.5 text-sm text-white" />
      </label>

      <button type="button" disabled={disabled || busy} onClick={() => void persist()} className="mt-3 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">{busy ? w.saving : w.saveBtn}</button>
      {note && <p className="mt-2 text-xs text-emerald-300/90">{note}</p>}
    </div>
  );
}
