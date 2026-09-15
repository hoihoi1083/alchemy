/**
 * Guard: en / zh / zh-cn / zh-tw string-leaf + string-array parity.
 * Prevents shipping English-only copy for new wizard/billing strings,
 * and catches bullet lists that drifted to fewer/more items than en.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { en } from "../lib/i18n/en";
import { zh } from "../lib/i18n/zh";
import { zhCn } from "../lib/i18n/zh-cn";
import { zhTw } from "../lib/i18n/zh-tw";

function flattenStrings(obj: unknown, prefix = ""): string[] {
  if (!obj || typeof obj !== "object") return [];
  const out: string[] = [];
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    const p = prefix ? `${prefix}.${k}` : k;
    if (typeof v === "string") out.push(p);
    else if (v && typeof v === "object" && !Array.isArray(v)) {
      out.push(...flattenStrings(v, p));
    }
  }
  return out;
}

/** Paths of string[] leaves → length (wizard bullets, feature lists, etc.). */
function flattenStringArrays(obj: unknown, prefix = ""): Record<string, number> {
  const out: Record<string, number> = {};
  if (!obj || typeof obj !== "object") return out;
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    const p = prefix ? `${prefix}.${k}` : k;
    if (Array.isArray(v) && v.every((x) => typeof x === "string")) {
      out[p] = v.length;
    } else if (v && typeof v === "object" && !Array.isArray(v)) {
      Object.assign(out, flattenStringArrays(v, p));
    }
  }
  return out;
}

describe("i18n key parity", () => {
  const enKeys = new Set(flattenStrings(en));
  const zhKeys = new Set(flattenStrings(zh));
  const cnKeys = new Set(flattenStrings(zhCn));
  const twKeys = new Set(flattenStrings(zhTw));

  it("zh has every en string leaf", () => {
    const missing = [...enKeys].filter((k) => !zhKeys.has(k)).sort();
    assert.deepEqual(missing, [], `missing in zh:\n${missing.join("\n")}`);
  });

  it("zh-cn has every en string leaf", () => {
    const missing = [...enKeys].filter((k) => !cnKeys.has(k)).sort();
    assert.deepEqual(missing, [], `missing in zh-cn:\n${missing.join("\n")}`);
  });

  it("zh-tw has every en string leaf", () => {
    const missing = [...enKeys].filter((k) => !twKeys.has(k)).sort();
    assert.deepEqual(missing, [], `missing in zh-tw:\n${missing.join("\n")}`);
  });

  it("zh has no extra string leaves vs en", () => {
    const extra = [...zhKeys].filter((k) => !enKeys.has(k)).sort();
    assert.deepEqual(extra, [], `extra in zh:\n${extra.join("\n")}`);
  });

  it("zh-cn has no extra string leaves vs en", () => {
    const extra = [...cnKeys].filter((k) => !enKeys.has(k)).sort();
    assert.deepEqual(extra, [], `extra in zh-cn:\n${extra.join("\n")}`);
  });

  it("zh-tw has no extra string leaves vs en", () => {
    const extra = [...twKeys].filter((k) => !enKeys.has(k)).sort();
    assert.deepEqual(extra, [], `extra in zh-tw:\n${extra.join("\n")}`);
  });
});

describe("i18n string-array parity", () => {
  const enA = flattenStringArrays(en);
  const locales: Array<[string, Record<string, number>]> = [
    ["zh", flattenStringArrays(zh)],
    ["zh-cn", flattenStringArrays(zhCn)],
    ["zh-tw", flattenStringArrays(zhTw)],
  ];

  for (const [name, arr] of locales) {
    it(`${name} has every en string[] key with matching length`, () => {
      const missing = Object.keys(enA).filter((k) => !(k in arr)).sort();
      const lenMismatch = Object.keys(enA)
        .filter((k) => k in arr && arr[k] !== enA[k])
        .map((k) => `${k}: en=${enA[k]} ${name}=${arr[k]}`)
        .sort();
      assert.deepEqual(missing, [], `missing string[] in ${name}:\n${missing.join("\n")}`);
      assert.deepEqual(
        lenMismatch,
        [],
        `string[] length mismatch in ${name}:\n${lenMismatch.join("\n")}`,
      );
    });
  }
});
