import type { Locale } from "@/lib/i18n";
import { legalEn } from "@/lib/legal/policies-en";
import { legalZh } from "@/lib/legal/policies-zh";
import { legalZhCn } from "@/lib/legal/policies-zh-cn";
import { legalZhTw } from "@/lib/legal/policies-zh-tw";
import type { LegalBundle, LegalDocument, LegalKind } from "@/lib/legal/types";

export type { LegalDocument, LegalKind } from "@/lib/legal/types";

const bundles: Record<Locale, LegalBundle> = {
  en: legalEn,
  zh: legalZh,
  "zh-cn": legalZhCn,
  "zh-tw": legalZhTw,
};

export function getLegalDocument(kind: LegalKind, locale: Locale): LegalDocument {
  return bundles[locale]?.[kind] ?? legalEn[kind];
}
