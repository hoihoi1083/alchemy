import { PRODUCT_SUPPORT_EMAIL } from "@/lib/brand";
import { PLAN_DEFINITIONS, TOP_UP_PRICE_USD, type UserPlan } from "@/lib/billing/plans";
import type { PaidPlan } from "@/lib/stripe/prices";
import { EMAIL_LOGO_CONTENT_ID, getEmailLogoAttachment } from "@/lib/email/logo-attachment";
import { emailFromAddress, isEmailConfigured } from "@/lib/email/resend";
import { sendResendEmail } from "@/lib/email/send";

export type PurchaseEmailKind = "subscription" | "topup";

export type PurchaseEmailInput = {
  to: string;
  kind: PurchaseEmailKind;
  /** Present for subscription grants. */
  plan?: PaidPlan | UserPlan;
  tokensGranted: number;
  balanceAfter: number | null;
  renewsAt?: Date | null;
  /** When the purchase completed (shown on top-up receipts). */
  purchasedAt?: Date | null;
  /** Optional amount line, e.g. "$19.99/mo" or "$10.00". */
  amountLabel?: string | null;
};

/** Public site URL for email links — never localhost. */
export function emailAppBaseUrl(): string {
  const explicit = process.env.EMAIL_APP_URL?.trim() || process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit && !/localhost|127\.0\.0\.1/i.test(explicit)) {
    if (explicit.startsWith("http://") || explicit.startsWith("https://")) {
      return explicit.replace(/\/$/, "");
    }
    return `https://${explicit.replace(/\/$/, "")}`;
  }
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercel) {
    return vercel.startsWith("http") ? vercel.replace(/\/$/, "") : `https://${vercel.replace(/\/$/, "")}`;
  }
  return "https://www.alchemyailab.com";
}

function planLabel(plan: UserPlan | PaidPlan | undefined): string {
  if (!plan) return "Alchemy";
  const name = plan.charAt(0).toUpperCase() + plan.slice(1);
  return `${name} plan`;
}

