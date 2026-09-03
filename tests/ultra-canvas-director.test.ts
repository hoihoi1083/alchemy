import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  appendCharacterLockToPrompt,
  buildCharacterSheetPrompt,
  characterIdentityClause,
  mergeCharacterSourcesInto,
} from "../lib/pro-canvas-character-lock";
import {
  DIRECTOR_PROMPT_CHIPS,
  insertDirectorPromptBlock,
} from "../lib/pro-canvas-director-prompt";
import {
  buildScriptBriefWithBeats,
  clampUltraScriptSceneCount,
  ULTRA_SCRIPT_SCENE_COUNT_DEFAULT,
} from "../lib/pro-canvas-script-plan";
import {
  buildResearchSummaryFromPlan,
  buildUltraResearchHandoffFromPlan,
  formatResearchSummaryForCanvas,
} from "../lib/ultra-research-handoff";
import type { ContentResearchPlan } from "../lib/content-research-types";

describe("ultra-canvas-director", () => {
  it("clamps script scene count to 4–6", () => {
    assert.equal(clampUltraScriptSceneCount(2), 4);
    assert.equal(clampUltraScriptSceneCount(6), 6);
    assert.equal(clampUltraScriptSceneCount(12), 6);
    assert.equal(clampUltraScriptSceneCount("nope"), ULTRA_SCRIPT_SCENE_COUNT_DEFAULT);
  });

  it("builds script brief with director beats", () => {
    const brief = buildScriptBriefWithBeats("Creative B ad", [
      {
        time: "0-2s",
        emotion: "frustration",
        framing: "close-up",
        line: "Why is this so hard?",
      },
      { time: "2-4s", emotion: "curiosity" },
    ]);
    assert.match(brief, /Creative B ad/);
    assert.match(brief, /Director scene beats/);
    assert.match(brief, /frustration/);
    assert.match(brief, /framing: close-up/);
    assert.match(brief, /Why is this so hard/);
  });

  it("inserts director prompt blocks without duplicating tags", () => {
    const block = DIRECTOR_PROMPT_CHIPS[0]!.block;
    const once = insertDirectorPromptBlock("Hero shot", block);
    assert.match(once, /\[镜头语言\]/);
    const twice = insertDirectorPromptBlock(once, block);
    assert.equal(twice, once);
  });

  it("builds character sheet prompt from bio", () => {
    const p = buildCharacterSheetPrompt({
      alias: "PersonA",
      biography: "28yo designer, navy blazer",
    });
    assert.match(p, /@PersonA/);
    assert.match(p, /navy blazer/);
    assert.match(p, /identity lock/i);
  });

  it("appends character identity lock clauses", () => {
    const clause = characterIdentityClause("PersonA", "28yo designer, navy blazer");
    assert.match(clause, /\[角色锁定\]/);
    assert.match(clause, /@PersonA/);
    const nodes = [
      {
        id: "c1",
        data: {
          kind: "character",
          label: "PersonA",
          alias: "PersonA",
          previewUrl: "https://example.com/face.jpg",
          biography: "28yo designer",
        },
      },
    ] as Parameters<typeof appendCharacterLockToPrompt>[1];
    const prompt = appendCharacterLockToPrompt("Scene still", nodes);
    assert.match(prompt, /\[角色锁定\]/);
    assert.match(prompt, /@PersonA/);
  });

  it("appends text-only character lock for text-to-video", () => {
    const nodes = [
      {
        id: "c1",
        data: {
          kind: "character",
          label: "PersonA",
          alias: "PersonA",
          biography: "28yo designer",
        },
      },
    ] as Parameters<typeof appendCharacterLockToPrompt>[1];
    const prompt = appendCharacterLockToPrompt("Scene", nodes, { textOnly: true });
    assert.match(prompt, /\[角色锁定\]/);
    assert.match(prompt, /@PersonA/);
    assert.doesNotMatch(prompt, /IMAGE ref/);
  });

  it("merges board character sources ahead of scene refs", () => {
    const merged = mergeCharacterSourcesInto(
      [{ nodeId: "img1", alias: "product", url: "https://example.com/p.jpg" }],
      [{ nodeId: "char1", alias: "PersonA", url: "https://example.com/a.jpg" }],
    );
    assert.equal(merged.length, 2);
    assert.equal(merged[0]?.nodeId, "char1");
  });

  it("builds research handoff from content plan", () => {
    const plan = {
      platform: "xiaohongshu",
      platformLabel: "Xiaohongshu",
      topic: "nasal washer",
      summary: "Trend: problem-solution hooks perform well.",
      researchMode: "live-web",
      candidates: [],
      topPicks: [
        {
          id: "a1",
          title: "Pain point reel",
          hook: "Stop suffering every morning",
          formatLabel: "Reel",
          score: 88,
          whyItWorks: "Relatable",
          bulletPoints: [],
        },
      ],
    } satisfies ContentResearchPlan;
    const summary = buildResearchSummaryFromPlan(plan);
    assert.match(summary, /problem-solution/);
    assert.doesNotMatch(summary, /Pain point reel/);
    const handoff = buildUltraResearchHandoffFromPlan(plan);
    const formatted = formatResearchSummaryForCanvas({ ...handoff, savedAt: 1 });
    assert.match(formatted, /Topic: nasal washer/);
    assert.match(formatted, /Creative angles/);
  });
});
