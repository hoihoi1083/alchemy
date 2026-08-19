import { PRODUCT_SUPPORT_EMAIL } from "@/lib/brand";
import { emailAppBaseUrl } from "@/lib/email/purchase-confirmation";
import { emailFromAddress, isEmailConfigured } from "@/lib/email/resend";
import { sendResendEmail } from "@/lib/email/send";

function inviteHtml(opts: {
  ownerLabel: string;
  inviteUrl: string;
  expiresAtLabel: string;
}): string {
  const site = emailAppBaseUrl();
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Alchemy team invite</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="padding:28px 14px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:#fff;border:1px solid #e4e4e7;border-radius:14px;">
        <tr><td style="padding:24px 24px 8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#18181b;">
          <h1 style="margin:0 0 10px;font-size:22px;">You are invited to an Alchemy enterprise seat</h1>
          <p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#52525b;">
            ${opts.ownerLabel} invited you to join their enterprise team workspace access.
          </p>
          <p style="margin:0 0 18px;font-size:14px;line-height:1.6;color:#52525b;">
            This invite expires on <strong>${opts.expiresAtLabel}</strong>.
          </p>
          <a href="${opts.inviteUrl}" style="display:inline-block;background:#18181b;color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:11px 18px;border-radius:10px;">Accept invite</a>
          <p style="margin:18px 0 0;font-size:12px;color:#71717a;word-break:break-all;">
            If the button does not work, open: ${opts.inviteUrl}
          </p>
        </td></tr>
      </table>
      <p style="margin:16px 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;color:#71717a;">
        Questions? Contact <a href="mailto:${PRODUCT_SUPPORT_EMAIL}" style="color:#3f3f46;">${PRODUCT_SUPPORT_EMAIL}</a> · <a href="${site}" style="color:#3f3f46;">Alchemy AI Lab</a>
      </p>
    </td></tr>
  </table>
</body>
</html>`.trim();
}

export async function sendTeamInviteEmail(opts: {
  to: string;
  ownerLabel: string;
  inviteUrl: string;
  expiresAt: Date;
}): Promise<{ sent: boolean; id?: string; skipped?: string; error?: string }> {
  const to = opts.to.trim().toLowerCase();
  if (!to || !to.includes("@")) return { sent: false, skipped: "missing_recipient" };
  if (!isEmailConfigured()) return { sent: false, skipped: "not_configured" };
  const expiresAtLabel = opts.expiresAt.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  const subject = "Alchemy enterprise seat invitation";
  const text = [
    `${opts.ownerLabel} invited you to join an Alchemy enterprise seat.`,
    `Accept invite: ${opts.inviteUrl}`,
    `Expires: ${expiresAtLabel}`,
    `Questions: ${PRODUCT_SUPPORT_EMAIL}`,
  ].join("\n");
  const html = inviteHtml({
    ownerLabel: opts.ownerLabel,
    inviteUrl: opts.inviteUrl,
    expiresAtLabel,
  });
  return sendResendEmail(
    {
      from: emailFromAddress(),
      to: [to],
      replyTo: PRODUCT_SUPPORT_EMAIL,
      subject,
      text,
      html,
    },
    { kind: "team_invite", attempts: 3 },
  );
}

