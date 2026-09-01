"use client";

/**
 * Plan entitlements for UI gating. Shared fetch lives in UserPlanProvider —
 * one /api/me per session load (deduped), not one per component.
 */
export {
  useUserPlanEntitlements,
  type UserPlanEntitlements,
} from "@/components/UserPlanProvider";
