"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { AddNodePalette } from "@/components/pro/AddNodePalette";
import { ProCanvasActionsProvider } from "@/components/pro/ProCanvasActions";
import { TaskQueuePanel } from "@/components/pro/TaskQueuePanel";
import { UltraCanvasConfirmDialog } from "@/components/pro/UltraCanvasConfirmDialog";
import { UltraCanvasRightRail } from "@/components/pro/UltraCanvasRightRail";
import { UltraCanvasToolbar } from "@/components/pro/UltraCanvasToolbar";
import { AudioNode } from "@/components/pro/nodes/AudioNode";
import { BackgroundModNode } from "@/components/pro/nodes/BackgroundModNode";
import { BrandNode } from "@/components/pro/nodes/BrandNode";
import { CameraNode } from "@/components/pro/nodes/CameraNode";
import { CharacterNode } from "@/components/pro/nodes/CharacterNode";
import { GradeModNode } from "@/components/pro/nodes/GradeModNode";
import { ImageNode } from "@/components/pro/nodes/ImageNode";
import { LightingModNode } from "@/components/pro/nodes/LightingModNode";
import { ResearchNode } from "@/components/pro/nodes/ResearchNode";
import { ScriptNode } from "@/components/pro/nodes/ScriptNode";
import { SpliceNode } from "@/components/pro/nodes/SpliceNode";
import { StoryboardNode } from "@/components/pro/nodes/StoryboardNode";
import { TextNode } from "@/components/pro/nodes/TextNode";
import { TextVideoNode } from "@/components/pro/nodes/TextVideoNode";
import { UploadNode } from "@/components/pro/nodes/UploadNode";
import { VideoNode } from "@/components/pro/nodes/VideoNode";
import { VoiceNode } from "@/components/pro/nodes/VoiceNode";
import { WorldNode } from "@/components/pro/nodes/WorldNode";
import { BrainstormNode } from "@/components/pro/nodes/BrainstormNode";
import {
  UltraCanvasCreativeBBanner,
  wasCreativeBHintDismissed,
} from "@/components/pro/UltraCanvasCreativeBBanner";
import { useLocale } from "@/components/LocaleProvider";
import { useUserPlanEntitlements } from "@/hooks/useUserPlanEntitlements";
import {
  cannotAfford,
  insufficientTokensMessage,
} from "@/lib/billing/estimate-job-tokens";
import { cameraPromptSuffix } from "@/lib/pro-canvas-camera";
import {
  audioUrlFromNode,
  collectOrderedImageSources,
  findMissingImageSources,
  imageUrlFromNode,
  resolveCanvasImagePrompt,
  resolveCanvasVideoPrompt,
  resolveMentions,
  runnableExecutionOrder,
  runnableLabel,
  scriptScenePromptsFromNode,
  scriptSceneImagePromptsFromNode,
  nodeAlias,
  nodeHasRunnableOutput,
  textFromNode,
  upstreamNodes,
  upstreamNodesSorted,
  videoUrlFromNode,
  worldDescriptionFromNodes,
  allUpstreamNodes,
} from "@/lib/pro-canvas-graph";
import {
  appendCharacterLockToPrompt,
  buildCharacterAnglesPrompt,
  buildCharacterSheetPrompt,
  buildWorldSpacePrompt,
  collectScopedCharacterNodes,
  collectScopedCharacterSources,
  mergeCharacterSourcesInto,
} from "@/lib/pro-canvas-character-lock";
import {
  collectSpawnPipelineSources,
  edgesFromVideosToSplice,
  scriptHasSpawnedSceneOutputs,
  collectScriptUpstreamCharacters,
  charactersForSpawnedScene,
  edgesForSceneCharacterCast,
  findSpawnedImageNodeBySceneIndex,
  findSpawnedVideoNodeBySceneIndex,
  stillUrlsFromStoryboardPanels,
  stillUrlsFromBoardStoryboard,
  storyboardStillPatchesForSceneImages,
} from "@/lib/pro-canvas-spawn";
import { ULTRA_VIDEO_MAX_REF_IMAGES } from "@/lib/pro-canvas-compose";
import {
  edgePriorSceneKeyframe,
  filterSpawnResourcesForScene,
  planSceneContinuity,
  scriptBeatAt,
} from "@/lib/pro-canvas-scene-continuity";
import {
  computeNodeInputFingerprint,
  isNodeOutputStale,
  nodeNeedsRun,
} from "@/lib/pro-canvas-stale";
import {
  dialogueScriptFromNodes,
  flattenStoryboardPanels,
  groupPanelsIntoActs,
  regroupStoryboardActs,
  syncStoryboardPanelsFromScript,
  voiceLinesFromNodes,
  voiceLinesToCaptionPayload,
} from "@/lib/pro-canvas-storyboard";
import { motionPromptWithDialogue, scriptDialogueFingerprint } from "@/lib/pro-canvas-script-plan";
import { sceneDurationsFromBeats } from "@/lib/pro-canvas-scene-duration";
import { computeCreativeBStepStatuses } from "@/lib/pro-canvas-creative-b-checklist";
import {
  createProCanvasStarter,
} from "@/lib/pro-canvas-starter";
import {
  DEFAULT_BACKGROUND_MOD_PRESET,
  DEFAULT_GRADE_ART_STYLE,
  DEFAULT_LIGHTING_MOD_PRESET,
} from "@/lib/pro-canvas-modifiers";
import {
  createUltraCanvasTemplate,
  ULTRA_CANVAS_TEMPLATE_IDS,
  type UltraCanvasTemplateId,
} from "@/lib/ultra-canvas-templates";
import { estimateRunAllTokens, spliceUpstreamHasMusic } from "@/lib/ultra-canvas-run-all";
import {
  deserializeUltraCanvasSnapshot,
  serializeUltraCanvasSnapshot,
} from "@/lib/ultra-canvas-snapshot";
import {
  DEFAULT_ULTRA_IMAGE_PRO,
  DEFAULT_ULTRA_VIDEO_PRO,
  estimateCanvasSpliceTokens,
  videoProFromNodeData,
} from "@/lib/ultra-pro-controls";
import { shouldBlockUltraCanvasSave, tryAcquireRunAllLatch } from "@/lib/ultra-canvas-guards";
import {
  clearUltraResearchHandoff,
  mergeResearchHandoffIntoNodes,
  readUltraResearchHandoff,
} from "@/lib/ultra-research-handoff";
import { isHttpOrLibraryMediaUrl } from "@/lib/storage/library-asset-url";
import {
  runCanvasCameraNode,
  runCanvasImageNode,
  runCanvasScriptNode,
  runCanvasSpliceNode,
  runCanvasTextVideoNode,
  runCanvasVideoNode,
  runCanvasVoiceNode,
  uploadCanvasAsset,
} from "@/lib/pro-canvas-runner";
import type {
  AudioNodeData,
  CameraNodeData,
  CharacterNodeData,
  ImageNodeData,
  ProCanvasNodeData,
  ProCanvasNodeKind,
  ScriptNodeData,
  TaskQueueItem,
  TextVideoNodeData,
  VideoNodeData,
  VoiceNodeData,
  WorldNodeData,
  BrainstormNodeData,
  StoryboardNodeData,
} from "@/lib/pro-canvas-types";

const nodeTypes = {
  upload: UploadNode,
  image: ImageNode,
  video: VideoNode,
  text: TextNode,
  audio: AudioNode,
  camera: CameraNode,
  script: ScriptNode,
  splice: SpliceNode,
  textVideo: TextVideoNode,
  lighting: LightingModNode,
  background: BackgroundModNode,
  grade: GradeModNode,
  brand: BrandNode,
  character: CharacterNode,
  research: ResearchNode,
  world: WorldNode,
  storyboard: StoryboardNode,
  voice: VoiceNode,
  brainstorm: BrainstormNode,
};

type CanvasSnapshot = { nodes: Node[]; edges: Edge[] };

let nodeCounter = 0;

function withNotChargedNote(message: string, note: string): string {
  if (/not enough tokens|insufficient_tokens|token 不足/i.test(message)) return message;
  if (message.includes(note)) return message;
  return `${message} ${note}`;
}

function defaultNodeData(kind: ProCanvasNodeKind, label: string): ProCanvasNodeData {
  switch (kind) {
    case "upload":
      return { kind, label };
    case "image":
      return {
        kind,
        label,
        prompt: "Premium vertical social ad, soft studio lighting, clean background",
        aspectRatio: DEFAULT_ULTRA_IMAGE_PRO.aspectRatio,
        resolution: DEFAULT_ULTRA_IMAGE_PRO.resolution,
        artStyleId: DEFAULT_ULTRA_IMAGE_PRO.artStyleId,
        lightingPreset: DEFAULT_ULTRA_IMAGE_PRO.lightingPreset,
        backgroundPreset: DEFAULT_ULTRA_IMAGE_PRO.backgroundPreset,
      };
    case "video":
      return {
        kind,
        label,
        prompt: "Subtle natural motion, stable camera, cinematic lighting",
        camera: DEFAULT_ULTRA_VIDEO_PRO.camera,
        duration: DEFAULT_ULTRA_VIDEO_PRO.duration,
        resolution: DEFAULT_ULTRA_VIDEO_PRO.resolution,
        fast: DEFAULT_ULTRA_VIDEO_PRO.fast,
        aspectRatio: DEFAULT_ULTRA_VIDEO_PRO.aspectRatio,
        generateAudio: DEFAULT_ULTRA_VIDEO_PRO.generateAudio,
        artStyleId: DEFAULT_ULTRA_VIDEO_PRO.artStyleId,
        motionStrength: DEFAULT_ULTRA_VIDEO_PRO.motionStrength ?? 35,
      };
    case "text":
      return { kind, label, text: "" };
    case "audio":
      return { kind, label };
    case "camera":
      return { kind, label, preset: "custom", spin: 0, tilt: 30, zoom: 50, promptExtra: "" };
    case "script":
      return {
        kind,
        label,
        brief: "",
        sceneCount: 6,
        sceneBeats: [],
      };
    case "splice":
      return { kind, label };
    case "textVideo":
      return {
        kind,
        label,
        prompt: "",
        duration: DEFAULT_ULTRA_VIDEO_PRO.duration,
        resolution: DEFAULT_ULTRA_VIDEO_PRO.resolution,
        fast: DEFAULT_ULTRA_VIDEO_PRO.fast,
        aspectRatio: DEFAULT_ULTRA_VIDEO_PRO.aspectRatio,
        generateAudio: DEFAULT_ULTRA_VIDEO_PRO.generateAudio,
        artStyleId: DEFAULT_ULTRA_VIDEO_PRO.artStyleId,
        motionStrength: DEFAULT_ULTRA_VIDEO_PRO.motionStrength ?? 35,
      };
    case "lighting":
      return { kind, label, preset: DEFAULT_LIGHTING_MOD_PRESET };
    case "background":
      return { kind, label, preset: DEFAULT_BACKGROUND_MOD_PRESET };
    case "grade":
      return { kind, label, artStyleId: DEFAULT_GRADE_ART_STYLE };
    case "brand":
      return { kind, label, alias: "brand" };
    case "character":
      return { kind, label, alias: "Person", biography: "" };
    case "research":
      return { kind, label, summary: "" };
    case "world":
      return { kind, label, alias: "World", description: "" };
    case "storyboard":
      return { kind, label, panels: [], acts: [] };
    case "voice":
      return {
        kind,
        label,
        script: "",
        locale: "en",
        voicePresetId: "en-male",
      };
    case "brainstorm":
      return { kind, label, idea: "", durationSec: 20 };
  }
}

