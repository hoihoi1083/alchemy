"use client";

import { useLocale } from "@/components/LocaleProvider";
import { getTemplateConfig } from "@/lib/template-slots";
import { TEMPLATES, type TemplateId } from "@/lib/templates";

type Props = {
  value: TemplateId;
  onChange: (id: TemplateId) => void;
  templateIds: TemplateId[];
};

export function AdTemplatePicker({ value, onChange, templateIds }: Props) {
  const { m } = useLocale();

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-slate-300">{m.wizard.adTemplateLabel}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {templateIds.map((id) => {
          const labels = m.templates[id];
          const t = TEMPLATES.find((x) => x.id === id)!;
          const config = getTemplateConfig(id);
          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange(id)}
              className={`rounded-xl border p-4 text-left transition ${
                value === id
                  ? "border-emerald-500/60 bg-emerald-950/40"
                  : "border-slate-800 bg-slate-900/40 hover:border-slate-600"
              }`}
            >
              <span className="text-2xl">{t.icon}</span>
              <p className="mt-2 text-sm font-semibold text-white">{labels.name}</p>
              <p className="mt-1 text-xs text-slate-400">{labels.description}</p>
              <div className="mt-3 flex flex-wrap gap-1">
                {config.slots.map((slot) => (
                  <span
                    key={slot.id}
                    className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-400"
                  >
                    {m.wizard.templateSlots[slot.id]}
                    {slot.required ? " *" : ""}
                  </span>
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
