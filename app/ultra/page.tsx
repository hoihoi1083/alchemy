import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { ProPageClient } from "@/components/ProPageClient";
import {
  assertProCanvasAllowed,
  PlanEntitlementError,
} from "@/lib/billing/entitlements";
import { getUserPlan } from "@/lib/billing/get-user-plan";
import { isMongoConfigured } from "@/lib/mongodb";
import {
  PRICING_ULTRA_CANVAS_HREF,
  ULTRA_CANVAS_PATH,
} from "@/lib/ultra-canvas-path";

export default async function UltraCanvasPage() {
  const session = await auth();
  if (!session.userId) {
    redirect(`/sign-in?redirect_url=${encodeURIComponent(ULTRA_CANVAS_PATH)}`);
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

  return <ProPageClient />;
}
