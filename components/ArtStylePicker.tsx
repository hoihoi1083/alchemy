"use client";

import { useLocale } from "@/components/LocaleProvider";
import {
  artStyleIdsForPicker,
  type ArtStyleId,
  getArtStyle,
} from "@/lib/art-style";

type Props = {
  value: ArtStyleId;
  onChange: (id: ArtStyleId) => void;
  /** When true, only film / CCD / 国风 / cinematic / realistic (video-safe grades). */
  videoSafeOnly?: boolean;
};

export function ArtStylePicker({ value, onChange, videoSafeOnly = false }: Props) {
  const { m } = useLocale();
  const ids = artStyleIdsForPicker({ videoSafeOnly });

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-slate-700">{m.wizard.artStyleLabel}</p>
      <p className="text-xs text-slate-500">
        {videoSafeOnly ? m.wizard.artStyleVideoSafeHint : m.wizard.artStyleHint}
      </p>
      <div className="flex flex-wrap gap-2">
        {ids.map((id) => {
          const def = getArtStyle(id);
          const copy = m.wizard.artStyles[id];
          const selected = value === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange(id)}
              className={`relative w-[5.5rem] shrink-0 overflow-hidden rounded-xl border bg-white text-left transition ${
                selected
                  ? "border-violet-500 ring-1 ring-violet-400"
                  : "border-slate-200 hover:border-violet-200"
              }`}
            >
              {selected ? (
                <span
                  className="absolute right-1.5 top-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-violet-600 text-white"
                  aria-hidden
                >
                  <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3">
                    <path d="m5 12 5 5L20 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              ) : null}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={def.previewSrc}
                alt=""
                className="h-[5.5rem] w-full object-cover"
              />
              <span className="block px-1.5 py-1.5 text-[11px] font-semibold leading-tight text-slate-800">
                {copy.title}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
