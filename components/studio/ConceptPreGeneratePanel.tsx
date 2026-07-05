"use client";

import { useWizard } from "@/components/studio/WizardContext";
import { CINEMATIC_REEL_VIDEO_CREATIVITY } from "@/lib/cinematic-motion-prompt";
import { cameraForMotion } from "@/lib/video-settings";

/** Beginner checklist before 「生成完整 Reel」 — no need to learn every setting. */
export function ConceptPreGeneratePanel() {
  const w = useWizard();
  const { m } = w;

  const motionLabel =
    m.wizard.videoMotionStyles[w.videoSettings.motionStyle] ?? w.videoSettings.motionStyle;
  const creativityLabel =
    m.wizard.videoCreativityLevels[w.videoSettings.creativity] ?? w.videoSettings.creativity;

  function scrollToAdPack() {
    if (!w.adPackPlan) {
      void w.planAdPackReview();
    }
    requestAnimationFrame(() => {
      document.getElementById("ad-pack-review")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function applyStableMotion() {
    w.setVideoSettings((prev) => ({
      ...prev,
      motionStyle: "static-glow",
      creativity: "subtle",
      autoSecondFrame: false,
    }));
  }

  function applyCinematicMotion() {
    w.setVideoSettings((prev) => ({
      ...prev,
      motionStyle: "gentle-orbit",
      creativity: CINEMATIC_REEL_VIDEO_CREATIVITY,
      autoSecondFrame: false,
    }));
  }

  return (
    <div className="space-y-3 rounded-2xl border border-cyan-800/50 bg-cyan-950/25 p-4">
      <div>
        <h3 className="text-sm font-semibold text-cyan-50">{m.wizard.preGenerate.title}</h3>
        <p className="mt-1 text-xs text-cyan-100/80">{m.wizard.preGenerate.hint}</p>
      </div>

      <ul className="space-y-1.5 text-xs text-cyan-100/90">
        <li>
          <span className="text-cyan-300/80">{m.wizard.preGenerate.keyframeLabel}: </span>
          {w.hasFinalImage || w.cinematicScenes.length > 0
            ? m.wizard.preGenerate.keyframeReady
            : m.wizard.preGenerate.keyframeMissing}
        </li>
        <li>
          <span className="text-cyan-300/80">{m.wizard.preGenerate.motionLabel}: </span>
          {motionLabel} · {creativityLabel} · {cameraForMotion(w.videoSettings.motionStyle)}
        </li>
        <li>
          <span className="text-cyan-300/80">{m.wizard.preGenerate.audioLabel}: </span>
          {w.voiceoverEnabled ? m.wizard.preGenerate.voiceOn : m.wizard.preGenerate.voiceOff}
          {" · "}
          {w.captionBurnEnabled ? m.wizard.preGenerate.captionsOn : m.wizard.preGenerate.captionsOff}
          {w.musicSource === "ai" ? ` · ${m.wizard.preGenerate.aiMusic}` : ""}
        </li>
        <li className="text-cyan-200/70">{m.wizard.preGenerate.downloadTip}</li>
      </ul>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={applyCinematicMotion}
          className="rounded-full border border-emerald-500/60 bg-emerald-900/40 px-3 py-1.5 text-xs font-medium text-emerald-100 hover:bg-emerald-900/60"
        >
          {m.wizard.preGenerate.cinematicMotionBtn}
        </button>
        <button
          type="button"
          onClick={applyStableMotion}
          className="rounded-full border border-cyan-500/60 bg-cyan-900/40 px-3 py-1.5 text-xs font-medium text-cyan-100 hover:bg-cyan-900/60"
        >
          {m.wizard.preGenerate.stableMotionBtn}
        </button>
        <button
          type="button"
          onClick={scrollToAdPack}
          className="rounded-full border border-violet-500/60 bg-violet-900/40 px-3 py-1.5 text-xs font-medium text-violet-100 hover:bg-violet-900/60"
        >
          {m.wizard.preGenerate.adPackBtn}
        </button>
      </div>

      <p className="text-[10px] text-cyan-200/60">{m.wizard.preGenerate.advancedHint}</p>
    </div>
  );
}
