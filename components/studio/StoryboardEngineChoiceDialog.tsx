"use client";

import Link from "next/link";
import { useLocale } from "@/components/LocaleProvider";

export type StoryboardEngineChoice = {
  balance: number;
  h3Cost: number;
  klingCost: number;
};

export function StoryboardEngineChoiceDialog({
  choice,
  onKling,
  onDismiss,
}: {
  choice: StoryboardEngineChoice;
  onKling: () => void;
  onDismiss: () => void;
}) {
  const { m } = useLocale();
  const body = m.errors.storyboardEngineChoiceBody
    .replace("{single}", String(choice.h3Cost))
    .replace("{balance}", String(choice.balance))
    .replace("{stitch}", String(choice.klingCost));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="storyboard-engine-choice-title"
    >
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <h2
          id="storyboard-engine-choice-title"
          className="text-lg font-semibold text-slate-900"
        >
          {m.errors.storyboardEngineChoiceTitle}
        </h2>
        <p className="mt-2 text-sm text-slate-600">{body}</p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <button
            type="button"
            onClick={onKling}
            className="inline-flex rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500"
          >
            {m.errors.storyboardEngineChoiceKling}
          </button>
          <Link
            href="/pricing"
            className="inline-flex rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            {m.errors.storyboardEngineChoiceH3}
          </Link>
          <button
            type="button"
            onClick={onDismiss}
            className="inline-flex rounded-xl px-4 py-2.5 text-sm font-medium text-slate-500 hover:text-slate-800"
          >
            {m.errors.insufficientTokensDismiss}
          </button>
        </div>
      </div>
    </div>
  );
}
