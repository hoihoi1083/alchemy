"use client";

import { useRef, useState } from "react";
import { UltraCanvasWaveBg } from "@/components/pro/UltraCanvasWaveBg";
import { uploadCanvasAsset } from "@/lib/pro-canvas-runner";
import {
  ULTRA_PLAN_BOARD_MAX_USER_REFS,
  type UltraDescribeAssetRef,
} from "@/lib/ultra-plan-board";
import type { Ultra2WorkflowId } from "@/lib/ultra2-workflows";

type SavedBoard = {
  id: string;
  name: string;
  updatedAt: string;
};

type TemplateCard = {
  id: Ultra2WorkflowId;
  title: string;
  desc: string;
  flow: string;
};

type Props = {
  open: boolean;
  title: string;
  subtitle: string;
  placeholder: string;
  qualityHint: string;
  planLabel: string;
  planningLabel: string;
  refsTitle: string;
  refsHint: string;
  refsAddLabel: string;
  refsUploadingLabel: string;
  templatesTitle: string;
  templatesSubtitle: string;
  templateCards: TemplateCard[];
  useWorkflowLabel: string;
  recommendedLabel: string;
  loadTitle: string;
  loadHint: string;
  loadEmpty: string;
  continueLabel?: string;
  error?: string | null;
  boards: SavedBoard[];
  boardsLoading?: boolean;
  onPlan: (
    description: string,
    refs: UltraDescribeAssetRef[],
  ) => void | Promise<void>;
  onPickTemplate: (id: Ultra2WorkflowId) => void;
  onLoadBoard: (id: string) => void;
  onContinue?: () => void;
};

type LocalRef = UltraDescribeAssetRef & { localPreview?: string };

