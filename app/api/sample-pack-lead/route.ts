import { NextResponse } from "next/server";
import { normalizeEmail } from "@/lib/db/email-identity";
import { getDb, isMongoConfigured } from "@/lib/mongodb";

export const runtime = "nodejs";

type Body = {
  name?: string;
  email?: string;
  tipsOptIn?: boolean;
  /** Honeypot — must stay empty. */
  company?: string;
  locale?: string;
  utmSource?: string;
  utmCampaign?: string;
};

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 200;
}

export async function POST(request: Request) {
  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  // Bot honeypot
  if (typeof body.company === "string" && body.company.trim()) {
    return NextResponse.json({ ok: true });
  }

  const name = (body.name ?? "").trim().slice(0, 80);
  const emailRaw = (body.email ?? "").trim().slice(0, 200);
  const emailNormalized = normalizeEmail(emailRaw);

  if (name.length < 1) {
    return NextResponse.json({ error: "name_required" }, { status: 400 });
  }
  if (!emailNormalized || !isValidEmail(emailRaw)) {
    return NextResponse.json({ error: "email_invalid" }, { status: 400 });
  }

  if (!isMongoConfigured()) {
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }

  const db = await getDb();
  const col = db.collection("sample_pack_leads");
  await col.createIndex({ emailNormalized: 1 }, { unique: true });
  await col.createIndex({ createdAt: -1 });

  const now = new Date();
  const tipsOptIn = body.tipsOptIn === true;
  const doc = {
    name,
    email: emailRaw,
    emailNormalized,
    tipsOptIn,
    locale: typeof body.locale === "string" ? body.locale.slice(0, 16) : null,
    utmSource:
      typeof body.utmSource === "string" ? body.utmSource.slice(0, 64) : null,
    utmCampaign:
      typeof body.utmCampaign === "string"
        ? body.utmCampaign.slice(0, 64)
        : null,
    createdAt: now,
    updatedAt: now,
  };

  try {
    await col.updateOne(
      { emailNormalized },
      {
        $set: {
          name: doc.name,
          email: doc.email,
          tipsOptIn: doc.tipsOptIn,
          locale: doc.locale,
          utmSource: doc.utmSource,
          utmCampaign: doc.utmCampaign,
          updatedAt: now,
        },
        $setOnInsert: {
          emailNormalized,
          createdAt: now,
        },
      },
      { upsert: true },
    );
  } catch (err) {
    console.error("[sample-pack-lead] write failed", err);
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
