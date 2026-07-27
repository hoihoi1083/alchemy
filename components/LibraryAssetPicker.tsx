"use client";

import { useCallback, useEffect, useState } from "react";

export type LibraryPickerAsset = {
  id: string;
  kind: "image" | "video" | "audio" | "voiceover";
  name: string | null;
  downloadUrl: string;
  previewUrl: string;
  createdAt: string;
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

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-3 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={labels.title}
      onClick={onClose}
    >
      <div
        className="flex max-h-[min(85vh,640px)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 shadow-2xl"
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

        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {loading ? (
            <p className="py-10 text-center text-sm text-slate-400">{labels.loading}</p>
          ) : error ? (
            <p className="rounded-lg bg-red-950/50 px-3 py-2 text-sm text-red-200">{error}</p>
          ) : assets.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-400">{labels.empty}</p>
          ) : (
            <ul className="space-y-2">
              {assets.map((asset) => {
                const isVideo = asset.kind === "video" || asset.kind === "voiceover";
                return (
                  <li
                    key={asset.id}
                    className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-2"
                  >
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-slate-800">
                      {isVideo ? (
                        <video
                          src={mediaPreviewSrc(asset.previewUrl)}
                          muted
                          playsInline
                          preload="metadata"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={mediaPreviewSrc(asset.previewUrl)}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white">
                        {asset.name || asset.kind}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {new Date(asset.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onPick(asset)}
                      className="shrink-0 rounded-full bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-500"
                    >
                      {labels.useThis}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="border-t border-slate-800 px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-full border border-slate-600 py-2 text-xs font-medium text-slate-300 hover:bg-slate-900"
          >
            {labels.cancel}
          </button>
        </div>
      </div>
    </div>
  );
}
