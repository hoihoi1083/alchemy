"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PlanGateDialog } from "@/components/billing/PlanGateDialog";
import { useLocale } from "@/components/LocaleProvider";
import { useUserPlanEntitlements } from "@/hooks/useUserPlanEntitlements";
import {
  IMAGE_RESOLUTION_CAPS,
  type ImageResolutionCap,
} from "@/lib/billing/entitlements";
import {
  canUseImageResolution,
  minPlanForImageResolution,
} from "@/lib/billing/plan-gates";

type Props = {
  value: ImageResolutionCap;
  onChange: (next: ImageResolutionCap) => void;
  accent?: "emerald" | "violet";
  variant?: "light" | "dark";
};

function pillClass(
  active: boolean,
  dark: boolean,
  accent: "emerald" | "violet",
  locked: boolean,
) {
  if (locked) {
    return dark
      ? "cursor-not-allowed border border-dashed border-slate-600 text-slate-500 opacity-70"
      : "cursor-not-allowed border border-dashed border-slate-300 text-slate-400 opacity-80";
  }
  if (active) {
    return accent === "violet" ? "bg-violet-600 text-white" : "bg-emerald-600 text-white";
  }
  return dark
    ? "border border-slate-600 text-slate-200"
    : "border border-slate-300 text-slate-600";
}

export function ImageResolutionPanel({
  value,
  onChange,
  accent = "violet",
  variant = "light",
}: Props) {
  const { m } = useLocale();
  const { plan, maxImageResolution, planReady } = useUserPlanEntitlements();
  const [gateOpen, setGateOpen] = useState(false);
  const [gateRes, setGateRes] = useState<ImageResolutionCap>("2K");
  const dark = variant === "dark";
  const linkClass =
    accent === "violet"
      ? dark
        ? "font-medium text-violet-300 underline-offset-2 hover:underline"
        : "font-medium text-violet-700 underline-offset-2 hover:underline"
      : dark
        ? "font-medium text-emerald-400 underline-offset-2 hover:underline"
        : "font-medium text-emerald-700 underline-offset-2 hover:underline";

  useEffect(() => {
    if (!planReady) return;
    if (!canUseImageResolution(plan, value)) {
      onChange(maxImageResolution === "4K" ? "2K" : maxImageResolution);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- clamp when plan drifts
  }, [maxImageResolution, plan, planReady, value]);

  return (
    <div>
      <p
        className={
          dark
            ? "mb-2 text-xs font-medium text-slate-400"
            : "mb-2 text-xs font-medium text-slate-600"
        }
      >
        {m.wizard.imageSettingsResolution}
      </p>
      <div className="flex flex-wrap gap-2">
        {IMAGE_RESOLUTION_CAPS.map((r) => {
          const allowed = !planReady || canUseImageResolution(plan, r);
          const selected = value === r;
          return (
            <button
              key={r}
              type="button"
              onClick={() => {
                if (!planReady) return;
                if (!allowed) {
                  setGateRes(r);
                  setGateOpen(true);
                  return;
                }
                onChange(r);
              }}
              aria-disabled={!allowed}
              className={`rounded-full px-4 py-2 text-sm font-medium ${pillClass(
                selected,
                dark,
                accent,
                !allowed,
              )}`}
            >
              {r}
            </button>
          );
        })}
      </div>
      {planReady && maxImageResolution === "1K" ? (
        <p className={dark ? "mt-2 text-xs text-slate-400" : "mt-2 text-xs text-slate-500"}>
          {m.wizard.imageResolutionPlanHint.replace("{max}", maxImageResolution)}{" "}
          <Link href="/pricing?plan=master" className={linkClass}>
            {m.wizard.imageResolutionUpgradeLink}
          </Link>
        </p>
      ) : null}
      <PlanGateDialog
        open={gateOpen}
        onClose={() => setGateOpen(false)}
        requiredPlan={minPlanForImageResolution(gateRes)}
        featureLabel={gateRes}
      />
    </div>
  );
}
