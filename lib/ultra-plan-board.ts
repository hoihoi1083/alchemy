/**
 * Ultra-2 describe → validated canvas graph (DeepSeek plan, no auto-run).
 * Server builds nodes/edges; model never injects media URLs.
 */

import type { Edge, Node } from "@xyflow/react";
import { callDeepSeekChat } from "@/lib/deepseek-client";
import { isImageAspectRatio, type ImageAspectRatio } from "@/lib/image-aspect-ratio";
import { parseLlmJsonObject } from "@/lib/parse-llm-json";
import {
  clampUltraScriptSceneCount,
  ULTRA_SCRIPT_SCENE_COUNT_DEFAULT,
} from "@/lib/pro-canvas-script-plan";
import type { ProCanvasNodeData, ProCanvasNodeKind } from "@/lib/pro-canvas-types";
import {
  DEFAULT_ULTRA_IMAGE_PRO,
  DEFAULT_ULTRA_VIDEO_PRO,
  ULTRA_VIDEO_ASPECT_RATIOS,
  type UltraVideoAspectRatio,
} from "@/lib/ultra-pro-controls";

export const ULTRA_PLAN_BOARD_MAX_NODES = 12;
export const ULTRA_PLAN_BOARD_MAX_EDGES = 24;
export const ULTRA_PLAN_BOARD_MAX_PROMPT = 1200;
export const ULTRA_PLAN_BOARD_MAX_REFS_PER_IMAGE = 8;
export const ULTRA_PLAN_BOARD_MAX_USER_REFS = 8;

export type UltraDescribeAssetRef = {
  id: string;
  url: string;
  kind: "image" | "video";
  fileName?: string;
  /** Optional user hint: layout | face | product | other */
  roleHint?: string;
};

const ALLOWED_KINDS = [
  "upload",
  "character",
  "image",
  "video",
  "script",
] as const satisfies readonly ProCanvasNodeKind[];

type AllowedKind = (typeof ALLOWED_KINDS)[number];

export type UltraPlanBoardNodeDraft = {
  id: string;
  kind: AllowedKind;
  label?: string;
  alias?: string;
  /** Upload/character order into the target image (1 = base / IMAGE 1). */
  slot?: number;
  /** Bind a client-uploaded ref id (never a raw URL from the model). */
  sourceRefId?: string;
  prompt?: string;
  brief?: string;
  aspectRatio?: string;
  duration?: string;
  sceneCount?: number;
};

export type UltraPlanBoardEdgeDraft = {
  source: string;
  target: string;
  /** Optional; if set, used to order refs into the target. */
  slot?: number;
};

export type UltraPlanBoardLlmPayload = {
  title?: string;
  qualityNote?: string;
  nodes: UltraPlanBoardNodeDraft[];
  edges: UltraPlanBoardEdgeDraft[];
};

export type UltraPlanBoardGraph = {
  title: string;
  qualityNote: string;
  nodes: Node[];
  edges: Edge[];
  nodeCounterSeed: number;
};

const ID_RE = /^[a-zA-Z][a-zA-Z0-9_-]{0,31}$/;
const ALIAS_RE = /^[A-Za-z][A-Za-z0-9_]{0,23}$/;

function isAllowedKind(v: unknown): v is AllowedKind {
  return typeof v === "string" && (ALLOWED_KINDS as readonly string[]).includes(v);
}

function sanitizeAlias(raw: unknown, fallback: string): string {
  const s = typeof raw === "string" ? raw.trim().replace(/\s+/g, "") : "";
  if (ALIAS_RE.test(s) && !/^Image\d+$/i.test(s)) return s;
  const fb = fallback.replace(/\s+/g, "");
  if (ALIAS_RE.test(fb)) return fb;
  return "Ref";
}

function sanitizeId(raw: unknown, index: number): string | null {
  if (typeof raw !== "string") return null;
  const id = raw.trim();
  if (!ID_RE.test(id)) return null;
  return id || `n${index + 1}`;
}

function clampImageAspect(raw: unknown): ImageAspectRatio {
  if (typeof raw === "string" && isImageAspectRatio(raw)) return raw;
  if (raw === "16:9") return "16:9";
  return DEFAULT_ULTRA_IMAGE_PRO.aspectRatio;
}

