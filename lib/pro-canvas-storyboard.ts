/**
 * Storyboard hub — act boards with multi-panels (TapNow-style), sync from script.
 */

import type { Node } from "@xyflow/react";
import type { ScriptSceneBeat } from "@/lib/pro-canvas-script-plan";
import {
  scriptSceneImagePromptsFromNode,
  scriptScenePromptsFromNode,
} from "@/lib/pro-canvas-graph";
import type {
  ProCanvasNodeData,
  ScriptNodeData,
  StoryboardAct,
  StoryboardPanel,
  StoryboardNodeData,
  VideoNodeData,
  VoiceLine,
  VoiceNodeData,
} from "@/lib/pro-canvas-types";
import { sceneDurationsFromBeats } from "@/lib/pro-canvas-scene-duration";
import { DEFAULT_ULTRA_VIDEO_PRO } from "@/lib/ultra-pro-controls";

const DEFAULT_ACT_SIZE = 3;
const DEFAULT_SCENE_DURATION_SEC = Number(DEFAULT_ULTRA_VIDEO_PRO.duration) || 8;

export function flattenStoryboardPanels(
  data: StoryboardNodeData | { acts?: StoryboardAct[]; panels?: StoryboardPanel[] },
): StoryboardPanel[] {
  if (data.acts?.length) {
    return data.acts.flatMap((a) => a.panels);
  }
  return data.panels ?? [];
}

export function groupPanelsIntoActs(
  panels: StoryboardPanel[],
  actSize = DEFAULT_ACT_SIZE,
): StoryboardAct[] {
  if (!panels.length) return [];
  const size = Math.max(1, actSize);
  const acts: StoryboardAct[] = [];
  for (let i = 0; i < panels.length; i += size) {
    const chunk = panels.slice(i, i + size).map((p, j) => ({
      ...p,
      index: j,
    }));
    const actNum = acts.length + 1;
    acts.push({
      id: `act-${actNum}`,
      title: `Act ${actNum}`,
      panels: chunk,
    });
  }
  return acts;
}

/**
 * Group storyboard panels by consecutive `beat.act` titles.
 * Returns null when beats lack act labels (caller falls back to chunk size).
 */
export function groupPanelsIntoActsByBeatAct(
  panels: StoryboardPanel[],
  beats?: ScriptSceneBeat[],
): StoryboardAct[] | null {
  if (!panels.length || !beats?.length) return null;
  if (!beats.some((b) => b.act?.trim())) return null;

  const acts: StoryboardAct[] = [];
  let title = "";
  let chunk: StoryboardPanel[] = [];

  const flush = () => {
    if (!chunk.length) return;
    const actNum = acts.length + 1;
    acts.push({
      id: `act-${actNum}`,
      title: title || `Act ${actNum}`,
      panels: chunk.map((p, j) => ({ ...p, index: j })),
    });
    chunk = [];
  };

  for (let i = 0; i < panels.length; i++) {
    const nextTitle = beats[i]?.act?.trim() || `Act ${acts.length + 1}`;
    if (chunk.length && nextTitle !== title) flush();
    title = nextTitle;
    chunk.push(panels[i]!);
  }
  flush();
  return acts.length ? acts : null;
}

/** Prefer beat.act labels, then prior act titles/sizes, else default chunking. */
export function regroupStoryboardActs(
  panels: StoryboardPanel[],
  opts?: { priorActs?: StoryboardAct[]; beats?: ScriptSceneBeat[] },
): StoryboardAct[] {
  const byBeat = groupPanelsIntoActsByBeatAct(panels, opts?.beats);
  if (byBeat) return byBeat;

  const prior = opts?.priorActs;
  if (prior?.length && panels.length) {
    let cursor = 0;
    const rebuilt: StoryboardAct[] = [];
    for (let i = 0; i < prior.length && cursor < panels.length; i++) {
      const act = prior[i]!;
      const n = Math.max(1, act.panels.length);
      const slice = panels.slice(cursor, cursor + n);
      cursor += slice.length;
      rebuilt.push({
        id: act.id || `act-${i + 1}`,
        title: act.title || `Act ${i + 1}`,
        panels: slice.map((p, j) => ({ ...p, index: j })),
      });
    }
    if (cursor < panels.length) {
      const rest = panels.slice(cursor);
      rebuilt.push({
        id: `act-${rebuilt.length + 1}`,
        title: `Act ${rebuilt.length + 1}`,
        panels: rest.map((p, j) => ({ ...p, index: j })),
      });
    }
    if (rebuilt.length) return rebuilt;
  }

  return groupPanelsIntoActs(panels);
}

