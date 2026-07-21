import { NextResponse } from "next/server";
import { isEmailConfigured } from "@/lib/email/resend";
import { ensureIndexes, isMongoConfigured } from "@/lib/mongodb";
import { isMongoReady, mongoRequiredErrorMessage } from "@/lib/mongodb-production";

export const runtime = "nodejs";

let indexesReady: Promise<void> | null = null;

function indexesOnce(): Promise<void> {
  if (!indexesReady) {
    indexesReady = ensureIndexes().catch((err) => {
      indexesReady = null;
      throw err;
    });
  }
  return indexesReady;
}

export async function GET() {
  if (!isMongoReady()) {
    return NextResponse.json(
      {
        ok: false,
        configured: isMongoConfigured(),
        error: mongoRequiredErrorMessage(),
        code: "MONGODB_URI_MISSING",
      },
      { status: 503 },
    );
  }

  const emailConfigured = isEmailConfigured();
  const isProd =
    process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production";

  try {
    await indexesOnce();
    const body: {
      ok: true;
      configured: true;
      database: string;
      emailConfigured: boolean;
      warning?: string;
    } = {
      ok: true,
      configured: true,
      database: "alchemy",
      emailConfigured,
    };
    if (isProd && !emailConfigured) {
      body.warning =
        "RESEND_API_KEY not configured — purchase/lifecycle emails will be skipped";
    }
    return NextResponse.json(body);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Database connection failed";
    // Indexes can fail while Mongo is still usable for reads/writes — don't
    // pretend MONGODB_URI is missing (the studio banner used to look that way).
    return NextResponse.json(
      {
        ok: false,
        configured: true,
        error: message,
        code: "MONGODB_INDEX_OR_CONNECT",
        emailConfigured,
      },
      { status: 500 },
    );
  }
}
