import { normalizeUserPlan, type UserPlan } from "@/lib/billing/plans";
import type { DbUser } from "@/lib/db/types";
import { getDb, isMongoConfigured } from "@/lib/mongodb";

/** Server-only: resolve plan from Mongo for the signed-in Clerk user. */
export async function getUserPlan(clerkId: string): Promise<UserPlan> {
  if (!isMongoConfigured()) return "free";
  const db = await getDb();
  const user = await db.collection<DbUser>("users").findOne({ clerkId });
  return normalizeUserPlan(user?.plan);
}
