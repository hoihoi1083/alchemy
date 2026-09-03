/** Paste / push research summary from Studio → Ultra canvas Research node. */

import type { Node } from "@xyflow/react";
import type { ContentResearchPlan } from "@/lib/content-research-types";
import type { ProCanvasNodeData, ResearchNodeData } from "@/lib/pro-canvas-types";

export const ULTRA_RESEARCH_HANDOFF_KEY = "alchemy:ultra-research-handoff";

/** Discard handoffs older than 24h. */
export const ULTRA_RESEARCH_HANDOFF_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export type UltraResearchHandoff = {
  summary: string;
  angles?: string[];
  topic?: string;
  platform?: string;
  savedAt: number;
};

export function saveUltraResearchHandoff(payload: Omit<UltraResearchHandoff, "savedAt">): void {
  if (typeof window === "undefined") return;
  const summary = payload.summary.trim();
  const hasAngles = Boolean(payload.angles?.length);
  if (!summary && !hasAngles) return;
  const handoff: UltraResearchHandoff = {
    ...payload,
    summary,
    savedAt: Date.now(),
  };
  window.localStorage.setItem(ULTRA_RESEARCH_HANDOFF_KEY, JSON.stringify(handoff));
}

export function readUltraResearchHandoff(): UltraResearchHandoff | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(ULTRA_RESEARCH_HANDOFF_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as UltraResearchHandoff;
    if (!parsed?.summary?.trim() && !parsed?.angles?.length) return null;
    if (Date.now() - (parsed.savedAt ?? 0) > ULTRA_RESEARCH_HANDOFF_MAX_AGE_MS) {
      clearUltraResearchHandoff();
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearUltraResearchHandoff(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(ULTRA_RESEARCH_HANDOFF_KEY);
}

export function formatResearchSummaryForCanvas(handoff: UltraResearchHandoff): string {
  const parts: string[] = [];
  if (handoff.summary.trim()) parts.push(handoff.summary.trim());
  if (handoff.angles?.length) {
    parts.push(
      "Creative angles:\n" +
        handoff.angles.map((a, i) => `${i + 1}. ${a}`).join("\n"),
    );
  }
  if (handoff.topic?.trim()) {
    parts.push(`Topic: ${handoff.topic.trim()}`);
  }
  if (handoff.platform?.trim()) {
    parts.push(`Platform: ${handoff.platform.trim()}`);
  }
  return parts.join("\n\n");
}

/** Apply pending Studio handoff onto every research node (e.g. after template load). */
export function mergeResearchHandoffIntoNodes(
  nodes: Node[],
  handoff: UltraResearchHandoff | null,
): { nodes: Node[]; applied: boolean } {
  if (!handoff) return { nodes, applied: false };
  const summary = formatResearchSummaryForCanvas(handoff);
  if (!summary.trim()) return { nodes, applied: false };
  let applied = false;
  const next = nodes.map((n) => {
    if ((n.data as ProCanvasNodeData).kind !== "research") return n;
    applied = true;
    return {
      ...n,
      data: { ...(n.data as ResearchNodeData), summary },
    };
  });
  return { nodes: next, applied };
}

export function buildResearchSummaryFromPlan(plan: ContentResearchPlan): string {
  if (plan.summary?.trim()) return plan.summary.trim();
  const angles = plan.topPicks?.length ? plan.topPicks : plan.candidates;
  if (angles?.length) {
    return angles
      .slice(0, 3)
      .map((a, i) => `${i + 1}. ${a.title}: ${a.hook}`)
      .join("\n");
  }
  return "";
}

export function buildUltraResearchHandoffFromPlan(
  plan: ContentResearchPlan,
): Omit<UltraResearchHandoff, "savedAt"> {
  const angles = (plan.topPicks?.length ? plan.topPicks : plan.candidates)
    ?.slice(0, 5)
    .map((a) => `${a.title} — ${a.hook}`);
  return {
    summary: buildResearchSummaryFromPlan(plan),
    angles,
    topic: plan.topic,
    platform: plan.platformLabel || plan.platform,
  };
}