function clampVideoAspect(raw: unknown): UltraVideoAspectRatio {
  if (
    typeof raw === "string" &&
    (ULTRA_VIDEO_ASPECT_RATIOS as readonly string[]).includes(raw)
  ) {
    return raw as UltraVideoAspectRatio;
  }
  return DEFAULT_ULTRA_VIDEO_PRO.aspectRatio;
}

function clampDuration(raw: unknown): string {
  const n = typeof raw === "number" ? raw : Number(String(raw ?? "").replace(/s$/i, ""));
  if (!Number.isFinite(n)) return DEFAULT_ULTRA_VIDEO_PRO.duration;
  return String(Math.min(12, Math.max(4, Math.round(n))));
}

function truncatePrompt(raw: unknown): string {
  const s = typeof raw === "string" ? raw.trim() : "";
  if (!s) return "";
  return s.slice(0, ULTRA_PLAN_BOARD_MAX_PROMPT);
}

export function validateUltraPlanBoardPayload(
  raw: unknown,
  opts?: { allowedRefIds?: Set<string> },
): UltraPlanBoardLlmPayload {
  if (!raw || typeof raw !== "object") {
    throw new Error("Plan must be a JSON object.");
  }
  const obj = raw as Record<string, unknown>;
  const nodesIn = Array.isArray(obj.nodes) ? obj.nodes : null;
  const edgesIn = Array.isArray(obj.edges) ? obj.edges : null;
  if (!nodesIn || nodesIn.length === 0) {
    throw new Error("Plan must include at least one node.");
  }
  if (nodesIn.length > ULTRA_PLAN_BOARD_MAX_NODES) {
    throw new Error(`Plan exceeds ${ULTRA_PLAN_BOARD_MAX_NODES} nodes.`);
  }
  if (!edgesIn) {
    throw new Error("Plan must include an edges array (may be empty).");
  }
  if (edgesIn.length > ULTRA_PLAN_BOARD_MAX_EDGES) {
    throw new Error(`Plan exceeds ${ULTRA_PLAN_BOARD_MAX_EDGES} edges.`);
  }

  const seenIds = new Set<string>();
  const nodes: UltraPlanBoardNodeDraft[] = [];
  for (let i = 0; i < nodesIn.length; i++) {
    const n = nodesIn[i];
    if (!n || typeof n !== "object") {
      throw new Error(`Invalid node at index ${i}.`);
    }
    const rec = n as Record<string, unknown>;
    const id = sanitizeId(rec.id, i);
    if (!id) throw new Error(`Invalid node id at index ${i}.`);
    if (seenIds.has(id)) throw new Error(`Duplicate node id: ${id}`);
    seenIds.add(id);
    if (!isAllowedKind(rec.kind)) {
      throw new Error(`Unsupported node kind at ${id}: ${String(rec.kind)}`);
    }
    // Never accept media URLs from the model.
    for (const banned of [
      "imageUrl",
      "videoUrl",
      "previewUrl",
      "audioUrl",
      "fileName",
    ]) {
      if (banned in rec && rec[banned] != null && rec[banned] !== "") {
        throw new Error(`Node ${id} must not include ${banned}.`);
      }
    }
    const slotRaw = rec.slot;
    const slot =
      typeof slotRaw === "number" && Number.isFinite(slotRaw)
        ? Math.max(1, Math.min(20, Math.round(slotRaw)))
        : undefined;
    nodes.push({
      id,
      kind: rec.kind,
      label: typeof rec.label === "string" ? rec.label.trim().slice(0, 80) : undefined,
      alias: typeof rec.alias === "string" ? rec.alias : undefined,
      slot,
      sourceRefId: (() => {
        const sid =
          typeof rec.sourceRefId === "string" ? rec.sourceRefId.trim() : "";
        if (!sid) return undefined;
        if (opts?.allowedRefIds && !opts.allowedRefIds.has(sid)) {
          throw new Error(`Node ${id} sourceRefId is not a provided upload.`);
        }
        if (!ID_RE.test(sid)) {
          throw new Error(`Node ${id} has invalid sourceRefId.`);
        }
        return sid;
      })(),
      prompt: truncatePrompt(rec.prompt),
      brief: truncatePrompt(rec.brief),
      aspectRatio: typeof rec.aspectRatio === "string" ? rec.aspectRatio : undefined,
      duration: typeof rec.duration === "string" || typeof rec.duration === "number"
        ? String(rec.duration)
        : undefined,
      sceneCount:
        typeof rec.sceneCount === "number" ? rec.sceneCount : undefined,
    });
  }

  const idSet = new Set(nodes.map((n) => n.id));
  const edges: UltraPlanBoardEdgeDraft[] = [];
  const edgeKeys = new Set<string>();
  for (let i = 0; i < edgesIn.length; i++) {
    const e = edgesIn[i];
    if (!e || typeof e !== "object") {
      throw new Error(`Invalid edge at index ${i}.`);
    }
    const rec = e as Record<string, unknown>;
    const source = typeof rec.source === "string" ? rec.source.trim() : "";
    const target = typeof rec.target === "string" ? rec.target.trim() : "";
    if (!idSet.has(source) || !idSet.has(target)) {
      throw new Error(`Edge ${i} references unknown nodes.`);
    }
    if (source === target) throw new Error(`Edge ${i} is a self-loop.`);
    const key = `${source}->${target}`;
    if (edgeKeys.has(key)) continue;
    edgeKeys.add(key);
    const slotRaw = rec.slot;
    const slot =
      typeof slotRaw === "number" && Number.isFinite(slotRaw)
        ? Math.max(1, Math.min(20, Math.round(slotRaw)))
        : undefined;
    edges.push({ source, target, slot });
  }

  assertAcyclic(nodes.map((n) => n.id), edges);
  assertKindCompatibility(nodes, edges);

  return {
    title:
      typeof obj.title === "string" && obj.title.trim()
        ? obj.title.trim().slice(0, 80)
        : "Described board",
    qualityNote:
      typeof obj.qualityNote === "string"
        ? obj.qualityNote.trim().slice(0, 400)
        : "",
    nodes,
    edges,
  };
}

