"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale } from "@/components/LocaleProvider";
import type { CoachTaskKind } from "@/lib/studio-assistant-coach-profile";
import { coachTaskToTargetId } from "@/lib/studio-assistant-coach-targets";
import { subscribeCoachSpotlight } from "@/lib/studio-assistant-spotlight-bus";

type Rect = { top: number; left: number; width: number; height: number };

const PAD = 10;
const MAX_ATTEMPTS = 40;
const RETRY_MS = 120;

function measureTarget(targetId: string): Rect | null {
  const el = document.querySelector(`[data-coach-id="${targetId}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width < 2 || r.height < 2) return null;
  return {
    top: r.top - PAD,
    left: r.left - PAD,
    width: r.width + PAD * 2,
    height: r.height + PAD * 2,
  };
}

export function CoachSpotlightOverlay() {
  const { m } = useLocale();
  const [task, setTask] = useState<CoachTaskKind | null>(null);
  const [rect, setRect] = useState<Rect | null>(null);

  const dismiss = useCallback(() => {
    setTask(null);
    setRect(null);
  }, []);

  const refresh = useCallback((activeTask: CoachTaskKind | null) => {
    if (!activeTask) {
      setRect(null);
      return;
    }
    const targetId = coachTaskToTargetId(activeTask);
    if (!targetId) {
      setRect(null);
      return;
    }

    let attempts = 0;
    const tryMeasure = () => {
      const el = document.querySelector(`[data-coach-id="${targetId}"]`);
      if (attempts === 0) {
        el?.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
      }
      const r = measureTarget(targetId);
      if (r) {
        setRect(r);
        return;
      }
      attempts += 1;
      if (attempts < MAX_ATTEMPTS) {
        window.setTimeout(tryMeasure, RETRY_MS);
      } else {
        setRect(null);
      }
    };

    window.setTimeout(tryMeasure, attempts === 0 ? 200 : 0);
  }, []);

  useEffect(
    () =>
      subscribeCoachSpotlight((next) => {
        setTask(next);
        refresh(next);
      }),
    [refresh],
  );

  useEffect(() => {
    if (!task) return;
    const onLayout = () => refresh(task);
    window.addEventListener("resize", onLayout);
    window.addEventListener("scroll", onLayout, true);
    return () => {
      window.removeEventListener("resize", onLayout);
      window.removeEventListener("scroll", onLayout, true);
    };
  }, [task, refresh]);

  useEffect(() => {
    if (!task) return;
    const targetId = coachTaskToTargetId(task);
    if (!targetId) return;
    const el = document.querySelector(`[data-coach-id="${targetId}"]`);
    if (!el) return;

    const onInteract = () => dismiss();
    el.addEventListener("focus", onInteract, true);
    el.addEventListener("click", onInteract, true);
    return () => {
      el.removeEventListener("focus", onInteract, true);
      el.removeEventListener("click", onInteract, true);
    };
  }, [task, dismiss]);

  if (!task || !rect) return null;

  return (
    <>
      {/* Visual dim only — clicks pass through to the form underneath */}
      <div
        className="pointer-events-none fixed inset-0 z-[88] bg-slate-900/45"
        role="presentation"
        aria-hidden
      />
      <div
        className="pointer-events-none fixed z-[102] rounded-xl ring-4 ring-violet-400 animate-pulse"
        style={{
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        }}
      />
      <button
        type="button"
        onClick={dismiss}
        className="pointer-events-auto fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] left-1/2 z-[103] -translate-x-1/2 rounded-full border border-violet-300 bg-violet-950/90 px-4 py-2.5 text-xs font-medium text-violet-100 shadow-lg hover:bg-violet-900 md:bottom-6"
      >
        {m.studioAssistant.spotlightDismiss}
      </button>
    </>
  );
}
