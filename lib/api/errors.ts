/** User-facing error messages — never expose .env keys or stack traces. */

export type ErrorFallbacks = {
  default: string;
  network?: string;
  missingFalKey?: string;
  missingDeepSeek?: string;
  deepSeekBalanceEmpty?: string;
  timeout?: string;
  seedanceSensitive?: string;
};

const TECHNICAL_PATTERNS: Array<{ test: RegExp; key: keyof ErrorFallbacks }> = [
  { test: /\.env(\.local)?/i, key: "default" },
  { test: /FAL_KEY|fal\.ai/i, key: "missingFalKey" },
  { test: /insufficient balance|balance is empty|top up at platform\.deepseek/i, key: "deepSeekBalanceEmpty" },
  { test: /DEEPSEEK_API_KEY|deepseek/i, key: "missingDeepSeek" },
  { test: /ECONNREFUSED|ENOTFOUND|fetch failed|network/i, key: "network" },
  { test: /timeout|timed out|ETIMEDOUT/i, key: "timeout" },
  { test: /sensitive content/i, key: "seedanceSensitive" },
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
