export type CampaignSlideRole = "hero" | "selling-points" | "offer";

export type CampaignSlidePlan = {
  role: CampaignSlideRole;
  title: string;
  headline: string;
  subline: string;
  composition: string;
};

export type CampaignPlan = {
  theme: string;
  visualDna: string;
  slides: CampaignSlidePlan[];
};

export const CAMPAIGN_SLIDE_COUNT = 3;
