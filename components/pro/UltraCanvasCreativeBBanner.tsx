"use client";

import { useState } from "react";
import { useLocale } from "@/components/LocaleProvider";
import type { CreativeBStepStatus } from "@/lib/pro-canvas-creative-b-checklist";

const DISMISS_KEY = "alchemy:ultra-creative-b-hint-dismissed";

type Props = {
  steps?: CreativeBStepStatus[];
  onDismiss: () => void;
};

export function UltraCanvasCreativeBBanner({ steps, onDismiss }: Props) {
  const { m } = useLocale();
  const hint = m.ultraCanvas.creativeBHint;
  const [expanded, setExpanded] = useState(true);

  const dismiss = () => {
    try {
      window.sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
    onDismiss();
  };

  const labels = hint.steps;
  const statusById = new Map((steps ?? []).map((s) => [s.id, s]));

  return (
    <div className="pointer-events-auto absolute bottom-16 left-1/2 z-20 w-[min(calc(100%-8rem),22rem)] -translate-x-1/2 rounded-xl border border-violet-500/35 bg-violet-950/95 shadow-lg shadow-violet-950/40">
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
        <ol className="border-t border-violet-500/20 px-3 py-2 space-y-1 text-[10px] leading-snug text-violet-200/85">
          {labels.map((step, i) => {
            const id = (steps ?? [])[i]?.id;
            const status = id ? statusById.get(id) : undefined;
            const done = Boolean(status?.done);
            const stale = Boolean(status?.stale);
            return (
              <li key={step} className="flex gap-2">
                <span
                  className={`mt-0.5 inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full text-[8px] font-bold ${
                    stale
                      ? "bg-amber-400/90 text-amber-950"
                      : done
                        ? "bg-emerald-500/90 text-emerald-950"
                        : "border border-violet-400/40 text-violet-300/70"
                  }`}
                  aria-hidden
                >
                  {stale ? "!" : done ? "✓" : i + 1}
                </span>
                <span
                  className={
                    stale
                      ? "text-amber-200/95"
                      : done
                        ? "text-emerald-200/90"
                        : undefined
                  }
                >
                  {step}
                  {stale ? (
                    <span className="ml-1 text-amber-300/80">
                      ({hint.staleTag})
                    </span>
                  ) : null}
                </span>
              </li>
            );
          })}
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
