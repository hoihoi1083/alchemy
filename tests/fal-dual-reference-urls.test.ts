import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildFalLayoutTransferImageUrls,
  carouselCoverSeriesAnchorHint,
  carouselProductHeroLock,
  carouselSlideRoleVariationHint,
  carouselSeriesConsistencyLock,
  carouselTipSlideLookFollowHint,
  carouselUniqueCopyHint,
  dualProductIdentityHint,
  teachingCarouselTipImageUrls,
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

  it("name vs photo: typed 便攜電源 does not redefine IMAGE 1", () => {
    const lock = carouselProductHeroLock({ productName: "便攜電源" });
    assert.match(lock, /NAME VS PHOTO/);
    assert.match(lock, /便攜電源/);
    assert.match(lock, /CLAIM only/);
    assert.doesNotMatch(lock, /exact photo of 便攜電源/);
    assert.match(lock, /power bank vs bottle|substitute SKU/i);
    assert.match(lock, /TIP \/ SELLING-POINT|typography only/i);
    assert.match(lock, /charger|power station/i);
  });

  it("carousel product hero lock bans substitute jewelry and mascots on tip slides", () => {
    const lock = carouselProductHeroLock({ productName: "金砂石手鏈" });
    assert.match(lock, /PRODUCT HERO LOCK/);
    assert.match(lock, /IMAGE 1 pixels ARE the product/);
    assert.match(lock, /NAME VS PHOTO/);
    assert.match(lock, /金砂石手鏈/);
    assert.doesNotMatch(lock, /IMAGE 1 is the exact photo of/);
    assert.match(lock, /tip|educational/i);
    assert.match(lock, /substitute|jewelry/i);
    assert.match(lock, /bathroom|gym|yoga|cutaway/i);
    assert.match(lock, /mascot|flask|beaker/i);
    assert.match(lock, /recolor|pink/i);
    assert.match(lock, /TIP \/ SELLING-POINT|typography only/i);
    assert.match(lock, /charger|power station|快速充電/i);
  });

  it("first-pass tip urls are product/style refs only — no cover pixels", () => {
    assert.deepEqual(
      teachingCarouselTipImageUrls(["url:product.jpg", "url:style.jpg"]),
      ["url:product.jpg", "url:style.jpg"],
    );
    assert.equal(teachingCarouselTipImageUrls(null), null);
    assert.deepEqual(teachingCarouselTipImageUrls(["url:product.jpg"]), [
      "url:product.jpg",
    ]);
  });

  it("tip look-follow hint keeps series style but forbids cloning cover/IMAGE 2 pose", () => {
    const hint = carouselTipSlideLookFollowHint({ hasStyleReference: true });
    assert.match(hint, /FOLLOW SERIES LOOK, NOT THE COVER FRAME/);
    assert.match(hint, /IMAGE 2 is series look only/i);
    assert.match(hint, /COVER-only|cover only/i);
    assert.match(hint, /Staging pose: KEEP/i);
    assert.doesNotMatch(hint, /LAST image in image_urls/);
  });

  it("tip slide variation forbids inventing a charger to illustrate the tip", () => {
    const hint = carouselSlideRoleVariationHint({
      role: "point",
      index: 3,
      total: 5,
    });
    assert.match(hint, /SAME product/i);
    assert.match(hint, /charger|power station/i);
  });

  it("carousel series lock bans mid-series photoreal lifestyle flip and demands layout variation", () => {
    const lock = carouselSeriesConsistencyLock("soft product flat-lay edu cards");
    assert.match(lock, /SERIES CONSISTENCY LOCK/);
    assert.match(lock, /soft product flat-lay edu cards/);
    assert.match(lock, /photorealistic human|bathroom|lifestyle cutaway|mascot/i);
    assert.match(lock, /DISTINCT composition|NEVER reuse the same/i);
    assert.match(lock, /CRITICAL MEDIUM LOCK|Never mix styles|SAME character/i);
  });

  it("model-wear series lock requires a person on every slide", () => {
    const lock = carouselSeriesConsistencyLock("lifestyle jewelry ads", {
      modelWear: true,
    });
    assert.match(lock, /SERIES MODEL-WEAR LOCK|real person/i);
    assert.doesNotMatch(lock, /Do NOT invent a one-off photoreal model-wear/i);
  });

  it("campaign role variation uses selling-points / offer language", () => {
    const mid = carouselSlideRoleVariationHint({
      role: "selling-points",
      index: 2,
      total: 3,
    });
    assert.match(mid, /selling-points|Feature/i);
    assert.match(mid, /differ from hero|MUST differ/i);
    const wear = carouselSlideRoleVariationHint({
      role: "offer",
      index: 3,
      total: 3,
      modelWear: true,
    });
    assert.match(wear, /person|wearing|using/i);
  });

  it("cover series text DNA (default) forbids cloning cover with swapped text", () => {
    const hint = carouselCoverSeriesAnchorHint();
    assert.match(hint, /SERIES LOOK|SERIES COVER ANCHOR/);
    assert.match(hint, /NEW composition|Do not redesign the cover/i);
    assert.match(hint, /IMAGE 1/);
  });

  it("cover pixel anchor still warns against cloning cover layout and locks medium/character", () => {
    const hint = carouselCoverSeriesAnchorHint({ pixelAnchor: true });
    assert.match(hint, /SERIES COVER ANCHOR/);
    assert.match(hint, /LAST image/);
    assert.match(hint, /DO NOT clone the cover/i);
    assert.match(hint, /art medium EXACTLY|SAME character/i);
    assert.match(hint, /on-image text|unique headline/i);
  });

  it("unique copy hint forces distinct on-image wording per slide", () => {
    const hint = carouselUniqueCopyHint({
      index: 2,
      role: "point",
      title: "集中管理多渠道",
      body: "一個後台追蹤成效",
      takeaway: "記住重點",
    });
    assert.match(hint, /UNIQUE SLIDE COPY LOCK/);
    assert.match(hint, /集中管理多渠道/);
    assert.match(hint, /一個後台追蹤成效/);
    assert.match(hint, /differ from the cover|never reuse/i);
  });

  it("cover series anchor without product skips IMAGE 1 product hero language", () => {
    const hint = carouselCoverSeriesAnchorHint({ hasProductPhoto: false });
    assert.match(hint, /SERIES LOOK|SERIES COVER ANCHOR/);
    assert.doesNotMatch(hint, /exact product hero/i);
    assert.match(hint, /series DNA|topic|typography/i);
  });
});