export function Ultra2DescribeSelector({
  open,
  title,
  subtitle,
  placeholder,
  qualityHint,
  planLabel,
  planningLabel,
  refsTitle,
  refsHint,
  refsAddLabel,
  refsUploadingLabel,
  templatesTitle,
  templatesSubtitle,
  templateCards,
  useWorkflowLabel,
  recommendedLabel,
  loadTitle,
  loadHint,
  loadEmpty,
  continueLabel,
  error,
  boards,
  boardsLoading,
  onPlan,
  onPickTemplate,
  onLoadBoard,
  onContinue,
}: Props) {
  const [text, setText] = useState("");
  const [loadOpen, setLoadOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [refs, setRefs] = useState<LocalRef[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const addFiles = async (files: FileList | null) => {
    if (!files?.length || uploading || busy) return;
    setUploadError(null);
    setUploading(true);
    try {
      const remaining = ULTRA_PLAN_BOARD_MAX_USER_REFS - refs.length;
      const batch = Array.from(files).slice(0, Math.max(0, remaining));
      const next: LocalRef[] = [];
      for (const file of batch) {
        const isVideo = file.type.startsWith("video/");
        const isImage = file.type.startsWith("image/");
        if (!isVideo && !isImage) continue;
        const url = await uploadCanvasAsset(file);
        const id = `ref${refs.length + next.length + 1}`;
        next.push({
          id,
          url,
          kind: isVideo ? "video" : "image",
          fileName: file.name,
          localPreview: isImage ? URL.createObjectURL(file) : undefined,
        });
      }
      if (next.length) {
        setRefs((prev) => [...prev, ...next].slice(0, ULTRA_PLAN_BOARD_MAX_USER_REFS));
      }
    } catch (e: unknown) {
      setUploadError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeRef = (id: string) => {
    setRefs((prev) => {
      const target = prev.find((r) => r.id === id);
      if (target?.localPreview) URL.revokeObjectURL(target.localPreview);
      return prev.filter((r) => r.id !== id);
    });
  };

  const submit = async () => {
    const description = text.trim();
    if (!description || busy || uploading) return;
    setBusy(true);
    try {
      await onPlan(
        description,
        refs.map(({ id, url, kind, fileName, roleHint }) => ({
          id,
          url,
          kind,
          fileName,
          roleHint,
        })),
      );
    } finally {
      setBusy(false);
    }
  };

  const storyboard = templateCards.find((c) => c.id === "storyboard");
  const mainCards = templateCards.filter((c) => c.id !== "storyboard");

  return (
    <div
      className="absolute inset-0 z-40 flex items-center justify-center overflow-hidden p-1.5 sm:p-2"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ultra2-describe-title"
    >
      <UltraCanvasWaveBg intensity="picker" />
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/25 via-transparent to-slate-950/40" />

      {/* Cap height so large monitors don't stretch the card; scroll inside when needed */}
      <div className="relative z-10 flex max-h-[min(86vh,680px)] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-white/12 bg-slate-950/80 shadow-[0_0_48px_rgba(34,211,238,0.08)] backdrop-blur-md ring-1 ring-cyan-400/15 sm:max-h-[min(82vh,720px)]">
        <div className="min-h-0 overflow-y-auto overscroll-contain p-2.5 sm:p-3">
          <h2
            id="ultra2-describe-title"
            className="text-sm font-semibold text-white sm:text-base"
          >
            {title}
          </h2>
          <p className="mt-0.5 text-[10px] leading-snug text-slate-400 sm:text-[11px]">
            {subtitle}
          </p>

          <div className="mt-2 rounded-lg border border-white/10 bg-slate-950/50 p-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-semibold text-slate-200">{refsTitle}</p>
              <button
                type="button"
                disabled={
                  busy ||
                  uploading ||
                  refs.length >= ULTRA_PLAN_BOARD_MAX_USER_REFS
                }
                onClick={() => fileInputRef.current?.click()}
                className="rounded-md border border-cyan-400/40 bg-cyan-950/40 px-2 py-0.5 text-[10px] font-semibold text-cyan-100 hover:bg-cyan-900/50 disabled:opacity-50"
              >
                {uploading ? refsUploadingLabel : refsAddLabel}
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
              {refsHint}
            </p>
            {refs.length > 0 ? (
              <ul className="mt-1.5 flex flex-wrap gap-1.5">
                {refs.map((ref) => (
                  <li
                    key={ref.id}
                    className="relative w-[64px] overflow-hidden rounded-md border border-white/15 bg-slate-900"
                  >
                    {ref.kind === "image" && (ref.localPreview || ref.url) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={ref.localPreview || ref.url}
                        alt=""
                        className="h-11 w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-11 items-center justify-center px-1 text-[9px] text-slate-400">
                        VIDEO
                      </div>
                    )}
                    <p className="truncate px-1 py-0.5 text-[8px] text-slate-400">
                      {ref.fileName || ref.id}
                    </p>
                    <button
                      type="button"
                      disabled={busy || uploading}
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
            <span className="sr-only">{title}</span>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={2}
              maxLength={4000}
              placeholder={placeholder}
              disabled={busy || uploading}
              className="w-full resize-y rounded-lg border border-cyan-400/30 bg-slate-950/70 px-2.5 py-1.5 text-sm text-slate-100 placeholder:text-slate-500 outline-none ring-cyan-400/20 focus:ring-2 disabled:opacity-60"
            />
          </label>

          <p className="mt-1.5 rounded-md border border-amber-500/25 bg-amber-950/35 px-2 py-1 text-[9px] leading-snug text-amber-100/90 sm:text-[10px]">
            {qualityHint}
          </p>

          {error ? (
            <p className="mt-1.5 rounded-md border border-rose-500/30 bg-rose-950/40 px-2 py-1 text-[11px] text-rose-100">
              {error}
            </p>
          ) : null}

          <button
            type="button"
            disabled={busy || uploading || !text.trim()}
            onClick={() => void submit()}
            className="mt-2 inline-flex w-full items-center justify-center rounded-md bg-gradient-to-r from-cyan-600 via-sky-500 to-violet-600 px-3 py-2 text-sm font-semibold text-white shadow-[0_0_16px_rgba(34,211,238,0.25)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? planningLabel : planLabel}
          </button>

          {onContinue ? (
            <button
              type="button"
              onClick={onContinue}
              disabled={busy || uploading}
              className="mt-1.5 w-full rounded-md border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-white/10 disabled:opacity-50"
            >
              {continueLabel ?? "Continue current board"}
            </button>
          ) : null}

          <div className="mt-3 border-t border-white/10 pt-2.5">
            <p className="text-[11px] font-semibold text-slate-200">
              {templatesTitle}
            </p>
            <p className="mt-0.5 text-[9px] text-slate-500">{templatesSubtitle}</p>
            <div className="mt-1.5 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {storyboard ? (
                <button
                  type="button"
                  disabled={busy || uploading}
                  onClick={() => onPickTemplate(storyboard.id)}
                  className="group relative flex flex-col rounded-lg border border-fuchsia-400/55 bg-slate-950/60 p-2 text-left ring-1 ring-fuchsia-500/30 transition hover:border-fuchsia-300/70 disabled:opacity-50 sm:col-span-2"
                >
                  <span className="mb-0.5 inline-flex w-fit rounded bg-gradient-to-r from-fuchsia-600 to-violet-600 px-1.5 py-0.5 text-[8px] font-semibold text-white">
                    ★ {recommendedLabel}
                  </span>
                  <p className="text-xs font-semibold text-white">
                    {storyboard.title}
                  </p>
                  <p className="mt-0.5 line-clamp-1 text-[10px] text-slate-400">
                    {storyboard.desc}
                  </p>
                  <p className="mt-1 text-[8px] text-slate-500">{storyboard.flow}</p>
                  <span className="mt-1 inline-flex w-full items-center justify-center rounded-md bg-gradient-to-r from-fuchsia-600 via-pink-500 to-violet-600 px-2 py-1 text-[10px] font-semibold text-white">
                    {useWorkflowLabel}
                  </span>
                </button>
              ) : null}
              {mainCards.map((card) => (
                <button
                  key={card.id}
                  type="button"
                  disabled={busy || uploading}
                  onClick={() => onPickTemplate(card.id)}
                  className="group flex flex-col rounded-lg border border-cyan-400/35 bg-slate-950/55 p-2 text-left transition hover:border-cyan-300/55 hover:bg-cyan-950/20 disabled:opacity-50"
                >
                  <p className="text-xs font-semibold text-white">{card.title}</p>
                  <p className="mt-0.5 line-clamp-1 flex-1 text-[10px] text-slate-400">
                    {card.desc}
                  </p>
                  <p className="mt-1 text-[8px] text-slate-500">{card.flow}</p>
                  <span className="mt-1 inline-flex w-full items-center justify-center rounded-md bg-gradient-to-r from-cyan-600 to-violet-600 px-2 py-1 text-[10px] font-semibold text-white">
                    {useWorkflowLabel}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-3 border-t border-white/10 pt-2.5 pb-1">
            <button
              type="button"
              onClick={() => setLoadOpen((v) => !v)}
              className="flex w-full items-center justify-between text-left text-[11px] font-semibold text-slate-300"
            >
              <span>{loadTitle}</span>
              <span className="text-slate-500">{loadOpen ? "−" : "+"}</span>
            </button>
            {loadOpen ? (
              <div className="mt-1.5 space-y-1">
                <p className="text-[9px] text-slate-500">{loadHint}</p>
                {boardsLoading ? (
                  <p className="text-[11px] text-slate-400">…</p>
                ) : boards.length === 0 ? (
                  <p className="text-[11px] text-slate-500">{loadEmpty}</p>
                ) : (
                  boards.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      disabled={busy || uploading}
                      onClick={() => onLoadBoard(b.id)}
                      className="flex w-full flex-col rounded-md border border-white/10 bg-slate-900/60 px-2 py-1.5 text-left hover:border-cyan-400/40 disabled:opacity-50"
                    >
                      <span className="text-xs font-medium text-white">
                        {b.name}
                      </span>
                      <span className="text-[9px] text-slate-500">
                        {new Date(b.updatedAt).toLocaleString()}
                      </span>
                    </button>
                  ))
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
