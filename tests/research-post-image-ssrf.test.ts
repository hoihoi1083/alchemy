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

  it("matches via exact, subdomain suffix, or DNS label", () => {
    assert.match(src, /host\.endsWith\(`\.\$\{h\}`\)/);
    assert.match(src, /host\.split\("\."\)\.some/);
  });
});
