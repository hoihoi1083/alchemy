"use client";

import { useId, type ChangeEvent } from "react";

type Props = {
  label: string;
  hint: string;
  cta: string;
  changeLabel: string;
  previewUrl: string | null;
  fileName: string | null;
  onFile: (file: File | null) => void;
};

export function UploadZone({
  label,
  hint,
  cta,
  changeLabel,
  previewUrl,
  fileName,
  onFile,
}: Props) {
  const inputId = useId();

  function onChange(e: ChangeEvent<HTMLInputElement>) {
    onFile(e.target.files?.[0] ?? null);
  }

  return (
    <div className="rounded-2xl border-2 border-dashed border-emerald-700/50 bg-emerald-950/25 p-5">
      <p className="text-sm font-medium text-emerald-100">{label}</p>
      <p className="mt-1 text-xs text-slate-400">{hint}</p>

      <input
        id={inputId}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={onChange}
      />

      {previewUrl ? (
        <div className="mt-4 space-y-3">
          <img
            src={previewUrl}
            alt=""
            className="mx-auto max-h-64 w-full rounded-xl border border-slate-700 object-contain"
          />
          {fileName && <p className="truncate text-center text-xs text-slate-500">{fileName}</p>}
          <label
            htmlFor={inputId}
            className="w-full rounded-xl border border-slate-600 py-2.5 text-sm text-slate-300 hover:bg-slate-800/50"
          >
            {changeLabel}
          </label>
        </div>
      ) : (
        <label
          htmlFor={inputId}
          className="mt-4 flex w-full flex-col items-center gap-2 rounded-xl bg-emerald-600/90 py-8 text-white transition hover:bg-emerald-500"
        >
          <span className="text-3xl" aria-hidden>
            📷
          </span>
          <span className="text-sm font-semibold">{cta}</span>
        </label>
      )}
    </div>
  );
}
