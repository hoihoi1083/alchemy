import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  defaultKlingScenesMeta,
  parseKlingScenesMeta,
  resolveKlingScenesMeta,
} from "../lib/kling-storyboard-fallback";

describe("Kling scenesMeta helpers", () => {
  it("parses valid scenes_meta JSON", () => {
    const meta = parseKlingScenesMeta(
      JSON.stringify([{ role: "hook open" }, { role: "cta end", startSec: 0, endSec: 5 }]),
    );
    assert.equal(meta.length, 2);
    assert.equal(meta[0]?.role, "hook open");
    assert.equal(meta[1]?.endSec, 5);
  });

  it("ignores malformed scenes_meta", () => {
    assert.deepEqual(parseKlingScenesMeta("not-json"), []);
    assert.deepEqual(parseKlingScenesMeta('{"role":"x"}'), []);
    assert.deepEqual(parseKlingScenesMeta(null), []);
  });

  it("defaults multi-clip roles when client omits meta", () => {
    assert.deepEqual(defaultKlingScenesMeta(1), [{ role: "product hero" }]);
    const three = defaultKlingScenesMeta(3);
    assert.equal(three[0]?.role, "hook open");
    assert.equal(three[1]?.role, "product demo");
    assert.equal(three[2]?.role, "cta end");
  });

  it("prefers client meta over defaults and pads short client lists", () => {
    const client = [{ role: "packaging confidence" }];
    const resolved = resolveKlingScenesMeta(3, client);
    assert.equal(resolved.length, 3);
    assert.equal(resolved[0]?.role, "packaging confidence");
    assert.equal(resolved[2]?.role, "cta end");
  });

  it("caps long client meta to sceneCount", () => {
    const client = [
      { role: "a" },
      { role: "b" },
      { role: "c" },
      { role: "unused" },
    ];
    const resolved = resolveKlingScenesMeta(2, client);
    assert.equal(resolved.length, 2);
    assert.equal(resolved[0]?.role, "a");
    assert.equal(resolved[1]?.role, "b");
  });
});
