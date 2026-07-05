import { readFileSync } from "node:fs";
import { fal } from "@fal-ai/client";
import sharp from "sharp";
import { styleReferencePromptBlock } from "../../lib/content-research-promote";
import type { ContentAngleCandidate, ContentResearchPlan } from "../../lib/content-research-types";
import { defaultEditEndpoint } from "../../lib/image-endpoints";
import {
  buildPromptVariables,
  buildTeachingCarouselSlideImagePrompt,
  buildWizardImagePrompt,
  resolveImagePromptMode,
} from "../../lib/prompt-variables";
import {
  referenceStrategyPromptBlock,
  resolveReferenceStrategy,
} from "../../lib/reference-strategy";
import { planTeachingCarousel } from "../../lib/teaching-carousel-plan";
import { briefFromUserTextOnly } from "../../lib/user-reference-brief";
import { artStyleSystemPrompt, resolveArtStyleId } from "../../lib/art-style";
import { SMOKE_SCENARIO } from "./pipeline-smoke-scenario";

/** XHS-style 3-panel carousel reference (layout only — not a real post). */
export async function createXhsStyleReferencePng(outPath: string): Promise<void> {
  const svg = `<svg width="800" height="1000" xmlns="http://www.w3.org/2000/svg">
    <rect width="800" height="1000" fill="#fff5f8"/>
    <rect x="40" y="40" width="720" height="280" rx="24" fill="#f8d7e8"/>
    <rect x="40" y="360" width="720" height="280" rx="24" fill="#fce8f0"/>
    <rect x="40" y="680" width="720" height="280" rx="24" fill="#f3e5f5"/>
    <text x="400" y="120" text-anchor="middle" font-size="42" fill="#9d4d6a" font-family="sans-serif">封面標題區</text>
    <text x="400" y="440" text-anchor="middle" font-size="36" fill="#7a3e58" font-family="sans-serif">要點 ①</text>
    <text x="400" y="760" text-anchor="middle" font-size="36" fill="#7a3e58" font-family="sans-serif">總結 CTA</text>
  </svg>`;
  await sharp(Buffer.from(svg)).png().toFile(outPath);
}

function smokeStyleExtra(): string {
  const angle: ContentAngleCandidate = {
    id: "smoke-angle",
    title: "粉晶攻略",
    hook: "水瓶座必看",
    scriptOutline: "三招選粉晶",
    format: "teaching-carousel",
    formatLabel: "教學輪播",
    whyItWorks: "結構清晰",
    bulletPoints: ["選色", "佩戴", "保養"],
    cta: "了解更多",
    score: 90,
    sourceTitle: "粉水晶功效懶人包（參考標題勿抄題材）",
    sourceImageUrls: ["https://example.com/ref1", "https://example.com/ref2", "https://example.com/ref3"],
  };
  const plan: ContentResearchPlan = {
    platform: "xiaohongshu",
    platformLabel: "小紅書",
    topic: SMOKE_SCENARIO.searchTopic,
    summary: "smoke",
    researchMode: "playbook",
    candidates: [angle],
    topPicks: [angle],
  };
  return styleReferencePromptBlock(angle, plan, SMOKE_SCENARIO.product);
}

export function buildXhsDualEditPrompt(): {
  prompt: string;
  strategy: ReturnType<typeof resolveReferenceStrategy>;
} {
  const styleExtra = smokeStyleExtra();
  const brief = briefFromUserTextOnly({
    headline: SMOKE_SCENARIO.headline,
    subline: `推廣${SMOKE_SCENARIO.product}`,
    promptExtra: styleExtra,
  });
  if (!brief) throw new Error("Missing brief for dual-edit");
  const strategy = resolveReferenceStrategy({
    promotionMode: "physical",
    imageOutputMode: "single",
    visualStyleId: "product",
    imageCreativeMode: "reference-concept",
    hasReferenceUpload: true,
    hasProductPhoto: true,
    hasReferenceBrief: true,
  });
  const vars = buildPromptVariables({
    product: SMOKE_SCENARIO.product,
    headline: SMOKE_SCENARIO.headline,
    subline: `推廣${SMOKE_SCENARIO.product}`,
    market: "hk",
    framing: "auto",
    extra: [styleExtra, referenceStrategyPromptBlock(brief, strategy)].filter(Boolean).join(" | "),
  });
  const mode = resolveImagePromptMode("product", "reference-concept", {
    promotionMode: "physical",
    workflowMode: "image-only",
  });
  const prompt = buildWizardImagePrompt(vars, mode, null, "product");
  return { prompt, strategy };
}

