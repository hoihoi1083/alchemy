"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { GradeModNode } from "@/components/pro/nodes/GradeModNode";
import { ImageNode } from "@/components/pro/nodes/ImageNode";
import { LightingModNode } from "@/components/pro/nodes/LightingModNode";
import { ScriptNode } from "@/components/pro/nodes/ScriptNode";
import { SpliceNode } from "@/components/pro/nodes/SpliceNode";
import { TextNode } from "@/components/pro/nodes/TextNode";
import { TextVideoNode } from "@/components/pro/nodes/TextVideoNode";
import { UploadNode } from "@/components/pro/nodes/UploadNode";
import { VideoNode } from "@/components/pro/nodes/VideoNode";
import { useLocale } from "@/components/LocaleProvider";
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
  nodeHasRunnableOutput,
  textFromNode,
  upstreamNodes,
  upstreamNodesSorted,
  videoUrlFromNode,
} from "@/lib/pro-canvas-graph";
import { createProCanvasStarter } from "@/lib/pro-canvas-starter";
import {
  DEFAULT_BACKGROUND_MOD_PRESET,
  DEFAULT_GRADE_ART_STYLE,
  DEFAULT_LIGHTING_MOD_PRESET,
} from "@/lib/pro-canvas-modifiers";
import {
  createUltraCanvasTemplate,
  type UltraCanvasTemplateId,
} from "@/lib/ultra-canvas-templates";
import {
  deserializeUltraCanvasSnapshot,
  serializeUltraCanvasSnapshot,
} from "@/lib/ultra-canvas-snapshot";
import {
  DEFAULT_ULTRA_IMAGE_PRO,
  DEFAULT_ULTRA_VIDEO_PRO,
  videoProFromNodeData,
} from "@/lib/ultra-pro-controls";
import { isHttpOrLibraryMediaUrl } from "@/lib/storage/library-asset-url";
import {
  runCanvasCameraNode,
  runCanvasImageNode,
  runCanvasScriptNode,
  runCanvasSpliceNode,
  runCanvasTextVideoNode,
  runCanvasVideoNode,
  uploadCanvasAsset,
} from "@/lib/pro-canvas-runner";
import type {
  AudioNodeData,
  CameraNodeData,
  ImageNodeData,
  ProCanvasNodeData,
  ProCanvasNodeKind,
  ScriptNodeData,
  TaskQueueItem,
  TextVideoNodeData,
  VideoNodeData,
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
      return { kind, label, brief: "" };
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
  }
}

