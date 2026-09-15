import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { detectStudioAssistantIntent } from "../lib/studio-assistant-intent";
import {
  normalizeAssistantActionLinks,
  stripInvalidActionLinks,
  tryStudioAssistantFastPath,
} from "../lib/studio-assistant-fast-paths";
import { buildDefaultAssistantSnapshot } from "../lib/studio-assistant-default-snapshot";
import { parseStudioAssistantActionId } from "../lib/studio-assistant-actions";
import {
  STITCH_FALLBACK_TOKENS,
  assistantTokenCostFacts,
} from "../lib/studio-assistant-billing-facts";
import { getStudioAssistantFacts } from "../lib/studio-assistant-facts";
import { FREE_SIGNUP_GRANT_TOKENS } from "../lib/billing/plans";
import { H3_TOKENS_PER_SEC, TOKEN_COST } from "../lib/billing/token-costs";
import {
  ASSISTANT_KNOWLEDGE,
  retrieveAssistantKnowledge,
} from "../lib/studio-assistant-knowledge";
import { buildAssistantFollowUps } from "../lib/studio-assistant-follow-ups";
import { shouldLoadSitePreviewForTurn } from "../lib/studio-assistant-url";
import {
  assistantAttributionAnalyticsProps,
  clearAssistantGenerateAttribution,
  writeAssistantGenerateAttribution,
} from "../lib/studio-assistant-attribution";

describe("assistant golden intents", () => {
  it("maps common product asks to stable intents", () => {
    assert.equal(
      detectStudioAssistantIntent("I want a product image post for my bracelet"),
      "physical_image_post",
    );
    assert.equal(
      detectStudioAssistantIntent("open Ultra canvas node board"),
      "pro_canvas",
    );
    assert.equal(
      detectStudioAssistantIntent("burn captions on my MP4"),
      "captions_only",
    );
  });

  it("landing coach replies only use valid action ids", () => {
    const snap = buildDefaultAssistantSnapshot("landing");
    const reply =
      tryStudioAssistantFastPath(
        "Help me make a product image post",
        snap,
        "en",
      ) || "";
    assert.ok(reply.length > 0);
    const normalized = normalizeAssistantActionLinks(reply);
    const stripped = stripInvalidActionLinks(normalized, snap);
    const re = /\]\((studio-action:[^)]+)\)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(stripped)) !== null) {
      assert.ok(parseStudioAssistantActionId(m[1]!), `invalid ${m[1]}`);
    }
  });
});

describe("assistant billing SSOT", () => {
  it("stitch fallback matches H3 math (not Kling 1136)", () => {
    const expected =
      TOKEN_COST.image * 4 + H3_TOKENS_PER_SEC["480P"] * 5 * 4;
    assert.equal(STITCH_FALLBACK_TOKENS, expected);
    assert.equal(STITCH_FALLBACK_TOKENS, 1080);
    const facts = assistantTokenCostFacts("en");
    assert.match(facts, new RegExp(String(STITCH_FALLBACK_TOKENS)));
    assert.doesNotMatch(facts, /1136/);
    assert.match(facts, new RegExp(String(FREE_SIGNUP_GRANT_TOKENS)));
  });

  it("hard facts use live constants", () => {
    const en = getStudioAssistantFacts("en");
    assert.match(en, new RegExp(String(STITCH_FALLBACK_TOKENS)));
    assert.doesNotMatch(en, /1136/);
  });
});

describe("assistant synonyms + follow-ups", () => {
  it("expands credit/额度 queries onto tokens chunk", () => {
    const ids = retrieveAssistantKnowledge("免費額度幾多", {
      alwaysCore: false,
      limit: 4,
    }).map((c) => c.id);
    assert.ok(ids.includes("tokens") || ids.includes("plan-gates"));
  });

  it("builds ask-mode follow-up chips", () => {
    const chips = buildAssistantFollowUps({
      locale: "en",
      turnMode: "ask",
      intent: "general",
      signedIn: false,
    });
    assert.ok(chips.some((c) => c.id === "ask-tokens"));
    assert.ok(chips.some((c) => c.id === "go-signin"));
  });

  it("routes physical product follow-up to open-physical not website reel", () => {
    const chips = buildAssistantFollowUps({
      locale: "en",
      turnMode: "guide",
      intent: "physical_product",
      signedIn: true,
    });
    assert.ok(chips.some((c) => c.id === "open-physical"));
    assert.ok(!chips.some((c) => c.id === "open-studio"));
  });
});

describe("assistant site preview gate", () => {
  it("fetches only when this turn pasted a URL or talks about the site", () => {
    const url = "https://example.com";
    assert.equal(shouldLoadSitePreviewForTurn("How many tokens for 8s?", url), false);
    assert.equal(
      shouldLoadSitePreviewForTurn(`Promote ${url}`, url),
      true,
    );
    assert.equal(
      shouldLoadSitePreviewForTurn("Analyze brand for my website", url),
      true,
    );
    assert.equal(shouldLoadSitePreviewForTurn("tokens please", undefined), false);
  });
});

describe("assistant pages knowledge", () => {
  it("does not claim tool pages never have Ask-AI", () => {
    const chunk = ASSISTANT_KNOWLEDGE.find((c) => c.id === "pages");
    assert.ok(chunk);
    assert.doesNotMatch(chunk!.en, /No assistant panel/i);
    assert.match(chunk!.en, /when tool Ask-AI is enabled/i);
    assert.match(chunk!.en, /\/studio never has/i);

    const caps = ASSISTANT_KNOWLEDGE.find((c) => c.id === "captions-edit");
    assert.ok(caps);
    assert.doesNotMatch(caps!.en, /Ask-AI is hidden/i);
    assert.match(caps!.en, /when tool Ask-AI is enabled/i);
  });
});

describe("assistant generate attribution", () => {
  it("exposes handoff fields for Mixpanel generate events", () => {
    const mem = new Map<string, string>();
    const prev = globalThis.sessionStorage;
    // @ts-expect-error test polyfill
    globalThis.sessionStorage = {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => {
        mem.set(k, v);
      },
      removeItem: (k: string) => {
        mem.delete(k);
      },
    };
    try {
      writeAssistantGenerateAttribution({
        handoffId: "ha_test",
        assistantActionId: "setup-website-reel",
        recipe: "8s-website-reel",
      });
      const props = assistantAttributionAnalyticsProps();
      assert.equal(props.fromAssistant, true);
      assert.equal(props.handoffId, "ha_test");
      assert.equal(props.assistantActionId, "setup-website-reel");
      clearAssistantGenerateAttribution();
      assert.deepEqual(assistantAttributionAnalyticsProps(), {});
    } finally {
      // @ts-expect-error restore
      globalThis.sessionStorage = prev;
    }
  });
});
