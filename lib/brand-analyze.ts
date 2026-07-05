import type { BrandProfile } from "@/lib/brand-profile";
import { callDeepSeekChat } from "@/lib/deepseek-client";

const MAX_TEXT_CHARS = 14_000;
const FETCH_TIMEOUT_MS = 12_000;

function normalizeUrl(raw: string): string {
  const t = raw.trim();
  if (!t) throw new Error("URL is required.");
  if (/^https?:\/\//i.test(t)) return t;
  return `https://${t}`;
}

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

export async function fetchWebsiteText(url: string): Promise<{ url: string; text: string }> {
  const normalized = normalizeUrl(url);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(normalized, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; AIMarketingStudio/1.0; +https://github.com/hoihoi1083/Alchemy.ai-)",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    });
    if (!res.ok) {
      throw new Error(
        `Could not fetch website (HTTP ${res.status}). Try another URL or paste social handle only.`,
      );
    }
    const html = await res.text();
    const text = htmlToText(html).slice(0, MAX_TEXT_CHARS);
    if (text.length < 80) {
      throw new Error("Website returned too little text. Try your shop homepage or About page URL.");
    }
    return { url: normalized, text };
  } finally {
    clearTimeout(timer);
  }
}

function extractJsonObject(raw: string): BrandProfile {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("Brand analysis returned invalid JSON.");
  const parsed = JSON.parse(raw.slice(start, end + 1)) as Partial<BrandProfile>;
  return {
    businessName: String(parsed.businessName ?? "").trim(),
    productCategory: String(parsed.productCategory ?? "").trim(),
    visualMood: String(parsed.visualMood ?? "").trim(),
    colorPalette: String(parsed.colorPalette ?? "").trim(),
    copyTone: String(parsed.copyTone ?? "").trim(),
    layoutStyle: String(parsed.layoutStyle ?? "").trim(),
    suggestedHeadline: String(parsed.suggestedHeadline ?? "").trim(),
    suggestedBullets: Array.isArray(parsed.suggestedBullets)
      ? parsed.suggestedBullets.map((b) => String(b).trim()).filter(Boolean).slice(0, 5)
      : [],
    adPromptExtra: String(parsed.adPromptExtra ?? "").trim(),
    summary: String(parsed.summary ?? "").trim(),
  };
}

function buildAnalysisPrompt(siteText: string, socialHint: string): string {
  return [
    "You analyze a small business brand for social ad creation. Return JSON only — no markdown fences.",
    "Infer visual style, copy tone, and layout preferences from the sources below.",
    "Output must fit ANY product category (beauty, jewelry, food, fashion, services, etc.) — not only crystals.",
    "",
    "Required JSON shape:",
    '{"businessName":"","productCategory":"","visualMood":"","colorPalette":"","copyTone":"","layoutStyle":"","suggestedHeadline":"","suggestedBullets":["",""],"adPromptExtra":"","summary":""}',
    "",
    "- businessName: shop/brand name",
    "- productCategory: what they sell (short)",
    "- visualMood: e.g. warm boutique, dark luxury, clean white info poster, lifestyle casual",
    "- colorPalette: dominant colors for ads",
    "- copyTone: e.g. 繁體親切、專業高端、English minimal",
    "- layoutStyle: how their posts likely look (product hero, info poster, lifestyle, offer promo)",
    "- suggestedHeadline: ONE hook line for a new ad (match their tone, Traditional Chinese if HK/TW brand)",
    "- suggestedBullets: 2-4 short selling points",
    "- adPromptExtra: one paragraph of art-direction for image AI (lighting, background, typography style)",
    "- summary: 1-2 sentences for the user confirming what you detected (Traditional Chinese if HK/TW brand)",
    "",
    socialHint ? `Social profile hint (user provided, may be @handle or IG/FB URL): ${socialHint}` : "",
    siteText ? `Website text excerpt:\n${siteText}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export async function analyzeBrandFromSources(input: {
  websiteUrl?: string;
  socialHint?: string;
}): Promise<{ profile: BrandProfile; sourceNote: string }> {
  const websiteUrl = input.websiteUrl?.trim();
  const socialHint = input.socialHint?.trim() || "";
  if (!websiteUrl && !socialHint) {
    throw new Error("Enter a website URL or social profile hint.");
  }

  let siteText = "";
  let sourceNote = "";
  if (websiteUrl) {
    const fetched = await fetchWebsiteText(websiteUrl);
    siteText = fetched.text;
    sourceNote = `Analyzed website: ${fetched.url} (DeepSeek)`;
  } else {
    sourceNote = "Analyzed from social profile hint only (DeepSeek).";
  }

  const outputText = await callDeepSeekChat([
    {
      role: "system",
      content:
        "You are a brand strategist for Hong Kong / Taiwan small-business social ads. Respond with valid JSON only.",
    },
    { role: "user", content: buildAnalysisPrompt(siteText, socialHint) },
  ]);

  const profile = extractJsonObject(outputText);
  if (!profile.businessName && !profile.productCategory) {
    throw new Error("Could not detect brand details. Try a different URL or add a social @handle.");
  }
  return { profile, sourceNote };
}
