/**
 * Deterministic coach tests — no LLM, no network.
 * Run: npm run test:coach
 */
import assert from "node:assert/strict";
import { buildCoachReply } from "../lib/studio-assistant-coach";
import {
  getNextStudioCoachTask,
  type CoachTaskKind,
} from "../lib/studio-assistant-coach-profile";
import { coachTaskToTargetId, shouldShowSpotlight } from "../lib/studio-assistant-coach-targets";
import { detectStudioAssistantIntent } from "../lib/studio-assistant-intent";
import { tryStudioAssistantFastPath } from "../lib/studio-assistant-fast-paths";
import { enforceLandingCoachAction } from "../lib/studio-assistant-enforce-coach";
import { inferPhysicalProductName } from "../lib/studio-assistant-product-intent";
import { initialCoachTaskAfterHandoff } from "../lib/studio-assistant-handoff-coach";
import type { StudioAssistantSnapshot } from "../lib/studio-assistant-types";

type Case = {
  name: string;
  snapshot: StudioAssistantSnapshot;
  userText: string;
  detectedUrl?: string;
  expectTask: CoachTaskKind;
  expectReplyIncludes: string[];
  expectNoReplyIncludes?: string[];
  expectSpotlight?: boolean;
};

function snap(
  partial: Partial<StudioAssistantSnapshot> & Pick<StudioAssistantSnapshot, "surface">,
): StudioAssistantSnapshot {
  return {
    promotionMode: "concept",
    workflowMode: "combined",
    stepKey: "setup",
    visualStyleId: "concept-cinematic",
    promptMarket: "hk",
    product: "",
    business: "",
    headline: "",
    subline: "",
    offer: "",
    conceptIdea: "",
    creativeVideoBrief: "",
    brandWebsiteUrl: "",
    hasBrandProfile: false,
    hasProductPhoto: false,
    hasKeyframe: false,
    hasStoryboardScenes: false,
    hasVideo: false,
    cinematicSceneCount: 1,
    cinematicScenesCount: 0,
    storyboardBrief: "",
    usesCompositor: false,
    error: null,
    voiceoverEnabled: true,
    captionBurnEnabled: true,
    coachAck: [],
    ...partial,
  };
}

