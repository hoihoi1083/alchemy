"use client";

import { useCallback } from "react";
import { mapApiError } from "@/lib/api/errors";
import type { Messages } from "@/lib/i18n";

export function useFriendlyError(m: Messages) {
  return useCallback(
    (e: unknown, fallback: string) =>
      mapApiError(e, {
        default: fallback,
        network: m.errors.network,
        missingFalKey: m.errors.serviceUnavailable,
        missingDeepSeek: m.errors.planningUnavailable,
        deepSeekBalanceEmpty: m.errors.deepSeekBalanceEmpty,
        seedanceSensitive: m.errors.seedanceSensitive,
        timeout: m.errors.timeout,
      }),
    [m],
  );
}
