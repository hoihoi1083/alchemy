/** Multi-reference compose prompts for Ultra canvas → nano-banana-2/edit */

export const IMAGE_CANVAS_COMPOSE_SYSTEM_PROMPT = [
  "You are a precise image compositor for marketing creatives.",
  "Each attached image is a mandatory reference — preserve exact subjects, products, faces, ages, colors, materials, and shapes from the corresponding IMAGE slot.",
  "Do not substitute generic stock models, different product categories, or unrelated props.",
  "Follow the user scene description for background, lighting, and layout only where it does not contradict the references.",
].join(" ");

/** Max stills Ultra video will send to Seedance/H3 reference-to-video in one shot. */
export const ULTRA_VIDEO_MAX_REF_IMAGES = 9;

/**
 * Rewrite @aliases → @Image1…@ImageN and declare roles for Seedance/H3 multi-ref video.
 * fal only binds pixels when mode=reference + image_urls; tags must match that order.
 */
export function buildCanvasVideoReferencePrompt(
  userPrompt: string,
  aliasesInOrder: string[],
): string {
  const note = userPrompt.trim();
  let rewritten = note;
  for (let i = 0; i < aliasesInOrder.length; i++) {
    const alias = aliasesInOrder[i]!;
    const tag = `@Image${i + 1}`;
    const re = new RegExp(`@${escapeRegExp(alias)}\\b`, "gi");
    rewritten = rewritten.replace(re, tag);
  }

  if (aliasesInOrder.length === 0) return rewritten || note;

  const roleLines =
    aliasesInOrder.length === 1
      ? `@Image1 = ${aliasesInOrder[0]} — animate this subject; keep identity locked.`
      : aliasesInOrder
          .map(
            (alias, i) =>
              `@Image${i + 1} = ${alias} — keep this subject separate; do not morph or merge into other @Image slots`,
          )
          .join(". ") + ".";

  return [
    `${aliasesInOrder.length} reference images attached.`,
    roleLines,
    rewritten || note,
    "Keep every @Image subject distinct. No cyborg merge unless the prompt explicitly asks for it.",
  ].join(" ");
}

/** Rewrite @aliases to IMAGE N and prepend slot definitions for nano-banana-2/edit. */
export function buildCanvasComposePrompt(userPrompt: string, aliasesInOrder: string[]): string {
  const note = userPrompt.trim();
  let rewritten = note;

  for (let i = 0; i < aliasesInOrder.length; i++) {
    const alias = aliasesInOrder[i]!;
    const slot = `IMAGE ${i + 1}`;
    const re = new RegExp(`@${escapeRegExp(alias)}\\b`, "gi");
    rewritten = rewritten.replace(re, slot);
  }

  const count = aliasesInOrder.length;
  const slotDefs =
    count === 1
      ? "IMAGE 1 is the attached reference — use it exactly as provided."
      : aliasesInOrder
          .map(
            (alias, i) =>
              `IMAGE ${i + 1} = exact reference from @${alias} — preserve its subject, product, and appearance faithfully`,
          )
          .join(". ") + ".";

  const parts = [
    count === 1 ? "One reference image attached." : `${count} reference images attached.`,
    slotDefs,
    rewritten || note,
    "Composite faithfully using the reference image(s). Do not invent unrelated subjects or products.",
  ];
  return parts.join(" ");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
