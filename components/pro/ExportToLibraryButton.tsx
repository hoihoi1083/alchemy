"use client";

import { useState } from "react";
import { useLocale } from "@/components/LocaleProvider";

type Props = {
  url: string;
  kind: "image" | "video";
  onExported?: (libraryUrl: string) => void;
};

export function ExportToLibraryButton({ url, kind, onExported }: Props) {
  const { m } = useLocale();
  const ex = m.ultraCanvas.export;
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!url?.startsWith("http") && !url.startsWith("/api/library/")) return null;

  return (
    <div className="mt-1.5">
      <button
        type="button"
        disabled={busy || done}
        onClick={async () => {
          setBusy(true);
          setError(null);
          try {
            const res = await fetch("/api/ultra-canvas/export-asset", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ url, kind }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
              throw new Error((data as { error?: string }).error || "Export failed.");
            }
            const libraryUrl = (data as { libraryUrl?: string }).libraryUrl;
            if (libraryUrl) onExported?.(libraryUrl);
            setDone(true);
          } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Export failed.");
          } finally {
            setBusy(false);
          }
        }}
        className="text-[10px] font-medium text-cyan-400/90 underline-offset-2 hover:text-cyan-300 hover:underline disabled:opacity-50"
      >
        {done ? ex.saved : busy ? ex.saving : ex.saveToLibrary}
      </button>
      {error ? <p className="text-[10px] text-red-400">{error}</p> : null}
    </div>
  );
}
