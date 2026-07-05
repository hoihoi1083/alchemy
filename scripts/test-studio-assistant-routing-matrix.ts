/**
 * Broad routing matrix — real user phrasings, different angles.
 * No LLM, no network. Catches intent / coach / action-link regressions.
 * Run: npm run test:assistant
 */
import assert from "node:assert/strict";
import { buildCoachReply } from "../lib/studio-assistant-coach";
import { getNextStudioCoachTask, type CoachTaskKind } from "../lib/studio-assistant-coach-profile";
import { enforceLandingCoachAction } from "../lib/studio-assistant-enforce-coach";
import {
  detectStudioAssistantIntent,
  type StudioAssistantIntent,
} from "../lib/studio-assistant-intent";
import { shouldUseLandingCoachFastPath, tryStudioAssistantFastPath } from "../lib/studio-assistant-fast-paths";
import { appendPrimaryActionIfMissing, normalizeAssistantActionLinks } from "../lib/studio-assistant-action-links";
import type { StudioAssistantSnapshot } from "../lib/studio-assistant-types";

type Surface = "landing" | "start" | "studio";

type MatrixCase = {
  id: string;
  message: string;
  surface?: Surface;
  expectIntent: StudioAssistantIntent;
  expectTask: CoachTaskKind;
  expectAction: string;
  forbidActions?: string[];
  /** Landing messages should hit deterministic coach, not LLM */
  expectFastPath?: boolean;
  /** Simulate LLM returning wrong concept button — enforce must fix */
  llmWrongButton?: boolean;
};

function snap(surface: Surface = "landing"): StudioAssistantSnapshot {
  return {
    surface,
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
  };
}

function finalizeLandingReply(
  rawReply: string,
  snapshot: StudioAssistantSnapshot,
  intent: StudioAssistantIntent,
  message: string,
): string {
  let reply = rawReply.replaceAll("**", "").trim();
  reply = normalizeAssistantActionLinks(reply);
  reply = appendPrimaryActionIfMissing(reply, {
    snapshot,
    locale: "en",
    userWritesEnglish: /^[\x00-\x7F\s]+$/.test(message),
    hasWebsiteUrl: /https?:\/\//i.test(message),
    campaignHint: message,
    userText: message,
    intent,
  });
  const task = getNextStudioCoachTask(snapshot, { intent, userText: message });
  return enforceLandingCoachAction(
    reply,
    task,
    snapshot,
    /^[\x00-\x7F\s]+$/.test(message),
  );
}

const PHYSICAL_IMAGE_POST: MatrixCase[] = [
  {
    id: "pi-en-nasal",
    message: "I want to build a post with images about my product nasal washing",
    expectIntent: "physical_image_post",
    expectTask: "route-physical-image-post",
    expectAction: "studio-action:open-physical-studio",
    forbidActions: ["studio-action:setup-website-reel"],
    expectFastPath: true,
    llmWrongButton: true,
  },
  {
    id: "pi-en-carousel",
    message: "Create a carousel with photos of my skincare serum",
    expectIntent: "physical_image_post",
    expectTask: "route-physical-image-post",
    expectAction: "studio-action:open-physical-studio",
    forbidActions: ["studio-action:setup-website-reel"],
    expectFastPath: true,
  },
  {
    id: "pi-en-static",
    message: "Static image post for my product — a portable blender",
    expectIntent: "physical_image_post",
    expectTask: "route-physical-image-post",
    expectAction: "studio-action:open-physical-studio",
    forbidActions: ["studio-action:setup-website-reel"],
    expectFastPath: true,
  },
  {
    id: "pi-en-images-about",
    message: "Need images about my product for Instagram",
    expectIntent: "physical_image_post",
    expectTask: "route-physical-image-post",
    expectAction: "studio-action:open-physical-studio",
    forbidActions: ["studio-action:setup-website-reel"],
    expectFastPath: true,
  },
  {
    id: "pi-en-build-post",
    message: "Help me build a post for my product launch",
    expectIntent: "physical_image_post",
    expectTask: "route-physical-image-post",
    expectAction: "studio-action:open-physical-studio",
    forbidActions: ["studio-action:setup-website-reel"],
    expectFastPath: true,
  },
  {
    id: "pi-zh-post",
    message: "我想整個產品圖文帖推廣洗鼻器",
    expectIntent: "physical_image_post",
    expectTask: "route-physical-image-post",
    expectAction: "studio-action:open-physical-studio",
    forbidActions: ["studio-action:setup-website-reel"],
    expectFastPath: true,
  },
  {
    id: "pi-zh-image-only",
    message: "實體產品只出圖，唔要片",
    expectIntent: "physical_image_post",
    expectTask: "route-physical-image-post",
    expectAction: "studio-action:open-physical-studio",
    forbidActions: ["studio-action:setup-website-reel"],
    expectFastPath: true,
  },
  {
    id: "pi-start-surface",
    message: "post with images about my product nasal washing",
    surface: "start",
    expectIntent: "physical_image_post",
    expectTask: "route-physical-image-post",
    expectAction: "studio-action:open-physical-studio",
    forbidActions: ["studio-action:setup-website-reel"],
    expectFastPath: true,
  },
];

