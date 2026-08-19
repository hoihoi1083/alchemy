import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { parseInviteObjectId, TeamError } from "../lib/team/service";
import { effectivePlanFromUser } from "../lib/billing/plans";
import { canUseProCanvas } from "../lib/billing/entitlements";

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

describe("team seats contract", () => {
  it("team API routes exist and enforce auth", () => {
    const routes = [
      "app/api/team/route.ts",
      "app/api/team/invites/route.ts",
      "app/api/team/invites/revoke/route.ts",
      "app/api/team/invites/resend/route.ts",
      "app/api/team/invites/accept/route.ts",
      "app/api/team/members/remove/route.ts",
      "app/api/team/leave/route.ts",
    ];
    for (const rel of routes) {
      const src = read(rel);
      assert.match(src, /requireAppUser/);
      assert.match(src, /TeamError/);
      assert.match(src, /runtime = "nodejs"/);
    }
    const accept = read("app/api/team/invites/accept/route.ts");
    assert.match(accept, /currentUser/);
    assert.match(accept, /invitedEmail/);
    assert.match(accept, /ownerSignedIn/);
  });

  it("service enforces seat-safety guardrails", () => {
    const src = read("lib/team/service.ts");
    assert.match(src, /DEFAULT_TEAM_SEAT_LIMIT = 5/);
    assert.match(src, /Owner cannot invite their own email/);
    assert.match(src, /No seats available/);
    assert.match(src, /Owner cannot remove themselves/);
    assert.match(src, /different email address/);
    assert.match(src, /invitedEmail: invite.inviteEmail/);
    assert.match(src, /candidateEmails/);
    assert.match(src, /sendTeamInviteEmail/);
    const inviteEmail = read("lib/email/team-invite.ts");
    assert.match(inviteEmail, /buildReceiptHtml/);
    assert.match(inviteEmail, /cid:alchemy-logo|EMAIL_LOGO_CONTENT_ID/);
    assert.match(inviteEmail, /Accept invite/);
    assert.match(src, /resendTeamInvite/);
    assert.match(src, /heldSeats: \{ \$lt: seatLimit \}/);
    assert.match(src, /This person is already on the team/);
    assert.match(src, /parseInviteObjectId/);
    assert.match(src, /syncOwnerTeamForPlan/);
    assert.match(src, /leaveTeam/);
  });

  it("rejects malformed invite ids with 400", () => {
    assert.throws(() => parseInviteObjectId("not-an-id"), (err: unknown) => {
      assert.ok(err instanceof TeamError);
      assert.equal(err.status, 400);
      return true;
    });
    const id = parseInviteObjectId("64b0f2c3a1d2e3f4056789ab");
    assert.equal(String(id), "64b0f2c3a1d2e3f4056789ab");
  });

  it("members inherit owner plan via getUserPlan resolver", () => {
    const src = read("lib/billing/get-user-plan.ts");
    assert.match(src, /getActiveTeamMembership/);
    assert.match(src, /membership\.ownerClerkId/);
    assert.match(src, /owner\?\.plan/);
    assert.match(src, /syncOwnerTeamForPlan/);
    assert.match(src, /ownerPlan !== "custom"/);
  });

  it("team members spend from the owner token pool", () => {
    const payer = read("lib/billing/team-payer.ts");
    assert.match(payer, /resolveTokenPayer/);
    assert.match(payer, /payerClerkId: membership\.ownerClerkId/);
    const charge = read("lib/billing/charge.ts");
    assert.match(charge, /resolveTokenPayer/);
    assert.match(charge, /billedClerkId/);
    const me = read("app/api/me/route.ts");
    assert.match(me, /effectivePlan/);
    assert.match(me, /teamMembership/);
    assert.match(me, /ownCreditBalance/);
  });

  it("client UI uses inherited effectivePlan", () => {
    const hook = read("hooks/useUserPlanEntitlements.ts");
    assert.match(hook, /effectivePlan \?\? data\.user\?\.plan/);
    const nav = read("components/nav/ProNavLink.tsx");
    assert.match(nav, /effectivePlan \?\? data\.user\?\.plan/);
    const account = read("components/AccountPageClient.tsx");
    assert.match(account, /teamMembership/);
    assert.match(account, /\/api\/team\/leave/);
  });

  it("effectivePlanFromUser prefers inherited plan", () => {
    assert.equal(effectivePlanFromUser({ plan: "free", effectivePlan: "custom" }), "custom");
    assert.equal(effectivePlanFromUser({ plan: "standard" }), "standard");
    assert.equal(canUseProCanvas("custom"), true);
  });

  it("pricing surfaces the 5-seat enterprise card", () => {
    const en = read("lib/i18n/en.ts");
    assert.match(en, /name: "Enterprise"/);
    assert.match(en, /tokens: "40,000"/);
    assert.match(en, /monthlyPrice: "\$249\.99"/);
    assert.match(en, /yearlyPrice: "\$199\.99"/);
    assert.match(en, /5 seats \(owner \+ 4 teammates\)/);
    assert.match(en, /Shared token pool billed to the owner/);
    const pricing = read("components/PricingPageClient.tsx");
    assert.match(pricing, /pricingCardCapacityItems\("custom"/);
    assert.match(pricing, /row\.custom/);
    assert.match(pricing, /plan: card\.id/);
    assert.doesNotMatch(pricing, /Enterprise%205-seat%20plan/);
    assert.doesNotMatch(en, /multi-seat team workspaces are not included yet/);
  });

  it("invite sender defaults to configured transactional mailbox", () => {
    const src = read("lib/email/resend.ts");
    assert.match(src, /EMAIL_FROM/);
    assert.match(src, /billing@alchemyailab\.com/);
  });
});
