import type { DbUser } from "@/lib/db/types";
import { getDb, isMongoConfigured } from "@/lib/mongodb";

/** Prefer app user email; fall back to Stripe customer_details / customer_email. */
export async function resolvePurchaseEmail(opts: {
  clerkId: string;
  stripeEmail?: string | null;
}): Promise<string | null> {
  if (isMongoConfigured()) {
    const db = await getDb();
    const user = await db.collection<DbUser>("users").findOne({ clerkId: opts.clerkId });
    const fromDb = user?.email?.trim();
    if (fromDb) return fromDb;
  }
  const fromStripe = opts.stripeEmail?.trim();
  return fromStripe || null;
}
