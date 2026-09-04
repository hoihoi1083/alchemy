"use client";

import type { ReactNode } from "react";
import { Handle, Position } from "@xyflow/react";
import { CanvasInput } from "@/components/pro/CanvasTextField";

type Accent = "sky" | "violet" | "amber" | "emerald" | "rose" | "cyan";

const ACCENT: Record<
  Accent,
  { border: string; handle: string; glow: string; label: string }
> = {
  sky: {
    border: "border-sky-500/30",
    handle: "!bg-sky-400",
    glow: "shadow-[0_0_28px_rgba(56,189,248,0.12)]",
    label: "text-sky-400",
  },
  violet: {
    border: "border-violet-500/30",
    handle: "!bg-violet-400",
    glow: "shadow-[0_0_28px_rgba(139,92,246,0.12)]",
    label: "text-violet-400",
  },
  amber: {
    border: "border-amber-500/30",
    handle: "!bg-amber-400",
    glow: "shadow-[0_0_28px_rgba(245,158,11,0.12)]",
    label: "text-amber-400",
  },
  emerald: {
    border: "border-emerald-500/30",
    handle: "!bg-emerald-400",
    glow: "shadow-[0_0_28px_rgba(16,185,129,0.12)]",
    label: "text-emerald-400",
  },
  rose: {
    border: "border-rose-500/30",
    handle: "!bg-rose-400",
    glow: "shadow-[0_0_28px_rgba(244,63,94,0.12)]",
    label: "text-rose-400",
  },
  cyan: {
    border: "border-cyan-500/30",
    handle: "!bg-cyan-400",
    glow: "shadow-[0_0_28px_rgba(34,211,238,0.12)]",
    label: "text-cyan-400",
  },
};

type Props = {
  accent: Accent;
  label: string;
  children: ReactNode;
  widthClass?: string;
  targetHandle?: boolean;
  sourceHandle?: boolean;
  alias?: string;
  onAliasChange?: (value: string) => void;
  aliasPlaceholder?: string;
};

export function ProNodeShell({
  accent,
  label,
  children,
  widthClass = "w-80",
  targetHandle = true,
  sourceHandle = true,
  alias,
  onAliasChange,
  aliasPlaceholder,
}: Props) {
  const theme = ACCENT[accent];

  return (
    <div
      className={`group relative ${widthClass} rounded-xl border bg-gradient-to-br from-slate-900/95 via-slate-950 to-slate-900 p-3 backdrop-blur-sm transition ${theme.border} ${theme.glow}`}
    >
      {targetHandle ? (
        <Handle type="target" position={Position.Left} className={theme.handle} />
      ) : null}
      {/* Drag chrome — grab header / handle to move (inputs stay nodrag). */}
      <div className="mb-2 flex cursor-grab items-center gap-2 active:cursor-grabbing">
        <span
          className="flex h-5 w-4 shrink-0 flex-col items-center justify-center gap-0.5 rounded text-slate-500"
          aria-hidden
          title="Drag"
        >
          <span className="h-0.5 w-2.5 rounded-full bg-current" />
          <span className="h-0.5 w-2.5 rounded-full bg-current" />
          <span className="h-0.5 w-2.5 rounded-full bg-current" />
        </span>
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full bg-current ${theme.label}`} aria-hidden />
        <p className={`min-w-0 flex-1 truncate text-[10px] font-semibold uppercase tracking-[0.14em] ${theme.label}`}>
          {label}
        </p>
      </div>
      {onAliasChange ? (
        <div className="nodrag nopan nowheel mb-1.5">
          <CanvasInput
            value={alias ?? ""}
            onChange={onAliasChange}
            placeholder={aliasPlaceholder}
            className="w-full rounded-md border border-slate-700/80 bg-slate-950/80 px-2 py-0.5 text-[10px] text-slate-300 placeholder:text-slate-600 focus:border-violet-500/50 focus:outline-none"
          />
        </div>
      ) : null}
      {/* Only interactive controls should set nodrag — leave padding/margins draggable. */}
      {children}
      {sourceHandle ? (
        <Handle type="source" position={Position.Right} className={theme.handle} />
      ) : null}
    </div>
  );
}
