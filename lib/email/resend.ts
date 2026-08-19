import { Resend } from "resend";

let client: Resend | null = null;

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

function isValidEmailAddress(email: string): boolean {
  // Simple RFC-ish check; Resend expects standard email address syntax.
  // Good enough for rejecting obviously invalid values.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function parseEmailFrom(raw: string): string | null {
  const v = raw.trim();
  if (!v) return null;

  // 1) "email@example.com"
  if (isValidEmailAddress(v)) return v;

  // 2) "Name <email@example.com>"
  const m = v.match(/^(.*)<\s*([^<>@\s]+@[^<>@\s]+\.[^<>@\s]+)\s*>$/);
  if (!m) return null;
  const display = m[1].trim();
  const email = m[2].trim();
  if (!isValidEmailAddress(email)) return null;
  // Keep display name if present; Resend is fine with both variants.
  return display ? `${display} <${email}>` : `<${email}>`;
}

/** Display name + address for transactional mail. Override with EMAIL_FROM. */
export function emailFromAddress(): string {
  const raw = process.env.EMAIL_FROM?.trim();
  if (raw) {
    const parsed = parseEmailFrom(raw);
    if (parsed) return parsed;
    console.warn(
      "[email] EMAIL_FROM is misformatted; falling back to default from address",
      { provided: raw },
    );
  }
  return "Alchemy AI Lab <billing@alchemyailab.com>";
}

export function getResend(): Resend {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) throw new Error("RESEND_API_KEY is not set");
  if (!client) client = new Resend(key);
  return client;
}
