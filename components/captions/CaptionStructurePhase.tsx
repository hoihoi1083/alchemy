"use client";

import { useRef, useState } from "react";

type Labels = {
  structureTitle: string;
  structureHint: string;
  addClip: string;
  continueCaptions: string;
  clipN: (n: number) => string;
  joinFree: string;
};

export function CaptionStructurePhase(props: {
  labels: Labels;
  disabled?: boolean;
  busy?: boolean;
  clipCount: number;
  onContinue: () => void;
  uploadVideo: (file: File) => Promise<string>;
  onAddClip: (url: string, label: string) => void;
}) {
  const {
    labels: L,
    disabled,
    busy,
    clipCount,
    onContinue,
    uploadVideo,
    onAddClip,
  } = props;
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  return (
    <div className="space-y-3 rounded-xl border border-emerald-500/25 bg-emerald-950/20 p-3">
      <div>
        <p className="text-sm font-semibold text-emerald-50">{L.structureTitle}</p>
        <p className="mt-1 text-xs text-emerald-100/75">{L.structureHint}</p>
      </div>
      <p className="text-xs text-slate-300">
        {L.clipN(clipCount)} · timeline
      </p>
      <button
        type="button"
        disabled={disabled || busy || uploading || clipCount >= 8}
        onClick={() => inputRef.current?.click()}
        className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs text-white disabled:opacity-50"
      >
        {uploading ? "…" : L.addClip}
      </button>
      <p className="text-[10px] text-emerald-100/55">{L.joinFree}</p>
      <button
        type="button"
        disabled={busy || clipCount < 1}
        onClick={onContinue}
        className="w-full rounded-xl border border-emerald-400/40 px-4 py-2.5 text-sm font-semibold text-emerald-100 disabled:opacity-50"
      >
        {L.continueCaptions}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          setUploading(true);
          void uploadVideo(f)
            .then((url) => onAddClip(url, f.name || L.clipN(clipCount + 1)))
            .finally(() => setUploading(false));
        }}
      />
    </div>
  );
}
