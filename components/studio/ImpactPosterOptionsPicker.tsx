"use client";

import { useLocale } from "@/components/LocaleProvider";
import {
  IMPACT_POSTER_EFFECT_IDS,
  IMPACT_POSTER_TONE_IDS,
  IMPACT_POSTER_TONE_SWATCHES,
  impactPosterEffectPreviewSrc,
  impactPosterTonePreviewSrc,
  type ImpactPosterEffectPick,
  type ImpactPosterTonePick,
} from "@/lib/impact-poster";

const CSS = `
.ipp-grid {
  display: grid;
  gap: 0.4rem;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}
@media (min-width: 640px) {
  .ipp-grid { grid-template-columns: repeat(5, minmax(0, 1fr)); }
}
.ipp-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0.25rem;
  border-radius: 0.65rem;
  border: 1.5px solid #e2e8f0;
  background: #fff;
  padding: 0.3rem 0.3rem 0.4rem;
  text-align: left;
  transition: border-color 0.15s, background 0.15s, box-shadow 0.15s;
  cursor: pointer;
  min-width: 0;
}
.ipp-card:hover { border-color: #ddd6fe; }
.ipp-card.is-selected {
  border-color: #6c3bff;
  background: #faf5ff;
  box-shadow: 0 0 0 2px rgba(108, 59, 255, 0.14);
}
.ipp-preview {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 10;
  border-radius: 0.4rem;
  overflow: hidden;
  background: #f1f5f9;
}
.ipp-preview img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.ipp-swatch {
  position: absolute;
  left: 0.3rem;
  bottom: 0.3rem;
  display: flex;
  gap: 2px;
  padding: 2px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.55);
}
.ipp-swatch i {
  display: block;
  width: 8px;
  height: 8px;
  border-radius: 999px;
  box-shadow: 0 0 0 1px rgba(255,255,255,0.35);
}
.ipp-title {
  font-size: 0.68rem;
  font-weight: 700;
  line-height: 1.2;
  color: #0f172a;
}
.ipp-desc {
  font-size: 0.58rem;
  line-height: 1.25;
  color: #64748b;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.ipp-section-hint {
  margin-bottom: 0.5rem;
  font-size: 0.7rem;
  line-height: 1.4;
  color: #64748b;
}
`;

function OptionGrid({
  autoLabel,
  autoSelected,
  onAuto,
  ids,
  value,
  onChange,
  labels,
  previewSrc,
  swatches,
}: {
  autoLabel: string;
  autoSelected: boolean;
  onAuto: () => void;
  ids: readonly string[];
  value: string;
  onChange: (id: string) => void;
  labels: Record<string, { title: string; desc: string }>;
  previewSrc: (id: string) => string;
  swatches?: Record<string, readonly string[]>;
}) {
  return (
    <div className="ipp-grid" role="listbox">
      <button
        type="button"
        role="option"
        aria-selected={autoSelected}
        className={`ipp-card ${autoSelected ? "is-selected" : ""}`}
        onClick={onAuto}
      >
        <span className="ipp-preview" aria-hidden />
        <span className="ipp-title">{autoLabel}</span>
      </button>
      {ids.map((id) => {
        const selected = value === id;
        const copy = labels[id];
        const chips = swatches?.[id];
        return (
          <button
            key={id}
            type="button"
            role="option"
            aria-selected={selected}
            title={copy?.desc}
            className={`ipp-card ${selected ? "is-selected" : ""}`}
            onClick={() => onChange(id)}
          >
            <span className="ipp-preview">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewSrc(id)} alt="" />
              {chips?.length ? (
                <span className="ipp-swatch" aria-hidden>
                  {chips.map((c) => (
                    <i key={c} style={{ background: c }} />
                  ))}
                </span>
              ) : null}
            </span>
            <span className="ipp-title">{copy?.title ?? id}</span>
            <span className="ipp-desc">{copy?.desc}</span>
          </button>
        );
      })}
    </div>
  );
}

export function ImpactPosterOptionsPicker({
  tone,
  effect,
  onToneChange,
  onEffectChange,
}: {
  tone: ImpactPosterTonePick;
  effect: ImpactPosterEffectPick;
  onToneChange: (v: ImpactPosterTonePick) => void;
  onEffectChange: (v: ImpactPosterEffectPick) => void;
}) {
  const { m } = useLocale();
  const tones = m.wizard.impactPosterTones;
  const effects = m.wizard.impactPosterEffects;

  return (
    <div className="space-y-3">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div>
        <h3 className="pv-card-title">{m.wizard.impactPosterToneTitle}</h3>
        <p className="ipp-section-hint">{m.wizard.impactPosterToneHint}</p>
        <OptionGrid
          autoLabel={m.wizard.impactPosterToneAuto}
          autoSelected={tone === "auto"}
          onAuto={() => onToneChange("auto")}
          ids={IMPACT_POSTER_TONE_IDS}
          value={tone}
          onChange={(id) => onToneChange(id as ImpactPosterTonePick)}
          labels={tones}
          previewSrc={(id) =>
            impactPosterTonePreviewSrc(id as (typeof IMPACT_POSTER_TONE_IDS)[number])
          }
          swatches={IMPACT_POSTER_TONE_SWATCHES}
        />
      </div>
      <div>
        <h3 className="pv-card-title">{m.wizard.impactPosterEffectTitle}</h3>
        <p className="ipp-section-hint">{m.wizard.impactPosterEffectHint}</p>
        <OptionGrid
          autoLabel={m.wizard.impactPosterEffectAuto}
          autoSelected={effect === "auto"}
          onAuto={() => onEffectChange("auto")}
          ids={IMPACT_POSTER_EFFECT_IDS}
          value={effect}
          onChange={(id) => onEffectChange(id as ImpactPosterEffectPick)}
          labels={effects}
          previewSrc={(id) =>
            impactPosterEffectPreviewSrc(
              id as (typeof IMPACT_POSTER_EFFECT_IDS)[number],
            )
          }
        />
      </div>
    </div>
  );
}
