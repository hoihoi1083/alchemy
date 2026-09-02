import type { Locale } from "@/lib/i18n";

export function coachUsesEnglish(locale: Locale): boolean {
  return locale === "en";
}

/** HK Cantonese (zh), Simplified (zh-cn), Traditional Taiwan (zh-tw). */
export function coachZh(locale: Locale, hk: string, cn: string, tw: string): string {
  if (locale === "zh-cn") return cn;
  if (locale === "zh-tw") return tw;
  return hk;
}

export function coachContinueOnSetup(locale: Locale): string {
  return coachUsesEnglish(locale)
    ? "Reply next once you are on Setup."
    : coachZh(
        locale,
        "入到 Setup 後回覆 下一步。",
        "进入 Setup 后回复 下一步。",
        "進入 Setup 後回覆 下一步。",
      );
}

export function coachContinueSetupShort(locale: Locale): string {
  return coachUsesEnglish(locale)
    ? "Reply next on Setup."
    : coachZh(locale, "到 Setup 回覆 下一步。", "到 Setup 回复 下一步。", "到 Setup 回覆 下一步。");
}

export function coachModeLine(locale: Locale, mode: string): string {
  return coachUsesEnglish(locale) ? `Mode: ${mode}` : `模式：${mode}`;
}

export function coachPathLine(locale: Locale, path: string): string {
  return coachUsesEnglish(locale) ? `Current path: ${path}` : `目前路線：${path}`;
}

export function coachRepeatPreambleZh(
  locale: Locale,
  reason: string,
): string {
  return coachUsesEnglish(locale)
    ? `⏳ Still on this step — you replied "next" but it is not done yet.\nReason: ${reason}\n\n`
    : coachZh(
        locale,
        `⏳ 仍然係呢一步 — 你回覆了「下一步」，但尚未完成。\n原因：${reason}\n\n`,
        `⏳ 仍在这一步 — 你回复了「下一步」，但尚未完成。\n原因：${reason}\n\n`,
        `⏳ 仍在這一步 — 你回覆了「下一步」，但尚未完成。\n原因：${reason}\n\n`,
      );
}
