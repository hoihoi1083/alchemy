"use client";

import { type ReactNode, useEffect, useState } from "react";

type Props = {
  labels: { open: string; close: string };
  toolbar: ReactNode;
  queue: ReactNode;
  /** Controlled open (Ultra 2 opens Board tools after pick / restore). */
  desktopOpen?: boolean;
  onDesktopOpenChange?: (open: boolean) => void;
  defaultDesktopOpen?: boolean;
};

export function UltraCanvasRightRail({
  labels,
  toolbar,
  queue,
  desktopOpen: desktopOpenProp,
  onDesktopOpenChange,
  defaultDesktopOpen = false,
}: Props) {
  const [desktopOpenInternal, setDesktopOpenInternal] = useState(defaultDesktopOpen);
  const [mobileOpen, setMobileOpen] = useState(false);
  const controlled = typeof desktopOpenProp === "boolean";
  const desktopOpen = controlled ? desktopOpenProp! : desktopOpenInternal;

  useEffect(() => {
    if (!controlled && defaultDesktopOpen) setDesktopOpenInternal(true);
  }, [controlled, defaultDesktopOpen]);

  function setDesktopOpen(next: boolean) {
    if (controlled) onDesktopOpenChange?.(next);
    else setDesktopOpenInternal(next);
  }

  return (
    <>
      <div className="absolute right-3 top-3 z-20 hidden flex-col items-end gap-2 md:flex">
        <button
          type="button"
          onClick={() => setDesktopOpen(!desktopOpen)}
          className="rounded-lg border border-cyan-500/40 bg-slate-900/95 px-3 py-1.5 text-[11px] font-semibold text-cyan-100 shadow-lg backdrop-blur hover:bg-slate-800"
        >
          {desktopOpen ? labels.close : labels.open}
        </button>
        {desktopOpen ? (
          <div
            data-coach-id="coach-ultra-panel"
            className="flex max-h-[min(70vh,640px)] w-[min(100%,18rem)] flex-col items-stretch gap-2 overflow-visible"
          >
            <div className="relative z-40 shrink-0">{toolbar}</div>
            <div className="min-h-0 flex-1 overflow-y-auto overflow-x-visible">{queue}</div>
          </div>
        ) : null}
      </div>

      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="fixed bottom-4 right-4 z-20 rounded-full border border-cyan-500/40 bg-slate-900/95 px-4 py-2.5 text-xs font-semibold text-cyan-100 shadow-lg backdrop-blur md:hidden"
      >
        {labels.open}
      </button>

      {mobileOpen ? (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/55"
            aria-label={labels.close}
            onClick={() => setMobileOpen(false)}
          />
          <div
            data-coach-id="coach-ultra-panel"
            className="absolute right-0 top-0 flex h-full w-[min(100%,20rem)] flex-col gap-2 border-l border-slate-700 bg-slate-950/98 p-3 shadow-2xl"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                {labels.open}
              </p>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="rounded-lg px-2 py-1 text-xs text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              >
                {labels.close}
              </button>
            </div>
            <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-visible">
              <div className="relative z-40 shrink-0">{toolbar}</div>
              <div className="min-h-0 flex-1 overflow-y-auto">{queue}</div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
