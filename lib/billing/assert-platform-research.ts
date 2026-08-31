import { NextResponse } from "next/server";
import { getUserPlan } from "@/lib/billing/get-user-plan";
import { planMeetsMinimum } from "@/lib/billing/plan-gates";

/** Shared 403 for Platform research (Standard+) — entry + helper routes. */
export function researchNeedsStandardResponse() {
  return NextResponse.json(
    {
      error: "Platform research requires Standard plan or above.",
      code: "PLAN_ENTITLEMENT",
      requiredPlan: "standard",
      hint: "research_needs_standard",
    },
    { status: 403 },
  );
}

/** Returns a 403 response if the user is below Standard; otherwise null. */
export async function assertPlatformResearchAllowed(
  clerkId: string,
): Promise<NextResponse | null> {
  const userPlan = await getUserPlan(clerkId);
  if (!planMeetsMinimum(userPlan, "standard")) {
    return researchNeedsStandardResponse();
  }
  return null;
}
