import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * AI outpaint-to-ratio was removed from Magic Layers (confusing UX / weak quality).
 * Kept as a stub so old clients get a clear 410 instead of a silent fal charge.
 */
export async function POST() {
  return NextResponse.json(
    {
      error:
        "AI outpaint to ratio is no longer available. Use Magic chat for full-image edits, or regenerate at the target ratio in Studio.",
      code: "OUTPAINT_DISABLED",
    },
    { status: 410 },
  );
}
