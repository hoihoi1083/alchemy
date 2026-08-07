import { en } from "./en";
import { zh } from "./zh";
import { zhCn } from "./zh-cn";
import { zhTw } from "./zh-tw";

export type Locale = "en" | "zh" | "zh-cn" | "zh-tw";

export type Messages = typeof en;

const catalogs = {
  en,
  zh: zh as unknown as Messages,
  "zh-cn": zhCn as unknown as Messages,
  "zh-tw": zhTw as unknown as Messages,
} satisfies Record<Locale, Messages>;

export function getMessages(locale: Locale): Messages {
  return catalogs[locale];
}

export function detectLocale(): Locale {
  if (typeof navigator === "undefined") return "en";
  const lang = navigator.language.toLowerCase();
  if (lang.startsWith("zh-cn") || lang.startsWith("zh-hans") || lang === "zh-sg") {
    return "zh-cn";
  }
  if (lang.startsWith("zh-tw") || lang === "zh-hant-tw") return "zh-tw";
  if (lang.startsWith("zh-hk") || lang.startsWith("zh-mo")) return "zh";
  // Generic Traditional without region → HK catalog (legacy).
  if (lang.startsWith("zh-hant")) return "zh";
  if (lang.startsWith("zh")) return "zh";
  return "en";
}

export const LOCALE_STORAGE_KEY = "ams-locale";
