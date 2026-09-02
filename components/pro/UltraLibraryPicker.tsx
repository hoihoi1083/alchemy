"use client";

import { useCallback, useEffect, useState } from "react";
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

export function UltraLibraryPicker({ open, onClose, onPick, kind = "image" }: Props) {
  const { m } = useLocale();
  const lp = m.ultraCanvas.libraryPicker;
  const [assets, setAssets] = useState<LibraryAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    if (open) void load();
  }, [load, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="flex max-h-[80vh] w-full max-w-lg flex-col rounded-2xl border border-violet-500/30 bg-slate-950 shadow-[0_0_48px_rgba(139,92,246,0.2)]">
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
          <h3 className="text-sm font-semibold text-violet-200">{lp.title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-xs text-slate-400 hover:bg-slate-800"
          >
            {lp.close}
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          {loading ? (
            <p className="text-xs text-slate-500">{lp.loading}</p>
          ) : error ? (
            <p className="text-xs text-red-400">{error}</p>
          ) : assets.length === 0 ? (
            <p className="text-xs text-slate-500">{lp.empty}</p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {assets.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => {
                    onPick({ previewUrl: a.previewUrl, name: a.name ?? lp.unnamed });
                    onClose();
                  }}
                  className="group overflow-hidden rounded-lg border border-slate-700 bg-slate-900 text-left hover:border-violet-500/50"
                >
                  {kind === "image" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={a.previewUrl}
                      alt=""
                      className="aspect-square w-full object-cover transition group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex aspect-square items-center justify-center bg-slate-800 text-[10px] text-slate-400">
                      {kind.toUpperCase()}
                    </div>
                  )}
                  <p className="truncate px-1.5 py-1 text-[10px] text-slate-300">
                    {a.name ?? lp.unnamed}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
