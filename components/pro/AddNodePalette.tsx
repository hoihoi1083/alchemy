"use client";

import type { AddableNodeType } from "@/lib/pro-canvas-types";

type Props = {
  labels: Record<string, string>;
  onAdd: (kind: AddableNodeType["kind"]) => void;
};

const ADDABLE: AddableNodeType[] = [
  { kind: "text", label: "Text", group: "node" },
  { kind: "image", label: "Image", group: "node" },
  { kind: "audio", label: "Audio", group: "node" },
  { kind: "video", label: "Video", group: "node" },
  { kind: "textVideo", label: "Text-to-video", group: "node" },
  { kind: "splice", label: "Video splice", group: "node" },
  { kind: "script", label: "Script planning", group: "node" },
  { kind: "camera", label: "Camera angle", group: "node" },
  { kind: "upload", label: "Upload", group: "resource" },
];

export function AddNodePalette({ labels, onAdd }: Props) {
  const nodes = ADDABLE.filter((a) => a.group === "node");
  const resources = ADDABLE.filter((a) => a.group === "resource");

  return (
    <div className="absolute left-3 top-3 z-10 w-52 rounded-xl border border-slate-700 bg-slate-900/95 p-3 shadow-xl backdrop-blur">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
        {labels.addNode}
      </p>
      <div className="mt-2 space-y-1">
        {nodes.map((item) => (
          <button
            key={item.kind}
            type="button"
            onClick={() => onAdd(item.kind)}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs text-slate-200 hover:bg-slate-800"
          >
            <span className="text-slate-500">+</span>
            {labels[item.kind] ?? item.label}
          </button>
        ))}
      </div>
      <p className="mt-3 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
        {labels.addResource}
      </p>
      <div className="mt-2 space-y-1">
        {resources.map((item) => (
          <button
            key={item.kind}
            type="button"
            onClick={() => onAdd(item.kind)}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs text-slate-200 hover:bg-slate-800"
          >
            <span className="text-slate-500">+</span>
            {labels[item.kind] ?? item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