function formatPurchaseDateTime(date: Date): string {
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

type ReceiptRow = { label: string; value: string; emphasize?: boolean };

function receiptRowsHtml(rows: ReceiptRow[]): string {
  return rows
    .map((row, i) => {
      const border = i === 0 ? "" : "border-top:1px solid #e4e4e7;";
      const valueWeight = row.emphasize ? "700" : "600";
      const valueColor = row.emphasize ? "#18181b" : "#3f3f46";
      return `
        <tr>
          <td style="padding:14px 0;${border}font-size:14px;color:#71717a;vertical-align:top;">${row.label}</td>
          <td style="padding:14px 0;${border}font-size:14px;color:${valueColor};font-weight:${valueWeight};text-align:right;vertical-align:top;">${row.value}</td>
        </tr>`;
    })
    .join("");
}

function buildReceiptHtml(opts: {
  eyebrow: string;
  title: string;
  subtitle: string;
  heroLabel: string;
  heroValue: string;
  rows: ReceiptRow[];
  accountUrl: string;
  siteUrl: string;
  support: string;
  logoContentId: string;
}): string {
  const rows = receiptRowsHtml(opts.rows);
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>${opts.title}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f4f5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background-color:#ffffff;border:1px solid #e4e4e7;border-radius:16px;overflow:hidden;">
          <tr>
            <td style="padding:28px 28px 20px;border-bottom:1px solid #f4f4f5;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="vertical-align:middle;padding-right:12px;">
                    <a href="${opts.siteUrl}" style="text-decoration:none;">
                      <img src="cid:${opts.logoContentId}" alt="Alchemy AI Lab" width="40" height="40" style="display:block;width:40px;height:40px;border:0;border-radius:10px;" />
                    </a>
                  </td>
                  <td style="vertical-align:middle;">
                    <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;font-weight:700;letter-spacing:-0.02em;">
                      <a href="${opts.siteUrl}" style="color:#18181b;text-decoration:none;">Alchemy AI Lab</a>
                    </p>
                    <p style="margin:6px 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:#a1a1aa;">${opts.eyebrow}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 28px 8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#18181b;">
              <h1 style="margin:0 0 10px;font-size:24px;line-height:1.25;font-weight:700;letter-spacing:-0.03em;">${opts.title}</h1>
              <p style="margin:0;font-size:15px;line-height:1.55;color:#52525b;">${opts.subtitle}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 28px 8px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#fafafa;border:1px solid #e4e4e7;border-radius:12px;">
                <tr>
                  <td style="padding:20px 20px 8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:#a1a1aa;">${opts.heroLabel}</td>
                </tr>
                <tr>
                  <td style="padding:0 20px 20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:32px;line-height:1.1;font-weight:700;letter-spacing:-0.04em;color:#18181b;">${opts.heroValue}</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 28px 8px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
                ${rows}
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 28px 28px;" align="left">
              <a href="${opts.accountUrl}" style="display:inline-block;background-color:#18181b;color:#ffffff;text-decoration:none;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;font-weight:600;padding:12px 20px;border-radius:10px;">Open account</a>
            </td>
          </tr>
        </table>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
          <tr>
            <td style="padding:20px 8px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;line-height:1.5;color:#71717a;text-align:center;">
              Questions? Contact <a href="mailto:${opts.support}" style="color:#3f3f46;text-decoration:underline;">${opts.support}</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
}

export function buildPurchaseConfirmationContent(input: PurchaseEmailInput): {
  subject: string;
  html: string;
  text: string;
} {
  const siteUrl = emailAppBaseUrl();
  const accountUrl = `${siteUrl}/account`;
  const support = PRODUCT_SUPPORT_EMAIL;
  const logoContentId = EMAIL_LOGO_CONTENT_ID;

  if (input.kind === "topup") {
    const amount = input.amountLabel ?? `$${TOP_UP_PRICE_USD.toFixed(2)}`;
    const purchasedAt = input.purchasedAt instanceof Date ? input.purchasedAt : new Date();
    const purchasedLabel = formatPurchaseDateTime(purchasedAt);
    const subject = "Your Alchemy token top-up is ready";
    const text = [
      "Thanks for your purchase.",
      "",
      `Top-up: ${input.tokensGranted.toLocaleString()} tokens (${amount})`,
      `Purchased: ${purchasedLabel}`,
      input.balanceAfter != null ? `New balance: ${input.balanceAfter.toLocaleString()} tokens` : null,
      "",
      `View account: ${accountUrl}`,
      `Questions? Reply to this email or write ${support}.`,
    ]
      .filter(Boolean)
      .join("\n");

    const rows: ReceiptRow[] = [
      { label: "Tokens added", value: `${input.tokensGranted.toLocaleString()} tokens`, emphasize: true },
      { label: "Amount paid", value: amount },
      { label: "Purchased", value: purchasedLabel },
    ];
    if (input.balanceAfter != null) {
      rows.push({
        label: "New balance",
        value: `${input.balanceAfter.toLocaleString()} tokens`,
      });
    }

    const html = buildReceiptHtml({
      eyebrow: "Purchase receipt",
      title: "Thanks for your purchase",
      subtitle: "Your Alchemy token top-up is confirmed and ready to use.",
      heroLabel: "Amount",
      heroValue: amount,
      rows,
      accountUrl,
      siteUrl,
      support,
      logoContentId,
    });

    return { subject, html, text };
  }

  const plan = input.plan ?? "standard";
  const label = planLabel(plan);
  const tokens =
    input.tokensGranted ||
    (plan in PLAN_DEFINITIONS ? PLAN_DEFINITIONS[plan as UserPlan].monthlyTokens : input.tokensGranted);
  const renews =
    input.renewsAt instanceof Date
      ? input.renewsAt.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
      : null;

  const subject = `Your Alchemy ${label} is active`;
  const text = [
    "Thanks for subscribing to Alchemy.",
    "",
    `Plan: ${label}`,
    input.amountLabel ? `Billing: ${input.amountLabel}` : null,
    `Tokens credited: ${tokens.toLocaleString()}`,
    input.balanceAfter != null ? `New balance: ${input.balanceAfter.toLocaleString()} tokens` : null,
    renews ? `Renews: ${renews}` : null,
    "",
    `View account: ${accountUrl}`,
    `Questions? Reply to this email or write ${support}.`,
  ]
    .filter(Boolean)
    .join("\n");

  const rows: ReceiptRow[] = [{ label: "Plan", value: label, emphasize: true }];
  if (input.amountLabel) rows.push({ label: "Billing", value: input.amountLabel });
  rows.push({ label: "Tokens credited", value: tokens.toLocaleString() });
  if (input.balanceAfter != null) {
    rows.push({
      label: "New balance",
      value: `${input.balanceAfter.toLocaleString()} tokens`,
    });
  }
  if (renews) rows.push({ label: "Renews", value: renews });

  const html = buildReceiptHtml({
    eyebrow: "Subscription receipt",
    title: "Thanks for subscribing",
    subtitle: `Your <strong style="color:#18181b;">${label}</strong> is active and tokens have been added to your account.`,
    heroLabel: "Billed",
    heroValue: input.amountLabel ?? label,
    rows,
    accountUrl,
    siteUrl,
    support,
    logoContentId,
  });

  return { subject, html, text };
}

/**
 * Sends purchase confirmation. Never throws — webhook should not fail on email errors.
 */
export async function sendPurchaseConfirmationEmail(
  input: PurchaseEmailInput,
): Promise<{ sent: boolean; id?: string; skipped?: string; error?: string }> {
  const to = input.to.trim().toLowerCase();
  if (!to || !to.includes("@")) {
    return { sent: false, skipped: "missing_recipient" };
  }
  if (!isEmailConfigured()) {
    const isProd =
      process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production";
    if (isProd) {
      console.error(
        "[email] CRITICAL: RESEND_API_KEY not configured — purchase/lifecycle emails skipped",
      );
    } else {
      console.warn("[email] RESEND_API_KEY not set — skipping purchase confirmation");
    }
    return { sent: false, skipped: "not_configured" };
  }

  const { subject, html, text } = buildPurchaseConfirmationContent(input);
  try {
    const logo = await getEmailLogoAttachment();
    return sendResendEmail(
      {
        from: emailFromAddress(),
        to: [to],
        replyTo: PRODUCT_SUPPORT_EMAIL,
        subject,
        html,
        text,
        attachments: [
          {
            filename: logo.filename,
            content: logo.content,
            contentId: logo.contentId,
            contentType: logo.contentType,
          },
        ],
      },
      { kind: `purchase_${input.kind}`, attempts: 3 },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[email] CRITICAL: prepare purchase email failed", message);
    // Logo/sharp failure — still try plain text+html without CID attachment.
    return sendResendEmail(
      {
        from: emailFromAddress(),
        to: [to],
        replyTo: PRODUCT_SUPPORT_EMAIL,
        subject,
        html,
        text,
      },
      { kind: `purchase_${input.kind}_no_logo`, attempts: 3 },
    );
  }
}
