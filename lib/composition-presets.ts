/**
 * Composition presets — camera grammar layered on Art Style (not a video path).
 * Fisheye comic hero applies to illustrated mediums only (comic / anime / 3D cartoon).
 */

import {
  isIllustratedArtStyle,
  resolveArtStyleId,
  type ArtStyleId,
} from "@/lib/art-style";

export const COMPOSITION_PRESET_IDS = ["standard", "fisheye-hero"] as const;

export type CompositionPresetId = (typeof COMPOSITION_PRESET_IDS)[number];

const FISHEYE_COMPOSITION_TAG = "COMPOSITION_PRESET: fisheye-hero";

const FISHEYE_HERO_CAMERA =
  "MANDATORY CAMERA / LENS: extreme fisheye lens (8mm equivalent), strong barrel distortion, curved walls and floor lines bending toward frame edges, spherical wide-angle perspective, foreground bulging toward viewer, background wrapping around the periphery. Must read as a GoPro / fisheye shot — NOT a normal flat wide shot or straight parallel perspective.";

const FISHEYE_HERO_SUBJECT =
  "HERO: oversized hand and/or product mascot thrust into the extreme foreground (30–45% of frame), pushed toward camera in comic-action pose; environment curves away behind due to fisheye warp.";

const FISHEYE_HERO_AVOID =
  "flat orthographic layout, straight parallel perspective lines, normal 35mm lens, telephoto compression, symmetrical flat poster without lens distortion";

const FISHEYE_HERO_CLAUSE = [
  FISHEYE_COMPOSITION_TAG,
  FISHEYE_HERO_CAMERA,
  FISHEYE_HERO_SUBJECT,
].join(" ");

export function isCompositionPresetId(
  value: string | null | undefined,
): value is CompositionPresetId {
  return (COMPOSITION_PRESET_IDS as readonly string[]).includes(value ?? "");
}

export function resolveCompositionPresetId(
  value: string | null | undefined,
): CompositionPresetId {
  return isCompositionPresetId(value) ? value : "standard";
}

/** Show fisheye chips only for comic / anime / Pixar-3D — not photoreal grades. */
export function compositionPresetAppliesToArtStyle(
  artStyleId?: ArtStyleId | string | null,
): boolean {
  const id = resolveArtStyleId(artStyleId);
  return (
    isIllustratedArtStyle(id) &&
    (id === "comic-webtoon" || id === "anime-2d" || id === "cartoon-3d")
  );
}

export function compositionImageClause(
  preset: CompositionPresetId | undefined,
  artStyleId?: ArtStyleId | string | null,
): string {
  const resolved = resolveCompositionPresetId(preset);
  if (resolved === "standard") return "";
  if (!compositionPresetAppliesToArtStyle(artStyleId)) return "";
  if (resolved === "fisheye-hero") return FISHEYE_HERO_CLAUSE;
  return "";
}

export function detectCompositionPresetFromExtra(
  extra: string | undefined,
): CompositionPresetId {
  if (
    extra?.includes(FISHEYE_COMPOSITION_TAG) ||
    extra?.includes("MANDATORY CAMERA / LENS: extreme fisheye")
  ) {
    return "fisheye-hero";
  }
  return "standard";
}

export function stripCompositionClauseFromExtra(extra: string): string {
  return extra
    .replace(new RegExp(`${FISHEYE_COMPOSITION_TAG}[^\\n|]*`, "g"), "")
    .replace(
      /MANDATORY CAMERA \/ LENS: extreme fisheye[^\n|]*/g,
      "",
    )
    .replace(/HERO: oversized hand and\/or product mascot[^\n|]*/g, "")
    .replace(/\|\s*\|/g, "|")
    .replace(/^\s*\|\s*|\s*\|\s*$/g, "")
    .trim();
}

export type CompositionImagePromptBlocks = {
  camera: string;
  hero: string;
  avoid: string;
};

export function compositionBlocksForPrompt(
  preset: CompositionPresetId | undefined,
  artStyleId?: ArtStyleId | string | null,
): CompositionImagePromptBlocks | null {
  const resolved = resolveCompositionPresetId(preset);
  if (resolved === "standard") return null;
  if (!compositionPresetAppliesToArtStyle(artStyleId)) return null;
  if (resolved === "fisheye-hero") {
    return {
      camera: FISHEYE_HERO_CAMERA,
      hero: FISHEYE_HERO_SUBJECT,
      avoid: FISHEYE_HERO_AVOID,
    };
  }
  return null;
}

export function prepareCompositionForImagePrompt(opts: {
  artStyle?: ArtStyleId;
  compositionPreset?: CompositionPresetId;
  extra?: string;
}): {
  preset: CompositionPresetId;
  blocks: CompositionImagePromptBlocks | null;
  extraWithoutComposition: string;
} {
  const preset =
    opts.compositionPreset && opts.compositionPreset !== "standard"
      ? opts.compositionPreset
      : detectCompositionPresetFromExtra(opts.extra);
  const blocks = compositionBlocksForPrompt(preset, opts.artStyle);
  return {
    preset,
    blocks,
    extraWithoutComposition: stripCompositionClauseFromExtra(opts.extra ?? ""),
  };
}

/** Merge into prompt_extra / planner notes when active. */
export function appendCompositionToExtra(
  extra: string,
  preset: CompositionPresetId | undefined,
  artStyleId?: ArtStyleId | string | null,
): string {
  const clause = compositionImageClause(preset, artStyleId);
  if (!clause) return extra.trim();
  const base = extra.trim();
  if (!base) return clause;
  if (base.includes(FISHEYE_COMPOSITION_TAG)) return base;
  return `${base}\n${clause}`;
}
