"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useLocale } from "@/components/LocaleProvider";

type LibraryAsset = {
  id: string;
  kind: string;
  name: string | null;
  previewUrl: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onPick: (asset: { previewUrl: string; name: string }) => void;
  kind?: "image" | "video" | "audio";
};

function resolvePortalHost(): HTMLElement | null {
  if (typeof document === "undefined") return null;
  return (
    document.getElementById("ultra-canvas-board") ??
    document.querySelector("[data-ultra-canvas-board]")
  );
}

export function UltraLibraryPicker({ open, onClose, onPick, kind = "image" }: Props) {
  const { m } = useLocale();
  const lp = m.ultraCanvas.libraryPicker;
  const [assets, setAssets] = useState<LibraryAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [host, setHost] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setHost(resolvePortalHost());
  }, [open]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/library/assets");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((data as { error?: string }).error || "Failed to load library.");
      }
      const all = ((data as { assets?: LibraryAsset[] }).assets ?? []).filter(
        (a) => a.kind === kind,
      );
      setAssets(all);
      setError(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load library.");
    } finally {
      setLoading(false);
    }
  }, [kind]);

  useEffect(() => {
    if (open) {
      setQuery("");
      void load();
    }
  }, [load, open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return assets;
    return assets.filter((a) => (a.name ?? lp.unnamed).toLowerCase().includes(q));
  }, [assets, lp.unnamed, query]);

  if (!open || !host) return null;

  // Sit inside the Ultra canvas board (not the full browser window).
  return createPortal(
    <div
      className="nodrag nopan nowheel absolute inset-0 z-50 flex items-center justify-center bg-black/55 p-3 backdrop-blur-[2px] sm:p-4"
      role="presentation"
      onClick={onClose}
      onWheel={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={lp.title}
        className="flex h-full max-h-full w-full max-w-3xl min-h-0 flex-col overflow-hidden rounded-xl border border-violet-500/35 bg-slate-950 shadow-[0_0_40px_rgba(139,92,246,0.2)] sm:max-h-[min(100%,36rem)] sm:max-w-4xl"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 flex-col gap-2 border-b border-slate-800 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-4">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-violet-200">{lp.title}</h3>
            {!loading && !error ? (
              <p className="mt-0.5 text-[11px] text-slate-500">
                {lp.count
                  .replace("{shown}", String(filtered.length))
                  .replace("{total}", String(assets.length))}
              </p>
            ) : null}
          </div>
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:max-w-xs sm:justify-end">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={lp.searchPlaceholder}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:border-violet-500/50 focus:outline-none"
              autoFocus
            />
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-lg px-2.5 py-1.5 text-xs text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            >
              {lp.close}
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2.5 sm:p-3">
          {loading ? (
            <p className="text-xs text-slate-500">{lp.loading}</p>
          ) : error ? (
            <p className="text-xs text-red-400">{error}</p>
          ) : assets.length === 0 ? (
            <p className="text-xs text-slate-500">{lp.empty}</p>
          ) : filtered.length === 0 ? (
            <p className="text-xs text-slate-500">{lp.noMatch}</p>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {filtered.map((a) => {
                const label = a.name ?? lp.unnamed;
                return (
                  <button
                    key={a.id}
                    type="button"
                    title={label}
                    onClick={() => {
                      onPick({ previewUrl: a.previewUrl, name: label });
                      onClose();
                    }}
                    className="group flex flex-col overflow-hidden rounded-lg border border-slate-700/90 bg-slate-900 text-left transition hover:border-violet-400/60 hover:bg-slate-900/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/60"
                  >
                    {kind === "image" ? (
                      <div
                        className="relative w-full overflow-hidden bg-slate-950"
                        style={{ aspectRatio: "4 / 5", minHeight: 110 }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={a.previewUrl}
                          alt={label}
                          loading="lazy"
                          decoding="async"
                          className="h-full w-full object-contain p-1 transition duration-200 group-hover:scale-[1.03]"
                          onError={(e) => {
                            const el = e.currentTarget;
                            el.style.display = "none";
                            const fallback = el.nextElementSibling;
                            if (fallback instanceof HTMLElement) fallback.hidden = false;
                          }}
                        />
                        <div
                          hidden
                          className="absolute inset-0 flex items-center justify-center px-2 text-center text-[10px] text-slate-500"
                        >
                          {lp.previewFailed}
                        </div>
                      </div>
                    ) : (
                      <div
                        className="flex w-full items-center justify-center bg-slate-800 text-xs font-medium text-slate-400"
                        style={{ aspectRatio: "4 / 5", minHeight: 110 }}
                      >
                        {kind.toUpperCase()}
                      </div>
                    )}
                    <p className="line-clamp-2 px-1.5 py-1 text-[10px] leading-snug text-slate-300">
                      {label}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>,
    host,
  );
}
