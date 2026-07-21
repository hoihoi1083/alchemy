import { Resend } from "resend";

let client: Resend | null = null;

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

/** Display name + address for transactional mail. Override with EMAIL_FROM. */
export function emailFromAddress(): string {
  return process.env.EMAIL_FROM?.trim() || "Alchemy Billing <billing@alchemyailab.com>";
}

export function getResend(): Resend {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) throw new Error("RESEND_API_KEY is not set");
  if (!client) client = new Resend(key);
  return client;
}
