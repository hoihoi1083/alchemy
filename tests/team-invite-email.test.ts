import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildTeamInviteContent } from "../lib/email/team-invite";

describe("team invite email", () => {
  it("matches the subscription receipt layout", () => {
    const { subject, html, text } = buildTeamInviteContent({
      to: "teammate@example.com",
      ownerLabel: "Pat Owner",
      inviteUrl: "https://www.alchemyailab.com/team/invite?token=abc123",
      expiresAt: new Date("2026-08-26T01:17:00.000Z"),
    });
    assert.match(subject, /invited/i);
    assert.match(text, /Pat Owner/);
    assert.match(text, /Accept invite:/);
    assert.match(html, /Team invitation/);
    assert.match(html, /Alchemy AI Lab/);
    assert.match(html, /cid:alchemy-logo/);
    assert.match(html, /Enterprise seat/);
    assert.match(html, /Invited by/);
    assert.match(html, /Sign in as/);
    assert.match(html, /teammate@example.com/);
    assert.match(html, />Accept invite</);
    assert.match(html, /https:\/\/www\.alchemyailab\.com\/team\/invite\?token=abc123/);
    assert.match(html, /color-scheme" content="light"/);
  });
});
