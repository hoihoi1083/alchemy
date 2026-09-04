/**
 * Live director checklist statuses derived from the Ultra board graph.
 * Order: Script → Stills → VO → Videos → Splice (+ optional prep layers).
 */

import type { Node } from "@xyflow/react";
import type {
  ProCanvasNodeData,
  ScriptNodeData,
  StoryboardNodeData,
  VoiceNodeData,
} from "@/lib/pro-canvas-types";
import { audioUrlFromNode, videoUrlFromNode, imageUrlFromNode } from "@/lib/pro-canvas-graph";
import { isAutoSpawnedSceneNodeId } from "@/lib/pro-canvas-spawn";
import { isHttpOrLibraryMediaUrl } from "@/lib/storage/library-asset-url";
import { flattenStoryboardPanels } from "@/lib/pro-canvas-storyboard";
import { scriptDialogueFingerprint } from "@/lib/pro-canvas-script-plan";

export type CreativeBStepId =
  | "brainstorm"
  | "cast"
  | "world"
  | "script"
  | "storyboard"
  | "voice"
  | "videos"
  | "splice";

export type CreativeBStepStatus = {
  id: CreativeBStepId;
  done: boolean;
  /** Upstream dialogue/plan changed after this step's output was produced. */
  stale?: boolean;
};

function kindOf(n: Node): string {
  return (n.data as ProCanvasNodeData).kind;
}

export function computeCreativeBStepStatuses(nodes: Node[]): CreativeBStepStatus[] {
  const brainstorm = nodes.find((n) => kindOf(n) === "brainstorm");
  const brainstormReady = Boolean(
    brainstorm &&
      ((brainstorm.data as { selectedOptionId?: string }).selectedOptionId ||
        ((brainstorm.data as { options?: unknown[] }).options?.length ?? 0) > 0),
  );

  const characters = nodes.filter((n) => kindOf(n) === "character");
  const castReady =
    characters.length >= 1 &&
    characters.some((n) => {
      const d = n.data as { previewUrl?: string; angleSheetUrl?: string };
      return (
        isHttpOrLibraryMediaUrl(d.previewUrl) ||
        isHttpOrLibraryMediaUrl(d.angleSheetUrl)
      );
    });

  const world = nodes.find((n) => kindOf(n) === "world");
  const worldReady = Boolean(
    world &&
      (String((world.data as { description?: string }).description ?? "").trim() ||
        isHttpOrLibraryMediaUrl((world.data as { spaceSheetUrl?: string }).spaceSheetUrl)),
  );

  const script = nodes.find((n) => kindOf(n) === "script");
  const scriptData = script?.data as ScriptNodeData | undefined;
  const scriptReady = Boolean(
    scriptData &&
      ((scriptData.scenePrompts?.length ?? 0) > 0 ||
        (scriptData.sceneBeats ?? []).some((b) => b.line?.trim())),
  );
  const dialogueFp = scriptDialogueFingerprint(scriptData?.sceneBeats);

  const board = nodes.find((n) => kindOf(n) === "storyboard");
  const panels = board
    ? flattenStoryboardPanels(board.data as StoryboardNodeData)
    : [];
  const stillsReady =
    panels.length > 0 &&
    panels.some((p) => isHttpOrLibraryMediaUrl(p.imageUrl));
  const storyboardReady = panels.length > 0;
  const boardDialogueFp = panels
    .map((p) => `${(p.speaker ?? "").trim()}|${(p.dialogue ?? "").trim()}`)
    .join("\n");
  const storyboardStale =
    storyboardReady &&
    Boolean(dialogueFp) &&
    boardDialogueFp.length > 0 &&
    boardDialogueFp !== dialogueFp;

  const spawnedImages = nodes.filter(
    (n) => kindOf(n) === "image" && isAutoSpawnedSceneNodeId(n.id),
  );
  const spawnedVideos = nodes.filter(
    (n) =>
      (kindOf(n) === "video" || kindOf(n) === "textVideo") &&
      isAutoSpawnedSceneNodeId(n.id),
  );
  const imageStillsReady =
    stillsReady ||
    (spawnedImages.length > 0 &&
      spawnedImages.some((n) => isHttpOrLibraryMediaUrl(imageUrlFromNode(n))));

  const voice = nodes.find((n) => kindOf(n) === "voice");
  const voiceData = voice?.data as VoiceNodeData | undefined;
  const voiceReady = Boolean(voice && isHttpOrLibraryMediaUrl(audioUrlFromNode(voice)));
  const voiceSourceFp =
    (voiceData as { dialogueSourceFingerprint?: string } | undefined)
      ?.dialogueSourceFingerprint ?? "";
  const voiceStale =
    voiceReady && Boolean(dialogueFp) && voiceSourceFp !== dialogueFp;

  const videosReady =
    spawnedVideos.length > 0 &&
    spawnedVideos.every((n) => isHttpOrLibraryMediaUrl(videoUrlFromNode(n)));
  const videosStale =
    videosReady &&
    Boolean(dialogueFp) &&
    spawnedVideos.some((n) => {
      const prompt = String((n.data as { prompt?: string }).prompt ?? "");
      const beatLine = scriptData?.sceneBeats?.[(n.data as { sceneIndex?: number }).sceneIndex ?? -1]
        ?.line?.trim();
      if (!beatLine) return false;
      return !prompt.toLowerCase().includes(beatLine.toLowerCase());
    });

  const splice = nodes.find((n) => kindOf(n) === "splice");
  const spliceReady = Boolean(splice && isHttpOrLibraryMediaUrl(videoUrlFromNode(splice)));
  const spliceStale = spliceReady && (voiceStale || videosStale);

  return [
    { id: "brainstorm", done: brainstormReady },
    { id: "cast", done: castReady },
    { id: "world", done: worldReady },
    { id: "script", done: scriptReady },
    {
      id: "storyboard",
      done: storyboardReady && imageStillsReady,
      stale: storyboardStale,
    },
    { id: "voice", done: voiceReady, stale: voiceStale },
    { id: "videos", done: videosReady, stale: videosStale },
    { id: "splice", done: spliceReady, stale: spliceStale },
  ];
}
