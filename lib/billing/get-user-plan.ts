import { normalizeUserPlan, type UserPlan } from "@/lib/billing/plans";
import type { DbUser } from "@/lib/db/types";
import { getDb, isMongoConfigured } from "@/lib/mongodb";
import { isProductionEnv } from "@/lib/mongodb-production";

/**
 * Server-only: resolve plan from Mongo for the signed-in Clerk user.
 * In production, Mongo must be configured — never silently treat everyone as free.
 */
export async function getUserPlan(clerkId: string): Promise<UserPlan> {
  if (!isMongoConfigured()) {
    if (isProductionEnv()) {
      throw new Error("MONGODB_URI is required in production to resolve user plan.");
    }
    return "free";
  }
  const db = await getDb();
  const user = await db.collection<DbUser>("users").findOne({ clerkId });
  return normalizeUserPlan(user?.plan);
}
