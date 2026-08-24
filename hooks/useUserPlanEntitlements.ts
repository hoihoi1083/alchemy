"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import {
  imageCapForPlan,
  videoCapForPlan,
  type ImageResolutionCap,
  type VideoResolutionCap,
} from "@/lib/billing/entitlements";
import { normalizeUserPlan, type UserPlan } from "@/lib/billing/plans";
import { CREDITS_EVENT } from "@/lib/credits-client";

export type UserPlanEntitlements = {
  plan: UserPlan;
  maxVideoResolution: VideoResolutionCap;
  maxImageResolution: ImageResolutionCap;
  creditBalance: number | null;
  /** False while signed-in /api/me is in flight (avoids Free false-gates). */
  planReady: boolean;
};

/**
 * Loads signed-in user's plan for UI gating (resolution pills, etc.).
 * Falls back to free until /api/me returns.
 */
export function useUserPlanEntitlements(): UserPlanEntitlements {
  const { isSignedIn, isLoaded } = useAuth();
  const [plan, setPlan] = useState<UserPlan>("free");
  const [creditBalance, setCreditBalance] = useState<number | null>(null);
  const [planReady, setPlanReady] = useState(false);

  useEffect(() => {
    if (!isLoaded) {
      setPlanReady(false);
      return;
    }
    if (!isSignedIn) {
      setPlan("free");
      setCreditBalance(null);
      setPlanReady(true);
      return;
    }
    let cancelled = false;
    setPlanReady(false);
    void fetch("/api/me")
      .then(async (res) => {
        if (!res.ok) return;
        const data = (await res.json()) as {
          user?: { plan?: string | null; effectivePlan?: string | null; creditBalance?: number | null } | null;
        };
        if (cancelled) return;
        setPlan(normalizeUserPlan(data.user?.effectivePlan ?? data.user?.plan));
        setCreditBalance(
          typeof data.user?.creditBalance === "number" ? data.user.creditBalance : 0,
        );
      })
      .catch(() => {
        /* keep free defaults */
      })
      .finally(() => {
        if (!cancelled) setPlanReady(true);
      });

    const onCredits = () => {
      void fetch("/api/me")
        .then(async (res) => {
          if (!res.ok) return;
          const data = (await res.json()) as {
            user?: { plan?: string | null; effectivePlan?: string | null; creditBalance?: number | null } | null;
          };
          if (cancelled) return;
          setPlan(normalizeUserPlan(data.user?.effectivePlan ?? data.user?.plan));
          setCreditBalance(
            typeof data.user?.creditBalance === "number" ? data.user.creditBalance : 0,
          );
        })
        .catch(() => undefined);
    };
    window.addEventListener(CREDITS_EVENT, onCredits);
    return () => {
      cancelled = true;
      window.removeEventListener(CREDITS_EVENT, onCredits);
    };
  }, [isSignedIn, isLoaded]);

  return {
    plan,
    maxVideoResolution: videoCapForPlan(plan),
    maxImageResolution: imageCapForPlan(plan),
    creditBalance,
    planReady,
  };
}
