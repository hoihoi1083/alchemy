import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildContentAngleHandoff } from "../lib/content-research-apply";
import {
  copyFieldsFromAngle,
  isContentResearchStyleExtra,
  researchProductPromptLines,
  styleReferencePromptBlock,
} from "../lib/content-research-promote";
import { makeAngle, makePlan } from "./fixtures/angle-factory";
import { TOPIC_SCENARIOS } from "./fixtures/topic-matrix";

describe("topic matrix — promote vs search across categories", () => {
  for (const scenario of TOPIC_SCENARIOS) {
    it(`${scenario.id}: product copy never leaks reference topic`, () => {
      const angle = makeAngle("teaching-carousel", {
        hook: `🔥${scenario.referenceTopic}必看攻略`,
        sourceTitle: `${scenario.referenceTopic}熱門帖`,
        bulletPoints: [`${scenario.referenceTopic}重點`],
      });
      const copy = copyFieldsFromAngle(angle, scenario.product, scenario.search);
      assert.ok(
        !copy.headline.includes(scenario.referenceTopic),
        `headline leaked ${scenario.referenceTopic}: ${copy.headline}`,
      );
      assert.ok(copy.headline.includes(scenario.product.slice(0, 2)));
      assert.ok(!copy.subline.includes(scenario.referenceTopic));
      assert.ok(copy.subline.includes(scenario.product));

      const plan = makePlan(scenario.search, scenario.platform ?? "xiaohongshu", [angle]);
      const block = styleReferencePromptBlock(angle, plan, scenario.product);
      assert.ok(isContentResearchStyleExtra(block));
      assert.ok(block.includes(scenario.product));
      assert.ok(!block.includes("Slide1:"));

      const lines = researchProductPromptLines(scenario.search, scenario.product);
      assert.ok(lines.length >= 3);

      const handoff = buildContentAngleHandoff(
        angle,
        plan,
        scenario.promotionMode,
        scenario.product,
      );
      if (scenario.promotionMode === "physical") {
        assert.equal(handoff.product, scenario.product);
      } else {
        assert.ok(handoff.conceptIdea?.includes(scenario.product));
      }
      assert.ok(handoff.promptExtra?.includes(scenario.product));
      assert.ok(handoff.promptExtra?.includes("Do NOT copy reference subject matter"));
      assert.ok(!handoff.headline?.includes(scenario.referenceTopic));
    });
  }
});
