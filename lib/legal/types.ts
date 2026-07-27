export type LegalSection = {
  heading: string;
  paragraphs: string[];
};

export type LegalDocument = {
  title: string;
  lastUpdatedLabel: string;
  lastUpdated: string;
  intro: string[];
  sections: LegalSection[];
};

export type LegalKind = "privacy" | "terms" | "refund";

export type LegalBundle = Record<LegalKind, LegalDocument>;