function assertAcyclic(ids: string[], edges: UltraPlanBoardEdgeDraft[]) {
  const adj = new Map<string, string[]>();
  for (const id of ids) adj.set(id, []);
  for (const e of edges) adj.get(e.source)!.push(e.target);
  const state = new Map<string, 0 | 1 | 2>();
  const visit = (id: string) => {
    const s = state.get(id) ?? 0;
    if (s === 1) throw new Error("Plan graph has a cycle.");
    if (s === 2) return;
    state.set(id, 1);
    for (const next of adj.get(id) ?? []) visit(next);
    state.set(id, 2);
  };
  for (const id of ids) visit(id);
}

function assertKindCompatibility(
  nodes: UltraPlanBoardNodeDraft[],
  edges: UltraPlanBoardEdgeDraft[],
) {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const inbound = new Map<string, UltraPlanBoardEdgeDraft[]>();
  for (const e of edges) {
    const list = inbound.get(e.target) ?? [];
    list.push(e);
    inbound.set(e.target, list);
  }
  for (const [targetId, ins] of inbound) {
    const target = byId.get(targetId)!;
    if (target.kind === "image") {
      if (ins.length > ULTRA_PLAN_BOARD_MAX_REFS_PER_IMAGE) {
        throw new Error(
          `Image ${targetId} has too many refs (max ${ULTRA_PLAN_BOARD_MAX_REFS_PER_IMAGE}).`,
        );
      }
      for (const e of ins) {
        const src = byId.get(e.source)!;
        if (src.kind !== "upload" && src.kind !== "character") {
          throw new Error(
            `Image ${targetId} only accepts upload/character inputs.`,
          );
        }
      }
    } else if (target.kind === "video") {
      for (const e of ins) {
        const src = byId.get(e.source)!;
        if (src.kind !== "image" && src.kind !== "upload") {
          throw new Error(`Video ${targetId} only accepts image/upload inputs.`);
        }
      }
    } else if (target.kind === "script") {
      for (const e of ins) {
        const src = byId.get(e.source)!;
        if (src.kind !== "upload" && src.kind !== "character") {
          throw new Error(`Script ${targetId} only accepts upload/character inputs.`);
        }
      }
    } else if (target.kind === "upload" || target.kind === "character") {
      throw new Error(`${target.kind} node ${targetId} cannot be an edge target.`);
    }
  }
}

