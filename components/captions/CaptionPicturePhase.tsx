"use client";

import { useRef, useState } from "react";
import type { CaptionEditJob } from "@/lib/byteplus-seedance-edit";
import { estimateCaptionVideoEditTokens } from "@/lib/billing/token-costs";

type Labels = {
  pictureTitle: string;
  pictureHint: string;
  jobProduct: string;
  jobScene: string;
  jobStyle: string;
  refPhoto: string;
  refHint: string;
  noteLabel: string;
  notePlaceholder: string;
  generate: string;
  generating: string;
  skipPicture: string;
  costHint: (n: number) => string;
  needRefOrNote: string;
  downloadEdited: string;
  downloadingEdited: string;
  continueStructure: string;
  cancelEdit?: string;
};

export function CaptionPicturePhase(props: {
  labels: Labels;
  disabled?: boolean;
  busy?: boolean;
  /** Honest bill estimate from selected clip length. */
  durationSec?: number;
  /** Stage copy while Seedance runs (trim → generate). */
  progressLabel?: string | null;
  job: CaptionEditJob;
  note: string;
  refImageUrl: string | null;
  editedVideoUrl?: string | null;
  downloadBusy?: boolean;
  onJob: (j: CaptionEditJob) => void;
  onNote: (v: string) => void;
  onRefImage: (url: string | null, label?: string) => void;
  onGenerate: () => void;
  onSkip: () => void;
  onCancel?: () => void;
  onDownloadEdited?: () => void;
  uploadImage: (file: File) => Promise<string>;
}) {
  const {
    labels: L,
    disabled,
    busy,
    durationSec = 8,
    progressLabel,
    job,
    note,
    refImageUrl,
    editedVideoUrl,
    downloadBusy,
    onJob,
    onNote,
    onRefImage,
    onGenerate,
    onSkip,
    onCancel,
    onDownloadEdited,
    uploadImage,
  } = props;
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const cost = estimateCaptionVideoEditTokens(durationSec);
  const jobs: { id: CaptionEditJob; label: string }[] = [
    { id: "product", label: L.jobProduct },
    { id: "scene", label: L.jobScene },
    { id: "style", label: L.jobStyle },
  ];

  return (
    <div className="space-y-3 rounded-xl border border-violet-500/25 bg-violet-950/25 p-3">
      <div>
        <p className="text-sm font-semibold text-violet-50">{L.pictureTitle}</p>
        <p className="mt-1 text-xs text-violet-100/75">{L.pictureHint}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {jobs.map((j) => (
          <button
            key={j.id}
            type="button"
            disabled={disabled || busy}
            onClick={() => onJob(j.id)}
            className={
              job === j.id
                ? "rounded-full bg-violet-400 px-3 py-1.5 text-xs font-bold text-slate-950"
                : "rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-slate-200"
            }
          >
            {j.label}
          </button>
        ))}
      </div>
      <div>
        <p className="text-xs font-medium text-slate-300">{L.refPhoto}</p>
        <p className="mt-0.5 text-[11px] text-slate-500">{L.refHint}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={disabled || busy || uploading}
            onClick={() => inputRef.current?.click()}
            className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white disabled:opacity-50"
          >
            {uploading ? "…" : L.refPhoto}
          </button>
          {refImageUrl ? (
            <button
              type="button"
              className="text-xs text-slate-400 underline"
              onClick={() => onRefImage(null)}
            >
              Clear
            </button>
          ) : null}
        </div>
        {refImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={refImageUrl}
            alt=""
            className="mt-2 h-20 w-20 rounded-lg object-cover"
          />
        ) : null}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (!f) return;
            setUploading(true);
            void uploadImage(f)
              .then((url) => onRefImage(url, f.name))
              .finally(() => setUploading(false));
          }}
        />
      </div>
      <label className="block text-xs text-slate-300">
        {L.noteLabel}
        <input
          value={note}
          onChange={(e) => onNote(e.target.value)}
          disabled={disabled || busy}
          placeholder={L.notePlaceholder}
          className="mt-1 w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2 text-sm text-white"
        />
      </label>
      {busy ? (
        <div className="space-y-2">
          <div className="h-1.5 overflow-hidden rounded-full bg-violet-950">
            <div className="h-full w-2/3 animate-pulse rounded-full bg-violet-400/80" />
          </div>
          <p className="text-center text-[11px] text-violet-100/80">
            {progressLabel || L.generating}
          </p>
          {onCancel && L.cancelEdit ? (
            <button
              type="button"
              onClick={onCancel}
              className="w-full rounded-lg border border-white/20 px-3 py-1.5 text-xs text-slate-200"
            >
              {L.cancelEdit}
            </button>
          ) : null}
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled || (!refImageUrl && !note.trim())}
          onClick={onGenerate}
          className="w-full rounded-xl bg-violet-400 px-4 py-2.5 text-sm font-bold text-slate-950 disabled:opacity-50"
        >
          {L.generate}
        </button>
      )}
      <p className="text-center text-[10px] text-violet-100/60">
        {L.costHint(cost)}
        {durationSec > 0 ? ` · ~${durationSec.toFixed(1)}s clip` : ""}
      </p>
      {editedVideoUrl ? (
        <div className="flex flex-col gap-2">
          <button
            type="button"
            disabled={busy || downloadBusy}
            onClick={onDownloadEdited}
            className="w-full rounded-xl border border-emerald-400/50 bg-emerald-500/15 px-4 py-2.5 text-sm font-semibold text-emerald-100 disabled:opacity-50"
          >
            {downloadBusy ? L.downloadingEdited : L.downloadEdited}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onSkip}
            className="w-full rounded-xl bg-violet-400/90 px-4 py-2.5 text-sm font-bold text-slate-950 disabled:opacity-50"
          >
            {L.continueStructure}
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={onSkip}
          className="w-full text-center text-xs text-slate-400 underline hover:text-slate-200"
        >
          {L.skipPicture}
        </button>
      )}
    </div>
  );
}
