import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("research-post-image SSRF allowlist", () => {
  const src = readFileSync(
    join(process.cwd(), "app/api/research-post-image/route.ts"),
    "utf8",
  );

  it("does not use host.includes substring matching", () => {
    assert.ok(
      !/host\.includes\s*\(\s*h\s*\)/.test(src),
      "substring includes() enables SSRF bypass",
    );
  });

  it("uses shared hostMatchesAllowlist helper", () => {
    assert.match(src, /hostMatchesAllowlist/);
  });
});
