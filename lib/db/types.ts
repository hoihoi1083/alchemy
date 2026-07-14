import type { ObjectId } from "mongodb";
import type { UserPlan } from "@/lib/billing/plans";
import type { ProjectSnapshot } from "@/lib/project-snapshot";
import type { TemplateId } from "@/lib/templates";
import type { PromotionMode } from "@/lib/promotion-mode";

export type { UserPlan };

export type DbUser = {
  _id?: ObjectId;
  clerkId: string;
  email: string | null;
  name: string | null;
  imageUrl: string | null;
  region: "hk" | "cn";
  /** Studio tokens (1,000 ≈ USD 3.30 COGS). */
  creditBalance: number;
  plan: UserPlan;
  /** Set once when Free signup grant is applied. */
  signupGrantAt?: Date | null;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  planRenewsAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
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