function ProCanvasBoard() {
  const { m } = useLocale();
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
  const [confirmState, setConfirmState] = useState<{
    title: string;
    message: string;
    destructive?: boolean;
    onConfirm: () => void;
  } | null>(null);
  const [mobilePaletteOpen, setMobilePaletteOpen] = useState(false);
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
  const historyDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirtyRef = useRef(false);

  const boardBusy = useMemo(
    () =>
      runningAll ||
      nodes.some((n) => Boolean((n.data as ProCanvasNodeData).busy)),
    [nodes, runningAll],
  );

  const resetCanvasRuntime = useCallback(() => {
    canvasSessionRef.current += 1;
    runAllAbortRef.current?.abort();
    runAllAbortRef.current = null;
    uploadFiles.current.clear();
    audioFiles.current.clear();
    setRunningAll(false);
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
        nodesRef.current = tpl.nodes;
        edgesRef.current = tpl.edges;
        setNodes(tpl.nodes);
        setEdges(tpl.edges);
        nodeCounter = tpl.nodeCounterSeed;
        setQueue([]);
        setBoardId(null);
        setBoardName(m.ultraCanvas.templates[templateId].name);
        dirtyRef.current = false;
        resetHistory({ nodes: tpl.nodes, edges: tpl.edges });
      });
    },
    [
      tryDiscardThen,
      m.ultraCanvas.nodeLabels,
      m.ultraCanvas.templates,
      resetCanvasRuntime,
      resetHistory,
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
      const session = canvasSessionRef.current;
      const node = getLiveNode(nodeId);
      if (!node) return;
      const data = node.data as ImageNodeData;
      const allNodes = getLiveNodes();
      const allEdges = getLiveEdges();
      const resolvedPrompt = resolveCanvasImagePrompt({
        nodeId,
        basePrompt: data.prompt,
        sceneIndex: data.sceneIndex,
        nodes: allNodes,
        edges: allEdges,
      });
      const missing = findMissingImageSources(nodeId, resolvedPrompt, allNodes, allEdges, (id) =>
        uploadFiles.current.get(id),
      );
      if (missing) {
        updateNodeData(nodeId, { error: missing }, session);
        throw new Error(missing);
      }
      const sources = collectImageInputs(nodeId, resolvedPrompt);

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
        updateNodeData(nodeId, { imageUrl, busy: false }, session);
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
    [collectImageInputs, getLiveEdges, getLiveNode, getLiveNodes, m.errors.tokensNotCharged, updateNodeData],
  );

  const ensureUpstreamImageUrl = useCallback(
    async (upstream: Node[], session: number): Promise<string> => {
      for (const n of upstream) {
        const url = imageUrlFromNode(n);
        if (isHttpOrLibraryMediaUrl(url)) return url;

        const kind = (n.data as ProCanvasNodeData).kind;
        if (kind === "upload") {
          const file = uploadFiles.current.get(n.id);
          if (file) {
            const uploaded = await uploadCanvasAsset(file);
            uploadFiles.current.delete(n.id);
            updateNodeData(n.id, { previewUrl: uploaded, error: undefined }, session);
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
      const session = canvasSessionRef.current;
      const node = getLiveNode(nodeId);
      if (!node) return;
      const data = node.data as CameraNodeData;
      const upstream = upstreamNodes(nodeId, getLiveNodes(), getLiveEdges());

      updateNodeData(nodeId, { busy: true, error: undefined }, session);
      try {
        const sourceUrl = await ensureUpstreamImageUrl(upstream, session);
        const suffix = cameraPromptSuffix(data);
        const imageUrl = await runCanvasCameraNode({ sourceUrl, cameraSuffix: suffix });
        updateNodeData(nodeId, { imageUrl, busy: false }, session);
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
      const session = canvasSessionRef.current;
      const node = getLiveNode(nodeId);
      if (!node) return;
      const data = node.data as VideoNodeData;
      const allNodes = getLiveNodes();
      const allEdges = getLiveEdges();
      const upstream = upstreamNodes(nodeId, allNodes, allEdges);
      const prompt = resolveCanvasVideoPrompt({
        nodeId,
        basePrompt: data.prompt,
        sceneIndex: data.sceneIndex,
        nodes: allNodes,
        edges: allEdges,
      });

      updateNodeData(nodeId, { busy: true, error: undefined }, session);
      try {
        const imageUrl = await ensureUpstreamImageUrl(upstream, session);
        const videoUrl = await runCanvasVideoNode({
          imageUrl,
          prompt,
          pro: videoProFromNodeData(data),
        });
        updateNodeData(nodeId, { videoUrl, busy: false }, session);
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
      const session = canvasSessionRef.current;
      const node = getLiveNode(nodeId);
      if (!node) return;
      const data = node.data as TextVideoNodeData;
      const allNodes = getLiveNodes();
      const allEdges = getLiveEdges();
      const prompt = resolveCanvasVideoPrompt({
        nodeId,
        basePrompt: data.prompt,
        sceneIndex: data.sceneIndex,
        nodes: allNodes,
        edges: allEdges,
      });

      updateNodeData(nodeId, { busy: true, error: undefined }, session);
      try {
        const videoUrl = await runCanvasTextVideoNode({
          prompt,
          pro: videoProFromNodeData(data),
        });
        updateNodeData(nodeId, { videoUrl, busy: false }, session);
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
      if (getLiveEdges().some((e) => e.source === scriptNodeId)) return;
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
    [getLiveEdges, getLiveNode, markDirty, m.ultraCanvas.nodeLabels, scheduleHistory, setEdges, setNodes],
  );

  const spawnScenePipeline = useCallback(
    (scriptNodeId: string) => {
      if (getLiveEdges().some((e) => e.source === scriptNodeId)) return;
      const scriptNode = getLiveNode(scriptNodeId);
      if (!scriptNode) return;
      const scenes = scriptScenePromptsFromNode(scriptNode);
      if (!scenes.length) return;

      const labels = m.ultraCanvas.nodeLabels as Record<string, string>;
      const imageLabel = labels.image ?? "Image";
      const videoLabel = labels.video ?? "Image-to-video";
      const newNodes: Node[] = [];
      const newEdges: Edge[] = [];

      scenes.forEach((_scenePrompt, i) => {
        nodeCounter += 1;
        const imageId = `image-scene-${nodeCounter}`;
        nodeCounter += 1;
        const videoId = `video-scene-${nodeCounter}`;
        const rowY = scriptNode.position.y + i * 240;

        newNodes.push(
          {
            id: imageId,
            type: "image",
            position: { x: scriptNode.position.x + 280, y: rowY },
            data: {
              kind: "image",
              label: `${imageLabel} ${i + 1}`,
              prompt: "",
              sceneIndex: i,
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
              prompt: "",
              sceneIndex: i,
              camera: DEFAULT_ULTRA_VIDEO_PRO.camera,
              duration: DEFAULT_ULTRA_VIDEO_PRO.duration,
              resolution: DEFAULT_ULTRA_VIDEO_PRO.resolution,
              fast: DEFAULT_ULTRA_VIDEO_PRO.fast,
              aspectRatio: DEFAULT_ULTRA_VIDEO_PRO.aspectRatio,
              artStyleId: DEFAULT_ULTRA_VIDEO_PRO.artStyleId,
            } satisfies VideoNodeData,
          },
        );
        newEdges.push(
          { id: `e-${scriptNodeId}-${imageId}`, source: scriptNodeId, target: imageId },
          { id: `e-${imageId}-${videoId}`, source: imageId, target: videoId },
        );
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
    [getLiveEdges, getLiveNode, markDirty, m.ultraCanvas.nodeLabels, scheduleHistory, setEdges, setNodes],
  );

  const runScriptNode = useCallback(
    async (nodeId: string) => {
      const session = canvasSessionRef.current;
      const node = getLiveNode(nodeId);
      if (!node) return;
      const data = node.data as ScriptNodeData;
      const brief = mergeUpstreamText(nodeId, data.brief);

      updateNodeData(nodeId, { busy: true, error: undefined }, session);
      try {
        const { scriptText, scenePrompts } = await runCanvasScriptNode({ brief });
        updateNodeData(nodeId, { scriptText, scenePrompts, busy: false }, session);
      } catch (e: unknown) {
        updateNodeData(
          nodeId,
          {
            busy: false,
            error: withNotChargedNote(
              e instanceof Error ? e.message : "Script failed",
              m.errors.tokensNotCharged,
            ),
          },
          session,
        );
        throw e;
      }
    },
    [getLiveNode, mergeUpstreamText, m.errors.tokensNotCharged, updateNodeData],
  );

  const runAudioNode = useCallback(
    async (nodeId: string) => {
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

  const runSpliceNode = useCallback(
    async (nodeId: string) => {
      const session = canvasSessionRef.current;
      const allNodes = getLiveNodes();
      const upstream = upstreamNodesSorted(nodeId, allNodes, getLiveEdges());
      const videoUrls = upstream
        .map(videoUrlFromNode)
        .filter((u): u is string => isHttpOrLibraryMediaUrl(u));

      let musicUrl: string | undefined;
      for (const n of upstream) {
        if ((n.data as ProCanvasNodeData).kind !== "audio") continue;
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

      const hasAudioUpstream = upstream.some((n) => (n.data as ProCanvasNodeData).kind === "audio");
      if (hasAudioUpstream && !musicUrl) {
        const msg = "Upload audio to cloud or pick from library before splicing.";
        updateNodeData(nodeId, { error: msg }, session);
        throw new Error(msg);
      }

      updateNodeData(nodeId, { busy: true, error: undefined }, session);
      try {
        const videoUrl = await runCanvasSpliceNode({ videoUrls, musicUrl });
        updateNodeData(nodeId, { videoUrl, busy: false }, session);
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
    [getLiveEdges, getLiveNodes, updateNodeData],
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
      runCameraNode,
      runImageNode,
      runScriptNode,
      runSpliceNode,
      runTextVideoNode,
      runVideoNode,
    ],
  );

  const stopRunAll = useCallback(() => {
    runAllAbortRef.current?.abort();
  }, []);

  const runAll = useCallback(async () => {
    runAllAbortRef.current?.abort();
    const abort = new AbortController();
    runAllAbortRef.current = abort;

    const allNodes = getLiveNodes();
    const allEdges = getLiveEdges();
    const { sorted, error: orderError } = runnableExecutionOrder(allNodes, allEdges);
    if (orderError) {
      setBoardError(orderError);
      runAllAbortRef.current = null;
      return;
    }
    const pending = sorted.filter((n) => !nodeHasRunnableOutput(n));
    if (pending.length === 0) {
      setBoardError(m.ultraCanvas.runAllEmpty);
      runAllAbortRef.current = null;
      return;
    }
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
          q.map((item) => (item.nodeId === n.id ? { ...item, status: "done", error: undefined } : item)),
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
    runAllAbortRef.current = null;
  }, [
    getLiveEdges,
    getLiveNodes,
    m.ultraCanvas.queueSkipped,
    m.ultraCanvas.runAllEmpty,
    m.ultraCanvas.runCancelled,
    runNode,
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
    tryDiscardThen(() => {
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
    });
  }, [tryDiscardThen, m.ultraCanvas.nodeLabels, resetCanvasRuntime, resetHistory, setEdges, setNodes]);

  const persistLocalAssetsBeforeSave = useCallback(async () => {
    const patches = new Map<string, Record<string, unknown>>();
    const uploads = [...uploadFiles.current.entries()];
    const audios = [...audioFiles.current.entries()];
    for (const [nodeId, file] of uploads) {
      const url = await uploadCanvasAsset(file);
      uploadFiles.current.delete(nodeId);
      const patch = { previewUrl: url, fileName: file.name, error: undefined };
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
  }, [updateNodeData]);

  const saveBoard = useCallback(async () => {
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
  }, [boardId, boardName, getLiveEdges, getLiveNodes, persistLocalAssetsBeforeSave]);

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

  const actions = useMemo(
    () => ({
      nodes,
      onUploadFile,
      onUploadAudio,
      onPickLibraryImage,
      onPickLibraryAudio,
      runImageNode,
      runVideoNode,
      runTextVideoNode,
      runCameraNode,
      runScriptNode,
      spawnSceneNodes,
      spawnScenePipeline,
      runAudioNode,
      runSpliceNode,
      runNode,
      updateNodeData,
    }),
    [
      nodes,
      onUploadFile,
      onUploadAudio,
      onPickLibraryImage,
      onPickLibraryAudio,
      runImageNode,
      runVideoNode,
      runTextVideoNode,
      runCameraNode,
      runScriptNode,
      spawnSceneNodes,
      spawnScenePipeline,
      runAudioNode,
      runSpliceNode,
      runNode,
      updateNodeData,
    ],
  );

  const paletteLabels = {
    addNode: m.ultraCanvas.addNode,
    addResource: m.ultraCanvas.addResource,
    addModifier: m.ultraCanvas.addModifier,
    ...(m.ultraCanvas.nodeLabels as Record<string, string>),
  };

  return (
    <ProCanvasActionsProvider value={actions}>
      <div className="relative min-h-[560px] h-[min(72vh,880px)] w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 shadow-lg shadow-slate-900/10 ring-1 ring-slate-900/5">
        {boardBusy ? (
          <div
            className="absolute left-0 right-0 top-0 z-20 flex items-center justify-center gap-2 border-b border-amber-600/40 bg-amber-500/95 px-3 py-2 text-xs font-semibold text-amber-950"
            role="status"
            aria-live="polite"
          >
            {m.ultraCanvas.busyBanner}
          </div>
        ) : null}
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 10%, rgba(139,92,246,0.15), transparent 40%), radial-gradient(circle at 80% 90%, rgba(56,189,248,0.1), transparent 35%)",
          }}
        />
        <div className="absolute left-3 top-3 z-10 hidden md:block">
          <AddNodePalette labels={paletteLabels} onAdd={addNode} disabled={boardBusy} />
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
            />
          }
        />
        <ReactFlow
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

export function ProCanvas() {
  return (
    <ReactFlowProvider>
      <ProCanvasBoard />
    </ReactFlowProvider>
  );
}
