"use client";

import { useState } from "react";
import { useLocale } from "@/components/LocaleProvider";

const DISMISS_KEY = "alchemy:ultra-creative-b-hint-dismissed";

type Props = {
  onDismiss: () => void;
};

export function UltraCanvasCreativeBBanner({ onDismiss }: Props) {
  const { m } = useLocale();
  const hint = m.ultraCanvas.creativeBHint;
  const [expanded, setExpanded] = useState(false);

  const dismiss = () => {
    try {
      window.sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
    onDismiss();
  };

  return (
    <div className="pointer-events-auto absolute bottom-16 left-1/2 z-20 w-[min(calc(100%-8rem),20rem)] -translate-x-1/2 rounded-xl border border-violet-500/35 bg-violet-950/95 shadow-lg shadow-violet-950/40">
      <div className="flex items-center gap-2 px-2.5 py-1.5">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="min-w-0 flex-1 truncate text-left text-[11px] font-semibold text-violet-100 hover:text-white"
        >
          {expanded ? "−" : "+"} {hint.title}
        </button>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 rounded-md border border-violet-400/30 px-2 py-0.5 text-[10px] font-medium text-violet-200 hover:bg-violet-900/60"
        >
          {hint.dismiss}
        </button>
      </div>
      {expanded ? (
        <ol className="border-t border-violet-500/20 px-3 py-2 list-decimal space-y-0.5 pl-5 text-[10px] leading-snug text-violet-200/85">
          {hint.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      ) : null}
    </div>
  );
}

export function wasCreativeBHintDismissed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}
