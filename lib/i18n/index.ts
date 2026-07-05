import { en } from "./en";
import { zh } from "./zh";
import { zhCn } from "./zh-cn";

export type Locale = "en" | "zh" | "zh-cn";

export type Messages = typeof en | typeof zh | typeof zhCn;

const catalogs = { en, zh, "zh-cn": zhCn } satisfies Record<Locale, Messages>;

export function getMessages(locale: Locale): Messages {
  return catalogs[locale];
}

export function detectLocale(): Locale {
  if (typeof navigator === "undefined") return "en";
  const lang = navigator.language.toLowerCase();
  if (lang.startsWith("zh-cn") || lang.startsWith("zh-hans")) return "zh-cn";
  if (lang.startsWith("zh")) return "zh";
  return "en";
}

export const LOCALE_STORAGE_KEY = "ams-locale";
