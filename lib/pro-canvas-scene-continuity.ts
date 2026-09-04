/**
 * Creative B / Ultra scene continuity — cast, world lock, prior keyframes, beat assets.
 * Keeps spawned image→video rows on a continuing shot list instead of independent random stills.
 */

import type { Edge, Node } from "@xyflow/react";
import type { ProCanvasNodeData, ScriptNodeData } from "@/lib/pro-canvas-types";
import type { ScriptSceneBeat } from "@/lib/pro-canvas-script-plan";
import { nodeAlias } from "@/lib/pro-canvas-graph";

export type SceneAssetNeeds = {
  brand: boolean;
  product: boolean;
  ui: boolean;
};

export type SceneContinuityPlan = {
  cast: Node[];
  assets: SceneAssetNeeds;
  /** Prefill for image node — includes @mentions + continuity clauses. */
  imagePrompt: string;
  sceneAlias: string;
};

const MULTI_PERSON_RE =
  /\b(two[- ]shot|2[- ]shot|both|together|colleague|coworker|enters?(?:\s+frame)?|walks?\s+in|shows?\s+(?:the\s+)?(?:phone|app|ui|screen)|demo|handshake|side[- ]by[- ]side|pair|duo)\b|双人|两人|同事|走进|入画|展示/i;

const PERSON_B_RE =
  /\b(PersonB|colleague|coworker|introduces?|confident)\b|同事|介绍/i;

const PERSON_A_RE =
  /\b(PersonA|designer|exhausted|tired|frustrated|slumped|typing|prompt)\b|设计师|疲惫|沮丧|敲提示|写提示/i;

const BRAND_RE =
  /\b(logo|brand|CTA|Alchemy|wordmark)\b|品牌|标志|尾标/i;

const UI_RE =
  /\b(shows?\s+(?:the\s+)?(?:UI|app|phone|screen)|app\s+demo|phone\s+screen|@UI|interface|dashboard)\b|展示.*(?:界面|手机|App)|演示/i;

const PRODUCT_RE =
  /\b(product\s+hero|hold\s+product|packaging|@Product|shows?\s+[^.\n]{0,48}\bproduct\b)\b|产品主图|手持产品|包装|@产品/i;

function beatText(beat: ScriptSceneBeat | undefined): string {
  if (!beat) return "";
  return [
    beat.time,
    beat.emotion,
    beat.framing,
    beat.camera,
    beat.blocking,
    beat.speaker,
    beat.line,
  ]
    .filter(Boolean)
    .join(" ");
}

export function sceneAliasForIndex(sceneIndex: number): string {
  return `Scene${sceneIndex + 1}`;
}

/**
 * Asset roles for a short ad arc:
 * - Second-to-last beat = product + UI demo (use uploaded refs)
 * - Last beat = brand/CTA end card (logo) — do NOT invent a SKU bottle
 */
export function inferSceneAssetNeeds(
  sceneIndex: number,
  sceneCount: number,
  scenePrompt: string,
  beat?: ScriptSceneBeat,
): SceneAssetNeeds {
  const blob = `${scenePrompt}\n${beatText(beat)}`;
  const last = sceneIndex >= sceneCount - 1;
  const demo = sceneCount >= 2 && sceneIndex === sceneCount - 2;
  return {
    brand: BRAND_RE.test(blob) || last || demo,
    ui: UI_RE.test(blob) || demo,
    product: PRODUCT_RE.test(blob) || demo,
  };
}

/**
 * Cast from @mentions, beat/prompt cues, then story-arc defaults (not naive % rotate).
 */
