import { callDeepSeekChat, deepSeekApiKey } from "@/lib/deepseek-client";
import { nameIsClaimImage1IsObjectLine } from "@/lib/prompt-balance-contract";
import type { UserReferenceBrief } from "@/lib/user-reference-brief";

/** Bump when hero-lock wording changes so stale session essays re-optimize. */
const SCENE_OPTIMIZE_CONTRACT = "v2-pixels-win";

/** Skip headline when it is just the product name (avoids baking SKU as masthead). */
export function campaignHeadlineForSceneEssay(input: {
  product?: string;
  headline?: string;
}): string {
  const product = input.product?.trim() || "";
  const headline = input.headline?.trim() || "";
  if (!headline) return "";
  if (!product) return headline;
  const compact = (s: string) =>
    s.toLowerCase().replace(/[\s|｜·•\-–—_/\\,，.。]+/g, "");
  if (compact(headline) === compact(product)) return "";
  return headline;
}

export function sceneOptimizeFingerprint(input: {
  product?: string;
  headline?: string;
  subline?: string;
  offer?: string;
}): string {
  return [
    SCENE_OPTIMIZE_CONTRACT,
    input.product,
    input.headline,
    input.subline,
    input.offer,
  ]
    .map((s) => String(s ?? "").trim())
    .join("|");
}

export function fallbackOptimizedSceneEssay(input: {
  sceneEssay?: string;
  layoutStyle?: string;
  colorPalette?: string;
  mood?: string;
  product: string;
  headline?: string;
  subline?: string;
  offer?: string;
}): string {
  const spine =
    input.sceneEssay?.trim() ||
    [input.layoutStyle, input.colorPalette, input.mood]
      .map((s) => s?.trim())
      .filter(Boolean)
      .join(". ");
  if (!spine) return "";
  const headline = campaignHeadlineForSceneEssay(input);
  const swap = [
    "Hero is IMAGE 1's photographed object (pixels win — never a stock stand-in, never a name-inferred gadget).",
    nameIsClaimImage1IsObjectLine(input.product),
    headline
      ? `On-image headline only (exact): ${headline}.`
      : "Do not paint the product name as a masthead.",
    input.subline?.trim() ? `Subline (exact): ${input.subline.trim()}.` : "",
    input.offer?.trim()
      ? `Offer/button (exact — never the letters C-T-A): ${input.offer.trim()}.`
      : "",
    "Keep reference set, lighting scheme, composition, and type hierarchy. Props must suit IMAGE 1's actual item, not the reference SKU. No reference logos, seals, watermarks, @handles, or original selling lines.",
  ]
    .filter(Boolean)
    .join(" ");
  return `${spine}\n\nSWAP: ${swap}`;
}

export function buildOptimizeSceneEssayUserMessage(input: {
  sceneEssay: string;
  product: string;
  headline?: string;
  subline?: string;
  offer?: string;
}): string {
  const headline = campaignHeadlineForSceneEssay(input);
  return [
    "Rewrite this reference-image screenplay for a NEW still.",
    "KEEP: composition, camera height, lighting scheme (e.g. dark back / bright hero), atmosphere, material richness, type hierarchy positions.",
    "KEEP hero = IMAGE 1 photographed object. Pixels win for shape, materials, and category.",
    nameIsClaimImage1IsObjectLine(input.product),
    "Surrounding props must suit IMAGE 1's actual item, not the reference SKU and not a name-inferred gadget.",
    headline
      ? `On-image copy — headline only: ${headline}.`
      : "Do not invent a masthead from the product name.",
    input.subline?.trim() ? `Subline: ${input.subline.trim()}.` : "",
    input.offer?.trim() ? `Offer/button: ${input.offer.trim()}.` : "",
    "Never copy reference brand names, logos, seals, watermarks, @handles, or original selling lines.",
    "80–180 words. One paragraph + optional SWAP line. No markdown.",
    "",
    "Reference screenplay:",
    input.sceneEssay,
  ]
    .filter(Boolean)
    .join("\n");
}

export async function optimizeReferenceSceneEssay(input: {
  sceneEssay?: string;
  layoutStyle?: string;
  colorPalette?: string;
  mood?: string;
  product: string;
  headline?: string;
  subline?: string;
  offer?: string;
}): Promise<string> {
  const product = input.product.trim();
  const source =
    input.sceneEssay?.trim() ||
    fallbackOptimizedSceneEssay({ ...input, product });
  if (!product || !source) return "";
  const fallback = fallbackOptimizedSceneEssay({ ...input, product, sceneEssay: source });
  if (!deepSeekApiKey()) return fallback;
  try {
    const text = await callDeepSeekChat(
      [
        {
          role: "system",
          content:
            "You optimize marketing still prompts for layout-transfer. Keep the reference atmosphere spine. Swap only the hero, props, and campaign copy. No markdown. No thinking notes.",
        },
        {
          role: "user",
          content: buildOptimizeSceneEssayUserMessage({
            sceneEssay: source,
            product,
            headline: input.headline,
            subline: input.subline,
            offer: input.offer,
          }),
        },
      ],
      { temperature: 0.35, max_tokens: 700 },
    );
    const cleaned = text.replace(/```[\s\S]*?```/g, "").trim();
    return cleaned || fallback;
  } catch {
    return fallback;
  }
}

export async function ensureOptimizedSceneEssay(
  brief: UserReferenceBrief,
  campaign: {
    product?: string;
    headline?: string;
    subline?: string;
    offer?: string;
  },
): Promise<UserReferenceBrief> {
  const product =
    campaign.product?.trim() ||
    brief.userConceptIdea?.trim() ||
    brief.topic?.trim() ||
    "";
  if (!product) return brief;
  const fingerprint = sceneOptimizeFingerprint({
    product,
    headline: campaign.headline,
    subline: campaign.subline,
    offer: campaign.offer,
  });
  if (brief.optimizedScenePrompt?.trim() && brief.optimizeFingerprint === fingerprint) {
    return brief;
  }
  const sceneEssay =
    brief.sceneEssay?.trim() ||
    [brief.layoutStyle, brief.colorPalette, brief.mood, brief.contentSummary]
      .filter(Boolean)
      .join(". ");
  if (!sceneEssay && !brief.optimizedScenePrompt?.trim()) return brief;
  const optimized = await optimizeReferenceSceneEssay({
    sceneEssay: brief.sceneEssay || sceneEssay,
    layoutStyle: brief.layoutStyle,
    colorPalette: brief.colorPalette,
    mood: brief.mood,
    product,
    headline: campaign.headline,
    subline: campaign.subline,
    offer: campaign.offer,
  });
  if (!optimized.trim()) return brief;
  return {
    ...brief,
    sceneEssay: brief.sceneEssay || sceneEssay,
    optimizedScenePrompt: optimized.trim(),
    optimizeFingerprint: fingerprint,
  };
}
