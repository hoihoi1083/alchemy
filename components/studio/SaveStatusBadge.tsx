"use client";

import { useLocale } from "@/components/LocaleProvider";
import { useSaveStatus } from "@/components/studio/WizardContext";

export function SaveStatusBadge({ theme = "light" }: { theme?: "light" | "dark" }) {
  const { m } = useLocale();
  const status = useSaveStatus();
  if (status === "idle") return null;

  const label =
    status === "saving"
      ? m.studio.saveSaving
      : status === "saved"
        ? m.studio.saveSaved
        : m.studio.saveError;

  const classes =
    status === "error"
      ? theme === "dark"
        ? "border-red-800/60 bg-red-950/50 text-red-200"
        : "border-red-200 bg-red-50 text-red-700"
      : status === "saving"
        ? theme === "dark"
          ? "border-slate-600 bg-slate-800/80 text-slate-300"
          : "border-slate-200 bg-white text-slate-600"
        : theme === "dark"
          ? "border-emerald-800/50 bg-emerald-950/40 text-emerald-300"
          : "border-emerald-200 bg-emerald-50 text-emerald-800";

  return (
    <div
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${classes}`}
      role="status"
      aria-live="polite"
    >
      {label}
    </div>
  );
}
