import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { UltraDescribePageClient } from "@/components/UltraDescribePageClient";
import {
  assertProCanvasAllowed,
  PlanEntitlementError,
} from "@/lib/billing/entitlements";
import { getUserPlan } from "@/lib/billing/get-user-plan";
import { isMongoConfigured } from "@/lib/mongodb";
import {
  PRICING_ULTRA_CANVAS_HREF,
  ULTRA_CANVAS_2_PATH,
} from "@/lib/ultra-canvas-path";

/** Describe-first Ultra lab — leave /ultra workflow cards untouched. */
export default async function UltraDescribePage() {
  const session = await auth();
  if (!session.userId) {
    redirect(`/sign-in?redirect_url=${encodeURIComponent(ULTRA_CANVAS_2_PATH)}`);
  }

  if (!isMongoConfigured()) {
    redirect(PRICING_ULTRA_CANVAS_HREF);
  }

  try {
    const plan = await getUserPlan(session.userId);
    assertProCanvasAllowed(plan);
  } catch (err) {
    if (err instanceof PlanEntitlementError) {
      redirect(PRICING_ULTRA_CANVAS_HREF);
    }
    throw err;
  }

  return <UltraDescribePageClient />;
}
