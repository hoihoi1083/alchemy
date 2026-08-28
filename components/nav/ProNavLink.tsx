"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { PlanGateDialog } from "@/components/billing/PlanGateDialog";
import { useLocale } from "@/components/LocaleProvider";
import { canUseProCanvas } from "@/lib/billing/entitlements";
import { normalizeUserPlan } from "@/lib/billing/plans";

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
  const [hasPro, setHasPro] = useState(false);
  const [gateOpen, setGateOpen] = useState(false);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      setHasPro(false);
      return;
    }
    let cancelled = false;
    void fetch("/api/me")
      .then(async (res) => {
        if (!res.ok) return;
        const data = (await res.json()) as {
          user?: { plan?: string | null; effectivePlan?: string | null } | null;
        };
        if (cancelled) return;
        setHasPro(canUseProCanvas(normalizeUserPlan(data.user?.effectivePlan ?? data.user?.plan)));
      })
      .catch(() => {
        /* keep pricing fallback */
      });
    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn]);

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
          if (isSignedIn) {
            e.preventDefault();
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
