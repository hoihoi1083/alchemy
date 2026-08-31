/**
 * Critical billing safety tests — prove we never overcharge users.
 * Uses an in-memory wallet that mirrors production ledger rules.
 */
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  imageTokenCostFromRequest,
  videoTokenCostFromRequest,
} from "../lib/billing/charge";
import { MemoryWallet } from "../lib/billing/memory-wallet";
import { FREE_SIGNUP_GRANT_TOKENS } from "../lib/billing/plans";
import {
  FREE_PACK,
  TOKEN_COST,
  estimateImageRegenTokens,
  estimateImageTokens,
  estimateVideoTokens,
} from "../lib/billing/token-costs";
import { InsufficientTokensError } from "../lib/billing/ledger";

describe("billing safety — never overcharge", () => {
  it("failed jobs charge 0 tokens", () => {
    const w = new MemoryWallet();
    w.seed({ clerkId: "u1", creditBalance: 1000, plan: "free" });

    const r = w.runJob({ clerkId: "u1", cost: TOKEN_COST.image, workSucceeded: false });
    assert.equal(r.charged, 0);
    assert.equal(r.blocked, false);
    assert.equal(w.balance("u1"), 1000);
    assert.equal(w.consumeCount("u1"), 0);
  });

  it("successful image job charges exactly TOKEN_COST.image once", () => {
    const w = new MemoryWallet();
    w.seed({ clerkId: "u1", creditBalance: 1000, plan: "free" });

    const r = w.runJob({ clerkId: "u1", cost: TOKEN_COST.image, workSucceeded: true });
    assert.equal(r.charged, TOKEN_COST.image);
    assert.equal(w.balance("u1"), 1000 - TOKEN_COST.image);
    assert.equal(w.consumeCount("u1"), 1);
    assert.equal(w.totalConsumed("u1"), TOKEN_COST.image);
  });

  it("insufficient balance blocks before work — charge stays 0", () => {
    const w = new MemoryWallet();
    w.seed({ clerkId: "u1", creditBalance: 20, plan: "free" });

    const r = w.runJob({ clerkId: "u1", cost: TOKEN_COST.image, workSucceeded: true });
    assert.equal(r.blocked, true);
    assert.equal(r.charged, 0);
    assert.equal(w.balance("u1"), 20);
    assert.equal(w.consumeCount("u1"), 0);
  });

  it("free logo stamp (cost 0) never creates a consume ledger row", () => {
    const w = new MemoryWallet();
    w.seed({ clerkId: "u1", creditBalance: 1000, plan: "free" });

    const r = w.runJob({ clerkId: "u1", cost: 0, workSucceeded: true });
    assert.equal(r.charged, 0);
    assert.equal(w.balance("u1"), 1000);
    assert.equal(w.consumeCount("u1"), 0);
  });

  it("Free pack journey: signup grant covers light try; video needs more tokens", () => {
    const w = new MemoryWallet();
    w.seed({ clerkId: "u1", creditBalance: 0, plan: "free" });
    assert.equal(w.ensureSignupGrant("u1"), FREE_SIGNUP_GRANT_TOKENS);
    assert.equal(w.ensureSignupGrant("u1"), null); // idempotent

    const image = w.runJob({
      clerkId: "u1",
      cost: FREE_PACK.image,
      workSucceeded: true,
    });
    const video = w.runJob({
      clerkId: "u1",
      cost: FREE_PACK.video8s480p,
      workSucceeded: true,
    });

    assert.equal(image.charged, FREE_PACK.image);
    assert.equal(video.blocked, true);
    assert.equal(video.charged, 0);
    assert.equal(w.balance("u1"), FREE_PACK.grant - FREE_PACK.image);
    assert.ok((w.balance("u1") ?? 0) >= 0);
  });

  it("balance never goes negative under sequential jobs", () => {
    const w = new MemoryWallet();
    w.seed({ clerkId: "u1", creditBalance: 260, plan: "free" });

    const costs = [
      TOKEN_COST.image, // 65 → 195
      TOKEN_COST.image, // 65 → 130
      TOKEN_COST.image, // 65 → 65
      TOKEN_COST.image, // 65 → 0
      TOKEN_COST.image, // blocked
      TOKEN_COST.music, // blocked
    ];
    for (const cost of costs) {
      w.runJob({ clerkId: "u1", cost, workSucceeded: true });
      assert.ok((w.balance("u1") ?? 0) >= 0, `balance went negative: ${w.balance("u1")}`);
    }
    assert.equal(w.balance("u1"), 0);
    assert.equal(w.totalConsumed("u1"), 260);
    assert.equal(w.consumeCount("u1"), 4);
  });

  it("concurrent settles cannot overdraw (second loses)", () => {
    const w = new MemoryWallet();
    w.seed({ clerkId: "u1", creditBalance: 520, plan: "free" });

    w.require("u1", 520);
    w.require("u1", 520); // soft check both pass (same as production race window)

    const first = w.settle("u1", 520);
    assert.equal(first, 0);
    assert.throws(() => w.settle("u1", 520), InsufficientTokensError);
    assert.equal(w.balance("u1"), 0);
    assert.equal(w.totalConsumed("u1"), 520);
  });

  it("missing user cannot be charged as a silent free pass", () => {
    const w = new MemoryWallet();
    assert.throws(() => w.require("ghost", TOKEN_COST.image), InsufficientTokensError);
    const r = w.runJob({ clerkId: "ghost", cost: TOKEN_COST.image, workSucceeded: true });
    assert.equal(r.blocked, true);
    assert.equal(r.charged, 0);
  });

  it("catalog costs match the published Free / action table", () => {
    assert.equal(TOKEN_COST.image, 65);
    assert.equal(TOKEN_COST.image_ab, 130);
    assert.equal(TOKEN_COST.campaign, 200);
    assert.equal(TOKEN_COST.teaching_carousel, 265);
    assert.equal(TOKEN_COST.music, 82);
    assert.equal(TOKEN_COST.voiceover, 13);
    assert.equal(estimateImageTokens({ mode: "storyboard", sceneCount: 4 }), 260);
    assert.equal(
      estimateImageTokens({ mode: "storyboard", sceneCount: 4, passesPerScene: 2 }),
      520,
    );
    assert.equal(estimateVideoTokens({ resolution: "480p", fast: false, duration: 8 }), 904);
    assert.equal(
      videoTokenCostFromRequest({ resolution: "720p", fast: true, duration: "auto" }),
      1568,
    );
  });

  it("UI estimate helpers never under-price vs server request pricing", () => {
    // Server uses the same helpers — under-pricing UI would surprise users;
    // over-pricing UI is safer. Assert exact parity for common modes.
    assert.equal(imageTokenCostFromRequest({ numImages: 1 }), TOKEN_COST.image);
    assert.equal(imageTokenCostFromRequest({ numImages: 2 }), TOKEN_COST.image_ab);
    assert.equal(imageTokenCostFromRequest({ numImages: 3 }), TOKEN_COST.image * 3);
    assert.equal(imageTokenCostFromRequest({ numImages: 4 }), TOKEN_COST.image * 4);
    assert.equal(
      imageTokenCostFromRequest({ imageOutputMode: "campaign" }),
      TOKEN_COST.campaign,
    );
    assert.equal(
      imageTokenCostFromRequest({ imageOutputMode: "teaching-carousel" }),
      TOKEN_COST.teaching_carousel,
    );
    assert.equal(
      imageTokenCostFromRequest({ imageOutputMode: "carousel" }),
      TOKEN_COST.teaching_carousel,
    );
    assert.equal(
      imageTokenCostFromRequest({ multipartMode: "refine" }),
      TOKEN_COST.image,
    );
    assert.equal(
      estimateImageRegenTokens({ scope: "one", outputMode: "single" }),
      TOKEN_COST.image,
    );
    assert.equal(
      estimateImageRegenTokens({ scope: "all", outputMode: "ab" }),
      TOKEN_COST.image_ab,
    );
    assert.equal(
      estimateImageRegenTokens({
        scope: "one",
        isStoryboard: true,
      }),
      TOKEN_COST.storyboard_scene,
    );
    assert.equal(
      estimateImageRegenTokens({
        scope: "all",
        isStoryboard: true,
        sceneCount: 4,
      }),
      estimateImageTokens({ mode: "storyboard", sceneCount: 4 }),
    );
  });

  it("simulated multi-action day never charges more than sum of catalog costs", () => {
    const w = new MemoryWallet();
    w.seed({ clerkId: "u1", creditBalance: 3000, plan: "standard" });

    const jobs: Array<{ cost: number; ok: boolean }> = [
      { cost: TOKEN_COST.image, ok: true },
      { cost: TOKEN_COST.image_ab, ok: true },
      { cost: TOKEN_COST.campaign, ok: false }, // failed — must not charge
      { cost: TOKEN_COST.campaign, ok: true },
      { cost: TOKEN_COST.teaching_carousel, ok: true },
      { cost: estimateImageTokens({ mode: "storyboard", sceneCount: 4 }), ok: true },
      { cost: estimateVideoTokens({ resolution: "480p", fast: false, duration: 8 }), ok: true },
      { cost: TOKEN_COST.music, ok: true },
      { cost: TOKEN_COST.voiceover, ok: true },
    ];

    let expected = 0;
    for (const job of jobs) {
      const r = w.runJob({ clerkId: "u1", cost: job.cost, workSucceeded: job.ok });
      if (job.ok) expected += job.cost;
      else assert.equal(r.charged, 0);
    }

    assert.equal(w.totalConsumed("u1"), expected);
    assert.equal(w.balance("u1"), 3000 - expected);
    // Failed campaign (90) must not be in the total
    assert.ok(!jobs.some((j) => !j.ok && w.totalConsumed("u1") === expected + j.cost));
    assert.equal(
      expected,
      65 + 130 + 200 + 265 + 260 + 904 + 82 + 13,
    );
  });
});

