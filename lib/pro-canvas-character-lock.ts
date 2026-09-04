import type { Edge, Node } from "@xyflow/react";
import type { CanvasImageSource, CharacterNodeData, ProCanvasNodeData } from "@/lib/pro-canvas-types";
import {
  mentionedNodesInOrder,
  nodeAlias,
  upstreamNodes,
} from "@/lib/pro-canvas-graph";
import { isHttpOrLibraryMediaUrl } from "@/lib/storage/library-asset-url";

/** Prompt for text-to-image character reference sheet (identity lock). */
export function buildCharacterSheetPrompt(opts: {
  alias: string;
  biography?: string;
  generatePrompt?: string;
}): string {
  const detail =
    opts.generatePrompt?.trim() ||
    opts.biography?.trim() ||
    "young adult, natural grounded look, everyday clothes";
  const alias = opts.alias.trim() || "Person";
  return (
    `Photoreal character reference sheet for AI identity lock. ` +
    `Character @${alias}: ${detail}. ` +
    `Front-facing head-and-shoulders portrait, clean neutral studio background, even soft light, sharp face, natural skin texture. ` +
    `Single person only — consistent face, hair, outfit. No text, no watermark, no logo, no collage, no split views unless requested.`
  );
}

/** Multi-angle turnaround from an existing face lock (compose / edit). */
export function buildCharacterAnglesPrompt(opts: {
  alias: string;
  biography?: string;
}): string {
  const alias = opts.alias.trim() || "Person";
  const bio = opts.biography?.trim();
  return (
    `Photoreal character turnaround sheet for identity lock of @${alias}. ` +
    (bio ? `${bio}. ` : "") +
    `IMAGE 1 is the locked face/outfit — keep EXACT same person, hair, clothes, age. ` +
    `Layout: clean 2x2 contact sheet on neutral studio background — ` +
    `(1) front head-and-shoulders, (2) three-quarter left, (3) three-quarter right, (4) side profile. ` +
    `Even soft light, sharp skin, no text, no watermark, no logos, no extra people.`
  );
}

/** Environment / set expansion sheet from world bible (+ optional ref image). */
export function buildWorldSpacePrompt(opts: {
  description: string;
  alias?: string;
  hasRefImage?: boolean;
}): string {
  const desc =
    opts.description.trim() ||
    "Contemporary interior space with consistent lighting and set dressing";
  const alias = opts.alias?.trim() || "World";
  const ref = opts.hasRefImage
    ? `IMAGE 1 is a set reference — expand it into a full continuous space matching that room. `
    : "";
  return (
    `Photoreal environment concept sheet for @${alias} continuity lock. ${ref}` +
    `World bible: ${desc}. ` +
    `Layout: one clean sheet with 2 large establishing views on top (wide + opposite angle of the SAME room) ` +
    `and 4 smaller detail plates below (key props / corners / light sources). ` +
    `Same location, same lighting language, cinematic but grounded. No people, no text, no logos, no comic panels of a story.`
  );
}

function escapeRegexAlias(alias: string): string {
  return alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Identity lock clause for compose / still prompts. */
export function characterIdentityClause(
  alias: string,
  biography?: string,
): string {
  const bio = biography?.trim();
  return bio
    ? `[角色锁定] @${alias} — ${bio}. Reuse EXACT face, hair, outfit from IMAGE ref — do NOT recast.`
    : `[角色锁定] @${alias} — reuse EXACT person from IMAGE ref (face, hair, outfit). Do NOT recast.`;
}

/** Text-to-video: describe identity without IMAGE ref slot. */
export function characterIdentityClauseTextOnly(
  alias: string,
  biography?: string,
): string {
  const bio = biography?.trim();
  return bio
    ? `[角色锁定] @${alias} — ${bio}. Same person throughout — match face, hair, outfit.`
    : `[角色锁定] @${alias} — same person throughout — consistent face, hair, outfit.`;
}

/** Characters @mentioned or directly connected upstream — not via script-only paths. */
export function collectScopedCharacterNodes(
  nodeId: string,
  prompt: string,
  nodes: Node[],
  edges: Edge[],
): Node[] {
  const mentioned = mentionedNodesInOrder(prompt, nodes);
  const connected = upstreamNodes(nodeId, nodes, edges);
  const seen = new Set<string>();
  const result: Node[] = [];
  for (const n of [...mentioned, ...connected]) {
    if ((n.data as ProCanvasNodeData).kind !== "character") continue;
    if (seen.has(n.id)) continue;
    seen.add(n.id);
    result.push(n);
  }
  return result;
}

export function collectScopedCharacterSources(
  nodeId: string,
  prompt: string,
  nodes: Node[],
  edges: Edge[],
  getFile?: (id: string) => File | undefined,
): CanvasImageSource[] {
  const sources: CanvasImageSource[] = [];
  for (const n of collectScopedCharacterNodes(nodeId, prompt, nodes, edges)) {
    const char = n.data as CharacterNodeData;
    const file = getFile?.(n.id);
    const url =
      (char.angleSheetUrl && isHttpOrLibraryMediaUrl(char.angleSheetUrl)
        ? char.angleSheetUrl
        : char.previewUrl) ?? undefined;
    if (file) {
      sources.push({ nodeId: n.id, alias: nodeAlias(n), file });
    } else if (url && isHttpOrLibraryMediaUrl(url)) {
      sources.push({ nodeId: n.id, alias: nodeAlias(n), url });
    }
  }
  return sources;
}

export function mergeCharacterSourcesInto(
  sources: CanvasImageSource[],
  characterSources: CanvasImageSource[],
): CanvasImageSource[] {
  const seen = new Set(sources.map((s) => s.nodeId));
  const merged = [...sources];
  for (const src of characterSources) {
    if (seen.has(src.nodeId)) continue;
    seen.add(src.nodeId);
    merged.unshift(src);
  }
  return merged;
}

function hasCharacterLockForAlias(prompt: string, alias: string): boolean {
  const re = new RegExp(`\\[角色锁定\\][^\n]*@${escapeRegexAlias(alias)}(?=\\s|$|[^\\w])`);
  return re.test(prompt);
}

export function appendCharacterLockToPrompt(
  prompt: string,
  characterNodes: Node[],
  opts?: { getFile?: (id: string) => File | undefined; textOnly?: boolean },
): string {
  const clauses: string[] = [];
  for (const n of characterNodes) {
    const char = n.data as CharacterNodeData;
    const alias = nodeAlias(n);
    if (hasCharacterLockForAlias(prompt, alias)) continue;
    const file = opts?.getFile?.(n.id);
    const url =
      (char.angleSheetUrl && isHttpOrLibraryMediaUrl(char.angleSheetUrl)
        ? char.angleSheetUrl
        : char.previewUrl) ?? undefined;
    const hasRef = opts?.textOnly || Boolean(file) || Boolean(url && isHttpOrLibraryMediaUrl(url));
    if (!hasRef) continue;
    clauses.push(
      opts?.textOnly
        ? characterIdentityClauseTextOnly(alias, char.biography)
        : characterIdentityClause(alias, char.biography),
    );
  }
  if (!clauses.length) return prompt;
  const trimmed = prompt.trim();
  return trimmed
    ? `${trimmed}\n\n${clauses.join("\n")}`
    : clauses.join("\n");
}
