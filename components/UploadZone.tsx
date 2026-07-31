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
  /** Studio fuse pages — light violet instead of dark emerald. */
  variant?: "dark" | "violet";
};

export function UploadZone({
  label,
  hint,
  cta,
  changeLabel,
  previewUrl,
  fileName,
  onFile,
  variant = "dark",
}: Props) {
  const inputId = useId();
  const violet = variant === "violet";

  function onChange(e: ChangeEvent<HTMLInputElement>) {
    onFile(e.target.files?.[0] ?? null);
  }

  return (
    <div
      className={`rounded-2xl border-2 border-dashed p-5 ${
        violet
          ? "border-violet-300 bg-violet-50/60"
          : "border-emerald-700/50 bg-emerald-950/25"
      }`}
    >
      <p className={`text-sm font-medium ${violet ? "text-violet-900" : "text-emerald-100"}`}>
        {label}
      </p>
      <p className={`mt-1 text-xs ${violet ? "text-slate-500" : "text-slate-400"}`}>{hint}</p>

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
            className={`mx-auto max-h-64 w-full rounded-xl object-contain ${
              violet ? "border border-violet-200" : "border border-slate-700"
            }`}
          />
          {fileName && (
            <p
              className={`truncate text-center text-xs ${
                violet ? "text-slate-500" : "text-slate-500"
              }`}
            >
              {fileName}
            </p>
          )}
          <label
            htmlFor={inputId}
            className={`flex w-full cursor-pointer justify-center rounded-xl border py-2.5 text-sm ${
              violet
                ? "border-violet-200 text-violet-700 hover:bg-violet-50"
                : "border-slate-600 text-slate-300 hover:bg-slate-800/50"
            }`}
          >
            {changeLabel}
          </label>
        </div>
      ) : (
        <label
          htmlFor={inputId}
          className={`mt-4 flex w-full cursor-pointer flex-col items-center gap-2 rounded-xl py-8 text-white transition ${
            violet
              ? "bg-violet-600 hover:bg-violet-700"
              : "bg-emerald-600/90 hover:bg-emerald-500"
          }`}
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