const PHYSICAL_VIDEO: MatrixCase[] = [
  {
    id: "pv-en-reel",
    message: "TikTok reel for my bracelet product",
    expectIntent: "physical_product",
    expectTask: "route-physical-product",
    expectAction: "studio-action:open-physical-studio",
    forbidActions: ["studio-action:setup-website-reel"],
    expectFastPath: true,
  },
  {
    id: "pv-en-packshot",
    message: "Product photo ad for my crystal bracelet",
    expectIntent: "physical_product",
    expectTask: "route-physical-product",
    expectAction: "studio-action:open-physical-studio",
    forbidActions: ["studio-action:setup-website-reel"],
    expectFastPath: true,
  },
  {
    id: "pv-en-video",
    message: "Make a product video for my nasal rinse bottle",
    expectIntent: "physical_product",
    expectTask: "route-physical-product",
    expectAction: "studio-action:open-physical-studio",
    forbidActions: ["studio-action:setup-website-reel"],
    expectFastPath: true,
  },
  {
    id: "pv-zh",
    message: "幫我整實體產品廣告片，賣護膚品",
    expectIntent: "physical_product",
    expectTask: "route-physical-product",
    expectAction: "studio-action:open-physical-studio",
    forbidActions: ["studio-action:setup-website-reel"],
    expectFastPath: true,
  },
];

const WEBSITE_VIDEO: MatrixCase[] = [
  {
    id: "wv-en-url",
    message: "8s reel for https://harmoniqfengshui.com world cup feature",
    expectIntent: "website_video",
    expectTask: "route-website-reel",
    expectAction: "studio-action:setup-website-reel",
    expectFastPath: true,
  },
  {
    id: "wv-en-saas",
    message: "Promote my SaaS website with a short video",
    expectIntent: "website_video",
    expectTask: "route-website-reel",
    expectAction: "studio-action:setup-website-reel",
    expectFastPath: true,
  },
  {
    id: "wv-zh",
    message: "幫我整條8秒Reel推廣網站新功能",
    expectIntent: "website_video",
    expectTask: "route-website-reel",
    expectAction: "studio-action:setup-website-reel",
    expectFastPath: true,
  },
];

const WEBSITE_IMAGE: MatrixCase[] = [
  {
    id: "wi-en-poster",
    message: "Static launch poster for my website",
    expectIntent: "website_image",
    expectTask: "route-website-image",
    expectAction: "studio-action:website-launch-image",
    forbidActions: ["studio-action:setup-website-reel"],
    expectFastPath: true,
  },
  {
    id: "wi-en-mockup",
    message: "Website mockup image only for app launch",
    expectIntent: "website_image",
    expectTask: "route-website-image",
    expectAction: "studio-action:website-launch-image",
    expectFastPath: true,
  },
];

