import type { PromptMarket } from "@/lib/prompt-variables";
import type { VoiceoverLocale } from "@/lib/ad-pack-preferences";
import type { Locale } from "@/lib/i18n";

/** Map website UI language → AI output market (and voice locale). */
export function promptMarketFromLocale(locale: Locale): PromptMarket {
  if (locale === "en") return "en";
  if (locale === "zh-cn") return "cn";
  return "hk";
}

export function voiceoverLocaleFromUiLocale(locale: Locale): VoiceoverLocale {
  if (locale === "en") return "en";
  if (locale === "zh-cn") return "cn";
  return "hk";
}

/** Language for on-image copy — separate from market visual style. */
export type CopyLocale = "en" | "zh-hant" | "zh-hans";

/** True when text is mostly Latin letters (English promos, AirPods briefs, etc.). */
export function textLooksLatin(text: string): boolean {
  const stripped = text.replace(/\s+/g, "");
  if (!stripped) return false;
  const latin = (stripped.match(/[A-Za-z]/g) ?? []).length;
  const cjk = (stripped.match(/[\u4e00-\u9fff]/g) ?? []).length;
  if (cjk > latin) return false;
  return latin / stripped.length >= 0.35;
}

/** Infer on-image copy language from brief text; market is only a fallback. */
export function inferCopyLocale(
  market: PromptMarket,
  ...samples: (string | undefined)[]
): CopyLocale {
  const joined = samples.filter(Boolean).join("\n").trim();
  if (joined && textLooksLatin(joined)) return "en";
  if (!joined) {
    if (market === "en") return "en";
    if (market === "cn") return "zh-hans";
    return "zh-hant";
  }
  if (market === "cn") return "zh-hans";
  return "zh-hant";
}

/**
 * Prompt market selects on-image script.
 * UI locale drives market (en → English, zh-cn → 简体, zh → 繁體).
 */
export function resolveCopyLocale(
  market: PromptMarket,
  ..._samples: (string | undefined)[]
): CopyLocale {
  if (market === "en") return "en";
  if (market === "cn") return "zh-hans";
  if (market === "hk" || market === "tw") return "zh-hant";
  return inferCopyLocale(market, ..._samples);
}

export function marketChineseScriptBlock(market: PromptMarket): string {
  if (market === "hk" || market === "tw") {
    return "MANDATORY Chinese script: Traditional Chinese (繁體中文) only on the image. Convert any Simplified (简体) from IMAGE 1 or reference notes to Traditional equivalents. Never mix 简繁 on one poster.";
  }
  if (market === "cn") {
    return "MANDATORY Chinese script: Simplified Chinese (简体中文) only on the image.";
  }
  return "";
}

export function copyLocaleLabel(locale: CopyLocale): string {
  if (locale === "en") return "English";
  if (locale === "zh-hans") return "Simplified Chinese (简体中文)";
  return "Traditional Chinese (繁體中文)";
}

/** Typography + verbatim copy guard for Nano Banana (no negative_prompt). */
export function typographyHintForLocale(
  locale: CopyLocale,
  exactLines?: string[],
): string {
  const lines = exactLines?.map((l) => l.trim()).filter(Boolean) ?? [];
  const antiHallucination =
    " Do NOT write language meta-labels (e.g. '繁體中文', 'Traditional Chinese'). Do NOT duplicate the same phrase twice on one slide. Do NOT invent extra Chinese characters.";
  const verbatim =
    lines.length > 0
      ? locale === "zh-hant"
        ? ` On-image copy must express this message in Traditional Chinese (convert script if the brief uses Simplified): ${lines.join(" · ")}.`
        : locale === "zh-hans"
          ? ` On-image copy must express this message in Simplified Chinese: ${lines.join(" · ")}.`
          : ` Render ONLY these exact on-image lines (verbatim — do not translate, do not add extra words): ${lines.join(" · ")}.`
      : "";
  if (locale === "en") {
    return `Use clean premium English ad typography.${verbatim}${antiHallucination}`;
  }
  if (locale === "zh-hans") {
    return `Use clean Simplified Chinese typography only — never use Traditional characters.${verbatim}${antiHallucination}`;
  }
  return `Use clean Traditional Chinese typography only — never use Simplified characters (简体).${verbatim}${antiHallucination}`;
}

export function plannerCopyLanguageRule(locale: CopyLocale): string {
  return `All slide title, body, and takeaway fields MUST be in ${copyLocaleLabel(locale)} — match the user's brief language.`;
}
