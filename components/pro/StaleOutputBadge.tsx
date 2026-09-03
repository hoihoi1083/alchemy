"use client";

import { useLocale } from "@/components/LocaleProvider";

export function StaleOutputBadge() {
  const { m } = useLocale();
  return (
    <p className="mt-1.5 rounded-md border border-amber-500/35 bg-amber-950/40 px-2 py-1 text-[10px] font-medium text-amber-200/95">
      {m.ultraCanvas.staleOutputBadge}
    </p>
  );
}