const STORYBOARD: MatrixCase[] = [
  {
    id: "sb-en",
    message: "Product storyboard multi-scene video for my watch",
    expectIntent: "physical_product",
    expectTask: "route-storyboard",
    expectAction: "studio-action:open-storyboard-studio",
    forbidActions: ["studio-action:setup-website-reel"],
    expectFastPath: true,
  },
  {
    id: "sb-zh",
    message: "產品分鏡多場景片",
    expectIntent: "physical_product",
    expectTask: "route-storyboard",
    expectAction: "studio-action:open-storyboard-studio",
    expectFastPath: true,
  },
];

const OTHER: MatrixCase[] = [
  {
    id: "cap-en",
    message: "Burn captions on my mp4",
    expectIntent: "captions_only",
    expectTask: "route-captions",
    expectAction: "studio-action:open-captions",
    expectFastPath: true,
  },
  {
    id: "pro-en",
    message: "use /pro node canvas",
    expectIntent: "pro_canvas",
    expectTask: "route-pro-canvas",
    expectAction: "/pro",
    expectFastPath: true,
  },
];

/** Must NOT silently open concept 8s Reel */
const ANTI_CONCEPT_TRAP: MatrixCase[] = [
  {
    id: "trap-my-product",
    message: "my product is a nasal washer, need social content",
    expectIntent: "physical_product",
    expectTask: "route-physical-product",
    expectAction: "studio-action:open-physical-studio",
    forbidActions: ["studio-action:setup-website-reel"],
    expectFastPath: true,
    llmWrongButton: true,
  },
  {
    id: "trap-product-images",
    message: "generate product images for my supplement",
    expectIntent: "physical_image_post",
    expectTask: "route-physical-image-post",
    expectAction: "studio-action:open-physical-studio",
    forbidActions: ["studio-action:setup-website-reel"],
    expectFastPath: true,
    llmWrongButton: true,
  },
  {
    id: "trap-physical-sku",
    message: "I sell physical goods — nasal irrigation kit — want photos",
    expectIntent: "physical_product",
    expectTask: "route-physical-product",
    expectAction: "studio-action:open-physical-studio",
    forbidActions: ["studio-action:setup-website-reel"],
    expectFastPath: true,
    llmWrongButton: true,
  },
];

const REFERENCE_AD: MatrixCase[] = [
  {
    id: "ref-zh-hk-layout-ad",
    message: "我想做參考排版廣告，產品是洗鼻器，賣點是溫和洗鼻",
    expectIntent: "reference_ad",
    expectTask: "route-reference-ad",
    expectAction: "studio-action:open-reference-ad-studio",
    forbidActions: ["studio-action:open-physical-studio"],
    expectFastPath: true,
  },
  {
    id: "ref-en-layout",
    message: "Copy this XHS ad layout for my skincare product",
    expectIntent: "reference_ad",
    expectTask: "route-reference-ad",
    expectAction: "studio-action:open-reference-ad-studio",
    forbidActions: ["studio-action:setup-website-reel"],
    expectFastPath: true,
  },
  {
    id: "ref-zh-hk",
    message: "我想跟住小紅書參考廣告排版出圖",
    expectIntent: "reference_ad",
    expectTask: "route-reference-ad",
    expectAction: "studio-action:open-reference-ad-studio",
    forbidActions: ["studio-action:setup-website-reel"],
    expectFastPath: true,
  },
  {
    id: "ref-zh-cn",
    message: "参考这个广告同款排版，做我的护肤品",
    expectIntent: "reference_ad",
    expectTask: "route-reference-ad",
    expectAction: "studio-action:open-reference-ad-studio",
    expectFastPath: true,
  },
  {
    id: "ref-tw",
    message: "對標競品IG帖排版出圖",
    expectIntent: "reference_ad",
    expectTask: "route-reference-ad",
    expectAction: "studio-action:open-reference-ad-studio",
    expectFastPath: true,
  },
];

