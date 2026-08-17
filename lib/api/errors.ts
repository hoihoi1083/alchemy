/** User-facing error messages — never expose .env keys or stack traces. */

export type ErrorFallbacks = {
  default: string;
  network?: string;
  missingFalKey?: string;
  missingDeepSeek?: string;
  deepSeekBalanceEmpty?: string;
  insufficientTokens?: string;
  timeout?: string;
  seedanceSensitive?: string;
  falContentPolicy?: string;
  requestTooLarge?: string;
  klingDurationUnreachable?: string;
};

/** Named vendors / providers — never show these in product UI. */
export const USER_FACING_VENDOR_NAME_RE =
  /fal\.ai|fal-ai|\bfal\b|minimax|\bh3\b|seedance|\bkling\b|heygen|nano banana|nano-banana|deepseek|hailuo|flux\.1/i;

export function messageHasVendorName(text: string): boolean {
  return USER_FACING_VENDOR_NAME_RE.test(text);
}

const TECHNICAL_PATTERNS: Array<{ test: RegExp; key: keyof ErrorFallbacks }> = [
  { test: /\.env(\.local)?/i, key: "default" },
  { test: /FAL_KEY|fal\.ai/i, key: "missingFalKey" },
  { test: /Photo analysis was blocked|forbidden|unauthorized/i, key: "missingFalKey" },
  { test: /insufficient balance|balance is empty|top up at platform\.deepseek/i, key: "deepSeekBalanceEmpty" },
  { test: /not enough tokens|insufficient_tokens|tvc_needs_paid_plan/i, key: "insufficientTokens" },
  { test: /STORYBOARD_CELL_BLOCKED/i, key: "default" },
  { test: /DEEPSEEK_API_KEY|deepseek/i, key: "missingDeepSeek" },
  { test: /ECONNREFUSED|ENOTFOUND|fetch failed|network/i, key: "network" },
  { test: /timeout|timed out|ETIMEDOUT/i, key: "timeout" },
  {
    test: /request entity too large|payload too large|entity too large|REQUEST_TOO_LARGE|Unexpected token 'R'/i,
    key: "requestTooLarge",
  },
  { test: /sensitive content/i, key: "seedanceSensitive" },
  {
    test:
      /content_policy_violation|likenesses of real people|private information that cannot be processed|partner_validation_failed/i,
    key: "falContentPolicy",
  },
  {
    test: USER_FACING_VENDOR_NAME_RE,
    key: "default",
  },
];

function pickFallback(
  key: keyof ErrorFallbacks,
  fallbacks: ErrorFallbacks,
): string {
  const v = fallbacks[key];
  return v && v.length > 0 ? v : fallbacks.default;
}

/** Map raw API / thrown errors to safe, localized copy. */
export function mapApiError(raw: unknown, fallbacks: ErrorFallbacks): string {
  if (raw instanceof ApiClientError && raw.status === 402) {
    return pickFallback("insufficientTokens", fallbacks);
  }
  if (raw instanceof ApiClientError && raw.status === 413) {
    return pickFallback("requestTooLarge", fallbacks);
  }
  if (raw instanceof ApiClientError && (raw.status === 401 || raw.status === 403)) {
    return pickFallback("missingFalKey", fallbacks);
  }
  if (raw instanceof ApiClientError && raw.body && typeof raw.body === "object") {
    const code = (raw.body as { code?: unknown }).code;
    if (code === "REQUEST_TOO_LARGE") return pickFallback("requestTooLarge", fallbacks);
    if (code === "FAL_CONTENT_POLICY") return pickFallback("falContentPolicy", fallbacks);
    if (code === "SEEDANCE_SENSITIVE_CONTENT") return pickFallback("seedanceSensitive", fallbacks);
    if (code === "KLING_DURATION_UNREACHABLE") {
      return pickFallback("klingDurationUnreachable", fallbacks);
    }
  }
  if (
    raw &&
    typeof raw === "object" &&
    "code" in raw &&
    (raw as { code?: unknown }).code === "INSUFFICIENT_TOKENS"
  ) {
    return pickFallback("insufficientTokens", fallbacks);
  }

  const msg =
    raw instanceof Error
      ? raw.message
      : typeof raw === "string"
        ? raw
        : raw && typeof raw === "object" && "error" in raw
          ? String((raw as { error: unknown }).error ?? "")
          : "";

  const trimmed = msg.trim();
  if (!trimmed) return fallbacks.default;

  for (const { test, key } of TECHNICAL_PATTERNS) {
    if (test.test(trimmed)) return pickFallback(key, fallbacks);
  }

  if (trimmed.length > 180 || /at\s+\S+\s+\(/i.test(trimmed)) {
    return fallbacks.default;
  }

  return trimmed;
}

export class ApiClientError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body?: unknown,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}
