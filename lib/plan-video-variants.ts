import { callDeepSeekChat } from "@/lib/deepseek-client";
import { jsonrepair } from "jsonrepair";

export type VideoScriptVariant = {
  id: string;
  hook: string;
  script: string;
  motionNote: string;
};

export async function planVideoScriptVariants(input: {
  product: string;
  headline?: string;
  subline?: string;
  business?: string;
  offer?: string;
  videoPrompt?: string;
  count?: number;
}): Promise<VideoScriptVariant[]> {
  const count = Math.min(6, Math.max(2, input.count ?? 3));
  const system = [
    "You write short social video ad script variants for paid social (IG Reels, TikTok, XHS).",
    "Return ONLY valid JSON: { \"variants\": [ { \"hook\": string, \"script\": string, \"motionNote\": string } ] }.",
    `Generate exactly ${count} distinct hooks — same product, different angles.`,
    "script: 2-4 sentences for voiceover or on-screen captions.",
    "motionNote: one line for AI video motion (product demo, hands-only, stable camera).",
    "Use Traditional Chinese if product/context is HK/TW; Simplified for mainland; English for international.",
  ].join(" ");

  const user = [
    input.product ? `Product: ${input.product}` : "",
    input.business ? `Brand: ${input.business}` : "",
    input.headline ? `Headline: ${input.headline}` : "",
    input.subline ? `Selling points: ${input.subline}` : "",
    input.offer ? `Offer: ${input.offer}` : "",
    input.videoPrompt ? `Video direction: ${input.videoPrompt}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const raw = await callDeepSeekChat(
    [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    { temperature: 0.85 },
  );
  const repaired = jsonrepair(raw);
  const parsed = JSON.parse(repaired) as { variants?: VideoScriptVariant[] };
  const list = (parsed.variants ?? []).filter(
    (v) => v?.hook?.trim() && v?.script?.trim(),
  );
  return list.slice(0, count).map((v, i) => ({
    id: `variant-${i + 1}`,
    hook: v.hook.trim(),
    script: v.script.trim(),
    motionNote: (v.motionNote ?? "Stable camera, gentle product motion.").trim(),
  }));
}
