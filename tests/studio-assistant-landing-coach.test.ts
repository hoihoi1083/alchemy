import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildCoachReply } from "../lib/studio-assistant-coach";
import type { CoachTaskKind } from "../lib/studio-assistant-coach-profile";
import { buildDefaultAssistantSnapshot } from "../lib/studio-assistant-default-snapshot";

const LANDING_ROUTE_TASKS: CoachTaskKind[] = [
  "route-website-reel",
  "route-website-image",
  "route-cinematic-stitch",
  "route-physical-product",
  "route-physical-image-post",
  "route-reference-ad",
  "route-storyboard",
  "route-concept-studio",
  "route-captions",
  "route-edit-image",
  "route-ultra-canvas",
  "route-brand-kit",
  "route-pricing",
  "route-library",
  "route-ugc",
];

const REPLY_NEXT = /Reply next|回覆\s*下一步|回复\s*下一步/i;

describe("studio-assistant landing coach copy", () => {
  for (const task of LANDING_ROUTE_TASKS) {
    it(`route reply for ${task} does not ask to reply next on Setup (en)`, () => {
      const snapshot = buildDefaultAssistantSnapshot("landing");
      const reply = buildCoachReply(task, snapshot, "en", { userText: "help me make an ad" });
      assert.doesNotMatch(reply, REPLY_NEXT);
      assert.match(reply, /button above|wizard cards|No chat coach/i);
    });

    it(`route reply for ${task} does not ask to reply next on Setup (zh)`, () => {
      const snapshot = buildDefaultAssistantSnapshot("landing");
      const reply = buildCoachReply(task, snapshot, "zh", { userText: "幫我出廣告" });
      assert.doesNotMatch(reply, REPLY_NEXT);
      assert.match(reply, /上面掣|畫面卡片|無逐步 chat|開啟工具/);
    });
  }
});
