/** Session pack so users can return to Done after editing one slide on /edit-image. */

export const STUDIO_DONE_RESUME_KEY = "alchemy-studio-done-resume";

export type StudioDoneResumeSlide = {
  index: number;
  label: string;
  url: string;
};

export type StudioDoneResume = {
  savedAt: number;
  promotionMode: string;
  workflowMode: "image-only" | "combined" | "video-only";
  slides: StudioDoneResumeSlide[];
  finalImageSrc: string | null;
  headline: string;
  product: string;
  imageGenKey: number;
};

export function writeStudioDoneResume(resume: Omit<StudioDoneResume, "savedAt">): void {
  if (typeof sessionStorage === "undefined") return;
  const payload: StudioDoneResume = { ...resume, savedAt: Date.now() };
  sessionStorage.setItem(STUDIO_DONE_RESUME_KEY, JSON.stringify(payload));
}

export function readStudioDoneResume(): StudioDoneResume | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STUDIO_DONE_RESUME_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StudioDoneResume;
    if (!parsed?.slides?.length) return null;
    // Expire after 24h so stale packs don't surprise users.
    if (Date.now() - (parsed.savedAt || 0) > 24 * 60 * 60 * 1000) {
      sessionStorage.removeItem(STUDIO_DONE_RESUME_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearStudioDoneResume(): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.removeItem(STUDIO_DONE_RESUME_KEY);
}
