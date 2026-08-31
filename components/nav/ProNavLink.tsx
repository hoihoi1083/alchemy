"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { useState } from "react";
import { PlanGateDialog } from "@/components/billing/PlanGateDialog";
import { useLocale } from "@/components/LocaleProvider";
import { useUserPlanEntitlements } from "@/hooks/useUserPlanEntitlements";
import { canUseProCanvas } from "@/lib/billing/entitlements";

import { PRICING_ULTRA_CANVAS_HREF, ULTRA_CANVAS_PATH } from "@/lib/ultra-canvas-path";

export const PRICING_MASTER_PLAN_HREF = PRICING_ULTRA_CANVAS_HREF;

type ProNavLinkProps = {
  className?: string;
  onClick?: () => void;
};

/** Header Ultra canvas — Master+ unlocks /ultra; others see upgrade dialog. */
export function ProNavLink({ className, onClick }: ProNavLinkProps) {
  const { m } = useLocale();
  const L = m.landing;
  const { isSignedIn, isLoaded } = useAuth();
  const { plan, planReady } = useUserPlanEntitlements();
  const [gateOpen, setGateOpen] = useState(false);
  // Until /api/me returns, don't false-gate Master users.
  const hasPro = !planReady || canUseProCanvas(plan);

  const href = hasPro ? ULTRA_CANVAS_PATH : PRICING_MASTER_PLAN_HREF;
  const label = hasPro ? L.navUltraCanvasUnlocked : L.navUltraCanvas;

  if (hasPro) {
    return (
      <Link href={href} className={className} onClick={onClick}>
        {label}
      </Link>
    );
  }

  return (
    <>
      <button
        type="button"
        className={className}
        onClick={(e) => {
          onClick?.();
          if (!isLoaded) return;
          if (isSignedIn) {
            e.preventDefault();
            if (!planReady) return;
            setGateOpen(true);
          } else {
            window.location.href = href;
          }
        }}
        title={L.navUltraCanvas}
      >
        {label}
      </button>
      <PlanGateDialog
        open={gateOpen}
        onClose={() => setGateOpen(false)}
        requiredPlan="master"
        featureLabel={L.navUltraCanvas}
      />
    </>
  );
}
