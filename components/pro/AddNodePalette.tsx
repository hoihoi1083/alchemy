"use client";

import type { AddableNodeType } from "@/lib/pro-canvas-types";

type Props = {
  labels: Record<string, string>;
  onAdd: (kind: AddableNodeType["kind"]) => void;
  disabled?: boolean;
  className?: string;
  onClose?: () => void;
};

const ADDABLE: AddableNodeType[] = [
  { kind: "text", label: "Text", group: "node" },
  { kind: "image", label: "Image", group: "node" },
  { kind: "audio", label: "Audio", group: "node" },
  { kind: "voice", label: "Voice", group: "node" },
  { kind: "brainstorm", label: "Brainstorm", group: "node" },
  { kind: "video", label: "Video", group: "node" },
  { kind: "textVideo", label: "Text-to-video", group: "node" },
  { kind: "splice", label: "Video splice", group: "node" },
  { kind: "script", label: "Script planning", group: "node" },
  { kind: "storyboard", label: "Storyboard", group: "node" },
  { kind: "camera", label: "Camera angle", group: "node" },
  { kind: "lighting", label: "Lighting", group: "modifier" },
  { kind: "background", label: "Background", group: "modifier" },
  { kind: "grade", label: "Look grade", group: "modifier" },
  { kind: "upload", label: "Upload", group: "resource" },
  { kind: "character", label: "Character", group: "resource" },
  { kind: "world", label: "World / scene", group: "resource" },
  { kind: "research", label: "Research", group: "resource" },
  { kind: "brand", label: "Brand kit", group: "resource" },
];

export function AddNodePalette({
  labels,
  onAdd,
  disabled = false,
  className = "",
  onClose,
}: Props) {
  const nodes = ADDABLE.filter((a) => a.group === "node");
  const modifiers = ADDABLE.filter((a) => a.group === "modifier");
  const resources = ADDABLE.filter((a) => a.group === "resource");

  return (
    <div
      className={`flex max-h-[min(70vh,560px)] w-52 flex-col overflow-hidden rounded-xl border border-cyan-500/20 bg-slate-900/95 shadow-[0_0_32px_rgba(34,211,238,0.08)] backdrop-blur ${className}`}
    >
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-800/80 px-3 py-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-cyan-300/90">
          {labels.addNode}
        </p>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-600 bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-200 hover:border-cyan-500/50 hover:text-cyan-100"
            aria-label="Close"
          >
            {labels.railClose ?? "−"}
          </button>
        ) : null}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
      <div className="space-y-1">
        {nodes.map((item) => (
          <button
            key={item.kind}
            type="button"
            disabled={disabled}
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
            disabled={disabled}
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
            disabled={disabled}
            onClick={() => onAdd(item.kind)}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs text-slate-200 transition hover:bg-slate-800"
          >
            <span className="text-slate-500">+</span>
            {labels[item.kind] ?? item.label}
          </button>
        ))}
      </div>
      </div>
    </div>
  );
}
