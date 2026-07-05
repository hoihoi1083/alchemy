"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
  Background,
  Controls,
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
import { AudioNode } from "@/components/pro/nodes/AudioNode";
import { CameraNode } from "@/components/pro/nodes/CameraNode";
import { ImageNode } from "@/components/pro/nodes/ImageNode";
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
  imageUrlFromNode,
  isRunnableNode,
  resolveMentions,
  runnableLabel,
  textFromNode,
  topoSortNodes,
  upstreamNodes,
  videoUrlFromNode,
} from "@/lib/pro-canvas-graph";
import { createProCanvasStarter } from "@/lib/pro-canvas-starter";
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
};

let nodeCounter = 0;

function defaultNodeData(kind: ProCanvasNodeKind, label: string): ProCanvasNodeData {
  switch (kind) {
    case "upload":
      return { kind, label };
    case "image":
      return {
        kind,
        label,
        prompt: "Premium vertical social ad, soft studio lighting, clean background, 9:16",
      };
    case "video":
      return {
        kind,
        label,
        prompt: "Subtle natural motion, stable camera, cinematic lighting",
        camera: "Slow Push In",
        duration: "8",
        resolution: "480p",
        fast: true,
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
        duration: "8",
        resolution: "480p",
        fast: true,
      };
  }
}