/** Global panel index → act title + panel-in-act index (0-based). */
export function actLabelForPanelIndex(
  acts: StoryboardAct[],
  globalIndex: number,
): { actTitle: string; panelInAct: number; actIndex: number } {
  let cursor = 0;
  for (let ai = 0; ai < acts.length; ai++) {
    const act = acts[ai]!;
    if (globalIndex < cursor + act.panels.length) {
      return {
        actTitle: act.title || `Act ${ai + 1}`,
        panelInAct: globalIndex - cursor,
        actIndex: ai,
      };
    }
    cursor += act.panels.length;
  }
  return { actTitle: `Act 1`, panelInAct: globalIndex, actIndex: 0 };
}

export function syncStoryboardPanelsFromScript(scriptNode: Node): {
  panels: StoryboardPanel[];
  acts: StoryboardAct[];
} {
  const data = scriptNode.data as ScriptNodeData;
  if (data.kind !== "script") return { panels: [], acts: [] };
  const stills = scriptSceneImagePromptsFromNode(scriptNode);
  const motions = scriptScenePromptsFromNode(scriptNode);
  const count = Math.max(
    stills.length,
    motions.length,
    data.sceneBeats?.length ?? 0,
    data.sceneCount ?? 0,
  );
  if (!count) return { panels: [], acts: [] };

  const panels: StoryboardPanel[] = [];
  for (let i = 0; i < count; i++) {
    const beat = data.sceneBeats?.[i];
    const stillPrompt =
      stills[i]?.trim() ||
      softStillFromBeat(beat, i) ||
      motions[i]?.trim() ||
      `Scene ${i + 1}`;
    const motionPrompt = motions[i]?.trim() || stillPrompt;
    panels.push({
      index: i,
      title: beat?.act?.trim() || beat?.time?.trim() || beat?.emotion?.trim() || `Shot ${i + 1}`,
      dialogue: beat?.line?.trim() || undefined,
      speaker: beat?.speaker?.trim() || undefined,
      stillPrompt,
      motionPrompt,
    });
  }
  const named = groupPanelsIntoActsByBeatAct(panels, data.sceneBeats);
  return { panels, acts: named ?? groupPanelsIntoActs(panels) };
}

function softStillFromBeat(beat: ScriptSceneBeat | undefined, index: number): string {
  if (!beat) return "";
  const bits = [
    beat.time?.trim() && `time ${beat.time.trim()}`,
    beat.framing?.trim(),
    beat.camera?.trim() && `camera: ${beat.camera.trim()}`,
    beat.blocking?.trim(),
    beat.emotion?.trim() && `mood: ${beat.emotion.trim()}`,
    beat.speaker?.trim() && `featuring ${beat.speaker.trim()}`,
  ].filter(Boolean);
  if (!bits.length) return "";
  return `Single still — scene ${index + 1}. ${bits.join(". ")}.`;
}

export function parseSceneDurationSec(raw: unknown, fallback = DEFAULT_SCENE_DURATION_SEC): number {
  const n = typeof raw === "number" ? raw : Number(String(raw ?? "").replace(/s$/i, ""));
  if (!Number.isFinite(n) || n <= 0) return Math.max(2, fallback);
  return Math.min(60, Math.max(2, n));
}

