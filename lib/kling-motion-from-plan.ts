/**
 * Extract per-scene English camera motion from DeepSeek storyboard motion plans
 * (field historically named seedancePrompt). Used so Kling I2V follows the plan
 * without dumping marketing / Chinese copy that burns gibberish onto frames.
 */

const SCENE_BLOCK_RE =
  /Scene\s+(\d+)\s*(?:\[[^\]]*\]\s*)?:?\s*([^\n]+)/gi;

/** Strip role labels and keep camera/action English only. */
export function sanitizeKlingMotionHint(raw: string | undefined | null): string | undefined {
  if (!raw?.trim()) return undefined;
  let text = raw.trim();
  // Drop leading "role —" / "role:" prefixes common in DeepSeek plans.
  text = text.replace(/^[^—\-:]+(?:—|-|:)\s*/u, "").trim() || text;
  // Reject obvious Chinese-heavy marketing (Kling invents glyphs).
  const cjk = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  if (cjk > 8) return undefined;
  // Reject caption / price / CTA marketing blobs.
  if (
    /\$|¥|HKD|折扣|優惠|限時|on-?screen text|caption|subtitle|punchline copy/i.test(
      text,
    )
  ) {
    text = text
      .replace(/\$[\d.,]+/g, "")
      .replace(/¥[\d.,]+/g, "")
      .replace(/\b(caption|subtitle|on-?screen text|punchline copy)\b/gi, "")
      .trim();
  }
  if (text.length < 8) return undefined;
  if (text.length > 280) text = text.slice(0, 280).trim();
  return text;
}

/**
 * Parse "Scene N [a-bs]: …" lines from a motion plan.
 * Returns 1-based scene index → motion hint.
 */
export function parseSceneMotionHintsFromPlan(
  motionPlan: string | undefined | null,
): Map<number, string> {
  const out = new Map<number, string>();
  const plan = motionPlan?.trim();
  if (!plan) return out;

  SCENE_BLOCK_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = SCENE_BLOCK_RE.exec(plan)) !== null) {
    const index = Number(match[1]);
    if (!Number.isFinite(index) || index < 1) continue;
    const hint = sanitizeKlingMotionHint(match[2]);
    if (hint) out.set(index, hint);
  }
  return out;
}

/** Prefer explicit per-scene cameraMotionEn, then plan block, else undefined. */
export function resolveSceneMotionHint(opts: {
  sceneIndex1Based: number;
  cameraMotionEn?: string | null;
  motionPlan?: string | null;
}): string | undefined {
  const fromField = sanitizeKlingMotionHint(opts.cameraMotionEn);
  if (fromField) return fromField;
  return parseSceneMotionHintsFromPlan(opts.motionPlan).get(opts.sceneIndex1Based);
}

/**
 * Turn a Seedance/DeepSeek R2V script into a short English Kling motion hint.
 * Keeps timed visual beats; strips @tags, Chinese, and marketing/guardrail prose
 * so Kling I2V does not invent on-screen glyphs.
 */
export function extractKlingMotionFromSeedancePrompt(
  prompt: string | undefined | null,
): string | undefined {
  const beats = parseKlingBeatsFromSeedancePrompt(prompt);
  if (beats.length > 0) {
    return sanitizeKlingMotionHint(
      beats.map((b) => b.cameraMotionEn).join("; "),
    );
  }
  if (!prompt?.trim()) return undefined;
  let text = scrubSeedancePromptForKling(prompt);
  text = text
    .split(/(?<=\.)\s+/)
    .filter((s) => s.length > 20)
    .slice(0, 2)
    .join(" ");
  text = text
    .replace(/\bPacing:\s*/gi, "")
    .replace(/\bprovides?\s+quick\s+energetic\s+editing[^.]*\.?/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length > 280) text = text.slice(0, 280).trim();
  return sanitizeKlingMotionHint(text);
}

export type KlingBeatFromScript = {
  startSec: number;
  endSec: number;
  cameraMotionEn: string;
  role: string;
};

