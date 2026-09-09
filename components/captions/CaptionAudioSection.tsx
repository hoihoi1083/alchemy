"use client";

import { useState, type ReactNode } from "react";
import type { VoiceoverLocale } from "@/lib/ad-pack-preferences";
import { MUSIC_MOODS, type MusicMood } from "@/lib/ad-pack-preferences";
import type { AiMusicTrack, VoicePreviewTrack } from "@/lib/ad-pack-types";
import { BGM_TRACKS, bgmPublicUrl, type BgmTrackId } from "@/lib/bgm/tracks";

export type MusicSource = "library" | "ai";

type Props = {
  disabled: boolean;
  audioBusy: boolean;
  captionBusy: boolean;
  /** Tighter chrome + accordion for CapCut props column. */
  embedded?: boolean;
  musicTopic: string;
  onMusicTopicChange: (v: string) => void;
  musicMood: MusicMood;
  onMusicMoodChange: (m: MusicMood) => void;
  musicSource: MusicSource;
  onMusicSourceChange: (s: MusicSource) => void;
  bgmTrack: BgmTrackId;
  onBgmTrackChange: (id: BgmTrackId) => void;
  bgmOptions: { id: BgmTrackId; label: string }[];
  aiMusicTracks: AiMusicTrack[];
  selectedAiMusicId: string | null;
  onSelectAiMusic: (id: string) => void;
  musicGenerateBusy: boolean;
  onGenerateAiMusic: () => void;
  aiMusicGenerateFirstHint: string;
  replaceSourceAudio: boolean;
  onReplaceSourceAudioChange: (v: boolean) => void;
  onApplyBgm: () => void;
  voiceoverEnabled: boolean;
  onVoiceoverEnabledChange: (v: boolean) => void;
  voiceoverScript: string;
  onVoiceoverScriptChange: (v: string) => void;
  voiceoverLocale: VoiceoverLocale;
  onVoiceoverLocaleChange: (v: VoiceoverLocale) => void;
  voicePreviewTracks: VoicePreviewTrack[];
  selectedVoicePreviewId: string | null;
  onSelectVoicePreview: (id: string) => void;
  voicePreviewBusy: boolean;
  onGenerateVoicePreviews: () => void;
  onApplyVoiceover: () => void;
  onFillVoiceFromCaptions?: () => void;
  onSyncCaptionsFromVoice?: () => void;
  onPlanCaptionVoice?: () => void;
  planCaptionVoiceBusy?: boolean;
  onExpandSpokenCaptions?: () => void;
  expandSpokenBusy?: boolean;
  captionLineCount?: number;
  audioNote: string | null;
  audioError?: string | null;
  /** When set (embedded board), show a link instead of duplicating plan UI. */
  onOpenCaptionsPlan?: () => void;
  openCaptionsPlanLabel?: string;
  labels: {
    title: string;
    hint: string;
    planSection?: string;
    planHint?: string;
    planTopicLabel?: string;
    planTopicPlaceholder?: string;
    planCaptionVoice?: string;
    planningCaptionVoice?: string;
    planNeedTopic?: string;
    musicSection: string;
    musicMoodLabel: string;
    musicMoods: Record<MusicMood, string>;
    musicTopicLabel: string;
    musicTopicPlaceholder: string;
    libraryMusic: string;
    aiMusic: string;
    libraryDisclaimer: string;
    generateMusic: string;
    generatingMusic: string;
    generateMusicHint: string;
    trackLabel: string;
    selectTrack: string;
    selected: string;
    applyBgm: string;
    applyingBgm: string;
    audioReplaceOriginal: string;
    audioReplaceOriginalHint: string;
    libraryPreviewLabel: string;
    voiceSection: string;
    voicePreviewHint: string;
    generateVoice: string;
    generatingVoice: string;
    voicePresets: Record<string, string>;
    speakVoiceover: string;
    voicePlaceholder: string;
    applyVoice: string;
    applyVoicePerCaption?: string;
    applyingVoice: string;
    localeHk: string;
    localeCn: string;
    localeEn: string;
    fillVoiceFromCaptions: string;
    syncCaptionsFromVoice?: string;
    syncCaptionsNeedScript?: string;
    expandSpokenCaptions?: string;
    expandingSpokenCaptions?: string;
  };
};

