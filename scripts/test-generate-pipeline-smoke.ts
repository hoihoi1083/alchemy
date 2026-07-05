/**
 * FAL generation smoke — one text image per promotion mode (cheap).
 * Run: npx tsx scripts/test-generate-pipeline-smoke.ts
 */
import { readFileSync, existsSync } from "fs";
import { fal } from "@fal-ai/client";
import { defaultTextEndpoint } from "../lib/image-endpoints";
import {
  buildPromptVariables,
  buildWizardImagePrompt,
  resolveImagePromptMode,
} from "../lib/prompt-variables";
import { TOPIC_SCENARIOS } from "../tests/fixtures/topic-matrix";

function loadEnvLocal() {
  if (!existsSync(".env.local")) return;
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim();
  }
}

function extractUrl(data: unknown): string | undefined {
  if (!data || typeof data !== "object") return undefined;
  const d = data as { images?: Array<{ url?: string }>; image?: { url?: string } };
  return d.images?.[0]?.url ?? d.image?.url;
}

async function generateOne(label: string, prompt: string): Promise<string> {
  const endpoint = defaultTextEndpoint();
  const result = await fal.subscribe(endpoint, {
    input: {
      prompt,
      aspect_ratio: "4:5",
      num_images: 1,
    },
    logs: false,
  });
  const url = extractUrl(result.data);
  if (!url) throw new Error(`${label}: no image URL in response`);
  return url;
}

async function main() {
  loadEnvLocal();
  const key = process.env.FAL_KEY?.trim();
  if (!key) throw new Error("FAL_KEY required for generate smoke");
  fal.config({ credentials: key });

  const physical = TOPIC_SCENARIOS.find((s) => s.id === "crystal-bracelet-hk")!;
  const concept = TOPIC_SCENARIOS.find((s) => s.id === "yoga-concept-hk")!;

  console.log("=== Generate smoke (2 text images) ===\n");

  const physicalVars = buildPromptVariables({
    product: physical.product,
    headline: `${physical.product}｜必看攻略`,
    subline: `推廣${physical.product}`,
    market: physical.market,
    framing: "auto",
    extra: `Style reference. All copy about ${physical.product}. Do NOT copy reference zodiac topic.`,
  });
  const physicalMode = resolveImagePromptMode("product", "promo-ai", {
    promotionMode: "physical",
    workflowMode: "image-only",
  });
  const physicalPrompt = buildWizardImagePrompt(physicalVars, physicalMode);
  const physicalUrl = await generateOne("physical", physicalPrompt);
  console.log("✓ physical:", physicalUrl.slice(0, 80), "…");

  const conceptVars = buildPromptVariables({
    product: concept.product,
    headline: concept.product,
    subline: "晨间瑜伽 · 小班教学",
    market: concept.market,
    framing: "auto",
    extra: "Editorial social poster, soft natural light.",
  });
  const conceptMode = resolveImagePromptMode("service-promo", "promo-ai", {
    promotionMode: "concept",
    workflowMode: "image-only",
  });
  const conceptPrompt = buildWizardImagePrompt(conceptVars, conceptMode);
  const conceptUrl = await generateOne("concept", conceptPrompt);
  console.log("✓ concept:", conceptUrl.slice(0, 80), "…");

  console.log("\n=== GENERATE SMOKE PASS ===");
}

main().catch((e) => {
  console.error("FAIL:", e instanceof Error ? e.message : e);
  process.exit(1);
});