function scrubSeedancePromptForKling(prompt: string): string {
  return prompt
    .trim()
    .replace(/@\s*(Image|Video|Audio)\s*\d+\b/gi, " ")
    .replace(/\b(Image|Video|Audio)\s+\d+\b/gi, " ")
    .replace(/\nAdditional constraints:[\s\S]*$/i, " ")
    .replace(/\bSilent video output:[\s\S]*$/i, " ")
    .replace(/\bAvoid:[\s\S]*$/i, " ")
    .replace(
      /\b(?:Copy|Do NOT recreate|is the user's product)[\s\S]*?(?=(?:\d+(?:\.\d+)?\s*[-–~])|$)/gi,
      " ",
    )
    .replace(/[\u4e00-\u9fff]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Parse timed DeepSeek beats (e.g. `0-2s: …`) into Kling scene metas. */
export function parseKlingBeatsFromSeedancePrompt(
  prompt: string | undefined | null,
): KlingBeatFromScript[] {
  if (!prompt?.trim()) return [];
  const text = scrubSeedancePromptForKling(prompt);
  const roles = ["hook", "product demo", "cta end", "payoff"] as const;
  const out: KlingBeatFromScript[] = [];

  for (const match of text.matchAll(
    /(\d+(?:\.\d+)?)\s*[-–~to]+\s*(\d+(?:\.\d+)?)s?\s*:\s*([^.;]{12,240})/gi,
  )) {
    const startSec = Number(match[1]);
    const endSec = Number(match[2]);
    if (!Number.isFinite(startSec) || !Number.isFinite(endSec) || endSec <= startSec) {
      continue;
    }
    const motion = sanitizeKlingMotionHint(match[3]);
    if (!motion) continue;
    out.push({
      startSec,
      endSec,
      cameraMotionEn: motion,
      role: roles[Math.min(out.length, roles.length - 1)]!,
    });
    if (out.length >= 4) break;
  }
  return out;
}

/**
 * How many Kling I2V clips to stitch for a Seedance fallback.
 * Kling clips are 5s or 10s only — prefer fewer clips so runtime stays near target.
 */
export function klingFallbackSceneCountForDuration(totalDurationSec: number): number {
  const sec = Math.max(4, Math.min(15, Math.round(totalDurationSec) || 8));
  if (sec <= 6) return 1;
  if (sec <= 11) return 2;
  return 3;
}

/**
 * When Seedance/H3 fail and we only have one product still, expand into
 * DeepSeek-beat Kling clips (same still, different motion) then stitch —
 * same idea as storyboard, without regenerating Nano Banana frames.
 */
export function planKlingFallbackScenesFromSeedancePrompt(opts: {
  prompt: string | undefined | null;
  totalDurationSec: number;
  /** Existing client storyboard meta wins when already multi-scene. */
  existingSceneCount: number;
}): KlingBeatFromScript[] {
  if (opts.existingSceneCount > 1) return [];
  const beats = parseKlingBeatsFromSeedancePrompt(opts.prompt);
  if (beats.length === 0) return [];

  const target = klingFallbackSceneCountForDuration(opts.totalDurationSec);
  if (target <= 1) {
    // One clip — still return a single merged beat so motion isn't generic orbit.
    const merged = sanitizeKlingMotionHint(
      beats.map((b) => b.cameraMotionEn).join("; "),
    );
    if (!merged) return [];
    return [
      {
        startSec: 0,
        endSec: opts.totalDurationSec,
        cameraMotionEn: merged,
        role: "product hero",
      },
    ];
  }

  if (beats.length <= target) return beats.slice(0, target);

  // Merge extras into the last kept beat.
  const kept = beats.slice(0, target - 1);
  const rest = beats.slice(target - 1);
  const mergedMotion = sanitizeKlingMotionHint(
    rest.map((b) => b.cameraMotionEn).join("; "),
  );
  kept.push({
    startSec: rest[0]!.startSec,
    endSec: rest[rest.length - 1]!.endSec,
    cameraMotionEn: mergedMotion || rest[0]!.cameraMotionEn,
    role: rest[rest.length - 1]!.role,
  });
  return kept;
}
