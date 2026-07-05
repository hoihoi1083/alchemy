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

  return result;
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
