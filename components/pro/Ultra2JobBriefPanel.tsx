"use client";

import { useEffect, useRef, useState } from "react";
import { uploadCanvasAsset } from "@/lib/pro-canvas-runner";
import {
  ULTRA_PLAN_BOARD_MAX_USER_REFS,
  type UltraDescribeAssetRef,
} from "@/lib/ultra-plan-board";

export type Ultra2JobBriefLabels = {
  title: string;
  hint: string;
  placeholder: string;
  updateLabel: string;
  updatingLabel: string;
  expandLabel: string;
  collapseLabel: string;
  unchangedHint: string;
  dirtyBadge: string;
  refsTitle: string;
  refsHint: string;
  refsAddLabel: string;
  refsUploadingLabel: string;
  qualityHint: string;
};

type LocalRef = UltraDescribeAssetRef & { localPreview?: string };

type Props = {
  visible: boolean;
  /** Bumps when a plan lands so the panel resets dirty baseline. */
  planRevision: number;
  /** Last successfully planned brief (baseline). */
  description: string;
  /** Last successfully planned refs (baseline). */
  refs: UltraDescribeAssetRef[];
  labels: Ultra2JobBriefLabels;
  error?: string | null;
  planning?: boolean;
  onRequestUpdate: (description: string, refs: UltraDescribeAssetRef[]) => void;
};

function refsEqual(a: UltraDescribeAssetRef[], b: UltraDescribeAssetRef[]): boolean {
  if (a.length !== b.length) return false;
  return a.every(
    (r, i) =>
      r.id === b[i]?.id &&
      r.url === b[i]?.url &&
      r.kind === b[i]?.kind,
  );
}

