import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { ProPageClient } from "@/components/ProPageClient";
import {
  assertProCanvasAllowed,
  PlanEntitlementError,
} from "@/lib/billing/entitlements";
import { getUserPlan } from "@/lib/billing/get-user-plan";
import { isMongoConfigured } from "@/lib/mongodb";

export default async function ProPage() {
  const session = await auth();
  if (!session.userId) {
    redirect(`/sign-in?redirect_url=${encodeURIComponent("/pro")}`);
  }

  if (isMongoConfigured()) {
    try {
      const plan = await getUserPlan(session.userId);
      assertProCanvasAllowed(plan);
    } catch (err) {
      if (err instanceof PlanEntitlementError) {
        redirect("/pricing?plan=master&feature=pro-canvas");
      }
      throw err;
    }
  }

  return <ProPageClient />;
}
