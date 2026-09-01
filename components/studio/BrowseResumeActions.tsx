"use client";

import type { ReactNode } from "react";
import { useLocale } from "@/components/LocaleProvider";

type Props = {
  continueLabel: string;
  regenerateLabel: string;
  hint: string;
  onContinue: () => void;
  onRegenerate?: () => void;
  regenerateDisabled?: boolean;
  /** Primary button class from the parent panel (pg-/pv-generate-btn). */
  primaryClassName: string;
  /** Extra wrapper class (e.g. mobile gap). */
  className?: string;
  /** Optional block message above the buttons. */
  blockMessage?: ReactNode;
};

/**
 * Dual CTA when the user navigates back after a generation:
 * purple = open existing output (no tokens), outline = generate new (charges).
 */
export function BrowseResumeActions({
  continueLabel,
  regenerateLabel,
  hint,
  onContinue,
  onRegenerate,
  regenerateDisabled,
  primaryClassName,
  className,
  blockMessage,
}: Props) {
  const { m } = useLocale();
  const resume = m.microWizard.resumeCta;

  return (
    <div className={className ?? "flex flex-col gap-2.5"}>
      {blockMessage}
      <button type="button" onClick={onContinue} className={primaryClassName}>
        <span className="flex min-w-0 flex-1 flex-col items-start gap-0.5 text-left">
          <span className="w-full truncate">{continueLabel}</span>
          <span className="text-[11px] font-medium text-white/85">
            {resume.freeBadge}
          </span>
        </span>
        <svg
          viewBox="0 0 20 20"
          className="h-4 w-4 shrink-0"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          aria-hidden
        >
          <path
            d="M7.5 4.5 13 10l-5.5 5.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {onRegenerate ? (
        <button
          type="button"
          onClick={onRegenerate}
          disabled={regenerateDisabled}
          className="flex w-full items-center justify-between gap-2 rounded-xl border border-violet-200 bg-white px-4 py-3 text-left text-sm font-semibold text-slate-800 hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className="flex min-w-0 flex-1 flex-col items-start gap-0.5">
            <span className="w-full truncate">{regenerateLabel}</span>
            <span className="text-[11px] font-medium text-violet-700">
              {resume.paidBadge}
            </span>
          </span>
        </button>
      ) : null}
      <p className="text-xs leading-relaxed text-slate-500">{hint}</p>
    </div>
  );
}
