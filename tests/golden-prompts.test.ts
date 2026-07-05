import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluateGoldenPrompts } from "../lib/pipeline-smoke-golden";

test("golden prompts per visualStyleId contain expected keywords", () => {
  const results = evaluateGoldenPrompts();
  const failed = results.filter((r) => !r.pass);
  if (failed.length) {
    const detail = failed
      .map(
        (f) =>
          `${f.visualStyleId} (${f.mode}): missing=[${f.missing.join(", ")}] forbidden=[${f.forbidden.join(", ")}]`,
      )
      .join("\n");
    assert.fail(`Golden prompt failures:\n${detail}`);
  }
  assert.equal(results.length >= 8, true);
});