/** Per-scene clip durations from spawned video nodes (by sceneIndex), else default. */
export function sceneDurationsFromNodes(
  nodes: Node[],
  sceneCount: number,
  defaultSec = DEFAULT_SCENE_DURATION_SEC,
): number[] {
  const byIndex = new Map<number, number>();
  for (const n of nodes) {
    const d = n.data as ProCanvasNodeData;
    if (d.kind !== "video" && d.kind !== "textVideo") continue;
    const idx = (d as VideoNodeData).sceneIndex;
    if (typeof idx !== "number" || idx < 0) continue;
    byIndex.set(idx, parseSceneDurationSec((d as VideoNodeData).duration, defaultSec));
  }

  const script = nodes.find((n) => (n.data as ProCanvasNodeData).kind === "script");
  const beats = script
    ? ((script.data as ScriptNodeData).sceneBeats ?? undefined)
    : undefined;
  const brainstorm = nodes.find((n) => (n.data as ProCanvasNodeData).kind === "brainstorm");
  const totalDurationSec = brainstorm
    ? Number((brainstorm.data as { durationSec?: number }).durationSec)
    : undefined;
  const fromBeats = sceneDurationsFromBeats(beats, sceneCount, {
    totalDurationSec: Number.isFinite(totalDurationSec) ? totalDurationSec : undefined,
    defaultSec,
  });

  return Array.from({ length: sceneCount }, (_, i) => {
    if (byIndex.has(i)) return byIndex.get(i)!;
    return fromBeats[i] ?? defaultSec;
  });
}

type DialogueSource = {
  text: string;
  sceneIndex: number;
  sceneLabel: string;
};

function dialogueFromStoryboardNode(board: Node): DialogueSource[] {
  const data = board.data as StoryboardNodeData;
  const panels = flattenStoryboardPanels(data);
  const acts = data.acts?.length ? data.acts : groupPanelsIntoActs(panels);
  const fromBoard: DialogueSource[] = [];
  panels.forEach((p, i) => {
    const line = p.dialogue?.trim();
    if (!line) return;
    const text = p.speaker?.trim() ? `${p.speaker.trim()}: ${line}` : line;
    const { actTitle, panelInAct } = actLabelForPanelIndex(acts, i);
    fromBoard.push({
      text,
      sceneIndex: i,
      sceneLabel: `${actTitle} · Scene ${panelInAct + 1}`,
    });
  });
  return fromBoard;
}

function dialogueFromScriptNode(script: Node): DialogueSource[] {
  const beats = (script.data as ScriptNodeData).sceneBeats ?? [];
  const fromScript: DialogueSource[] = [];
  beats.forEach((b, i) => {
    const line = b.line?.trim();
    if (!line) return;
    const who = b.speaker?.trim();
    const text = who ? `${who}: ${line}` : line;
    fromScript.push({
      text,
      sceneIndex: i,
      sceneLabel: `Scene ${i + 1}`,
    });
  });
  return fromScript;
}

/**
 * Collect spoken lines. Optional `scopeNodes` limits search (e.g. upstream of Voice).
 * Scoped (wired): Script beats first, then Storyboard — matches “I wired the script”.
 * Unscoped (legacy board scan): Storyboard first, else Script.
 */
export function dialogueSourcesFromNodes(
  nodes: Node[],
  opts?: { scopeNodes?: Node[] },
): DialogueSource[] {
  const scoped = Boolean(opts?.scopeNodes?.length);
  const pool = scoped ? opts!.scopeNodes! : nodes;

  const readScriptThenBoard = () => {
    const script = pool.find((n) => (n.data as ProCanvasNodeData).kind === "script");
    if (script) {
      const fromScript = dialogueFromScriptNode(script);
      if (fromScript.length) return fromScript;
    }
    const board = pool.find((n) => (n.data as ProCanvasNodeData).kind === "storyboard");
    if (board) {
      const fromBoard = dialogueFromStoryboardNode(board);
      if (fromBoard.length) return fromBoard;
    }
    return [] as DialogueSource[];
  };

  const readBoardThenScript = () => {
    const board = pool.find((n) => (n.data as ProCanvasNodeData).kind === "storyboard");
    if (board) {
      const fromBoard = dialogueFromStoryboardNode(board);
      if (fromBoard.length) return fromBoard;
    }
    const script = pool.find((n) => (n.data as ProCanvasNodeData).kind === "script");
    if (script) {
      const fromScript = dialogueFromScriptNode(script);
      if (fromScript.length) return fromScript;
    }
    return [] as DialogueSource[];
  };

  return scoped ? readScriptThenBoard() : readBoardThenScript();
}

