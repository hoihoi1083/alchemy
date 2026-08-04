"use client";

import { useMemo, useState } from "react";
import type { ContentAngleCandidate, ContentPlatform } from "@/lib/content-research-types";
import { CONTENT_PLATFORMS } from "@/lib/content-research-types";
import { RESEARCH_ANGLES_PER_PAGE } from "@/lib/content-research-enrich";
import { videoReadyKind } from "@/lib/content-research-video-ready";
import { ResearchCoverThumb } from "@/components/content-research/ResearchCoverThumb";
import { ResearchPlatformLogo } from "@/components/content-research/ResearchPlatformLogo";

function formatCount(n: number | undefined): string | undefined {
  if (n == null) return undefined;
  if (n >= 10_000) return `${(n / 10_000).toFixed(1)}万`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function toneTags(angle: ContentAngleCandidate): string[] {
  const fromBullets = angle.bulletPoints
    .map((b) => b.replace(/^[\d.•\-\s]+/, "").trim())
    .filter(Boolean)
    .slice(0, 3)
    .map((b) => (b.length > 16 ? `${b.slice(0, 14)}…` : b));
  if (fromBullets.length > 0) return fromBullets;
  if (angle.formatLabel) return [angle.formatLabel];
  return [];
}

function layoutNotes(angle: ContentAngleCandidate): string {
  const parts = [angle.formatLabel, angle.scriptOutline?.trim()].filter(Boolean);
  if (parts.length > 0) return parts.join(" · ");
  return angle.hook;
}

/** Plain CSS — avoid Tailwind arbitrary grids that get dropped / crush the middle column. */
const REC_CARD_CSS = `
.research-rec-card { container-type: inline-size; container-name: research-rec; }
.research-rec-card-body {
  display: grid;
  gap: 1.25rem;
  align-items: start;
  grid-template-columns: 1fr;
}
.research-rec-cover {
  width: 132px;
  height: 174px;
  flex-shrink: 0;
}
.research-rec-middle {
  min-width: 0;
  overflow: hidden;
  padding-inline: 0.35rem;
}
.research-rec-actions { display: flex; flex-direction: column; gap: 0.55rem; width: 100%; }
.research-rec-tag {
  display: inline-block;
  max-width: 100%;
  white-space: nowrap;
  writing-mode: horizontal-tb;
  overflow: hidden;
  text-overflow: ellipsis;
  border-radius: 9999px;
  background: #f5f3ff;
  color: #5b2fe0;
  font-size: 11px;
  font-weight: 500;
  padding: 0.25rem 0.625rem;
  line-height: 1.25;
}
/* Prefer container query (card width); viewport fallback if CQ unsupported. */
@container research-rec (min-width: 28rem) {
  .research-rec-card-body {
    grid-template-columns: 132px minmax(0, 1fr) 210px;
    column-gap: 1.5rem;
    row-gap: 1rem;
  }
  .research-rec-middle { padding-inline: 0.5rem; }
  .research-rec-actions { width: 210px; }
}
@media (min-width: 768px) {
  .research-rec-card-body {
    grid-template-columns: 132px minmax(0, 1fr) 210px;
    column-gap: 1.5rem;
    row-gap: 1rem;
  }
  .research-rec-middle { padding-inline: 0.5rem; }
  .research-rec-actions { width: 210px; }
}
`;

type ResearchAngleCardsProps = {
  angles: ContentAngleCandidate[];
  platform: ContentPlatform;
  videoOnly?: boolean;
  applyingAngleId?: string | null;
  selectedAngleId?: string | null;
  pickDisabled?: boolean;
  pickDisabledHint?: string;
  onPick: (angle: ContentAngleCandidate) => void;
  /** Purple fuse chrome — compact recommendation cards. */
  variant?: "classic" | "recommendation";
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
    resultTitle?: string;
    resultSubtitle?: string;
    styleSummaryLabel?: string;
    toneLabel?: string;
    layoutNotesLabel?: string;
    viewMoreExamples?: string;
    sourcePlatformsLabel?: string;
    morePlatforms?: (count: number) => string;
    selectedLabel?: string;
  };
};

