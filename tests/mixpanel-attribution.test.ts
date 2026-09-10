import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  classifyTrafficSource,
  sanitizeReferrer,
} from "../lib/mixpanel-attribution";

describe("mixpanel-attribution", () => {
  it("ignores Stripe checkout as referrer", () => {
    assert.equal(sanitizeReferrer("https://checkout.stripe.com/c/pay/cs_test"), undefined);
    assert.equal(
      classifyTrafficSource({ referrer: "https://checkout.stripe.com/" }),
      "direct",
    );
  });

  it("classifies Facebook UTM and referrer", () => {
    assert.equal(
      classifyTrafficSource({ utmSource: "facebook", utmMedium: "social" }),
      "social_facebook",
    );
    assert.equal(
      classifyTrafficSource({ utmSource: "facebook", utmMedium: "paid" }),
      "meta_ads",
    );
    assert.equal(
      classifyTrafficSource({ fbclid: "abc" }),
      "meta_ads",
    );
    assert.equal(
      classifyTrafficSource({ referrer: "https://l.facebook.com/" }),
      "social_facebook",
    );
  });

  it("classifies IG / RedNote / Google tags", () => {
    assert.equal(
      classifyTrafficSource({ utmSource: "instagram" }),
      "social_instagram",
    );
    assert.equal(
      classifyTrafficSource({ utmSource: "rednote" }),
      "social_xiaohongshu",
    );
    assert.equal(
      classifyTrafficSource({ gclid: "g" }),
      "google_ads",
    );
  });
});
