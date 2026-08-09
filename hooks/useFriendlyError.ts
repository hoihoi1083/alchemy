"use client";

import { useCallback } from "react";
import { mapApiError } from "@/lib/api/errors";
import type { Messages } from "@/lib/i18n";

/** Fallbacks that mean a paid generation/plan call failed after (or without) charging. */
function isBillableAttemptFallback(m: Messages, fallback: string): boolean {
  const billable = new Set<string>([
    m.errors.polishFailed,
    m.errors.videoFailed,
    m.errors.refineFailed,
    m.errors.exportFailed,
    m.errors.campaignFailed,
    m.errors.storyboardFailed,
    m.errors.musicGenerateFailed,
    m.errors.voiceoverFailed,
    m.errors.ugcPresenterFailed,
    m.errors.planVideoPromptFailed,
    m.errors.planProductVideoFailed,
    m.errors.adPackPlanFailed,
    m.errors.planConceptFailed,
    m.errors.brandAnalyzeFailed,
    m.errors.researchReelAnalyzeFailed,
    m.errors.serviceUnavailable,
    m.errors.timeout,
    m.errors.seedanceSensitive,
    m.errors.falContentPolicy,
    m.errors.network,
  ]);
  return billable.has(fallback);
}

export function useFriendlyError(m: Messages) {
  return useCallback(
    (e: unknown, fallback: string) => {
      const mapped = mapApiError(e, {
        default: fallback,
        network: m.errors.network,
        missingFalKey: m.errors.serviceUnavailable,
        missingDeepSeek: m.errors.planningUnavailable,
        deepSeekBalanceEmpty: m.errors.deepSeekBalanceEmpty,
        insufficientTokens: m.errors.insufficientTokens,
        seedanceSensitive: m.errors.seedanceSensitive,
        falContentPolicy: m.errors.falContentPolicy,
        requestTooLarge: m.errors.requestTooLarge,
        timeout: m.errors.timeout,
      });
      if (mapped === m.errors.insufficientTokens) return mapped;
      if (/STORYBOARD_CELL_BLOCKED/i.test(String(e instanceof Error ? e.message : mapped))) {
        return m.errors.storyboardCellBlocked;
      }
      if (!isBillableAttemptFallback(m, fallback)) return mapped;
      if (mapped.includes(m.errors.tokensNotCharged)) return mapped;
      return `${mapped} ${m.errors.tokensNotCharged}`;
    },
    [m],
  );
}
