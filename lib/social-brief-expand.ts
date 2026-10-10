import { callDeepSeekChat } from "@/lib/deepseek-client";
import { parseLlmJsonObject } from "@/lib/parse-llm-json";

/**
 * Expand a short product/concept note into a richer social brief
 * the user can edit before planning the pack.
 */
export async function expandSocialBrief(input: {
  seed: string;
  platform?: string;
  market?: string;
}): Promise<string> {
  const seed = input.seed.trim();
  const market = (input.market ?? "hk").trim() || "hk";
  const platform = (input.platform ?? "instagram").trim() || "instagram";

  const system = [
    "You help marketers turn a short product or concept note into a clear social-post brief.",
    "Return ONLY JSON: { brief: string }.",
    "brief = 3–5 short plain sentences (or short lines). Cover: what it is, who it's for, main angle, optional offer, tone.",
    "Write naturally — do NOT use labeled fields like Product:/Target:/Focus:/Tone:.",
    "Stay faithful to the seed — do not invent a different product. If the seed is vague, keep it general and note what to confirm.",
    "Do not write hashtags or image prompts yet.",
    "If the seed is already detailed, tighten it; do not pad with fluff.",
    platform === "xiaohongshu" && /^(hk|tw|cn|zh)/i.test(market)
      ? "Write the brief in Chinese (Traditional for hk/tw, Simplified for cn)."
      : "Write the brief in clear English unless the seed is clearly another language — then match that language.",
  ]
    .filter(Boolean)
    .join("\n");

  const user = [
    `Market: ${market}`,
    `Target platform: ${platform}`,
    `Seed (product or concept): ${seed}`,
  ].join("\n");

  const raw = await callDeepSeekChat(
    [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    { temperature: 0.55, max_tokens: 500, jsonObject: true },
  );

  const parsed = parseLlmJsonObject<{ brief?: unknown }>(raw, "Social brief expand");
  const brief = String(parsed.brief ?? "").trim();
  if (!brief) {
    throw new Error("Could not expand that into a brief. Try a bit more detail.");
  }
  return brief.slice(0, 4000);
}
