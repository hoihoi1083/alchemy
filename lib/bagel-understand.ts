import { ApiError, fal } from "@fal-ai/client";

/** ByteDance Bagel on fal — image understanding billed on FAL_KEY (not OpenRouter). */
export const BAGEL_UNDERSTAND_ENDPOINT = "fal-ai/bagel/understand";

/** Strip Bagel thinking traces and markdown fences before JSON parse. */
export function cleanBagelVisionText(raw: string): string {
  let t = raw.trim();
  // Complete think blocks
  t = t.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  // Unclosed / leftover think tags — keep from first JSON object if present
  if (/<\/?think>/i.test(t)) {
    const afterClose = t.includes("</think>")
      ? (t.split(/<\/think>/i).pop() ?? t)
      : t.replace(/<think>[\s\S]*/i, "");
    t = afterClose.replace(/<\/?think>/gi, "").trim();
  }
  const fenced = t.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenced) t = fenced[1].trim();
  const brace = t.indexOf("{");
  if (brace > 0) t = t.slice(brace);
  return t.trim();
}

function extractBagelText(data: unknown): string {
  if (!data || typeof data !== "object") return "";
  const d = data as Record<string, unknown>;
  if (typeof d.text === "string") return d.text.trim();
  if (typeof d.output === "string") return d.output.trim();
  if (typeof d.response === "string") return d.response.trim();
  return "";
}

function formatBagelVisionError(e: unknown): Error {
  if (e instanceof ApiError) {
    const status = e.status;
    const detail = e.message?.trim() || "Forbidden";
    if (status === 401 || status === 403 || /forbidden|unauthorized|authorization/i.test(detail)) {
      return new Error(
        `Photo analysis was blocked (${status || 403}). Check FAL_KEY access/credits for fal-ai/bagel/understand, or re-upload a smaller JPG/PNG and try again.`,
      );
    }
    return new Error(
      `Photo analysis failed: ${detail}${e.requestId ? ` (fal request: ${e.requestId})` : ""}`,
    );
  }
  if (e instanceof Error) return e;
  return new Error("Photo analysis failed.");
}

/**
 * Image → text/JSON via fal-ai/bagel/understand (single image_url).
 * Prefer Florence-2 + DeepSeek (`captionImageToVisionJson`) for product/reel/reference
 * analysis — Bagel is ~$0.05/request and slower (think traces). Keep Bagel only where
 * a promptable VLM is required and Florence captions are not enough (e.g. smoke QA).
 */
export async function runBagelUnderstand(input: {
  imageUrl: string;
  prompt: string;
  seed?: number;
}): Promise<string> {
  try {
    const result = await fal.subscribe(BAGEL_UNDERSTAND_ENDPOINT, {
      input: {
        image_url: input.imageUrl,
        prompt: input.prompt,
        ...(typeof input.seed === "number" ? { seed: input.seed } : {}),
      },
      logs: false,
    });

    const raw = cleanBagelVisionText(extractBagelText(result.data));
    if (!raw) {
      throw new Error("Bagel understand returned an empty analysis.");
    }
    return raw;
  } catch (e: unknown) {
    throw formatBagelVisionError(e);
  }
}
