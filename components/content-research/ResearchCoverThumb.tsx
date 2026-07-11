"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { ContentPlatform } from "@/lib/content-research-types";
import { researchCoverCandidates } from "@/lib/research-cover-url";

function proxiedCoverUrl(url: string, platform: ContentPlatform): string {
  return `/api/research-post-image?url=${encodeURIComponent(url)}&platform=${platform}`;
}

type ResearchCoverThumbProps = {
  platform: ContentPlatform;
  sourceCoverImageUrl?: string;
  sourceImageUrls?: string[];
  coverImageUrl?: string;
  imageUrls?: string[];
  noCoverLabel: string;
  slideCount?: number;
  slideCountLabel?: (count: number) => string;
  badges?: ReactNode;
  className?: string;
};

export function ResearchCoverThumb({
  platform,
  sourceCoverImageUrl,
  sourceImageUrls,
  coverImageUrl,
  imageUrls,
  noCoverLabel,
  slideCount = 0,
  slideCountLabel,
  badges,
  className = "relative h-24 w-20 shrink-0 overflow-hidden rounded-lg bg-slate-200",
}: ResearchCoverThumbProps) {
  const candidates = researchCoverCandidates({
    sourceCoverImageUrl: sourceCoverImageUrl ?? coverImageUrl,
    sourceImageUrls: sourceImageUrls ?? imageUrls,
    coverImageUrl,
    imageUrls,
  });
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [sourceCoverImageUrl, coverImageUrl, sourceImageUrls?.join("|"), imageUrls?.join("|")]);

  const rawUrl = candidates[index];
  const proxied = rawUrl ? proxiedCoverUrl(rawUrl, platform) : undefined;
  const exhausted = !proxied || index >= candidates.length;

  return (
    <div className={className}>
      {!exhausted ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={proxied}
          src={proxied}
          alt=""
          className="h-full w-full object-cover"
          loading="lazy"
          onError={() => setIndex((i) => i + 1)}
        />
      ) : (
        <div className="flex h-full items-center justify-center px-1 text-center text-[9px] text-slate-400">
          {noCoverLabel}
        </div>
      )}
      {slideCount > 1 && slideCountLabel && (
        <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1 py-0.5 text-[9px] font-medium text-white">
          {slideCountLabel(slideCount)}
        </span>
      )}
      {badges}
    </div>
  );
}
