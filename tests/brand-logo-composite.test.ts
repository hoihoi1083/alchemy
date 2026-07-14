import assert from "node:assert/strict";
import { describe, it } from "node:test";
import sharp from "sharp";
import { compositeBrandLogoOntoImage } from "../lib/brand-logo-composite";

describe("compositeBrandLogoOntoImage", () => {
  it("preserves transparent logo holes over a light background", async () => {
    // 200x200 white ad
    const ad = await sharp({
      create: { width: 200, height: 200, channels: 3, background: { r: 240, g: 240, b: 240 } },
    })
      .png()
      .toBuffer();

    // 40x40 logo: opaque magenta ring, transparent center (alpha 0)
    const logoSvg = Buffer.from(`
      <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40">
        <circle cx="20" cy="20" r="16" fill="none" stroke="#ff00aa" stroke-width="6"/>
      </svg>
    `);
    const logo = await sharp(logoSvg).png().ensureAlpha().toBuffer();

    const out = await compositeBrandLogoOntoImage(ad, logo, "bottom-right");
    const { data, info } = await sharp(out).raw().ensureAlpha().toBuffer({ resolveWithObject: true });

    // Sample near bottom-right logo center — should stay light gray, not black
    const cx = info.width - 20 - Math.round(info.width * 0.04);
    const cy = info.height - 20 - Math.round(info.height * 0.04);
    const i = (cy * info.width + cx) * 4;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    assert.ok(r > 200 && g > 200 && b > 200, `expected light bg through logo hole, got rgb(${r},${g},${b})`);
  });
});
