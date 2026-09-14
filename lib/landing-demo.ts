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
    video: "/videos/landing/image-workflow-demo.mp4?v=5",
    poster: "/images/landing/image-workflow-demo-poster.jpg?v=5",
    // ~35s cut: product → AI research → photo/hook → generate still
    stepMarks: [0, 3.5, 13.5, 18.5],
  },
  storyboard: {
    video: "/videos/landing/luxury-storyboard-demo.mp4?v=11",
    poster: "/images/landing/luxury-storyboard-demo-poster.jpg?v=11",
    // New ~27s cut: product → research → storyboard stills → finished clip
    stepMarks: [0, 3.5, 11.5, 18.7],
  },
  video: {
    video: "/videos/landing/social-drip-workflow-demo.mp4?v=5",
    poster: "/images/landing/social-drip-demo-poster.jpg?v=5",
    // ~27s cut: product → AI research → photo/reference → finished reel
    stepMarks: [0, 3.5, 10, 17],
  },
};
