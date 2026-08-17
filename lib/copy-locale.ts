import type { PromptMarket } from "@/lib/prompt-variables";
import type { VoiceoverLocale } from "@/lib/ad-pack-preferences";
import type { Locale } from "@/lib/i18n";
import { callDeepSeekChat, deepSeekApiKey } from "@/lib/deepseek-client";
import { parseLlmJsonObject } from "@/lib/parse-llm-json";

/** Map website UI language → AI output market (and voice locale). */
export function promptMarketFromLocale(locale: Locale): PromptMarket {
  if (locale === "en") return "en";
  if (locale === "zh-cn") return "cn";
  if (locale === "zh-tw") return "tw";
  return "hk";
}

export function voiceoverLocaleFromUiLocale(locale: Locale): VoiceoverLocale {
  if (locale === "en") return "en";
  // TW UI uses Mandarin voice (cn); no separate TW voice locale yet.
  if (locale === "zh-cn" || locale === "zh-tw") return "cn";
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

/** Short phrase for visualDna / art-direction lines (locale-aware — never force Chinese on EN). */
export function integratedTypographyPhrase(locale: CopyLocale): string {
  if (locale === "en") return "elegant integrated English typography";
  if (locale === "zh-hans") return "elegant integrated Simplified Chinese typography";
  return "elegant integrated Chinese typography";
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
        ? ` Paint these on-image lines verbatim (only convert 简体→繁體 if a line already contains Chinese; do NOT translate English/Latin into Chinese; do NOT replace with the product name): ${lines.join(" · ")}.`
        : locale === "zh-hans"
          ? ` Paint these on-image lines verbatim (only convert 繁體→简体 if a line already contains Chinese — e.g. 精華→精华; do NOT translate English/Latin into Chinese; do NOT replace with the product name): ${lines.join(" · ")}.`
          : ` Render ONLY these exact on-image lines (verbatim — do not translate, do not add extra words): ${lines.join(" · ")}.`
      : "";
  if (locale === "en") {
    return `Use clean premium English ad typography.${verbatim}${antiHallucination}`;
  }
  if (locale === "zh-hans") {
    return `Use clean Simplified Chinese typography only — never paint Traditional characters (繁體).${verbatim}${antiHallucination}`;
  }
  return `Use clean Traditional Chinese typography only — never paint Simplified characters (简体).${verbatim}${antiHallucination}`;
}

export function plannerCopyLanguageRule(locale: CopyLocale): string {
  if (locale === "en") {
    return "All title, body, and takeaway fields MUST be in English only.";
  }
  if (locale === "zh-hans") {
    return [
      "All title, body, takeaway, and theme fields MUST be Simplified Chinese (简体中文) ONLY.",
      "Never use Traditional forms (繁體) — e.g. write 精华/护肤/选择/营养 not 精華/護膚/選擇/營養.",
      "Every slide must use the SAME Simplified script — no mixing 简繁 in one plan.",
    ].join(" ");
  }
  return [
    "All title, body, takeaway, and theme fields MUST be Traditional Chinese (繁體中文) ONLY.",
    "Never use Simplified forms (简体) — e.g. write 精華/護膚/選擇/營養 not 精华/护肤/选择/营养.",
    "Every slide must use the SAME Traditional script — no mixing 简繁 in one plan.",
  ].join(" ");
}

/**
 * Common marketing Traditional → Simplified mappings (safety net when LLM rewrite misses a slide).
 * Not a full OpenCC table — covers high-frequency promo characters that cause mixed 简繁 ads.
 */
const HANT_TO_HANS: Record<string, string> = {
  精華: "精华",
  營養: "营养",
  補充劑: "补充剂",
  護膚: "护肤",
  關鍵: "关键",
  選擇: "选择",
  維生素: "维生素",
  視黃醇: "视黄醇",
  針對: "针对",
  根據: "根据",
  發揮: "发挥",
  對症下藥: "对症下药",
  優惠: "优惠",
  活動: "活动",
  華: "华",
  護: "护",
  膚: "肤",
  擇: "择",
  選: "选",
  營: "营",
  養: "养",
  極: "极",
  關: "关",
  鍵: "键",
  補: "补",
  劑: "剂",
  對: "对",
  據: "据",
  發: "发",
  揮: "挥",
  質: "质",
  專: "专",
  業: "业",
  實: "实",
  際: "际",
  與: "与",
  為: "为",
  這: "这",
  個: "个",
  們: "们",
  來: "来",
  還: "还",
  會: "会",
  過: "过",
  時: "时",
  間: "间",
  開: "开",
  門: "门",
  長: "长",
  無: "无",
  產: "产",
  買: "买",
  賣: "卖",
  價: "价",
  錢: "钱",
  優: "优",
  勢: "势",
  濃: "浓",
  縮: "缩",
  達: "达",
  導: "导",
  術: "术",
  療: "疗",
  醫: "医",
  藥: "药",
  顏: "颜",
  齡: "龄",
  皺: "皱",
  紋: "纹",
  濕: "湿",
  潤: "润",
  潔: "洁",
  淨: "净",
  純: "纯",
  麗: "丽",
  妝: "妆",
  適: "适",
  應: "应",
  該: "该",
  說: "说",
  語: "语",
  訊: "讯",
  網: "网",
  頁: "页",
  點: "点",
  擊: "击",
  購: "购",
  覽: "览",
  視: "视",
  頻: "频",
  圖: "图",
  畫: "画",
  設: "设",
  計: "计",
  標: "标",
  題: "题",
  詳: "详",
  細: "细",
  簡: "简",
  單: "单",
  複: "复",
  雜: "杂",
  準: "准",
  確: "确",
  認: "认",
  識: "识",
  覺: "觉",
  體: "体",
  驗: "验",
  測: "测",
  試: "试",
  樣: "样",
  種: "种",
  類: "类",
  別: "别",
  區: "区",
  塊: "块",
  層: "层",
  級: "级",
  階: "阶",
  節: "节",
  約: "约",
  記: "记",
  憶: "忆",
  庫: "库",
  檔: "档",
  報: "报",
  廣: "广",
  銷: "销",
};

const HANS_TO_HANT: Record<string, string> = {
  精华: "精華",
  营养: "營養",
  补充剂: "補充劑",
  护肤: "護膚",
  关键: "關鍵",
  选择: "選擇",
  维生素: "維生素",
  视黄醇: "視黃醇",
  针对: "針對",
  根据: "根據",
  发挥: "發揮",
  对症下药: "對症下藥",
  优惠: "優惠",
  活动: "活動",
  华: "華",
  护: "護",
  肤: "膚",
  择: "擇",
  选: "選",
  营: "營",
  养: "養",
  极: "極",
  关: "關",
  键: "鍵",
  补: "補",
  剂: "劑",
  对: "對",
  据: "據",
  发: "發",
  挥: "揮",
  质: "質",
  专: "專",
  业: "業",
  实: "實",
  际: "際",
  与: "與",
  为: "為",
  这: "這",
  个: "個",
  们: "們",
  来: "來",
  还: "還",
  会: "會",
  过: "過",
  时: "時",
  间: "間",
  开: "開",
  门: "門",
  长: "長",
  无: "無",
  产: "產",
  买: "買",
  卖: "賣",
  价: "價",
  钱: "錢",
  优: "優",
  势: "勢",
  浓: "濃",
  缩: "縮",
  达: "達",
  导: "導",
  术: "術",
  疗: "療",
  医: "醫",
  药: "藥",
  颜: "顏",
  龄: "齡",
  皱: "皺",
  纹: "紋",
  湿: "濕",
  润: "潤",
  洁: "潔",
  净: "淨",
  纯: "純",
  丽: "麗",
  妆: "妝",
  适: "適",
  应: "應",
  该: "該",
  说: "說",
  语: "語",
  讯: "訊",
  网: "網",
  页: "頁",
  点: "點",
  击: "擊",
  购: "購",
  览: "覽",
  视: "視",
  频: "頻",
  图: "圖",
  画: "畫",
  设: "設",
  计: "計",
  标: "標",
  题: "題",
  详: "詳",
  细: "細",
  简: "簡",
  单: "單",
  复: "複",
  杂: "雜",
  准: "準",
  确: "確",
  认: "認",
  识: "識",
  觉: "覺",
  体: "體",
  验: "驗",
  测: "測",
  试: "試",
  样: "樣",
  种: "種",
  类: "類",
  别: "別",
  区: "區",
  块: "塊",
  层: "層",
  级: "級",
  阶: "階",
  节: "節",
  约: "約",
  记: "記",
  忆: "憶",
  库: "庫",
  档: "檔",
  报: "報",
  广: "廣",
  销: "銷",
};

function applyPhraseMap(text: string, map: Record<string, string>): string {
  let out = text;
  const phrases = Object.keys(map).sort((a, b) => b.length - a.length);
  for (const from of phrases) {
    if (from.length > 1 && out.includes(from)) {
      out = out.split(from).join(map[from]!);
    }
  }
  for (const from of phrases) {
    if (from.length === 1) {
      out = out.split(from).join(map[from]!);
    }
  }
  return out;
}

/** Deterministic script fix for planned copy (LLM rewrite may miss a field). */
export function coerceCopyScript(text: string, locale: CopyLocale): string {
  if (!text.trim() || locale === "en") return text;
  if (locale === "zh-hans") return applyPhraseMap(text, HANT_TO_HANS);
  return applyPhraseMap(text, HANS_TO_HANT);
}

/**
 * User-typed on-image copy. Keep Latin/English verbatim (never translate to Chinese).
 * Only 简繁-convert when the line already contains Chinese.
 */
export function preserveUserOnImageCopy(text: string, locale: CopyLocale): string {
  const t = text.trim();
  if (!t) return t;
  if (locale === "en") return t;
  if (!/[\u4e00-\u9fff]/.test(t)) return t;
  return coerceCopyScript(t, locale);
}

export function coerceFieldsToScript(
  fields: Record<string, string>,
  locale: CopyLocale,
): Record<string, string> {
  if (locale === "en") return fields;
  const next: Record<string, string> = {};
  for (const [k, v] of Object.entries(fields)) {
    next[k] = coerceCopyScript(v, locale);
  }
  return next;
}

/** True when text is likely the wrong script for the UI locale (EN↔中文 leak). */
export function copyNeedsLocaleRewrite(text: string, locale: CopyLocale): boolean {
  const t = text.trim();
  if (!t) return false;
  if (locale === "en") return /[\u4e00-\u9fff]/.test(t);
  return textLooksLatin(t);
}

/**
 * Ask the model to rewrite planned copy into a single script matching UI locale.
 * Used after teaching/single/research planners so fal does not paint mixed languages.
 */
export async function rewriteCopyToScript(
  fields: Record<string, string>,
  locale: CopyLocale,
): Promise<Record<string, string>> {
  const entries = Object.entries(fields).filter(([, v]) => v.trim());
  if (!entries.length) return fields;

  if (locale === "en") {
    const needs = entries.some(([, v]) => copyNeedsLocaleRewrite(v, "en"));
    if (!needs) return fields;
    if (!deepSeekApiKey()) return fields;
    try {
      const output = await callDeepSeekChat(
        [
          {
            role: "system",
            content:
              "Rewrite JSON string values into English only. Keep keys identical. Output strict JSON only. Keep brand names. Do not leave Chinese characters.",
          },
          {
            role: "user",
            content: JSON.stringify(Object.fromEntries(entries)),
          },
        ],
        { temperature: 0.1, max_tokens: 900, jsonObject: true },
      );
      const parsed = parseLlmJsonObject<Record<string, string>>(output, "Script rewrite");
      const next: Record<string, string> = { ...fields };
      for (const [k, v] of Object.entries(parsed)) {
        if (typeof v === "string" && v.trim() && k in next) next[k] = v.trim();
      }
      return next;
    } catch {
      return fields;
    }
  }

  let next = coerceFieldsToScript(fields, locale);
  if (!deepSeekApiKey()) return next;
  const target =
    locale === "zh-hans" ? "Simplified Chinese (简体中文)" : "Traditional Chinese (繁體中文)";
  try {
    const output = await callDeepSeekChat(
      [
        {
          role: "system",
          content: `Rewrite JSON string values into ${target} only. Keep keys identical. Output strict JSON only. Do not translate English brand names. Do not mix 简繁 or leave English marketing sentences.`,
        },
        {
          role: "user",
          content: JSON.stringify(Object.fromEntries(entries)),
        },
      ],
      { temperature: 0.1, max_tokens: 900, jsonObject: true },
    );
    const parsed = parseLlmJsonObject<Record<string, string>>(output, "Script rewrite");
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof v === "string" && v.trim() && k in next) next[k] = v.trim();
    }
    return coerceFieldsToScript(next, locale);
  } catch {
    return next;
  }
}
