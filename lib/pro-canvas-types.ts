export type ProCanvasNodeKind =
  | "upload"
  | "image"
  | "video"
  | "text"
  | "audio"
  | "camera"
  | "script"
  | "splice"
  | "textVideo";

export type CanvasNodeBase = {
  label: string;
  /** Short name for @mentions, e.g. "Ava" */
  alias?: string;
  busy?: boolean;
  error?: string;
};

export type UploadNodeData = CanvasNodeBase & {
  kind: "upload";
  fileName?: string;
  previewUrl?: string;
};

export type ImageNodeData = CanvasNodeBase & {
  kind: "image";
  prompt: string;
  imageUrl?: string;
};

export type VideoNodeData = CanvasNodeBase & {
  kind: "video";
  prompt: string;
  camera: string;
  duration: string;
  resolution: "480p" | "720p";
  fast: boolean;
  videoUrl?: string;
};

export type TextNodeData = CanvasNodeBase & {
  kind: "text";
  text: string;
};

export type AudioNodeData = CanvasNodeBase & {
  kind: "audio";
  fileName?: string;
  audioUrl?: string;
};

export type CameraPreset =
  | "custom"
  | "fisheye"
  | "tilt"
  | "front_overhead"
  | "front_upturn"
  | "panorama_overhead"
  | "back_view";

export type CameraNodeData = CanvasNodeBase & {
  kind: "camera";
  preset: CameraPreset;
  spin: number;
  tilt: number;
  zoom: number;
  promptExtra: string;
  imageUrl?: string;
};

export type ScriptNodeData = CanvasNodeBase & {
  kind: "script";
  brief: string;
  scriptText?: string;
  scenePrompts?: string[];
};

export type SpliceNodeData = CanvasNodeBase & {
  kind: "splice";
  videoUrl?: string;
};

export type TextVideoNodeData = CanvasNodeBase & {
  kind: "textVideo";
  prompt: string;
  duration: string;
  resolution: "480p" | "720p";
  fast: boolean;
  videoUrl?: string;
};

export type ProCanvasNodeData =
  | UploadNodeData
  | ImageNodeData
  | VideoNodeData
  | TextNodeData
  | AudioNodeData
  | CameraNodeData
  | ScriptNodeData
  | SpliceNodeData
  | TextVideoNodeData;

export type TaskQueueItem = {
  nodeId: string;
  label: string;
  status: "pending" | "running" | "done" | "error";
  error?: string;
};

export type AddableNodeType = {
  kind: ProCanvasNodeKind;
  label: string;
  group: "node" | "resource";
};

/** Ordered image input for Pro canvas generation (matches @mention slot order). */
export type CanvasImageSource = {
  nodeId: string;
  alias: string;
  file?: File;
  url?: string;
};
