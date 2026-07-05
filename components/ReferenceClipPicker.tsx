"use client";

import { useEffect, useState } from "react";
import { useLocale } from "@/components/LocaleProvider";
import {
  listAvailableReferenceClips,
  type ReferenceClipDef,
  type ReferenceClipId,
} from "@/lib/reference-clips";

type Props = {
  selectedClipId: ReferenceClipId | null;
  onSelectClip: (id: ReferenceClipId) => void;
  loading?: boolean;
};

export function ReferenceClipPicker({ selectedClipId, onSelectClip, loading }: Props) {
  const { m } = useLocale();
  const [available, setAvailable] = useState<ReferenceClipDef[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    listAvailableReferenceClips().then((clips) => {
      if (!cancelled) setAvailable(clips);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (available === null) return null;

  if (available.length === 0) {
    return (
      <p className="rounded-lg border border-emerald-800/50 bg-emerald-950/40 px-3 py-2 text-xs text-emerald-200/90">
        {m.wizard.referenceClipsMissing}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-emerald-100">{m.wizard.referenceClipLibraryLabel}</p>
      <p className="text-xs text-emerald-200/70">{m.wizard.referenceClipLibraryHint}</p>
      <div className="flex flex-wrap gap-2">
        {available.map((clip) => {
          const label = m.wizard.referenceClips[clip.id];
          return (
            <button
              key={clip.id}
              type="button"
              disabled={loading}
              onClick={() => onSelectClip(clip.id)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                selectedClipId === clip.id
                  ? "bg-emerald-600 text-white"
                  : "border border-emerald-700/60 text-emerald-100 hover:border-emerald-500"
              } disabled:opacity-50`}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
