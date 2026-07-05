"use client";

import { useRef, type ChangeEvent } from "react";

type Props = {
  label: string;
  hint: string;
  cta: string;
  changeLabel: string;
  previewUrl: string | null;
  isVideo: boolean;
  fileName: string | null;
  onFile: (file: File | null) => void;
};

export function ReferenceUploadZone({
  label,
  hint,
  cta,
  changeLabel,
  previewUrl,
  isVideo,
  fileName,
  onFile,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  function onChange(e: ChangeEvent<HTMLInputElement>) {
    onFile(e.target.files?.[0] ?? null);
  }

  return (
    <div className="rounded-2xl border border-dashed border-slate-600 bg-slate-950/40 p-5">
      <p className="text-sm font-medium text-slate-300">{label}</p>
      <p className="mt-1 text-xs text-slate-500">{hint}</p>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime"
        className="sr-only"
        onChange={onChange}
      />

      {previewUrl ? (
        <div className="mt-4 space-y-3">
          {isVideo ? (
            <video
              src={previewUrl}
              controls
              playsInline
              className="mx-auto max-h-48 w-full rounded-xl border border-slate-700"
            />
          ) : (
            <img
              src={previewUrl}
              alt=""
              className="mx-auto max-h-48 rounded-xl border border-slate-700 object-contain"
            />
          )}
          {fileName && <p className="truncate text-center text-xs text-slate-500">{fileName}</p>}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="w-full rounded-xl border border-slate-600 py-2.5 text-sm text-slate-300 hover:bg-slate-800/50"
          >
            {changeLabel}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="mt-4 flex w-full flex-col items-center gap-2 rounded-xl border border-slate-600 py-6 text-slate-300 transition hover:bg-slate-800/50"
        >
          <span className="text-2xl" aria-hidden>
            🎬
          </span>
          <span className="text-sm font-medium">{cta}</span>
        </button>
      )}
    </div>
  );
}
