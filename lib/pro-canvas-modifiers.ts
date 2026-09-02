import { artStyleImageClause, type ArtStyleId } from "@/lib/art-style";
import type {
  BackgroundModNodeData,
  GradeModNodeData,
  LightingModNodeData,
} from "@/lib/pro-canvas-types";
import {
  ULTRA_BACKGROUND_PRESETS,
  ULTRA_LIGHTING_PRESETS,
  type UltraBackgroundPreset,
  type UltraLightingPreset,
} from "@/lib/ultra-pro-controls";

const LIGHTING_CLAUSE: Record<Exclude<UltraLightingPreset, "custom">, string> = {
  studio_soft:
    "Soft three-point studio lighting with gentle key, fill, and subtle rim — premium product ad quality.",
  rim_dramatic:
    "Dramatic rim light with deep shadows and controlled contrast — cinematic hero lighting.",
  golden_hour:
    "Warm golden-hour sunlight with soft long shadows and natural skin tones.",
  neon_cyber:
    "Neon accent lighting, cool magenta/cyan edge glow, high-tech cyber atmosphere.",
  natural_window:
    "Soft natural window light, airy shadows, realistic indoor daylight mood.",
};

const BACKGROUND_CLAUSE: Record<Exclude<UltraBackgroundPreset, "custom">, string> = {
  clean_studio:
    "Clean studio sweep background — minimal, uncluttered, product-forward.",
  gradient_dark:
    "Dark charcoal-to-black gradient backdrop with subtle vignette — premium tech ad mood.",
  lifestyle_blur:
    "Shallow depth-of-field lifestyle environment — soft bokeh, context without clutter.",
  urban_night:
    "Urban night city bokeh — reflective surfaces, moody atmosphere, no readable signage.",
};

export function lightingModClause(data: LightingModNodeData): string {
  if (data.preset === "custom") return data.custom?.trim() ?? "";
  return LIGHTING_CLAUSE[data.preset];
}

export function backgroundModClause(data: BackgroundModNodeData): string {
  if (data.preset === "custom") return data.custom?.trim() ?? "";
  return BACKGROUND_CLAUSE[data.preset];
}

export function gradeModClause(data: GradeModNodeData): string {
  return artStyleImageClause(data.artStyleId) ?? "";
}

export function appendModifierSuffix(base: string, suffix: string): string {
  const trimmed = base.trim();
  const mod = suffix.trim();
  if (!mod) return trimmed;
  if (!trimmed) return mod;
  return `${trimmed}\n\n${mod}`.trim();
}

export const DEFAULT_LIGHTING_MOD_PRESET: UltraLightingPreset = "studio_soft";
export const DEFAULT_BACKGROUND_MOD_PRESET: UltraBackgroundPreset = "clean_studio";
export const DEFAULT_GRADE_ART_STYLE: ArtStyleId = "cinematic";

export { ULTRA_LIGHTING_PRESETS, ULTRA_BACKGROUND_PRESETS };
