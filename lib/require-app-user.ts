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
    const clerkUser = await currentUser();
    try {
      await ensureUser({
        clerkId: userId,
        email: clerkUser?.emailAddresses[0]?.emailAddress ?? null,
        name: clerkUser?.fullName ?? null,
        imageUrl: clerkUser?.imageUrl ?? null,
      });
    } catch (err) {
      console.error("[requireAppUser] MongoDB sync failed:", err);
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
