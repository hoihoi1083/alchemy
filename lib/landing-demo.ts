/**
 * Three landing Watch-demo clips. Served from `public/` (Vercel CDN), not R2.
 * R2 is for private user generations — landing demos should stay in the repo.
 */
export type LandingDemoId = "image" | "storyboard" | "video";

export const LANDING_DEMO_IDS: LandingDemoId[] = ["image", "storyboard", "video"];

export type LandingDemoAsset = {
  video: string;
  poster: string;
  stepMarks: readonly number[];
};

export const LANDING_DEMOS: Record<LandingDemoId, LandingDemoAsset> = {
  image: {
    video: "/videos/landing/image-workflow-demo.mp4?v=4",
    poster: "/images/landing/image-workflow-demo-poster.jpg?v=4",
    stepMarks: [0, 13.8, 15.8, 18.5],
  },
  storyboard: {
    video: "/videos/landing/luxury-storyboard-demo.mp4?v=1787093778086",
    poster: "/images/landing/luxury-storyboard-demo-poster.jpg?v=1787093778086",
    stepMarks: [0, 6.49, 33.7, 61.61],
  },
  video: {
    video: "/videos/landing/social-drip-workflow-demo.mp4?v=1787093784379",
    poster: "/images/landing/social-drip-demo-poster.jpg?v=1787093784379",
    stepMarks: [0, 7.38, 13.64, 26.42],
  },
};
