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

/** Footer after a landing action button that opens /studio (no in-studio chat coach). */
export function coachLandingAfterStudioAction(locale: Locale): string {
  return coachUsesEnglish(locale)
    ? "Click the button above — then follow the wizard cards on the next page. (No chat coach in /studio.)"
    : coachZh(
        locale,
        "按上面掣 — 下一頁跟畫面卡片就得（/studio 冇逐步 chat）。",
        "点上面按钮 — 下一页跟画面卡片即可（/studio 无逐步 chat）。",
        "按上面按鈕 — 下一頁跟畫面卡片即可（/studio 無逐步 chat）。",
      );
}

/** Footer after a landing action button that opens a standalone tool page. */
export function coachLandingAfterToolAction(locale: Locale): string {
  return coachUsesEnglish(locale)
    ? "Click the button above to open that tool."
    : coachZh(
        locale,
        "按上面掣開啟工具。",
        "点上面按钮打开工具。",
        "按上面按鈕開啟工具。",
      );
}

/** @deprecated Dormant — in-studio step coach disabled; use coachLandingAfterStudioAction. */
export function coachContinueOnSetup(locale: Locale): string {
  return coachLandingAfterStudioAction(locale);
}

/** @deprecated Dormant — in-studio step coach disabled; use coachLandingAfterStudioAction. */
export function coachContinueSetupShort(locale: Locale): string {
  return coachLandingAfterStudioAction(locale);
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
