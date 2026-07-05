import { actionLinkForTask } from "@/lib/studio-assistant-coach";
import type { CoachTaskKind } from "@/lib/studio-assistant-coach-profile";
import type { StudioAssistantSnapshot } from "@/lib/studio-assistant-types";

const LANDING_ACTION_BY_TASK: Partial<Record<CoachTaskKind, string>> = {
  "route-website-reel": "setup-website-reel",
  "route-website-image": "website-launch-image",
  "route-cinematic-stitch": "apply-cinematic-stitch",
  "route-physical-product": "open-physical-studio",
  "route-physical-image-post": "open-physical-studio",
  "route-reference-ad": "open-reference-ad-studio",
  "route-storyboard": "open-storyboard-studio",
  "route-concept-studio": "open-concept-studio",
  "route-captions": "open-captions",
};

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\-]/g, "\\$&");
}

/** On landing/start: remove wrong studio-action links; ensure the coach task action is present. */
export function enforceLandingCoachAction(
  reply: string,
  task: CoachTaskKind,
  snapshot: StudioAssistantSnapshot,
  userWritesEnglish: boolean,
): string {
  if (snapshot.surface === "studio") return reply;

  const allowed = LANDING_ACTION_BY_TASK[task];
  const link = actionLinkForTask(task, userWritesEnglish);
  if (!allowed || !link) {
    return reply.replace(/\[([^\]]+)\]\(studio-action:[^)]+\)/gi, "").trim();
  }

  const allowedRe = escapeRe(allowed);
  let out = reply
    .replace(
      new RegExp(`\\[([^\\]]+)\\]\\(studio-action:(?!${allowedRe})[^)]+\\)`, "gi"),
      "",
    )
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (!new RegExp(`studio-action:${allowedRe}`, "i").test(out)) {
    const preamble = userWritesEnglish
      ? "\n\nStep 1 — click this button:"
      : "\n\n第一步 — 請按此掣：";
    out = `${out}${preamble}\n${link}`;
  }

  return out;
}
