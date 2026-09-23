"use client";

import { useEffect, useState } from "react";
import {
  getUnsupportedInputIssue,
  getVoiceoverInputIssue,
  markUnsupportedInputContinued,
  type InputLanguageIssue,
} from "@/lib/input-language";
import type { VoiceoverLocale } from "@/lib/ad-pack-preferences";

/**
 * Tracks soft-warn "Continue anyway" and resets when the watched text changes.
 */
export function useUnsupportedLanguageSoftGate(text: string): {
  issue: InputLanguageIssue;
  continued: boolean;
  continueAnyway: () => void;
  /** Soft gate: true if none OR user continued */
  canProceed: boolean;
} {
  const issue = getUnsupportedInputIssue(text);
  const [continued, setContinued] = useState(false);
  const [lastText, setLastText] = useState(text);

  useEffect(() => {
    if (text !== lastText) {
      setLastText(text);
      setContinued(false);
    }
  }, [text, lastText]);

  return {
    issue,
    continued,
    continueAnyway: () => {
      markUnsupportedInputContinued(text);
      setContinued(true);
    },
    canProceed: issue.kind === "none" || continued,
  };
}

/** Soft gate across multiple fields (first unsupported wins for display). */
export function useUnsupportedLanguageSoftGateFields(
  ...fields: string[]
): {
  issue: InputLanguageIssue;
  continued: boolean;
  continueAnyway: () => void;
  canProceed: boolean;
} {
  const joined = fields.join("\u0001");
  const issue = (() => {
    for (const f of fields) {
      const i = getUnsupportedInputIssue(f);
      if (i.kind !== "none") return i;
    }
    return { kind: "none" } as InputLanguageIssue;
  })();
  const [continued, setContinued] = useState(false);
  const [last, setLast] = useState(joined);

  useEffect(() => {
    if (joined !== last) {
      setLast(joined);
      setContinued(false);
    }
  }, [joined, last]);

  return {
    issue,
    continued,
    continueAnyway: () => {
      markUnsupportedInputContinued(...fields);
      setContinued(true);
    },
    canProceed: issue.kind === "none" || continued,
  };
}

export function useVoiceoverLanguageGate(
  script: string,
  voiceLocale: VoiceoverLocale,
): {
  issue: InputLanguageIssue;
  canProceed: boolean;
} {
  const issue = getVoiceoverInputIssue(script, voiceLocale);
  return {
    issue,
    canProceed: issue.kind === "none",
  };
}
