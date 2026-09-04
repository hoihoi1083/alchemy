import { NextResponse } from "next/server";
import { requireAppUser } from "@/lib/require-app-user";
import { assertFreeDeepSeekQuota } from "@/lib/rate-limit-deepseek";
import {
  clampBrainstormDurationSec,
  planBrainstormOptions,
} from "@/lib/brainstorm-creative-options";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const auth = await requireAppUser();
  if (!auth.ok) return auth.response;
  const quota = await assertFreeDeepSeekQuota(auth.user.userId);
  if (!quota.ok) return quota.response;

  let body: { idea?: string; durationSec?: number; count?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const idea = body.idea?.trim();
  if (!idea) {
    return NextResponse.json({ error: "idea is required." }, { status: 400 });
  }

  const durationSec = clampBrainstormDurationSec(body.durationSec);

  try {
    const options = await planBrainstormOptions({
      idea,
      durationSec,
      count: body.count,
    });
    return NextResponse.json({ options, durationSec });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Brainstorm failed.";
    const status = message.includes("DEEPSEEK") ? 503 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
