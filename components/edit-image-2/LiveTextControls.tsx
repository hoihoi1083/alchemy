"use client";

import {
  LIVE_TEXT_DEFAULT_FONT,
  LIVE_TEXT_EFFECTS,
  LIVE_TEXT_FONTS,
  LIVE_TEXT_FONT_GROUPS,
  LIVE_TEXT_FONT_GROUP_LABEL_KEY,
  liveTextEffectNeedsEffectColor,
  liveTextEffectNeedsStroke,
  normalizeLiveTextEffect,
  type LiveTextEffect,
} from "@/lib/edit-image-2-live-text";

type LiveTextLayerPatch = {
  fontSize?: number;
  fontBold?: boolean;
  fontFamily?: string;
  textVertical?: boolean;
  textEffect?: LiveTextEffect;
  fill?: string;
  strokeColor?: string;
  effectColor?: string;
  useLiveText?: boolean;
  wPct?: number;
  hPct?: number;
};

type LiveTextControlsProps = {
  t: Record<string, unknown>;
  fontSize: number;
  fontBold: boolean;
  fontFamily: string;
  textVertical: boolean;
  textEffect: LiveTextEffect;
  fill: string;
  strokeColor: string;
  effectColor: string;
  wPct: number;
  hPct: number;
  onPatch: (patch: LiveTextLayerPatch) => void;
  onEnsureLiveText: () => void;
};

function label(t: Record<string, unknown>, key: string): string {
  const v = t[key];
  return typeof v === "string" ? v : key;
}

export function LiveTextControls({
  t,
  fontSize,
  fontBold,
  fontFamily,
  textVertical,
  textEffect,
  fill,
  strokeColor,
  effectColor,
  wPct,
  hPct,
  onPatch,
  onEnsureLiveText,
}: LiveTextControlsProps) {
  const effect = normalizeLiveTextEffect(textEffect);
  const showStroke = liveTextEffectNeedsStroke(effect);
  const showEffectColor = liveTextEffectNeedsEffectColor(effect);

  const patch = (next: LiveTextLayerPatch) => {
    onPatch({ ...next, useLiveText: true });
    onEnsureLiveText();
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <label className="flex items-center gap-1 text-[11px] text-slate-300">
        {label(t, "size")}
        <input
          type="number"
          min={8}
          max={200}
          className="w-12 rounded border border-white/15 bg-black/40 px-1 py-0.5"
          value={Math.round(fontSize)}
          onChange={(e) => patch({ fontSize: Number(e.target.value) || 16 })}
        />
      </label>
      <button
        type="button"
        className={`rounded border px-1.5 py-0.5 text-[11px] ${
          fontBold
            ? "border-violet-400/50 bg-violet-500/30 text-violet-100"
            : "border-white/15 bg-black/40 text-slate-300"
        }`}
        onClick={() => patch({ fontBold: !fontBold })}
      >
        {label(t, "bold")}
      </button>
      <label className="flex items-center gap-1 text-[11px] text-slate-300">
        {label(t, "fontStyle")}
        <select
          className="max-w-[11rem] rounded border border-white/15 bg-black/40 px-1 py-0.5 text-[11px]"
          value={fontFamily || LIVE_TEXT_DEFAULT_FONT}
          onChange={(e) => patch({ fontFamily: e.target.value })}
        >
          {LIVE_TEXT_FONT_GROUPS.map((group) => (
            <optgroup key={group} label={label(t, LIVE_TEXT_FONT_GROUP_LABEL_KEY[group])}>
              {LIVE_TEXT_FONTS.filter((f) => f.group === group).map((f) => (
                <option key={f.id} value={f.id} style={{ fontFamily: f.id }}>
                  {label(t, f.labelKey)}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>
      <button
        type="button"
        className={`rounded border px-1.5 py-0.5 text-[11px] ${
          textVertical
            ? "border-violet-400/50 bg-violet-500/30 text-violet-100"
            : "border-white/15 bg-black/40 text-slate-300"
        }`}
        onClick={() =>
          patch({
            textVertical: !textVertical,
            wPct: hPct,
            hPct: wPct,
          })
        }
      >
        {textVertical ? label(t, "textHorizontal") : label(t, "textVertical")}
      </button>
      <label className="flex items-center gap-1 text-[11px] text-slate-300">
        {label(t, "textEffect")}
        <select
          className="max-w-[9rem] rounded border border-white/15 bg-black/40 px-1 py-0.5 text-[11px]"
          value={effect === "none" ? "none" : effect}
          onChange={(e) =>
            patch({
              textEffect: e.target.value as LiveTextEffect,
              ...(e.target.value === "glow" || e.target.value === "neon"
                ? { effectColor: effectColor === "#000000" ? "#a855f7" : effectColor }
                : {}),
            })
          }
        >
          {LIVE_TEXT_EFFECTS.map((item) => (
            <option key={item.id} value={item.id}>
              {label(t, item.labelKey)}
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-1 text-[11px] text-slate-300">
        {label(t, "color")}
        <input
          type="color"
          className="h-6 w-8 cursor-pointer rounded border border-white/15 bg-transparent"
          value={fill || "#111827"}
          onChange={(e) => patch({ fill: e.target.value })}
          title={label(t, "color")}
        />
      </label>
      {showStroke ? (
        <label className="flex items-center gap-1 text-[11px] text-slate-300">
          {label(t, "strokeColor")}
          <input
            type="color"
            className="h-6 w-8 cursor-pointer rounded border border-white/15 bg-transparent"
            value={strokeColor || "#ffffff"}
            onChange={(e) => patch({ strokeColor: e.target.value })}
            title={label(t, "strokeColor")}
          />
        </label>
      ) : null}
      {showEffectColor ? (
        <label className="flex items-center gap-1 text-[11px] text-slate-300">
          {label(t, "effectColor")}
          <input
            type="color"
            className="h-6 w-8 cursor-pointer rounded border border-white/15 bg-transparent"
            value={effectColor || "#000000"}
            onChange={(e) => patch({ effectColor: e.target.value })}
            title={label(t, "effectColorHint")}
          />
        </label>
      ) : null}
    </div>
  );
}
