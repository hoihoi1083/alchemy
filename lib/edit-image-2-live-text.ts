/** Live-text font presets for edit-image-2 (CJK-capable stacks first). */
export const LIVE_TEXT_FONTS: Array<{ id: string; labelKey: string }> = [
  { id: 'system-ui, "Segoe UI", sans-serif', labelKey: "fontSystem" },
  {
    id: '"PingFang SC", "Hiragino Sans GB", "Noto Sans SC", "Microsoft YaHei", sans-serif',
    labelKey: "fontSans",
  },
  {
    id: '"Songti SC", "Noto Serif SC", "STSong", serif',
    labelKey: "fontSerif",
  },
  {
    id: '"Yuanti SC", "Rounded Mplus 1c", "Nunito", sans-serif',
    labelKey: "fontRounded",
  },
  { id: "Georgia, 'Times New Roman', serif", labelKey: "fontGeorgia" },
  { id: "Impact, Haettenschweiler, sans-serif", labelKey: "fontImpact" },
];

export type LiveTextEffect = "none" | "outline" | "shadow";

/** Display string for Konva — vertical stacks characters with newlines. */
export function liveTextDisplayString(
  raw: string,
  vertical: boolean | undefined,
): string {
  const text = raw ?? "";
  if (!vertical) return text;
  if (text.includes("\n")) return text;
  return [...text.replace(/\s+/g, "")].join("\n");
}