function ProCanvasBoard({ initialTemplate }: { initialTemplate?: string | null }) {
  const { m } = useLocale();
  const { creditBalance, planReady } = useUserPlanEntitlements();
  const templateLoadedRef = useRef(false);
  const [dirtyTick, setDirtyTick] = useState(0);
  const starter = useMemo(
    () => createProCanvasStarter(m.ultraCanvas.nodeLabels),
    [m.ultraCanvas.nodeLabels],
  );
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(starter.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(starter.edges);
  const uploadFiles = useRef<Map<string, File>>(new Map());
  const audioFiles = useRef<Map<string, File>>(new Map());
  const [queue, setQueue] = useState<TaskQueueItem[]>([]);
  const [runningAll, setRunningAll] = useState(false);
  const [boardId, setBoardId] = useState<string | null>(null);
  const [boardName, setBoardName] = useState("Untitled board");
  const [saving, setSaving] = useState(false);
  const [saveSuccessAt, setSaveSuccessAt] = useState<number | null>(null);
  const [loadingBoard, setLoadingBoard] = useState(false);
  const [boardError, setBoardError] = useState<string | null>(null);
  const [showCreativeBHint, setShowCreativeBHint] = useState(
    () => !wasCreativeBHintDismissed(),
  );
  const [confirmState, setConfirmState] = useState<{
    title: string;
    message: string;
    destructive?: boolean;
    onConfirm: () => void;
  } | null>(null);
  const [mobilePaletteOpen, setMobilePaletteOpen] = useState(false);
  const [desktopPaletteOpen, setDesktopPaletteOpen] = useState(false);
  const historyRef = useRef<CanvasSnapshot[]>([]);
  const historyIndexRef = useRef(0);
  const skipHistoryRef = useRef(false);
  const counterSeeded = useRef(false);
  if (!counterSeeded.current) {
    nodeCounter = starter.nodeCounterSeed;
    counterSeeded.current = true;
  }

  const nodesRef = useRef<Node[]>(starter.nodes);
  const edgesRef = useRef<Edge[]>(starter.edges);
  const runAllAbortRef = useRef<AbortController | null>(null);
  const canvasSessionRef = useRef(0);
  const runningAllRef = useRef(false);
  const historyDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirtyRef = useRef(false);

  const boardBusy = useMemo(
    () =>
      runningAll ||
      nodes.some((n) => Boolean((n.data as ProCanvasNodeData).busy)),
    [nodes, runningAll],
  );

  useEffect(() => {
    runningAllRef.current = runningAll;
  }, [runningAll]);

  /** Block starting a single-node run while Run all or another node is busy. */
  const guardSingleRunStart = useCallback((): boolean => {
    if (runningAllRef.current) return false;
    if (
      nodesRef.current.some((n) =>
        Boolean((n.data as ProCanvasNodeData).busy),
      )
    ) {
      return false;
    }
    return true;
  }, []);

  const resetCanvasRuntime = useCallback(() => {
    canvasSessionRef.current += 1;
    runAllAbortRef.current?.abort();
    runAllAbortRef.current = null;
    uploadFiles.current.clear();
    audioFiles.current.clear();
    setRunningAll(false);
    runningAllRef.current = false;
    setQueue([]);
  }, []);

  const guardBusyNav = useCallback(() => {
    if (!boardBusy) return true;
    setBoardError(m.ultraCanvas.busyNavBlocked);
    return false;
  }, [boardBusy, m.ultraCanvas.busyNavBlocked]);

  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);
  useEffect(() => {
    edgesRef.current = edges;
  }, [edges]);

  const getLiveNodes = useCallback(() => nodesRef.current, []);
  const getLiveEdges = useCallback(() => edgesRef.current, []);
  const getLiveNode = useCallback(
    (id: string) => nodesRef.current.find((n) => n.id === id),
    [],
  );

  const markDirty = useCallback(() => {
    dirtyRef.current = true;
    setDirtyTick((t) => t + 1);
  }, []);

  const askConfirm = useCallback(
    (
      title: string,
      message: string,
      onConfirm: () => void,
      destructive = false,
    ) => {
      setConfirmState({ title, message, onConfirm, destructive });
    },
    [],
  );

  const tryDiscardThen = useCallback(
    (action: () => void) => {
      if (!guardBusyNav()) return;
      if (!dirtyRef.current) {
        action();
        return;
      }
      askConfirm(
        m.ultraCanvas.discardConfirmTitle,
        m.ultraCanvas.discardConfirm,
        action,
      );
    },
    [
      askConfirm,
      guardBusyNav,
      m.ultraCanvas.discardConfirm,
      m.ultraCanvas.discardConfirmTitle,
    ],
  );

  const snapshotCanvas = useCallback((): CanvasSnapshot => {
    return JSON.parse(
      JSON.stringify({ nodes: nodesRef.current, edges: edgesRef.current }),
    );
  }, []);

  const scheduleHistory = useCallback(() => {
    queueMicrotask(() => {
      if (skipHistoryRef.current) return;
      const snap = snapshotCanvas();
      let stack = historyRef.current.slice(0, historyIndexRef.current + 1);
      const last = stack[stack.length - 1];
      if (
        last &&
        JSON.stringify(last.nodes) === JSON.stringify(snap.nodes) &&
        JSON.stringify(last.edges) === JSON.stringify(snap.edges)
      ) {
        return;
      }
      stack.push(snap);
      if (stack.length > 40) stack = stack.slice(-40);
      historyRef.current = stack;
      historyIndexRef.current = stack.length - 1;
    });
  }, [snapshotCanvas]);

  const scheduleHistoryDebounced = useCallback(() => {
    if (historyDebounceRef.current) clearTimeout(historyDebounceRef.current);
    historyDebounceRef.current = setTimeout(() => {
      scheduleHistory();
    }, 500);
  }, [scheduleHistory]);

  const updateNodeData = useCallback(
    (nodeId: string, patch: Record<string, unknown>, session?: number) => {
      if (session !== undefined && session !== canvasSessionRef.current) return;
      setNodes((nds) => {
        const next = nds.map((n) =>
          n.id === nodeId ? { ...n, data: { ...n.data, ...patch } } : n,
        );
        nodesRef.current = next;
        return next;
      });
      const transientOnly = Object.keys(patch).every((k) => k === "busy" || k === "error");
      if (!transientOnly) {
        markDirty();
        scheduleHistoryDebounced();
      }
    },
    [markDirty, scheduleHistoryDebounced, setNodes],
  );

  const onBoardNameChange = useCallback(
    (name: string) => {
      setBoardName(name);
      markDirty();
    },
    [markDirty],
  );

  const applySnapshot = useCallback(
    (snap: CanvasSnapshot) => {
      skipHistoryRef.current = true;
      nodesRef.current = snap.nodes;
      edgesRef.current = snap.edges;
      setNodes(snap.nodes);
      setEdges(snap.edges);
      skipHistoryRef.current = false;
    },
    [setEdges, setNodes],
  );

  const undo = useCallback(() => {
    if (historyIndexRef.current <= 0) return;
    historyIndexRef.current -= 1;
    applySnapshot(historyRef.current[historyIndexRef.current]!);
  }, [applySnapshot]);

  const redo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    historyIndexRef.current += 1;
    applySnapshot(historyRef.current[historyIndexRef.current]!);
  }, [applySnapshot]);

  const duplicateSelectedNodes = useCallback(() => {
    const selected = getLiveNodes().filter((n) => n.selected);
    if (!selected.length) return;
    const clones: Node[] = [];
    selected.forEach((n) => {
      nodeCounter += 1;
      const data = n.data as ProCanvasNodeData;
      const baseAlias = data.alias?.trim();
      clones.push({
        ...n,
        id: `${n.type}-${nodeCounter}`,
        position: { x: n.position.x + 40, y: n.position.y + 40 },
        selected: true,
        data: {
          ...data,
          busy: false,
          error: undefined,
          alias: baseAlias ? `${baseAlias}_copy` : data.alias,
        },
      });
    });
    setNodes((nds) => {
      const next = [...nds.map((n) => ({ ...n, selected: false })), ...clones.map((c) => ({ ...c, selected: true }))];
      nodesRef.current = next;
      return next;
    });
    markDirty();
    scheduleHistory();
  }, [getLiveNodes, markDirty, scheduleHistory, setNodes]);

  const deleteSelectedNodes = useCallback(() => {
    const selectedIds = new Set(getLiveNodes().filter((n) => n.selected).map((n) => n.id));
    if (!selectedIds.size) return;
    setNodes((nds) => {
      const next = nds.filter((n) => !selectedIds.has(n.id));
      nodesRef.current = next;
      return next;
    });
    setEdges((eds) => {
      const next = eds.filter((e) => !selectedIds.has(e.source) && !selectedIds.has(e.target));
      edgesRef.current = next;
      return next;
    });
    markDirty();
    scheduleHistory();
  }, [getLiveNodes, markDirty, scheduleHistory, setEdges, setNodes]);

  const resetHistory = useCallback(
    (snap?: CanvasSnapshot) => {
      const initial = snap ?? snapshotCanvas();
      historyRef.current = [initial];
      historyIndexRef.current = 0;
    },
    [snapshotCanvas],
  );

  const loadTemplate = useCallback(
    (templateId: UltraCanvasTemplateId) => {
      tryDiscardThen(() => {
        resetCanvasRuntime();
        const labels = {
          ...m.ultraCanvas.nodeLabels,
          lighting: m.ultraCanvas.nodeLabels.lighting ?? "Lighting",
          background: m.ultraCanvas.nodeLabels.background ?? "Background",
          grade: m.ultraCanvas.nodeLabels.grade ?? "Look grade",
        } as Record<string, string>;
        const tpl = createUltraCanvasTemplate(templateId, labels);
        const handoff = readUltraResearchHandoff();
        const { nodes: nodesWithHandoff, applied: handoffApplied } =
          mergeResearchHandoffIntoNodes(tpl.nodes, handoff);
        if (handoffApplied) clearUltraResearchHandoff();
        nodesRef.current = nodesWithHandoff;
        edgesRef.current = tpl.edges;
        setNodes(nodesWithHandoff);
        setEdges(tpl.edges);
        nodeCounter = tpl.nodeCounterSeed;
        setQueue([]);
        setBoardId(null);
        setBoardName(m.ultraCanvas.templates[templateId].name);
        dirtyRef.current = false;
        resetHistory({ nodes: nodesWithHandoff, edges: tpl.edges });
        if (handoffApplied) {
          setBoardError(m.ultraCanvas.researchHandoffImported);
          window.setTimeout(() => setBoardError(null), 4000);
        }
        setShowCreativeBHint(!wasCreativeBHintDismissed());
      });
    },
    [
      tryDiscardThen,
      m.ultraCanvas.nodeLabels,
      m.ultraCanvas.templates,
      m.ultraCanvas.researchHandoffImported,
      resetCanvasRuntime,
      resetHistory,
      setBoardError,
      setEdges,
      setNodes,
    ],
  );

  useEffect(() => {
    historyRef.current = [snapshotCanvas()];
    historyIndexRef.current = 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seed once on mount
  }, []);

  const saveBoardRef = useRef<(() => Promise<void>) | null>(null);

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => {
        const next = addEdge(connection, eds);
        edgesRef.current = next;
        return next;
      });
      markDirty();
      scheduleHistory();
    },
    [markDirty, scheduleHistory, setEdges],
  );

  const onNodeDragStop = useCallback(() => {
    markDirty();
    scheduleHistory();
  }, [markDirty, scheduleHistory]);

  const onUploadFile = useCallback(
    (nodeId: string, file: File) => {
      uploadFiles.current.set(nodeId, file);
      const previewUrl = URL.createObjectURL(file);
      updateNodeData(nodeId, { fileName: file.name, previewUrl, error: undefined });
    },
    [updateNodeData],
  );

  const onUploadAudio = useCallback(
    (nodeId: string, file: File) => {
      audioFiles.current.set(nodeId, file);
      const previewUrl = URL.createObjectURL(file);
      updateNodeData(nodeId, { fileName: file.name, audioUrl: previewUrl, error: undefined });
    },
    [updateNodeData],
  );

  const onPickLibraryImage = useCallback(
    (nodeId: string, previewUrl: string, fileName: string) => {
      uploadFiles.current.delete(nodeId);
      updateNodeData(nodeId, { fileName, previewUrl, error: undefined });
    },
    [updateNodeData],
  );

  const onPickLibraryAudio = useCallback(
    (nodeId: string, previewUrl: string, fileName: string) => {
      audioFiles.current.delete(nodeId);
      updateNodeData(nodeId, { fileName, audioUrl: previewUrl, error: undefined });
    },
    [updateNodeData],
  );

  const collectImageInputs = useCallback(
    (nodeId: string, prompt: string) =>
      collectOrderedImageSources(nodeId, prompt, getLiveNodes(), getLiveEdges(), (id) =>
        uploadFiles.current.get(id),
      ),
    [getLiveEdges, getLiveNodes],
  );

  const mergeUpstreamText = useCallback(
    (nodeId: string, base: string) => {
      const allNodes = getLiveNodes();
      const texts = upstreamNodes(nodeId, allNodes, getLiveEdges())
        .map(textFromNode)
        .filter((t): t is string => !!t?.trim());
      const merged = [base.trim(), ...texts].filter(Boolean).join("\n\n");
      return resolveMentions(merged, allNodes);
    },
    [getLiveEdges, getLiveNodes],
  );

  const runImageNode = useCallback(
    async (nodeId: string) => {
      if (!runningAllRef.current && !guardSingleRunStart()) return;
      const session = canvasSessionRef.current;
      const node = getLiveNode(nodeId);
      if (!node) return;
      const data = node.data as ImageNodeData;
      const allNodes = getLiveNodes();
      const allEdges = getLiveEdges();
      const basePrompt = resolveCanvasImagePrompt({
        nodeId,
        basePrompt: data.prompt,
        sceneIndex: data.sceneIndex,
        nodes: allNodes,
        edges: allEdges,
      });
      const scopedCharacters = collectScopedCharacterNodes(
        nodeId,
        basePrompt,
        allNodes,
        allEdges,
      );
      const resolvedPrompt = appendCharacterLockToPrompt(basePrompt, scopedCharacters, {
        getFile: (id) => uploadFiles.current.get(id),
      });
      const missing = findMissingImageSources(nodeId, resolvedPrompt, allNodes, allEdges, (id) =>
        uploadFiles.current.get(id),
      );
      if (missing) {
        updateNodeData(nodeId, { error: missing }, session);
        throw new Error(missing);
      }
      let sources = collectImageInputs(nodeId, resolvedPrompt);
      sources = mergeCharacterSourcesInto(
        sources,
        collectScopedCharacterSources(
          nodeId,
          resolvedPrompt,
          allNodes,
          allEdges,
          (id) => uploadFiles.current.get(id),
        ),
      );

      updateNodeData(nodeId, { busy: true, error: undefined }, session);
      try {
        const imageUrl = await runCanvasImageNode({
          sources,
          prompt: resolvedPrompt,
          pro: {
            aspectRatio: data.aspectRatio ?? DEFAULT_ULTRA_IMAGE_PRO.aspectRatio,
            resolution: data.resolution ?? DEFAULT_ULTRA_IMAGE_PRO.resolution,
            artStyleId: data.artStyleId ?? DEFAULT_ULTRA_IMAGE_PRO.artStyleId,
            lightingPreset: data.lightingPreset ?? DEFAULT_ULTRA_IMAGE_PRO.lightingPreset,
            lightingCustom: data.lightingCustom,
            backgroundPreset: data.backgroundPreset ?? DEFAULT_ULTRA_IMAGE_PRO.backgroundPreset,
            backgroundCustom: data.backgroundCustom,
          },
        });
        updateNodeData(
          nodeId,
          {
            imageUrl,
            busy: false,
            ...{ outputInputFingerprint: computeNodeInputFingerprint(nodeId, allNodes, allEdges) },
          },
          session,
        );
      } catch (e: unknown) {
        updateNodeData(
          nodeId,
          {
            busy: false,
            error: withNotChargedNote(
              e instanceof Error ? e.message : "Image failed",
              m.errors.tokensNotCharged,
            ),
          },
          session,
        );
        throw e;
      }
    },
    [collectImageInputs, getLiveEdges, getLiveNode, getLiveNodes, guardSingleRunStart, m.errors.tokensNotCharged, updateNodeData],
  );

  const runCharacterNode = useCallback(
    async (nodeId: string) => {
      if (!runningAllRef.current && !guardSingleRunStart()) return;
      const session = canvasSessionRef.current;
      const node = getLiveNode(nodeId);
      if (!node) return;
      const data = node.data as CharacterNodeData;
      const alias = data.alias?.trim() || nodeAlias(node);
      const prompt = buildCharacterSheetPrompt({
        alias,
        biography: data.biography,
        generatePrompt: data.generatePrompt,
      });
      if (!data.generatePrompt?.trim() && !data.biography?.trim()) {
        const msg = m.ultraCanvas.characterNode.generateNeedPrompt;
        updateNodeData(nodeId, { error: msg }, session);
        throw new Error(msg);
      }

      updateNodeData(nodeId, { busy: true, error: undefined }, session);
      try {
        const imageUrl = await runCanvasImageNode({
          sources: [],
          prompt,
          pro: {
            aspectRatio: "1:1",
            resolution: DEFAULT_ULTRA_IMAGE_PRO.resolution,
            artStyleId: DEFAULT_ULTRA_IMAGE_PRO.artStyleId,
            lightingPreset: "studio_soft",
            backgroundPreset: "clean_studio",
          },
        });
        uploadFiles.current.delete(nodeId);
        const allNodes = getLiveNodes();
        const allEdges = getLiveEdges();
        updateNodeData(
          nodeId,
          {
            previewUrl: imageUrl,
            fileName: m.ultraCanvas.characterNode.aiGeneratedFileName,
            busy: false,
            outputInputFingerprint: computeNodeInputFingerprint(nodeId, allNodes, allEdges),
          },
          session,
        );
      } catch (e: unknown) {
        updateNodeData(
          nodeId,
          {
            busy: false,
            error: withNotChargedNote(
              e instanceof Error ? e.message : "Character generate failed",
              m.errors.tokensNotCharged,
            ),
          },
          session,
        );
        throw e;
      }
    },
    [
      getLiveEdges,
      getLiveNode,
      getLiveNodes,
      guardSingleRunStart,
      m.errors.tokensNotCharged,
      m.ultraCanvas.characterNode.aiGeneratedFileName,
      m.ultraCanvas.characterNode.generateNeedPrompt,
      updateNodeData,
    ],
  );

  const runCharacterAnglesNode = useCallback(
    async (nodeId: string) => {
      if (!runningAllRef.current && !guardSingleRunStart()) return;
      const session = canvasSessionRef.current;
      const node = getLiveNode(nodeId);
      if (!node) return;
      const data = node.data as CharacterNodeData;
      const faceUrl = data.previewUrl;
      if (!isHttpOrLibraryMediaUrl(faceUrl) && !uploadFiles.current.get(nodeId)) {
        const msg = m.ultraCanvas.characterNode.anglesNeedFace;
        updateNodeData(nodeId, { error: msg }, session);
        throw new Error(msg);
      }
      const alias = data.alias?.trim() || nodeAlias(node);
      const prompt = buildCharacterAnglesPrompt({
        alias,
        biography: data.biography,
      });
      updateNodeData(nodeId, { busy: true, error: undefined }, session);
      try {
        const local = uploadFiles.current.get(nodeId);
        const imageUrl = await runCanvasImageNode({
          sources: [
            {
              nodeId,
              alias,
              ...(local ? { file: local } : { url: faceUrl }),
            },
          ],
          prompt,
          pro: {
            aspectRatio: "1:1",
            resolution: DEFAULT_ULTRA_IMAGE_PRO.resolution,
            artStyleId: DEFAULT_ULTRA_IMAGE_PRO.artStyleId,
            lightingPreset: "studio_soft",
            backgroundPreset: "clean_studio",
          },
        });
        updateNodeData(
          nodeId,
          {
            angleSheetUrl: imageUrl,
            busy: false,
            outputInputFingerprint: computeNodeInputFingerprint(
              nodeId,
              getLiveNodes(),
              getLiveEdges(),
            ),
          },
          session,
        );
      } catch (e: unknown) {
        updateNodeData(
          nodeId,
          {
            busy: false,
            error: withNotChargedNote(
              e instanceof Error ? e.message : "Angles generate failed",
              m.errors.tokensNotCharged,
            ),
          },
          session,
        );
        throw e;
      }
    },
    [
      getLiveEdges,
      getLiveNode,
      getLiveNodes,
      guardSingleRunStart,
      m.errors.tokensNotCharged,
      m.ultraCanvas.characterNode.anglesNeedFace,
      updateNodeData,
    ],
  );

  const runWorldNode = useCallback(
    async (nodeId: string) => {
      if (!runningAllRef.current && !guardSingleRunStart()) return;
      const session = canvasSessionRef.current;
      const node = getLiveNode(nodeId);
      if (!node) return;
      const data = node.data as WorldNodeData;
      const hasRef =
        Boolean(uploadFiles.current.get(nodeId)) ||
        isHttpOrLibraryMediaUrl(data.previewUrl);
      if (!data.description?.trim() && !hasRef) {
        const msg = m.ultraCanvas.worldNode.buildNeedDescription;
        updateNodeData(nodeId, { error: msg }, session);
        throw new Error(msg);
      }
      const alias = data.alias?.trim() || nodeAlias(node);
      const prompt = buildWorldSpacePrompt({
        description: data.description,
        alias,
        hasRefImage: hasRef,
      });
      updateNodeData(nodeId, { busy: true, error: undefined }, session);
      try {
        const local = uploadFiles.current.get(nodeId);
        const sources = hasRef
          ? [
              {
                nodeId,
                alias,
                ...(local ? { file: local } : { url: data.previewUrl }),
              },
            ]
          : [];
        const imageUrl = await runCanvasImageNode({
          sources,
          prompt,
          pro: {
            aspectRatio: "1:1",
            resolution: DEFAULT_ULTRA_IMAGE_PRO.resolution,
            artStyleId: DEFAULT_ULTRA_IMAGE_PRO.artStyleId,
            lightingPreset: "natural_window",
            backgroundPreset: DEFAULT_ULTRA_IMAGE_PRO.backgroundPreset,
          },
        });
        updateNodeData(
          nodeId,
          {
            spaceSheetUrl: imageUrl,
            busy: false,
            outputInputFingerprint: computeNodeInputFingerprint(
              nodeId,
              getLiveNodes(),
              getLiveEdges(),
            ),
          },
          session,
        );
      } catch (e: unknown) {
        updateNodeData(
          nodeId,
          {
            busy: false,
            error: withNotChargedNote(
              e instanceof Error ? e.message : "World space failed",
              m.errors.tokensNotCharged,
            ),
          },
          session,
        );
        throw e;
      }
    },
    [
      getLiveEdges,
      getLiveNode,
      getLiveNodes,
      guardSingleRunStart,
      m.errors.tokensNotCharged,
      m.ultraCanvas.worldNode.buildNeedDescription,
      updateNodeData,
    ],
  );

  const runBrainstormNode = useCallback(
    async (nodeId: string) => {
      if (!runningAllRef.current && !guardSingleRunStart()) return;
      const session = canvasSessionRef.current;
      const node = getLiveNode(nodeId);
      if (!node) return;
      const data = node.data as BrainstormNodeData;
      if (!data.idea?.trim()) {
        const msg = m.ultraCanvas.brainstormNode.needIdea;
        updateNodeData(nodeId, { error: msg }, session);
        throw new Error(msg);
      }
      updateNodeData(nodeId, { busy: true, error: undefined }, session);
      try {
        const res = await fetch("/api/brainstorm-options", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            idea: data.idea,
            durationSec: data.durationSec,
          }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error((json as { error?: string }).error || "Brainstorm failed");
        }
        const options = (json as { options?: BrainstormNodeData["options"] }).options ?? [];
        updateNodeData(nodeId, { options, selectedOptionId: undefined, busy: false }, session);
      } catch (e: unknown) {
        updateNodeData(
          nodeId,
          {
            busy: false,
            error: e instanceof Error ? e.message : "Brainstorm failed",
          },
          session,
        );
        throw e;
      }
    },
    [getLiveNode, guardSingleRunStart, m.ultraCanvas.brainstormNode.needIdea, updateNodeData],
  );

  const applyBrainstormOption = useCallback(
    (brainstormNodeId: string, optionId: string) => {
      const allNodes = getLiveNodes();
      const brain = getLiveNode(brainstormNodeId);
      if (!brain) return;
      const data = brain.data as BrainstormNodeData;
      const opt = (data.options ?? []).find((o) => o.id === optionId);
      if (!opt) return;
      updateNodeData(brainstormNodeId, { selectedOptionId: optionId });
      const script = allNodes.find((n) => (n.data as ProCanvasNodeData).kind === "script");
      if (script) {
        const brief = [
          opt.hook,
          opt.brief,
          opt.actOutline,
          opt.motionNote ? `Motion: ${opt.motionNote}` : "",
          `Target ~${data.durationSec}s.`,
        ]
          .filter(Boolean)
          .join("\n\n");
        updateNodeData(script.id, { brief });
      }
      setBoardError(m.ultraCanvas.brainstormNode.applied);
      window.setTimeout(() => setBoardError(null), 3500);
    },
    [getLiveNode, getLiveNodes, m.ultraCanvas.brainstormNode.applied, updateNodeData],
  );

  const ensureUpstreamImageUrl = useCallback(
    async (upstream: Node[], session: number): Promise<string> => {
      for (const n of upstream) {
        const url = imageUrlFromNode(n);
        if (isHttpOrLibraryMediaUrl(url)) return url;

        const kind = (n.data as ProCanvasNodeData).kind;
        if (kind === "upload" || kind === "character" || kind === "brand") {
          const file = uploadFiles.current.get(n.id);
          if (file) {
            const uploaded = await uploadCanvasAsset(file);
            uploadFiles.current.delete(n.id);
            updateNodeData(
              n.id,
              kind === "brand"
                ? { logoUrl: uploaded, previewUrl: uploaded, error: undefined }
                : { previewUrl: uploaded, error: undefined },
              session,
            );
            return uploaded;
          }
        }
      }
      throw new Error(
        "Connect an image node with output, or upload a source image first.",
      );
    },
    [updateNodeData],
  );

  const runCameraNode = useCallback(
    async (nodeId: string) => {
      if (!runningAllRef.current && !guardSingleRunStart()) return;
      const session = canvasSessionRef.current;
      const node = getLiveNode(nodeId);
      if (!node) return;
      const data = node.data as CameraNodeData;
      const allNodes = getLiveNodes();
      const allEdges = getLiveEdges();
      const upstream = upstreamNodes(nodeId, allNodes, allEdges);

      updateNodeData(nodeId, { busy: true, error: undefined }, session);
      try {
        const sourceUrl = await ensureUpstreamImageUrl(upstream, session);
        const suffix = cameraPromptSuffix(data);
        const imageUrl = await runCanvasCameraNode({ sourceUrl, cameraSuffix: suffix });
        updateNodeData(
          nodeId,
          {
            imageUrl,
            busy: false,
            ...{ outputInputFingerprint: computeNodeInputFingerprint(nodeId, allNodes, allEdges) },
          },
          session,
        );
      } catch (e: unknown) {
        updateNodeData(
          nodeId,
          {
            busy: false,
            error: withNotChargedNote(
              e instanceof Error ? e.message : "Camera failed",
              m.errors.tokensNotCharged,
            ),
          },
          session,
        );
        throw e;
      }
    },
    [ensureUpstreamImageUrl, getLiveEdges, getLiveNode, getLiveNodes, m.errors.tokensNotCharged, updateNodeData],
  );

  const runVideoNode = useCallback(
    async (nodeId: string) => {
      if (!runningAllRef.current && !guardSingleRunStart()) return;
      const session = canvasSessionRef.current;
      const node = getLiveNode(nodeId);
      if (!node) return;
      const data = node.data as VideoNodeData;
      const allNodes = getLiveNodes();
      const allEdges = getLiveEdges();
      const basePrompt = resolveCanvasVideoPrompt({
        nodeId,
        basePrompt: data.prompt,
        sceneIndex: data.sceneIndex,
        nodes: allNodes,
        edges: allEdges,
      });
      const scriptNode = allNodes.find(
        (n) => (n.data as ProCanvasNodeData).kind === "script",
      );
      const beat =
        scriptNode && data.sceneIndex != null
          ? scriptBeatAt(scriptNode, data.sceneIndex)
          : undefined;
      const withVo = motionPromptWithDialogue(basePrompt, beat);
      const prompt = appendCharacterLockToPrompt(
        withVo,
        collectScopedCharacterNodes(nodeId, withVo, allNodes, allEdges),
        { getFile: (id) => uploadFiles.current.get(id) },
      );
      const upstream = upstreamNodes(nodeId, allNodes, allEdges);

      updateNodeData(nodeId, { busy: true, error: undefined }, session);
      try {
        // Collect @mentioned + connected stills (keep @Alias in prompt so slots resolve).
        let sources = collectOrderedImageSources(
          nodeId,
          prompt,
          allNodes,
          allEdges,
          (id) => uploadFiles.current.get(id),
        );
        if (sources.length === 0) {
          const fallbackUrl = await ensureUpstreamImageUrl(upstream, session);
          sources = [{ nodeId: upstream[0]?.id ?? nodeId, alias: "Start", url: fallbackUrl }];
        }
        const imageUrls: string[] = [];
        const aliases: string[] = [];
        for (const src of sources.slice(0, ULTRA_VIDEO_MAX_REF_IMAGES)) {
          let url = src.url;
          if (src.file) {
            url = await uploadCanvasAsset(src.file);
            uploadFiles.current.delete(src.nodeId);
          } else if (url && !isHttpOrLibraryMediaUrl(url)) {
            continue;
          }
          if (!isHttpOrLibraryMediaUrl(url)) continue;
          imageUrls.push(url);
          aliases.push(src.alias || `Ref${imageUrls.length}`);
        }
        if (imageUrls.length === 0) {
          throw new Error(
            "Connect image nodes (or @mention them) with output — video needs at least one still.",
          );
        }
        const videoUrl = await runCanvasVideoNode({
          imageUrls,
          aliases,
          prompt,
          pro: videoProFromNodeData(data),
        });
        updateNodeData(
          nodeId,
          {
            videoUrl,
            busy: false,
            outputInputFingerprint: computeNodeInputFingerprint(nodeId, allNodes, allEdges),
          },
          session,
        );
      } catch (e: unknown) {
        updateNodeData(
          nodeId,
          {
            busy: false,
            error: withNotChargedNote(
              e instanceof Error ? e.message : "Video failed",
              m.errors.tokensNotCharged,
            ),
          },
          session,
        );
        throw e;
      }
    },
    [ensureUpstreamImageUrl, getLiveEdges, getLiveNode, getLiveNodes, m.errors.tokensNotCharged, updateNodeData],
  );

  const runTextVideoNode = useCallback(
    async (nodeId: string) => {
      if (!runningAllRef.current && !guardSingleRunStart()) return;
      const session = canvasSessionRef.current;
      const node = getLiveNode(nodeId);
      if (!node) return;
      const data = node.data as TextVideoNodeData;
      const allNodes = getLiveNodes();
      const allEdges = getLiveEdges();
      const basePrompt = resolveCanvasVideoPrompt({
        nodeId,
        basePrompt: data.prompt,
        sceneIndex: data.sceneIndex,
        nodes: allNodes,
        edges: allEdges,
      });
      const prompt = appendCharacterLockToPrompt(
        basePrompt,
        collectScopedCharacterNodes(nodeId, basePrompt, allNodes, allEdges),
        { getFile: (id) => uploadFiles.current.get(id), textOnly: true },
      );

      updateNodeData(nodeId, { busy: true, error: undefined }, session);
      try {
        const videoUrl = await runCanvasTextVideoNode({
          prompt,
          pro: videoProFromNodeData(data),
        });
        updateNodeData(
          nodeId,
          {
            videoUrl,
            busy: false,
            outputInputFingerprint: computeNodeInputFingerprint(nodeId, allNodes, allEdges),
          },
          session,
        );
      } catch (e: unknown) {
        updateNodeData(
          nodeId,
          {
            busy: false,
            error: withNotChargedNote(
              e instanceof Error ? e.message : "Text-to-video failed",
              m.errors.tokensNotCharged,
            ),
          },
          session,
        );
        throw e;
      }
    },
    [getLiveEdges, getLiveNode, getLiveNodes, m.errors.tokensNotCharged, updateNodeData],
  );

  const spawnSceneNodes = useCallback(
    (scriptNodeId: string) => {
      const allNodes = getLiveNodes();
      const allEdges = getLiveEdges();
      if (scriptHasSpawnedSceneOutputs(scriptNodeId, allEdges, allNodes)) {
        setBoardError(m.ultraCanvas.spawnBlockedExistingScenes);
        window.setTimeout(() => setBoardError(null), 4000);
        return;
      }
      const scriptNode = getLiveNode(scriptNodeId);
      if (!scriptNode) return;
      const scenes = scriptScenePromptsFromNode(scriptNode);
      if (!scenes.length) return;

      const labels = m.ultraCanvas.nodeLabels as Record<string, string>;
      const baseLabel = labels.textVideo ?? "Text-to-video";
      const newNodes: Node[] = [];
      const newEdges: Edge[] = [];

      scenes.forEach((scenePrompt, i) => {
        nodeCounter += 1;
        const id = `textVideo-scene-${nodeCounter}`;
        newNodes.push({
          id,
          type: "textVideo",
          position: {
            x: scriptNode.position.x + 300,
            y: scriptNode.position.y + i * 220,
          },
          data: {
            kind: "textVideo",
            label: `${baseLabel} ${i + 1}`,
            prompt: "",
            sceneIndex: i,
            duration: DEFAULT_ULTRA_VIDEO_PRO.duration,
            resolution: DEFAULT_ULTRA_VIDEO_PRO.resolution,
            fast: DEFAULT_ULTRA_VIDEO_PRO.fast,
            aspectRatio: DEFAULT_ULTRA_VIDEO_PRO.aspectRatio,
            generateAudio: DEFAULT_ULTRA_VIDEO_PRO.generateAudio,
            artStyleId: DEFAULT_ULTRA_VIDEO_PRO.artStyleId,
            motionStrength: DEFAULT_ULTRA_VIDEO_PRO.motionStrength ?? 35,
          } satisfies TextVideoNodeData,
        });
        newEdges.push({
          id: `e-${scriptNodeId}-${id}`,
          source: scriptNodeId,
          target: id,
        });
      });

      setNodes((nds) => {
        const next = [...nds, ...newNodes];
        nodesRef.current = next;
        return next;
      });
      setEdges((eds) => {
        const next = [...eds, ...newEdges];
        edgesRef.current = next;
        return next;
      });
      markDirty();
      scheduleHistory();
    },
    [getLiveEdges, getLiveNode, getLiveNodes, markDirty, m.ultraCanvas.nodeLabels, m.ultraCanvas.spawnBlockedExistingScenes, scheduleHistory, setBoardError, setEdges, setNodes],
  );

  const spawnScenePipeline = useCallback(
    (scriptNodeId: string, opts?: { stillUrls?: Array<string | undefined> }) => {
      const allNodes = getLiveNodes();
      const allEdges = getLiveEdges();
      if (scriptHasSpawnedSceneOutputs(scriptNodeId, allEdges, allNodes)) {
        setBoardError(m.ultraCanvas.spawnBlockedExistingScenes);
        window.setTimeout(() => setBoardError(null), 4000);
        return;
      }
      const scriptNode = getLiveNode(scriptNodeId);
      if (!scriptNode) return;
      const motionScenes = scriptScenePromptsFromNode(scriptNode);
      const stillScenes = scriptSceneImagePromptsFromNode(scriptNode);
      const scenes = stillScenes.length ? stillScenes : motionScenes;
      if (!scenes.length) return;
      const sceneCount = scenes.length;
      /** Motion/story lines for Image→Video — include spoken line so clip follows VO. */
      const motionForScene = (i: number, stillFallback: string) => {
        const base =
          (motionScenes[i] ?? stillFallback).trim() ||
          `Subtle natural motion for scene ${i + 1}, stable framing, cinematic lighting`;
        return motionPromptWithDialogue(base, scriptBeatAt(scriptNode, i));
      };

      const brainstorm = allNodes.find(
        (n) => (n.data as ProCanvasNodeData).kind === "brainstorm",
      );
      const totalDurationSec = brainstorm
        ? Number((brainstorm.data as { durationSec?: number }).durationSec)
        : undefined;
      const scriptData = scriptNode.data as ScriptNodeData;
      const sceneClipDurations = sceneDurationsFromBeats(scriptData.sceneBeats, sceneCount, {
        totalDurationSec: Number.isFinite(totalDurationSec) ? totalDurationSec : undefined,
        defaultSec: Number(DEFAULT_ULTRA_VIDEO_PRO.duration) || 8,
      });

      const labels = m.ultraCanvas.nodeLabels as Record<string, string>;
      const imageLabel = labels.image ?? "Image";
      const videoLabel = labels.video ?? "Image-to-video";
      const resourceSources = collectSpawnPipelineSources(scriptNodeId, allNodes, allEdges);
      const castCharacters = collectScriptUpstreamCharacters(scriptNodeId, allNodes, allEdges);
      const worldDescription = worldDescriptionFromNodes([
        ...resourceSources,
        ...upstreamNodes(scriptNodeId, allNodes, allEdges),
      ]);
      const spliceNode = allNodes.find((n) => (n.data as ProCanvasNodeData).kind === "splice");
      const stillUrls =
        opts?.stillUrls ??
        stillUrlsFromBoardStoryboard(allNodes);
      const newNodes: Node[] = [];
      const newEdges: Edge[] = [];
      const spawnedVideoIds: string[] = [];
      const spawnedImageIds: string[] = [];

      scenes.forEach((scenePrompt, i) => {
        nodeCounter += 1;
        const imageId = `image-scene-${nodeCounter}`;
        nodeCounter += 1;
        const videoId = `video-scene-${nodeCounter}`;
        spawnedVideoIds.push(videoId);
        spawnedImageIds.push(imageId);
        const rowY = scriptNode.position.y + i * 240;
        const beat = scriptBeatAt(scriptNode, i);
        const continuity = planSceneContinuity({
          sceneIndex: i,
          sceneCount,
          scenePrompt,
          characters: castCharacters,
          beat,
          includePriorKeyframe: i > 0,
          worldDescription,
        });
        const cast =
          continuity.cast.length > 0
            ? continuity.cast
            : charactersForSpawnedScene(i, scenePrompt, castCharacters, allNodes, {
                scriptNode,
                sceneCount,
              });
        const sceneResources = filterSpawnResourcesForScene(resourceSources, continuity.assets);
        const seededStill = stillUrls[i];
        const seededUrl = isHttpOrLibraryMediaUrl(seededStill) ? seededStill : undefined;

        newNodes.push(
          {
            id: imageId,
            type: "image",
            position: { x: scriptNode.position.x + 280, y: rowY },
            data: {
              kind: "image",
              label: `${imageLabel} ${i + 1}`,
              alias: continuity.sceneAlias,
              prompt: continuity.imagePrompt,
              sceneIndex: i,
              ...(seededUrl ? { imageUrl: seededUrl } : {}),
              aspectRatio: DEFAULT_ULTRA_IMAGE_PRO.aspectRatio,
              resolution: DEFAULT_ULTRA_IMAGE_PRO.resolution,
              artStyleId: DEFAULT_ULTRA_IMAGE_PRO.artStyleId,
              lightingPreset: DEFAULT_ULTRA_IMAGE_PRO.lightingPreset,
              backgroundPreset: DEFAULT_ULTRA_IMAGE_PRO.backgroundPreset,
            } satisfies ImageNodeData,
          },
          {
            id: videoId,
            type: "video",
            position: { x: scriptNode.position.x + 560, y: rowY },
            data: {
              kind: "video",
              label: `${videoLabel} ${i + 1}`,
              prompt: motionForScene(i, scenePrompt),
              sceneIndex: i,
              camera: DEFAULT_ULTRA_VIDEO_PRO.camera,
              duration: String(sceneClipDurations[i] ?? DEFAULT_ULTRA_VIDEO_PRO.duration),
              resolution: DEFAULT_ULTRA_VIDEO_PRO.resolution,
              fast: DEFAULT_ULTRA_VIDEO_PRO.fast,
              aspectRatio: DEFAULT_ULTRA_VIDEO_PRO.aspectRatio,
              artStyleId: DEFAULT_ULTRA_VIDEO_PRO.artStyleId,
              generateAudio: DEFAULT_ULTRA_VIDEO_PRO.generateAudio,
              motionStrength: DEFAULT_ULTRA_VIDEO_PRO.motionStrength ?? 35,
            } satisfies VideoNodeData,
          },
        );
        newEdges.push(
          { id: `e-${scriptNodeId}-${imageId}`, source: scriptNodeId, target: imageId },
          { id: `e-${imageId}-${videoId}`, source: imageId, target: videoId },
        );
        if (i > 0) {
          const priorEdge = edgePriorSceneKeyframe(
            spawnedImageIds[i - 1]!,
            imageId,
            allEdges,
            newEdges,
          );
          if (priorEdge) newEdges.push(priorEdge);
        }
        for (const src of sceneResources) {
          const edgeId = `e-${src.id}-${imageId}`;
          if (!allEdges.some((e) => e.id === edgeId) && !newEdges.some((e) => e.id === edgeId)) {
            newEdges.push({ id: edgeId, source: src.id, target: imageId });
          }
        }
        newEdges.push(
          ...edgesForSceneCharacterCast(imageId, cast, allEdges, newEdges),
        );
      });

      if (spliceNode) {
        newEdges.push(
          ...edgesFromVideosToSplice(spawnedVideoIds, spliceNode.id, [...allEdges, ...newEdges]),
        );
      }

      setNodes((nds) => {
        const next = [...nds, ...newNodes];
        nodesRef.current = next;
        return next;
      });
      setEdges((eds) => {
        const next = [...eds, ...newEdges];
        edgesRef.current = next;
        return next;
      });
      markDirty();
      scheduleHistory();
    },
    [getLiveEdges, getLiveNode, getLiveNodes, markDirty, m.ultraCanvas.nodeLabels, m.ultraCanvas.spawnBlockedExistingScenes, scheduleHistory, setBoardError, setEdges, setNodes],
  );

  const runScriptNode = useCallback(
    async (nodeId: string) => {
      if (!runningAllRef.current && !guardSingleRunStart()) return;
      const session = canvasSessionRef.current;
      const node = getLiveNode(nodeId);
      if (!node) return;
      const data = node.data as ScriptNodeData;
      const brief = mergeUpstreamText(nodeId, data.brief);

      updateNodeData(nodeId, { busy: true, error: undefined }, session);
      try {
        const { scriptText, scenePrompts, sceneImagePrompts, sceneBeats } =
          await runCanvasScriptNode({
            brief,
            sceneCount: data.sceneCount,
            sceneBeats: data.sceneBeats,
          });
        updateNodeData(
          nodeId,
          {
            scriptText,
            scenePrompts,
            sceneImagePrompts,
            sceneBeats,
            busy: false,
            outputInputFingerprint: computeNodeInputFingerprint(
              nodeId,
              getLiveNodes(),
              getLiveEdges(),
            ),
          },
          session,
        );
        // Keep storyboard dialogue in sync with planned VO lines (preserve stills/videos).
        const live = getLiveNodes();
        const board = live.find((n) => (n.data as ProCanvasNodeData).kind === "storyboard");
        if (board) {
          const scriptLive = getLiveNode(nodeId);
          if (scriptLive) {
            const prior = flattenStoryboardPanels(board.data as StoryboardNodeData);
            const { panels, acts } = syncStoryboardPanelsFromScript(scriptLive);
            if (panels.length) {
              const merged = panels.map((p, i) => ({
                ...p,
                imageUrl: prior[i]?.imageUrl ?? p.imageUrl,
                videoUrl: prior[i]?.videoUrl ?? p.videoUrl,
                videoReady: prior[i]?.videoReady ?? p.videoReady,
              }));
              updateNodeData(
                board.id,
                {
                  panels: merged,
                  acts: regroupStoryboardActs(merged, {
                    priorActs: acts,
                    beats: (scriptLive.data as ScriptNodeData).sceneBeats,
                  }),
                },
                session,
              );
            }
          }
        }
      } catch (e: unknown) {
        updateNodeData(
          nodeId,
          {
            busy: false,
            error: e instanceof Error ? e.message : "Script failed",
          },
          session,
        );
        throw e;
      }
    },
    [getLiveEdges, getLiveNode, mergeUpstreamText, updateNodeData],
  );

  const runAudioNode = useCallback(
    async (nodeId: string) => {
      if (!runningAllRef.current && !guardSingleRunStart()) return;
      const session = canvasSessionRef.current;
      const file = audioFiles.current.get(nodeId);
      if (!file) {
        updateNodeData(nodeId, { error: "Choose an audio file first." }, session);
        return;
      }
      updateNodeData(nodeId, { busy: true, error: undefined }, session);
      try {
        const audioUrl = await uploadCanvasAsset(file);
        updateNodeData(nodeId, { audioUrl, busy: false }, session);
      } catch (e: unknown) {
        updateNodeData(
          nodeId,
          {
            busy: false,
            error: e instanceof Error ? e.message : "Audio upload failed",
          },
          session,
        );
        throw e;
      }
    },
    [updateNodeData],
  );

  const runVoiceNode = useCallback(
    async (nodeId: string) => {
      if (!runningAllRef.current && !guardSingleRunStart()) return;
      const session = canvasSessionRef.current;
      const node = getLiveNode(nodeId);
      if (!node) return;
      const data = node.data as VoiceNodeData;
      updateNodeData(nodeId, { busy: true, error: undefined }, session);
      try {
        const audioUrl = await runCanvasVoiceNode({
          script: data.script,
          locale: data.locale,
          voicePresetId: data.voicePresetId,
        });
        const ups = allUpstreamNodes(nodeId, getLiveNodes(), getLiveEdges());
        const wiredScript = ups.find(
          (n) => (n.data as ProCanvasNodeData).kind === "script",
        );
        const dialogueSourceFingerprint =
          data.dialogueSourceFingerprint ||
          (wiredScript
            ? scriptDialogueFingerprint(
                (wiredScript.data as ScriptNodeData).sceneBeats,
              )
            : scriptDialogueFingerprint(undefined));
        updateNodeData(
          nodeId,
          {
            audioUrl,
            busy: false,
            dialogueSourceFingerprint,
            outputInputFingerprint: computeNodeInputFingerprint(
              nodeId,
              getLiveNodes(),
              getLiveEdges(),
            ),
          },
          session,
        );
      } catch (e: unknown) {
        updateNodeData(
          nodeId,
          {
            busy: false,
            error: e instanceof Error ? e.message : "Voice failed",
          },
          session,
        );
        throw e;
      }
    },
    [getLiveEdges, getLiveNode, getLiveNodes, updateNodeData],
  );

  const syncStoryboardFromScript = useCallback(
    (storyboardNodeId: string) => {
      const allNodes = getLiveNodes();
      const allEdges = getLiveEdges();
      const ups = upstreamNodes(storyboardNodeId, allNodes, allEdges);
      const scriptNode =
        ups.find((n) => (n.data as ProCanvasNodeData).kind === "script") ??
        allNodes.find((n) => (n.data as ProCanvasNodeData).kind === "script");
      if (!scriptNode) {
        setBoardError(m.ultraCanvas.storyboardNode.needScript);
        window.setTimeout(() => setBoardError(null), 4000);
        return;
      }
      const { panels, acts } = syncStoryboardPanelsFromScript(scriptNode);
      if (!panels.length) {
        setBoardError(m.ultraCanvas.storyboardNode.needPlan);
        window.setTimeout(() => setBoardError(null), 4000);
        return;
      }
      updateNodeData(storyboardNodeId, { panels, acts, error: undefined });
    },
    [getLiveEdges, getLiveNodes, m.ultraCanvas.storyboardNode, updateNodeData],
  );

  const spawnScenePipelineFromStoryboard = useCallback(
    (storyboardNodeId: string) => {
      const allNodes = getLiveNodes();
      const allEdges = getLiveEdges();
      const ups = upstreamNodes(storyboardNodeId, allNodes, allEdges);
      const scriptNode =
        ups.find((n) => (n.data as ProCanvasNodeData).kind === "script") ??
        allNodes.find((n) => (n.data as ProCanvasNodeData).kind === "script");
      if (!scriptNode) {
        setBoardError(m.ultraCanvas.storyboardNode.needScript);
        window.setTimeout(() => setBoardError(null), 4000);
        return;
      }
      const board = getLiveNode(storyboardNodeId);
      const panels = board
        ? flattenStoryboardPanels(board.data as StoryboardNodeData)
        : [];
      if (panels.length) {
        updateNodeData(scriptNode.id, {
          sceneImagePrompts: panels.map((p) => p.stillPrompt),
          scenePrompts: panels.map((p) => p.motionPrompt || p.stillPrompt),
        });
      } else {
        syncStoryboardFromScript(storyboardNodeId);
      }
      const liveBoard = getLiveNode(storyboardNodeId);
      const livePanels = liveBoard
        ? flattenStoryboardPanels(liveBoard.data as StoryboardNodeData)
        : panels;
      spawnScenePipeline(scriptNode.id, {
        stillUrls: stillUrlsFromStoryboardPanels(livePanels),
      });
    },
    [
      getLiveEdges,
      getLiveNode,
      getLiveNodes,
      m.ultraCanvas.storyboardNode,
      spawnScenePipeline,
      syncStoryboardFromScript,
      updateNodeData,
    ],
  );

  const generateStoryboardKeyframeStill = useCallback(
    async (opts: {
      storyboardNodeId: string;
      panelGlobalIndex: number;
      panels: ReturnType<typeof flattenStoryboardPanels>;
    }) => {
      const { storyboardNodeId, panelGlobalIndex, panels } = opts;
      const panel = panels[panelGlobalIndex];
      if (!panel?.stillPrompt?.trim()) {
        throw new Error(m.ultraCanvas.storyboardNode.needPanelPrompt);
      }
      const allNodes = getLiveNodes();
      const allEdges = getLiveEdges();
      const scriptNode =
        upstreamNodes(storyboardNodeId, allNodes, allEdges).find(
          (n) => (n.data as ProCanvasNodeData).kind === "script",
        ) ?? allNodes.find((n) => (n.data as ProCanvasNodeData).kind === "script");
      const cast = scriptNode
        ? collectScriptUpstreamCharacters(scriptNode.id, allNodes, allEdges)
        : [];
      const continuity = planSceneContinuity({
        sceneIndex: panelGlobalIndex,
        sceneCount: panels.length,
        scenePrompt: panel.stillPrompt,
        characters: cast,
        beat: scriptNode ? scriptBeatAt(scriptNode, panelGlobalIndex) : undefined,
        worldDescription: worldDescriptionFromNodes(allNodes),
      });
      const resourceSources = scriptNode
        ? collectSpawnPipelineSources(scriptNode.id, allNodes, allEdges)
        : [];
      const sceneResources = filterSpawnResourcesForScene(
        resourceSources,
        continuity.assets,
      );
      const sources = [
        ...cast.map((c) => {
          const url = imageUrlFromNode(c);
          if (!isHttpOrLibraryMediaUrl(url) && !uploadFiles.current.get(c.id)) return null;
          const local = uploadFiles.current.get(c.id);
          return {
            nodeId: c.id,
            alias: nodeAlias(c),
            ...(local ? { file: local } : { url }),
          };
        }),
        ...sceneResources.map((n) => {
          const kind = (n.data as ProCanvasNodeData).kind;
          if (kind === "lighting" || kind === "background" || kind === "grade" || kind === "research" || kind === "world") {
            return null;
          }
          const url = imageUrlFromNode(n);
          if (!isHttpOrLibraryMediaUrl(url) && !uploadFiles.current.get(n.id)) return null;
          const local = uploadFiles.current.get(n.id);
          return {
            nodeId: n.id,
            alias: nodeAlias(n),
            ...(local ? { file: local } : { url }),
          };
        }),
      ].filter(Boolean) as { nodeId: string; alias: string; file?: File; url?: string }[];
      const imageUrl = await runCanvasImageNode({
        sources,
        prompt: continuity.imagePrompt,
        pro: {
          aspectRatio: DEFAULT_ULTRA_IMAGE_PRO.aspectRatio,
          resolution: DEFAULT_ULTRA_IMAGE_PRO.resolution,
          artStyleId: DEFAULT_ULTRA_IMAGE_PRO.artStyleId,
          lightingPreset: DEFAULT_ULTRA_IMAGE_PRO.lightingPreset,
          backgroundPreset: DEFAULT_ULTRA_IMAGE_PRO.backgroundPreset,
        },
      });
      return { imageUrl, imagePrompt: continuity.imagePrompt };
    },
    [getLiveEdges, getLiveNodes, m.ultraCanvas.storyboardNode.needPanelPrompt],
  );

  const pushStoryboardStillsAfterUpdate = useCallback(
    (
      storyboardNodeId: string,
      panels: ReturnType<typeof flattenStoryboardPanels>,
      acts: ReturnType<typeof groupPanelsIntoActs>,
      session: number,
      focus?: { panelGlobalIndex: number; imageUrl: string; imagePrompt?: string },
    ) => {
      const afterBoard = getLiveNodes().map((n) =>
        n.id === storyboardNodeId
          ? { ...n, data: { ...n.data, panels, acts, busy: false } }
          : n,
      );
      for (const patch of storyboardStillPatchesForSceneImages(afterBoard)) {
        updateNodeData(patch.nodeId, { imageUrl: patch.imageUrl }, session);
      }
      if (focus) {
        const spawnedImage = findSpawnedImageNodeBySceneIndex(
          afterBoard,
          focus.panelGlobalIndex,
        );
        if (spawnedImage) {
          updateNodeData(
            spawnedImage.id,
            {
              imageUrl: focus.imageUrl,
              ...(focus.imagePrompt ? { prompt: focus.imagePrompt } : {}),
            },
            session,
          );
        }
      }
    },
    [getLiveNodes, updateNodeData],
  );

  const runStoryboardPanelKeyframe = useCallback(
    async (storyboardNodeId: string, panelGlobalIndex: number) => {
      if (!runningAllRef.current && !guardSingleRunStart()) return;
      const session = canvasSessionRef.current;
      const board = getLiveNode(storyboardNodeId);
      if (!board) return;
      const data = board.data as StoryboardNodeData;
      let panels = flattenStoryboardPanels(data);
      const panel = panels[panelGlobalIndex];
      if (!panel?.stillPrompt?.trim()) {
        setBoardError(m.ultraCanvas.storyboardNode.needPanelPrompt);
        window.setTimeout(() => setBoardError(null), 4000);
        return;
      }
      updateNodeData(storyboardNodeId, { busy: true, error: undefined }, session);
      try {
        const { imageUrl, imagePrompt } = await generateStoryboardKeyframeStill({
          storyboardNodeId,
          panelGlobalIndex,
          panels,
        });
        panels = panels.map((p, i) =>
          i === panelGlobalIndex ? { ...p, imageUrl } : p,
        );
        const priorBoard = getLiveNode(storyboardNodeId)?.data as StoryboardNodeData | undefined;
        const scriptNode = getLiveNodes().find(
          (n) => (n.data as ProCanvasNodeData).kind === "script",
        );
        const acts = regroupStoryboardActs(panels, {
          priorActs: priorBoard?.acts,
          beats: scriptNode
            ? (scriptNode.data as ScriptNodeData).sceneBeats
            : undefined,
        });
        updateNodeData(storyboardNodeId, { panels, acts, busy: false }, session);
        pushStoryboardStillsAfterUpdate(storyboardNodeId, panels, acts, session, {
          panelGlobalIndex,
          imageUrl,
          imagePrompt,
        });
      } catch (e: unknown) {
        updateNodeData(
          storyboardNodeId,
          {
            busy: false,
            error: withNotChargedNote(
              e instanceof Error ? e.message : "Keyframe failed",
              m.errors.tokensNotCharged,
            ),
          },
          session,
        );
        throw e;
      }
    },
    [
      generateStoryboardKeyframeStill,
      getLiveNode,
      guardSingleRunStart,
      m.errors.tokensNotCharged,
      m.ultraCanvas.storyboardNode.needPanelPrompt,
      pushStoryboardStillsAfterUpdate,
      updateNodeData,
    ],
  );

  const runStoryboardActKeyframes = useCallback(
    async (storyboardNodeId: string, actIndex: number) => {
      if (!runningAllRef.current && !guardSingleRunStart()) return;
      const session = canvasSessionRef.current;
      const board = getLiveNode(storyboardNodeId);
      if (!board) return;
      const data = board.data as StoryboardNodeData;
      const acts =
        data.acts?.length
          ? data.acts
          : groupPanelsIntoActs(flattenStoryboardPanels(data));
      const act = acts[actIndex];
      if (!act?.panels.length) return;

      const baseOffset = acts
        .slice(0, actIndex)
        .reduce((n, a) => n + a.panels.length, 0);
      updateNodeData(storyboardNodeId, { busy: true, error: undefined }, session);
      try {
        let panels = flattenStoryboardPanels(
          (getLiveNode(storyboardNodeId)?.data as StoryboardNodeData) ?? data,
        );
        for (let i = 0; i < act.panels.length; i++) {
          const panelGlobalIndex = baseOffset + i;
          const current = panels[panelGlobalIndex];
          if (!current?.stillPrompt?.trim()) continue;
          const { imageUrl, imagePrompt } = await generateStoryboardKeyframeStill({
            storyboardNodeId,
            panelGlobalIndex,
            panels,
          });
          panels = panels.map((p, idx) =>
            idx === panelGlobalIndex ? { ...p, imageUrl } : p,
          );
          const nextActs = regroupStoryboardActs(panels, {
            priorActs: acts,
            beats: (
              getLiveNodes().find((n) => (n.data as ProCanvasNodeData).kind === "script")
                ?.data as ScriptNodeData | undefined
            )?.sceneBeats,
          });
          updateNodeData(
            storyboardNodeId,
            { panels, acts: nextActs, busy: true },
            session,
          );
          pushStoryboardStillsAfterUpdate(storyboardNodeId, panels, nextActs, session, {
            panelGlobalIndex,
            imageUrl,
            imagePrompt,
          });
        }
        updateNodeData(
          storyboardNodeId,
          {
            busy: false,
            panels,
            acts: regroupStoryboardActs(panels, {
              priorActs: acts,
              beats: (
                getLiveNodes().find((n) => (n.data as ProCanvasNodeData).kind === "script")
                  ?.data as ScriptNodeData | undefined
              )?.sceneBeats,
            }),
          },
          session,
        );
      } catch (e: unknown) {
        updateNodeData(
          storyboardNodeId,
          {
            busy: false,
            error: withNotChargedNote(
              e instanceof Error ? e.message : "Act keyframes failed",
              m.errors.tokensNotCharged,
            ),
          },
          session,
        );
        throw e;
      }
    },
    [
      generateStoryboardKeyframeStill,
      getLiveNode,
      guardSingleRunStart,
      m.errors.tokensNotCharged,
      pushStoryboardStillsAfterUpdate,
      updateNodeData,
    ],
  );

  const runStoryboardPanelVideo = useCallback(
    async (storyboardNodeId: string, panelGlobalIndex: number) => {
      if (!runningAllRef.current && !guardSingleRunStart()) return;
      const session = canvasSessionRef.current;
      const board = getLiveNode(storyboardNodeId);
      if (!board) return;
      const data = board.data as StoryboardNodeData;
      let panels = flattenStoryboardPanels(data);
      const panel = panels[panelGlobalIndex];
      if (!isHttpOrLibraryMediaUrl(panel?.imageUrl)) {
        setBoardError(m.ultraCanvas.storyboardNode.needStillForVideo);
        window.setTimeout(() => setBoardError(null), 4000);
        return;
      }
      updateNodeData(storyboardNodeId, { busy: true, error: undefined }, session);
      try {
        const beat = (() => {
          const script = getLiveNodes().find(
            (n) => (n.data as ProCanvasNodeData).kind === "script",
          );
          return script ? scriptBeatAt(script, panelGlobalIndex) : undefined;
        })();
        const motion = motionPromptWithDialogue(
          panel.motionPrompt?.trim() ||
            panel.stillPrompt?.trim() ||
            `Animate scene ${panelGlobalIndex + 1}`,
          beat ?? { line: panel.dialogue, speaker: panel.speaker },
        );
        const videoUrl = await runCanvasVideoNode({
          imageUrl: panel.imageUrl,
          prompt: motion,
          pro: DEFAULT_ULTRA_VIDEO_PRO,
        });
        panels = panels.map((p, i) =>
          i === panelGlobalIndex
            ? { ...p, videoUrl, videoReady: true }
            : p,
        );
        const acts = regroupStoryboardActs(panels, {
          priorActs: (getLiveNode(storyboardNodeId)?.data as StoryboardNodeData | undefined)
            ?.acts,
          beats: (
            getLiveNodes().find((n) => (n.data as ProCanvasNodeData).kind === "script")
              ?.data as ScriptNodeData | undefined
          )?.sceneBeats,
        });
        updateNodeData(storyboardNodeId, { panels, acts, busy: false }, session);

        const live = getLiveNodes();
        const imgNode = findSpawnedImageNodeBySceneIndex(live, panelGlobalIndex);
        if (imgNode && panel.imageUrl) {
          updateNodeData(imgNode.id, { imageUrl: panel.imageUrl }, session);
        }
        const vidNode = findSpawnedVideoNodeBySceneIndex(live, panelGlobalIndex);
        if (vidNode) {
          updateNodeData(
            vidNode.id,
            {
              videoUrl,
              prompt: motion,
              outputInputFingerprint: computeNodeInputFingerprint(
                vidNode.id,
                getLiveNodes(),
                getLiveEdges(),
              ),
            },
            session,
          );
        }
      } catch (e: unknown) {
        updateNodeData(
          storyboardNodeId,
          {
            busy: false,
            error: withNotChargedNote(
              e instanceof Error ? e.message : "Storyboard video failed",
              m.errors.tokensNotCharged,
            ),
          },
          session,
        );
        throw e;
      }
    },
    [
      getLiveEdges,
      getLiveNode,
      getLiveNodes,
      guardSingleRunStart,
      m.errors.tokensNotCharged,
      m.ultraCanvas.storyboardNode.needStillForVideo,
      updateNodeData,
    ],
  );

  const runStoryboardActVideos = useCallback(
    async (storyboardNodeId: string, actIndex: number) => {
      if (!runningAllRef.current && !guardSingleRunStart()) return;
      const session = canvasSessionRef.current;
      const board = getLiveNode(storyboardNodeId);
      if (!board) return;
      const data = board.data as StoryboardNodeData;
      const acts =
        data.acts?.length
          ? data.acts
          : groupPanelsIntoActs(flattenStoryboardPanels(data));
      const act = acts[actIndex];
      if (!act?.panels.length) return;
      const baseOffset = acts
        .slice(0, actIndex)
        .reduce((n, a) => n + a.panels.length, 0);
      const hasAnyStill = act.panels.some((p) => isHttpOrLibraryMediaUrl(p.imageUrl));
      if (!hasAnyStill) {
        setBoardError(m.ultraCanvas.storyboardNode.needStillForVideo);
        window.setTimeout(() => setBoardError(null), 4000);
        return;
      }
      updateNodeData(storyboardNodeId, { busy: true, error: undefined }, session);
      try {
        let panels = flattenStoryboardPanels(
          (getLiveNode(storyboardNodeId)?.data as StoryboardNodeData) ?? data,
        );
        for (let i = 0; i < act.panels.length; i++) {
          const panelGlobalIndex = baseOffset + i;
          const panel = panels[panelGlobalIndex];
          if (!isHttpOrLibraryMediaUrl(panel?.imageUrl)) continue;
          const script = getLiveNodes().find(
            (n) => (n.data as ProCanvasNodeData).kind === "script",
          );
          const beat = script ? scriptBeatAt(script, panelGlobalIndex) : undefined;
          const motion = motionPromptWithDialogue(
            panel.motionPrompt?.trim() ||
              panel.stillPrompt?.trim() ||
              `Animate scene ${panelGlobalIndex + 1}`,
            beat ?? { line: panel.dialogue, speaker: panel.speaker },
          );
          const videoUrl = await runCanvasVideoNode({
            imageUrl: panel.imageUrl,
            prompt: motion,
            pro: DEFAULT_ULTRA_VIDEO_PRO,
          });
          panels = panels.map((p, idx) =>
            idx === panelGlobalIndex
              ? { ...p, videoUrl, videoReady: true }
              : p,
          );
          const nextActs = regroupStoryboardActs(panels, {
            priorActs: acts,
            beats: (
              getLiveNodes().find((n) => (n.data as ProCanvasNodeData).kind === "script")
                ?.data as ScriptNodeData | undefined
            )?.sceneBeats,
          });
          updateNodeData(
            storyboardNodeId,
            { panels, acts: nextActs, busy: true },
            session,
          );
          const live = getLiveNodes();
          const imgNode = findSpawnedImageNodeBySceneIndex(live, panelGlobalIndex);
          if (imgNode && panel.imageUrl) {
            updateNodeData(imgNode.id, { imageUrl: panel.imageUrl }, session);
          }
          const vidNode = findSpawnedVideoNodeBySceneIndex(live, panelGlobalIndex);
          if (vidNode) {
            updateNodeData(
              vidNode.id,
              {
                videoUrl,
                prompt: motion,
                outputInputFingerprint: computeNodeInputFingerprint(
                  vidNode.id,
                  getLiveNodes(),
                  getLiveEdges(),
                ),
              },
              session,
            );
          }
        }
        updateNodeData(
          storyboardNodeId,
          {
            busy: false,
            panels,
            acts: regroupStoryboardActs(panels, {
              priorActs: acts,
              beats: (
                getLiveNodes().find((n) => (n.data as ProCanvasNodeData).kind === "script")
                  ?.data as ScriptNodeData | undefined
              )?.sceneBeats,
            }),
          },
          session,
        );
      } catch (e: unknown) {
        updateNodeData(
          storyboardNodeId,
          {
            busy: false,
            error: withNotChargedNote(
              e instanceof Error ? e.message : "Act videos failed",
              m.errors.tokensNotCharged,
            ),
          },
          session,
        );
        throw e;
      }
    },
    [
      getLiveEdges,
      getLiveNode,
      getLiveNodes,
      guardSingleRunStart,
      m.errors.tokensNotCharged,
      m.ultraCanvas.storyboardNode.needStillForVideo,
      updateNodeData,
    ],
  );

  const pullVoiceDialogueFromScript = useCallback(
    (voiceNodeId: string) => {
      const allNodes = getLiveNodes();
      const allEdges = getLiveEdges();
      const upstream = allUpstreamNodes(voiceNodeId, allNodes, allEdges);
      const wiredSources = upstream.filter((n) => {
        const kind = (n.data as ProCanvasNodeData).kind;
        return kind === "script" || kind === "storyboard";
      });
      /** Wired Script/Storyboard only — never steal dialogue from an unrelated board node. */
      const scopeNodes = wiredSources.length ? wiredSources : undefined;
      if (wiredSources.length === 0) {
        setBoardError(m.ultraCanvas.voiceNode.needWireScript);
        window.setTimeout(() => setBoardError(null), 4500);
        return;
      }
      const lines = voiceLinesFromNodes(allNodes, { scopeNodes });
      const text =
        lines.map((l) => l.text).join("\n") ||
        dialogueScriptFromNodes(allNodes, { scopeNodes });
      if (!text.trim()) {
        setBoardError(m.ultraCanvas.voiceNode.needDialogue);
        window.setTimeout(() => setBoardError(null), 4000);
        return;
      }
      updateNodeData(voiceNodeId, {
        script: text,
        lines: lines.length ? lines : undefined,
        dialogueSourceFingerprint: (() => {
          const script = wiredSources.find(
            (n) => (n.data as ProCanvasNodeData).kind === "script",
          );
          if (script) {
            return scriptDialogueFingerprint(
              (script.data as ScriptNodeData).sceneBeats,
            );
          }
          return text;
        })(),
      });
    },
    [getLiveEdges, getLiveNodes, m.ultraCanvas.voiceNode, updateNodeData],
  );

  const runSpliceNode = useCallback(
    async (nodeId: string) => {
      if (!runningAllRef.current && !guardSingleRunStart()) return;
      const session = canvasSessionRef.current;
      const allNodes = getLiveNodes();
      const allEdges = getLiveEdges();
      const upstream = upstreamNodesSorted(nodeId, allNodes, allEdges);
      const videoUrls = upstream
        .map(videoUrlFromNode)
        .filter((u): u is string => isHttpOrLibraryMediaUrl(u));

      const voiceUpstream = upstream.find(
        (n) => (n.data as ProCanvasNodeData).kind === "voice",
      );
      const voiceData = voiceUpstream
        ? (voiceUpstream.data as VoiceNodeData)
        : undefined;

      if (voiceUpstream && !(voiceData?.lines && voiceData.lines.length > 0)) {
        const msg = m.ultraCanvas.voiceNode.needPullBeforeSplice;
        setBoardError(msg);
        window.setTimeout(() => setBoardError(null), 4500);
        updateNodeData(nodeId, { error: msg }, session);
        return;
      }

      const timedCaptions =
        voiceData?.lines && voiceData.lines.length > 0
          ? voiceLinesToCaptionPayload(voiceData.lines)
          : [];

      /** BGM only from Audio nodes — never treat Voice dialogue as music. */
      let musicUrl: string | undefined;
      for (const n of upstream) {
        const kind = (n.data as ProCanvasNodeData).kind;
        if (kind !== "audio") continue;
        const existing = audioUrlFromNode(n);
        if (isHttpOrLibraryMediaUrl(existing)) {
          musicUrl = existing;
          break;
        }
        const file = audioFiles.current.get(n.id);
        if (file) {
          updateNodeData(n.id, { busy: true, error: undefined }, session);
          try {
            const uploaded = await uploadCanvasAsset(file);
            audioFiles.current.delete(n.id);
            updateNodeData(n.id, { audioUrl: uploaded, busy: false }, session);
            musicUrl = uploaded;
            break;
          } catch (e: unknown) {
            updateNodeData(
              n.id,
              {
                busy: false,
                error: e instanceof Error ? e.message : "Audio upload failed",
              },
              session,
            );
            throw e;
          }
        }
      }

      updateNodeData(nodeId, { busy: true, error: undefined }, session);
      try {
        let videoUrl = await runCanvasSpliceNode({
          videoUrls,
          musicUrl: undefined,
        });
        if (timedCaptions.length > 0 && voiceData) {
          const speechUrl =
            timedCaptions.length < 2 && isHttpOrLibraryMediaUrl(voiceData.audioUrl)
              ? voiceData.audioUrl
              : undefined;
          const res = await fetch("/api/dub-script-voice", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              video_url: videoUrl,
              caption_lines: timedCaptions,
              locale: voiceData.locale,
              voice_preset: voiceData.voicePresetId,
              script: voiceData.script,
              ...(speechUrl ? { speech_url: speechUrl } : {}),
            }),
          });
          const json = await res.json().catch(() => ({}));
          if (!res.ok) {
            throw new Error((json as { error?: string }).error || "Timed voice mix failed");
          }
          const dubbed = (json as { videoUrl?: string }).videoUrl;
          if (isHttpOrLibraryMediaUrl(dubbed)) videoUrl = dubbed;
        }
        if (musicUrl) {
          videoUrl = await runCanvasSpliceNode({
            videoUrls: [videoUrl],
            musicUrl,
          });
        }
        updateNodeData(
          nodeId,
          {
            videoUrl,
            busy: false,
            outputInputFingerprint: computeNodeInputFingerprint(
              nodeId,
              allNodes,
              getLiveEdges(),
            ),
          },
          session,
        );
      } catch (e: unknown) {
        updateNodeData(
          nodeId,
          {
            busy: false,
            error: e instanceof Error ? e.message : "Splice failed",
          },
          session,
        );
        throw e;
      }
    },
    [getLiveEdges, getLiveNodes, m.ultraCanvas.voiceNode.needPullBeforeSplice, setBoardError, updateNodeData],
  );

  const runNode = useCallback(
    async (nodeId: string) => {
      const node = getLiveNode(nodeId);
      if (!node) return;
      const kind = (node.data as ProCanvasNodeData).kind;
      switch (kind) {
        case "image":
          await runImageNode(nodeId);
          break;
        case "character":
          await runCharacterNode(nodeId);
          break;
        case "world":
          await runWorldNode(nodeId);
          break;
        case "brainstorm":
          await runBrainstormNode(nodeId);
          break;
        case "camera":
          await runCameraNode(nodeId);
          break;
        case "video":
          await runVideoNode(nodeId);
          break;
        case "textVideo":
          await runTextVideoNode(nodeId);
          break;
        case "script":
          await runScriptNode(nodeId);
          break;
        case "audio":
          await runAudioNode(nodeId);
          break;
        case "voice":
          await runVoiceNode(nodeId);
          break;
        case "splice":
          await runSpliceNode(nodeId);
          break;
        default:
          break;
      }
    },
    [
      getLiveNode,
      runAudioNode,
      runBrainstormNode,
      runCameraNode,
      runCharacterNode,
      runImageNode,
      runScriptNode,
      runSpliceNode,
      runTextVideoNode,
      runVideoNode,
      runVoiceNode,
      runWorldNode,
    ],
  );

  const persistLocalAssetsBeforeSave = useCallback(async () => {
    const patches = new Map<string, Record<string, unknown>>();
    const uploads = [...uploadFiles.current.entries()];
    const audios = [...audioFiles.current.entries()];
    for (const [nodeId, file] of uploads) {
      const url = await uploadCanvasAsset(file);
      uploadFiles.current.delete(nodeId);
      const kind = (getLiveNode(nodeId)?.data as ProCanvasNodeData | undefined)?.kind;
      const patch =
        kind === "brand"
          ? { logoUrl: url, previewUrl: url, fileName: file.name, error: undefined }
          : { previewUrl: url, fileName: file.name, error: undefined };
      patches.set(nodeId, patch);
      updateNodeData(nodeId, patch);
    }
    for (const [nodeId, file] of audios) {
      const url = await uploadCanvasAsset(file);
      audioFiles.current.delete(nodeId);
      const patch = { audioUrl: url, fileName: file.name, error: undefined };
      patches.set(nodeId, patch);
      updateNodeData(nodeId, patch);
    }
    return patches;
  }, [getLiveNode, updateNodeData]);

  const stopRunAll = useCallback(() => {
    runAllAbortRef.current?.abort();
  }, []);

  const executeRunAllLoop = useCallback(
    async (pending: Node[], abort: AbortController) => {
      const items: TaskQueueItem[] = pending.map((n) => ({
        nodeId: n.id,
        label: runnableLabel(n),
        status: "pending",
      }));
      setQueue(items);
      setRunningAll(true);
      setBoardError(null);

      for (let i = 0; i < pending.length; i++) {
        if (abort.signal.aborted) break;
        const n = pending[i]!;
        setQueue((q) =>
          q.map((item) => (item.nodeId === n.id ? { ...item, status: "running" } : item)),
        );
        try {
          await runNode(n.id);
          if (abort.signal.aborted) break;
          setQueue((q) =>
            q.map((item) =>
              item.nodeId === n.id ? { ...item, status: "done", error: undefined } : item,
            ),
          );
        } catch (e: unknown) {
          if (abort.signal.aborted) break;
          const message = e instanceof Error ? e.message : "Failed";
          const failedId = n.id;
          setQueue((q) =>
            q.map((item) => {
              if (item.nodeId === failedId) {
                return { ...item, status: "error", error: message };
              }
              if (item.status === "pending") {
                return { ...item, status: "error", error: m.ultraCanvas.queueSkipped };
              }
              return item;
            }),
          );
          break;
        }
      }
      if (abort.signal.aborted) {
        setQueue((q) =>
          q.map((item) =>
            item.status === "pending" || item.status === "running"
              ? { ...item, status: "error", error: m.ultraCanvas.runCancelled }
              : item,
          ),
        );
      }
      setRunningAll(false);
      runningAllRef.current = false;
      runAllAbortRef.current = null;
      markDirty();
      if (dirtyRef.current) {
        void saveBoardRef.current?.();
      }
    },
    [markDirty, m.ultraCanvas.queueSkipped, m.ultraCanvas.runCancelled, runNode],
  );

  const runAll = useCallback(async () => {
    if (boardBusy || !tryAcquireRunAllLatch(runningAllRef.current)) {
      setBoardError(m.ultraCanvas.busyNavBlocked);
      return;
    }

    const allNodes = getLiveNodes();
    const allEdges = getLiveEdges();
    const { sorted, error: orderError } = runnableExecutionOrder(allNodes, allEdges);
    if (orderError) {
      setBoardError(orderError);
      return;
    }
    const pending = sorted.filter((n) => nodeNeedsRun(n, allNodes, allEdges));
    if (pending.length === 0) {
      setBoardError(m.ultraCanvas.runAllEmpty);
      return;
    }

    const totalTokens = estimateRunAllTokens(allNodes, allEdges, {
      hasLocalAudio: (id) => audioFiles.current.has(id),
    });
    if (planReady && cannotAfford(creditBalance, totalTokens)) {
      setBoardError(insufficientTokensMessage(totalTokens, creditBalance as number));
      return;
    }

    const confirmMsg = m.ultraCanvas.runAllConfirm
      .replace("{nodes}", String(pending.length))
      .replace("{tokens}", String(totalTokens));

    askConfirm(m.ultraCanvas.runAllConfirmTitle, confirmMsg, () => {
      void (async () => {
        runningAllRef.current = true;
        runAllAbortRef.current?.abort();
        const abort = new AbortController();
        runAllAbortRef.current = abort;
        try {
          await persistLocalAssetsBeforeSave();
        } catch (e: unknown) {
          setBoardError(e instanceof Error ? e.message : "Upload failed.");
          runningAllRef.current = false;
          runAllAbortRef.current = null;
          return;
        }
        await executeRunAllLoop(pending, abort);
      })();
    });
  }, [
    askConfirm,
    boardBusy,
    creditBalance,
    executeRunAllLoop,
    getLiveEdges,
    getLiveNodes,
    m.ultraCanvas.busyNavBlocked,
    m.ultraCanvas.runAllConfirm,
    m.ultraCanvas.runAllConfirmTitle,
    m.ultraCanvas.runAllEmpty,
    persistLocalAssetsBeforeSave,
    planReady,
  ]);

  const addNode = useCallback(
    (kind: ProCanvasNodeKind) => {
      nodeCounter += 1;
      const id = `${kind}-${nodeCounter}`;
      const labels = m.ultraCanvas.nodeLabels as Record<string, string>;
      const label = labels[kind] ?? kind;
      const newNode: Node = {
        id,
        type: kind,
        position: { x: 80 + (nodeCounter % 4) * 220, y: 80 + Math.floor(nodeCounter / 4) * 180 },
        data: defaultNodeData(kind, label),
      };
      setNodes((nds) => {
        const next = [...nds, newNode];
        nodesRef.current = next;
        return next;
      });
      markDirty();
      scheduleHistory();
    },
    [markDirty, m.ultraCanvas.nodeLabels, scheduleHistory, setNodes],
  );

  const resetBoard = useCallback(() => {
    if (!guardBusyNav()) return;
    askConfirm(
      m.ultraCanvas.toolbar.clearBoardConfirmTitle,
      m.ultraCanvas.toolbar.clearBoardConfirm,
      () => {
        resetCanvasRuntime();
        const fresh = createProCanvasStarter(m.ultraCanvas.nodeLabels);
        nodesRef.current = fresh.nodes;
        edgesRef.current = fresh.edges;
        setNodes(fresh.nodes);
        setEdges(fresh.edges);
        setBoardId(null);
        setBoardName("Untitled board");
        setQueue([]);
        setShowCreativeBHint(false);
        nodeCounter = fresh.nodeCounterSeed;
        dirtyRef.current = false;
        resetHistory({ nodes: fresh.nodes, edges: fresh.edges });
      },
      true,
    );
  }, [
    askConfirm,
    guardBusyNav,
    m.ultraCanvas.nodeLabels,
    m.ultraCanvas.toolbar.clearBoardConfirm,
    m.ultraCanvas.toolbar.clearBoardConfirmTitle,
    resetCanvasRuntime,
    resetHistory,
    setEdges,
    setNodes,
  ]);

  const saveBoard = useCallback(async () => {
    if (shouldBlockUltraCanvasSave(boardBusy)) {
      setBoardError(m.ultraCanvas.busyNavBlocked);
      return;
    }
    setSaving(true);
    setBoardError(null);
    try {
      const patches = await persistLocalAssetsBeforeSave();
      const nodesForSave = getLiveNodes().map((n) => {
        const patch = patches.get(n.id);
        return patch ? { ...n, data: { ...n.data, ...patch } } : n;
      });
      const snapshot = serializeUltraCanvasSnapshot(nodesForSave, getLiveEdges(), nodeCounter);
      if (boardId) {
        const res = await fetch(`/api/ultra-canvas/${boardId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: boardName, snapshot }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error((data as { error?: string }).error || "Save failed.");
        }
      } else {
        const res = await fetch("/api/ultra-canvas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: boardName, snapshot }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error((data as { error?: string }).error || "Save failed.");
        }
        setBoardId((data as { id?: string }).id ?? null);
      }
      setSaveSuccessAt(Date.now());
      dirtyRef.current = false;
    } catch (e: unknown) {
      setBoardError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }, [boardBusy, boardId, boardName, getLiveEdges, getLiveNodes, m.ultraCanvas.busyNavBlocked, persistLocalAssetsBeforeSave]);

  const deleteBoard = useCallback(
    (id: string) => {
      if (!guardBusyNav()) return;
      askConfirm(
        m.ultraCanvas.toolbar.deleteBoardConfirmTitle,
        m.ultraCanvas.toolbar.deleteBoardConfirm,
        () => {
          void (async () => {
            setBoardError(null);
            try {
              const res = await fetch(`/api/ultra-canvas/${id}`, { method: "DELETE" });
              const data = await res.json().catch(() => ({}));
              if (!res.ok) {
                throw new Error((data as { error?: string }).error || "Delete failed.");
              }
              if (boardId === id) {
                resetCanvasRuntime();
                const fresh = createProCanvasStarter(m.ultraCanvas.nodeLabels);
                nodesRef.current = fresh.nodes;
                edgesRef.current = fresh.edges;
                setNodes(fresh.nodes);
                setEdges(fresh.edges);
                setBoardId(null);
                setBoardName("Untitled board");
                nodeCounter = fresh.nodeCounterSeed;
                dirtyRef.current = false;
                resetHistory({ nodes: fresh.nodes, edges: fresh.edges });
              }
            } catch (e: unknown) {
              setBoardError(e instanceof Error ? e.message : "Delete failed.");
            }
          })();
        },
        true,
      );
    },
    [
      askConfirm,
      boardId,
      guardBusyNav,
      m.ultraCanvas.nodeLabels,
      m.ultraCanvas.toolbar.deleteBoardConfirm,
      m.ultraCanvas.toolbar.deleteBoardConfirmTitle,
      resetCanvasRuntime,
      resetHistory,
      setEdges,
      setNodes,
    ],
  );

  const loadBoard = useCallback(
    (id: string) => {
      tryDiscardThen(() => {
        void (async () => {
          resetCanvasRuntime();
          setLoadingBoard(true);
          setBoardError(null);
          try {
            const res = await fetch(`/api/ultra-canvas/${id}`);
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
              throw new Error((data as { error?: string }).error || "Load failed.");
            }
            const snapshot = (data as { snapshot?: ReturnType<typeof serializeUltraCanvasSnapshot> })
              .snapshot;
            if (!snapshot) throw new Error("Board snapshot missing.");
            const restored = deserializeUltraCanvasSnapshot(snapshot);
            const marked = restored.nodes.map((n) => {
              const nodeData = n.data as ProCanvasNodeData;
              if (
                nodeData.kind === "upload" &&
                nodeData.fileName &&
                !isHttpOrLibraryMediaUrl(nodeData.previewUrl)
              ) {
                return {
                  ...n,
                  data: {
                    ...nodeData,
                    previewUrl: undefined,
                    error: m.ultraCanvas.missingLocalAsset,
                  },
                };
              }
              if (
                nodeData.kind === "audio" &&
                nodeData.fileName &&
                !isHttpOrLibraryMediaUrl(nodeData.audioUrl)
              ) {
                return {
                  ...n,
                  data: {
                    ...nodeData,
                    audioUrl: undefined,
                    error: m.ultraCanvas.missingLocalAsset,
                  },
                };
              }
              return n;
            });
            nodesRef.current = marked;
            edgesRef.current = restored.edges;
            setNodes(marked);
            setEdges(restored.edges);
            nodeCounter = restored.nodeCounterSeed;
            setBoardId(id);
            setBoardName((data as { name?: string }).name ?? "Untitled board");
            dirtyRef.current = false;
            resetHistory({ nodes: marked, edges: restored.edges });
          } catch (e: unknown) {
            setBoardError(e instanceof Error ? e.message : "Load failed.");
          } finally {
            setLoadingBoard(false);
          }
        })();
      });
    },
    [
      tryDiscardThen,
      m.ultraCanvas.missingLocalAsset,
      resetCanvasRuntime,
      resetHistory,
      setEdges,
      setNodes,
    ],
  );

  saveBoardRef.current = saveBoard;

  useEffect(() => {
    if (templateLoadedRef.current) return;
    const raw = initialTemplate?.trim();
    if (!raw || !ULTRA_CANVAS_TEMPLATE_IDS.includes(raw as UltraCanvasTemplateId)) return;
    templateLoadedRef.current = true;
    loadTemplate(raw as UltraCanvasTemplateId);
  }, [initialTemplate, loadTemplate]);

  useEffect(() => {
    if (!dirtyRef.current || boardBusy || saving) return;
    const timer = setTimeout(() => {
      if (dirtyRef.current && !boardBusy && !saving) {
        void saveBoardRef.current?.();
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, [boardBusy, dirtyTick, saving]);

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (dirtyRef.current && !boardBusy) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [boardBusy, dirtyTick]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;
      const mod = e.metaKey || e.ctrlKey;

      if (mod && e.key === "s") {
        e.preventDefault();
        void saveBoardRef.current?.();
        return;
      }
      if (typing) return;

      if (mod && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }
      if (mod && ((e.key === "z" && e.shiftKey) || e.key === "y")) {
        e.preventDefault();
        redo();
        return;
      }
      if (mod && e.key === "d") {
        e.preventDefault();
        duplicateSelectedNodes();
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        deleteSelectedNodes();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [deleteSelectedNodes, duplicateSelectedNodes, redo, undo]);

  const estimateSpliceTokenCost = useCallback(
    (nodeId: string) => {
      const allNodes = getLiveNodes();
      const allEdges = getLiveEdges();
      const hasMusic = spliceUpstreamHasMusic(nodeId, allNodes, allEdges, {
        hasLocalAudio: (id) => audioFiles.current.has(id),
      });
      return estimateCanvasSpliceTokens({ hasMusic });
    },
    [getLiveEdges, getLiveNodes],
  );

  const applyStoryboardStillsToScenes = useCallback(() => {
    const patches = storyboardStillPatchesForSceneImages(getLiveNodes());
    for (const p of patches) {
      updateNodeData(p.nodeId, { imageUrl: p.imageUrl });
    }
    if (patches.length) {
      setBoardError(
        m.ultraCanvas.storyboardNode.stillsApplied.replace(
          "{n}",
          String(patches.length),
        ),
      );
      window.setTimeout(() => setBoardError(null), 3500);
    } else {
      setBoardError(m.ultraCanvas.storyboardNode.stillsNoneToApply);
      window.setTimeout(() => setBoardError(null), 3500);
    }
    return patches.length;
  }, [getLiveNodes, m.ultraCanvas.storyboardNode, updateNodeData]);

  const isNodeStale = useCallback(
    (nodeId: string) => {
      const n = getLiveNode(nodeId);
      if (!n) return false;
      return isNodeOutputStale(n, getLiveNodes(), getLiveEdges());
    },
    [getLiveEdges, getLiveNode, getLiveNodes],
  );

  const showBoardNotice = useCallback((message: string) => {
    setBoardError(message);
    window.setTimeout(() => setBoardError(null), 4000);
  }, []);

  const actions = useMemo(
    () => ({
      nodes,
      edges,
      boardBusy,
      estimateSpliceTokenCost,
      onUploadFile,
      onUploadAudio,
      onPickLibraryImage,
      onPickLibraryAudio,
      runImageNode,
      runCharacterNode,
      runCharacterAnglesNode,
      runWorldNode,
      runBrainstormNode,
      applyBrainstormOption,
      runVideoNode,
      runTextVideoNode,
      runCameraNode,
      runScriptNode,
      spawnSceneNodes,
      spawnScenePipeline,
      syncStoryboardFromScript,
      spawnScenePipelineFromStoryboard,
      applyStoryboardStillsToScenes,
      runStoryboardPanelKeyframe,
      runStoryboardActKeyframes,
      runStoryboardPanelVideo,
      runStoryboardActVideos,
      pullVoiceDialogueFromScript,
      runAudioNode,
      runVoiceNode,
      runSpliceNode,
      runNode,
      updateNodeData,
      showBoardNotice,
      isNodeStale,
    }),
    [
      boardBusy,
      edges,
      estimateSpliceTokenCost,
      nodes,
      onUploadFile,
      onUploadAudio,
      onPickLibraryImage,
      onPickLibraryAudio,
      runImageNode,
      runCharacterNode,
      runCharacterAnglesNode,
      runWorldNode,
      runBrainstormNode,
      applyBrainstormOption,
      runVideoNode,
      runTextVideoNode,
      runCameraNode,
      runScriptNode,
      spawnSceneNodes,
      spawnScenePipeline,
      syncStoryboardFromScript,
      spawnScenePipelineFromStoryboard,
      applyStoryboardStillsToScenes,
      runStoryboardPanelKeyframe,
      runStoryboardActKeyframes,
      runStoryboardPanelVideo,
      runStoryboardActVideos,
      pullVoiceDialogueFromScript,
      runAudioNode,
      runVoiceNode,
      runSpliceNode,
      runNode,
      updateNodeData,
      showBoardNotice,
      isNodeStale,
    ],
  );

  const paletteLabels = {
    addNode: m.ultraCanvas.addNode,
    addResource: m.ultraCanvas.addResource,
    addModifier: m.ultraCanvas.addModifier,
    railClose: m.ultraCanvas.railClose,
    paletteTextVideoHint: m.ultraCanvas.paletteTextVideoHint,
    ...(m.ultraCanvas.nodeLabels as Record<string, string>),
  };

  return (
    <ProCanvasActionsProvider value={actions}>
      <div
        className="relative min-h-[640px] h-[calc(100dvh-9.5rem)] w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 shadow-lg shadow-slate-900/10 ring-1 ring-slate-900/5"
        style={{ minHeight: 640, height: "calc(100dvh - 9.5rem)" }}
      >
        {boardBusy ? (
          <div
            className="absolute left-1/2 top-3 z-30 flex max-w-[min(calc(100%-2rem),18rem)] -translate-x-1/2 items-center justify-center gap-2 rounded-full border border-amber-300/80 bg-amber-400 px-4 py-2 text-xs font-bold text-amber-950 shadow-lg shadow-amber-950/40"
            role="status"
            aria-live="polite"
          >
            <span
              className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-amber-950"
              aria-hidden
            />
            {m.ultraCanvas.busyBanner}
          </div>
        ) : null}
        {showCreativeBHint ? (
          <UltraCanvasCreativeBBanner
            steps={computeCreativeBStepStatuses(nodes)}
            onDismiss={() => setShowCreativeBHint(false)}
          />
        ) : null}
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 10%, rgba(139,92,246,0.15), transparent 40%), radial-gradient(circle at 80% 90%, rgba(56,189,248,0.1), transparent 35%)",
          }}
        />
        <div className="absolute left-3 top-3 z-10 hidden flex-col items-start gap-2 md:flex">
          <button
            type="button"
            onClick={() => setDesktopPaletteOpen((v) => !v)}
            disabled={boardBusy}
            className="rounded-lg border border-cyan-500/40 bg-slate-900/95 px-3 py-1.5 text-[11px] font-semibold text-cyan-100 shadow-lg backdrop-blur hover:bg-slate-800 disabled:opacity-40"
          >
            {desktopPaletteOpen ? m.ultraCanvas.railClose : m.ultraCanvas.addNode}
          </button>
          {desktopPaletteOpen ? (
            <AddNodePalette
              labels={paletteLabels}
              onAdd={(kind) => {
                addNode(kind);
                setDesktopPaletteOpen(false);
              }}
              disabled={boardBusy}
              onClose={() => setDesktopPaletteOpen(false)}
            />
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => setMobilePaletteOpen(true)}
          className="fixed bottom-4 left-4 z-20 rounded-full border border-cyan-500/40 bg-slate-900/95 px-4 py-2.5 text-xs font-semibold text-cyan-100 shadow-lg backdrop-blur md:hidden"
        >
          {m.ultraCanvas.mobileNodes}
        </button>
        {mobilePaletteOpen ? (
          <div className="fixed inset-0 z-40 md:hidden">
            <button
              type="button"
              className="absolute inset-0 bg-slate-950/55"
              aria-label={m.ultraCanvas.railClose}
              onClick={() => setMobilePaletteOpen(false)}
            />
            <div className="absolute left-0 top-0 flex h-full w-[min(100%,18rem)] flex-col p-3">
              <AddNodePalette
                labels={paletteLabels}
                onAdd={(kind) => {
                  addNode(kind);
                  setMobilePaletteOpen(false);
                }}
                disabled={boardBusy}
                onClose={() => setMobilePaletteOpen(false)}
              />
            </div>
          </div>
        ) : null}
        <UltraCanvasRightRail
          labels={{
            open: m.ultraCanvas.railOpen,
            close: m.ultraCanvas.railClose,
          }}
          toolbar={
            <UltraCanvasToolbar
              boardName={boardName}
              boardId={boardId}
              saving={saving}
              saveSuccessAt={saveSuccessAt}
              loading={loadingBoard}
              boardError={boardError}
              navDisabled={boardBusy}
              onBoardNameChange={onBoardNameChange}
              onSave={() => void saveBoard()}
              onNew={resetBoard}
              onLoad={(id) => loadBoard(id)}
              onDelete={(id) => deleteBoard(id)}
              onUndo={undo}
              onRedo={redo}
              onLoadTemplate={loadTemplate}
            />
          }
          queue={
            <TaskQueuePanel
              items={queue}
              running={runningAll}
              labels={{
                title: m.ultraCanvas.queueTitle,
                runAll: m.ultraCanvas.runAll,
                running: m.ultraCanvas.running,
                stopRun: m.ultraCanvas.stopRun,
                empty: m.ultraCanvas.queueEmpty,
              }}
              onRunAll={runAll}
              onStopRun={stopRunAll}
              runAllDisabled={boardBusy}
            />
          }
        />
        <ReactFlow
          className="h-full w-full"
          style={{ width: "100%", height: "100%" }}
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeDragStop={onNodeDragStop}
          nodeTypes={nodeTypes}
          fitView
          snapToGrid
          snapGrid={[20, 20]}
          /* Left-drag moves nodes; middle/right pan the pane. */
          panOnDrag={[1, 2]}
          selectionOnDrag
          colorMode="dark"
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={20} color="#334155" />
          <Controls className="!border-slate-700 !bg-slate-900/90 !shadow-lg" />
          <MiniMap
            className="!border-slate-700 !bg-slate-900/90"
            nodeColor="#6366f1"
            maskColor="rgba(15,23,42,0.75)"
          />
        </ReactFlow>
        <UltraCanvasConfirmDialog
          open={confirmState !== null}
          title={confirmState?.title ?? ""}
          message={confirmState?.message ?? ""}
          confirmLabel={m.ultraCanvas.confirmOk}
          cancelLabel={m.ultraCanvas.confirmCancel}
          destructive={confirmState?.destructive}
          onCancel={() => setConfirmState(null)}
          onConfirm={() => {
            const action = confirmState?.onConfirm;
            setConfirmState(null);
            action?.();
          }}
        />
      </div>
    </ProCanvasActionsProvider>
  );
}

export function ProCanvas({ initialTemplate }: { initialTemplate?: string | null } = {}) {
  return (
    <ReactFlowProvider>
      <ProCanvasBoard initialTemplate={initialTemplate} />
    </ReactFlowProvider>
  );
}
