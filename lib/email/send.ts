import type { CreateEmailOptions, CreateEmailResponseSuccess } from "resend";
import { getResend, isEmailConfigured } from "@/lib/email/resend";

const TRANSIENT_RE =
  /could not be resolved|fetch failed|ECONNRESET|ETIMEDOUT|ENOTFOUND|socket|network|Unable to fetch data|application_error/i;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isTransientEmailError(err: unknown): boolean {
  if (!err) return false;
  if (typeof err === "string") return TRANSIENT_RE.test(err);
  if (err instanceof Error) return TRANSIENT_RE.test(err.message);
  if (typeof err === "object") {
    const o = err as { message?: string; name?: string; statusCode?: number | null };
    if (o.statusCode == null && o.message && TRANSIENT_RE.test(o.message)) return true;
    if (o.name === "application_error") return true;
    if (o.message && TRANSIENT_RE.test(o.message)) return true;
  }
  return false;
}

export type ResendSendResult = {
  sent: boolean;
  id?: string;
  skipped?: string;
  error?: string;
};

/**
 * Send via Resend with short retries for flaky local DNS / transient network errors.
 * Never throws.
 */
export async function sendResendEmail(
  payload: CreateEmailOptions,
  opts?: { attempts?: number; kind?: string },
): Promise<ResendSendResult> {
  if (!isEmailConfigured()) {
    return { sent: false, skipped: "not_configured" };
  }

  const attempts = Math.max(1, opts?.attempts ?? 3);
  const kind = opts?.kind ?? "transactional";
  let lastError: string | undefined;

  for (let i = 0; i < attempts; i++) {
    try {
      const resend = getResend();
      const { data, error } = await resend.emails.send(payload);
      if (error) {
        lastError = error.message || String(error);
        const transient = isTransientEmailError(error);
        console.error("[email] CRITICAL: send failed", {
          kind,
          attempt: i + 1,
          attempts,
          transient,
          name: (error as { name?: string }).name,
          statusCode: (error as { statusCode?: number | null }).statusCode ?? null,
          message: lastError,
        });
        if (!transient || i === attempts - 1) {
          return { sent: false, error: lastError };
        }
        await sleep(400 * 2 ** i);
        continue;
      }
      if (i > 0) {
        console.info("[email] send succeeded after retry", {
          kind,
          attempt: i + 1,
          id: (data as CreateEmailResponseSuccess | null)?.id,
        });
      }
      return { sent: true, id: data?.id };
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      const transient = isTransientEmailError(err);
      console.error("[email] CRITICAL: send threw", {
        kind,
        attempt: i + 1,
        attempts,
        transient,
        message: lastError,
      });
      if (!transient || i === attempts - 1) {
        return { sent: false, error: lastError };
      }
      await sleep(400 * 2 ** i);
    }
  }

  return { sent: false, error: lastError ?? "send_failed" };
}