const REGION_PHYSICAL: MatrixCase[] = [
  {
    id: "hk-zh-image",
    message: "幫我整個香港護膚品圖文帖，只出圖",
    expectIntent: "physical_image_post",
    expectTask: "route-physical-image-post",
    expectAction: "studio-action:open-physical-studio",
    forbidActions: ["studio-action:setup-website-reel"],
    expectFastPath: true,
  },
  {
    id: "cn-zh-video",
    message: "帮我做实体产品抖音短视频",
    expectIntent: "physical_product",
    expectTask: "route-physical-product",
    expectAction: "studio-action:open-physical-studio",
    forbidActions: ["studio-action:setup-website-reel"],
    expectFastPath: true,
  },
  {
    id: "en-us-carousel",
    message: "Carousel image post for my HK boutique jewelry product",
    expectIntent: "physical_image_post",
    expectTask: "route-physical-image-post",
    expectAction: "studio-action:open-physical-studio",
    forbidActions: ["studio-action:setup-website-reel"],
    expectFastPath: true,
  },
];

const ALL = [
  ...PHYSICAL_IMAGE_POST,
  ...PHYSICAL_VIDEO,
  ...WEBSITE_VIDEO,
  ...WEBSITE_IMAGE,
  ...STORYBOARD,
  ...REFERENCE_AD,
  ...REGION_PHYSICAL,
  ...OTHER,
  ...ANTI_CONCEPT_TRAP,
];

let passed = 0;
let failed = 0;

for (const c of ALL) {
  const surface = c.surface ?? "landing";
  const snapshot = snap(surface);
  try {
    const intent = detectStudioAssistantIntent(c.message);
    assert.equal(intent, c.expectIntent, `[${c.id}] intent`);

    const task = getNextStudioCoachTask(snapshot, { intent, userText: c.message });
    assert.equal(task, c.expectTask, `[${c.id}] task`);

    const fast = tryStudioAssistantFastPath(
      c.message,
      snapshot,
      /^[\x00-\x7F\s]+$/.test(c.message) ? "en" : "zh",
      [{ role: "user", content: c.message }],
      undefined,
      intent,
    );
    if (c.expectFastPath !== undefined) {
      const usesFast = shouldUseLandingCoachFastPath(c.message, snapshot);
      assert.equal(
        usesFast || Boolean(fast),
        c.expectFastPath,
        `[${c.id}] fastPath expected ${c.expectFastPath}`,
      );
    }

    const reply =
      fast ??
      buildCoachReply(task, snapshot, "en", {
        campaignHint: c.message,
        userText: c.message,
        intent,
      });

    const finalReply = surface !== "studio" ? finalizeLandingReply(reply, snapshot, intent, c.message) : reply;

    assert.ok(
      finalReply.includes(c.expectAction),
      `[${c.id}] missing action ${c.expectAction}\n---\n${finalReply.slice(0, 300)}`,
    );
    for (const bad of c.forbidActions ?? []) {
      assert.ok(
        !finalReply.includes(bad),
        `[${c.id}] must not include ${bad}\n---\n${finalReply.slice(0, 300)}`,
      );
    }

    if (c.llmWrongButton && surface !== "studio") {
      const poison =
        "Sure! [Set up & open studio](studio-action:setup-website-reel) for your 8s cinematic Reel.";
      const fixed = finalizeLandingReply(poison, snapshot, intent, c.message);
      assert.ok(
        fixed.includes(c.expectAction),
        `[${c.id}] LLM enforce missing correct action`,
      );
      assert.ok(
        !fixed.includes("setup-website-reel"),
        `[${c.id}] LLM enforce still has setup-website-reel`,
      );
    }

    passed++;
    console.log(`✓ ${c.id}`);
  } catch (e) {
    failed++;
    console.error(`✗ ${c.id}: ${c.message.slice(0, 60)}…`);
    console.error(e instanceof Error ? e.message : e);
  }
}

console.log(`\nRouting matrix: ${passed} passed, ${failed} failed, ${ALL.length} total`);
if (failed > 0) process.exit(1);
