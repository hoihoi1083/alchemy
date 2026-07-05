"use client";

import { useLocale } from "@/components/LocaleProvider";
import { getTemplateConfig, type TemplateSlotId } from "@/lib/template-slots";
import type { TemplateId } from "@/lib/templates";

type Props = {
  templateId: TemplateId;
  filled: Partial<Record<TemplateSlotId, boolean>>;
  /** Slots treated as optional even if the template marks them required. */
  optionalSlotIds?: TemplateSlotId[];
  /** Required later (e.g. image step) — show as next-step, not missing now. */
  deferredSlotIds?: TemplateSlotId[];
};

export function TemplateSlotChecklist({
  templateId,
  filled,
  optionalSlotIds,
  deferredSlotIds,
}: Props) {
  const optional = new Set(optionalSlotIds ?? []);
  const deferred = new Set(deferredSlotIds ?? []);
  const { m } = useLocale();
  const slots = getTemplateConfig(templateId).slots;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <p className="text-xs font-medium text-slate-700">{m.wizard.templateChecklistLabel}</p>
      <ul className="mt-2 space-y-1">
        {slots.map((slot) => {
          const ok = filled[slot.id] ?? false;
          const required = slot.required && !optional.has(slot.id) && !deferred.has(slot.id);
          const deferredLater = deferred.has(slot.id) && !ok;
          return (
            <li key={slot.id} className="flex items-center gap-2 text-xs text-slate-600">
              <span className={ok ? "text-emerald-600" : required ? "text-amber-600" : "text-slate-400"}>
                {ok ? "✓" : required ? "!" : "○"}
              </span>
              {m.wizard.templateSlots[slot.id]}
              {required && !ok && (
                <span className="text-amber-600">({m.wizard.templateSlotRequired})</span>
              )}
              {deferredLater && (
                <span className="text-slate-400">({m.wizard.templateSlotNextStep})</span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
