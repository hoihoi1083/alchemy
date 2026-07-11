import type { CaptionLine } from "@/lib/ad-pack-types";

export const CAPTION_HANDOFF_KEY = "alchemy-caption-handoff";
export const CAPTION_DRAFT_KEY = "alchemy-caption-draft";

export type CaptionHandoff = {
  videoUrl: string;
  captionLines?: CaptionLine[];
  label?: string;
};

export type CaptionDraft = {
  sourceKey: string;
  captionLines: CaptionLine[];
  savedAt: string;
};

export function readCaptionHandoff(): CaptionHandoff | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(CAPTION_HANDOFF_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CaptionHandoff;
    if (!parsed?.videoUrl?.trim()) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearCaptionHandoff(): void {
  sessionStorage.removeItem(CAPTION_HANDOFF_KEY);
}

/** Prefer same-origin pipeline paths so caption burn can resolve local job files. */
export function normalizeCaptionHandoffVideoUrl(url: string): string {
  const trimmed = url.trim();
  const marker = "/api/pipeline-files/";
  const idx = trimmed.indexOf(marker);
  if (idx >= 0) {
    return trimmed.slice(idx);
  }
  return trimmed;
}

export function writeCaptionHandoff(handoff: CaptionHandoff): void {
  sessionStorage.setItem(
    CAPTION_HANDOFF_KEY,
    JSON.stringify({
      ...handoff,
      videoUrl: normalizeCaptionHandoffVideoUrl(handoff.videoUrl),
    }),
  );
}

export function writeCaptionDraft(sourceKey: string, captionLines: CaptionLine[]): void {
  if (typeof localStorage === "undefined") return;
  const draft: CaptionDraft = {
    sourceKey,
    captionLines,
    savedAt: new Date().toISOString(),
  };
  localStorage.setItem(CAPTION_DRAFT_KEY, JSON.stringify(draft));
}

export function readCaptionDraft(sourceKey: string): CaptionLine[] | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(CAPTION_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CaptionDraft;
    if (parsed.sourceKey !== sourceKey) return null;
    if (!Array.isArray(parsed.captionLines)) return null;
    return parsed.captionLines;
  } catch {
    return null;
  }
}

export function defaultCaptionLines(durationSec = 8): CaptionLine[] {
  const end = Math.max(2, Math.min(durationSec, 4));
  return [{ startSec: 0, endSec: end, text: "", position: "bottom" }];
}
