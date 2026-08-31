import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const root = process.cwd();

describe("generate-storyboard-video route rename", () => {
  it("canonical route enforces Pro+ and keeps H3/Seedance orchestration", () => {
    const src = readFileSync(
      join(root, "app/api/generate-storyboard-video/route.ts"),
      "utf8",
    );
    assert.match(src, /planMeetsMinimum\(userPlan,\s*"pro"\)/);
    assert.match(src, /PLAN_ENTITLEMENT/);
    assert.match(src, /runMinimaxH3Fallback/);
    assert.match(src, /runSeedanceStoryboardR2v/);
    assert.match(src, /runKlingStoryboardFallback/);
  });

  it("legacy /api/generate-kling-storyboard wraps the canonical handler with local segment config", () => {
    const alias = readFileSync(
      join(root, "app/api/generate-kling-storyboard/route.ts"),
      "utf8",
    );
    assert.match(alias, /generate-storyboard-video\/route/);
    assert.match(alias, /export async function POST/);
    assert.match(alias, /export const runtime/);
    assert.match(alias, /export const maxDuration/);
    assert.doesNotMatch(alias, /export\s*\{[^}]*\bruntime\b/);
  });

  it("wizard calls the renamed endpoint", () => {
    const wizard = readFileSync(join(root, "hooks/useStudioWizard.ts"), "utf8");
    assert.match(wizard, /\/api\/generate-storyboard-video/);
    assert.doesNotMatch(wizard, /\/api\/generate-kling-storyboard/);
  });

  it("ffmpeg tracing includes both new and legacy API paths", () => {
    const cfg = readFileSync(join(root, "next.config.ts"), "utf8");
    assert.match(cfg, /\/api\/generate-storyboard-video/);
    assert.match(cfg, /\/api\/generate-kling-storyboard/);
  });
});
