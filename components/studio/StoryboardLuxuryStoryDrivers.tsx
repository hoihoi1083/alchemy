"use client";

import { useLocale } from "@/components/LocaleProvider";
import {
  LUXURY_FIELD_BADGE_CLASS,
  luxuryStoryFieldLabel,
  type LuxuryStoryFieldKey,
  type LuxuryStoryFieldLabels,
} from "@/lib/storyboard-luxury-fields";

export function StoryboardLuxuryStoryDrivers({
  variant = "light",
  fieldLabels,
}: {
  variant?: "light" | "dark";
  /** When set, list items show the same labels as the highlighted form fields. */
  fieldLabels?: LuxuryStoryFieldLabels;
}) {
  const { m } = useLocale();
  const d = m.wizard.storyboardRecipeLuxuryDrivers;
  const dark = variant === "dark";

  const labels: LuxuryStoryFieldLabels =
    fieldLabels ??
    ({
      storyboardBrief: m.wizard.storyboardBriefLabel,
      product: m.wizard.productLabelRequired,
      productPhoto: m.microWizard.preGenerateSetup.mainPhotoRowLabel,
      headline: m.microWizard.preGenerateSetup.hookLabel,
      subline: m.microWizard.preGenerateSetup.supportingLabel,
      promptExtra: m.microWizard.preGenerateSetup.extraLabel,
      artStyle: m.wizard.artStyleLabel,
    } satisfies LuxuryStoryFieldLabels);

  return (
    <div
      className={`rounded-xl border px-3 py-3 ${
        dark
          ? "border-amber-400/40 bg-amber-950/35"
          : "border-amber-300 bg-amber-50"
      }`}
      role="note"
    >
      <p
        className={`text-xs font-bold ${
          dark ? "text-amber-100" : "text-amber-950"
        }`}
      >
        {d.title}
      </p>
      <p
        className={`mt-1 text-[11px] leading-relaxed ${
          dark ? "text-amber-100/90" : "text-amber-900/90"
        }`}
      >
        {d.intro}
      </p>
      <ul className="mt-2 space-y-2">
        {d.items.map((item) => {
          const field = item.field as LuxuryStoryFieldKey;
          const fieldName = luxuryStoryFieldLabel(field, labels);
          const priority =
            item.priority === "primary" ? d.priorityPrimary : d.prioritySecondary;
          return (
            <li
              key={field}
              className={`rounded-lg border px-2.5 py-2 text-[11px] leading-snug ${
                dark
                  ? "border-amber-500/30 bg-amber-950/20"
                  : "border-amber-200 bg-white/80"
              }`}
            >
              <div className="flex flex-wrap items-center gap-1.5">
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                    item.priority === "primary"
                      ? dark
                        ? "bg-amber-400/25 text-amber-100"
                        : "bg-amber-200 text-amber-950"
                      : dark
                        ? "bg-amber-900/50 text-amber-200/80"
                        : "bg-amber-100/80 text-amber-800"
                  }`}
                >
                  {priority}
                </span>
                <span
                  className={`font-semibold ${
                    dark ? "text-amber-50" : "text-amber-950"
                  }`}
                >
                  {fieldName}
                </span>
                {"section" in item && item.section ? (
                  <span
                    className={`text-[10px] ${
                      dark ? "text-amber-200/70" : "text-amber-800/70"
                    }`}
                  >
                    ({item.section})
                  </span>
                ) : null}
              </div>
              <p
                className={`mt-1 ${
                  dark ? "text-amber-100/85" : "text-amber-900/85"
                }`}
              >
                {item.hint}
              </p>
            </li>
          );
        })}
      </ul>
      <p
        className={`mt-2 text-[10px] leading-snug ${
          dark ? "text-amber-200/75" : "text-amber-800/80"
        }`}
      >
        {d.footnote}
      </p>
    </div>
  );
}

export function LuxuryFieldBadge({ label }: { label: string }) {
  return <span className={LUXURY_FIELD_BADGE_CLASS}>{label}</span>;
}
