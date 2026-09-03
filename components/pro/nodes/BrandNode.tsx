"use client";

import { useEffect, useState } from "react";
import type { NodeProps } from "@xyflow/react";
import { ProNodeShell } from "@/components/pro/ProNodeShell";
import { UltraLibraryPicker } from "@/components/pro/UltraLibraryPicker";
import { useProCanvasActions } from "@/components/pro/ProCanvasActions";
import { useLocale } from "@/components/LocaleProvider";
import type { BrandNodeData } from "@/lib/pro-canvas-types";
import { isHttpOrLibraryMediaUrl } from "@/lib/storage/library-asset-url";

export function BrandNode({ id, data }: NodeProps & { data: BrandNodeData }) {
  const { updateNodeData, onUploadFile, onPickLibraryImage } = useProCanvasActions();
  const { m } = useLocale();
  const bn = m.ultraCanvas.brandNode;
  const [pickerOpen, setPickerOpen] = useState(false);

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
    <>
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
          <img
            src={data.logoUrl}
            alt=""
            className="max-h-24 w-full rounded-lg object-contain ring-1 ring-emerald-500/20"
          />
        ) : (
          <p className="rounded-lg border border-dashed border-slate-600 px-3 py-3 text-center text-[10px] text-slate-500">
            {bn.empty}
          </p>
        )}
        {data.tagline ? (
          <p className="mt-1 text-[10px] italic text-slate-400">&ldquo;{data.tagline}&rdquo;</p>
        ) : null}
        <label className="mt-2 block cursor-pointer rounded-lg border border-dashed border-emerald-500/30 bg-emerald-950/10 px-3 py-2 text-center text-xs text-slate-300 transition hover:border-emerald-400/50 hover:bg-emerald-950/20">
          {bn.uploadLogo}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              onUploadFile(id, file);
              const logoUrl = URL.createObjectURL(file);
              updateNodeData(id, { logoUrl, fileName: file.name, error: undefined });
              e.target.value = "";
            }}
          />
        </label>
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="mt-1.5 w-full rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-emerald-500/40 hover:text-emerald-200"
        >
          {m.ultraCanvas.pickFromLibrary}
        </button>
        <a
          href="/brand-kit"
          className="mt-2 block text-center text-[10px] text-emerald-400/90 underline-offset-2 hover:underline"
        >
          {bn.editKit}
        </a>
      </ProNodeShell>
      <UltraLibraryPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        kind="image"
        onPick={({ previewUrl, name }) => {
          onPickLibraryImage(id, previewUrl, name);
          updateNodeData(id, { logoUrl: previewUrl, fileName: name, error: undefined });
        }}
      />
    </>
  );
}