const CASES: Case[] = [
  {
    name: "landing website 8s reel",
    snapshot: snap({ surface: "landing" }),
    userText: "I want 8s reel for https://harmoniqfengshui.com world cup",
    detectedUrl: "https://harmoniqfengshui.com",
    expectTask: "route-website-reel",
    expectReplyIncludes: ["studio-action:setup-website-reel"],
    expectSpotlight: true,
  },
  {
    name: "landing static website image",
    snapshot: snap({ surface: "start" }),
    userText: "static launch poster for my website",
    expectTask: "route-website-image",
    expectReplyIncludes: ["studio-action:website-launch-image"],
  },
  {
    name: "landing physical product",
    snapshot: snap({ surface: "landing", promotionMode: "physical" }),
    userText: "product photo ad for my bracelet",
    expectTask: "route-physical-product",
    expectReplyIncludes: ["studio-action:open-physical-studio"],
  },
  {
    name: "landing physical image post — nasal washing (regression)",
    snapshot: snap({ surface: "landing" }),
    userText: "I want to build a post with images about my product nasal washing",
    expectTask: "route-physical-image-post",
    expectReplyIncludes: ["studio-action:open-physical-studio", "image-only", "Not concept"],
    expectNoReplyIncludes: ["studio-action:setup-website-reel"],
  },
  {
    name: "landing storyboard",
    snapshot: snap({ surface: "landing" }),
    userText: "product storyboard multi-scene video",
    expectTask: "route-storyboard",
    expectReplyIncludes: ["studio-action:open-storyboard-studio"],
  },
  {
    name: "landing captions only",
    snapshot: snap({ surface: "landing" }),
    userText: "burn captions on my mp4",
    expectTask: "route-captions",
    expectReplyIncludes: ["studio-action:open-captions"],
  },
  {
    name: "landing pro canvas",
    snapshot: snap({ surface: "landing" }),
    userText: "use /pro node canvas",
    expectTask: "route-pro-canvas",
    expectReplyIncludes: ["/pro"],
  },
  {
    name: "studio concept cinematic — fill concept first (no URL required)",
    snapshot: snap({
      surface: "studio",
      promotionMode: "concept",
      visualStyleId: "concept-cinematic",
      brandWebsiteUrl: "",
      conceptIdea: "",
    }),
    userText: "next",
    expectTask: "fill-concept",
    expectReplyIncludes: ["Concept description"],
    expectNoReplyIncludes: ["Analyze brand"],
    expectSpotlight: true,
  },
  {
    name: "studio concept cinematic — paste URL in field",
    snapshot: snap({
      surface: "studio",
      conceptIdea: "World Cup zone promo",
      brandWebsiteUrl: "",
    }),
    userText: "next",
    detectedUrl: "https://harmoniqfengshui.com",
    expectTask: "enter-brand-url",
    expectReplyIncludes: ["Brand website", "harmoniqfengshui"],
    expectNoReplyIncludes: ["studio-action:setup-website-reel"],
    expectSpotlight: true,
  },
  {
    name: "studio concept — analyze brand after URL in field",
    snapshot: snap({
      surface: "studio",
      conceptIdea: "World Cup zone",
      brandWebsiteUrl: "https://harmoniqfengshui.com",
      headline: "",
      hasBrandProfile: false,
    }),
    userText: "next",
    expectTask: "analyze-brand",
    expectReplyIncludes: ["studio-action:analyze-brand", "Analyze brand"],
    expectSpotlight: true,
  },
  {
    name: "studio concept — continue setup when ready",
    snapshot: snap({
      surface: "studio",
      conceptIdea: "World Cup",
      brandWebsiteUrl: "https://example.com",
      headline: "World Cup zone",
      hasBrandProfile: true,
    }),
    userText: "next",
    expectTask: "continue-setup",
    expectReplyIncludes: ["Continue"],
    expectSpotlight: true,
  },
  {
    name: "physical product — upload photo before URL",
    snapshot: snap({
      surface: "studio",
      promotionMode: "physical",
      visualStyleId: "product",
      workflowMode: "combined",
      product: "Crystal bracelet",
      coachAck: ["fill-product-name", "choose-visual-style", "choose-image-output"],
    }),
    userText: "next",
    expectTask: "upload-product-photo",
    expectReplyIncludes: ["Upload product photo"],
    expectNoReplyIncludes: ["品牌網站"],
    expectSpotlight: true,
  },
  {
    name: "storyboard — product name first",
    snapshot: snap({
      surface: "studio",
      promotionMode: "physical",
      visualStyleId: "storyboard-video",
      product: "",
    }),
    userText: "next",
    expectTask: "fill-product-name",
    expectReplyIncludes: ["Product name"],
  },
  {
    name: "storyboard — brief after product name",
    snapshot: snap({
      surface: "studio",
      promotionMode: "physical",
      visualStyleId: "storyboard-video",
      product: "Crystal bracelet",
      storyboardBrief: "",
    }),
    userText: "next",
    expectTask: "fill-storyboard-brief",
    expectReplyIncludes: ["Storyboard brief"],
  },
  {
    name: "concept storyboard — continue setup (no product name)",
    snapshot: snap({
      surface: "studio",
      promotionMode: "concept",
      workflowMode: "video-only",
      visualStyleId: "storyboard-video",
      conceptIdea: "TikTok style angle from research",
      headline: "Hook line",
      product: "",
    }),
    userText: "next",
    expectTask: "continue-setup",
    expectReplyIncludes: ["Continue", "reference reel"],
    expectNoReplyIncludes: ["Product name"],
  },
  {
    name: "concept storyboard — fill concept when empty",
    snapshot: snap({
      surface: "studio",
      promotionMode: "concept",
      workflowMode: "video-only",
      visualStyleId: "storyboard-video",
      conceptIdea: "",
      headline: "",
    }),
    userText: "next",
    expectTask: "fill-concept",
    expectReplyIncludes: ["Concept"],
    expectNoReplyIncludes: ["Product name"],
  },
  {
    name: "concept storyboard — image step scene stills",
    snapshot: snap({
      surface: "studio",
      promotionMode: "concept",
      workflowMode: "video-only",
      stepKey: "image",
      visualStyleId: "storyboard-video",
      conceptIdea: "Brand story reel",
      headline: "Main hook",
      hasStoryboardScenes: false,
    }),
    userText: "next",
    expectTask: "generate-storyboard-scenes",
    expectReplyIncludes: ["No product photo"],
  },
  {
    name: "image step brand-fit needs analyze first",
    snapshot: snap({
      surface: "studio",
      stepKey: "image",
      visualStyleId: "brand-fit",
      brandWebsiteUrl: "https://example.com",
      hasBrandProfile: false,
      hasProductPhoto: true,
    }),
    userText: "next",
    expectTask: "analyze-brand-before-image",
    expectReplyIncludes: ["Analyze brand"],
  },
  {
    name: "image step cinematic keyframe",
    snapshot: snap({
      surface: "studio",
      stepKey: "image",
      visualStyleId: "concept-cinematic",
      conceptIdea: "World Cup fans",
      hasKeyframe: false,
      cinematicScenesCount: 0,
    }),
    userText: "next",
    expectTask: "generate-cinematic-keyframe",
    expectReplyIncludes: ["keyframe"],
  },
  {
    name: "image step storyboard scenes",
    snapshot: snap({
      surface: "studio",
      promotionMode: "physical",
      stepKey: "image",
      visualStyleId: "storyboard-video",
      hasStoryboardScenes: false,
      product: "Watch",
      storyboardBrief: "Luxury unboxing",
    }),
    userText: "next",
    expectTask: "generate-storyboard-scenes",
    expectReplyIncludes: ["storyboard"],
  },
  {
    name: "image-only workflow done at image",
    snapshot: snap({
      surface: "studio",
      workflowMode: "image-only",
      visualStyleId: "website-launch",
      stepKey: "image",
      hasKeyframe: true,
      business: "HarmonIQ",
      headline: "Launch",
    }),
    userText: "next",
    expectTask: "done-download",
    expectReplyIncludes: ["download"],
  },
  {
    name: "video step ad pack",
    snapshot: snap({
      surface: "studio",
      stepKey: "video",
      visualStyleId: "concept-cinematic",
      hasKeyframe: true,
      voiceoverEnabled: true,
      hasVideo: false,
    }),
    userText: "next",
    expectTask: "plan-ad-pack",
    expectReplyIncludes: ["Ad pack"],
  },
  {
    name: "video step storyboard generate",
    snapshot: snap({
      surface: "studio",
      promotionMode: "physical",
      stepKey: "video",
      visualStyleId: "storyboard-video",
      hasStoryboardScenes: true,
      hasKeyframe: true,
      hasVideo: false,
    }),
    userText: "next",
    expectTask: "generate-storyboard-video",
    expectReplyIncludes: ["storyboard"],
  },
  {
    name: "wizard error surfaces fix-error",
    snapshot: snap({
      surface: "studio",
      error: "Need headline",
    }),
    userText: "next",
    expectTask: "fix-error",
    expectReplyIncludes: ["Need headline"],
  },
  {
    name: "fast path 下一步 on setup",
    snapshot: snap({ surface: "studio", conceptIdea: "", brandWebsiteUrl: "" }),
    userText: "下一步",
    expectTask: "fill-concept",
    expectReplyIncludes: ["概念描述"],
  },
  {
    name: "physical image post — step 1 product name",
    snapshot: snap({
      surface: "studio",
      promotionMode: "physical",
      workflowMode: "image-only",
      visualStyleId: "product",
      product: "",
    }),
    userText: "next",
    expectTask: "fill-product-name",
    expectReplyIncludes: ["Step 1", "Product name"],
  },
  {
    name: "reference ad image — style reference first",
    snapshot: snap({
      surface: "studio",
      promotionMode: "physical",
      workflowMode: "image-only",
      stepKey: "image",
      visualStyleId: "product",
      product: "Serum",
      imageCreativeMode: "reference-concept",
      hasStyleReference: false,
      hasProductPhoto: false,
    }),
    userText: "next",
    expectTask: "upload-style-reference",
    expectReplyIncludes: ["style reference"],
    expectSpotlight: true,
  },
  {
    name: "reference ad landing",
    snapshot: snap({ surface: "landing" }),
    userText: "Copy a reference ad layout like XHS for my product",
    expectTask: "route-reference-ad",
    expectReplyIncludes: ["studio-action:open-reference-ad-studio"],
    expectNoReplyIncludes: ["setup-website-reel"],
  },
];

