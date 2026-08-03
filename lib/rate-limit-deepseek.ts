import { NextResponse } from "next/server";
import { getDb, isMongoConfigured } from "@/lib/mongodb";

/**
 * Soft daily quota for free DeepSeek routes (plans / assistant / research).
 * Does NOT charge tokens — DeepSeek planning stays free by product choice.
 */
export async function assertFreeDeepSeekQuota(
  clerkId: string,
): Promise<{ ok: true } | { ok: false; response: NextResponse }> {
  const id = clerkId.trim();
  if (!id) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized." }, { status: 401 }),
    };
  }

  // Local / no Mongo: skip (dev convenience). Production always has Mongo.
  if (!isMongoConfigured()) return { ok: true };

  const limitRaw = Number(process.env.DEEPSEEK_DAILY_LIMIT);
  const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.floor(limitRaw) : 80;
  const day = new Date().toISOString().slice(0, 10);

  try {
    const db = await getDb();
    const result = await db.collection<{ clerkId: string; day: string; count: number }>(
      "deepseek_quotas",
    ).findOneAndUpdate(
      { clerkId: id, day },
      {
        $inc: { count: 1 },
        $setOnInsert: { clerkId: id, day, createdAt: new Date() },
        $set: { updatedAt: new Date() },
      },
      { upsert: true, returnDocument: "after" },
    );
    const count = result?.count ?? 1;
    if (count > limit) {
      return {
        ok: false,
        response: NextResponse.json(
          {
            error: `Daily AI planning limit reached (${limit}/day). Try again tomorrow, or continue with manual prompts.`,
            code: "DEEPSEEK_DAILY_LIMIT",
            limit,
            day,
          },
          { status: 429 },
        ),
      };
    }
    return { ok: true };
  } catch (e) {
    // Fail open on quota infra errors so planning isn't bricked — log only.
    console.error("[deepseek-quota]", e);
    return { ok: true };
  }
}
