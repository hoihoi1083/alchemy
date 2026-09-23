/**
 * Orbit-type and cloche-reveal — single-clip video recipes from the XHS refs.
 * Product: uploaded SKU / model is the hero. Concept: logo / mascot / idea subject.
 */

export function buildOrbitTypeVideoPrompt(input: {
  subject: string;
  headline: string;
  conceptMode: boolean;
}): string {
  const words = input.headline.trim() || input.subject.trim() || "RISE UP";
  const who = input.conceptMode
    ? `Center subject is the brand idea / logo / mascot for "${input.subject || words}".`
    : `Center subject is the exact product or model from the start frame ("${input.subject || "the product"}"). Keep shape, color, and logos locked.`;
  return [
    "Vertical 9:16 fashion motion-graphic video.",
    who,
    "Subject stays locked in the center of a clean high-key white studio.",
    `Bold black kinetic typography spells "${words}" and orbits, tunnels, and passes BEHIND and around the subject in 3D space — not flat captions.`,
    "Camera is mostly locked with a slight orbit. No shake. No extra slogans. No watermark. No speech.",
  ].join(" ");
}

export function buildClocheRevealVideoPrompt(input: {
  subject: string;
  headline: string;
  conceptMode: boolean;
}): string {
  const theme = input.headline.trim() || input.subject.trim() || "REVEAL";
  const reveal = input.conceptMode
    ? `Under the rising dome, reveal a clean brand logo / idea lockup for "${theme}". The mess on the tray is symbolic props for the idea, not trash.`
    : `Under the rising dome, reveal the exact product from the start frame ("${input.subject || "the product"}") — same shape, color, and logos. Around it, a curated ingredient / structure still-life that expresses what it is made of.`;
  return [
    "Vertical 9:16 fine-dining cloche reveal.",
    "Warm cream studio, polished silver tray, white formal gloves, black sleeve cuffs.",
    "Start with a designed mess on the tray, then a matching silver dome covers it, then one gloved hand lifts the dome.",
    reveal,
    `Optional tiny title only: "${theme}".`,
    "Slow, steady lift. No shake. No watermark. No speech.",
  ].join(" ");
}
