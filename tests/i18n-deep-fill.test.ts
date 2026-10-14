import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { deepFillMissing } from "../lib/i18n/deep-fill";
import { getMessages } from "../lib/i18n";
import { en } from "../lib/i18n/en";

describe("deepFillMissing", () => {
  it("fills missing nested leaves from fallback", () => {
    const primary = { a: { x: "px" }, b: "pb" };
    const fallback = { a: { x: "fx", y: "fy" }, b: "fb", c: "fc" };
    const filled = deepFillMissing(primary, fallback) as typeof fallback;
    assert.equal(filled.a.x, "px");
    assert.equal(filled.a.y, "fy");
    assert.equal(filled.b, "pb");
    assert.equal(filled.c, "fc");
  });

  it("zh-tw / zh-cn catalogs expose every en videoCreativeModes + visualStyles key", () => {
    for (const locale of ["zh-tw", "zh-cn", "zh", "en"] as const) {
      const m = getMessages(locale);
      for (const id of Object.keys(en.wizard.videoCreativeModes)) {
        const copy =
          m.wizard.videoCreativeModes[
            id as keyof typeof en.wizard.videoCreativeModes
          ];
        assert.ok(copy?.title, `${locale} missing videoCreativeModes.${id}.title`);
        assert.ok(
          copy?.description,
          `${locale} missing videoCreativeModes.${id}.description`,
        );
      }
      for (const id of Object.keys(en.wizard.visualStyles)) {
        const copy =
          m.wizard.visualStyles[id as keyof typeof en.wizard.visualStyles];
        assert.ok(copy?.title, `${locale} missing visualStyles.${id}.title`);
        assert.ok(
          copy?.description,
          `${locale} missing visualStyles.${id}.description`,
        );
      }
    }
  });
});
