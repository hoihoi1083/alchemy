"use client";

import type { NodeProps } from "@xyflow/react";
import { ProNodeShell } from "@/components/pro/ProNodeShell";
import { useProCanvasActions } from "@/components/pro/ProCanvasActions";
import { useLocale } from "@/components/LocaleProvider";
import type { BackgroundModNodeData } from "@/lib/pro-canvas-types";
import { ULTRA_BACKGROUND_PRESETS } from "@/lib/ultra-pro-controls";

export function BackgroundModNode({ id, data }: NodeProps & { data: BackgroundModNodeData }) {
  const { updateNodeData } = useProCanvasActions();
  const { m } = useLocale();
  const pc = m.ultraCanvas.modifierNodes;

  return (
    <ProNodeShell accent="cyan" label={data.label} sourceHandle targetHandle={false} widthClass="w-64">
      <p className="mb-2 text-[10px] text-slate-400">{pc.backgroundHint}</p>
      <select
        value={data.preset}
        onChange={(e) =>
          updateNodeData(id, { preset: e.target.value as BackgroundModNodeData["preset"] })
        }
        className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-[10px] text-slate-200"
      >
        {ULTRA_BACKGROUND_PRESETS.map((p) => (
          <option key={p} value={p}>
            {m.ultraCanvas.proControls.backgroundPresets[p]}
          </option>
        ))}
      </select>
      {data.preset === "custom" ? (
        <input
          value={data.custom ?? ""}
          onChange={(e) => updateNodeData(id, { custom: e.target.value })}
          placeholder={m.ultraCanvas.proControls.customPlaceholder}
          className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-[10px] text-slate-200"
        />
      ) : null}
    </ProNodeShell>
  );
}
