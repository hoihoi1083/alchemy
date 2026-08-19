"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { useLocale } from "@/components/LocaleProvider";
import { canUseProCanvas } from "@/lib/billing/entitlements";
import { normalizeUserPlan } from "@/lib/billing/plans";

export const PRICING_MASTER_PLAN_HREF = "/pricing?plan=master&feature=pro-canvas";

type ProNavLinkProps = {
  className?: string;
  onClick?: () => void;
};

/** Header Pro canvas — Master plan unlocks /pro; others land on pricing with Master highlighted. */
export function ProNavLink({ className, onClick }: ProNavLinkProps) {
  const { m } = useLocale();
  const L = m.landing;
  const { isSignedIn, isLoaded } = useAuth();
  const [hasPro, setHasPro] = useState(false);

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

  const href = hasPro ? "/pro" : PRICING_MASTER_PLAN_HREF;
  const label = hasPro ? L.navProCanvasUnlocked : L.navProCanvas;

  return (
    <Link href={href} className={className} onClick={onClick} title={hasPro ? undefined : L.navProCanvas}>
      {label}
    </Link>
  );
}