export function Ultra2JobBriefPanel({
  visible,
  planRevision,
  description,
  refs,
  labels,
  error,
  planning,
  onRequestUpdate,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [text, setText] = useState(description);
  const [localRefs, setLocalRefs] = useState<LocalRef[]>(() =>
    refs.map((r) => ({ ...r })),
  );
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const baselineRef = useRef({ description, refs });

  // Only reset editor when a plan succeeds — not on every parent re-render.
  useEffect(() => {
    setText(description);
    setLocalRefs(refs.map((r) => ({ ...r })));
    baselineRef.current = { description, refs };
    setUploadError(null);
  }, [planRevision]); // eslint-disable-line react-hooks/exhaustive-deps -- intentional

  if (!visible) return null;

  const cleanRefs = (): UltraDescribeAssetRef[] =>
    localRefs.map(({ id, url, kind, fileName, roleHint }) => ({
      id,
      url,
      kind,
      fileName,
      roleHint,
    }));

  const dirty =
    text.trim() !== baselineRef.current.description.trim() ||
    !refsEqual(cleanRefs(), baselineRef.current.refs);

  const canUpdate = Boolean(text.trim()) && dirty && !planning && !uploading;

  const addFiles = async (files: FileList | null) => {
    if (!files?.length || uploading || planning) return;
    setUploadError(null);
    setUploading(true);
    try {
      const remaining = ULTRA_PLAN_BOARD_MAX_USER_REFS - localRefs.length;
      const batch = Array.from(files).slice(0, Math.max(0, remaining));
      const next: LocalRef[] = [];
      for (const file of batch) {
        const isVideo = file.type.startsWith("video/");
        const isImage = file.type.startsWith("image/");
        if (!isVideo && !isImage) continue;
        const url = await uploadCanvasAsset(file);
        next.push({
          id: `ref${localRefs.length + next.length + 1}`,
          url,
          kind: isVideo ? "video" : "image",
          fileName: file.name,
          localPreview: isImage ? URL.createObjectURL(file) : undefined,
        });
      }
      if (next.length) {
        setLocalRefs((prev) =>
          [...prev, ...next].slice(0, ULTRA_PLAN_BOARD_MAX_USER_REFS),
        );
      }
    } catch (e: unknown) {
      setUploadError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeRef = (id: string) => {
    setLocalRefs((prev) => {
      const target = prev.find((r) => r.id === id);
      if (target?.localPreview) URL.revokeObjectURL(target.localPreview);
      return prev.filter((r) => r.id !== id);
    });
  };

  const preview = text.trim() || labels.placeholder;

  return (
    <div className="pointer-events-auto w-full max-w-[min(calc(100%-2rem),28rem)]">
      <div
        className={`overflow-hidden rounded-xl border shadow-lg backdrop-blur transition ${
          expanded
            ? "border-cyan-400/40 bg-slate-950/95"
            : "border-white/15 bg-slate-950/88 hover:border-cyan-400/30"
        }`}
      >
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex w-full items-center gap-2 px-3 py-2 text-left"
          aria-expanded={expanded}
        >
          <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-cyan-200/90">
            {labels.title}
          </span>
          {dirty ? (
            <span className="shrink-0 rounded bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-semibold text-amber-100">
              {labels.dirtyBadge}
            </span>
          ) : null}
          <span className="min-w-0 flex-1 truncate text-[11px] text-slate-300">
            {preview}
          </span>
          <span className="shrink-0 text-[10px] text-slate-500">
            {expanded ? labels.collapseLabel : labels.expandLabel}
          </span>
        </button>

        {expanded ? (
          <div className="border-t border-white/10 px-3 pb-3 pt-2">
            <p className="text-[9px] leading-snug text-slate-500">{labels.hint}</p>

            <div className="mt-2 rounded-lg border border-white/10 bg-slate-950/50 p-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] font-semibold text-slate-200">
                  {labels.refsTitle}
                </p>
                <button
                  type="button"
                  disabled={
                    planning ||
                    uploading ||
                    localRefs.length >= ULTRA_PLAN_BOARD_MAX_USER_REFS
                  }
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-md border border-cyan-400/40 bg-cyan-950/40 px-2 py-0.5 text-[10px] font-semibold text-cyan-100 hover:bg-cyan-900/50 disabled:opacity-50"
                >
                  {uploading ? labels.refsUploadingLabel : labels.refsAddLabel}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  className="hidden"
                  onChange={(e) => void addFiles(e.target.files)}
                />
              </div>
              <p className="mt-0.5 text-[9px] leading-snug text-slate-500">
                {labels.refsHint}
              </p>
              {localRefs.length > 0 ? (
                <ul className="mt-1.5 flex flex-wrap gap-1.5">
                  {localRefs.map((ref) => (
                    <li
                      key={ref.id}
                      className="relative w-[56px] overflow-hidden rounded-md border border-white/15 bg-slate-900"
                    >
                      {ref.kind === "image" && (ref.localPreview || ref.url) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={ref.localPreview || ref.url}
                          alt=""
                          className="h-10 w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-10 items-center justify-center px-1 text-[8px] text-slate-400">
                          VIDEO
                        </div>
                      )}
                      <button
                        type="button"
                        disabled={planning || uploading}
                        onClick={() => removeRef(ref.id)}
                        className="absolute right-0.5 top-0.5 rounded bg-black/70 px-1 text-[9px] text-white"
                        aria-label="Remove"
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
              {uploadError ? (
                <p className="mt-1 text-[10px] text-rose-300">{uploadError}</p>
              ) : null}
            </div>

            <label className="mt-2 block">
              <span className="sr-only">{labels.title}</span>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={3}
                maxLength={4000}
                placeholder={labels.placeholder}
                disabled={planning || uploading}
                className="w-full resize-y rounded-lg border border-cyan-400/30 bg-slate-950/70 px-2.5 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 outline-none ring-cyan-400/20 focus:ring-2 disabled:opacity-60"
              />
            </label>

            <p className="mt-1.5 rounded-md border border-amber-500/25 bg-amber-950/35 px-2 py-1 text-[9px] leading-snug text-amber-100/90">
              {labels.qualityHint}
            </p>

            {error ? (
              <p className="mt-1.5 rounded-md border border-rose-500/30 bg-rose-950/40 px-2 py-1 text-[11px] text-rose-100">
                {error}
              </p>
            ) : null}

            {!dirty && text.trim() ? (
              <p className="mt-1.5 text-[9px] text-slate-500">{labels.unchangedHint}</p>
            ) : null}

            <button
              type="button"
              disabled={!canUpdate}
              onClick={() => onRequestUpdate(text.trim(), cleanRefs())}
              className="mt-2 inline-flex w-full items-center justify-center rounded-md bg-gradient-to-r from-cyan-600 via-sky-500 to-violet-600 px-3 py-2 text-xs font-semibold text-white shadow-[0_0_14px_rgba(34,211,238,0.2)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45"
            >
              {planning ? labels.updatingLabel : labels.updateLabel}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
