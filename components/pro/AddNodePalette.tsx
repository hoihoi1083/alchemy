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
  { kind: "lighting", label: "Lighting", group: "modifier" },
  { kind: "background", label: "Background", group: "modifier" },
  { kind: "grade", label: "Look grade", group: "modifier" },
  { kind: "upload", label: "Upload", group: "resource" },
  { kind: "brand", label: "Brand kit", group: "resource" },
];

export function AddNodePalette({ labels, onAdd }: Props) {
  const nodes = ADDABLE.filter((a) => a.group === "node");
  const modifiers = ADDABLE.filter((a) => a.group === "modifier");
  const resources = ADDABLE.filter((a) => a.group === "resource");

  return (
    <div className="absolute left-3 top-3 z-10 w-52 rounded-xl border border-cyan-500/20 bg-slate-900/95 p-3 shadow-[0_0_32px_rgba(34,211,238,0.08)] backdrop-blur">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-cyan-300/90">
        {labels.addNode}
      </p>
      <div className="mt-2 space-y-1">
        {nodes.map((item) => (
          <button
            key={item.kind}
            type="button"
            onClick={() => onAdd(item.kind)}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs text-slate-200 transition hover:bg-cyan-950/40 hover:text-cyan-100"
          >
            <span className="text-cyan-500/80">+</span>
            {labels[item.kind] ?? item.label}
          </button>
        ))}
      </div>
      <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-400/80">
        {labels.addModifier}
      </p>
      <div className="mt-2 space-y-1">
        {modifiers.map((item) => (
          <button
            key={item.kind}
            type="button"
            onClick={() => onAdd(item.kind)}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs text-slate-200 transition hover:bg-amber-950/30 hover:text-amber-100"
          >
            <span className="text-amber-500/80">+</span>
            {labels[item.kind] ?? item.label}
          </button>
        ))}
      </div>
      <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
        {labels.addResource}
      </p>
      <div className="mt-2 space-y-1">
        {resources.map((item) => (
          <button
            key={item.kind}
            type="button"
            onClick={() => onAdd(item.kind)}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs text-slate-200 transition hover:bg-slate-800"
          >
            <span className="text-slate-500">+</span>
            {labels[item.kind] ?? item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
