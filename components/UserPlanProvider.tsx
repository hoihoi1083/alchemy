"use client";

import { useAuth } from "@clerk/nextjs";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
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
  /** Re-fetch /api/me (e.g. after checkout). Shares in-flight requests. */
  refreshPlan: () => void;
};

type MePayload = {
  user?: {
    plan?: string | null;
    effectivePlan?: string | null;
    creditBalance?: number | null;
  } | null;
};

type UserPlanContextValue = UserPlanEntitlements;

const UserPlanContext = createContext<UserPlanContextValue | null>(null);

/** Deduplicate concurrent /api/me calls across provider + legacy callers. */
let sharedMeInflight: Promise<MePayload | null> | null = null;

export function fetchSharedMe(): Promise<MePayload | null> {
  if (sharedMeInflight) return sharedMeInflight;
  sharedMeInflight = fetch("/api/me")
    .then(async (res) => {
      if (!res.ok) return null;
      return (await res.json()) as MePayload;
    })
    .catch(() => null)
    .finally(() => {
      sharedMeInflight = null;
    });
  return sharedMeInflight;
}

function applyMePayload(
  data: MePayload | null,
  setPlan: (p: UserPlan) => void,
  setCreditBalance: (n: number | null) => void,
) {
  if (!data?.user) {
    setPlan("free");
    setCreditBalance(0);
    return;
  }
  setPlan(normalizeUserPlan(data.user.effectivePlan ?? data.user.plan));
  setCreditBalance(
    typeof data.user.creditBalance === "number" ? data.user.creditBalance : 0,
  );
}

export function UserPlanProvider({ children }: { children: ReactNode }) {
  const { isSignedIn, isLoaded } = useAuth();
  const [plan, setPlan] = useState<UserPlan>("free");
  const [creditBalance, setCreditBalance] = useState<number | null>(null);
  const [planReady, setPlanReady] = useState(false);
  const genRef = useRef(0);

  const load = useCallback(async () => {
    const gen = ++genRef.current;
    const data = await fetchSharedMe();
    if (gen !== genRef.current) return;
    applyMePayload(data, setPlan, setCreditBalance);
  }, []);

  const refreshPlan = useCallback(() => {
    void load();
  }, [load]);

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
    void load().finally(() => {
      if (!cancelled) setPlanReady(true);
    });

    const onCredits = (ev: Event) => {
      const detail = (ev as CustomEvent<{ balance?: unknown }>).detail;
      if (typeof detail?.balance === "number" && Number.isFinite(detail.balance)) {
        setCreditBalance(Math.max(0, Math.round(detail.balance)));
      }
      void load();
    };
    window.addEventListener(CREDITS_EVENT, onCredits);
    return () => {
      cancelled = true;
      window.removeEventListener(CREDITS_EVENT, onCredits);
    };
  }, [isSignedIn, isLoaded, load]);

  const value = useMemo<UserPlanContextValue>(
    () => ({
      plan,
      maxVideoResolution: videoCapForPlan(plan),
      maxImageResolution: imageCapForPlan(plan),
      creditBalance,
      planReady,
      refreshPlan,
    }),
    [plan, creditBalance, planReady, refreshPlan],
  );

  return (
    <UserPlanContext.Provider value={value}>{children}</UserPlanContext.Provider>
  );
}

export function useUserPlanEntitlements(): UserPlanEntitlements {
  const ctx = useContext(UserPlanContext);
  if (!ctx) {
    throw new Error("useUserPlanEntitlements must be used within UserPlanProvider");
  }
  return ctx;
}