let passed = 0;
let failed = 0;

for (const c of CASES) {
  const intent = detectStudioAssistantIntent(c.userText);
  const task = getNextStudioCoachTask(c.snapshot, {
    intent,
    detectedUrl: c.detectedUrl,
    userText: c.userText,
  });

  try {
    assert.equal(
      task,
      c.expectTask,
      `[${c.name}] task: got ${task}, want ${c.expectTask}`,
    );

    const reply =
      tryStudioAssistantFastPath(
        c.userText,
        c.snapshot,
        c.userText.match(/^[\x00-\x7F\s]+$/) ? "en" : "zh",
        [{ role: "user", content: c.userText }],
        c.detectedUrl,
        intent,
      ) ??
      buildCoachReply(task, c.snapshot, "en", {
        campaignHint: c.userText,
        detectedUrl: c.detectedUrl,
        userText: c.userText,
        intent,
      });

    for (const needle of c.expectReplyIncludes) {
      assert.ok(
        reply.includes(needle),
        `[${c.name}] reply missing "${needle}"\n---\n${reply.slice(0, 400)}`,
      );
    }
    for (const banned of c.expectNoReplyIncludes ?? []) {
      assert.ok(
        !reply.includes(banned),
        `[${c.name}] reply should not include "${banned}"\n---\n${reply.slice(0, 400)}`,
      );
    }

    if (c.expectSpotlight !== undefined) {
      const hasTarget = shouldShowSpotlight(task);
      assert.equal(
        hasTarget,
        c.expectSpotlight,
        `[${c.name}] spotlight ${hasTarget} !== ${c.expectSpotlight} (target=${coachTaskToTargetId(task)})`,
      );
    }

    passed++;
    console.log(`✓ ${c.name}`);
  } catch (e) {
    failed++;
    console.error(`✗ ${c.name}`);
    console.error(e instanceof Error ? e.message : e);
  }
}

