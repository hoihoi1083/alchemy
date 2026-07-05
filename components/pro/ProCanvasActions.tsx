"use client";

import { createContext, useContext } from "react";
import type { Node } from "@xyflow/react";

export type ProCanvasActions = {
  nodes: Node[];
  onUploadFile: (nodeId: string, file: File) => void;
  onUploadAudio: (nodeId: string, file: File) => void;
  runImageNode: (nodeId: string) => Promise<void>;
  runVideoNode: (nodeId: string) => Promise<void>;
  runTextVideoNode: (nodeId: string) => Promise<void>;
  runCameraNode: (nodeId: string) => Promise<void>;
  runScriptNode: (nodeId: string) => Promise<void>;
  runAudioNode: (nodeId: string) => Promise<void>;
  runSpliceNode: (nodeId: string) => Promise<void>;
  runNode: (nodeId: string) => Promise<void>;
  updateNodeData: (nodeId: string, patch: Record<string, unknown>) => void;
};

const Ctx = createContext<ProCanvasActions | null>(null);

export function ProCanvasActionsProvider({
  value,
  children,
}: {
  value: ProCanvasActions;
  children: React.ReactNode;
}) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useProCanvasActions(): ProCanvasActions {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useProCanvasActions outside provider");
  return ctx;
}
