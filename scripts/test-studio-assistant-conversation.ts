/**
 * Full conversation flows — every landing route + studio mode, start to finish.
 * Run: npm run test:conversation
 */
import assert from "node:assert/strict";
import { buildCoachReply } from "../lib/studio-assistant-coach";
import { getNextStudioCoachTask, type CoachTaskKind } from "../lib/studio-assistant-coach-profile";
import { isCoachTaskComplete, isCoachRepeatTurn } from "../lib/studio-assistant-coach-completion";
import { detectStudioAssistantIntent } from "../lib/studio-assistant-intent";
import { detectStudioCoachMode } from "../lib/studio-assistant-coach-modes";
import type { StudioAssistantSnapshot } from "../lib/studio-assistant-types";

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
    imageOutputMode: "single",
    coachAck: [],
    ...partial,
  };
}

function turn(
  snapshot: StudioAssistantSnapshot,
  userText: string,
  opts?: { campaignHint?: string; previousCoachTask?: CoachTaskKind | null },
): { task: CoachTaskKind; reply: string; mode: string } {
  const hint = opts?.campaignHint ?? userText;
  const intent = detectStudioAssistantIntent(hint);
  const task = getNextStudioCoachTask(snapshot, { intent, userText: hint });
  const en = /^[\x00-\x7F\s]+$/.test(userText);
  const reply = buildCoachReply(task, snapshot, en ? "en" : "zh", {
    campaignHint: hint,
    userText,
    intent,
    previousCoachTask: opts?.previousCoachTask ?? null,
  });
  return { task, reply, mode: detectStudioCoachMode(snapshot) };
}

function ack(snapshot: StudioAssistantSnapshot, task: CoachTaskKind): StudioAssistantSnapshot {
  const coachAck = [...(snapshot.coachAck ?? [])];
  if (!coachAck.includes(task)) coachAck.push(task);
  return { ...snapshot, coachAck };
}

type FlowDef = {
  id: string;
  opening: string;
  expectLandingTask: CoachTaskKind;
  studio: StudioAssistantSnapshot;
  /** Each 下一步: optional state patch, then expected task; last may repeat */
  steps: Array<{
    patch?: Partial<StudioAssistantSnapshot>;
    expectTask: CoachTaskKind;
    expectReplyHas?: string[];
    repeatFromPrev?: boolean;
  }>;
};

const FLOWS: FlowDef[] = [
  {
    id: "physical-image-post-風鈴手串",
    opening: "I want to have a promotion on the post with my product called 風鈴手串",
    expectLandingTask: "route-physical-image-post",
    studio: snap({
      surface: "studio",
      promotionMode: "physical",
      workflowMode: "image-only",
      visualStyleId: "product",
      product: "風鈴手串",
      coachAck: ["fill-product-name"],
    }),
    steps: [
      { expectTask: "choose-visual-style", expectReplyHas: ["快速廣告", "模特"] },
      { expectTask: "choose-image-output", expectReplyHas: ["單張", "Campaign"] },
      { expectTask: "upload-product-photo", expectReplyHas: ["上傳產品相"] },
      {
        expectTask: "upload-product-photo",
        repeatFromPrev: true,
        expectReplyHas: ["仍然係呢一步", "尚未完成"],
      },
      {
        patch: { hasProductPhoto: true },
        expectTask: "continue-setup",
        expectReplyHas: ["繼續"],
      },
    ],
  },
  {
    id: "physical-combined-reel",
    opening: "TikTok reel for my bracelet product",
    expectLandingTask: "route-physical-product",
    studio: snap({
      surface: "studio",
      promotionMode: "physical",
      workflowMode: "combined",
      visualStyleId: "product",
      product: "bracelet",
      coachAck: ["fill-product-name"],
    }),
    steps: [
      { expectTask: "choose-visual-style", expectReplyHas: ["模特", "分鏡"] },
      { expectTask: "upload-product-photo", expectReplyHas: ["上傳"] },
    ],
  },
  {
    id: "physical-storyboard",
    opening: "Product storyboard multi-scene video for my watch",
    expectLandingTask: "route-storyboard",
    studio: snap({
      surface: "studio",
      promotionMode: "physical",
      visualStyleId: "storyboard-video",
      workflowMode: "combined",
    }),
    steps: [
      { expectTask: "fill-product-name", expectReplyHas: ["產品名稱"] },
      {
        patch: { product: "Luxury watch" },
        expectTask: "fill-storyboard-brief",
        expectReplyHas: ["分鏡"],
      },
    ],
  },
  {
    id: "website-8s-reel",
    opening: "8s reel for https://harmoniqfengshui.com world cup feature",
    expectLandingTask: "route-website-reel",
    studio: snap({
      surface: "studio",
      promotionMode: "concept",
      visualStyleId: "concept-cinematic",
      workflowMode: "combined",
    }),
    steps: [
      { expectTask: "fill-concept", expectReplyHas: ["概念描述"] },
      {
        patch: { conceptIdea: "World Cup zone promo for HK fans" },
        expectTask: "enter-brand-url",
        expectReplyHas: ["網址"],
      },
    ],
  },
  {
    id: "website-static-image",
    opening: "Static launch poster for my website",
    expectLandingTask: "route-website-image",
    studio: snap({
      surface: "studio",
      promotionMode: "concept",
      visualStyleId: "website-launch",
      workflowMode: "image-only",
    }),
    steps: [
      { expectTask: "enter-brand-url", expectReplyHas: ["網址"] },
    ],
  },
  {
    id: "cinematic-stitch-landing",
    opening: "24s cinematic stitch for my SaaS with 3 scenes",
    expectLandingTask: "route-cinematic-stitch",
    studio: snap({
      surface: "studio",
      promotionMode: "concept",
      visualStyleId: "concept-cinematic",
      cinematicSceneCount: 3,
      workflowMode: "combined",
    }),
    steps: [
      { expectTask: "fill-concept", expectReplyHas: ["概念描述"] },
    ],
  },
  {
    id: "concept-studio-image-step",
    opening: "Promote my yoga class",
    expectLandingTask: "route-concept-studio",
    studio: snap({
      surface: "studio",
      promotionMode: "concept",
      stepKey: "image",
      visualStyleId: "concept-cinematic",
      conceptIdea: "Yoga for busy parents",
      brandWebsiteUrl: "https://example.com",
      hasBrandProfile: true,
      workflowMode: "combined",
    }),
    steps: [
      {
        expectTask: "generate-cinematic-keyframe",
        expectReplyHas: ["關鍵幀"],
      },
    ],
  },
  {
    id: "captions-only",
    opening: "Burn captions on my mp4",
    expectLandingTask: "route-captions",
    studio: snap({ surface: "landing" }),
    steps: [],
  },
  {
    id: "pro-canvas",
    opening: "use /pro node canvas",
    expectLandingTask: "route-pro-canvas",
    studio: snap({ surface: "landing" }),
    steps: [],
  },
];

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`✓ ${name}`);
  } catch (e) {
    failed++;
    console.error(`✗ ${name}`);
    console.error(e instanceof Error ? e.message : e);
  }
}

