import type { MusicMood } from "@/lib/ad-pack-preferences";
import { musicMoodHint } from "@/lib/ad-pack-preferences";

/** Build an English instrumental prompt for caption-studio AI BGM (no ad-pack required). */
export function buildCaptionStudioMusicPrompt(input: {
  productBrief?: string;
  musicMood: MusicMood;
  durationSec: number;
}): string {
  const product = input.productBrief?.trim();
  const moodLine = musicMoodHint(input.musicMood);
  const sec = Math.max(4, Math.round(input.durationSec));
  if (product) {
    return [
      `Instrumental background music for a ${sec}-second social media product ad about: ${product}.`,
      moodLine,
      "Modern, polished, suitable for Instagram Reels. No vocals, no lyrics, no speech.",
    ].join(" ");
  }
  return [
    `Instrumental background music for a ${sec}-second short-form marketing video.`,
    moodLine,
    "Modern, polished, suitable for Instagram Reels. No vocals, no lyrics, no speech.",
  ].join(" ");
}

export function resolveCaptionStudioMusicPrompt(input: {
  adPackPromptEn?: string;
  productBrief?: string;
  musicMood: MusicMood;
  durationSec: number;
}): string {
  const fromPlan = input.adPackPromptEn?.trim();
  if (fromPlan) return fromPlan;
  return buildCaptionStudioMusicPrompt({
    productBrief: input.productBrief,
    musicMood: input.musicMood,
    durationSec: input.durationSec,
  });
}
