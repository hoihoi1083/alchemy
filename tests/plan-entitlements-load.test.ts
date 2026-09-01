/**
 * Contract: /api/me is fast for existing users; shared plan provider exists.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const root = process.cwd();

describe("plan entitlements load path", () => {
  it("/api/me skips Clerk currentUser for existing Mongo users", () => {
    const me = readFileSync(join(root, "app/api/me/route.ts"), "utf8");
    assert.match(me, /auth\(\)/);
    assert.match(me, /First-time users still need Clerk profile sync/);
    assert.match(me, /if \(!user\)/);
    assert.match(me, /requireAppUser/);
  });

  it("UserPlanProvider shares one /api/me fetch", () => {
    const provider = readFileSync(
      join(root, "components/UserPlanProvider.tsx"),
      "utf8",
    );
    assert.match(provider, /fetchSharedMe/);
    assert.match(provider, /sharedMeInflight/);
    const app = readFileSync(join(root, "components/AppProviders.tsx"), "utf8");
    assert.match(app, /UserPlanProvider/);
  });

  it("CreationPathPicker uses loading state not Pro+ while plan loads", () => {
    const src = readFileSync(
      join(root, "components/studio/CreationPathPicker.tsx"),
      "utf8",
    );
    assert.match(src, /storyboardLoading/);
    assert.match(src, /checkingPlan/);
    assert.match(src, /planReady && canUseStoryboard\(plan\)/);
    assert.doesNotMatch(src, /!planReady \|\| canUseStoryboard/);
  });

  it("PricingPageClient refreshes plan + tokens after in-place upgrade", () => {
    const pricing = readFileSync(
      join(root, "components/PricingPageClient.tsx"),
      "utf8",
    );
    assert.match(pricing, /syncBillingAfterCheckout/);
    assert.match(pricing, /notifyCreditBalance/);
    assert.match(pricing, /refreshPlan/);
    assert.match(pricing, /data\.updated/);
    const checkout = readFileSync(
      join(root, "app/api/stripe/checkout/route.ts"),
      "utf8",
    );
    assert.match(checkout, /creditBalance: refreshedUser\?\.creditBalance/);
    assert.match(checkout, /tokensGranted: switchTokensGranted/);
  });
});
