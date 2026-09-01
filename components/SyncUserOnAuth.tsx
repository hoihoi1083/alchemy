"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useRef } from "react";
import { useUserPlanEntitlements } from "@/components/UserPlanProvider";

/**
 * Ensure Mongo user + signup grant run as soon as Clerk signs in.
 * Uses the shared /api/me path (deduped with UserPlanProvider).
 */
export function SyncUserOnAuth() {
  const { isSignedIn, isLoaded } = useAuth();
  const { refreshPlan } = useUserPlanEntitlements();
  const synced = useRef(false);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || synced.current) return;
    synced.current = true;
    refreshPlan();
  }, [isLoaded, isSignedIn, refreshPlan]);

  useEffect(() => {
    if (!isSignedIn) synced.current = false;
  }, [isSignedIn]);

  return null;
}
