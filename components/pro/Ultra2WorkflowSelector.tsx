"use client";

import { useState } from "react";
import { UltraCanvasWaveBg } from "@/components/pro/UltraCanvasWaveBg";
import type { Ultra2WorkflowId } from "@/lib/ultra2-workflows";

type Card = {
  id: Ultra2WorkflowId;
  title: string;
  desc: string;
  flow: string;
};

type SavedBoard = {
  id: string;
  name: string;
  updatedAt: string;
};

type Props = {
  open: boolean;
  title: string;
  subtitle: string;
  cards: Card[];
  onPick: (id: Ultra2WorkflowId) => void;
  useWorkflowLabel: string;
  recommendedLabel: string;
  loadTitle: string;
  loadHint: string;
  loadEmpty: string;
  continueLabel?: string;
  boards: SavedBoard[];
  boardsLoading?: boolean;
  onLoadBoard: (id: string) => void;
  onContinue?: () => void;
};

function CardShell({
  card,
  featured,
  useWorkflowLabel,
  recommendedLabel,
  onPick,
  className,
}: {
  card: Card;
  featured?: boolean;
  useWorkflowLabel: string;
  recommendedLabel: string;
  onPick: (id: Ultra2WorkflowId) => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onPick(card.id)}
      className={
        className ??
        (featured
          ? "group relative flex flex-col rounded-lg border border-fuchsia-400/55 bg-slate-950/60 p-2.5 text-left shadow-[0_0_20px_rgba(232,121,249,0.14)] ring-1 ring-fuchsia-500/30 transition hover:border-fuchsia-300/70 sm:p-3"
          : "group flex flex-col rounded-lg border border-cyan-400/35 bg-slate-950/55 p-2.5 text-left transition hover:border-cyan-300/55 hover:bg-cyan-950/20 hover:shadow-[0_0_16px_rgba(34,211,238,0.1)] sm:p-3")
      }
    >
      {featured ? (
        <span className="mb-1 inline-flex w-fit items-center gap-1 rounded bg-gradient-to-r from-fuchsia-600 to-violet-600 px-1.5 py-0.5 text-[9px] font-semibold text-white">
          ★ {recommendedLabel}
        </span>
      ) : null}
      <p className="text-[13px] font-semibold leading-tight text-white sm:text-sm">
        {card.title}
      </p>
      <p className="mt-0.5 line-clamp-2 flex-1 text-[11px] leading-snug text-slate-400">
        {card.desc}
      </p>
      <p className="mt-1.5 text-[9px] font-medium text-slate-500">{card.flow}</p>
      <span className="mt-1.5 inline-flex w-full items-center justify-center rounded-md bg-gradient-to-r from-fuchsia-600 via-pink-500 to-violet-600 px-2.5 py-1.5 text-[10px] font-semibold text-white shadow-[0_0_12px_rgba(232,121,249,0.3)] transition group-hover:brightness-110 sm:text-[11px]">
        {useWorkflowLabel}
      </span>
    </button>
  );
}

