/**
 * "AI explosion unbox" — sealed themed box opens, room assembles, props float (text-to-video).
 * Inspired by viral Douyin tutorial format; user swaps [THEME] only.
 */

export type ExplosionUnboxThemeInput = {
  conceptIdea?: string;
  headline?: string;
  business?: string;
  product?: string;
};

export const EXPLOSION_UNBOX_DEFAULT_THEME = "colorful kids playroom";

export function extractExplosionUnboxTheme(input: ExplosionUnboxThemeInput): string {
  const raw =
    input.conceptIdea?.trim() ||
    input.headline?.trim() ||
    input.business?.trim() ||
    input.product?.trim() ||
    "";
  return raw || EXPLOSION_UNBOX_DEFAULT_THEME;
}

export function buildExplosionUnboxCreativeBrief(theme: string): string {
  const t = theme.trim() || EXPLOSION_UNBOX_DEFAULT_THEME;
  return [
    "AI explosion unbox reel (text-to-video, no on-screen text).",
    "",
    JSON.stringify(
      {
        description: `Cinematic fixed wide-angle shot. A sealed ${t}-themed gift box shakes on the floor, lid pops open, and ${t}-themed furniture and props rapidly assemble into a bright room. Then items lift and float in a playful zero-gravity explosion. No text in frame.`,
        style: "cinematic, vivid, warm undertones, animated-film color palette",
        camera: "fixed wide angle, stable tripod",
        lighting: "bright, saturated, soft warm fill",
        room: `${t}-themed bedroom or playroom`,
        elements: [`branded or themed box (${t})`, "themed furniture", "floating props and toys"],
      },
      null,
      2,
    ),
    "",
    "Edit only the theme words above — keep JSON shape.",
  ].join("\n");
}

export function buildExplosionUnboxVideoPrompt(theme: string): string {
  const t = theme.trim() || EXPLOSION_UNBOX_DEFAULT_THEME;
  return [
    `Cinematic fixed wide-angle shot of a bright ${t}-themed room.`,
    `A sealed decorative box with ${t} motifs trembles, opens, and ${t}-themed furniture and props snap into place across the floor and walls.`,
    "Then cushions, toys, and small objects lift off and float in a playful anti-gravity burst, drifting slowly with soft motion blur.",
    "Warm saturated lighting, animated-film color palette, shallow depth of field, stable camera, no camera shake.",
    "No on-screen text, subtitles, logos, watermarks, or UI.",
  ].join(" ");
}

export function prefillExplosionUnboxFields(theme?: string): {
  conceptIdea: string;
  creativeVideoBrief: string;
  videoPrompt: string;
} {
  const t = extractExplosionUnboxTheme({ conceptIdea: theme });
  return {
    conceptIdea: t,
    creativeVideoBrief: buildExplosionUnboxCreativeBrief(t),
    videoPrompt: buildExplosionUnboxVideoPrompt(t),
  };
}