describe("billing safety — API route contract audit", () => {
  const apiRoot = join(process.cwd(), "app/api");

  function walk(dir: string): string[] {
    const out: string[] = [];
    for (const name of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, name.name);
      if (name.isDirectory()) out.push(...walk(p));
      else if (name.name === "route.ts") out.push(p);
    }
    return out;
  }

  it("every settleTokens call site also has requireTokens in the same route", () => {
    const routes = walk(apiRoot);
    const offenders: string[] = [];
    for (const file of routes) {
      const src = readFileSync(file, "utf8");
      if (!src.includes("settleTokens")) continue;
      if (!src.includes("requireTokens")) {
        offenders.push(file.replace(process.cwd() + "/", ""));
      }
    }
    assert.deepEqual(offenders, [], `settle without require:\n${offenders.join("\n")}`);
  });

  it("paid generate routes return tokensCharged when they charge", () => {
    const mustHave = [
      "app/api/generate-image/route.ts",
      "app/api/generate/route.ts",
      "app/api/generate-campaign/route.ts",
      "app/api/generate-teaching-carousel/route.ts",
      "app/api/generate-storyboard-images/route.ts",
      "app/api/generate-cinematic-scenes/route.ts",
      "app/api/generate-music/route.ts",
      "app/api/preview-script-voice/route.ts",
      "app/api/generate-digital-presenter/route.ts",
    ];
    for (const rel of mustHave) {
      const src = readFileSync(join(process.cwd(), rel), "utf8");
      assert.match(
        src,
        /chargeTokens|requireTokens/,
        `${rel} missing chargeTokens/requireTokens`,
      );
      assert.match(src, /tokensCharged/, `${rel} missing tokensCharged in response`);
    }
    const presenter = readFileSync(
      join(process.cwd(), "app/api/generate-digital-presenter/route.ts"),
      "utf8",
    );
    assert.match(presenter, /estimateHeygenPresenterTokens/);
    assert.match(presenter, /billedDurationSec/);
  });

  it("sharp logo stamp path documents zero charge (tokensCharged: 0)", () => {
    const src = readFileSync(join(process.cwd(), "app/api/generate-image/route.ts"), "utf8");
    assert.match(src, /logoStamped:\s*true/);
    assert.match(src, /tokensCharged:\s*0/);
  });

  it("no route settles inside a catch block (would charge failures)", () => {
    const routes = walk(apiRoot);
    const offenders: string[] = [];
    for (const file of routes) {
      const src = readFileSync(file, "utf8");
      if (!src.includes("settleTokens")) continue;
      // Naive but effective: settleTokens appearing after `catch (` before next export/function end
      const catchBlocks = src.split(/catch\s*\([^)]*\)\s*\{/);
      for (let i = 1; i < catchBlocks.length; i++) {
        const block = catchBlocks[i];
        const close = block.indexOf("\n  }");
        const body = close >= 0 ? block.slice(0, close) : block.slice(0, 400);
        if (body.includes("settleTokens")) {
          offenders.push(file.replace(process.cwd() + "/", ""));
        }
      }
    }
    assert.deepEqual(offenders, [], `settle in catch:\n${offenders.join("\n")}`);
  });
});
