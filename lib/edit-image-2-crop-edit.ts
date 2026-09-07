/**
 * Prompt helpers for Magic Layers AI crop edit:
 * user selects a precise region (layer crop) + describes the change.
 */

import { buildImageRefinePrompt, IMAGE_REFINE_SYSTEM_PROMPT } from "@/lib/image-refine-prompt";
import {
  buildLayerTextRewritePrompt,
  LAYER_TEXT_REWRITE_SYSTEM_PROMPT,
} from "@/lib/edit-image-2-text-rewrite";

export type CropEditMode = "text" | "instruction";

export function resolveCropEditMode(opts: {
  newText?: string;
  instruction?: string;
}): CropEditMode | null {
  const newText = (opts.newText ?? "").trim();
  const instruction = (opts.instruction ?? "").trim();
  if (newText) return "text";
  if (instruction) return "instruction";
  return null;
}

export function buildLayerCropEditPrompt(opts: {
  mode: CropEditMode;
  newText?: string;
  oldText?: string;
  instruction?: string;
}): { prompt: string; systemPrompt: string; billingMode: string } {
  if (opts.mode === "text") {
    return {
      prompt: buildLayerTextRewritePrompt({
        newText: opts.newText ?? "",
        oldText: opts.oldText,
      }),
      systemPrompt: LAYER_TEXT_REWRITE_SYSTEM_PROMPT,
      billingMode: "refine-layer-text",
    };
  }

  const note = (opts.instruction ?? "").trim().slice(0, 500);
  const prompt = [
    buildImageRefinePrompt(note),
    "This attachment is ONLY the selected region crop — edit inside it.",
    "Do not invent a new full poster. Keep crop framing and aspect ratio.",
    "Blend edges so the result can sit back on the original plate.",
  ].join(" ");

  return {
    prompt,
    systemPrompt: [
      IMAGE_REFINE_SYSTEM_PROMPT,
      "You are editing a cropped region of a poster, not the full canvas.",
    ].join(" "),
    billingMode: "refine-layer-crop",
  };
}
