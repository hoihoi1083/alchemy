import { PRODUCT_SUPPORT_EMAIL } from "@/lib/brand";
import { EMAIL_LOGO_CONTENT_ID, getEmailLogoAttachment } from "@/lib/email/logo-attachment";
import { emailAppBaseUrl } from "@/lib/email/purchase-confirmation";
import { emailFromAddress, getResend, isEmailConfigured } from "@/lib/email/resend";

function isProductionEmailEnv(): boolean {
  return (
    process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production"
  );
}

function logNotConfigured(kind: string): void {
  if (isProductionEmailEnv()) {
    console.error(
      `[email] CRITICAL: RESEND_API_KEY not configured — ${kind} emails skipped`,
    );
  } else {
    console.warn(`[email] RESEND_API_KEY not set — skipping ${kind}`);
  }
}

async function sendSimpleEmail(opts: {
  to: string;
  subject: string;
  html: string;
  text: string;
  kind: string;
}): Promise<{ sent: boolean; id?: string; skipped?: string; error?: string }> {
  const to = opts.to.trim().toLowerCase();
  if (!to || !to.includes("@")) {
    return { sent: false, skipped: "missing_recipient" };
  }
  if (!isEmailConfigured()) {
    logNotConfigured(opts.kind);
    return { sent: false, skipped: "not_configured" };
  }

  try {
    const resend = getResend();
    const logo = await getEmailLogoAttachment();
    const { data, error } = await resend.emails.send({
      from: emailFromAddress(),
      to: [to],
      replyTo: PRODUCT_SUPPORT_EMAIL,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
      attachments: [
        {
          filename: logo.filename,
          content: logo.content,
          contentId: logo.contentId,
          contentType: logo.contentType,
        },
      ],
    });
    if (error) {
      console.error("[email] CRITICAL: send failed", opts.kind, error);
      return { sent: false, error: error.message };
    }
    return { sent: true, id: data?.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[email] CRITICAL: send failed", opts.kind, message);
    return { sent: false, error: message };
  }
}

function simpleHtml(opts: {
  title: string;
  body: string;
  ctaLabel: string;
  ctaUrl: string;
}): string {
  const siteUrl = emailAppBaseUrl();
  const support = PRODUCT_SUPPORT_EMAIL;
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
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
                    <a href="${siteUrl}" style="text-decoration:none;">
                      <img src="cid:${EMAIL_LOGO_CONTENT_ID}" alt="Alchemy AI Lab" width="40" height="40" style="display:block;width:40px;height:40px;border:0;border-radius:10px;" />
                    </a>
                  </td>
                  <td style="vertical-align:middle;">
                    <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;font-weight:700;letter-spacing:-0.02em;">
                      <a href="${siteUrl}" style="color:#18181b;text-decoration:none;">Alchemy AI Lab</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#18181b;">
              <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;font-weight:700;">${opts.title}</h1>
              <p style="margin:0;font-size:15px;line-height:1.55;color:#52525b;">${opts.body}</p>
              <p style="margin:24px 0 0;">
                <a href="${opts.ctaUrl}" style="display:inline-block;background-color:#18181b;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 20px;border-radius:10px;">${opts.ctaLabel}</a>
              </p>
            </td>
          </tr>
        </table>
        <p style="margin:20px 8px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;line-height:1.5;color:#71717a;text-align:center;">
          Questions? Contact <a href="mailto:${support}" style="color:#3f3f46;">${support}</a>
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
}

/**
 * Welcome email after Free signup grant. Never throws.
 */
export async function sendWelcomeEmail(opts: {
  to: string;
  tokensGranted: number;
}): Promise<{ sent: boolean; id?: string; skipped?: string; error?: string }> {
  const siteUrl = emailAppBaseUrl();
  const tokens = opts.tokensGranted.toLocaleString();
  const subject = "Welcome to Alchemy — your free tokens are ready";
  const text = [
    "Welcome to Alchemy.",
    "",
    `We've added ${tokens} free tokens to your account so you can start creating.`,
    "",
    `Open studio: ${siteUrl}/studio`,
    `Questions? Write ${PRODUCT_SUPPORT_EMAIL}.`,
  ].join("\n");
  const html = simpleHtml({
    title: "Welcome to Alchemy",
    body: `We've added <strong style="color:#18181b;">${tokens} free tokens</strong> to your account so you can start creating.`,
    ctaLabel: "Open studio",
    ctaUrl: `${siteUrl}/studio`,
  });
  return sendSimpleEmail({ to: opts.to, subject, html, text, kind: "lifecycle" });
}

export type SubscriptionEndedReason = "canceled" | "unpaid" | "payment_failed";

/**
 * Subscription ended / payment failed notice. Never throws.
 */
export async function sendSubscriptionEndedEmail(opts: {
  to: string;
  reason: SubscriptionEndedReason;
}): Promise<{ sent: boolean; id?: string; skipped?: string; error?: string }> {
  const siteUrl = emailAppBaseUrl();
  const accountUrl = `${siteUrl}/account`;

  let subject: string;
  let title: string;
  let bodyHtml: string;
  let bodyText: string;

  if (opts.reason === "payment_failed") {
    subject = "Alchemy payment failed — please update your card";
    title = "Payment failed";
    bodyHtml =
      "We couldn't charge your card for Alchemy. Please update your payment method to keep your plan active.";
    bodyText =
      "We couldn't charge your card for Alchemy. Please update your payment method to keep your plan active.";
  } else if (opts.reason === "unpaid") {
    subject = "Your Alchemy subscription ended (unpaid)";
    title = "Subscription ended";
    bodyHtml =
      "Your Alchemy subscription ended because an invoice went unpaid. You can resubscribe anytime from your account.";
    bodyText =
      "Your Alchemy subscription ended because an invoice went unpaid. You can resubscribe anytime from your account.";
  } else {
    subject = "Your Alchemy subscription has ended";
    title = "Subscription ended";
    bodyHtml =
      "Your Alchemy subscription has been canceled. You can resubscribe anytime from your account.";
    bodyText =
      "Your Alchemy subscription has been canceled. You can resubscribe anytime from your account.";
  }

  const text = [
    title,
    "",
    bodyText,
    "",
    `Manage account: ${accountUrl}`,
    `Questions? Write ${PRODUCT_SUPPORT_EMAIL}.`,
  ].join("\n");
  const html = simpleHtml({
    title,
    body: bodyHtml,
    ctaLabel: "Open account",
    ctaUrl: accountUrl,
  });
  return sendSimpleEmail({ to: opts.to, subject, html, text, kind: "lifecycle" });
}