function buildNodeData(
  draft: UltraPlanBoardNodeDraft,
  labels: Record<string, string>,
  refById: Map<string, UltraDescribeAssetRef> = new Map(),
): ProCanvasNodeData {
  const label =
    draft.label?.trim() ||
    labels[draft.kind] ||
    draft.kind.charAt(0).toUpperCase() + draft.kind.slice(1);
  const bound = draft.sourceRefId ? refById.get(draft.sourceRefId) : undefined;
  switch (draft.kind) {
    case "upload":
      return {
        kind: "upload",
        label,
        alias: sanitizeAlias(draft.alias, draft.slot ? `Ref${draft.slot}` : "Reference"),
        ...(bound?.kind === "image"
          ? { previewUrl: bound.url, fileName: bound.fileName }
          : {}),
      };
    case "character":
      return {
        kind: "character",
        label,
        alias: sanitizeAlias(draft.alias, draft.slot ? `Face${draft.slot}` : "Person"),
        biography: draft.brief || draft.prompt || "",
        ...(bound?.kind === "image"
          ? { previewUrl: bound.url, fileName: bound.fileName }
          : {}),
      };
    case "image":
      return {
        kind: "image",
        label,
        prompt:
          draft.prompt ||
          "Premium marketing still, clean composition, brand-forward lighting. No invented logos.",
        aspectRatio: clampImageAspect(draft.aspectRatio),
        resolution: DEFAULT_ULTRA_IMAGE_PRO.resolution,
        artStyleId: DEFAULT_ULTRA_IMAGE_PRO.artStyleId,
        lightingPreset: DEFAULT_ULTRA_IMAGE_PRO.lightingPreset,
        backgroundPreset: DEFAULT_ULTRA_IMAGE_PRO.backgroundPreset,
      };
    case "video":
      return {
        kind: "video",
        label,
        prompt:
          draft.prompt ||
          "Subtle natural motion, stable camera, cinematic lighting",
        camera: DEFAULT_ULTRA_VIDEO_PRO.camera,
        duration: clampDuration(draft.duration),
        resolution: DEFAULT_ULTRA_VIDEO_PRO.resolution,
        fast: DEFAULT_ULTRA_VIDEO_PRO.fast,
        aspectRatio: clampVideoAspect(draft.aspectRatio),
        generateAudio: DEFAULT_ULTRA_VIDEO_PRO.generateAudio,
        artStyleId: DEFAULT_ULTRA_VIDEO_PRO.artStyleId,
        motionStrength: DEFAULT_ULTRA_VIDEO_PRO.motionStrength ?? 35,
        videoEngine: DEFAULT_ULTRA_VIDEO_PRO.videoEngine,
        ...(bound?.kind === "video" ? { videoUrl: bound.url } : {}),
      };
    case "script":
      return {
        kind: "script",
        label,
        brief: draft.brief || draft.prompt || "",
        sceneCount: clampUltraScriptSceneCount(
          draft.sceneCount ?? ULTRA_SCRIPT_SCENE_COUNT_DEFAULT,
        ),
        sceneBeats: [],
      };
  }
}

/** Fill leftover image refs onto empty upload/character slots by slot order. */
function attachRemainingRefsBySlot(
  nodes: Node[],
  drafts: UltraPlanBoardNodeDraft[],
  refs: UltraDescribeAssetRef[],
) {
  const used = new Set(
    drafts.map((d) => d.sourceRefId).filter((id): id is string => Boolean(id)),
  );
  const leftoverImages = refs.filter(
    (r) => r.kind === "image" && !used.has(r.id),
  );
  const leftoverVideos = refs.filter(
    (r) => r.kind === "video" && !used.has(r.id),
  );

  const imageSlots = nodes
    .filter((n) => {
      const d = n.data as ProCanvasNodeData;
      return (
        (d.kind === "upload" || d.kind === "character") &&
        !("previewUrl" in d && d.previewUrl)
      );
    })
    .sort((a, b) => {
      const da = drafts.find((x) => x.id === a.id);
      const db = drafts.find((x) => x.id === b.id);
      return (da?.slot ?? 99) - (db?.slot ?? 99);
    });

  leftoverImages.forEach((ref, i) => {
    const node = imageSlots[i];
    if (!node) return;
    const data = node.data as ProCanvasNodeData;
    if (data.kind === "upload" || data.kind === "character") {
      node.data = {
        ...data,
        previewUrl: ref.url,
        fileName: ref.fileName,
      };
    }
  });

  const videoSlots = nodes.filter((n) => {
    const d = n.data as ProCanvasNodeData;
    return d.kind === "video" && !("videoUrl" in d && d.videoUrl);
  });
  leftoverVideos.forEach((ref, i) => {
    const node = videoSlots[i];
    if (!node) return;
    const data = node.data as ProCanvasNodeData;
    if (data.kind === "video") {
      node.data = { ...data, videoUrl: ref.url };
    }
  });
}