for (const flow of FLOWS) {
  try {
    const landing = snap({ surface: "landing" });
    const intent = detectStudioAssistantIntent(flow.opening);
    const landingTask = getNextStudioCoachTask(landing, {
      intent,
      userText: flow.opening,
      detectedUrl: flow.opening.match(/https?:\/\/\S+/)?.[0],
    });
    assert.equal(
      landingTask,
      flow.expectLandingTask,
      `[${flow.id}] landing task`,
    );

    let state = flow.studio;
    let prevTask: CoachTaskKind | null = null;

    for (const step of flow.steps) {
      if (step.patch) state = { ...state, ...step.patch };
      const { task, reply } = turn(state, "下一步", {
        campaignHint: flow.opening,
        previousCoachTask: prevTask,
      });
      assert.equal(task, step.expectTask, `[${flow.id}] step task`);
      for (const needle of step.expectReplyHas ?? []) {
        assert.ok(
          reply.includes(needle),
          `[${flow.id}] reply missing "${needle}"\n---\n${reply.slice(0, 350)}`,
        );
      }
      if (step.repeatFromPrev) {
        assert.ok(
          isCoachRepeatTurn(task, state, "下一步", prevTask),
          `[${flow.id}] should be repeat turn`,
        );
      }
      if (!step.repeatFromPrev && !isCoachTaskComplete(task, state)) {
        state = ack(state, task);
      }
      prevTask = task;
    }

    console.log(`✓ ${flow.id}`);
    passed++;
  } catch (e) {
    failed++;
    console.error(`✗ ${flow.id}`);
    console.error(e instanceof Error ? e.message : e);
  }
}

test("all studio modes detected", () => {
  const modes = [
    snap({
      surface: "studio",
      promotionMode: "physical",
      workflowMode: "image-only",
      visualStyleId: "product",
    }),
    snap({
      surface: "studio",
      promotionMode: "physical",
      workflowMode: "combined",
      visualStyleId: "product",
    }),
    snap({
      surface: "studio",
      promotionMode: "physical",
      visualStyleId: "storyboard-video",
    }),
    snap({
      surface: "studio",
      promotionMode: "concept",
      visualStyleId: "concept-cinematic",
      cinematicSceneCount: 1,
    }),
    snap({
      surface: "studio",
      promotionMode: "concept",
      visualStyleId: "concept-cinematic",
      cinematicSceneCount: 3,
    }),
    snap({
      surface: "studio",
      promotionMode: "concept",
      visualStyleId: "website-launch",
      workflowMode: "image-only",
    }),
    snap({
      surface: "studio",
      promotionMode: "concept",
      visualStyleId: "creative-video",
      workflowMode: "video-only",
    }),
  ].map(detectStudioCoachMode);
  const unique = new Set(modes);
  assert.ok(unique.size >= 6, `expected diverse modes, got ${[...unique].join(", ")}`);
});

console.log(`\nConversation: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
