import { FREE_SIGNUP_GRANT_TOKENS, normalizeUserPlan } from "@/lib/billing/plans";
import { ensureSignupGrant } from "@/lib/billing/ledger";
import { sendWelcomeEmail } from "@/lib/email/lifecycle";
import { getDb } from "@/lib/mongodb";
import type { DbUser } from "@/lib/db/types";

export async function ensureUser(input: {
  clerkId: string;
  email: string | null;
  name: string | null;
  imageUrl: string | null;
}): Promise<DbUser> {
  const db = await getDb();
  const now = new Date();
  const region = process.env.REGION === "cn" ? "cn" : "hk";

  const result = await db.collection<DbUser>("users").findOneAndUpdate(
    { clerkId: input.clerkId },
    {
      $set: {
        email: input.email,
        name: input.name,
        imageUrl: input.imageUrl,
        region,
        updatedAt: now,
      },
      $setOnInsert: {
        clerkId: input.clerkId,
        creditBalance: 0,
        plan: "free",
        createdAt: now,
      },
    },
    { upsert: true, returnDocument: "after" },
  );

  if (!result) {
    throw new Error("Failed to upsert user");
  }

  const plan = normalizeUserPlan(result.plan);
  if (result.plan !== plan) {
    await db.collection<DbUser>("users").updateOne(
      { clerkId: input.clerkId },
      { $set: { plan, updatedAt: now } },
    );
  }

  // One-time Free pack (ledger row written inside ensureSignupGrant).
  const signupBalance = await ensureSignupGrant(input.clerkId);
  if (signupBalance != null && input.email) {
    await sendWelcomeEmail({
      to: input.email,
      tokensGranted: FREE_SIGNUP_GRANT_TOKENS,
    });
  }

  const fresh = await db.collection<DbUser>("users").findOne({ clerkId: input.clerkId });
  if (!fresh) throw new Error("Failed to load user after signup grant");
  return { ...fresh, plan: normalizeUserPlan(fresh.plan) };
}

export async function recordUsage(
  clerkId: string,
  kind: "image" | "video" | "plan" | "campaign" | "storyboard" | "music" | "voiceover",
): Promise<void> {
  const db = await getDb();
  await db.collection("usage_events").insertOne({
    clerkId,
    kind,
    createdAt: new Date(),
  });
}
