/** Multi-reference compose prompts for Pro canvas → nano-banana-2/edit */

export const IMAGE_CANVAS_COMPOSE_SYSTEM_PROMPT = [
  "You are a precise image compositor for marketing creatives.",
  "Each attached image is a mandatory reference — preserve exact subjects, products, faces, ages, colors, materials, and shapes from the corresponding IMAGE slot.",
  "Do not substitute generic stock models, different product categories, or unrelated props.",
  "Follow the user scene description for background, lighting, and layout only where it does not contradict the references.",
].join(" ");

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
