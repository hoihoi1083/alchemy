"use client";

type ChecklistState = {
  productReadable: boolean;
  textLegible: boolean;
};

type Props = {
  value: ChecklistState;
  onChange: (next: ChecklistState) => void;
  onRegenerate: () => void;
  regenerateBusy?: boolean;
  labels: {
    title: string;
    hint: string;
    productReadable: string;
    textLegible: string;
    regenerateBtn: string;
    regenerating: string;
    allChecked: string;
  };
};

export function ImagePostGenChecklist({
  value,
  onChange,
  onRegenerate,
  regenerateBusy,
  labels,
}: Props) {
  const allChecked = value.productReadable && value.textLegible;

  return (
    <div className="rounded-xl border border-cyan-800/50 bg-cyan-950/25 px-4 py-3 text-xs text-cyan-100">
      <p className="font-semibold text-cyan-50">{labels.title}</p>
      <p className="mt-1 text-cyan-200/80">{labels.hint}</p>
      <div className="mt-3 space-y-2">
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={value.productReadable}
            onChange={(e) => onChange({ ...value, productReadable: e.target.checked })}
            className="size-4 rounded border-cyan-600"
          />
          <span>{labels.productReadable}</span>
        </label>
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={value.textLegible}
            onChange={(e) => onChange({ ...value, textLegible: e.target.checked })}
            className="size-4 rounded border-cyan-600"
          />
          <span>{labels.textLegible}</span>
        </label>
      </div>
      {allChecked && (
        <p className="mt-2 font-medium text-emerald-300">{labels.allChecked}</p>
      )}
      <button
        type="button"
        disabled={regenerateBusy}
        onClick={onRegenerate}
        className="mt-3 rounded-lg border border-cyan-600 px-3 py-2 text-xs font-semibold text-cyan-100 hover:bg-cyan-900/40 disabled:opacity-40"
      >
        {regenerateBusy ? labels.regenerating : labels.regenerateBtn}
      </button>
    </div>
  );
}