/** Sort inbound edges so slot 1 (base) is first → IMAGE 1. */
function orderedInbound(
  edges: UltraPlanBoardEdgeDraft[],
  nodes: UltraPlanBoardNodeDraft[],
  targetId: string,
): UltraPlanBoardEdgeDraft[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  return edges
    .filter((e) => e.target === targetId)
    .slice()
    .sort((a, b) => {
      const sa = a.slot ?? byId.get(a.source)?.slot ?? 99;
      const sb = b.slot ?? byId.get(b.source)?.slot ?? 99;
      if (sa !== sb) return sa - sb;
      return a.source.localeCompare(b.source);
    });
}

export function buildUltraPlanBoardGraph(
  payload: UltraPlanBoardLlmPayload,
  labels: Record<string, string> = {},
  refs: UltraDescribeAssetRef[] = [],
): UltraPlanBoardGraph {
  const allowedRefIds = new Set(refs.map((r) => r.id));
  const validated = validateUltraPlanBoardPayload(payload, { allowedRefIds });
  const refById = new Map(refs.map((r) => [r.id, r]));

  const refNodes = validated.nodes.filter(
    (n) => n.kind === "upload" || n.kind === "character",
  );
  const otherNodes = validated.nodes.filter(
    (n) => n.kind !== "upload" && n.kind !== "character",
  );
  refNodes.sort((a, b) => (a.slot ?? 99) - (b.slot ?? 99));

  const nodes: Node[] = [];
  refNodes.forEach((draft, i) => {
    nodes.push({
      id: draft.id,
      type: draft.kind,
      position: { x: 40, y: 40 + i * 160 },
      data: buildNodeData(draft, labels, refById),
    });
  });
  otherNodes.forEach((draft, i) => {
    nodes.push({
      id: draft.id,
      type: draft.kind,
      position: { x: 420, y: 40 + i * 200 },
      data: buildNodeData(draft, labels, refById),
    });
  });

  attachRemainingRefsBySlot(nodes, validated.nodes, refs);

  const edges: Edge[] = [];
  const targets = new Set(validated.edges.map((e) => e.target));
  let edgeIdx = 0;
  for (const targetId of targets) {
    for (const e of orderedInbound(validated.edges, validated.nodes, targetId)) {
      edges.push({
        id: `plan-e-${edgeIdx++}`,
        source: e.source,
        target: e.target,
      });
    }
  }

  const maxNum = validated.nodes.reduce((m, n) => {
    const match = /^n(\d+)$/i.exec(n.id);
    if (match) return Math.max(m, Number(match[1]));
    return m;
  }, validated.nodes.length);

  return {
    title: validated.title || "Described board",
    qualityNote: validated.qualityNote || "",
    nodes,
    edges,
    nodeCounterSeed: maxNum + 1,
  };
}

const SYSTEM_PROMPT = `You are Alchemy Ultra canvas planner. Return ONE JSON object only (no markdown).

Goal: turn the user's creative job into a small node graph they will fill and run manually. Do NOT invent image/video URLs. Do NOT auto-run.

Allowed node kinds: upload, character, image, video, script.
Max ${ULTRA_PLAN_BOARD_MAX_NODES} nodes, max ${ULTRA_PLAN_BOARD_MAX_EDGES} edges.

Schema:
{
  "title": "short board name",
  "qualityNote": "honest limits (refs needed, face lock, etc.)",
  "nodes": [
    {
      "id": "n1",
      "kind": "upload|character|image|video|script",
      "label": "human label",
      "alias": "CamelCaseAlias",
      "slot": 1,
      "sourceRefId": "ref1",
      "prompt": "for image/video",
      "brief": "for script or character bio",
      "aspectRatio": "9:16|4:5|1:1|16:9",
      "duration": "8",
      "sceneCount": 4
    }
  ],
  "edges": [{ "source": "n1", "target": "n2", "slot": 1 }]
}

Rules:
- ids: letter then alnum/_- only (e.g. n1, base, face1).
- aliases: letters/digits/underscore only; unique; used as @Alias in prompts.
- When USER UPLOADS are listed, set sourceRefId on upload/character/video nodes to those ref ids (ref1, ref2, …). Never invent URLs.
- For multi-subject / multi-face thumbnails or group composite edits:
  - Use ONE base upload (slot 1) for layout when a layout/base image is provided.
  - Use character nodes for each distinct face/person.
  - ONE image node. Edges from every ref → image with matching slot.
  - Image prompt MUST mention @Alias for each person and say keep exact faces; no invented text/logos unless asked.
  - Prefer aspectRatio "16:9" for landscape thumbnails, "9:16" for stories, "1:1" for square.
- Prefer the smallest graph that does the job.
- qualityNote must warn when more face refs are still needed.
- Never include imageUrl, videoUrl, previewUrl, or file contents.`;