export function ResearchAngleCards({
  angles,
  platform,
  videoOnly,
  applyingAngleId,
  selectedAngleId,
  pickDisabled,
  pickDisabledHint,
  onPick,
  variant = "classic",
  labels,
}: ResearchAngleCardsProps) {
  const [page, setPage] = useState(0);
  const totalPages = Math.max(1, Math.ceil(angles.length / RESEARCH_ANGLES_PER_PAGE));

  const safePage = Math.min(page, totalPages - 1);
  const pageAngles = useMemo(() => {
    const start = safePage * RESEARCH_ANGLES_PER_PAGE;
    return angles.slice(start, start + RESEARCH_ANGLES_PER_PAGE);
  }, [angles, safePage]);

  const otherPlatformCount = CONTENT_PLATFORMS.length - 1;

  if (variant === "recommendation") {
    return (
      <div className="space-y-3">
        <style dangerouslySetInnerHTML={{ __html: REC_CARD_CSS }} />
        <p className="text-[11px] text-slate-500">{labels.totalAngles(angles.length)}</p>

        <div className="grid gap-3">
          {pageAngles.map((angle) => {
            const likes = formatCount(angle.sourceLikes);
            const collects = formatCount(angle.sourceCollects);
            const engagement = likes ?? collects;
            const tags = toneTags(angle);
            const videoReady = videoOnly ? videoReadyKind(angle, platform) : null;
            const selected = selectedAngleId === angle.id;
            const applying = applyingAngleId === angle.id;

            return (
              <article
                key={angle.id}
                className={`research-rec-card rounded-xl border bg-white p-4 shadow-sm transition ${
                  selected
                    ? "border-violet-600 ring-2 ring-violet-500/15"
                    : "border-slate-200/90 hover:border-violet-200"
                }`}
              >
                <header className="mb-5 space-y-1">
                  <h3 className="text-[14px] font-bold tracking-tight text-slate-900">
                    {labels.resultTitle}
                  </h3>
                  <p className="text-[11px] leading-snug text-slate-500">
                    {labels.resultSubtitle}
                  </p>
                </header>

                {/* Left cover | Middle info | Right actions */}
                <div className="research-rec-card-body">
                  <ResearchCoverThumb
                    platform={platform}
                    sourceCoverImageUrl={angle.sourceCoverImageUrl}
                    sourceImageUrls={angle.sourceImageUrls}
                    noCoverLabel={labels.noCover}
                    className="research-rec-cover rounded-xl"
                    style={{ width: 132, height: 174 }}
                    badges={
                      <>
                        {videoReady === "has_url" && (
                          <span className="absolute left-1.5 top-1.5 z-10 rounded bg-emerald-700 px-1 py-0.5 text-[9px] font-medium text-white">
                            {labels.videoReadyUrl}
                          </span>
                        )}
                        {videoReady === "can_resolve" && (
                          <span className="absolute left-1.5 top-1.5 z-10 rounded bg-sky-700 px-1 py-0.5 text-[9px] font-medium text-white">
                            {labels.videoReadyResolve}
                          </span>
                        )}
                        {videoReady === "missing" && (
                          <span className="absolute left-1.5 top-1.5 z-10 rounded bg-amber-700 px-1 py-0.5 text-[9px] font-medium text-white">
                            {labels.videoReadyMissing}
                          </span>
                        )}
                        {engagement != null && (
                          <span className="absolute bottom-1.5 left-1.5 z-10 inline-flex items-center gap-1 rounded-full bg-white/95 px-1.5 py-0.5 text-[10px] font-semibold text-slate-800 shadow-sm">
                            <svg
                              viewBox="0 0 16 16"
                              className="h-3 w-3 text-violet-600"
                              fill="currentColor"
                              aria-hidden
                            >
                              <path d="M8 13.6S2.5 10.1 2.5 6.4A3.1 3.1 0 0 1 8 4.7 3.1 3.1 0 0 1 13.5 6.4C13.5 10.1 8 13.6 8 13.6Z" />
                            </svg>
                            {engagement}
                          </span>
                        )}
                      </>
                    }
                  />

                  <div className="research-rec-middle space-y-3">
                    <div className="flex gap-2.5">
                      <span
                        className="mt-1.5 h-2 w-2 shrink-0 rotate-45 bg-violet-500"
                        aria-hidden
                      />
                      <div className="min-w-0">
                        <p className="text-[13px] font-bold text-slate-900">
                          {labels.styleSummaryLabel}
                        </p>
                        <p className="mt-0.5 line-clamp-3 text-[12px] leading-relaxed text-slate-600">
                          {angle.whyItWorks || angle.hook || angle.title}
                        </p>
                      </div>
                    </div>

                    {tags.length > 0 ? (
                      <div className="flex gap-2.5">
                        <span
                          className="mt-1.5 h-2 w-2 shrink-0 rotate-45 bg-violet-500"
                          aria-hidden
                        />
                        <div className="min-w-0">
                          <p className="text-[13px] font-bold text-slate-900">
                            {labels.toneLabel}
                          </p>
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {tags.map((tag) => (
                              <span key={tag} className="research-rec-tag" title={tag}>
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : null}

                    <div className="flex gap-2.5">
                      <span
                        className="mt-1.5 h-2 w-2 shrink-0 rotate-45 bg-violet-500"
                        aria-hidden
                      />
                      <div className="min-w-0">
                        <p className="text-[13px] font-bold text-slate-900">
                          {labels.layoutNotesLabel}
                        </p>
                        <p className="mt-0.5 line-clamp-3 text-[12px] leading-relaxed text-slate-600">
                          {layoutNotes(angle)}
                        </p>
                        <p className="mt-1 text-[10px] text-slate-400">
                          {labels.scoreLabel} {angle.score}/100
                          {angle.sourceAuthor ? ` · @${angle.sourceAuthor}` : ""}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="research-rec-actions">
                    <button
                      type="button"
                      onClick={() => onPick(angle)}
                      disabled={Boolean(applyingAngleId) || pickDisabled}
                      className={`inline-flex w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-2.5 text-[13px] font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50 ${
                        selected
                          ? "bg-violet-700 hover:bg-violet-600"
                          : "bg-violet-600 hover:bg-violet-500"
                      }`}
                    >
                      {applying
                        ? labels.applyingAngle
                        : selected && labels.selectedLabel
                          ? labels.selectedLabel
                          : labels.useAngle}
                      {!applying && !selected ? <span aria-hidden>›</span> : null}
                    </button>

                    {angle.sourceUrl ? (
                      <a
                        href={angle.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex w-full items-center justify-center whitespace-nowrap rounded-xl border border-violet-300 bg-white px-3 py-2.5 text-[12px] font-semibold text-violet-700 hover:bg-violet-50"
                      >
                        {labels.viewMoreExamples ?? labels.openNote}
                      </a>
                    ) : totalPages > 1 ? (
                      <button
                        type="button"
                        onClick={() =>
                          setPage((p) =>
                            p >= totalPages - 1 ? 0 : Math.min(totalPages - 1, p + 1),
                          )
                        }
                        className="inline-flex w-full items-center justify-center whitespace-nowrap rounded-xl border border-violet-300 bg-white px-3 py-2.5 text-[12px] font-semibold text-violet-700 hover:bg-violet-50"
                      >
                        {labels.viewMoreExamples}
                      </button>
                    ) : null}

                    {pickDisabled && pickDisabledHint ? (
                      <p className="text-[11px] text-amber-800">{pickDisabledHint}</p>
                    ) : null}

                    <div className="pt-1">
                      <p className="text-[11px] font-medium text-slate-500">
                        {labels.sourcePlatformsLabel}
                      </p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <ResearchPlatformLogo platform={platform} className="h-5 w-5" />
                        {CONTENT_PLATFORMS.filter((p) => p !== platform)
                          .slice(0, 2)
                          .map((p) => (
                            <ResearchPlatformLogo
                              key={p}
                              platform={p}
                              className="h-5 w-5 opacity-80"
                            />
                          ))}
                        {otherPlatformCount > 2 && labels.morePlatforms ? (
                          <span className="text-[11px] text-slate-400">
                            {labels.morePlatforms(otherPlatformCount - 2)}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              </article>
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
                    className="h-24 w-20"
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
