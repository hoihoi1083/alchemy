"use client";

import { useEffect } from "react";
import type { NodeProps } from "@xyflow/react";
import { ProNodeShell } from "@/components/pro/ProNodeShell";
import { useProCanvasActions } from "@/components/pro/ProCanvasActions";
import { useLocale } from "@/components/LocaleProvider";
import type { BrandNodeData } from "@/lib/pro-canvas-types";
import { isHttpOrLibraryMediaUrl } from "@/lib/storage/library-asset-url";

export function BrandNode({ id, data }: NodeProps & { data: BrandNodeData }) {
  const { updateNodeData } = useProCanvasActions();
  const { m } = useLocale();
  const bn = m.ultraCanvas.brandNode;

  useEffect(() => {
    if (data.logoUrl) return;
    void (async () => {
      try {
        const res = await fetch("/api/brand-kit");
        const json = await res.json().catch(() => ({}));
        const kit = (json as { kit?: BrandNodeData & { logoUrl?: string } }).kit;
        if (kit?.logoUrl && isHttpOrLibraryMediaUrl(kit.logoUrl)) {
          updateNodeData(id, {
            logoUrl: kit.logoUrl,
            tagline: kit.tagline,
            primaryColor: kit.primaryColor,
          });
        }
      } catch {
        /* optional */
      }
    })();
  }, [data.logoUrl, id, updateNodeData]);

  return (
    <ProNodeShell
      accent="emerald"
      label={data.label}
      sourceHandle
      targetHandle={false}
      alias={data.alias ?? "brand"}
      onAliasChange={(alias) => updateNodeData(id, { alias })}
      aliasPlaceholder={bn.aliasPlaceholder}
      widthClass="w-64"
    >
      <p className="mb-2 text-[10px] text-slate-400">{bn.hint}</p>
      {data.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={data.logoUrl} alt="" className="max-h-24 w-full rounded-lg object-contain ring-1 ring-emerald-500/20" />
      ) : (
        <p className="rounded-lg border border-dashed border-slate-600 px-3 py-4 text-center text-[10px] text-slate-500">
          {bn.empty}
        </p>
      )}
      {data.tagline ? (
        <p className="mt-1 text-[10px] italic text-slate-400">&ldquo;{data.tagline}&rdquo;</p>
      ) : null}
      <a
        href="/brand-kit"
        className="mt-2 block text-center text-[10px] text-emerald-400/90 underline-offset-2 hover:underline"
      >
        {bn.editKit}
      </a>
    </ProNodeShell>
  );
}
