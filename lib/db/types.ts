import type { ObjectId } from "mongodb";
import type { UserPlan } from "@/lib/billing/plans";
import type { PaidPlan } from "@/lib/stripe/prices";
import type { ProjectSnapshot } from "@/lib/project-snapshot";
import type { TemplateId } from "@/lib/templates";
import type { PromotionMode } from "@/lib/promotion-mode";

export type { UserPlan };

export type DbUser = {
  _id?: ObjectId;
  clerkId: string;
  email: string | null;
  /** Lowercased email for identity merge / unique active-user index. */
  emailNormalized?: string | null;
  name: string | null;
  imageUrl: string | null;
  region: "hk" | "cn";
  /** Studio tokens (sum of non-expired batch remainders; mirrored for fast reads). */
  creditBalance: number;
  /**
   * Bumped on every wallet mutation (grant/consume/prune). Used as CAS token so
   * a stale consume cannot overwrite a concurrent grant's tokenBatches.
   */
  walletRevision?: number;
  /**
   * FIFO token batches. Each grant adds a batch that expires after 6 months.
   * Missing/empty + creditBalance > 0 is migrated once to a legacy batch.
   */
  tokenBatches?: Array<{
    id: string;
    remaining: number;
    grantedAt: Date;
    expiresAt: Date;
    source: string;
  }>;
  /** Set when legacy balance was converted into tokenBatches. */
  tokenBatchesMigratedAt?: Date | null;
  plan: UserPlan;
  /** Set once when Free signup grant is applied. */
  signupGrantAt?: Date | null;
  /** True after user starts (or completes) the one-time Pro trial. */
  hasUsedProTrial?: boolean;
  /** When the current Pro trial ends (Stripe trial_end), if trialing. */
  proTrialEndsAt?: Date | null;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  planRenewsAt?: Date | null;
  /**
   * Deferred downgrade target. Active `plan` stays until `pendingPlanEffectiveAt`
   * (usually current period end). Cleared when the lower price takes effect or
   * the user upgrades instead.
   */
  pendingPlan?: PaidPlan | null;
  pendingPlanInterval?: "monthly" | "yearly" | null;
  pendingPlanEffectiveAt?: Date | null;
  /**
   * When set, this row is a superseded duplicate of another clerkId (same email).
   * Not used for auth/billing; kept for audit.
   */
  supersededBy?: string | null;
  supersededAt?: Date | null;
  /** Optional backlink for seat-membership lookups. */
  teamId?: string | null;
  teamRole?: "owner" | "member" | null;
  createdAt: Date;
  updatedAt: Date;
};

export type TeamPlan = Extract<
  UserPlan,
  "custom" | "master" | "pro" | "standard" | "light"
>;

export type DbTeam = {
  _id?: ObjectId;
  teamId: string;
  ownerClerkId: string;
  seatLimit: number;
  /**
   * Atomic reservation counter: active members + pending invites.
   * Invite/accept races increment this with `heldSeats < seatLimit`.
   */
  heldSeats?: number;
  plan: TeamPlan;
  status: "active" | "inactive";
  createdAt: Date;
  updatedAt: Date;
};

export type DbTeamMember = {
  _id?: ObjectId;
  teamId: string;
  clerkId: string;
  role: "owner" | "member";
  status: "active" | "removed";
  createdAt: Date;
  updatedAt: Date;
  removedAt?: Date | null;
};

export type DbTeamInvite = {
  _id?: ObjectId;
  teamId: string;
  inviteEmail: string;
  inviteEmailNormalized: string;
  tokenHash: string;
  invitedBy: string;
  createdAt: Date;
  expiresAt: Date;
  acceptedAt?: Date | null;
  acceptedByClerkId?: string | null;
  revokedAt?: Date | null;
};

export type DbProject = {
  _id?: ObjectId;
  clerkId: string;
  name: string;
  promotionMode: PromotionMode;
  templateId: TemplateId | null;
  /** Latest generated still (denormalized for list cards). */
  imageUrl: string | null;
  videoUrl: string | null;
  /** Full wizard state — inputs, plans, prompts, output URLs. */
  snapshot: ProjectSnapshot;
  createdAt: Date;
  updatedAt: Date;
};

export type DbUsageEvent = {
  _id?: ObjectId;
  clerkId: string;
  kind: "image" | "video" | "plan" | "campaign" | "storyboard" | "music" | "voiceover";
  createdAt: Date;
};

export type AssetKind = "image" | "video" | "audio" | "voiceover";

/** Durable copy of a generated output stored in Cloudflare R2. */
export type DbAsset = {
  _id?: ObjectId;
  clerkId: string;
  projectId?: string | null;
  kind: AssetKind;
  /** Original fal/CDN URL the bytes were mirrored from (dedupe key). */
  sourceUrl: string;
  /** Object key inside the R2 bucket. */
  r2Key: string;
  contentType: string;
  /** Optional human label / prompt for display. */
  name?: string | null;
  prompt?: string | null;
  sizeBytes?: number | null;
  /** Scene-cut timing for videos (captions cut markers). */
  timingManifest?: import("@/lib/video-timing-manifest").VideoTimingManifest | null;
  /**
   * Enterprise team folder: when true, other active seats on `teamId`
   * can preview/download. Personal library stays private unless shared.
   */
  teamShared?: boolean;
  teamId?: string | null;
  sharedAt?: Date | null;
  sharedByClerkId?: string | null;
  createdAt: Date;
};
