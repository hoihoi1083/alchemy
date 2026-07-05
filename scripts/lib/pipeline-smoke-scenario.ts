/** Shared smoke scenario — product vs style reference separation. */
export const SMOKE_SCENARIO = {
  product: "馬達加斯加粉水晶手鏈",
  searchTopic: "粉水晶手鏈",
  headline: "粉晶手鏈｜溫柔能量",
  textImagePrompt:
    "Minimal Hong Kong social product ad: Madagascar pink crystal bracelet (粉晶手鏈) on soft white background, 4:5, studio light, NO text on image, NO zodiac or horoscope themes.",
  editImagePrompt:
    "Clean e-commerce product photo: pink crystal bracelet on pure white background, soft studio light, jewelry SMB ad.",
  i2vPrompt:
    "Gentle vertical product showcase: subtle push-in on pink crystal bracelet, soft light, photorealistic jewelry ad.",
  t2vPrompt:
    "Short vertical jewelry ad: pink crystal bracelet on wrist, gentle motion, soft daylight, photorealistic, no on-screen text.",
  expectations: {
    textImage:
      "Pink crystal / rose-quartz bracelet jewelry product ad. Clean social-post composition. No zodiac, Aquarius, or unrelated topic. No garbled text overlays.",
    editImage:
      "Product photo of pink crystal bracelet with clean white/studio e-commerce background. Recognizable jewelry item.",
    dualEdit:
      "Layout-transfer ad: user's pink crystal bracelet as hero, borrowing reference carousel/poster design family. No zodiac/水瓶座 topic from reference.",
    carouselSlide1:
      "Teaching carousel cover slide about user's pink crystal bracelet. Info-poster layout rhythm similar to reference. Product copy, not reference topic.",
    i2vFrame:
      "Video frame shows pink crystal bracelet jewelry with plausible product showcase motion. No severe distortion, no unrelated zodiac/horoscope content.",
    t2vFrame:
      "Video frame shows pink crystal bracelet jewelry in a short ad-style shot. Photorealistic, no heavy artifacts.",
  },
  mustAvoid: ["水瓶座", "zodiac", "horoscope", "unrelated crystal healing claims as main topic"],
} as const;

export type SmokeArtifactKind = "image" | "video" | "audio" | "json" | "planner";

export type SmokeArtifact = {
  id: string;
  label: string;
  kind: SmokeArtifactKind;
  file?: string;
  poster?: string;
  expectation?: string;
  reviewId?: string;
  meta?: Record<string, string | number | boolean>;
};

export type SmokeLayoutReviewRecord = {
  artifactId: string;
  label: string;
  layoutScore: number;
  matchesReferenceLayout: boolean;
  summary: string;
  borrowedElements: string[];
  driftIssues: string[];
};

export type SmokeReviewRecord = {
  artifactId: string;
  label: string;
  review: import("../../lib/pipeline-smoke-review").PipelineSmokeReview;
};
