import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatKnowledgeForPrompt,
  retrieveAssistantKnowledge,
  scoreKnowledgeChunk,
  ASSISTANT_KNOWLEDGE,
} from "../lib/studio-assistant-knowledge";
import { detectAssistantTurnMode } from "../lib/studio-assistant-turn-mode";
import { detectStudioAssistantIntent } from "../lib/studio-assistant-intent";
import { shouldUseLandingCoachFastPath, tryStudioAssistantFastPath } from "../lib/studio-assistant-fast-paths";
import { buildDefaultAssistantSnapshot } from "../lib/studio-assistant-default-snapshot";
import { buildStudioAssistantSystemPrompt } from "../lib/studio-assistant-facts";

describe("assistant turn mode", () => {
  it("treats product questions as ask", () => {
    assert.equal(detectAssistantTurnMode("免費額度夠唔夠出 12 秒 TVC？"), "ask");
    assert.equal(detectAssistantTurnMode("How many tokens is MiniMax H3?"), "ask");
    assert.equal(detectAssistantTurnMode("What is the difference between Kling and H3?"), "ask");
    assert.equal(detectAssistantTurnMode("字幕係邊度燒？"), "ask");
    assert.equal(
      detectAssistantTurnMode(
        "how do I remove the watermark",
        detectStudioAssistantIntent("how do I remove the watermark"),
      ),
      "guide",
    );
    assert.equal(detectAssistantTurnMode("Ultra 畫布同 wizard 有咩分別"), "ask");
  });

  it("treats make-something phrasing as guide", () => {
    assert.equal(
      detectAssistantTurnMode(
        "TikTok reel for my bracelet product",
        detectStudioAssistantIntent("TikTok reel for my bracelet product"),
      ),
      "guide",
    );
    assert.equal(detectAssistantTurnMode("教我出一條產品片"), "guide");
    assert.equal(detectAssistantTurnMode("Help me build a post for my product launch"), "guide");
  });
});

describe("assistant knowledge retrieve", () => {
  it("ranks token/H3 questions onto billing + engines", () => {
    const ids = retrieveAssistantKnowledge("免費額度夠唔夠 12 秒 MiniMax H3", {
      alwaysCore: false,
      limit: 4,
    }).map((c) => c.id);
    assert.ok(ids.includes("tokens") || ids.includes("video-engines"));
  });

  it("ranks captions questions onto captions-edit", () => {
    const ids = retrieveAssistantKnowledge("where do I burn subtitles", {
      alwaysCore: false,
      limit: 4,
    }).map((c) => c.id);
    assert.ok(ids.includes("captions-edit") || ids.includes("pages"));
  });

  it("formats a grounded prompt block", () => {
    const chunks = ASSISTANT_KNOWLEDGE.filter((c) => c.id === "tokens");
    const block = formatKnowledgeForPrompt(chunks, "en");
    assert.match(block, /Product knowledge/i);
    assert.match(block, /328/);
    assert.ok(scoreKnowledgeChunk("tokens 12s", chunks[0]!) > 0);
  });

  it("skips landing coach fast-path for ask queries", () => {
    const snap = buildDefaultAssistantSnapshot("landing");
    assert.equal(shouldUseLandingCoachFastPath("How many tokens for 12s H3?", snap), false);
    assert.equal(
      tryStudioAssistantFastPath("How many tokens for 12s H3?", snap, "en"),
      null,
    );
  });

  it("disables coach fast-path inside studio", () => {
    const snap = buildDefaultAssistantSnapshot("studio");
    snap.promotionMode = "concept";
    assert.equal(tryStudioAssistantFastPath("next", snap, "en"), null);
    assert.equal(tryStudioAssistantFastPath("下一步", snap, "zh"), null);
  });

  it("ask system prompt includes knowledge and not Step-1-only coach", () => {
    const snap = buildDefaultAssistantSnapshot("landing");
    const prompt = buildStudioAssistantSystemPrompt("en", snap, {
      turnMode: "ask",
      userText: "Does the free grant cover 12s TVC?",
    });
    assert.match(prompt, /Ask mode/i);
    assert.match(prompt, /328|free grant|500/i);
    assert.doesNotMatch(prompt, /ONLY Step 1/);
  });
});