export function inferSceneCast(
  sceneIndex: number,
  sceneCount: number,
  scenePrompt: string,
  characters: Node[],
  beat?: ScriptSceneBeat,
): Node[] {
  if (!characters.length) return [];
  if (characters.length === 1) return characters;

  const blob = `${scenePrompt}\n${beatText(beat)}`;
  const byAlias = new Map(
    characters.map((c) => [nodeAlias(c).toLowerCase(), c] as const),
  );
  const personA =
    byAlias.get("persona") ??
    characters.find((c) => /a$/i.test(nodeAlias(c))) ??
    characters[0]!;
  const personB =
    byAlias.get("personb") ??
    characters.find((c) => c.id !== personA.id) ??
    characters[1]!;

  // Explicit @mentions in planner output win.
  const mentioned: Node[] = [];
  for (const c of characters) {
    const alias = nodeAlias(c);
    const re = new RegExp(`@${alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?=\\s|$|[^\\w])`, "i");
    if (re.test(scenePrompt)) mentioned.push(c);
  }
  if (mentioned.length) return mentioned;

  const multi = MULTI_PERSON_RE.test(blob);
  const wantsB = PERSON_B_RE.test(blob);
  const wantsA = PERSON_A_RE.test(blob);
  const dualStart = Math.floor(sceneCount / 2);

  if (multi || (wantsA && wantsB)) return [personA, personB];
  if (wantsB && !wantsA) {
    // Colleague-led beat still keeps A in frame for continuity once dual arc starts.
    return sceneIndex >= dualStart ? [personA, personB] : [personB];
  }
  if (wantsA && !wantsB) return [personA];

  // Story arc default: pain = A; midpoint+ = A+B together.
  if (sceneIndex < dualStart) return [personA];
  return [personA, personB];
}

export function buildSingleStillClause(sceneIndex: number, sceneCount: number): string {
  const n = sceneIndex + 1;
  return (
    `[单帧] ONE photographic still only for scene ${n} of ${sceneCount}. ` +
    `FORBIDDEN: comic strip, manga panel, storyboard grid, 2x3 / 3x3 collage, split-screen, multi-panel contact sheet, ` +
    `or any image that summarizes other scenes. Do NOT draw the full ad arc — only this beat. ` +
    `No speech bubbles, no thought bubbles, no on-image captions or readable UI chrome text unless @UI/@brand is required.`
  );
}

export function buildWorldLockClause(worldDescription?: string): string {
  const bible = worldDescription?.trim();
  const setLock = bible
    ? `World bible (lock this set): ${bible}`
    : `Keep the SAME office location, wardrobe, hair, and lighting language across scenes.`;
  return (
    `[连续镜头] Same continuous short film continuity. ${setLock} ` +
    `Do NOT recast faces or invent a new set. Continuity ≠ multi-panel — still ONE frame.`
  );
}

export function buildBrandScreenClause(assets: SceneAssetNeeds): string | null {
  if (!assets.brand && !assets.ui) return null;
  const parts: string[] = [];
  if (assets.ui) {
    parts.push(
      `When a phone/app/screen is visible, show the connected @UI (or product UI) clearly — do not invent a random skincare shop UI.`,
    );
  }
  if (assets.brand) {
    parts.push(
      `Use the exact @brand logo artwork on screen / end card — sharp and readable. Do NOT replace it with plain "Alchemy AI Lab" text or a fake icon.`,
    );
  }
  return parts.join(" ");
}

export function buildSceneContinuityPrompt(opts: {
  sceneIndex: number;
  sceneCount: number;
  scenePrompt: string;
  cast: Node[];
  assets: SceneAssetNeeds;
  priorSceneAlias?: string;
  beat?: ScriptSceneBeat;
  worldDescription?: string;
}): string {
  const lines: string[] = [];
  const castMentions = opts.cast.map((c) => `@${nodeAlias(c)}`).join(" ");
  if (castMentions) {
    lines.push(
      `Cast in frame: ${castMentions}. Reuse EXACT faces/outfits from their IMAGE refs.`,
    );
  }
  lines.push(buildSingleStillClause(opts.sceneIndex, opts.sceneCount));
  lines.push(opts.scenePrompt.trim());
  const beat = opts.beat;
  if (beat) {
    const bits = [
      beat.framing?.trim() && `framing: ${beat.framing.trim()}`,
      beat.camera?.trim() && `camera: ${beat.camera.trim()}`,
      beat.blocking?.trim() && `blocking: ${beat.blocking.trim()}`,
      beat.emotion?.trim() && `emotion: ${beat.emotion.trim()}`,
      // Mood only — never print dialogue as on-image text (models turn lines into comic bubbles).
      beat.line?.trim() && `performance mood from line (DO NOT render as text/bubbles): ${beat.line.trim()}`,
    ].filter(Boolean);
    if (bits.length) lines.push(`Director beat — ${bits.join("; ")}`);
  }
  lines.push(buildWorldLockClause(opts.worldDescription));
  if (opts.priorSceneAlias) {
    lines.push(
      `Continue directly after @${opts.priorSceneAlias} — match that prior keyframe's room, wardrobe, and subject identity.`,
    );
  }
  const brandClause = buildBrandScreenClause(opts.assets);
  if (brandClause) lines.push(brandClause);
  if (opts.assets.product) {
    lines.push(
      `Feature the connected @Product IMAGE ref clearly (exact product look). ` +
        `FORBIDDEN: inventing a random bottle, vial, serum, or unrelated SKU.`,
    );
  }
  if (opts.assets.brand && !opts.assets.product) {
    lines.push(
      `End-card / CTA beat: prioritize @brand logo artwork. ` +
        `FORBIDDEN: inventing a physical product bottle or glowing vial — logo + people only unless @Product is connected.`,
    );
  }
  return lines.filter(Boolean).join("\n\n");
}

