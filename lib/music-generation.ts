import { fal } from "@fal-ai/client";

export type GeneratedMusicTrack = {
  id: string;
  label: string;
  audioUrl: string;
};

function extractAudioUrl(data: unknown): string | undefined {
  if (!data || typeof data !== "object") return undefined;
  const d = data as Record<string, unknown>;
  if (d.audio && typeof d.audio === "object" && d.audio !== null) {
    const url = (d.audio as { url?: unknown }).url;
    if (typeof url === "string") return url;
  }
  if (Array.isArray(d.audios) && d.audios.length > 0) {
    const first = d.audios[0];
    if (first && typeof first === "object" && first !== null) {
      const url = (first as { url?: unknown }).url;
      if (typeof url === "string") return url;
    }
  }
  return undefined;
}

const VARIATIONS = [
  { suffix: "", label: "A" },
  { suffix: ", slightly more upbeat and rhythmic", label: "B" },
  { suffix: ", softer and more ambient, minimal", label: "C" },
] as const;

export async function generateMusicOptions(
  promptEn: string,
  durationSec: number,
): Promise<GeneratedMusicTrack[]> {
  const key = process.env.FAL_KEY?.trim();
  if (!key) throw new Error("FAL_KEY is not configured.");
  fal.config({ credentials: key });

  const duration = Math.min(60, Math.max(5, Math.round(durationSec)));
  const basePrompt = promptEn.trim();
  if (!basePrompt) throw new Error("Music prompt is required.");

  try {
    const result = await fal.subscribe("sonilo/v1.1/text-to-music", {
      input: {
        prompt: basePrompt,
        duration,
        num_samples: 3,
      },
      logs: false,
    });

    const audios = (result.data as { audios?: Array<{ url?: string }> })?.audios ?? [];
    const tracks = audios
      .map((a, i) => ({
        id: `sonilo-${i + 1}`,
        label: String.fromCharCode(65 + i),
        audioUrl: a?.url ?? "",
      }))
      .filter((t) => t.audioUrl);

    if (tracks.length >= 1) return tracks;
  } catch (soniloError) {
    console.warn(
      "[generateMusicOptions] sonilo failed:",
      soniloError instanceof Error ? soniloError.message : soniloError,
    );
  }

  let minimaxError: unknown;
  const tracks: GeneratedMusicTrack[] = [];
  for (const variation of VARIATIONS) {
    try {
      const result = await fal.subscribe("fal-ai/minimax-music/v2.6", {
        input: {
          prompt: `${basePrompt}${variation.suffix}`.slice(0, 2000),
          is_instrumental: true,
        },
        logs: false,
      });
      const audioUrl = extractAudioUrl(result.data);
      if (audioUrl) {
        tracks.push({
          id: `minimax-${variation.label.toLowerCase()}`,
          label: variation.label,
          audioUrl,
        });
      }
    } catch (e) {
      minimaxError = e;
      console.warn(
        `[generateMusicOptions] minimax ${variation.label} failed:`,
        e instanceof Error ? e.message : e,
      );
    }
  }

  if (tracks.length === 0) {
    const detail =
      minimaxError instanceof Error ? minimaxError.message : "All music providers failed.";
    throw new Error(`Music generation failed: ${detail}`);
  }

  return tracks;
}
