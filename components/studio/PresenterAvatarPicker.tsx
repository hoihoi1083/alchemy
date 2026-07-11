"use client";

import { useLocale } from "@/components/LocaleProvider";
import { HEYGEN_STOCK_AVATARS } from "@/lib/heygen-avatars";
import type { PresenterSourceMode } from "@/hooks/useWizardState";

type PresenterAvatarPickerProps = {
  mode: PresenterSourceMode;
  avatarId: string;
  disabled?: boolean;
  onModeChange: (mode: PresenterSourceMode) => void;
  onAvatarChange: (id: string) => void;
};

export function PresenterAvatarPicker({
  mode,
  avatarId,
  disabled,
  onModeChange,
  onAvatarChange,
}: PresenterAvatarPickerProps) {
  const { locale, m } = useLocale();
  const w = m.wizard.presenterPicker;
  const isZh = locale === "zh" || locale === "zh-cn";

  return (
    <div className="rounded-xl border border-violet-800/50 bg-violet-950/25 p-4">
      <p className="text-sm font-semibold text-violet-100">{w.title}</p>
      <p className="mt-1 text-xs text-violet-200/70">{w.hint}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onModeChange("custom-keyframe")}
          className={`rounded-lg px-3 py-2 text-xs ${
            mode === "custom-keyframe" ? "bg-violet-600 text-white" : "border border-violet-700 text-violet-200"
          }`}
        >
          {w.customKeyframe}
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onModeChange("stock-avatar")}
          className={`rounded-lg px-3 py-2 text-xs ${
            mode === "stock-avatar" ? "bg-violet-600 text-white" : "border border-violet-700 text-violet-200"
          }`}
        >
          {w.stockAvatar}
        </button>
      </div>
      {mode === "stock-avatar" && (
        <select
          value={avatarId}
          disabled={disabled}
          onChange={(e) => onAvatarChange(e.target.value)}
          className="mt-3 w-full rounded-lg border border-violet-700 bg-slate-950 px-3 py-2 text-sm text-white"
        >
          {HEYGEN_STOCK_AVATARS.map((avatar) => (
            <option key={avatar.id} value={avatar.id}>
              {isZh ? avatar.labelZh : avatar.labelEn}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
