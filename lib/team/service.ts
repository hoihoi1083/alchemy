import crypto from "crypto";
import { randomUUID } from "crypto";
import { ObjectId } from "mongodb";
import { normalizeUserPlan, type UserPlan } from "@/lib/billing/plans";
import type { DbTeam, DbTeamInvite, DbTeamMember, DbUser } from "@/lib/db/types";
import { normalizeEmail } from "@/lib/db/email-identity";
import { emailAppBaseUrl } from "@/lib/email/purchase-confirmation";
import { getDb, isMongoConfigured } from "@/lib/mongodb";
import { sendTeamInviteEmail } from "@/lib/email/team-invite";

const DEFAULT_TEAM_SEAT_LIMIT = 5;
const INVITE_EXPIRY_DAYS = 7;

export class TeamError extends Error {
  readonly status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "TeamError";
    this.status = status;
  }
}

export type TeamDashboard = {
  teamId: string;
  ownerClerkId: string;
  seatLimit: number;
  seatsUsed: number;
  seatsHeld: number;
  pendingInviteCount: number;
  seatsAvailable: number;
  plan: UserPlan;
  members: Array<{
    clerkId: string;
    role: "owner" | "member";
    status: "active" | "removed";
    email: string | null;
    name: string | null;
    createdAt: string;
  }>;
  invites: Array<{
    id: string;
    inviteEmail: string;
    createdAt: string;
    expiresAt: string;
  }>;
};

export type TeamMembershipSummary = {
  role: "owner" | "member";
  teamId: string;
  ownerClerkId: string;
  billingPooled: boolean;
  ownerLabel: string | null;
};

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function nowPlusDays(days: number): Date {
  return new Date(Date.now() + days * 24 * 3600 * 1000);
}

function isDuplicateKey(err: unknown): boolean {
  return (err as { code?: number })?.code === 11000;
}

export function parseInviteObjectId(inviteId: string): ObjectId {
  const raw = inviteId.trim();
  if (!/^[a-f0-9]{24}$/i.test(raw)) {
    throw new TeamError("Invalid invite id.", 400);
  }
  return new ObjectId(raw);
}

async function getUserByClerkId(clerkId: string): Promise<DbUser | null> {
  const db = await getDb();
  return db.collection<DbUser>("users").findOne({ clerkId });
}

export async function getActiveOwnedTeam(ownerClerkId: string): Promise<DbTeam | null> {
  const db = await getDb();
  return db.collection<DbTeam>("teams").findOne({
    ownerClerkId,
    status: "active",
  });
}

async function assertOwnerEligibleForSeats(ownerClerkId: string): Promise<DbUser> {
  const user = await getUserByClerkId(ownerClerkId);
  if (!user) throw new TeamError("Owner account not found.", 404);
  const plan = normalizeUserPlan(user.plan);
  if (plan !== "custom") {
    throw new TeamError("Team seat management requires the Custom enterprise plan.", 403);
  }
  return user;
}

async function countTeamActiveMembers(teamId: string): Promise<number> {
  const db = await getDb();
  return db.collection<DbTeamMember>("team_members").countDocuments({
    teamId,
    status: "active",
  });
}

async function countTeamPendingInvites(teamId: string): Promise<number> {
  const db = await getDb();
  return db.collection<DbTeamInvite>("team_invites").countDocuments({
    teamId,
    revokedAt: null,
    acceptedAt: null,
    expiresAt: { $gt: new Date() },
  });
}

async function ensureHeldSeats(teamId: string): Promise<void> {
  const db = await getDb();
  const team = await db.collection<DbTeam>("teams").findOne({ teamId });
  if (!team || typeof team.heldSeats === "number") return;
  const held =
    (await countTeamActiveMembers(teamId)) + (await countTeamPendingInvites(teamId));
  await db.collection<DbTeam>("teams").updateOne(
    { teamId, heldSeats: { $exists: false } },
    { $set: { heldSeats: held, updatedAt: new Date() } },
  );
}

