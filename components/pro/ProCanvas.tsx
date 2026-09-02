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
  useReactFlow,
  type Connection,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { AddNodePalette } from "@/components/pro/AddNodePalette";
import { ProCanvasActionsProvider } from "@/components/pro/ProCanvasActions";
import { TaskQueuePanel } from "@/components/pro/TaskQueuePanel";
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
  textFromNode,
  upstreamNodes,
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
  const { getNode, getNodes, getEdges } = useReactFlow();
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
  const historyRef = useRef<CanvasSnapshot[]>([]);
  const historyIndexRef = useRef(0);
  const skipHistoryRef = useRef(false);
  const counterSeeded = useRef(false);
  if (!counterSeeded.current) {
    nodeCounter = starter.nodeCounterSeed;
    counterSeeded.current = true;
  }

  const updateNodeData = useCallback(
    (nodeId: string, patch: Record<string, unknown>) => {
      setNodes((nds) =>
        nds.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, ...patch } } : n)),
      );
    },
    [setNodes],
  );

  const snapshotCanvas = useCallback((): CanvasSnapshot => {
    return JSON.parse(JSON.stringify({ nodes: getNodes(), edges: getEdges() }));
  }, [getEdges, getNodes]);

  const pushHistory = useCallback(() => {
    if (skipHistoryRef.current) return;
    const snap = snapshotCanvas();
    const stack = historyRef.current.slice(0, historyIndexRef.current + 1);
    stack.push(snap);
    if (stack.length > 40) stack.shift();
    historyRef.current = stack;
    historyIndexRef.current = stack.length - 1;
  }, [snapshotCanvas]);

  const applySnapshot = useCallback(
    (snap: CanvasSnapshot) => {
      skipHistoryRef.current = true;
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
    const selected = getNodes().filter((n) => n.selected);
    if (!selected.length) return;
    pushHistory();
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
    setNodes((nds) => [
      ...nds.map((n) => ({ ...n, selected: false })),
      ...clones.map((c) => ({ ...c, selected: true })),
    ]);
  }, [getNodes, pushHistory, setNodes]);

  const deleteSelectedNodes = useCallback(() => {
    const selectedIds = new Set(getNodes().filter((n) => n.selected).map((n) => n.id));
    if (!selectedIds.size) return;
    pushHistory();
    setNodes((nds) => nds.filter((n) => !selectedIds.has(n.id)));
    setEdges((eds) => eds.filter((e) => !selectedIds.has(e.source) && !selectedIds.has(e.target)));
  }, [getNodes, pushHistory, setEdges, setNodes]);

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
      pushHistory();
      const labels = {
        ...m.ultraCanvas.nodeLabels,
        lighting: m.ultraCanvas.nodeLabels.lighting ?? "Lighting",
        background: m.ultraCanvas.nodeLabels.background ?? "Background",
        grade: m.ultraCanvas.nodeLabels.grade ?? "Look grade",
      } as Record<string, string>;
      const tpl = createUltraCanvasTemplate(templateId, labels);
      setNodes(tpl.nodes);
      setEdges(tpl.edges);
      nodeCounter = tpl.nodeCounterSeed;
      setQueue([]);
      setBoardId(null);
      setBoardName(m.ultraCanvas.templates[templateId].name);
      resetHistory({ nodes: tpl.nodes, edges: tpl.edges });
    },
    [m.ultraCanvas.nodeLabels, m.ultraCanvas.templates, pushHistory, resetHistory, setEdges, setNodes],
  );

  useEffect(() => {
    historyRef.current = [snapshotCanvas()];
    historyIndexRef.current = 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seed once on mount
  }, []);

  const saveBoardRef = useRef<(() => Promise<void>) | null>(null);

  const onConnect = useCallback(
    (connection: Connection) => {
      pushHistory();
      setEdges((eds) => addEdge(connection, eds));
    },
    [pushHistory, setEdges],
  );

  const onNodeDragStop = useCallback(() => {
    pushHistory();
  }, [pushHistory]);

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
      collectOrderedImageSources(nodeId, prompt, getNodes(), getEdges(), (id) =>
        uploadFiles.current.get(id),
      ),
    [getEdges, getNodes],
  );

  const mergeUpstreamText = useCallback(
    (nodeId: string, base: string) => {
      const allNodes = getNodes();
      const texts = upstreamNodes(nodeId, allNodes, getEdges())
        .map(textFromNode)
        .filter((t): t is string => !!t?.trim());
      const merged = [base.trim(), ...texts].filter(Boolean).join("\n\n");
      return resolveMentions(merged, allNodes);
    },
    [getEdges, getNodes],
  );

  const runImageNode = useCallback(
    async (nodeId: string) => {
      const node = getNode(nodeId);
      if (!node) return;
      const data = node.data as ImageNodeData;
      const allNodes = getNodes();
      const allEdges = getEdges();
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
        updateNodeData(nodeId, { error: missing });
        throw new Error(missing);
      }
      const sources = collectImageInputs(nodeId, resolvedPrompt);

      updateNodeData(nodeId, { busy: true, error: undefined });
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
        updateNodeData(nodeId, { imageUrl, busy: false });
      } catch (e: unknown) {
        updateNodeData(nodeId, {
          busy: false,
          error: withNotChargedNote(
            e instanceof Error ? e.message : "Image failed",
            m.errors.tokensNotCharged,
          ),
        });
        throw e;
      }
    },
    [collectImageInputs, getEdges, getNode, getNodes, m.errors.tokensNotCharged, updateNodeData],
  );

  const ensureUpstreamImageUrl = useCallback(
    async (upstream: Node[]): Promise<string> => {
      for (const n of upstream) {
        const url = imageUrlFromNode(n);
        if (isHttpOrLibraryMediaUrl(url)) return url;

        const kind = (n.data as ProCanvasNodeData).kind;
        if (kind === "upload") {
          const file = uploadFiles.current.get(n.id);
          if (file) {
            const uploaded = await uploadCanvasAsset(file);
            uploadFiles.current.delete(n.id);
            updateNodeData(n.id, { previewUrl: uploaded, error: undefined });
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
      const node = getNode(nodeId);
      if (!node) return;
      const data = node.data as CameraNodeData;
      const upstream = upstreamNodes(nodeId, getNodes(), getEdges());

      updateNodeData(nodeId, { busy: true, error: undefined });
      try {
        const sourceUrl = await ensureUpstreamImageUrl(upstream);
        const suffix = cameraPromptSuffix(data);
        const imageUrl = await runCanvasCameraNode({ sourceUrl, cameraSuffix: suffix });
        updateNodeData(nodeId, { imageUrl, busy: false });
      } catch (e: unknown) {
        updateNodeData(nodeId, {
          busy: false,
          error: withNotChargedNote(
            e instanceof Error ? e.message : "Camera failed",
            m.errors.tokensNotCharged,
          ),
        });
        throw e;
      }
    },
    [ensureUpstreamImageUrl, getEdges, getNode, getNodes, m.errors.tokensNotCharged, updateNodeData],
  );

  const runVideoNode = useCallback(
    async (nodeId: string) => {
      const node = getNode(nodeId);
      if (!node) return;
      const data = node.data as VideoNodeData;
      const allNodes = getNodes();
      const allEdges = getEdges();
      const upstream = upstreamNodes(nodeId, allNodes, allEdges);
      const prompt = resolveCanvasVideoPrompt({
        nodeId,
        basePrompt: data.prompt,
        sceneIndex: data.sceneIndex,
        nodes: allNodes,
        edges: allEdges,
      });

      updateNodeData(nodeId, { busy: true, error: undefined });
      try {
        const imageUrl = await ensureUpstreamImageUrl(upstream);
        const videoUrl = await runCanvasVideoNode({
          imageUrl,
          prompt,
          pro: videoProFromNodeData(data),
        });
        updateNodeData(nodeId, { videoUrl, busy: false });
      } catch (e: unknown) {
        updateNodeData(nodeId, {
          busy: false,
          error: withNotChargedNote(
            e instanceof Error ? e.message : "Video failed",
            m.errors.tokensNotCharged,
          ),
        });
        throw e;
      }
    },
    [ensureUpstreamImageUrl, getEdges, getNode, getNodes, m.errors.tokensNotCharged, updateNodeData],
  );

  const runTextVideoNode = useCallback(
    async (nodeId: string) => {
      const node = getNode(nodeId);
      if (!node) return;
      const data = node.data as TextVideoNodeData;
      const allNodes = getNodes();
      const allEdges = getEdges();
      const prompt = resolveCanvasVideoPrompt({
        nodeId,
        basePrompt: data.prompt,
        sceneIndex: data.sceneIndex,
        nodes: allNodes,
        edges: allEdges,
      });

      updateNodeData(nodeId, { busy: true, error: undefined });
      try {
        const videoUrl = await runCanvasTextVideoNode({
          prompt,
          pro: videoProFromNodeData(data),
        });
        updateNodeData(nodeId, { videoUrl, busy: false });
      } catch (e: unknown) {
        updateNodeData(nodeId, {
          busy: false,
          error: withNotChargedNote(
            e instanceof Error ? e.message : "Text-to-video failed",
            m.errors.tokensNotCharged,
          ),
        });
        throw e;
      }
    },
    [getEdges, getNode, getNodes, m.errors.tokensNotCharged, updateNodeData],
  );

  const spawnSceneNodes = useCallback(
    (scriptNodeId: string) => {
      const scriptNode = getNode(scriptNodeId);
      if (!scriptNode) return;
      const scenes = scriptScenePromptsFromNode(scriptNode);
      if (!scenes.length) return;
      pushHistory();

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

      setNodes((nds) => [...nds, ...newNodes]);
      setEdges((eds) => [...eds, ...newEdges]);
    },
    [getNode, m.ultraCanvas.nodeLabels, pushHistory, setEdges, setNodes],
  );

  const spawnScenePipeline = useCallback(
    (scriptNodeId: string) => {
      const scriptNode = getNode(scriptNodeId);
      if (!scriptNode) return;
      const scenes = scriptScenePromptsFromNode(scriptNode);
      if (!scenes.length) return;
      pushHistory();

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

      setNodes((nds) => [...nds, ...newNodes]);
      setEdges((eds) => [...eds, ...newEdges]);
    },
    [getNode, m.ultraCanvas.nodeLabels, pushHistory, setEdges, setNodes],
  );

  const runScriptNode = useCallback(
    async (nodeId: string) => {
      const node = getNode(nodeId);
      if (!node) return;
      const data = node.data as ScriptNodeData;
      const brief = mergeUpstreamText(nodeId, data.brief);

      updateNodeData(nodeId, { busy: true, error: undefined });
      try {
        const { scriptText, scenePrompts } = await runCanvasScriptNode({ brief });
        updateNodeData(nodeId, { scriptText, scenePrompts, busy: false });
      } catch (e: unknown) {
        updateNodeData(nodeId, {
          busy: false,
          error: withNotChargedNote(
            e instanceof Error ? e.message : "Script failed",
            m.errors.tokensNotCharged,
          ),
        });
        throw e;
      }
    },
    [getNode, mergeUpstreamText, m.errors.tokensNotCharged, updateNodeData],
  );

  const runAudioNode = useCallback(
    async (nodeId: string) => {
      const file = audioFiles.current.get(nodeId);
      if (!file) {
        updateNodeData(nodeId, { error: "Choose an audio file first." });
        return;
      }
      updateNodeData(nodeId, { busy: true, error: undefined });
      try {
        const audioUrl = await uploadCanvasAsset(file);
        updateNodeData(nodeId, { audioUrl, busy: false });
      } catch (e: unknown) {
        updateNodeData(nodeId, {
          busy: false,
          error: e instanceof Error ? e.message : "Audio upload failed",
        });
        throw e;
      }
    },
    [updateNodeData],
  );

  const runSpliceNode = useCallback(
    async (nodeId: string) => {
      const allNodes = getNodes();
      const upstream = upstreamNodes(nodeId, allNodes, getEdges());
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
          updateNodeData(n.id, { busy: true, error: undefined });
          try {
            const uploaded = await uploadCanvasAsset(file);
            audioFiles.current.delete(n.id);
            updateNodeData(n.id, { audioUrl: uploaded, busy: false });
            musicUrl = uploaded;
            break;
          } catch (e: unknown) {
            updateNodeData(n.id, {
              busy: false,
              error: e instanceof Error ? e.message : "Audio upload failed",
            });
            throw e;
          }
        }
      }

      const hasAudioUpstream = upstream.some((n) => (n.data as ProCanvasNodeData).kind === "audio");
      if (hasAudioUpstream && !musicUrl) {
        const msg = "Upload audio to cloud or pick from library before splicing.";
        updateNodeData(nodeId, { error: msg });
        throw new Error(msg);
      }

      updateNodeData(nodeId, { busy: true, error: undefined });
      try {
        const videoUrl = await runCanvasSpliceNode({ videoUrls, musicUrl });
        updateNodeData(nodeId, { videoUrl, busy: false });
      } catch (e: unknown) {
        updateNodeData(nodeId, {
          busy: false,
          error: e instanceof Error ? e.message : "Splice failed",
        });
        throw e;
      }
    },
    [getEdges, getNodes, updateNodeData],
  );

  const runNode = useCallback(
    async (nodeId: string) => {
      const node = getNode(nodeId);
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
      getNode,
      runAudioNode,
      runCameraNode,
      runImageNode,
      runScriptNode,
      runSpliceNode,
      runTextVideoNode,
      runVideoNode,
    ],
  );

  const runAll = useCallback(async () => {
    const allNodes = getNodes();
    const allEdges = getEdges();
    const { sorted, error: orderError } = runnableExecutionOrder(allNodes, allEdges);
    if (orderError) {
      setBoardError(orderError);
      return;
    }
    if (sorted.length === 0) {
      setBoardError(m.ultraCanvas.runAllEmpty);
      return;
    }
    const items: TaskQueueItem[] = sorted.map((n) => ({
      nodeId: n.id,
      label: runnableLabel(n),
      status: "pending",
    }));
    setQueue(items);
    setRunningAll(true);

    for (let i = 0; i < sorted.length; i++) {
      const n = sorted[i];
      setQueue((q) =>
        q.map((item) => (item.nodeId === n.id ? { ...item, status: "running" } : item)),
      );
      try {
        await runNode(n.id);
        setQueue((q) =>
          q.map((item) => (item.nodeId === n.id ? { ...item, status: "done", error: undefined } : item)),
        );
      } catch (e: unknown) {
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
    setRunningAll(false);
  }, [getEdges, getNodes, m.ultraCanvas.queueSkipped, m.ultraCanvas.runAllEmpty, runNode]);

  const addNode = useCallback(
    (kind: ProCanvasNodeKind) => {
      pushHistory();
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
      setNodes((nds) => [...nds, newNode]);
    },
    [m.ultraCanvas.nodeLabels, pushHistory, setNodes],
  );

  const resetBoard = useCallback(() => {
    const fresh = createProCanvasStarter(m.ultraCanvas.nodeLabels);
    setNodes(fresh.nodes);
    setEdges(fresh.edges);
    setQueue([]);
    setBoardId(null);
    setBoardName("Untitled board");
    nodeCounter = fresh.nodeCounterSeed;
    uploadFiles.current.clear();
    audioFiles.current.clear();
    resetHistory({ nodes: fresh.nodes, edges: fresh.edges });
  }, [m.ultraCanvas.nodeLabels, resetHistory, setEdges, setNodes]);

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
      const nodesForSave = getNodes().map((n) => {
        const patch = patches.get(n.id);
        return patch ? { ...n, data: { ...n.data, ...patch } } : n;
      });
      const snapshot = serializeUltraCanvasSnapshot(nodesForSave, getEdges(), nodeCounter);
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
    } catch (e: unknown) {
      setBoardError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }, [boardId, boardName, getEdges, getNodes, persistLocalAssetsBeforeSave]);

  const loadBoard = useCallback(
    async (id: string) => {
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
          const data = n.data as ProCanvasNodeData;
          if (data.kind === "upload" && data.fileName && !isHttpOrLibraryMediaUrl(data.previewUrl)) {
            return {
              ...n,
              data: {
                ...data,
                previewUrl: undefined,
                error: m.ultraCanvas.missingLocalAsset,
              },
            };
          }
          if (data.kind === "audio" && data.fileName && !isHttpOrLibraryMediaUrl(data.audioUrl)) {
            return {
              ...n,
              data: {
                ...data,
                audioUrl: undefined,
                error: m.ultraCanvas.missingLocalAsset,
              },
            };
          }
          return n;
        });
        setNodes(marked);
        setEdges(restored.edges);
        setQueue([]);
        nodeCounter = restored.nodeCounterSeed;
        setBoardId(id);
        setBoardName((data as { name?: string }).name ?? "Untitled board");
        uploadFiles.current.clear();
        audioFiles.current.clear();
        resetHistory({ nodes: restored.nodes, edges: restored.edges });
      } catch (e: unknown) {
        setBoardError(e instanceof Error ? e.message : "Load failed.");
      } finally {
        setLoadingBoard(false);
      }
    },
    [m.ultraCanvas.missingLocalAsset, resetHistory, setEdges, setNodes],
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
      <div className="relative h-[calc(100vh-8rem)] w-full overflow-hidden rounded-2xl border border-violet-500/20 bg-slate-950 shadow-[inset_0_0_80px_rgba(99,102,241,0.06)]">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 10%, rgba(139,92,246,0.15), transparent 40%), radial-gradient(circle at 80% 90%, rgba(56,189,248,0.1), transparent 35%)",
          }}
        />
        <AddNodePalette labels={paletteLabels} onAdd={addNode} />
        <div className="absolute right-3 top-3 z-10 flex w-[min(100%,32rem)] flex-col items-stretch gap-2">
          <UltraCanvasToolbar
            boardName={boardName}
            boardId={boardId}
            saving={saving}
            saveSuccessAt={saveSuccessAt}
            loading={loadingBoard}
            boardError={boardError}
            onBoardNameChange={setBoardName}
            onSave={() => void saveBoard()}
            onNew={resetBoard}
            onLoad={(id) => void loadBoard(id)}
            onUndo={undo}
            onRedo={redo}
            onLoadTemplate={loadTemplate}
          />
          <TaskQueuePanel
            items={queue}
            running={runningAll}
            labels={{
              title: m.ultraCanvas.queueTitle,
              runAll: m.ultraCanvas.runAll,
              running: m.ultraCanvas.running,
              empty: m.ultraCanvas.queueEmpty,
            }}
            onRunAll={runAll}
          />
        </div>
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
