"use client";

import { CaptionLineEditor } from "@/components/captions/CaptionLineEditor";
import { useWizard } from "@/components/studio/WizardContext";
import { MUSIC_MOODS, VOICEOVER_LOCALES, type MusicMood } from "@/lib/ad-pack-preferences";

export function AdPackReviewPanel() {
  const w = useWizard();
  const { m } = w;

  if (!w.adPackReviewOpen && !w.adPackPlan) {
    return (
      <div id="ad-pack-review" className="rounded-2xl border border-violet-500/30 bg-violet-950/20 p-4">
        <h3 className="text-sm font-semibold text-violet-50">{m.wizard.adPack.title}</h3>
        <p className="mt-1 text-xs text-violet-200/80">{m.wizard.adPack.intro}</p>
        <button
          type="button"
          disabled={w.adPackPlanBusy}
          onClick={() => void w.planAdPackReview()}
          className="mt-3 rounded-full bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-60"
        >
          {w.adPackPlanBusy ? m.wizard.adPack.planning : m.wizard.adPack.planCta}
        </button>
      </div>
    );
  }

  return (
    <div id="ad-pack-review" className="space-y-4 rounded-2xl border border-violet-500/30 bg-violet-950/20 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-violet-50">{m.wizard.adPack.reviewTitle}</h3>
          <p className="mt-1 text-xs text-violet-200/80">{m.wizard.adPack.reviewHint}</p>
        </div>
        <button
          type="button"
          disabled={w.adPackPlanBusy}
          onClick={() => void w.planAdPackReview()}
          className="rounded-full border border-violet-400/50 px-3 py-1.5 text-xs font-medium text-violet-100 hover:bg-violet-900/40 disabled:opacity-60"
        >
          {w.adPackPlanBusy ? m.wizard.adPack.planning : m.wizard.adPack.regenerateAll}
        </button>
      </div>

      {/* Script & captions */}
      <section className="space-y-2 rounded-xl border border-slate-800 bg-slate-950/40 p-3">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-300">
            {m.wizard.adPack.scriptSection}
          </h4>
          <label className="flex items-center gap-2 text-xs text-slate-400">
            <input
              type="checkbox"
              checked={w.captionBurnEnabled}
              onChange={(e) => w.setCaptionBurnEnabled(e.target.checked)}
            />
            {m.wizard.adPack.burnCaptions}
          </label>
        </div>
        {w.adPackPlan?.hookScript && (
          <p className="text-xs text-slate-400">
            <span className="font-medium text-slate-300">{m.wizard.adPack.hookLabel}: </span>
            {w.adPackPlan.hookScript}
          </p>
        )}
        <textarea
          value={w.adPackPlan?.voiceoverScript ?? ""}
          onChange={(e) =>
            w.setAdPackPlan((prev) =>
              prev ? { ...prev, voiceoverScript: e.target.value } : prev,
            )
          }
          rows={2}
          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100"
          placeholder={m.wizard.adPack.voiceoverPlaceholder}
        />
        {!w.adPackPlan?.voiceoverScript?.trim() && w.captionLines.length > 0 && (
          <p className="text-[11px] text-amber-300">{m.wizard.adPack.voiceoverEmptyHint}</p>
        )}
        {w.captionLines.length > 0 && (
          <button
            type="button"
            onClick={() =>
              w.setAdPackPlan((prev) =>
                prev
                  ? {
                      ...prev,
                      voiceoverScript: w.captionLines
                        .map((line) => line.text.trim())
                        .filter(Boolean)
                        .join("，"),
                    }
                  : prev,
              )
            }
            className="text-xs font-medium text-cyan-300 underline underline-offset-2"
          >
            {m.wizard.adPack.voiceoverFromCaptionsBtn}
          </button>
        )}
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-2">
          <label className="flex items-center gap-2 text-xs text-slate-300">
            <input
              type="checkbox"
              checked={w.voiceoverEnabled}
              onChange={(e) => w.setVoiceoverEnabled(e.target.checked)}
            />
            {m.wizard.adPack.speakVoiceover}
          </label>
          {w.voiceoverEnabled && (
            <div className="mt-2 flex flex-wrap gap-2">
              {VOICEOVER_LOCALES.map((loc) => (
                <button
                  key={loc}
                  type="button"
                  onClick={() => w.setVoiceoverLocale(loc)}
                  className={`rounded-full px-3 py-1 text-[11px] font-medium ${
                    w.voiceoverLocale === loc
                      ? "bg-violet-600 text-white"
                      : "border border-slate-600 text-slate-400"
                  }`}
                >
                  {m.wizard.adPack.voiceLocales[loc]}
                </button>
              ))}
            </div>
          )}
          {w.voiceoverEnabled && (
            <p className="mt-1 text-[10px] text-slate-500">{m.wizard.adPack.voiceoverHint}</p>
          )}
          {w.voiceoverEnabled && (
            <div className="mt-3 space-y-2 rounded-lg border border-violet-900/40 bg-violet-950/20 p-2">
              <p className="text-[11px] font-medium text-violet-200">{m.wizard.adPack.voiceSection}</p>
              <p className="text-[10px] text-violet-200/70">{m.wizard.adPack.voicePreviewHint}</p>
              <button
                type="button"
                disabled={
                  w.voicePreviewBusy ||
                  !(
                    w.adPackPlan?.voiceoverScript?.trim() ||
                    w.captionLines.some((l) => l.text.trim())
                  )
                }
                onClick={() => void w.generateVoicePreviews()}
                className="rounded-full bg-violet-700 px-4 py-2 text-xs font-medium text-white hover:bg-violet-600 disabled:opacity-60"
              >
                {w.voicePreviewBusy ? m.wizard.adPack.generatingVoice : m.wizard.adPack.generateVoice}
              </button>
              {w.voicePreviewTracks.length > 0 && (
                <div className="space-y-2">
                  {w.voicePreviewTracks.map((track) => {
                    const presetKey = track.presetId as keyof typeof m.wizard.adPack.voicePresets;
                    const presetLabel =
                      m.wizard.adPack.voicePresets[presetKey] ?? track.label;
                    return (
                      <div
                        key={track.id}
                        className={`flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2 ${
                          w.selectedVoicePreviewId === track.id
                            ? "border-violet-400 bg-violet-950/40"
                            : "border-slate-700 bg-slate-950/30"
                        }`}
                      >
                        <span className="text-xs font-semibold text-white">{presetLabel}</span>
                        <audio src={track.audioUrl} controls className="h-8 max-w-full flex-1" />
                        <button
                          type="button"
                          onClick={() => w.setSelectedVoicePreviewId(track.id)}
                          className="rounded-full border border-violet-500/60 px-2 py-1 text-[11px] text-violet-200"
                        >
                          {w.selectedVoicePreviewId === track.id
                            ? m.wizard.adPack.selected
                            : m.wizard.adPack.selectTrack}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="space-y-2">
          {w.captionLines.map((line, index) => (
            <CaptionLineEditor
              key={`cap-${index}`}
              line={line}
              index={index}
              onChange={(patch) => w.updateCaptionLine(index, patch)}
              onRemove={() => w.removeCaptionLine(index)}
              timingLabel={m.wizard.adPack.timingLabel}
              positionLabel={m.wizard.adPack.positionLabel}
              positionOptions={m.wizard.adPack.positionOptions}
              multilineHint={m.wizard.adPack.multilineHint}
              removeLabel={m.wizard.adPack.removeCaption}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => w.addCaptionLine()}
          className="text-xs font-medium text-cyan-300 underline underline-offset-2"
        >
          {m.wizard.adPack.addCaption}
        </button>
      </section>

      {/* Timeline (storyboard) */}
      {w.isStoryboardOutput && w.storyboardScenes.length > 0 && (
        <section className="space-y-2 rounded-xl border border-teal-900/40 bg-teal-950/20 p-3">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-teal-200">
            {m.wizard.adPack.timelineSection}
          </h4>
          {w.storyboardScenes.map((scene, index) => (
            <div key={scene.imageIndex} className="grid gap-2 sm:grid-cols-[1fr_auto_auto] sm:items-center">
              <p className="text-xs text-teal-100">
                {m.wizard.adPack.sceneLabel.replace("{n}", String(scene.imageIndex))}{" "}
                {scene.sceneDescriptionZh || scene.role}
              </p>
              <label className="text-[11px] text-teal-200/80">
                {m.wizard.adPack.startSec}
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  value={scene.startSec}
                  onChange={(e) =>
                    w.updateStoryboardSceneTiming(index, Number(e.target.value), scene.endSec)
                  }
                  className="ml-1 w-14 rounded border border-teal-800 bg-slate-950 px-1 py-0.5 text-xs text-white"
                />
              </label>
              <label className="text-[11px] text-teal-200/80">
                {m.wizard.adPack.endSec}
                <input
                  type="number"
                  min={0.5}
                  step={0.5}
                  value={scene.endSec}
                  onChange={(e) =>
                    w.updateStoryboardSceneTiming(index, scene.startSec, Number(e.target.value))
                  }
                  className="ml-1 w-14 rounded border border-teal-800 bg-slate-950 px-1 py-0.5 text-xs text-white"
                />
              </label>
            </div>
          ))}
        </section>
      )}

      {/* Music */}
      <section className="space-y-3 rounded-xl border border-emerald-900/40 bg-emerald-950/20 p-3">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-emerald-200">
          {m.wizard.adPack.musicSection}
        </h4>
        <p className="text-[11px] text-emerald-200/70">{m.wizard.adPack.musicMoodLabel}</p>
        <div className="flex flex-wrap gap-2">
          {MUSIC_MOODS.map((mood) => (
            <button
              key={mood}
              type="button"
              onClick={() => w.setMusicMood(mood)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                w.musicMood === mood
                  ? "bg-emerald-600 text-white"
                  : "border border-slate-600 text-slate-400"
              }`}
            >
              {m.wizard.adPack.musicMoods[mood as MusicMood]}
            </button>
          ))}
        </div>
        {w.adPackPlan?.music && (
          <p className="text-xs text-emerald-100/90">
            {m.wizard.adPack.aiStyleLabel}: {w.adPackPlan.music.styleLabel}
            <span className="block text-[11px] text-emerald-200/70">{w.adPackPlan.music.promptEn}</span>
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => w.setMusicSource("library")}
            className={`rounded-full px-3 py-1.5 text-xs font-medium ${
              w.musicSource === "library"
                ? "bg-emerald-600 text-white"
                : "border border-slate-600 text-slate-400"
            }`}
          >
            {m.wizard.adPack.libraryMusic}
          </button>
          <button
            type="button"
            onClick={() => w.setMusicSource("ai")}
            className={`rounded-full px-3 py-1.5 text-xs font-medium ${
              w.musicSource === "ai"
                ? "bg-emerald-600 text-white"
                : "border border-slate-600 text-slate-400"
            }`}
          >
            {m.wizard.adPack.aiMusic}
          </button>
        </div>
        {w.musicSource === "library" ? (
          <div className="flex flex-wrap gap-2">
            {w.bgmOptions.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => w.setBgmTrack(id)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                  w.bgmTrack === id
                    ? "bg-emerald-600 text-white"
                    : "border border-slate-600 text-slate-400"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            <button
              type="button"
              disabled={w.musicGenerateBusy || !w.adPackPlan?.music.promptEn}
              onClick={() => void w.generateAiMusicTracks()}
              className="rounded-full bg-emerald-700 px-4 py-2 text-xs font-medium text-white hover:bg-emerald-600 disabled:opacity-60"
            >
              {w.musicGenerateBusy ? m.wizard.adPack.generatingMusic : m.wizard.adPack.generateMusic}
            </button>
            {w.aiMusicTracks.length > 0 && (
              <div className="space-y-2">
                {w.aiMusicTracks.map((track) => (
                  <div
                    key={track.id}
                    className={`flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2 ${
                      w.selectedAiMusicId === track.id
                        ? "border-emerald-400 bg-emerald-950/40"
                        : "border-slate-700 bg-slate-950/30"
                    }`}
                  >
                    <span className="text-xs font-semibold text-white">
                      {m.wizard.adPack.trackLabel.replace("{label}", track.label)}
                    </span>
                    <audio src={track.audioUrl} controls className="h-8 max-w-full flex-1" />
                    <button
                      type="button"
                      onClick={() => w.setSelectedAiMusicId(track.id)}
                      className="rounded-full border border-emerald-500/60 px-2 py-1 text-[11px] text-emerald-200"
                    >
                      {w.selectedAiMusicId === track.id
                        ? m.wizard.adPack.selected
                        : m.wizard.adPack.selectTrack}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
