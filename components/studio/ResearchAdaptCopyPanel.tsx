"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale } from "@/components/LocaleProvider";
import { useWizard } from "@/components/studio/WizardContext";
import type { PendingContentResearchPick } from "@/lib/content-research-apply";

type Props = {
  pendingPick: PendingContentResearchPick | null;
  promoteTarget: string;
  isConcept: boolean;
};

/** Debounce product/concept rename remaps — avoid per-keystroke API spam. */
const PROMOTE_REMAP_DEBOUNCE_MS = 700;

/**
 * After a research angle is selected (deferred apply), show remapped
 * hook/subline/offer and run DeepSeek adapt-to-product pass.
 */
export function ResearchAdaptCopyPanel({
  pendingPick,
  promoteTarget,
  isConcept,
}: Props) {
  const { m } = useLocale();
  const wizard = useWizard();
  const fuse = m.microWizard.intakeFuse;
  const cr = m.contentResearch;
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const lastAngleId = useRef<string | null>(null);
  const lastPromoteTarget = useRef<string>("");

  useEffect(() => {
    if (!pendingPick?.angle?.id) {
      lastAngleId.current = null;
      lastPromoteTarget.current = "";
      wizard.setResearchRemapBusy(false);
      return;
    }

    const angleId = pendingPick.angle.id;
    const promote = promoteTarget.trim();
    const isNewAngle = lastAngleId.current !== angleId;
    const promoteChanged =
      Boolean(promote) && lastPromoteTarget.current !== promote;

    // Same angle + same product — do not re-run.
    if (!isNewAngle && !promoteChanged) {
      // Debounce may have left busy=true after user reverted the name — release gate.
      setBusy(false);
      wizard.setResearchRemapBusy(false);
      return;
    }

    const angle = pendingPick.angle;
    const seedHeadline = angle.hook?.trim().slice(0, 120) ?? "";
    const seedSubline = angle.bulletPoints?.length
      ? angle.bulletPoints.slice(0, 3).join(" · ")
      : "";
    const seedOffer = angle.cta?.trim().slice(0, 80) ?? "";

    // New angle: seed immediately so fields update before remap returns.
    let existingHeadline = wizard.headline.trim();
    let existingSubline = wizard.subline.trim();
    let existingOffer = wizard.offer.trim();
    if (isNewAngle) {
      lastAngleId.current = angleId;
      wizard.setHeadline(seedHeadline);
      wizard.setSubline(seedSubline);
      wizard.setOffer(seedOffer);
      existingHeadline = seedHeadline;
      existingSubline = seedSubline;
      existingOffer = seedOffer;
    }

    if (!promote) {
      setNote(fuse.researchAdaptNeedProduct);
      wizard.setResearchRemapBusy(false);
      setBusy(false);
      return;
    }

    let cancelled = false;

    const runRemap = () => {
      if (cancelled) return;
      lastAngleId.current = angleId;
      lastPromoteTarget.current = promote;

      setBusy(true);
      wizard.setResearchRemapBusy(true);
      setNote(null);
      void fetch("/api/remap-research-copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          promotionMode: isConcept ? "concept" : "physical",
          productOrConcept: promote,
          market: wizard.promptMarket,
          referenceTitle: angle.title,
          referenceHook: angle.hook,
          referenceBullets: angle.bulletPoints,
          referenceCta: angle.cta,
          referenceSnippet: angle.sourceSnippet ?? angle.scriptOutline,
          // Use seeded/local strings — not async wizard state (stale prior angle).
          existingHeadline: existingHeadline || undefined,
          existingSubline: existingSubline || undefined,
          existingOffer: existingOffer || undefined,
        }),
      })
        .then(async (res) => {
          const data = await res.json();
          if (!res.ok) throw new Error(data.error ?? fuse.researchAdaptFailed);
          if (cancelled) return;
          const draft = data.draft as {
            headline?: string;
            subline?: string;
            offer?: string;
          };
          if (typeof draft.headline === "string") {
            wizard.setHeadline(draft.headline.trim());
          }
          if (typeof draft.subline === "string") {
            wizard.setSubline(draft.subline.trim());
          }
          if (typeof draft.offer === "string") {
            wizard.setOffer(draft.offer.trim());
          } else if (isNewAngle && !seedOffer) {
            wizard.setOffer("");
          }
          setNote(fuse.researchAdaptDone);
        })
        .catch((e: unknown) => {
          if (!cancelled) {
            setNote(
              e instanceof Error ? e.message : fuse.researchAdaptFailed,
            );
          }
        })
        .finally(() => {
          if (!cancelled) {
            setBusy(false);
            wizard.setResearchRemapBusy(false);
          }
        });
    };

    // New angle: remap immediately. Product rename only: debounce keystrokes.
    // Keep Continue blocked for the whole debounce window (not only after timer fires).
    let debounceTimer: ReturnType<typeof setTimeout> | undefined;
    if (isNewAngle) {
      runRemap();
    } else {
      setBusy(true);
      wizard.setResearchRemapBusy(true);
      debounceTimer = setTimeout(runRemap, PROMOTE_REMAP_DEBOUNCE_MS);
    }

    return () => {
      cancelled = true;
      if (debounceTimer) clearTimeout(debounceTimer);
      // Do not clear remap busy here — successor effect keeps the gate for
      // rename debounce, or runRemap/finally / early branches clear it.
    };
    // Re-run on angle change OR product/concept rename.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingPick?.angle?.id, promoteTarget, isConcept]);

  if (!pendingPick) return null;

  const platformName =
    cr.platforms[pendingPick.plan.platform] ??
    pendingPick.plan.platformLabel ??
    pendingPick.plan.platform;
  const postTitle =
    pendingPick.angle.title?.trim() ||
    pendingPick.angle.hook?.trim() ||
    platformName;
  const productLabel =
    promoteTarget.trim() ||
    (isConcept ? fuse.researchAdaptProductFallbackConcept : fuse.researchAdaptProductFallbackProduct);
  const provenance = fuse.researchAdaptProvenance
    .replace("{post}", postTitle)
    .replace("{product}", productLabel);

  return (
    <div className="mt-3 space-y-3 rounded-xl border border-emerald-200 bg-emerald-50/60 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[13px] font-bold text-slate-900">
            {fuse.researchAdaptTitle}
          </p>
          <p className="mt-0.5 text-[12px] leading-snug text-slate-700">
            {provenance}
          </p>
          <p className="mt-1 text-[12px] text-slate-600">
            {fuse.researchAdaptHint}
          </p>
        </div>
        {busy ? (
          <span className="shrink-0 text-[11px] font-medium text-violet-700">
            {fuse.researchAdaptBusy}
          </span>
        ) : null}
      </div>

      <label className="block">
        <span className="mb-1 block text-[12px] font-semibold text-slate-700">
          {fuse.copyHookLabel}
          <span className="text-violet-600"> *</span>
        </span>
        <input
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
          value={wizard.headline}
          onChange={(e) => wizard.setHeadline(e.target.value)}
          placeholder={fuse.copyHookPlaceholder}
          disabled={busy}
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-[12px] font-semibold text-slate-700">
          {fuse.copySublineLabel}
        </span>
        <input
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
          value={wizard.subline}
          onChange={(e) => wizard.setSubline(e.target.value)}
          placeholder={fuse.copySublinePlaceholder}
          disabled={busy}
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-[12px] font-semibold text-slate-700">
          {fuse.copyOfferLabel}
        </span>
        <input
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
          value={wizard.offer}
          onChange={(e) => wizard.setOffer(e.target.value)}
          placeholder={fuse.copyOfferPlaceholder}
          disabled={busy}
        />
      </label>
      {note ? (
        <p
          className={`text-xs ${
            note === fuse.researchAdaptDone
              ? "text-emerald-800"
              : "text-amber-800"
          }`}
        >
          {note}
        </p>
      ) : null}
    </div>
  );
}