/** Pull spoken lines from storyboard panels (preferred) or script beats. */
export function dialogueScriptFromNodes(
  nodes: Node[],
  opts?: { scopeNodes?: Node[] },
): string {
  return voiceLinesFromNodes(nodes, opts)
    .map((l) => l.text)
    .join("\n");
}

/**
 * Timed voice lines — windows accumulate by scene clip duration
 * (spawned video duration when present).
 */
export function voiceLinesFromNodes(
  nodes: Node[],
  opts?: { sceneDurationSec?: number; scopeNodes?: Node[] },
): VoiceLine[] {
  const defaultSec = parseSceneDurationSec(
    opts?.sceneDurationSec,
    DEFAULT_SCENE_DURATION_SEC,
  );
  const sources = dialogueSourcesFromNodes(nodes, opts);
  if (!sources.length) return [];

  const maxScene = Math.max(...sources.map((s) => s.sceneIndex)) + 1;
  const durations = sceneDurationsFromNodes(nodes, maxScene, defaultSec);

  let cursor = 0;
  const starts: number[] = [];
  for (let i = 0; i < maxScene; i++) {
    starts[i] = cursor;
    cursor += durations[i] ?? defaultSec;
  }

  return sources.map((s) => {
    const dur = durations[s.sceneIndex] ?? defaultSec;
    const startSec = starts[s.sceneIndex] ?? s.sceneIndex * defaultSec;
    return {
      text: s.text,
      startSec,
      endSec: startSec + Math.max(2, dur - 0.35),
      sceneIndex: s.sceneIndex,
      sceneLabel: s.sceneLabel,
    };
  });
}

/** Planned VO window for a storyboard panel (even if no dialogue). */
export function plannedVoWindowForScene(
  nodes: Node[],
  sceneIndex: number,
  opts?: { sceneDurationSec?: number },
): { startSec: number; endSec: number } {
  const defaultSec = parseSceneDurationSec(
    opts?.sceneDurationSec,
    DEFAULT_SCENE_DURATION_SEC,
  );
  const board = nodes.find((n) => (n.data as ProCanvasNodeData).kind === "storyboard");
  const panelCount = board
    ? flattenStoryboardPanels(board.data as StoryboardNodeData).length
    : sceneIndex + 1;
  const sceneCount = Math.max(panelCount, sceneIndex + 1);
  const durations = sceneDurationsFromNodes(nodes, sceneCount, defaultSec);
  let startSec = 0;
  for (let i = 0; i < sceneIndex; i++) startSec += durations[i] ?? defaultSec;
  const dur = durations[sceneIndex] ?? defaultSec;
  return { startSec, endSec: startSec + Math.max(2, dur - 0.35) };
}

export function defaultVoiceNodeScript(): string {
  return "Haven't you heard about Alchemy AI Lab?\nLess prompt, more creating. Try Alchemy AI Lab.";
}

export function isVoiceNodeData(data: ProCanvasNodeData): data is VoiceNodeData {
  return data.kind === "voice";
}

export function voiceLinesToCaptionPayload(lines: VoiceLine[]): Array<{
  text: string;
  startSec: number;
  endSec: number;
  spokenText: string;
}> {
  return lines
    .filter((l) => l.text.trim())
    .map((l) => ({
      text: l.text.trim(),
      spokenText: l.text.trim(),
      startSec: Math.max(0, l.startSec),
      endSec: Math.max(l.startSec + 0.4, l.endSec),
    }));
}
