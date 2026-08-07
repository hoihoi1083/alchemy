"use client";

import { useMemo, useState } from "react";
import { PresenterAvatarPicker } from "@/components/studio/PresenterAvatarPicker";
import { GenerationWaitPlaceholder } from "@/components/studio/GenerationWaitPlaceholder";
import { useLocale } from "@/components/LocaleProvider";
import {
  defaultVoicePresetForLocale,
  VOICE_PRESET_IDS,
  type VoicePresetId,
  type VoiceoverLocale,
  voicePresetsForLocale,
} from "@/lib/ad-pack-preferences";
import { HEYGEN_STOCK_AVATARS, heygenAvatarVoice } from "@/lib/heygen-avatars";
import type { PresenterSourceMode } from "@/hooks/useWizardState";
import { ugcPresenterMotionHint } from "@/lib/ugc-presenter";

function defaultScript(locale: VoiceoverLocale, product: string): string {
  const p = product.trim() || (locale === "en" ? "this product" : "呢個產品");
  if (locale === "en") {
    return `Hey — quick tip. I've been using ${p} and it actually makes my day easier. If you want something simple that works, try ${p}.`;
  }
  if (locale === "cn") {
    return `跟你分享一下，我最近在用${p}，真的省事很多。想找个简单又实用的，可以试试${p}。`;
  }
  return `同你講吓，我最近用緊${p}，真係方便好多。想搵啲簡單又實用嘅，可以試吓${p}。`;
}

