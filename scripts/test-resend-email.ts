/**
 * Send a one-off purchase-confirmation test via Resend.
 *
 *   RESEND_TEST_TO=you@example.com npx tsx scripts/test-resend-email.ts
 *   npx tsx scripts/test-resend-email.ts you@example.com
 */
import { existsSync, readFileSync } from "node:fs";
import { sendPurchaseConfirmationEmail } from "../lib/email/purchase-confirmation";
import { isEmailConfigured } from "../lib/email/resend";

function loadEnvLocal() {
  if (!existsSync(".env.local")) return;
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m && !process.env[m[1].trim()]) process.env[m[1].trim()] = m[2].trim();
  }
}

loadEnvLocal();

async function main() {
  const to =
    process.argv[2]?.trim() ||
    process.env.RESEND_TEST_TO?.trim() ||
    "";

  if (!to) {
    console.error("Usage: npx tsx scripts/test-resend-email.ts you@example.com");
    process.exit(1);
  }
  if (!isEmailConfigured()) {
    console.error("RESEND_API_KEY is not set in .env.local");
    process.exit(1);
  }

  console.log(`Sending top-up + subscription test emails to ${to}…`);
  console.log(`From: ${process.env.EMAIL_FROM || "Alchemy Billing <billing@alchemyailab.com>"}`);

  const topup = await sendPurchaseConfirmationEmail({
    to,
    kind: "topup",
    tokensGranted: 1000,
    balanceAfter: 2500,
    amountLabel: "$10.00",
    purchasedAt: new Date(),
  });
  console.log("top-up:", topup);

  const sub = await sendPurchaseConfirmationEmail({
    to,
    kind: "subscription",
    plan: "standard",
    tokensGranted: 3000,
    balanceAfter: 5500,
    renewsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    amountLabel: "$19.99",
  });
  console.log("subscription:", sub);

  if (!topup.sent && !sub.sent) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