function Accordion(props: {
  title: string;
  open: boolean;
  onToggle: () => void;
  tone: "violet" | "emerald";
  children: ReactNode;
}) {
  const border =
    props.tone === "violet"
      ? "border-violet-900/40 bg-violet-950/20"
      : "border-emerald-900/40 bg-emerald-950/20";
  const titleCls =
    props.tone === "violet" ? "text-violet-200" : "text-emerald-200";
  return (
    <div className={`rounded-xl border ${border}`}>
      <button
        type="button"
        onClick={props.onToggle}
        className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide ${titleCls}`}
      >
        <span>{props.title}</span>
        <span className="text-[10px] opacity-70">{props.open ? "−" : "+"}</span>
      </button>
      {props.open ? <div className="space-y-3 px-3 pb-3">{props.children}</div> : null}
    </div>
  );
}

export function CaptionAudioSection({
  disabled,
  audioBusy,
  captionBusy,
  embedded = false,
  musicTopic,
  onMusicTopicChange,
  musicMood,
  onMusicMoodChange,
  musicSource,
  onMusicSourceChange,
  bgmTrack,
  onBgmTrackChange,
  bgmOptions,
  aiMusicTracks,
  selectedAiMusicId,
  onSelectAiMusic,
  musicGenerateBusy,
  onGenerateAiMusic,
  aiMusicGenerateFirstHint,
  replaceSourceAudio,
  onReplaceSourceAudioChange,
  onApplyBgm,
  voiceoverEnabled,
  onVoiceoverEnabledChange,
  voiceoverScript,
  onVoiceoverScriptChange,
  voiceoverLocale,
  onVoiceoverLocaleChange,
  voicePreviewTracks,
  selectedVoicePreviewId,
  onSelectVoicePreview,
  voicePreviewBusy,
  onGenerateVoicePreviews,
  onApplyVoiceover,
  onFillVoiceFromCaptions,
  onSyncCaptionsFromVoice,
  onPlanCaptionVoice,
  planCaptionVoiceBusy = false,
  onExpandSpokenCaptions,
  expandSpokenBusy = false,
  captionLineCount = 0,
  audioNote,
  audioError = null,
  onOpenCaptionsPlan,
  openCaptionsPlanLabel,
  labels: t,
}: Props) {
  const busy = audioBusy || captionBusy || planCaptionVoiceBusy || expandSpokenBusy;
  const selectedLibrary = bgmOptions.find((o) => o.id === bgmTrack);
  const mixLabel =
    !audioBusy && captionLineCount >= 2 && t.applyVoicePerCaption
      ? t.applyVoicePerCaption.replace("{n}", String(captionLineCount))
      : audioBusy
        ? t.applyingVoice
        : t.applyVoice;

  const [voiceOpen, setVoiceOpen] = useState(true);
  const [musicOpen, setMusicOpen] = useState(!embedded);

  const planBlock =
    onPlanCaptionVoice && t.planCaptionVoice ? (
      <div className="space-y-3 rounded-xl border border-cyan-800/50 bg-cyan-950/25 p-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-cyan-200">
          {t.planSection ?? t.planCaptionVoice}
        </h3>
        {t.planHint && <p className="text-[10px] text-cyan-100/70">{t.planHint}</p>}
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              ["hk", t.localeHk],
              ["cn", t.localeCn],
              ["en", t.localeEn],
            ] as const
          ).map(([loc, label]) => (
            <button
              key={`plan-loc-${loc}`}
              type="button"
              disabled={disabled || busy}
              onClick={() => onVoiceoverLocaleChange(loc)}
              className={`rounded-full px-2.5 py-1 text-[11px] ${
                voiceoverLocale === loc
                  ? "bg-cyan-600 text-white"
                  : "border border-slate-600 text-slate-300"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div>
          <label className="text-[11px] font-medium text-cyan-100/90">
            {t.planTopicLabel ?? t.musicTopicLabel}
          </label>
          <input
            type="text"
            value={musicTopic}
            disabled={disabled || busy}
            onChange={(e) => onMusicTopicChange(e.target.value)}
            placeholder={t.planTopicPlaceholder ?? t.musicTopicPlaceholder}
            className="mt-1.5 w-full rounded-lg border border-cyan-800/60 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-500"
          />
        </div>
        <button
          type="button"
          disabled={disabled || busy || !musicTopic.trim()}
          onClick={onPlanCaptionVoice}
          title={!musicTopic.trim() ? t.planNeedTopic : undefined}
          className="w-full rounded-full bg-cyan-700 py-2 text-xs font-medium text-white hover:bg-cyan-600 disabled:opacity-50"
        >
          {planCaptionVoiceBusy
            ? (t.planningCaptionVoice ?? t.planCaptionVoice)
            : t.planCaptionVoice}
        </button>
      </div>
    ) : null;

  const musicBody = (
    <>
      <div>
        <p className="text-[11px] font-medium text-emerald-200/90">{t.musicMoodLabel}</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {MUSIC_MOODS.map((mood) => (
            <button
              key={mood}
              type="button"
              disabled={disabled || busy}
              onClick={() => onMusicMoodChange(mood)}
              className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                musicMood === mood
                  ? "bg-emerald-600 text-white"
                  : "border border-slate-600 text-slate-400"
              }`}
            >
              {t.musicMoods[mood]}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-[11px] font-medium text-emerald-200/90">{t.musicTopicLabel}</label>
        <input
          type="text"
          value={musicTopic}
          disabled={disabled || busy}
          onChange={(e) => onMusicTopicChange(e.target.value)}
          placeholder={t.musicTopicPlaceholder}
          className="mt-1.5 w-full rounded-lg border border-emerald-800/60 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-500"
        />
      </div>

      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          disabled={disabled || busy}
          onClick={() => onMusicSourceChange("library")}
          className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
            musicSource === "library"
              ? "bg-emerald-600 text-white"
              : "border border-slate-600 text-slate-400"
          }`}
        >
          {t.libraryMusic}
        </button>
        <button
          type="button"
          disabled={disabled || busy}
          onClick={() => onMusicSourceChange("ai")}
          className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
            musicSource === "ai"
              ? "bg-emerald-600 text-white"
              : "border border-slate-600 text-slate-400"
          }`}
        >
          {t.aiMusic}
        </button>
      </div>

      {musicSource === "library" ? (
        <div className="space-y-2">
          <p className="text-[10px] text-amber-200/80">{t.libraryDisclaimer}</p>
          <div className="flex flex-wrap gap-1.5">
            {bgmOptions.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                disabled={disabled || busy}
                onClick={() => onBgmTrackChange(id)}
                className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                  bgmTrack === id
                    ? "bg-emerald-600 text-white"
                    : "border border-slate-600 text-slate-400"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-emerald-200/70">{t.libraryPreviewLabel}</p>
          <audio
            key={bgmTrack}
            src={bgmPublicUrl(bgmTrack)}
            controls
            loop
            preload="metadata"
            className="h-9 w-full"
          />
          {selectedLibrary && (
            <p className="text-[10px] text-slate-500">
              {selectedLibrary.label} —{" "}
              {BGM_TRACKS.find((x) => x.id === bgmTrack)?.character}
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-[11px] text-emerald-200/70">{t.generateMusicHint}</p>
          <button
            type="button"
            disabled={disabled || busy || musicGenerateBusy}
            onClick={onGenerateAiMusic}
            className="rounded-full bg-emerald-700 px-3 py-1.5 text-[11px] font-medium text-white hover:bg-emerald-600 disabled:opacity-50"
          >
            {musicGenerateBusy ? t.generatingMusic : t.generateMusic}
          </button>
          {aiMusicTracks.length === 0 && (
            <p className="text-[10px] text-slate-500">{aiMusicGenerateFirstHint}</p>
          )}
          {aiMusicTracks.map((track) => (
            <div
              key={track.id}
              className={`rounded-lg border px-2 py-2 ${
                selectedAiMusicId === track.id
                  ? "border-violet-400 bg-violet-950/40"
                  : "border-slate-700 bg-slate-950/30"
              }`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-semibold text-white">
                  {t.trackLabel.replace("{label}", track.label)}
                </span>
                <button
                  type="button"
                  onClick={() => onSelectAiMusic(track.id)}
                  className="rounded-full border border-emerald-500/60 px-2 py-0.5 text-[10px] text-emerald-200"
                >
                  {selectedAiMusicId === track.id ? t.selected : t.selectTrack}
                </button>
              </div>
              <audio src={track.audioUrl} controls className="mt-1 h-7 w-full" />
            </div>
          ))}
        </div>
      )}

      <label className="flex items-start gap-2 rounded-lg border border-emerald-800/40 bg-slate-950/30 p-2 text-xs text-slate-200">
        <input
          type="checkbox"
          checked={replaceSourceAudio}
          disabled={disabled || busy}
          onChange={(e) => onReplaceSourceAudioChange(e.target.checked)}
          className="mt-0.5"
        />
        <span>
          <span className="block font-medium text-emerald-100">{t.audioReplaceOriginal}</span>
          <span className="mt-0.5 block text-[10px] text-emerald-200/70">
            {t.audioReplaceOriginalHint}
          </span>
        </span>
      </label>

      <button
        type="button"
        disabled={
          disabled ||
          audioBusy ||
          (musicSource === "ai" && aiMusicTracks.length === 0)
        }
        onClick={onApplyBgm}
        className="w-full rounded-full bg-emerald-700 py-2 text-xs font-medium text-white hover:bg-emerald-600 disabled:opacity-50"
      >
        {audioBusy ? t.applyingBgm : t.applyBgm}
      </button>
    </>
  );

  const voiceBody = (
    <>
      <label className="flex items-center gap-2 text-xs text-slate-200">
        <input
          type="checkbox"
          checked={voiceoverEnabled}
          disabled={disabled || busy}
          onChange={(e) => onVoiceoverEnabledChange(e.target.checked)}
        />
        {t.speakVoiceover}
      </label>
      {voiceoverEnabled ? (
        <>
          <div className="flex flex-wrap gap-1.5">
            {(
              [
                ["hk", t.localeHk],
                ["cn", t.localeCn],
                ["en", t.localeEn],
              ] as const
            ).map(([loc, label]) => (
              <button
                key={loc}
                type="button"
                disabled={disabled || busy}
                onClick={() => onVoiceoverLocaleChange(loc)}
                className={`rounded-full px-2.5 py-1 text-[11px] ${
                  voiceoverLocale === loc
                    ? "bg-violet-600 text-white"
                    : "border border-slate-600 text-slate-300"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <textarea
            value={voiceoverScript}
            disabled={disabled || busy}
            onChange={(e) => onVoiceoverScriptChange(e.target.value)}
            placeholder={t.voicePlaceholder}
            rows={3}
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-white"
          />
          <div className="flex flex-wrap items-center gap-2">
            {onFillVoiceFromCaptions && (
              <button
                type="button"
                disabled={disabled || busy}
                onClick={onFillVoiceFromCaptions}
                className="text-[11px] font-medium text-cyan-300 underline underline-offset-2"
              >
                {t.fillVoiceFromCaptions}
              </button>
            )}
            {onSyncCaptionsFromVoice && t.syncCaptionsFromVoice && (
              <button
                type="button"
                disabled={disabled || busy || !voiceoverScript.trim()}
                onClick={onSyncCaptionsFromVoice}
                title={
                  !voiceoverScript.trim() ? t.syncCaptionsNeedScript : undefined
                }
                className="rounded-full border border-cyan-500/50 px-3 py-1.5 text-[11px] font-medium text-cyan-100 hover:bg-cyan-950/40 disabled:opacity-50"
              >
                {t.syncCaptionsFromVoice}
              </button>
            )}
            {onExpandSpokenCaptions && t.expandSpokenCaptions && (
              <button
                type="button"
                disabled={disabled || busy || captionLineCount < 1}
                onClick={onExpandSpokenCaptions}
                className="rounded-full border border-violet-500/50 px-3 py-1.5 text-[11px] font-medium text-violet-100 hover:bg-violet-950/40 disabled:opacity-50"
              >
                {expandSpokenBusy
                  ? (t.expandingSpokenCaptions ?? t.expandSpokenCaptions)
                  : t.expandSpokenCaptions}
              </button>
            )}
          </div>
          {!voiceoverScript.trim() &&
            voiceoverEnabled &&
            t.syncCaptionsNeedScript && (
              <p className="text-[10px] text-amber-200/80">{t.syncCaptionsNeedScript}</p>
            )}
          <div className="space-y-2 rounded-lg border border-violet-800/50 bg-violet-950/30 p-2">
            <p className="text-[11px] font-medium text-violet-200">{t.voiceSection}</p>
            <p className="text-[10px] text-violet-200/70">{t.voicePreviewHint}</p>
            <button
              type="button"
              disabled={disabled || busy || voicePreviewBusy || !voiceoverScript.trim()}
              onClick={onGenerateVoicePreviews}
              className="rounded-full bg-violet-700 px-3 py-1.5 text-[11px] font-medium text-white disabled:opacity-50"
            >
              {voicePreviewBusy ? t.generatingVoice : t.generateVoice}
            </button>
            {voicePreviewTracks.map((track) => {
              const presetLabel = t.voicePresets[track.presetId] ?? track.label;
              return (
                <div
                  key={track.id}
                  className={`rounded-lg border px-2 py-2 ${
                    selectedVoicePreviewId === track.id
                      ? "border-violet-400 bg-violet-950/50"
                      : "border-slate-700 bg-slate-950/30"
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-semibold text-white">{presetLabel}</span>
                    <button
                      type="button"
                      onClick={() => onSelectVoicePreview(track.id)}
                      className="rounded-full border border-violet-500/60 px-2 py-0.5 text-[10px] text-violet-200"
                    >
                      {selectedVoicePreviewId === track.id ? t.selected : t.selectTrack}
                    </button>
                  </div>
                  <audio
                    src={track.audioUrl}
                    controls
                    preload="metadata"
                    crossOrigin="use-credentials"
                    className="mt-1 h-7 w-full"
                  />
                </div>
              );
            })}
          </div>
          <button
            type="button"
            disabled={
              disabled ||
              audioBusy ||
              (!voiceoverScript.trim() && !selectedVoicePreviewId)
            }
            onClick={onApplyVoiceover}
            className={
              embedded
                ? "w-full rounded-full bg-violet-700 py-2 text-xs font-medium text-white hover:bg-violet-600 disabled:opacity-50"
                : "hidden w-full rounded-full bg-violet-700 py-2 text-xs font-medium text-white hover:bg-violet-600 disabled:opacity-50 xl:block"
            }
          >
            {mixLabel}
          </button>
        </>
      ) : null}
    </>
  );

  return (
    <section
      className={
        embedded
          ? "space-y-3 rounded-xl border border-white/10 bg-black/30 p-2.5"
          : "space-y-4 rounded-3xl border border-slate-800 bg-slate-950/70 p-3 shadow-xl sm:p-4 xl:sticky xl:top-4 xl:max-h-[calc(100vh-5rem)] xl:overflow-y-auto"
      }
    >
      <div>
        <h2
          className={
            embedded
              ? "text-sm font-semibold text-white"
              : "text-lg font-semibold text-white"
          }
        >
          {t.title}
        </h2>
        <p
          className={
            embedded
              ? "mt-1 text-[10px] text-slate-400"
              : "mt-1 hidden text-xs text-slate-400 sm:block"
          }
        >
          {t.hint}
        </p>
      </div>

      {embedded && onOpenCaptionsPlan && openCaptionsPlanLabel ? (
        <button
          type="button"
          onClick={onOpenCaptionsPlan}
          className="w-full rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-2.5 py-2 text-left text-[11px] font-medium text-cyan-100"
        >
          {openCaptionsPlanLabel}
        </button>
      ) : !embedded ? (
        planBlock
      ) : null}

      {embedded ? (
        <>
          <Accordion
            title={t.voiceSection}
            tone="violet"
            open={voiceOpen}
            onToggle={() => setVoiceOpen((v) => !v)}
          >
            {voiceBody}
          </Accordion>
          <Accordion
            title={t.musicSection}
            tone="emerald"
            open={musicOpen}
            onToggle={() => setMusicOpen((v) => !v)}
          >
            {musicBody}
          </Accordion>
        </>
      ) : (
        <>
          <div className="space-y-3 rounded-xl border border-emerald-900/40 bg-emerald-950/20 p-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-emerald-200">
              {t.musicSection}
            </h3>
            {musicBody}
          </div>
          <div className="space-y-3 rounded-xl border border-violet-900/40 bg-violet-950/20 p-3">
            {voiceBody}
          </div>
        </>
      )}

      {audioError && <p className="text-xs text-red-300">{audioError}</p>}
      {audioNote && <p className="text-xs text-emerald-300">{audioNote}</p>}
    </section>
  );
}
