/**
 * Supply-chain guard — keep install scripts and CSP from silently drifting
 * into a crypto-miner / malware shape.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

describe("supply-chain guard", () => {
  it("package.json has no install-time hooks that could run a miner", () => {
    const pkg = JSON.parse(read("package.json")) as {
      scripts?: Record<string, string>;
    };
    const scripts = pkg.scripts ?? {};
    for (const hook of ["preinstall", "install", "postinstall", "preuninstall"]) {
      assert.equal(
        scripts[hook],
        undefined,
        `${hook} must stay unset — that is the usual miner/malware drop point`,
      );
    }
  });

  it("CSP still blocks arbitrary remote scripts and plugins", () => {
    const src = read("next.config.ts");
    assert.match(src, /default-src 'self'/);
    assert.match(src, /object-src 'none'/);
    assert.match(src, /script-src 'self'/);
    assert.match(src, /worker-src 'self' blob:/);
    assert.doesNotMatch(src, /script-src ['"]?\*/);
  });
});
