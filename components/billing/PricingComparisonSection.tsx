"use client";

import { useState } from "react";

export const COMPARE_PLAN_KEYS = [
  "free",
  "light",
  "standard",
  "pro",
  "master",
  "custom",
] as const;

export type ComparePlanKey = (typeof COMPARE_PLAN_KEYS)[number];

export type ComparisonRow = {
  feature: string;
  free: string;
  light?: string;
  standard: string;
  pro: string;
  master: string;
  custom: string;
};

function compareRowKind(row: ComparisonRow, index: number): "capacity" | "tokens" | "default" {
  if (index === 2) return "capacity";
  if (index === 0) return "tokens";
  if (/output|產能|产能|typical/i.test(row.feature)) return "capacity";
  return "default";
}

function compareCellValue(row: ComparisonRow, key: ComparePlanKey): string {
  if (key === "light") return row.light ?? "—";
  return row[key];
}

function CompareValue({
  value,
  kind,
  highlight,
  align = "center",
}: {
  value: string;
  kind: "capacity" | "tokens" | "default";
  highlight?: boolean;
  align?: "left" | "center" | "right";
}) {
  const trimmed = value.trim();
  const alignClass =
    align === "right" ? "text-right" : align === "left" ? "text-left" : "text-center";

  if (trimmed === "✓") {
    return (
      <span
        className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-sm font-semibold ${
          highlight ? "bg-violet-100 text-violet-700" : "bg-emerald-50 text-emerald-600"
        } ${align === "right" ? "ml-auto" : align === "left" ? "mr-auto" : "mx-auto"}`}
      >
        ✓
      </span>
    );
  }
  if (trimmed === "—" || trimmed === "-") {
    return <span className={`text-base text-slate-300 ${alignClass}`}>—</span>;
  }
  if (kind === "capacity") {
    const parts = trimmed.split(/\s或\s|\sor\s/i);
    if (parts.length === 2) {
      return (
        <div
          className={`${alignClass} text-[11px] leading-snug sm:text-xs ${
            highlight ? "text-violet-900" : "text-slate-600"
          } ${align === "center" ? "mx-auto max-w-[10.5rem]" : "max-w-none"}`}
        >
          <p>{parts[0].trim()}</p>
          <p className={`mt-1 ${highlight ? "text-violet-700/80" : "text-slate-500"}`}>
            {parts[1].trim()}
          </p>
        </div>
      );
    }
  }
  return (
    <span
      className={`inline-block text-xs leading-snug sm:text-sm ${alignClass} ${
        highlight ? "font-medium text-violet-900" : "text-slate-600"
      } ${kind === "tokens" ? "whitespace-nowrap" : ""}`}
    >
      {value}
    </span>
  );
}

type PricingComparisonSectionProps = {
  compareFeature: string;
  compareScrollHint?: string;
  plans: Record<ComparePlanKey, { name: string }>;
  rows: readonly ComparisonRow[];
};

/** Desktop table + mobile plan picker — shared by /pricing. */
export function PricingComparisonSection({
  compareFeature,
  compareScrollHint = "← scroll →",
  plans,
  rows,
}: PricingComparisonSectionProps) {
  const [mobilePlan, setMobilePlan] = useState<ComparePlanKey>("pro");

  return (
    <div className="relative mt-6">
      {/* Mobile: pick one plan, vertical feature list (no sideways scroll). */}
      <div className="md:hidden">
        <div
          className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [-webkit-overflow-scrolling:touch]"
          role="tablist"
          aria-label={compareFeature}
        >
          {COMPARE_PLAN_KEYS.map((key) => {
            const selected = mobilePlan === key;
            const isPro = key === "pro";
            return (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setMobilePlan(key)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  selected
                    ? isPro
                      ? "bg-violet-600 text-white"
                      : "bg-slate-900 text-white"
                    : "border border-slate-200 bg-white text-slate-700"
                }`}
              >
                {plans[key].name}
              </button>
            );
          })}
        </div>

        <article
          className={`mt-3 rounded-2xl border bg-white p-4 shadow-sm ${
            mobilePlan === "pro" ? "border-violet-200 ring-1 ring-violet-100" : "border-slate-200"
          }`}
        >
          <h3
            className={`text-base font-semibold ${
              mobilePlan === "pro" ? "text-violet-800" : "text-slate-900"
            }`}
          >
            {plans[mobilePlan].name}
          </h3>
          <dl className="mt-3 divide-y divide-slate-100">
            {rows.map((row, i) => (
              <div
                key={row.feature}
                className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"
              >
                <dt className="min-w-0 flex-1 text-xs font-medium leading-snug text-slate-700 sm:text-sm">
                  {row.feature}
                </dt>
                <dd className="shrink-0 max-w-[48%]">
                  <CompareValue
                    value={compareCellValue(row, mobilePlan)}
                    kind={compareRowKind(row, i)}
                    highlight={mobilePlan === "pro"}
                    align="right"
                  />
                </dd>
              </div>
            ))}
          </dl>
        </article>
      </div>

      {/* Tablet/desktop: sticky feature column + horizontal scroll if needed. */}
      <div
        className="compare-table-scroll hidden overflow-x-auto rounded-2xl border border-violet-100 bg-white shadow-sm md:block [-webkit-overflow-scrolling:touch]"
        aria-label={compareFeature}
      >
        <table className="w-full min-w-[68rem] border-separate border-spacing-0 text-left text-sm">
          <thead>
            <tr className="border-b border-violet-100 bg-violet-50/90">
              <th className="sticky left-0 z-30 min-w-[10.5rem] max-w-[12rem] border-r border-violet-100 bg-violet-50/95 px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 backdrop-blur-sm">
                {compareFeature}
              </th>
              {COMPARE_PLAN_KEYS.map((key) => {
                const isPro = key === "pro";
                return (
                  <th
                    key={key}
                    className={`min-w-[7.25rem] px-2 py-3.5 text-center text-sm font-semibold sm:min-w-[8rem] sm:px-3 ${
                      isPro
                        ? "bg-violet-100/80 text-violet-800"
                        : key === "custom"
                          ? "text-slate-900"
                          : "text-slate-700"
                    }`}
                  >
                    {plans[key].name}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const kind = compareRowKind(row, i);
              const stripe = i % 2 === 0 ? "bg-white" : "bg-slate-50/70";
              return (
                <tr key={row.feature} className={`border-b border-slate-100 last:border-0 ${stripe}`}>
                  <th
                    scope="row"
                    className={`sticky left-0 z-20 min-w-[10.5rem] max-w-[12rem] border-r border-slate-100 px-4 py-3.5 text-left text-xs font-medium leading-snug text-slate-800 sm:text-sm ${stripe} backdrop-blur-sm`}
                  >
                    {row.feature}
                  </th>
                  {COMPARE_PLAN_KEYS.map((key) => {
                    const isPro = key === "pro";
                    const value = compareCellValue(row, key);
                    return (
                      <td
                        key={key}
                        className={`min-w-[7.25rem] px-2 py-3.5 text-center align-middle sm:min-w-[8rem] sm:px-3 ${
                          isPro ? "bg-violet-50/60" : ""
                        }`}
                      >
                        <CompareValue value={value} kind={kind} highlight={isPro} />
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 hidden text-center text-[11px] text-slate-400 md:block lg:hidden">
        {compareScrollHint}
      </p>
    </div>
  );
}
