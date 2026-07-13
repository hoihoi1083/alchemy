import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { ensureUser, recordUsage } from "@/lib/db/users";
import { isMongoConfigured } from "@/lib/mongodb";

export type AppUser = {
  userId: string;
};

export type RequireAppUserResult =
  | { ok: true; user: AppUser }
  | { ok: false; response: NextResponse };

export async function requireAppUser(): Promise<RequireAppUserResult> {
  const { userId } = await auth();
  if (!userId) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  if (isMongoConfigured()) {
    // Profile enrichment is best-effort. currentUser() hits Clerk's backend API
    // (unlike auth(), which only reads the local JWT) and can fail transiently
    // under bursty parallel requests. A failure here must not break an already
    // authenticated request, so keep the whole block inside try/catch.
    try {
      const clerkUser = await currentUser();
      await ensureUser({
        clerkId: userId,
        email: clerkUser?.emailAddresses[0]?.emailAddress ?? null,
        name: clerkUser?.fullName ?? null,
        imageUrl: clerkUser?.imageUrl ?? null,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      // Clerk currentUser() can fail transiently under parallel requests — auth still valid.
      if (process.env.NODE_ENV === "development") {
        console.warn("[requireAppUser] user sync skipped (non-fatal):", message);
      }
    }
  }

  return { ok: true, user: { userId } };
}

export async function trackUsage(
  userId: string,
  kind: Parameters<typeof recordUsage>[1],
): Promise<void> {
  if (!isMongoConfigured()) return;
  await recordUsage(userId, kind);
}
