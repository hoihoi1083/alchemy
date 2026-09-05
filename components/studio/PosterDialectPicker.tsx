"use client";

type DialectOption = {
  id: string;
  title: string;
  description: string;
  previewSrc?: string;
};

const CSS = `
.pdp-grid {
  display: grid;
  gap: 0.4rem;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
@media (min-width: 640px) {
  .pdp-grid { grid-template-columns: repeat(5, minmax(0, 1fr)); }
}
.pdp-card {
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
  cursor: pointer;
  min-width: 0;
  transition: border-color 0.15s, background 0.15s, box-shadow 0.15s;
}
.pdp-card:hover { border-color: #ddd6fe; }
.pdp-card.is-selected {
  border-color: #6c3bff;
  background: #faf5ff;
  box-shadow: 0 0 0 2px rgba(108, 59, 255, 0.14);
}
.pdp-preview {
  position: relative;
  width: 100%;
  aspect-ratio: 1 / 1;
  border-radius: 0.4rem;
  overflow: hidden;
  background: #f1f5f9;
}
.pdp-preview img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.pdp-title {
  font-size: 0.68rem;
  font-weight: 700;
  line-height: 1.2;
  color: #0f172a;
}
.pdp-desc {
  font-size: 0.58rem;
  line-height: 1.25;
  color: #64748b;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.pdp-hint {
  margin-bottom: 0.45rem;
  font-size: 0.7rem;
  line-height: 1.4;
  color: #64748b;
}
`;

export function PosterDialectPicker({
  title,
  hint,
  autoLabel,
  autoSelected,
  onAuto,
  options,
  value,
  onChange,
}: {
  title: string;
  hint: string;
  autoLabel: string;
  autoSelected: boolean;
  onAuto: () => void;
  options: DialectOption[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className={title ? "mt-3" : "mt-2"}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      {title ? (
        <h4 className="text-xs font-semibold text-slate-800">{title}</h4>
      ) : null}
      <p className="pdp-hint">{hint}</p>
      <div className="pdp-grid" role="listbox">
        <button
          type="button"
          role="option"
          aria-selected={autoSelected}
          className={`pdp-card${autoSelected ? " is-selected" : ""}`}
          onClick={onAuto}
        >
          <span className="pdp-preview" aria-hidden />
          <span className="pdp-title">{autoLabel}</span>
          <span className="pdp-desc">Match product / copy</span>
        </button>
        {options.map((opt) => {
          const selected = !autoSelected && value === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              role="option"
              aria-selected={selected}
              title={opt.description}
              className={`pdp-card${selected ? " is-selected" : ""}`}
              onClick={() => onChange(opt.id)}
            >
              <span className="pdp-preview">
                {opt.previewSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={opt.previewSrc} alt="" />
                ) : null}
              </span>
              <span className="pdp-title">{opt.title}</span>
              <span className="pdp-desc">{opt.description}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