export async function runDualEditGeneration(opts: {
  styleRefPath: string;
  productPath: string;
}): Promise<string> {
  const { prompt, strategy } = buildXhsDualEditPrompt();
  if (!strategy.useDualImage) {
    throw new Error("Expected layout-transfer dual-image strategy");
  }
  const styleFile = new File([readFileSync(opts.styleRefPath)], "style-ref.png", {
    type: "image/png",
  });
  const productFile = new File([readFileSync(opts.productPath)], "product.png", {
    type: "image/png",
  });
  const imageUrls = [
    await fal.storage.upload(styleFile),
    await fal.storage.upload(productFile),
  ];
  const result = await fal.subscribe(defaultEditEndpoint(), {
    input: {
      prompt,
      image_urls: imageUrls,
      aspect_ratio: "4:5",
      num_images: 1,
      resolution: "1K",
      limit_generations: true,
      system_prompt: artStyleSystemPrompt(resolveArtStyleId(undefined)),
    },
    logs: false,
  });
  const data = result.data as { images?: Array<{ url?: string }> };
  const url = data.images?.[0]?.url;
  if (!url) throw new Error("Dual-edit: no image URL");
  return url;
}

export async function runCarouselSlide1Generation(opts: {
  styleRefPath: string;
  productPath: string;
}): Promise<{ imageUrl: string; plan: Awaited<ReturnType<typeof planTeachingCarousel>> }> {
  const styleExtra = smokeStyleExtra();
  const strategy = resolveReferenceStrategy({
    promotionMode: "physical",
    imageOutputMode: "teaching-carousel",
    visualStyleId: "info-poster",
    hasReferenceUpload: true,
    hasProductPhoto: true,
    hasReferenceBrief: true,
  });
  const brief = briefFromUserTextOnly({
    headline: SMOKE_SCENARIO.headline,
    subline: `推廣${SMOKE_SCENARIO.product}`,
    promptExtra: styleExtra,
  });
  if (!brief) throw new Error("Missing brief for dual-edit");
  const strategyBlock = referenceStrategyPromptBlock(brief, strategy);
  const promptExtra = [styleExtra, strategyBlock].filter(Boolean).join(" | ");

  const plan = await planTeachingCarousel({
    visualStyleId: "info-poster",
    promotionMode: "physical",
    product: SMOKE_SCENARIO.product,
    headline: SMOKE_SCENARIO.headline,
    subline: `推廣${SMOKE_SCENARIO.product}`,
    slideCount: 4,
    promptMarket: "hk",
    promptExtra,
  });

  const slide = plan.slides[0];
  if (!slide) throw new Error("Carousel plan missing slide 1");

  const vars = buildPromptVariables({
    product: SMOKE_SCENARIO.product,
    headline: SMOKE_SCENARIO.headline,
    subline: `推廣${SMOKE_SCENARIO.product}`,
    market: "hk",
    framing: "auto",
    extra: promptExtra,
  });
  const promptMode = resolveImagePromptMode(
    "info-poster",
    strategy.useReferenceConceptPrompts ? "reference-concept" : "promo-ai",
    { promotionMode: "physical", workflowMode: "image-only" },
  );
  const prompt = buildTeachingCarouselSlideImagePrompt(
    vars,
    plan,
    slide,
    plan.slides.length,
    promptMode,
    null,
    strategy.referenceImageMode,
    { visualStyleId: "info-poster", referenceConcept: strategy.useReferenceConceptPrompts },
  );

  let imageUrlsForFal: string[] | undefined;
  if (strategy.sendPixelsToFal && strategy.useDualImage) {
    const styleFile = new File([readFileSync(opts.styleRefPath)], "style-ref.png", {
      type: "image/png",
    });
    const productFile = new File([readFileSync(opts.productPath)], "product.png", {
      type: "image/png",
    });
    imageUrlsForFal = [
      await fal.storage.upload(styleFile),
      await fal.storage.upload(productFile),
    ];
  }

  const result = await fal.subscribe(defaultEditEndpoint(), {
    input: {
      prompt,
      ...(imageUrlsForFal?.length ? { image_urls: imageUrlsForFal } : {}),
      aspect_ratio: "4:5",
      num_images: 1,
      resolution: "1K",
      limit_generations: true,
      system_prompt: artStyleSystemPrompt(resolveArtStyleId(undefined)),
    },
    logs: false,
  });
  const data = result.data as { images?: Array<{ url?: string }> };
  const url = data.images?.[0]?.url;
  if (!url) throw new Error("Carousel slide 1: no image URL");
  return { imageUrl: url, plan };
}
