/**
 * Ultra brainstorm — idea + duration → selectable creative directions (DeepSeek quota).
 */

import { callDeepSeekChat } from "@/lib/deepseek-client";
import { jsonrepair } from "jsonrepair";

export type BrainstormOption = {
  id: string;
  title: string;
  hook: string;
  brief: string;
  /** Suggested act / beat outline for storyboard. */
  actOutline: string;
  motionNote: string;
};

export function clampBrainstormDurationSec(raw: unknown): number {
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) return 20;
  return Math.min(60, Math.max(8, Math.round(n)));
}

export async function planBrainstormOptions(input: {
  idea: string;
  durationSec: number;
  count?: number;
}): Promise<BrainstormOption[]> {
  const idea = input.idea.trim();
  if (!idea) throw new Error("idea is required");
  const durationSec = clampBrainstormDurationSec(input.durationSec);
  const count = Math.min(4, Math.max(2, input.count ?? 3));

  const system = [
    "You are a senior ad director brainstorming short social video directions.",
    "Return ONLY valid JSON:",
    '{ "options": [ { "title": string, "hook": string, "brief": string, "actOutline": string, "motionNote": string } ] }.',
    `Generate exactly ${count} DISTINCT directions for the SAME idea and ~${durationSec}s runtime.`,
    "title: 3-6 words. hook: one punchy line. brief: 2-4 sentences of story arc.",
    "actOutline: 2-3 acts with beat labels (e.g. Act1 pain → Act2 demo → Act3 CTA), matching the duration.",
    "motionNote: one line of camera/motion language.",
    "Match the user's language (English / 中文 / 粵語).",
  ].join(" ");

  const user = `Idea: ${idea}\nTarget duration: ~${durationSec} seconds.`;

  const raw = await callDeepSeekChat(
    [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    { temperature: 0.85 },
  );
  const repaired = jsonrepair(raw);
  const parsed = JSON.parse(repaired) as {
    options?: Array<{
      title?: string;
      hook?: string;
      brief?: string;
      actOutline?: string;
      motionNote?: string;
    }>;
  };
  const list = (parsed.options ?? []).filter(
    (o) => o?.title?.trim() && o?.brief?.trim() && o?.hook?.trim(),
  );
  return list.slice(0, count).map((o, i) => ({
    id: `opt-${i + 1}`,
    title: String(o.title).trim(),
    hook: String(o.hook).trim(),
    brief: String(o.brief).trim(),
    actOutline: String(o.actOutline ?? "").trim() || `Act structure for ~${durationSec}s`,
    motionNote: String(o.motionNote ?? "Grounded handheld, stable faces.").trim(),
  }));
}
