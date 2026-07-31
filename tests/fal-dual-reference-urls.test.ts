import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildFalLayoutTransferImageUrls,
  carouselCoverSeriesAnchorHint,
  carouselProductHeroLock,
  carouselSeriesConsistencyLock,
  dualProductIdentityHint,
} from "../lib/fal-dual-reference-urls";
import { resolveReferenceStrategy } from "../lib/reference-strategy";

describe("dual reference layout-transfer (research OR manual style upload)", () => {
  it("physical single + style ref + product → dual layout-transfer", () => {
    const s = resolveReferenceStrategy({
      promotionMode: "physical",
      imageOutputMode: "single",
      visualStyleId: "product",
      imageCreativeMode: "reference-concept",
      hasReferenceUpload: true,
      hasProductPhoto: true,
      hasReferenceBrief: true,
    });
    assert.equal(s.kind, "layout-transfer");
    assert.equal(s.useDualImage, true);
    assert.equal(s.sendPixelsToFal, true);
  });

  it("physical ab + style ref + product → dual layout-transfer", () => {
    const s = resolveReferenceStrategy({
      promotionMode: "physical",
      imageOutputMode: "ab",
      visualStyleId: "product",
      imageCreativeMode: "reference-concept",
      hasReferenceUpload: true,
      hasProductPhoto: true,
      hasReferenceBrief: false,
    });
    assert.equal(s.kind, "layout-transfer");
    assert.equal(s.useDualImage, true);
  });

  it("orders fal urls: product then style then angles", async () => {
    const style = new File([new Uint8Array([1])], "research-or-manual-style.jpg");
    const product = new File([new Uint8Array([2])], "user-product.jpg");
    const angle = new File([new Uint8Array([3])], "user-angle.jpg");
    const uploaded: string[] = [];
    const urls = await buildFalLayoutTransferImageUrls({
      upload: async (f) => {
        const id = `url:${f.name}`;
        uploaded.push(id);
        return id;
      },
      styleRef: style,
      productRef: product,
      productAngles: [angle],
    });
    assert.deepEqual(urls, [
      "url:user-product.jpg",
      "url:research-or-manual-style.jpg",
      "url:user-angle.jpg",
    ]);
    assert.deepEqual(uploaded, urls);
  });

  it("dual identity hint protects IMAGE 1 product against IMAGE 2 style", () => {
    assert.match(dualProductIdentityHint(false), /IMAGE 1/);
    assert.match(dualProductIdentityHint(false), /never show IMAGE 2's product/);
    assert.match(dualProductIdentityHint(true), /IMAGE 1 only/);
  });

  it("carousel product hero lock bans substitute jewelry and mascots on tip slides", () => {
    const lock = carouselProductHeroLock({ productName: "金砂石手鏈" });
    assert.match(lock, /PRODUCT HERO LOCK/);
    assert.match(lock, /金砂石手鏈/);
    assert.match(lock, /tip|educational/i);
    assert.match(lock, /substitute|jewelry/i);
    assert.match(lock, /bathroom|gym|yoga|cutaway/i);
    assert.match(lock, /mascot|flask|beaker/i);
    assert.match(lock, /recolor|pink/i);
  });

  it("carousel series lock bans mid-series photoreal lifestyle flip", () => {
    const lock = carouselSeriesConsistencyLock("soft product flat-lay edu cards");
    assert.match(lock, /SERIES CONSISTENCY LOCK/);
    assert.match(lock, /soft product flat-lay edu cards/);
    assert.match(lock, /photorealistic human|bathroom|lifestyle cutaway|mascot/i);
  });

  it("cover series anchor tells later slides to match cover + keep IMAGE 1 product", () => {
    const hint = carouselCoverSeriesAnchorHint();
    assert.match(hint, /SERIES COVER ANCHOR/);
    assert.match(hint, /LAST image|COVER/i);
    assert.match(hint, /IMAGE 1/);
    assert.match(hint, /mascot|recolor|jewelry/i);
  });

  it("cover series anchor without product skips IMAGE 1 product hero language", () => {
    const hint = carouselCoverSeriesAnchorHint({ hasProductPhoto: false });
    assert.match(hint, /SERIES COVER ANCHOR/);
    assert.doesNotMatch(hint, /exact product hero/i);
    assert.match(hint, /series DNA|topic|typography/i);
  });
});