async function reserveSeat(teamId: string, seatLimit: number): Promise<void> {
  const db = await getDb();
  await ensureHeldSeats(teamId);
  const result = await db.collection<DbTeam>("teams").findOneAndUpdate(
    { teamId, status: "active", heldSeats: { $lt: seatLimit } },
    { $inc: { heldSeats: 1 }, $set: { updatedAt: new Date() } },
    { returnDocument: "after" },
  );
  if (!result) {
    throw new TeamError("No seats available. Remove a member or revoke an invite first.", 409);
  }
}

async function releaseSeat(teamId: string): Promise<void> {
  const db = await getDb();
  await ensureHeldSeats(teamId);
  await db.collection<DbTeam>("teams").findOneAndUpdate(
    { teamId, heldSeats: { $gt: 0 } },
    { $inc: { heldSeats: -1 }, $set: { updatedAt: new Date() } },
  );
}

async function requireOwnedTeam(ownerClerkId: string): Promise<DbTeam> {
  const team = await getActiveOwnedTeam(ownerClerkId);
  if (!team) throw new TeamError("No active team found.", 404);
  return team;
}

async function getOrCreateOwnerTeam(ownerClerkId: string): Promise<DbTeam> {
  const db = await getDb();
  const existing = await getActiveOwnedTeam(ownerClerkId);
  if (existing) {
    await ensureHeldSeats(existing.teamId);
    return existing;
  }

  const inactive = await db.collection<DbTeam>("teams").findOne(
    { ownerClerkId, status: "inactive" },
    { sort: { updatedAt: -1 } },
  );
  if (inactive) {
    const held =
      (await countTeamActiveMembers(inactive.teamId)) +
      (await countTeamPendingInvites(inactive.teamId));
    await db.collection<DbTeam>("teams").updateOne(
      { teamId: inactive.teamId },
      {
        $set: {
          status: "active",
          plan: "custom",
          heldSeats: held,
          updatedAt: new Date(),
        },
      },
    );
    return {
      ...inactive,
      status: "active",
      plan: "custom",
      heldSeats: held,
      updatedAt: new Date(),
    };
  }

  const team: DbTeam = {
    teamId: `team_${randomUUID()}`,
    ownerClerkId,
    seatLimit: DEFAULT_TEAM_SEAT_LIMIT,
    heldSeats: 1,
    plan: "custom",
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  try {
    await db.collection<DbTeam>("teams").insertOne(team);
  } catch (err) {
    if (isDuplicateKey(err)) {
      const raced = await getActiveOwnedTeam(ownerClerkId);
      if (raced) return raced;
    }
    throw err;
  }
  await db.collection<DbTeamMember>("team_members").updateOne(
    { teamId: team.teamId, clerkId: ownerClerkId },
    {
      $set: {
        role: "owner",
        status: "active",
        updatedAt: new Date(),
      },
      $setOnInsert: {
        teamId: team.teamId,
        clerkId: ownerClerkId,
        createdAt: new Date(),
      },
    },
    { upsert: true },
  );
  await db.collection<DbUser>("users").updateOne(
    { clerkId: ownerClerkId },
    { $set: { teamId: team.teamId, teamRole: "owner", updatedAt: new Date() } },
  );
  return team;
}

/** Drop inherited entitlements when the owner is no longer on Custom. */
export async function syncOwnerTeamForPlan(
  ownerClerkId: string,
  plan: UserPlan,
): Promise<void> {
  if (!isMongoConfigured()) return;
  if (normalizeUserPlan(plan) === "custom") return;
  const db = await getDb();
  await db.collection<DbTeam>("teams").updateMany(
    { ownerClerkId, status: "active" },
    { $set: { status: "inactive", updatedAt: new Date() } },
  );
}

export async function getTeamDashboardForOwner(ownerClerkId: string): Promise<TeamDashboard> {
  await assertOwnerEligibleForSeats(ownerClerkId);
  const db = await getDb();
  const team = await getOrCreateOwnerTeam(ownerClerkId);
  const [members, invites] = await Promise.all([
    db
      .collection<DbTeamMember>("team_members")
      .find({ teamId: team.teamId, status: "active" })
      .toArray(),
    db
      .collection<DbTeamInvite>("team_invites")
      .find({
        teamId: team.teamId,
        revokedAt: null,
        acceptedAt: null,
        expiresAt: { $gt: new Date() },
      })
      .sort({ createdAt: -1 })
      .toArray(),
  ]);
  const users = await db
    .collection<DbUser>("users")
    .find({ clerkId: { $in: members.map((m) => m.clerkId) } })
    .toArray();
  const userByClerk = new Map(users.map((u) => [u.clerkId, u]));
  const seatsHeld = members.length + invites.length;

  return {
    teamId: team.teamId,
    ownerClerkId: team.ownerClerkId,
    seatLimit: team.seatLimit,
    seatsUsed: members.length,
    seatsHeld,
    pendingInviteCount: invites.length,
    seatsAvailable: Math.max(0, team.seatLimit - seatsHeld),
    plan: team.plan,
    members: members.map((m) => {
      const user = userByClerk.get(m.clerkId);
      return {
        clerkId: m.clerkId,
        role: m.role,
        status: m.status,
        email: user?.email ?? null,
        name: user?.name ?? null,
        createdAt: m.createdAt.toISOString(),
      };
    }),
    invites: invites.map((i) => ({
      id: String(i._id),
      inviteEmail: i.inviteEmail,
      createdAt: i.createdAt.toISOString(),
      expiresAt: i.expiresAt.toISOString(),
    })),
  };
}

export async function getTeamContextForUser(
  clerkId: string,
): Promise<TeamMembershipSummary | null> {
  const membership = await getActiveTeamMembership(clerkId);
  if (!membership) return null;
  const owner = await getUserByClerkId(membership.ownerClerkId);
  const ownerPlan = normalizeUserPlan(owner?.plan);
  return {
    role: membership.role,
    teamId: membership.teamId,
    ownerClerkId: membership.ownerClerkId,
    billingPooled: membership.role === "member" && ownerPlan === "custom",
    ownerLabel: owner?.name?.trim() || owner?.email?.trim() || null,
  };
}

export async function createTeamInvite(ownerClerkId: string, inviteEmailRaw: string): Promise<{
  inviteId: string;
  inviteUrl: string;
  expiresAt: string;
  emailSent: boolean;
  emailSkipped?: string;
  emailError?: string;
}> {
  if (!isMongoConfigured()) throw new TeamError("Database is required for team seats.", 503);
  const owner = await assertOwnerEligibleForSeats(ownerClerkId);
  const inviteEmailNormalized = normalizeEmail(inviteEmailRaw);
  if (!inviteEmailNormalized) throw new TeamError("Enter a valid email address.");
  if (inviteEmailNormalized === normalizeEmail(owner.email)) {
    throw new TeamError("Owner cannot invite their own email.");
  }
  const db = await getDb();
  const team = await getOrCreateOwnerTeam(ownerClerkId);

  const existingUser = await db.collection<DbUser>("users").findOne({
    emailNormalized: inviteEmailNormalized,
    supersededBy: null,
  });
  if (existingUser) {
    const alreadyMember = await db.collection<DbTeamMember>("team_members").findOne({
      teamId: team.teamId,
      clerkId: existingUser.clerkId,
      status: "active",
    });
    if (alreadyMember) {
      throw new TeamError("This person is already on the team.", 409);
    }
  }

  await reserveSeat(team.teamId, team.seatLimit);

  const token = randomUUID().replace(/-/g, "") + randomUUID().replace(/-/g, "");
  const tokenHash = hashToken(token);
  const expiresAt = nowPlusDays(INVITE_EXPIRY_DAYS);
  const invite: DbTeamInvite = {
    teamId: team.teamId,
    inviteEmail: inviteEmailRaw.trim(),
    inviteEmailNormalized,
    tokenHash,
    invitedBy: ownerClerkId,
    createdAt: new Date(),
    expiresAt,
    acceptedAt: null,
    acceptedByClerkId: null,
    revokedAt: null,
  };
  try {
    const inserted = await db.collection<DbTeamInvite>("team_invites").insertOne(invite);
    const base = emailAppBaseUrl();
    const inviteUrl = `${base}/team/invite?token=${encodeURIComponent(token)}`;
    const emailResult = await sendTeamInviteEmail({
      to: inviteEmailRaw,
      ownerLabel: owner.name?.trim() || owner.email?.trim() || "Team owner",
      inviteUrl,
      expiresAt,
    });
    return {
      inviteId: String(inserted.insertedId),
      inviteUrl,
      expiresAt: expiresAt.toISOString(),
      emailSent: emailResult.sent,
      emailSkipped: emailResult.skipped,
      emailError: emailResult.error,
    };
  } catch (err) {
    await releaseSeat(team.teamId);
    if (isDuplicateKey(err)) {
      throw new TeamError("This email already has a pending invite.");
    }
    throw err;
  }
}

export async function resendTeamInvite(ownerClerkId: string, inviteId: string): Promise<{
  inviteUrl: string;
  expiresAt: string;
  emailSent: boolean;
  emailSkipped?: string;
  emailError?: string;
}> {
  const owner = await assertOwnerEligibleForSeats(ownerClerkId);
  const db = await getDb();
  const team = await requireOwnedTeam(ownerClerkId);
  const _id = parseInviteObjectId(inviteId);
  const invite = await db.collection<DbTeamInvite>("team_invites").findOne({
    _id,
    teamId: team.teamId,
    acceptedAt: null,
    revokedAt: null,
  });
  if (!invite) throw new TeamError("Invite not found.", 404);
  const token = randomUUID().replace(/-/g, "") + randomUUID().replace(/-/g, "");
  const tokenHash = hashToken(token);
  const expiresAt = nowPlusDays(INVITE_EXPIRY_DAYS);
  await db.collection<DbTeamInvite>("team_invites").updateOne(
    { _id, teamId: team.teamId, acceptedAt: null, revokedAt: null },
    { $set: { tokenHash, expiresAt } },
  );
  const inviteUrl = `${emailAppBaseUrl()}/team/invite?token=${encodeURIComponent(token)}`;
  const emailResult = await sendTeamInviteEmail({
    to: invite.inviteEmail,
    ownerLabel: owner.name?.trim() || owner.email?.trim() || "Team owner",
    inviteUrl,
    expiresAt,
  });
  return {
    inviteUrl,
    expiresAt: expiresAt.toISOString(),
    emailSent: emailResult.sent,
    emailSkipped: emailResult.skipped,
    emailError: emailResult.error,
  };
}

export async function revokeTeamInvite(ownerClerkId: string, inviteId: string): Promise<void> {
  await assertOwnerEligibleForSeats(ownerClerkId);
  const db = await getDb();
  const team = await requireOwnedTeam(ownerClerkId);
  const _id = parseInviteObjectId(inviteId);
  const res = await db.collection<DbTeamInvite>("team_invites").findOneAndUpdate(
    {
      _id,
      teamId: team.teamId,
      acceptedAt: null,
      revokedAt: null,
    },
    { $set: { revokedAt: new Date() } },
    { returnDocument: "before" },
  );
  if (!res) throw new TeamError("Invite not found.", 404);
  await releaseSeat(team.teamId);
}

export async function removeTeamMember(ownerClerkId: string, memberClerkId: string): Promise<void> {
  await assertOwnerEligibleForSeats(ownerClerkId);
  const db = await getDb();
  const team = await requireOwnedTeam(ownerClerkId);
  if (memberClerkId === ownerClerkId) {
    throw new TeamError("Owner cannot remove themselves from the team.", 400);
  }
  const res = await db.collection<DbTeamMember>("team_members").updateOne(
    {
      teamId: team.teamId,
      clerkId: memberClerkId,
      status: "active",
    },
    { $set: { status: "removed", removedAt: new Date(), updatedAt: new Date() } },
  );
  if (res.matchedCount === 0) throw new TeamError("Member not found.", 404);
  await db.collection<DbUser>("users").updateOne(
    { clerkId: memberClerkId },
    { $set: { teamId: null, teamRole: null, updatedAt: new Date() } },
  );
  await releaseSeat(team.teamId);
}

export async function leaveTeam(clerkId: string): Promise<void> {
  if (!isMongoConfigured()) throw new TeamError("Database is required for team seats.", 503);
  const membership = await getActiveTeamMembership(clerkId);
  if (!membership) throw new TeamError("You are not on a team.", 404);
  if (membership.role === "owner") {
    throw new TeamError("Owner cannot leave the team. Remove members instead.", 400);
  }
  const db = await getDb();
  const res = await db.collection<DbTeamMember>("team_members").updateOne(
    {
      teamId: membership.teamId,
      clerkId,
      status: "active",
    },
    { $set: { status: "removed", removedAt: new Date(), updatedAt: new Date() } },
  );
  if (res.matchedCount === 0) throw new TeamError("You are not on a team.", 404);
  await db.collection<DbUser>("users").updateOne(
    { clerkId },
    { $set: { teamId: null, teamRole: null, updatedAt: new Date() } },
  );
  await releaseSeat(membership.teamId);
}

export async function acceptTeamInvite(clerkId: string, token: string): Promise<{ teamId: string }> {
  if (!isMongoConfigured()) throw new TeamError("Database is required for team seats.", 503);
  const tokenHash = hashToken(token.trim());
  const db = await getDb();
  const invite = await db.collection<DbTeamInvite>("team_invites").findOne({
    tokenHash,
    revokedAt: null,
    acceptedAt: null,
    expiresAt: { $gt: new Date() },
  });
  if (!invite) throw new TeamError("Invite is invalid or expired.", 404);

  const user = await getUserByClerkId(clerkId);
  const emailNormalized = normalizeEmail(user?.email ?? null);
  if (!emailNormalized) throw new TeamError("Your account needs a verified email to accept invites.");
  if (emailNormalized !== invite.inviteEmailNormalized) {
    throw new TeamError("This invite was sent to a different email address.", 403);
  }

  const team = await db.collection<DbTeam>("teams").findOne({
    teamId: invite.teamId,
    status: "active",
  });
  if (!team) throw new TeamError("Team is no longer active.", 404);

  const existingMembership = await db.collection<DbTeamMember>("team_members").findOne({
    clerkId,
    status: "active",
  });
  if (existingMembership && existingMembership.teamId !== team.teamId) {
    throw new TeamError("You are already assigned to another team.", 409);
  }

  const claimed = await db.collection<DbTeamInvite>("team_invites").findOneAndUpdate(
    { _id: invite._id, acceptedAt: null, revokedAt: null },
    {
      $set: {
        acceptedAt: new Date(),
        acceptedByClerkId: clerkId,
      },
    },
    { returnDocument: "after" },
  );
  if (!claimed) throw new TeamError("Invite is invalid or expired.", 404);

  if (existingMembership && existingMembership.teamId === team.teamId) {
    await releaseSeat(team.teamId);
    return { teamId: team.teamId };
  }

  await db.collection<DbTeamMember>("team_members").updateOne(
    { teamId: team.teamId, clerkId },
    {
      $set: {
        role: "member",
        status: "active",
        updatedAt: new Date(),
      },
      $setOnInsert: {
        teamId: team.teamId,
        clerkId,
        createdAt: new Date(),
      },
    },
    { upsert: true },
  );
  await db.collection<DbUser>("users").updateOne(
    { clerkId },
    { $set: { teamId: team.teamId, teamRole: "member", updatedAt: new Date() } },
  );
  return { teamId: team.teamId };
}

export type TeamMembership = {
  teamId: string;
  role: "owner" | "member";
  status: "active";
  ownerClerkId: string;
};

export async function getActiveTeamMembership(clerkId: string): Promise<TeamMembership | null> {
  if (!isMongoConfigured()) return null;
  const db = await getDb();
  const member = await db.collection<DbTeamMember>("team_members").findOne({
    clerkId,
    status: "active",
  });
  if (!member) return null;
  const team = await db.collection<DbTeam>("teams").findOne({
    teamId: member.teamId,
    status: "active",
  });
  if (!team) return null;
  return {
    teamId: team.teamId,
    role: member.role,
    status: "active",
    ownerClerkId: team.ownerClerkId,
  };
}
