import type { CreditReason } from "@/lib/billing/ledger";

export type ConsumeKindLabels = {
  fallback: string;
  research_reel: string;
  research_reel_with_plan: string;
  refine_research_video_script: string;
  storyboard: string;
  storyboard_scenes: string;
  image: string;
  image_ab: string;
  image_refine: string;
  campaign: string;
  teaching_carousel: string;
  teaching_carousel_slides: string;
  video: string;
  minimax_h3: string;
  kling_storyboard_fallback: string;
  digital_presenter: string;
  cinematic_scenes: string;
  caption_burn: string;
  caption_plan: string;
  caption_expand: string;
  caption_expand_spoken: string;
  bgm: string;
  voiceover: string;
  voiceover_dub: string;
  music: string;
  inpaint: string;
  postprocess: string;
  "finish-blockbuster": string;
  smart_layers_detect: string;
  smart_layers_matte: string;
  smart_layers_heal: string;
};

function replaceCount(template: string, count: number): string {
  return template.replace("{count}", String(count));
}

function metaCount(meta: Record<string, unknown>, ...keys: string[]): number | null {
  for (const key of keys) {
    const raw = meta[key];
    if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) {
      return Math.round(raw);
    }
  }
  return null;
}

/** Human label for a token debit/credit row. Uses meta.kind for consume rows. */
export function transactionLabel(
  reason: CreditReason,
  meta: Record<string, unknown> | null | undefined,
  reasons: Record<CreditReason, string>,
  consumeKinds: ConsumeKindLabels,
): string {
  if (reason !== "consume") {
    return reasons[reason] ?? reason;
  }

  const kind = typeof meta?.kind === "string" ? meta.kind.trim() : "";
  if (!kind) return consumeKinds.fallback;

  if (kind === "research_reel") {
    return meta?.planStoryboard === true
      ? consumeKinds.research_reel_with_plan
      : consumeKinds.research_reel;
  }

  if (kind === "storyboard") {
    const count = metaCount(meta!, "sceneCount");
    return count != null
      ? replaceCount(consumeKinds.storyboard_scenes, count)
      : consumeKinds.storyboard;
  }

  if (kind === "teaching_carousel") {
    const count = metaCount(meta!, "slideCount");
    return count != null
      ? replaceCount(consumeKinds.teaching_carousel_slides, count)
      : consumeKinds.teaching_carousel;
  }

  if (kind === "image") {
    const mode = typeof meta?.mode === "string" ? meta.mode : "";
    if (mode.startsWith("refine")) return consumeKinds.image_refine;
    if (meta?.imageOutputMode === "ab") return consumeKinds.image_ab;
    return consumeKinds.image;
  }

  const direct = consumeKinds[kind as keyof ConsumeKindLabels];
  if (typeof direct === "string" && direct.length > 0) return direct;

  return consumeKinds.fallback;
}
