export type TeachingCarouselSlide = {
  index: number;
  title: string;
  body: string;
  takeaway: string;
  role: "cover" | "point" | "summary";
  composition: string;
};

export type TeachingCarouselPlan = {
  theme: string;
  visualDna: string;
  slides: TeachingCarouselSlide[];
};

export const DEFAULT_TEACHING_CAROUSEL_SLIDE_COUNT = 5;
export const MAX_TEACHING_CAROUSEL_SLIDE_COUNT = 6;
export const MIN_TEACHING_CAROUSEL_SLIDE_COUNT = 4;

export const TEACHING_CAROUSEL_SLIDE_COUNTS = [4, 5, 6] as const;
export type TeachingCarouselSlideCount = (typeof TEACHING_CAROUSEL_SLIDE_COUNTS)[number];