export function UgcStudioClient() {
  const { locale, m } = useLocale();
  const t = m.ugcStudio;
  const voiceLabels = m.wizard.adPack.voicePresets;

  const [product, setProduct] = useState("");
  const [script, setScript] = useState(() => defaultScript("hk", ""));
  const [voiceLocale, setVoiceLocale] = useState<VoiceoverLocale>("hk");
  const [avatarId, setAvatarId] = useState(HEYGEN_STOCK_AVATARS[0]?.id ?? "");
  const [voicePreset, setVoicePreset] = useState<VoicePresetId>(() =>
    defaultVoicePresetForLocale("hk"),
  );
  const [presenterMode, setPresenterMode] = useState<PresenterSourceMode>("custom-keyframe");
  const [productPhoto, setProductPhoto] = useState<File | null>(null);
  const [productPreview, setProductPreview] = useState<string | null>(null);
  const [keyframeUrl, setKeyframeUrl] = useState<string | null>(null);
  const [speechUrl, setSpeechUrl] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"voice" | "keyframe" | "video" | "script" | null>(null);

  const presets = useMemo(() => voicePresetsForLocale(voiceLocale), [voiceLocale]);
  const avatarVoice = useMemo(
    () => heygenAvatarVoice(avatarId, voiceLocale),
    [avatarId, voiceLocale],
  );
  const isZh = locale === "zh" || locale === "zh-cn" || locale === "zh-tw";

  function onLocaleChange(next: VoiceoverLocale) {
    setVoiceLocale(next);
    if (presenterMode !== "stock-avatar") {
      setVoicePreset(defaultVoicePresetForLocale(next));
    }
    setScript((prev) => {
      const looksDefault =
        !prev.trim() ||
        prev.includes("呢個產品") ||
        prev.includes("这个产品") ||
        prev.includes("this product") ||
        (product.trim() && prev.includes(product.trim()));
      return looksDefault ? defaultScript(next, product) : prev;
    });
    setSpeechUrl(null);
  }

  function onAvatarChange(id: string) {
    setAvatarId(id);
    setSpeechUrl(null);
  }

  function onPresenterModeChange(mode: PresenterSourceMode) {
    setPresenterMode(mode);
    setSpeechUrl(null);
  }

  function onProductPhoto(file: File | null) {
    if (productPreview?.startsWith("blob:")) URL.revokeObjectURL(productPreview);
    setProductPhoto(file);
    setProductPreview(file ? URL.createObjectURL(file) : null);
    setKeyframeUrl(null);
    if (file) setPresenterMode("custom-keyframe");
  }

  function onProductNameChange(value: string) {
    setProduct(value);
    setScript((prev) => {
      const looksDefault =
        !prev.trim() ||
        prev.includes("呢個產品") ||
        prev.includes("这个产品") ||
        prev.includes("this product") ||
        (!!product.trim() && prev.includes(product.trim()));
      return looksDefault ? defaultScript(voiceLocale, value) : prev;
    });
  }

  async function planScriptWithAi() {
    setError(null);
    setBusy("script");
    try {
      if (!product.trim()) throw new Error(t.needProduct);
      const market = voiceLocale === "en" ? "en" : voiceLocale === "cn" ? "cn" : "hk";
      const res = await fetch("/api/plan-ad-pack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product: product.trim(),
          headline: product.trim(),
          durationSec: 10,
          promptMarket: market,
          promptExtra: "UGC talking-head product intro — short spoken script only, natural spoken Cantonese/Mandarin/English matching market.",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t.scriptFailed);
      const plan = data.plan as {
        voiceoverScript?: string;
        hookVariants?: Array<{ voiceoverScript?: string }>;
      };
      const aiScript =
        plan.hookVariants?.[0]?.voiceoverScript?.trim() ||
        plan.voiceoverScript?.trim() ||
        "";
      if (!aiScript) throw new Error(t.scriptFailed);
      setScript(aiScript);
      setSpeechUrl(null);
      setNote(t.scriptReady);
    } catch (e) {
      setError(e instanceof Error ? e.message : t.scriptFailed);
    } finally {
      setBusy(null);
    }
  }

  async function previewVoice() {
    setError(null);
    setBusy("voice");
    try {
      if (!script.trim()) throw new Error(t.needScript);
      const res = await fetch("/api/preview-script-voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          script: script.trim(),
          locale: voiceLocale,
          ...(presenterMode === "stock-avatar" && avatarVoice
            ? {
                fal_voice_id: avatarVoice.voiceId,
                fal_voice_speed: avatarVoice.speed,
                fal_voice_label: isZh ? avatarVoice.labelZh : avatarVoice.labelEn,
              }
            : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t.voiceFailed);
      const tracks = (data.tracks ?? []) as Array<{
        id?: string;
        audioUrl?: string;
        presetId?: string;
      }>;
      const preferred =
        presenterMode === "stock-avatar"
          ? tracks[0]
          : tracks.find((track) => track.presetId === voicePreset) ?? tracks[0];
      const url = preferred?.audioUrl;
      if (!url) throw new Error(t.voiceFailed);
      if (
        presenterMode !== "stock-avatar" &&
        preferred?.presetId &&
        preferred.presetId !== voicePreset
      ) {
        setVoicePreset(preferred.presetId as VoicePresetId);
      }
      setSpeechUrl(url);
      setNote(t.voiceReady);
    } catch (e) {
      setError(e instanceof Error ? e.message : t.voiceFailed);
    } finally {
      setBusy(null);
    }
  }

  async function generateKeyframe() {
    setError(null);
    setBusy("keyframe");
    try {
      if (!productPhoto) throw new Error(t.needPhoto);
      if (!product.trim()) throw new Error(t.needProduct);
      const fd = new FormData();
      fd.set("reference_image", productPhoto);
      fd.set("product", product.trim());
      fd.set("headline", product.trim());
      fd.set("visual_style", "ugc-presenter");
      fd.set("promotion_mode", "physical");
      fd.set("workflow_mode", "combined");
      fd.set("image_creative_mode", "promo-ai");
      fd.set("image_output_mode", "single");
      fd.set("aspect_ratio", "9:16");
      fd.set("prompt_market", voiceLocale === "en" ? "en" : voiceLocale === "cn" ? "cn" : "hk");
      const res = await fetch("/api/generate-image", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t.keyframeFailed);
      const url = (data.imageUrl ?? data.imageUrls?.[0]) as string | undefined;
      if (!url) throw new Error(t.keyframeFailed);
      setKeyframeUrl(url);
      setPresenterMode("custom-keyframe");
      setNote(t.keyframeReady);
    } catch (e) {
      setError(e instanceof Error ? e.message : t.keyframeFailed);
    } finally {
      setBusy(null);
    }
  }

  async function generateVideo() {
    setError(null);
    setBusy("video");
    try {
      if (!script.trim() && !speechUrl) throw new Error(t.needScript);
      if (presenterMode === "custom-keyframe" && !keyframeUrl) {
        throw new Error(t.needKeyframe);
      }
      if (presenterMode === "stock-avatar" && !avatarId) {
        throw new Error(t.needAvatar);
      }

      const fd = new FormData();
      fd.set("product_name", product.trim() || "product");
      fd.set("talking_style", "expressive");
      fd.set("resolution", "720p");
      fd.set("aspect_ratio", "9:16");
      fd.set("presenter_mode", presenterMode);
      fd.set("motion_hint", ugcPresenterMotionHint(product.trim() || "the product"));
      if (speechUrl) {
        fd.set("speech_url", speechUrl);
        if (presenterMode !== "stock-avatar") fd.set("voice_preset", voicePreset);
      } else {
        fd.set("script", script.trim());
        fd.set("locale", voiceLocale);
        if (presenterMode !== "stock-avatar") fd.set("voice_preset", voicePreset);
      }
      if (presenterMode === "stock-avatar") {
        fd.set("stock_avatar_id", avatarId);
        if (avatarVoice) {
          fd.set("fal_voice_id", avatarVoice.voiceId);
          fd.set("fal_voice_speed", String(avatarVoice.speed));
        }
      } else if (keyframeUrl) {
        fd.set("image_url", keyframeUrl);
      }

      const res = await fetch("/api/generate-digital-presenter", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t.videoFailed);
      const url = data.videoUrl as string | undefined;
      if (!url) throw new Error(t.videoFailed);
      setVideoUrl(url);
      setNote([t.videoReady, data.note as string | undefined].filter(Boolean).join(" · "));
    } catch (e) {
      setError(e instanceof Error ? e.message : t.videoFailed);
    } finally {
      setBusy(null);
    }
  }

  const disabled = busy !== null;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.9fr)]">
      <section className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/50 p-4 sm:p-5">
        <div>
          <h2 className="text-lg font-semibold text-white">{t.setupTitle}</h2>
          <p className="mt-1 text-sm text-slate-400">{t.setupHint}</p>
          <p className="mt-2 rounded-xl border border-amber-500/30 bg-amber-950/30 px-3 py-2 text-xs leading-relaxed text-amber-100/90">
            {t.productHowHint}
          </p>
        </div>

        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-slate-300">{t.productLabel}</span>
          <input
            value={product}
            disabled={disabled}
            onChange={(e) => onProductNameChange(e.target.value)}
            placeholder={t.productPlaceholder}
            className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-sm text-white placeholder:text-slate-500"
          />
        </label>

        <div className="space-y-2 rounded-xl border border-rose-800/40 bg-rose-950/20 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-medium text-rose-100">{t.photoLabel}</p>
            <p className="text-[11px] text-rose-100/70">{t.photoRequiredHint}</p>
          </div>
          <p className="text-xs text-rose-100/80">{t.customHint}</p>
          <input
            type="file"
            accept="image/*"
            disabled={disabled}
            onChange={(e) => onProductPhoto(e.target.files?.[0] ?? null)}
            className="block w-full text-xs text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-rose-700 file:px-3 file:py-1.5 file:text-xs file:text-white"
          />
          {(productPreview || keyframeUrl) && (
            <div className="grid grid-cols-2 gap-2">
              {productPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={productPreview}
                  alt=""
                  className="aspect-3/4 w-full rounded-lg object-cover"
                />
              ) : null}
              {keyframeUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={keyframeUrl}
                  alt=""
                  className="aspect-3/4 w-full rounded-lg object-cover"
                />
              ) : null}
            </div>
          )}
          <button
            type="button"
            disabled={disabled || !productPhoto}
            onClick={() => void generateKeyframe()}
            className="rounded-xl bg-rose-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
          >
            {busy === "keyframe" ? t.generatingKeyframe : t.generateKeyframe}
          </button>
          {keyframeUrl ? (
            <p className="text-[11px] text-emerald-300/90">{t.keyframeReady}</p>
          ) : null}
        </div>

        <label className="block space-y-1.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-medium text-slate-300">{t.scriptLabel}</span>
            <button
              type="button"
              disabled={disabled || !product.trim()}
              onClick={() => void planScriptWithAi()}
              className="rounded-lg border border-violet-500/50 bg-violet-950/40 px-3 py-1 text-xs font-medium text-violet-100 disabled:opacity-40"
            >
              {busy === "script" ? t.planningScript : t.planScript}
            </button>
          </div>
          <textarea
            value={script}
            disabled={disabled}
            onChange={(e) => {
              setScript(e.target.value);
              setSpeechUrl(null);
            }}
            rows={5}
            className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-sm text-white placeholder:text-slate-500"
            placeholder={t.scriptPlaceholder}
          />
          <p className="text-[11px] text-slate-500">{t.scriptHint}</p>
          <p className="text-[11px] text-violet-200/70">{t.planScriptHint}</p>
        </label>

        <div className="flex flex-wrap gap-2">
          {(
            [
              ["hk", t.localeHk],
              ["cn", t.localeCn],
              ["en", t.localeEn],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              disabled={disabled}
              onClick={() => onLocaleChange(id)}
              className={`rounded-lg px-3 py-1.5 text-xs ${
                voiceLocale === id
                  ? "bg-rose-600 text-white"
                  : "border border-white/15 text-slate-300"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {presenterMode === "stock-avatar" ? (
          <div className="rounded-xl border border-violet-700/50 bg-violet-950/30 px-3 py-2.5">
            <p className="text-xs font-medium text-violet-100">{t.avatarVoiceLabel}</p>
            <p className="mt-1 text-sm text-white">
              {avatarVoice
                ? isZh
                  ? avatarVoice.labelZh
                  : avatarVoice.labelEn
                : "—"}
            </p>
            <p className="mt-1 text-[11px] text-violet-200/70">{t.avatarVoiceHint}</p>
          </div>
        ) : (
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-slate-300">{t.voiceLabel}</span>
            <select
              value={voicePreset}
              disabled={disabled}
              onChange={(e) => {
                setVoicePreset(e.target.value as VoicePresetId);
                setSpeechUrl(null);
              }}
              className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-sm text-white"
            >
              {(presets.length ? presets : VOICE_PRESET_IDS).map((id) => (
                <option key={id} value={id}>
                  {voiceLabels[id] ?? id}
                </option>
              ))}
            </select>
          </label>
        )}

        <PresenterAvatarPicker
          mode={presenterMode}
          avatarId={avatarId}
          disabled={disabled}
          onModeChange={onPresenterModeChange}
          onAvatarChange={onAvatarChange}
        />

        {presenterMode === "stock-avatar" ? (
          <p className="text-xs text-amber-200/80">
            {t.stockNoProductNote} {t.voiceMatchesAvatarNote}
          </p>
        ) : (
          <p className="text-xs text-slate-500">{t.customUsesProductNote}</p>
        )}

        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="button"
            disabled={disabled}
            onClick={() => void previewVoice()}
            className="rounded-xl border border-white/15 px-4 py-2.5 text-sm text-slate-100 disabled:opacity-40"
          >
            {busy === "voice" ? t.previewingVoice : t.previewVoice}
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => void generateVideo()}
            className="rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
          >
            {busy === "video" ? t.generatingVideo : t.generateVideo}
          </button>
        </div>

        {speechUrl ? (
          <audio controls src={speechUrl} className="w-full" />
        ) : null}

        {error ? (
          <p className="rounded-xl border border-rose-500/40 bg-rose-950/40 px-3 py-2 text-sm text-rose-100">
            {error}
          </p>
        ) : null}
        {note && !error ? (
          <p className="text-xs text-emerald-300/90">{note}</p>
        ) : null}
      </section>

      <section className="rounded-2xl border border-white/10 bg-slate-950/50 p-4 sm:p-5">
        <h2 className="text-lg font-semibold text-white">{t.previewTitle}</h2>
        <p className="mt-1 text-sm text-slate-400">{t.previewHint}</p>
        <div className="mt-4 overflow-hidden rounded-xl border border-white/10 bg-black">
          {busy === "video" || busy === "keyframe" ? (
            <div className="p-3">
              <GenerationWaitPlaceholder
                message={busy === "keyframe" ? t.generatingKeyframe : t.generatingVideo}
                hint={t.waitHint}
                aspectRatio="9:16"
                previewUrl={keyframeUrl || productPreview || null}
              />
            </div>
          ) : videoUrl ? (
            <video
              key={videoUrl}
              src={videoUrl}
              controls
              playsInline
              className="mx-auto max-h-[70vh] w-full bg-black object-contain"
            />
          ) : (
            <div className="flex aspect-9/16 max-h-[70vh] items-center justify-center px-6 text-center text-sm text-slate-500">
              {t.previewEmpty}
            </div>
          )}
        </div>
        {videoUrl ? (
          <a
            href={videoUrl}
            download="ugc-presenter.mp4"
            className="mt-3 inline-flex rounded-xl border border-emerald-500/40 px-4 py-2 text-sm text-emerald-200 hover:bg-emerald-950/40"
          >
            {t.download}
          </a>
        ) : null}
        <p className="mt-4 text-[11px] leading-relaxed text-slate-500">{t.costHint}</p>
      </section>
    </div>
  );
}
