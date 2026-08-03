import { NextResponse } from "next/server";
import { requireAppUser } from "@/lib/require-app-user";
import { isEmailConfigured } from "@/lib/email/resend";
import { ensureIndexes, isMongoConfigured } from "@/lib/mongodb";
import { isMongoReady, mongoRequiredErrorMessage } from "@/lib/mongodb-production";
import { isR2Configured } from "@/lib/storage/r2";
import { isR2Ready, isR2Required, r2RequiredErrorMessage } from "@/lib/r2-production";

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
  const auth = await requireAppUser();
  if (!auth.ok) return auth.response;

  const r2Configured = isR2Configured();
  const emailConfigured = isEmailConfigured();
  const isProd =
    process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production";

  if (!isMongoReady()) {
    return NextResponse.json(
      {
        ok: false,
        configured: isMongoConfigured(),
        r2Configured,
        r2Ready: isR2Ready(),
        emailConfigured,
        error: mongoRequiredErrorMessage(),
        code: "MONGODB_URI_MISSING",
      },
      { status: 503 },
    );
  }

  if (!isR2Ready()) {
    return NextResponse.json(
      {
        ok: false,
        configured: true,
        r2Configured,
        r2Ready: false,
        emailConfigured,
        error: r2RequiredErrorMessage(),
        code: "R2_MISSING",
      },
      { status: 503 },
    );
  }

  try {
    await indexesOnce();
    const body: {
      ok: true;
      configured: true;
      database: string;
      emailConfigured: boolean;
      r2Configured: boolean;
      r2Ready: boolean;
      warning?: string;
    } = {
      ok: true,
      configured: true,
      database: "alchemy",
      emailConfigured,
      r2Configured,
      r2Ready: true,
    };
    const warnings: string[] = [];
    if (isProd && !emailConfigured) {
      warnings.push("RESEND_API_KEY not configured — purchase/lifecycle emails will be skipped");
    }
    if (isProd && isR2Required() && !r2Configured) {
      warnings.push(r2RequiredErrorMessage());
    }
    if (warnings.length) body.warning = warnings.join(" · ");
    return NextResponse.json(body);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Database connection failed";
    return NextResponse.json(
      {
        ok: false,
        configured: true,
        r2Configured,
        r2Ready: isR2Ready(),
        error: message,
        code: "MONGODB_INDEX_OR_CONNECT",
        emailConfigured,
      },
      { status: 500 },
    );
  }
}
