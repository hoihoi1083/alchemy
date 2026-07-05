/** Safe error strings returned from API routes (never mention .env or keys). */

export const SERVER_ERRORS = {
  missingFalKey:
    "Image and video generation is temporarily unavailable. Please try again later.",
  missingDeepSeek:
    "AI planning is temporarily unavailable. Please try again later.",
  invalidInput: "Some inputs were invalid. Please check and try again.",
  generationFailed: "Generation failed. Please try again.",
  brandAnalyzeFailed: "Could not analyze that brand URL. Check the link and try again.",
  exportFailed: "Could not export your edit pack. Please try again.",
} as const;