function ProCanvasBoard() {
  const { m } = useLocale();
  const starter = useMemo(
    () => createProCanvasStarter(m.pro.nodeLabels),
    [m.pro.nodeLabels],
  );
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(starter.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(starter.edges);
  const { getNode, getNodes, getEdges } = useReactFlow();
  const uploadFiles = useRef<Map<string, File>>(new Map());
  const audioFiles = useRef<Map<string, File>>(new Map());
  const [queue, setQueue] = useState<TaskQueueItem[]>([]);
  const [runningAll, setRunningAll] = useState(false);
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

  const onConnect = useCallback(
    (connection: Connection) => setEdges((eds) => addEdge(connection, eds)),
    [setEdges],
  );

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
      const sources = collectImageInputs(nodeId, data.prompt);

      updateNodeData(nodeId, { busy: true, error: undefined });
      try {
        const imageUrl = await runCanvasImageNode({ sources, prompt: data.prompt });
        updateNodeData(nodeId, { imageUrl, busy: false });
      } catch (e: unknown) {
        updateNodeData(nodeId, {
          busy: false,
          error: e instanceof Error ? e.message : "Image failed",
        });
        throw e;
      }
    },
    [collectImageInputs, getNode, getNodes, updateNodeData],
  );

  const runCameraNode = useCallback(
    async (nodeId: string) => {
      const node = getNode(nodeId);
      if (!node) return;
      const data = node.data as CameraNodeData;
      const upstream = upstreamNodes(nodeId, getNodes(), getEdges());
      const sourceUrl = upstream.map(imageUrlFromNode).find((u) => u?.startsWith("http"));

      updateNodeData(nodeId, { busy: true, error: undefined });
      try {
        if (!sourceUrl) throw new Error("Connect an image node with output first.");
        const suffix = cameraPromptSuffix(data);
        const imageUrl = await runCanvasCameraNode({ sourceUrl, cameraSuffix: suffix });
        updateNodeData(nodeId, { imageUrl, busy: false });
      } catch (e: unknown) {
        updateNodeData(nodeId, {
          busy: false,
          error: e instanceof Error ? e.message : "Camera failed",
        });
        throw e;
      }
    },
    [getEdges, getNode, getNodes, updateNodeData],
  );

  const runVideoNode = useCallback(
    async (nodeId: string) => {
      const node = getNode(nodeId);
      if (!node) return;
      const data = node.data as VideoNodeData;
      const upstream = upstreamNodes(nodeId, getNodes(), getEdges());
      const imageUrl = upstream.map(imageUrlFromNode).find((u) => u?.startsWith("http"));
      const prompt = mergeUpstreamText(nodeId, data.prompt);

      updateNodeData(nodeId, { busy: true, error: undefined });
      try {
        if (!imageUrl) throw new Error("Connect an image or camera node with output.");
        const videoUrl = await runCanvasVideoNode({
          imageUrl,
          prompt,
          camera: data.camera,
          duration: data.duration,
          resolution: data.resolution,
          fast: data.fast,
        });
        updateNodeData(nodeId, { videoUrl, busy: false });
      } catch (e: unknown) {
        updateNodeData(nodeId, {
          busy: false,
          error: e instanceof Error ? e.message : "Video failed",
        });
        throw e;
      }
    },
    [getEdges, getNode, getNodes, mergeUpstreamText, updateNodeData],
  );

  const runTextVideoNode = useCallback(
    async (nodeId: string) => {
      const node = getNode(nodeId);
      if (!node) return;
      const data = node.data as TextVideoNodeData;
      const prompt = mergeUpstreamText(nodeId, data.prompt);

      updateNodeData(nodeId, { busy: true, error: undefined });
      try {
        const videoUrl = await runCanvasTextVideoNode({
          prompt,
          duration: data.duration,
          resolution: data.resolution,
          fast: data.fast,
        });
        updateNodeData(nodeId, { videoUrl, busy: false });
      } catch (e: unknown) {
        updateNodeData(nodeId, {
          busy: false,
          error: e instanceof Error ? e.message : "Text-to-video failed",
        });
        throw e;
      }
    },
    [getNode, mergeUpstreamText, updateNodeData],
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
          error: e instanceof Error ? e.message : "Script failed",
        });
        throw e;
      }
    },
    [getNode, mergeUpstreamText, updateNodeData],
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
        .filter((u): u is string => !!u?.startsWith("http"));
      const musicUrl = upstream.map(audioUrlFromNode).find((u) => u?.startsWith("http"));

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
    const sorted = topoSortNodes(allNodes, allEdges).filter(isRunnableNode);
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
        setQueue((q) =>
          q.map((item) =>
            item.nodeId === n.id ? { ...item, status: "error", error: message } : item,
          ),
        );
        break;
      }
    }
    setRunningAll(false);
  }, [getEdges, getNodes, runNode]);

  const addNode = useCallback(
    (kind: ProCanvasNodeKind) => {
      nodeCounter += 1;
      const id = `${kind}-${nodeCounter}`;
      const labels = m.pro.nodeLabels as Record<string, string>;
      const label = labels[kind] ?? kind;
      const newNode: Node = {
        id,
        type: kind,
        position: { x: 80 + (nodeCounter % 4) * 220, y: 80 + Math.floor(nodeCounter / 4) * 180 },
        data: defaultNodeData(kind, label),
      };
      setNodes((nds) => [...nds, newNode]);
    },
    [m.pro.nodeLabels, setNodes],
  );

  const actions = useMemo(
    () => ({
      nodes,
      onUploadFile,
      onUploadAudio,
      runImageNode,
      runVideoNode,
      runTextVideoNode,
      runCameraNode,
      runScriptNode,
      runAudioNode,
      runSpliceNode,
      runNode,
      updateNodeData,
    }),
    [
      nodes,
      onUploadFile,
      onUploadAudio,
      runImageNode,
      runVideoNode,
      runTextVideoNode,
      runCameraNode,
      runScriptNode,
      runAudioNode,
      runSpliceNode,
      runNode,
      updateNodeData,
    ],
  );

  const paletteLabels = {
    addNode: m.pro.addNode,
    addResource: m.pro.addResource,
    ...(m.pro.nodeLabels as Record<string, string>),
  };

  return (
    <ProCanvasActionsProvider value={actions}>
      <div className="relative h-[calc(100vh-8rem)] w-full rounded-2xl border border-slate-700 bg-slate-950">
        <AddNodePalette labels={paletteLabels} onAdd={addNode} />
        <TaskQueuePanel
          items={queue}
          running={runningAll}
          labels={{
            title: m.pro.queueTitle,
            runAll: m.pro.runAll,
            running: m.pro.running,
            empty: m.pro.queueEmpty,
          }}
          onRunAll={runAll}
        />
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          colorMode="dark"
        >
          <Background gap={16} color="#334155" />
          <Controls />
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
