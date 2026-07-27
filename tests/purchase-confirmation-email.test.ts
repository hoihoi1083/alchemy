import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildPurchaseConfirmationContent } from "../lib/email/purchase-confirmation";

describe("purchase confirmation email", () => {
  it("builds top-up content with tokens and support link", () => {
    const { subject, html, text } = buildPurchaseConfirmationContent({
      to: "buyer@example.com",
      kind: "topup",
      tokensGranted: 1000,
      balanceAfter: 2500,
      amountLabel: "$10.00",
    });
    assert.match(subject, /top-up/i);
    assert.match(text, /1,000 tokens/);
    assert.match(text, /2,500 tokens/);
    assert.match(html, /1,000 tokens/);
    assert.match(html, /Purchased/);
    assert.match(html, /https:\/\/www\.alchemyailab\.com\/account/);
    assert.match(html, /href="https:\/\/www\.alchemyailab\.com"/);
    assert.match(html, /support@alchemyailab\.com/);
    assert.match(html, /Open account/);
    assert.match(html, /Purchase receipt/);
    assert.match(html, /Alchemy AI Lab/);
    assert.match(html, /cid:alchemy-logo/);
  });

  it("builds subscription content with plan and renew date", () => {
    const renewsAt = new Date("2026-08-01T00:00:00.000Z");
    const { subject, html, text } = buildPurchaseConfirmationContent({
      to: "buyer@example.com",
      kind: "subscription",
      plan: "standard",
      tokensGranted: 3000,
      balanceAfter: 4000,
      renewsAt,
      amountLabel: "$19.99",
    });
    assert.match(subject, /Standard/i);
    assert.match(text, /3,000/);
    assert.match(text, /\$19\.99/);
    assert.match(html, /Standard plan/);
    assert.match(html, /Subscription receipt/);
    assert.match(html, /support@alchemyailab\.com/);
  });
});
