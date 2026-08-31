import type { ImageOutputMode } from "@/lib/image-output-mode";
import {
  DEFAULT_TEACHING_CAROUSEL_SLIDE_COUNT,
  MAX_TEACHING_CAROUSEL_SLIDE_COUNT,
  MIN_TEACHING_CAROUSEL_SLIDE_COUNT,
  TEACHING_CAROUSEL_SLIDE_COUNTS,
} from "@/lib/teaching-carousel-types";

/** User-facing carousel purpose — maps to campaign (promo×3) or teaching planner. */
export type CarouselIntent = "promo" | "teaching";

export const CAROUSEL_SLIDE_COUNTS = TEACHING_CAROUSEL_SLIDE_COUNTS;

export function isCarouselFamilyMode(mode: ImageOutputMode): boolean {
  return mode === "carousel" || mode === "campaign" || mode === "teaching-carousel";
}

export function resolveCarouselBackendMode(
  intent: CarouselIntent,
  slideCount: number,
): "campaign" | "teaching-carousel" {
  if (intent === "promo" && slideCount === 3) return "campaign";
  return "teaching-carousel";
}

export function normalizeCarouselSlideCount(
  count: number,
  intent: CarouselIntent,
): number {
  if (intent === "promo") return 3;
  const n = Math.round(count) || DEFAULT_TEACHING_CAROUSEL_SLIDE_COUNT;
  return Math.min(
    MAX_TEACHING_CAROUSEL_SLIDE_COUNT,
    Math.max(MIN_TEACHING_CAROUSEL_SLIDE_COUNT, n),
  );
}

/** Map legacy persisted modes to unified carousel UI state. */
export function legacyImageOutputModeToCarousel(
  mode: ImageOutputMode,
  slideCount?: number,
): {
  mode: ImageOutputMode;
  intent: CarouselIntent;
  slideCount: number;
} | null {
  if (mode === "campaign") {
    return { mode: "carousel", intent: "promo", slideCount: 3 };
  }
  if (mode === "teaching-carousel") {
    return {
      mode: "carousel",
      intent: "teaching",
      slideCount: normalizeCarouselSlideCount(slideCount ?? DEFAULT_TEACHING_CAROUSEL_SLIDE_COUNT, "teaching"),
    };
  }
  return null;
}

export function resolveEffectiveImageOutputMode(opts: {
  imageOutputMode: ImageOutputMode;
  carouselIntent: CarouselIntent;
  carouselSlideCount: number;
  lockedCampaignMode?: boolean;
  lockedSingleImageMode?: boolean;
}): ImageOutputMode {
  if (opts.lockedCampaignMode) return "campaign";
  if (opts.lockedSingleImageMode) return "single";
  if (opts.imageOutputMode === "carousel") {
    return resolveCarouselBackendMode(
      opts.carouselIntent,
      normalizeCarouselSlideCount(opts.carouselSlideCount, opts.carouselIntent),
    );
  }
  if (opts.imageOutputMode === "campaign" || opts.imageOutputMode === "teaching-carousel") {
    return opts.imageOutputMode;
  }
  return opts.imageOutputMode;
}

export function isCarouselUiSelected(mode: ImageOutputMode): boolean {
  return isCarouselFamilyMode(mode);
}