export function planSceneContinuity(opts: {
  sceneIndex: number;
  sceneCount: number;
  scenePrompt: string;
  characters: Node[];
  beat?: ScriptSceneBeat;
  includePriorKeyframe?: boolean;
  worldDescription?: string;
}): SceneContinuityPlan {
  const cast = inferSceneCast(
    opts.sceneIndex,
    opts.sceneCount,
    opts.scenePrompt,
    opts.characters,
    opts.beat,
  );
  const assets = inferSceneAssetNeeds(
    opts.sceneIndex,
    opts.sceneCount,
    opts.scenePrompt,
    opts.beat,
  );
  const sceneAlias = sceneAliasForIndex(opts.sceneIndex);
  const priorSceneAlias =
    opts.includePriorKeyframe && opts.sceneIndex > 0
      ? sceneAliasForIndex(opts.sceneIndex - 1)
      : undefined;
  const imagePrompt = buildSceneContinuityPrompt({
    sceneIndex: opts.sceneIndex,
    sceneCount: opts.sceneCount,
    scenePrompt: opts.scenePrompt,
    cast,
    assets,
    priorSceneAlias,
    beat: opts.beat,
    worldDescription: opts.worldDescription,
  });
  return { cast, assets, imagePrompt, sceneAlias };
}

export function filterSpawnResourcesForScene(
  resources: Node[],
  assets: SceneAssetNeeds,
): Node[] {
  return resources.filter((n) => {
    const kind = (n.data as ProCanvasNodeData).kind;
    if (
      kind === "lighting" ||
      kind === "background" ||
      kind === "grade" ||
      kind === "research" ||
      kind === "world"
    ) {
      return true;
    }
    if (kind === "brand") return assets.brand;
    if (kind === "upload") {
      const alias = nodeAlias(n).toLowerCase();
      const label = ((n.data as ProCanvasNodeData).label ?? "").toLowerCase();
      const isUi = /\bui\b|interface|screen|app/.test(alias) || /\bui\b|界面/.test(label);
      const isProduct =
        /product|pack|sku|hero/.test(alias) || /product|产品/.test(label);
      if (isUi) return assets.ui;
      if (isProduct) return assets.product;
      return assets.product || assets.ui;
    }
    return true;
  });
}

export function scriptBeatAt(
  scriptNode: Node | undefined,
  sceneIndex: number,
): ScriptSceneBeat | undefined {
  if (!scriptNode) return undefined;
  const data = scriptNode.data as ScriptNodeData;
  return data.sceneBeats?.[sceneIndex];
}

/** Prior keyframe edge: scene image N-1 → scene image N. */
export function edgePriorSceneKeyframe(
  prevImageId: string,
  nextImageId: string,
  existingEdges: Edge[],
  pendingEdges: Edge[],
): Edge | null {
  const id = `e-${prevImageId}-${nextImageId}`;
  if (existingEdges.some((e) => e.id === id)) return null;
  if (pendingEdges.some((e) => e.id === id)) return null;
  return { id, source: prevImageId, target: nextImageId };
}
