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

export const DEFAULT_TEACHING_CAROUSEL_SLIDE_COUNT = 4;
export const MAX_TEACHING_CAROUSEL_SLIDE_COUNT = 6;

