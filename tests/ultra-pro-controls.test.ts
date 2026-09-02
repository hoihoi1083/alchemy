import { describe, expect, it } from "vitest";
import {
  appendUltraProToPrompt,
  DEFAULT_ULTRA_IMAGE_PRO,
  estimateCanvasImageTokens,
  estimateCanvasVideoTokens,
} from "@/lib/ultra-pro-controls";

describe("ultra-pro-controls", () => {
  it("appends lighting, background, and art style to prompt", () => {
    const out = appendUltraProToPrompt("Hero product shot", {
      ...DEFAULT_ULTRA_IMAGE_PRO,
      lightingPreset: "neon_cyber",
      backgroundPreset: "gradient_dark",
      artStyleId: "cinematic",
    });
    expect(out).toContain("Hero product shot");
    expect(out).toContain("Lighting:");
    expect(out).toContain("Background:");
    expect(out.toLowerCase()).toContain("cinematic");
  });

  it("uses custom lighting and background text", () => {
    const out = appendUltraProToPrompt("Test", {
      ...DEFAULT_ULTRA_IMAGE_PRO,
      lightingPreset: "custom",
      lightingCustom: "Moody red gel key light",
      backgroundPreset: "custom",
      backgroundCustom: "Rain-soaked alley",
    });
    expect(out).toContain("Moody red gel key light");
    expect(out).toContain("Rain-soaked alley");
  });

  it("estimates single image token cost", () => {
    expect(estimateCanvasImageTokens()).toBe(65);
  });

  it("estimates video tokens from duration and resolution", () => {
    expect(
      estimateCanvasVideoTokens({ resolution: "480p", duration: "8", fast: true }),
    ).toBeGreaterThan(0);
  });
});
