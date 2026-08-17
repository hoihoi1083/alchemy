import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { en } from "../lib/i18n/en";
import { zh } from "../lib/i18n/zh";
import { zhCn } from "../lib/i18n/zh-cn";
import { zhTw } from "../lib/i18n/zh-tw";
import { ASSISTANT_KNOWLEDGE } from "../lib/studio-assistant-knowledge";
import { USER_FACING_VENDOR_NAME_RE } from "../lib/api/errors";

function collectStrings(value: unknown, out: string[]): void {
  if (typeof value === "string") {
    out.push(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectStrings(item, out);
    return;
  }
  if (value && typeof value === "object") {
    for (const item of Object.values(value as Record<string, unknown>)) {
      collectStrings(item, out);
    }
  }
}

function assertNoVendorNames(label: string, strings: string[]): void {
  const hits = strings.filter((s) => USER_FACING_VENDOR_NAME_RE.test(s));
  assert.deepEqual(
    hits,
    [],
    `${label} still names a vendor/model:\n${hits.slice(0, 8).join("\n")}`,
  );
}

describe("user-facing copy has no vendor or model names", () => {
  it("i18n string values", () => {
    for (const [name, catalog] of [
      ["en", en],
      ["zh", zh],
      ["zh-cn", zhCn],
      ["zh-tw", zhTw],
    ] as const) {
      const strings: string[] = [];
      collectStrings(catalog, strings);
      assertNoVendorNames(`i18n ${name}`, strings);
    }
  });

  it("assistant knowledge titles and bodies", () => {
    const strings: string[] = [];
    for (const chunk of ASSISTANT_KNOWLEDGE) {
      strings.push(chunk.title, chunk.en, chunk.zh);
    }
    assertNoVendorNames("assistant knowledge", strings);
  });

  it("README", () => {
    const readme = readFileSync(join(process.cwd(), "README.md"), "utf8");
    assertNoVendorNames("README.md", [readme]);
  });
});
