/**
 * Guard: en / zh / zh-cn string-leaf key parity.
 * Prevents shipping English-only copy for new wizard/billing strings.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { en } from "../lib/i18n/en";
import { zh } from "../lib/i18n/zh";
import { zhCn } from "../lib/i18n/zh-cn";

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

describe("i18n key parity", () => {
  const enKeys = new Set(flattenStrings(en));
  const zhKeys = new Set(flattenStrings(zh));
  const cnKeys = new Set(flattenStrings(zhCn));

  it("zh has every en string leaf", () => {
    const missing = [...enKeys].filter((k) => !zhKeys.has(k)).sort();
    assert.deepEqual(missing, [], `missing in zh:\n${missing.join("\n")}`);
  });

  it("zh-cn has every en string leaf", () => {
    const missing = [...enKeys].filter((k) => !cnKeys.has(k)).sort();
    assert.deepEqual(missing, [], `missing in zh-cn:\n${missing.join("\n")}`);
  });

  it("zh has no extra string leaves vs en", () => {
    const extra = [...zhKeys].filter((k) => !enKeys.has(k)).sort();
    assert.deepEqual(extra, [], `extra in zh:\n${extra.join("\n")}`);
  });
});
