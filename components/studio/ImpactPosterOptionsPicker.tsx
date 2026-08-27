"use client";

import { useLocale } from "@/components/LocaleProvider";
import {
  IMPACT_POSTER_EFFECT_IDS,
  IMPACT_POSTER_TONE_IDS,
  impactPosterEffectPreviewSrc,
  impactPosterTonePreviewSrc,
  type ImpactPosterEffectPick,
  type ImpactPosterTonePick,
} from "@/lib/impact-poster";

const CSS = `
.ipp-grid {
  display: grid;
  gap: 0.5rem;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
@media (min-width: 480px) {
  .ipp-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
}
.ipp-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0.35rem;
  border-radius: 0.85rem;
  border: 1.5px solid #e2e8f0;
  background: #fff;
  padding: 0.45rem 0.45rem 0.55rem;
  text-align: left;
  transition: border-color 0.15s, background 0.15s, box-shadow 0.15s;
  cursor: pointer;
}
.ipp-card:hover { border-color: #ddd6fe; }
.ipp-card.is-selected {
  border-color: #6c3bff;
  background: #faf5ff;
  box-shadow: 0 0 0 3px rgba(108, 59, 255, 0.12);
}
.ipp-preview {
  width: 100%;
  aspect-ratio: 1 / 1;
  border-radius: 0.5rem;
  overflow: hidden;
  background: #f1f5f9;
}
.ipp-preview img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.ipp-title {
  font-size: 0.7rem;
  font-weight: 700;
  line-height: 1.2;
  color: #0f172a;
}
.ipp-desc {
  font-size: 0.6rem;
  line-height: 1.3;
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
}: {
  autoLabel: string;
  autoSelected: boolean;
  onAuto: () => void;
  ids: readonly string[];
  value: string;
  onChange: (id: string) => void;
  labels: Record<string, { title: string; desc: string }>;
  previewSrc: (id: string) => string;
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
    <div className="space-y-4">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div>
        <h3 className="pv-card-title">{m.wizard.impactPosterToneTitle}</h3>
        <p className="mb-3 text-xs text-slate-500">
          {m.wizard.impactPosterToneHint}
        </p>
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
        />
      </div>
      <div>
        <h3 className="pv-card-title">{m.wizard.impactPosterEffectTitle}</h3>
        <p className="mb-3 text-xs text-slate-500">
          {m.wizard.impactPosterEffectHint}
        </p>
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
