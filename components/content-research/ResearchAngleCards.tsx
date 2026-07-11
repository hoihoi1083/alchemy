"use client";

import { useMemo, useState } from "react";
import type { ContentAngleCandidate, ContentPlatform } from "@/lib/content-research-types";
import { RESEARCH_ANGLES_PER_PAGE } from "@/lib/content-research-enrich";
import { videoReadyKind } from "@/lib/content-research-video-ready";
import { ResearchCoverThumb } from "@/components/content-research/ResearchCoverThumb";

function formatCount(n: number | undefined): string | undefined {
  if (n == null) return undefined;
  if (n >= 10_000) return `${(n / 10_000).toFixed(1)}万`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

type ResearchAngleCardsProps = {
  angles: ContentAngleCandidate[];
  platform: ContentPlatform;
  videoOnly?: boolean;
  applyingAngleId?: string | null;
  pickDisabled?: boolean;
  pickDisabledHint?: string;
  onPick: (angle: ContentAngleCandidate) => void;
  labels: {
    scoreLabel: string;
    inspiredBy: string;
    yourAngle: string;
    useAngle: string;
    applyingAngle: string;
    openNote: string;
    likes: string;
    collects: string;
    noCover: string;
    prevPage: string;
    nextPage: string;
    pageOf: (page: number, total: number) => string;
    totalAngles: (total: number) => string;
    carouselSlides: (count: number) => string;
    videoReadyUrl: string;
    videoReadyResolve: string;
    videoReadyMissing: string;
  };
};

export function ResearchAngleCards({
  angles,
  platform,
  videoOnly,
  applyingAngleId,
  pickDisabled,
  pickDisabledHint,
  onPick,
  labels,
}: ResearchAngleCardsProps) {
  const [page, setPage] = useState(0);
  const totalPages = Math.max(1, Math.ceil(angles.length / RESEARCH_ANGLES_PER_PAGE));

  const safePage = Math.min(page, totalPages - 1);
  const pageAngles = useMemo(() => {
    const start = safePage * RESEARCH_ANGLES_PER_PAGE;
    return angles.slice(start, start + RESEARCH_ANGLES_PER_PAGE);
  }, [angles, safePage]);

  return (
    <div className="space-y-3">
      <p className="text-[11px] text-slate-600">{labels.totalAngles(angles.length)}</p>

      <div className="grid gap-3">
        {pageAngles.map((angle, i) => {
          const rank = safePage * RESEARCH_ANGLES_PER_PAGE + i + 1;
          const slideCount = angle.sourceImageUrls?.length ?? 0;
          const collects = formatCount(angle.sourceCollects);
          const likes = formatCount(angle.sourceLikes);
          const videoReady = videoOnly ? videoReadyKind(angle, platform) : null;

          return (
            <div
              key={angle.id}
              className="overflow-hidden rounded-xl border border-emerald-200 bg-white shadow-sm"
            >
              {angle.sourceTitle && (
                <a
                  href={angle.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex gap-3 border-b border-slate-100 bg-slate-50/80 p-3 transition hover:bg-slate-50"
                >
                  <ResearchCoverThumb
                    platform={platform}
                    sourceCoverImageUrl={angle.sourceCoverImageUrl}
                    sourceImageUrls={angle.sourceImageUrls}
                    noCoverLabel={labels.noCover}
                    slideCount={slideCount}
                    slideCountLabel={labels.carouselSlides}
                    badges={
                      <>
                        {videoReady === "has_url" && (
                          <span className="absolute left-1 top-1 rounded bg-emerald-700 px-1 py-0.5 text-[9px] font-medium text-white">
                            {labels.videoReadyUrl}
                          </span>
                        )}
                        {videoReady === "can_resolve" && (
                          <span className="absolute left-1 top-1 rounded bg-sky-700 px-1 py-0.5 text-[9px] font-medium text-white">
                            {labels.videoReadyResolve}
                          </span>
                        )}
                        {videoReady === "missing" && (
                          <span className="absolute left-1 top-1 rounded bg-amber-700 px-1 py-0.5 text-[9px] font-medium text-white">
                            {labels.videoReadyMissing}
                          </span>
                        )}
                      </>
                    }
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                      {labels.inspiredBy}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-xs font-semibold text-slate-900">
                      {angle.sourceTitle}
                    </p>
                    {angle.sourceAuthor && (
                      <p className="mt-0.5 text-[10px] text-slate-500">@{angle.sourceAuthor}</p>
                    )}
                    <div className="mt-1 flex flex-wrap gap-x-2 text-[10px] text-slate-600">
                      {collects != null && (
                        <span>
                          {labels.collects} {collects}
                        </span>
                      )}
                      {likes != null && (
                        <span>
                          {labels.likes} {likes}
                        </span>
                      )}
                    </div>
                    <span className="mt-1 inline-block text-[10px] text-sky-700 underline">
                      {labels.openNote}
                    </span>
                  </div>
                </a>
              )}

              <div className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-bold text-emerald-800">
                    #{rank} · {angle.formatLabel}
                  </p>
                  <span className="shrink-0 text-[10px] text-slate-500">
                    {labels.scoreLabel} {angle.score}/100
                  </span>
                </div>
                <p className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-violet-700">
                  {labels.yourAngle}
                </p>
                <p className="mt-0.5 text-sm font-semibold text-slate-900">{angle.title}</p>
                <p className="mt-1 text-xs font-medium text-violet-800">{angle.hook}</p>
                <p className="mt-2 text-[11px] leading-relaxed text-slate-600">{angle.whyItWorks}</p>
                {angle.bulletPoints.length > 0 && (
                  <ul className="mt-2 list-inside list-disc text-[11px] text-slate-600">
                    {angle.bulletPoints.map((b) => (
                      <li key={b}>{b}</li>
                    ))}
                  </ul>
                )}
                <button
                  type="button"
                  onClick={() => onPick(angle)}
                  disabled={Boolean(applyingAngleId) || pickDisabled}
                  className="mt-3 w-full rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {applyingAngleId === angle.id ? labels.applyingAngle : labels.useAngle}
                </button>
                {pickDisabled && pickDisabledHint && (
                  <p className="mt-1.5 text-[11px] text-amber-800">{pickDisabledHint}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={safePage === 0}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 disabled:opacity-40"
          >
            {labels.prevPage}
          </button>
          <span className="text-[11px] text-slate-600">
            {labels.pageOf(safePage + 1, totalPages)}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={safePage >= totalPages - 1}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 disabled:opacity-40"
          >
            {labels.nextPage}
          </button>
        </div>
      )}
    </div>
  );
}