console.log(`\n${passed} passed, ${failed} failed, ${CASES.length} total`);

// Intent + LLM drift guard (simulates wrong model button)
const nasal =
  "I want to build a post with images about my product nasal washing";
const nasalIntent = detectStudioAssistantIntent(nasal);
try {
  assert.equal(nasalIntent, "physical_image_post", "nasal intent");
  assert.equal(
    inferPhysicalProductName(nasal),
    "nasal washing",
    "nasal product name",
  );
  const wrongLlm =
    "Great! [Set up & open studio](studio-action:setup-website-reel) for your 8s Reel.";
  const fixed = enforceLandingCoachAction(
    wrongLlm,
    "route-physical-image-post",
    snap({ surface: "landing" }),
    true,
  );
  assert.ok(
    fixed.includes("studio-action:open-physical-studio"),
    "enforce replaces concept link",
  );
  assert.ok(
    !fixed.includes("setup-website-reel"),
    "enforce removes setup-website-reel",
  );
  console.log("✓ regression: nasal washing intent + LLM enforce");
  passed++;
} catch (e) {
  failed++;
  console.error("✗ regression: nasal washing intent + LLM enforce");
  console.error(e instanceof Error ? e.message : e);
}

try {
  assert.equal(
    initialCoachTaskAfterHandoff({ promotionMode: "physical", recipe: "physical-image-post" }),
    "fill-product-name",
    "handoff physical-image-post starts at product name",
  );
  assert.equal(
    initialCoachTaskAfterHandoff({
      promotionMode: "physical",
      recipe: "physical-image-post",
      product: "Serum",
    }),
    "choose-visual-style",
    "handoff with product → visual style",
  );
  assert.equal(
    initialCoachTaskAfterHandoff({
      promotionMode: "physical",
      recipe: "reference-ad-layout",
    }),
    "fill-product-name",
    "reference ad handoff starts at product name",
  );
  console.log("✓ handoff spotlight order");
  passed++;
} catch (e) {
  failed++;
  console.error("✗ handoff spotlight order");
  console.error(e instanceof Error ? e.message : e);
}

if (failed > 0) process.exit(1);
