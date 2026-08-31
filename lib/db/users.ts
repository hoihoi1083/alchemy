import { FREE_SIGNUP_GRANT_TOKENS, normalizeUserPlan } from "@/lib/billing/plans";
import { ensureSignupGrant } from "@/lib/billing/ledger";
import {
  emailAlreadyClaimedSignupGrant,
  markSignupGrantClaimedWithoutCredit,
  mergeEmailDuplicatesInto,
  normalizeEmail,
  tryReserveSignupGrantForEmail,
} from "@/lib/db/email-identity";
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
  const emailNormalized = normalizeEmail(input.email);

  const existing = await db.collection<DbUser>("users").findOne({
    clerkId: input.clerkId,
  });
  const keepSuperseded =
    Boolean(existing?.supersededBy) &&
    existing!.supersededBy !== input.clerkId;

  // Upsert without emailNormalized first so a duplicate active email cannot
  // trip the unique partial index before merge runs.
  const result = await db.collection<DbUser>("users").findOneAndUpdate(
    { clerkId: input.clerkId },
    {
      $set: {
        email: input.email,
        name: input.name,
        imageUrl: input.imageUrl,
        region,
        updatedAt: now,
        ...(keepSuperseded
          ? {}
          : { supersededBy: null, supersededAt: null }),
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

  // Soft identity guard: fold other active rows with the same email into us.
  // Skip when this clerkId was already merged away — avoid ping-pong merges.
  if (emailNormalized && !keepSuperseded) {
    await mergeEmailDuplicatesInto({
      clerkId: input.clerkId,
      emailNormalized,
    });
    await db.collection<DbUser>("users").updateOne(
      { clerkId: input.clerkId },
      { $set: { emailNormalized, updatedAt: new Date() } },
    );
  }

  const afterMerge = await db.collection<DbUser>("users").findOne({
    clerkId: input.clerkId,
  });
  if (!afterMerge) throw new Error("Failed to load user after email merge");

  const plan = normalizeUserPlan(afterMerge.plan);
  if (afterMerge.plan !== plan) {
    await db.collection<DbUser>("users").updateOne(
      { clerkId: input.clerkId },
      { $set: { plan, updatedAt: now } },
    );
  }

  // One-time Free pack only — never again for the same email / clerkId.
  // Superseded identities must not claim or re-trigger signup grants.
  let signupBalance: number | null = null;
  if (!keepSuperseded) {
    const alreadyClaimed = await emailAlreadyClaimedSignupGrant(emailNormalized);
    const reserved = alreadyClaimed
      ? false
      : await tryReserveSignupGrantForEmail(emailNormalized, input.clerkId);
    if (alreadyClaimed || !reserved) {
      await markSignupGrantClaimedWithoutCredit(input.clerkId);
    } else {
      signupBalance = await ensureSignupGrant(input.clerkId);
      // If clerk-level grant no-op'd (e.g. balance already > 0), keep the email
      // claim so a later zero-balance re-login cannot farm another pack.
      if (signupBalance == null && emailNormalized) {
        await markSignupGrantClaimedWithoutCredit(input.clerkId);
      }
    }
    if (signupBalance != null && input.email) {
      await sendWelcomeEmail({
        to: input.email,
        tokensGranted: FREE_SIGNUP_GRANT_TOKENS,
      });
    }
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
