/**
 * Smoke: welcome + purchase emails, and R2+Mongo durable library asset round-trip.
 *
 *   npx tsx scripts/smoke-durability-and-email.ts [to@email]
 *   Default to: support@alchemyailab.com
 */
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });
loadEnv();

import { PRODUCT_SUPPORT_EMAIL } from "../lib/brand";
import { sendWelcomeEmail } from "../lib/email/lifecycle";
import { sendPurchaseConfirmationEmail } from "../lib/email/purchase-confirmation";
import { isEmailConfigured } from "../lib/email/resend";
import { getDb, isMongoConfigured } from "../lib/mongodb";
import {
  persistAndDurablize,
  readLibraryAssetMedia,
  isLibraryAssetUrl,
} from "../lib/storage/durable-media";
import { isR2Configured } from "../lib/storage/r2";

async function smokeEmails(to: string) {
  console.log("\n=== Email smoke ===");
  if (!isEmailConfigured()) {
    console.error("✗ RESEND_API_KEY missing");
    return false;
  }
  console.log(`→ To: ${to}`);

  const welcome = await sendWelcomeEmail({ to, tokensGranted: 1000 });
  console.log("welcome:", welcome);
  if (!welcome.sent) {
    console.error("✗ Welcome email failed");
    return false;
  }
  console.log("✓ Welcome (signup) email sent");

  const purchase = await sendPurchaseConfirmationEmail({
    to,
    kind: "topup",
    tokensGranted: 1000,
    balanceAfter: 2000,
    amountLabel: "$10.00",
    purchasedAt: new Date(),
  });
  console.log("purchase:", purchase);
  if (!purchase.sent) {
    console.error("✗ Purchase confirmation failed");
    return false;
  }
  console.log("✓ Paid checkout (top-up) email sent");
  return true;
}

async function smokeDurability() {
  console.log("\n=== Durability smoke (R2 + Mongo library URL) ===");
  if (!isMongoConfigured()) {
    console.error("✗ MONGODB_URI missing");
    return false;
  }
  if (!isR2Configured()) {
    console.error("✗ R2 not configured");
    return false;
  }

  const clerkId = `durability_smoke_${Date.now()}`;
  // Minimal 1×1 PNG — persistUserAsset refuses text/html/json/plain on purpose.
  const payload = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64",
  );
  // Fake fal-like source so we exercise mirror path (bytes provided → no fetch).
  const fakeFalUrl = `https://fal.media/files/smoke/durability-${Date.now()}.png`;

  const durableUrl = await persistAndDurablize({
    clerkId,
    kind: "image",
    sourceUrl: fakeFalUrl,
    fallbackUrl: fakeFalUrl,
    name: "durability-smoke",
    bytes: payload,
    contentType: "image/png",
  });

  console.log(`→ Returned URL: ${durableUrl}`);
  if (!isLibraryAssetUrl(durableUrl)) {
    console.error(
      "✗ Expected /api/library/download/... durable URL; got fal/fallback — R2 persist failed",
    );
    return false;
  }
  console.log("✓ Got durable library URL (not fal CDN)");

  const media = await readLibraryAssetMedia(durableUrl, clerkId);
  if (!media) {
    console.error("✗ Could not read bytes back from R2 via library asset");
    return false;
  }
  if (!Buffer.from(media.bytes).equals(payload)) {
    console.error("✗ Round-trip content mismatch");
    return false;
  }
  console.log("✓ Round-trip: Mongo asset → R2 bytes OK");

  // Cleanup probe rows
  const db = await getDb();
  const { ObjectId } = await import("mongodb");
  const idMatch = durableUrl.match(/\/api\/library\/download\/([^/?#]+)/);
  if (idMatch?.[1] && ObjectId.isValid(idMatch[1])) {
    await db.collection("assets").deleteOne({ _id: new ObjectId(idMatch[1]) });
  }
  await db.collection("users").deleteMany({ clerkId });
  console.log("✓ Cleaned probe asset/user");
  return true;
}

async function main() {
  const to =
    process.argv[2]?.trim() ||
    process.env.RESEND_TEST_TO?.trim() ||
    PRODUCT_SUPPORT_EMAIL;

  console.log("Config:");
  console.log(`  Mongo: ${isMongoConfigured() ? "yes" : "NO"}`);
  console.log(`  R2: ${isR2Configured() ? "yes" : "NO"}`);
  console.log(`  Resend: ${isEmailConfigured() ? "yes" : "NO"}`);

  const emailOk = await smokeEmails(to);
  const durOk = await smokeDurability();

  console.log("\n=== Summary ===");
  console.log(`  signup/welcome email: ${emailOk ? "PASS" : "FAIL"}`);
  console.log(`  paid checkout email:  ${emailOk ? "PASS" : "FAIL"}`);
  console.log(`  durable asset play:   ${durOk ? "PASS" : "FAIL"}`);

  if (!emailOk || !durOk) process.exit(1);
  console.log("\nAll smoke checks passed. Check inbox:", to);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
