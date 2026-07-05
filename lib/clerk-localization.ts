import { enUS, zhCN, zhTW } from "@clerk/localizations";
import type { Locale } from "@/lib/i18n";

const CLERK_LOCALES = {
  en: enUS,
  zh: zhTW,
  "zh-cn": zhCN,
} as const satisfies Record<Locale, typeof enUS>;

export function clerkLocalizationFor(locale: Locale) {
  return CLERK_LOCALES[locale];
}
