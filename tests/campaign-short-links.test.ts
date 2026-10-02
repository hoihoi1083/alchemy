import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildCampaignShortLinkTarget,
  findCampaignShortLink,
  normalizeShortLinkCode,
  publicCampaignLandingUrl,
  publicCampaignShortUrl,
} from "../lib/campaign-short-links";

describe("campaign-short-links", () => {
  it("normalizes and finds xhs codes", () => {
    assert.equal(normalizeShortLinkCode("XHS"), "xhs");
    assert.equal(findCampaignShortLink("xhs")?.utmSource, "xiaohongshu");
    assert.equal(findCampaignShortLink("nope"), null);
    assert.equal(normalizeShortLinkCode("../evil"), null);
  });

  it("builds same-origin landing with locked UTMs", () => {
    const link = findCampaignShortLink("xhs")!;
    const target = buildCampaignShortLinkTarget(link);
    assert.equal(
      target,
      "/?utm_source=xiaohongshu&utm_medium=social&utm_campaign=noprompt_week1&utm_content=unspecified",
    );
  });

  it("keeps extra params but does not let them override UTMs", () => {
    const link = findCampaignShortLink("xhs-sample")!;
    const extra = new URLSearchParams({
      ref: "bio",
      utm_source: "hacked",
    });
    const target = buildCampaignShortLinkTarget(link, extra);
    assert.match(target, /^\/get-sample\?/);
    assert.match(target, /utm_source=xiaohongshu/);
    assert.doesNotMatch(target, /utm_source=hacked/);
    assert.match(target, /ref=bio/);
  });

  it("rejects open-redirect style paths", () => {
    assert.throws(() =>
      buildCampaignShortLinkTarget({
        code: "bad",
        path: "//evil.example",
        utmSource: "x",
        utmCampaign: "y",
      }),
    );
  });

  it("builds public share URL", () => {
    assert.equal(
      publicCampaignShortUrl("xhs"),
      "https://www.alchemyailab.com/r/xhs",
    );
  });

  it("builds absolute landing URL for QR (no /r/ hop)", () => {
    const link = findCampaignShortLink("xhs-p1")!;
    assert.equal(
      publicCampaignLandingUrl(link),
      "https://www.alchemyailab.com/?utm_source=xiaohongshu&utm_medium=social&utm_campaign=noprompt_week1&utm_content=post1",
    );
  });

  it("maps post short codes to utm_content", () => {
    assert.equal(findCampaignShortLink("xhs-p2")?.utmContent, "post2");
    assert.equal(findCampaignShortLink("xhs-p3")?.utmContent, "post3");
  });
});