export function normalizeUltraDescribeRefs(
  raw: unknown,
): UltraDescribeAssetRef[] {
  if (!Array.isArray(raw)) return [];
  const out: UltraDescribeAssetRef[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < raw.length && out.length < ULTRA_PLAN_BOARD_MAX_USER_REFS; i++) {
    const item = raw[i];
    if (!item || typeof item !== "object") continue;
    const rec = item as Record<string, unknown>;
    const idRaw = typeof rec.id === "string" ? rec.id.trim() : `ref${i + 1}`;
    const id = ID_RE.test(idRaw) ? idRaw : `ref${i + 1}`;
    if (seen.has(id)) continue;
    const url = typeof rec.url === "string" ? rec.url.trim() : "";
    if (!url) continue;
    const kind = rec.kind === "video" ? "video" : "image";
    seen.add(id);
    out.push({
      id,
      url,
      kind,
      fileName:
        typeof rec.fileName === "string"
          ? rec.fileName.trim().slice(0, 120)
          : undefined,
      roleHint:
        typeof rec.roleHint === "string"
          ? rec.roleHint.trim().slice(0, 40)
          : undefined,
    });
  }
  return out;
}

async function analyzeRefsForPlan(
  refs: UltraDescribeAssetRef[],
  description: string,
): Promise<string> {
  if (refs.length === 0) return "";
  const { analyzeConceptReferenceImage, conceptImageVisionBlock } = await import(
    "@/lib/concept-image-vision"
  );
  const lines: string[] = ["USER UPLOADS (bind with sourceRefId):"];
  for (const ref of refs) {
    if (ref.kind === "video") {
      lines.push(
        `- ${ref.id} [video] file=${ref.fileName || "video"} roleHint=${ref.roleHint || "n/a"} — use as motion/reference context; bind to a video node via sourceRefId if appropriate.`,
      );
      continue;
    }
    try {
      const vision = await analyzeConceptReferenceImage({
        imageUrl: ref.url,
        conceptIdea: description.slice(0, 400),
      });
      lines.push(
        `- ${ref.id} [image] file=${ref.fileName || "image"} roleHint=${ref.roleHint || "n/a"} :: ${conceptImageVisionBlock(vision)}`,
      );
    } catch {
      lines.push(
        `- ${ref.id} [image] file=${ref.fileName || "image"} roleHint=${ref.roleHint || "n/a"} — (vision unavailable; still bind this ref)`,
      );
    }
  }
  return lines.join("\n");
}

export async function planUltraBoardFromDescription(opts: {
  description: string;
  labels?: Record<string, string>;
  refs?: UltraDescribeAssetRef[];
}): Promise<UltraPlanBoardGraph> {
  const description = opts.description.trim();
  if (!description) throw new Error("Description is required.");
  if (description.length > 4000) {
    throw new Error("Description is too long (max 4000 characters).");
  }
  const refs = opts.refs ?? [];

  const analysis = await analyzeRefsForPlan(refs, description);

  const raw = await callDeepSeekChat(
    [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: [
          `Creative job:\n${description}`,
          analysis || "USER UPLOADS: none",
          "Return the JSON plan now.",
        ].join("\n\n"),
      },
    ],
    { temperature: 0.3, max_tokens: 3500, jsonObject: true },
  );

  const parsed = parseLlmJsonObject<UltraPlanBoardLlmPayload>(
    raw,
    "Ultra plan board",
  );
  return buildUltraPlanBoardGraph(parsed, opts.labels ?? {}, refs);
}
