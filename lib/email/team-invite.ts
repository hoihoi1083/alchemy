import { PRODUCT_SUPPORT_EMAIL } from "@/lib/brand";
import { EMAIL_LOGO_CONTENT_ID, getEmailLogoAttachment } from "@/lib/email/logo-attachment";
import {
  buildReceiptHtml,
  emailAppBaseUrl,
  type ReceiptRow,
} from "@/lib/email/purchase-confirmation";
import { emailFromAddress, isEmailConfigured } from "@/lib/email/resend";
import { sendResendEmail } from "@/lib/email/send";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatInviteExpiry(date: Date): string {
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

export function buildTeamInviteContent(opts: {
  to: string;
  ownerLabel: string;
  inviteUrl: string;
  expiresAt: Date;
}): { subject: string; html: string; text: string } {
  const siteUrl = emailAppBaseUrl();
  const support = PRODUCT_SUPPORT_EMAIL;
  const expiresAtLabel = formatInviteExpiry(opts.expiresAt);
  const owner = opts.ownerLabel.trim() || "A teammate";
  const subject = "You're invited to an Alchemy enterprise seat";
  const text = [
    `${owner} invited you to join their Alchemy enterprise team.`,
    "",
    "Sign in with the invited email (this inbox) to accept.",
    `Accept invite: ${opts.inviteUrl}`,
    `Expires: ${expiresAtLabel}`,
    "",
    `Questions? Reply to this email or write ${support}.`,
  ].join("\n");

  const rows: ReceiptRow[] = [
    { label: "Invited by", value: escapeHtml(owner), emphasize: true },
    { label: "Sign in as", value: escapeHtml(opts.to) },
    { label: "Expires", value: escapeHtml(expiresAtLabel) },
  ];

  const html = buildReceiptHtml({
    eyebrow: "Team invitation",
    title: "You're invited to join a team",
    subtitle: `${escapeHtml(owner)} invited you to their Alchemy enterprise workspace. Sign in with this email to accept.`,
    heroLabel: "Access",
    heroValue: "Enterprise seat",
    rows,
    accountUrl: opts.inviteUrl,
    siteUrl,
    support,
    logoContentId: EMAIL_LOGO_CONTENT_ID,
    ctaLabel: "Accept invite",
    ctaHint: `If the button does not work, open: ${escapeHtml(opts.inviteUrl)}`,
  });

  return { subject, html, text };
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

  const { subject, html, text } = buildTeamInviteContent({
    ...opts,
    to,
  });

  const payload = {
    from: emailFromAddress(),
    to: [to],
    replyTo: PRODUCT_SUPPORT_EMAIL,
    subject,
    text,
    html,
  };

  try {
    const logo = await getEmailLogoAttachment();
    return sendResendEmail(
      {
        ...payload,
        attachments: [
          {
            filename: logo.filename,
            content: logo.content,
            contentId: logo.contentId,
            contentType: logo.contentType,
          },
        ],
      },
      { kind: "team_invite", attempts: 3 },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[email] CRITICAL: prepare team invite logo failed", message);
    return sendResendEmail(payload, { kind: "team_invite_no_logo", attempts: 3 });
  }
}
