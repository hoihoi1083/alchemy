import { NextResponse } from "next/server";
import { canUseProCanvas } from "@/lib/billing/entitlements";
import { getUserPlan } from "@/lib/billing/get-user-plan";

/** Shared 403 for Ultra canvas (Master+) — API routes used only by /ultra. */
export function ultraCanvasNeedsMasterResponse() {
  return NextResponse.json(
    {
      error: "Ultra canvas requires the Master plan. Upgrade on Pricing to unlock.",
      code: "PLAN_ENTITLEMENT",
      requiredPlan: "master",
      hint: "ultra_canvas_needs_master",
    },
    { status: 403 },
  );
}

/** Returns a 403 response if the user is below Master; otherwise null. */
export async function assertProCanvasAllowedForUser(
  clerkId: string,
): Promise<NextResponse | null> {
  const plan = await getUserPlan(clerkId);
  if (!canUseProCanvas(plan)) {
    return ultraCanvasNeedsMasterResponse();
  }
  return null;
}
