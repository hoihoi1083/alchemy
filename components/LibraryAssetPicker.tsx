"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

export type LibraryPickerAsset = {
  id: string;
  kind: "image" | "video" | "audio" | "voiceover";
  name: string | null;
  downloadUrl: string;
  previewUrl: string;
  createdAt: string;
  timingManifest?: import("@/lib/video-timing-manifest").VideoTimingManifest;
};

/** Ensure inline streaming once — previewUrl already includes ?inline=1 from the assets API. */
function mediaPreviewSrc(url: string): string {
  if (url.includes("inline=1")) return url;
  return `${url}${url.includes("?") ? "&" : "?"}inline=1`;
}

type LibraryAssetPickerProps = {
  open: boolean;
  kinds: Array<"image" | "video" | "audio" | "voiceover">;
  onClose: () => void;
  onPick: (asset: LibraryPickerAsset) => void;
  labels: {
    title: string;
    loading: string;
    empty: string;
    loadError: string;
    cancel: string;
    useThis: string;
    close: string;
    search?: string;
    useSelected?: string;
    selectedCount?: string;
    filterAll?: string;
    missingFile?: string;
  };
};

export function LibraryAssetPicker({
  open,
  kinds,
  onClose,
  onPick,
  labels,
}: LibraryAssetPickerProps) {
  const [assets, setAssets] = useState<LibraryPickerAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [brokenIds, setBrokenIds] = useState<Record<string, true>>({});
  const [query, setQuery] = useState("");
  const [kindFilter, setKindFilter] = useState<"all" | LibraryPickerAsset["kind"]>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const kindsKey = kinds.join(",");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/library/assets", { credentials: "include" });
      if (res.status === 401) {
        window.location.href = `/sign-in?redirect_url=${encodeURIComponent(window.location.pathname)}`;
        return;
      }
      if (!res.ok) throw new Error(labels.loadError);
      const data = (await res.json()) as { assets?: LibraryPickerAsset[] };
      const kindSet = new Set(kindsKey.split(",") as LibraryPickerAsset["kind"][]);
      setAssets((data.assets ?? []).filter((a) => kindSet.has(a.kind)));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : labels.loadError);
      setAssets([]);
    } finally {
      setLoading(false);
    }
  }, [kindsKey, labels.loadError]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setKindFilter("all");
    setSelectedId(null);
    setBrokenIds({});
    void load();
  }, [open, load]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return assets.filter((a) => {
      if (kindFilter !== "all" && a.kind !== kindFilter) return false;
      if (!q) return true;
      return (a.name || a.kind).toLowerCase().includes(q);
    });
  }, [assets, kindFilter, query]);

  const selected = filtered.find((a) => a.id === selectedId) ?? null;

  if (!open) return null;

  const filterKinds = [
    "all" as const,
    ...kinds.filter((k, i) => kinds.indexOf(k) === i),
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-3 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={labels.title}
      onClick={onClose}
    >
      <div
        className="flex max-h-[min(85vh,720px)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
          <h3 className="text-sm font-semibold text-white">{labels.title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-2 py-1 text-xs text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            {labels.close}
          </button>
        </div>

        <div className="space-y-2 border-b border-slate-800 px-4 py-3">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={labels.search ?? "Search by name…"}
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-500"
          />
          <div className="flex flex-wrap gap-1.5">
            {filterKinds.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKindFilter(k)}
                className={`rounded-full px-2.5 py-1 text-[11px] ${
                  kindFilter === k
                    ? "bg-violet-600 text-white"
                    : "border border-slate-600 text-slate-300"
                }`}
              >
                {k === "all" ? labels.filterAll ?? "All" : k}
              </button>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {loading ? (
            <p className="py-10 text-center text-sm text-slate-400">{labels.loading}</p>
          ) : error ? (
            <p className="rounded-lg bg-red-950/50 px-3 py-2 text-sm text-red-200">{error}</p>
          ) : filtered.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-400">{labels.empty}</p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {filtered.map((asset) => {
                const isVideo = asset.kind === "video" || asset.kind === "voiceover";
                const isBroken = Boolean(brokenIds[asset.id]);
                const selectedCls =
                  selectedId === asset.id
                    ? "border-violet-400 ring-1 ring-violet-400/50"
                    : "border-slate-800";
                return (
                  <li key={asset.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(asset.id)}
                      className={`flex w-full items-center gap-3 rounded-xl border bg-slate-900/60 p-2 text-left ${selectedCls} ${
                        isBroken ? "opacity-70" : ""
                      }`}
                    >
                      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-slate-800">
                        {isBroken ? (
                          <div className="flex h-full w-full items-center justify-center px-1 text-center text-[9px] leading-tight text-rose-300">
                            {labels.missingFile ?? "File missing"}
                          </div>
                        ) : isVideo ? (
                          <video
                            src={mediaPreviewSrc(asset.previewUrl)}
                            muted
                            playsInline
                            preload="metadata"
                            className="h-full w-full object-cover"
                            onError={() =>
                              setBrokenIds((prev) => ({ ...prev, [asset.id]: true }))
                            }
                          />
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={mediaPreviewSrc(asset.previewUrl)}
                            alt=""
                            className="h-full w-full object-cover"
                            onError={() =>
                              setBrokenIds((prev) => ({ ...prev, [asset.id]: true }))
                            }
                          />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-white">
                          {asset.name || asset.kind}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {isBroken
                            ? labels.missingFile ?? "File missing in storage"
                            : `${asset.kind} · ${new Date(asset.createdAt).toLocaleString()}`}
                        </p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 px-4 py-3">
          <p className="text-[11px] text-slate-500">
            {(labels.selectedCount ?? "{n} asset selected").replace(
              "{n}",
              selected ? "1" : "0",
            )}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-slate-600 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-900"
            >
              {labels.cancel}
            </button>
            <button
              type="button"
              disabled={!selected || Boolean(selected && brokenIds[selected.id])}
              onClick={() => {
                if (!selected || brokenIds[selected.id]) return;
                onPick(selected);
              }}
              className="rounded-full bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-500 disabled:opacity-40"
            >
              {labels.useSelected ?? labels.useThis}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
