import { fal } from "@fal-ai/client";
import { parseLlmJsonObject } from "@/lib/parse-llm-json";

const VISION_ENDPOINT = "fal-ai/any-llm/vision";
const VISION_MODEL = "google/gemini-2.5-flash-lite";

export type PipelineSmokeReview = {
  matchesExpectation: boolean;
  score: number;
  summary: string;
  positives: string[];
  issues: string[];
  rawNotes?: string;
};

export type PipelineSmokeReviewInput = {
  imageUrl: string;
  mediaKind: "image" | "video-frame";
  label: string;
  expectation: string;
  product?: string;
  mustAvoid?: string[];
};

function extractVisionText(data: unknown): string {
  if (!data || typeof data !== "object") return "";
  const d = data as Record<string, unknown>;
  if (typeof d.output === "string") return d.output.trim();
  if (typeof d.text === "string") return d.text.trim();
  if (typeof d.response === "string") return d.response.trim();
  const choices = d.choices as Array<{ message?: { content?: string } }> | undefined;
  const content = choices?.[0]?.message?.content;
  if (typeof content === "string") return content.trim();
  return "";
}

function normalizeReview(parsed: Partial<PipelineSmokeReview>): PipelineSmokeReview {
  const score = Math.min(100, Math.max(0, Number(parsed.score) || 0));
  return {
    matchesExpectation: Boolean(parsed.matchesExpectation),
    score,
    summary: String(parsed.summary ?? "").trim() || "No summary returned.",
    positives: Array.isArray(parsed.positives)
      ? parsed.positives.map((p) => String(p).trim()).filter(Boolean)
      : [],
    issues: Array.isArray(parsed.issues)
      ? parsed.issues.map((p) => String(p).trim()).filter(Boolean)
      : [],
    rawNotes: parsed.rawNotes ? String(parsed.rawNotes).trim() : undefined,
  };
}

/** Cheap vision QA — does this output fit the smoke-test expectation? */
export async function reviewPipelineOutput(
  input: PipelineSmokeReviewInput,
): Promise<PipelineSmokeReview> {
  const avoidBlock =
    input.mustAvoid?.length ?
      `Must NOT include or emphasize: ${input.mustAvoid.join("; ")}.`
    : "";

  const result = await fal.subscribe(VISION_ENDPOINT, {
    input: {
      model: VISION_MODEL,
      image_urls: [input.imageUrl],
      system_prompt:
        "You QA generated marketing assets for an SMB ad pipeline smoke test. Be practical — minor style drift is OK; flag blockers only. Output valid JSON only.",
      prompt: [
        `Asset label: ${input.label}`,
        `Media type: ${input.mediaKind}`,
        input.product ? `Product being promoted: ${input.product}` : "",
        `Expected: ${input.expectation}`,
        avoidBlock,
        "",
        "Return JSON only:",
        '{"matchesExpectation":true,"score":85,"summary":"one sentence","positives":["…"],"issues":["…"]}',
        "",
        "Rules:",
        "- matchesExpectation: true if good enough for a smoke test (not perfect ad quality)",
        "- score: 0-100 for fit to expectation",
        "- issues: empty if acceptable; list only real mismatches (wrong product category, offensive, broken anatomy, wrong topic like zodiac when product is jewelry)",
        "- Do not nitpick resolution or minor color shifts",
      ]
        .filter(Boolean)
        .join("\n"),
    },
    logs: false,
  });

  const raw = extractVisionText(result.data);
  if (!raw) throw new Error(`Vision review returned empty for ${input.label}`);
  return normalizeReview(
    parseLlmJsonObject<Partial<PipelineSmokeReview>>(raw, `Smoke review: ${input.label}`),
  );
}

export type LayoutSimilarityReview = {
  layoutScore: number;
  matchesReferenceLayout: boolean;
  summary: string;
  borrowedElements: string[];
  driftIssues: string[];
};

/** Compare generated slide vs reference — layout rhythm similarity (not pixel match). */
export async function reviewLayoutSimilarity(input: {
  referenceImageUrl: string;
  generatedImageUrl: string;
  label: string;
  product: string;
}): Promise<LayoutSimilarityReview> {
  const result = await fal.subscribe(VISION_ENDPOINT, {
    input: {
      model: VISION_MODEL,
      image_urls: [input.referenceImageUrl, input.generatedImageUrl],
      system_prompt:
        "You compare social carousel reference vs generated slide for LAYOUT similarity only. Output valid JSON only.",
      prompt: [
        "IMAGE 1 = style/layout reference (viral post). IMAGE 2 = generated slide for smoke test.",
        `Product promoted in IMAGE 2 must be: ${input.product}`,
        `Label: ${input.label}`,
        "",
        "Score how well IMAGE 2 borrows IMAGE 1 layout rhythm (panel structure, hierarchy, spacing, palette family) while showing the user's product — NOT copying reference topic.",
        "",
        "Return JSON only:",
        '{"layoutScore":75,"matchesReferenceLayout":true,"summary":"one sentence","borrowedElements":["…"],"driftIssues":["…"]}',
        "",
        "Rules:",
        "- layoutScore: 0-100 for structural similarity",
        "- matchesReferenceLayout: true if >= 60 and same general carousel/poster family",
        "- driftIssues: major layout breaks only (completely different format, wrong aspect feel)",
        "- Ignore exact text wording; focus composition",
      ].join("\n"),
    },
    logs: false,
  });

  const raw = extractVisionText(result.data);
  if (!raw) throw new Error("Layout review returned empty");
  const parsed = parseLlmJsonObject<Partial<LayoutSimilarityReview>>(raw, "Layout review");
  const layoutScore = Math.min(100, Math.max(0, Number(parsed.layoutScore) || 0));
  return {
    layoutScore,
    matchesReferenceLayout: Boolean(parsed.matchesReferenceLayout),
    summary: String(parsed.summary ?? "").trim() || "No summary",
    borrowedElements: Array.isArray(parsed.borrowedElements)
      ? parsed.borrowedElements.map(String).filter(Boolean)
      : [],
    driftIssues: Array.isArray(parsed.driftIssues)
      ? parsed.driftIssues.map(String).filter(Boolean)
      : [],
  };
}

export async function uploadLocalImageForReview(filePath: string, name: string): Promise<string> {
  const { readFile } = await import("node:fs/promises");
  const bytes = await readFile(filePath);
  const file = new File([bytes], name, { type: "image/png" });
  return fal.storage.upload(file);
}