export function Ultra2WorkflowSelector({
  open,
  title,
  subtitle,
  cards,
  onPick,
  useWorkflowLabel,
  recommendedLabel,
  loadTitle,
  loadHint,
  loadEmpty,
  continueLabel,
  boards,
  boardsLoading,
  onLoadBoard,
  onContinue,
}: Props) {
  const [loadOpen, setLoadOpen] = useState(false);

  if (!open) return null;

  const scratch = cards.find((c) => c.id === "scratch");
  const storyboard = cards.find((c) => c.id === "storyboard");
  const mainCards = cards.filter(
    (c) => c.id !== "scratch" && c.id !== "storyboard",
  );

  return (
    <div
      className="absolute inset-0 z-40 flex items-center justify-center p-2 sm:p-3"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ultra2-workflow-title"
    >
      <UltraCanvasWaveBg intensity="picker" />
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/25 via-transparent to-slate-950/40" />

      <div className="relative z-10 max-h-[min(82vh,560px)] w-full max-w-2xl overflow-y-auto rounded-xl border border-white/12 bg-slate-950/55 p-3 shadow-[0_0_48px_rgba(34,211,238,0.08)] backdrop-blur-md ring-1 ring-fuchsia-400/15 sm:max-h-[min(78vh,600px)] sm:p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2
              id="ultra2-workflow-title"
              className="text-base font-semibold tracking-tight text-white sm:text-lg"
            >
              {title}
            </h2>
            <p className="mt-0.5 line-clamp-1 text-[11px] text-slate-400 sm:text-xs">
              {subtitle}
            </p>
          </div>
          {onContinue && continueLabel ? (
            <button
              type="button"
              onClick={onContinue}
              className="shrink-0 rounded-md border border-cyan-400/55 bg-cyan-950/50 px-2.5 py-1 text-[10px] font-semibold text-cyan-50 hover:bg-cyan-900/60"
            >
              {continueLabel}
            </button>
          ) : null}
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {storyboard ? (
            <CardShell
              card={storyboard}
              featured
              useWorkflowLabel={useWorkflowLabel}
              recommendedLabel={recommendedLabel}
              onPick={onPick}
            />
          ) : null}
          {mainCards.map((card) => (
            <CardShell
              key={card.id}
              card={card}
              useWorkflowLabel={useWorkflowLabel}
              recommendedLabel={recommendedLabel}
              onPick={onPick}
            />
          ))}
        </div>

        {scratch ? (
          <CardShell
            card={scratch}
            useWorkflowLabel={useWorkflowLabel}
            recommendedLabel={recommendedLabel}
            onPick={onPick}
            className="group mt-2 flex w-full flex-col rounded-lg border border-cyan-400/35 bg-slate-950/45 p-2.5 text-left transition hover:border-cyan-300/55 hover:bg-cyan-950/20 sm:p-3"
          />
        ) : null}

        <div className="mt-2.5">
          <button
            type="button"
            onClick={() => setLoadOpen((v) => !v)}
            aria-expanded={loadOpen}
            className="flex w-full items-center justify-between gap-2 rounded-lg border border-cyan-400/45 bg-gradient-to-r from-cyan-950/50 to-fuchsia-950/35 px-3 py-2 text-left transition hover:border-cyan-300/60 hover:from-cyan-950/65 hover:to-fuchsia-950/45"
          >
            <span className="min-w-0">
              <span className="block text-[13px] font-semibold text-cyan-50">
                {loadTitle}
              </span>
              <span className="mt-0.5 block truncate text-[10px] text-slate-400">
                {loadHint}
              </span>
            </span>
            <span
              className={`shrink-0 text-cyan-200/90 transition-transform ${loadOpen ? "rotate-180" : ""}`}
              aria-hidden
            >
              ▾
            </span>
          </button>

          {loadOpen ? (
            <div className="mt-1.5 max-h-28 space-y-0.5 overflow-y-auto rounded-lg border border-cyan-400/20 bg-slate-950/65 p-1.5">
              {boardsLoading ? (
                <p className="px-2 py-1.5 text-[11px] text-slate-500">…</p>
              ) : boards.length === 0 ? (
                <p className="px-2 py-1.5 text-[11px] text-slate-500">{loadEmpty}</p>
              ) : (
                boards.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => onLoadBoard(b.id)}
                    className="flex w-full items-center justify-between gap-2 rounded-md border border-transparent px-2 py-1.5 text-left hover:border-cyan-400/35 hover:bg-cyan-950/35"
                  >
                    <span className="truncate text-xs font-medium text-slate-100">
                      {b.name || b.id}
                    </span>
                    <span className="shrink-0 text-[10px] text-slate-500">
                      {new Date(b.updatedAt).toLocaleDateString()}
                    </span>
                  </button>
                ))
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
