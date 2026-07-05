import { TranscriptResult, TranscriptSegment } from "@/lib/pipeline/types";

const OPENAI_BASE = "https://api.openai.com/v1";

function openAiKey(): string {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) {
    throw new Error("Missing OPENAI_API_KEY for transcription/rewrite.");
  }
  return key;
}

export async function transcribeAudio(audioFile: File): Promise<TranscriptResult> {
  const key = openAiKey();
  const model = process.env.OPENAI_TRANSCRIBE_MODEL?.trim() || "gpt-4o-mini-transcribe";

  const fd = new FormData();
  fd.set("file", audioFile);
  fd.set("model", model);
  fd.set("response_format", "verbose_json");

  const res = await fetch(`${OPENAI_BASE}/audio/transcriptions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
    },
    body: fd,
  });

  const raw = await res.text();
  if (!res.ok) {
    throw new Error(`Transcription failed: ${raw}`);
  }

  const parsed = JSON.parse(raw) as {
    language?: string;
    text?: string;
    segments?: Array<{
      start: number;
      end: number;
      text: string;
    }>;
  };

  const segments: TranscriptSegment[] = (parsed.segments ?? [])
    .filter((s) => typeof s.start === "number" && typeof s.end === "number")
    .map((s) => ({
      start: s.start,
      end: s.end,
      text: s.text ?? "",
    }));

  return {
    language: parsed.language,
    text: parsed.text ?? segments.map((s) => s.text).join(" ").trim(),
    segments,
  };
}

export async function rewriteToCantonese(
  segments: TranscriptSegment[],
): Promise<TranscriptSegment[]> {
  const key = openAiKey();
  const model = process.env.OPENAI_REWRITE_MODEL?.trim() || "gpt-4.1-mini";
  const payload = {
    segments: segments.map((s, idx) => ({
      index: idx,
      start: s.start,
      end: s.end,
      text: s.text,
    })),
  };

  const prompt = [
    "Rewrite each subtitle line into natural spoken Cantonese in Traditional Chinese.",
    "Keep meaning faithful, keep each line concise, and suitable for subtitles.",
    "Return JSON only: {\"segments\":[{\"index\":number,\"text\":string}]}",
    "Do not change timing/index; rewrite text only.",
    JSON.stringify(payload),
  ].join("\n\n");

  const res = await fetch(`${OPENAI_BASE}/responses`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: prompt,
    }),
  });

  const raw = await res.text();
  if (!res.ok) {
    throw new Error(`Cantonese rewrite failed: ${raw}`);
  }

  const parsed = JSON.parse(raw) as {
    output_text?: string;
  };

  const outputText = parsed.output_text ?? "";
  const jsonStart = outputText.indexOf("{");
  const jsonEnd = outputText.lastIndexOf("}");
  if (jsonStart < 0 || jsonEnd <= jsonStart) {
    throw new Error("Rewrite response was not valid JSON.");
  }

  const jsonText = outputText.slice(jsonStart, jsonEnd + 1);
  const rewritten = JSON.parse(jsonText) as {
    segments?: Array<{ index: number; text: string }>;
  };
  const byIndex = new Map<number, string>();
  for (const item of rewritten.segments ?? []) {
    if (typeof item.index === "number" && typeof item.text === "string") {
      byIndex.set(item.index, item.text.trim());
    }
  }

  return segments.map((segment, idx) => ({
    ...segment,
    text: byIndex.get(idx) || segment.text,
  }));
}
