"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useRef, useState } from "react";
import type { StudioWizardValue } from "@/hooks/useStudioWizard";
import type { PromotionMode } from "@/lib/promotion-mode";
import { EMPTY_PROJECT_SNAPSHOT, type ProjectSnapshot } from "@/lib/project-snapshot";
import {
  ACTIVE_PROJECT_STORAGE_KEY,
  buildProjectResumeHint,
  clearProjectResumeHint,
  shouldBlockEmptyOverwrite,
  snapshotFromWizard,
  writeProjectResumeHint,
} from "@/lib/wizard-project-snapshot";

const DEBOUNCE_MS = 2500;

async function createProjectId(promotionMode: PromotionMode): Promise<string | null> {
  const res = await fetch("/api/projects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ promotionMode }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { id?: string };
  return data.id?.trim() || null;
}

async function fetchProjectSnapshot(
  projectId: string,
): Promise<{ snapshot: ProjectSnapshot } | null> {
  const res = await fetch(`/api/projects/${projectId}`, {
    method: "GET",
    credentials: "include",
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("load failed");
  const data = (await res.json()) as { snapshot?: ProjectSnapshot };
  if (!data.snapshot || data.snapshot.version !== 1) {
    throw new Error("invalid snapshot");
  }
  return { snapshot: data.snapshot };
}

export function useProjectAutosave(
  wizard: StudioWizardValue,
  promotionMode: PromotionMode,
  opts?: { startFresh?: boolean },
) {
  const startFresh = opts?.startFresh ?? false;
  const { isSignedIn } = useAuth();
  const [projectId, setProjectId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [hydrateStatus, setHydrateStatus] = useState<"pending" | "ready" | "error">("pending");
  const initRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const snapshotRef = useRef("");
  const applyRef = useRef(wizard.applyProjectSnapshot);
  applyRef.current = wizard.applyProjectSnapshot;

  useEffect(() => {
    if (!isSignedIn || initRef.current) return;
    initRef.current = true;

    void (async () => {
      try {
        if (startFresh) {
          clearProjectResumeHint();
          window.localStorage.removeItem(ACTIVE_PROJECT_STORAGE_KEY);
          const id = await createProjectId(promotionMode);
          if (id) {
            window.localStorage.setItem(ACTIVE_PROJECT_STORAGE_KEY, id);
            setProjectId(id);
            snapshotRef.current = JSON.stringify(EMPTY_PROJECT_SNAPSHOT(promotionMode));
          }
          setHydrateStatus("ready");
          return;
        }

        const stored = window.localStorage.getItem(ACTIVE_PROJECT_STORAGE_KEY);
        if (stored) {
          try {
            const loaded = await fetchProjectSnapshot(stored);
            if (!loaded) {
              window.localStorage.removeItem(ACTIVE_PROJECT_STORAGE_KEY);
            } else {
              await applyRef.current(loaded.snapshot);
              writeProjectResumeHint(buildProjectResumeHint(loaded.snapshot));
              snapshotRef.current = JSON.stringify(loaded.snapshot);
              window.localStorage.setItem(ACTIVE_PROJECT_STORAGE_KEY, stored);
              setProjectId(stored);
              setHydrateStatus("ready");
              return;
            }
          } catch {
            // Keep the id but protect remote until we have real local content.
            snapshotRef.current = "__remote_unknown__";
            setProjectId(stored);
            setHydrateStatus("ready");
            return;
          }
        }

        const existing = window.localStorage.getItem(ACTIVE_PROJECT_STORAGE_KEY);
        if (existing) {
          setProjectId(existing);
          setHydrateStatus("ready");
          return;
        }

        const id = await createProjectId(promotionMode);
        if (!id) {
          setHydrateStatus("ready");
          return;
        }
        window.localStorage.setItem(ACTIVE_PROJECT_STORAGE_KEY, id);
        setProjectId(id);
        setHydrateStatus("ready");
      } catch {
        setHydrateStatus("ready");
      }
    })();
  }, [isSignedIn, promotionMode, startFresh]);

  useEffect(() => {
    if (!isSignedIn || !projectId || hydrateStatus !== "ready") return;

    const snapshot = snapshotFromWizard(wizard, promotionMode);
    const json = JSON.stringify(snapshot);
    if (json === snapshotRef.current) return;
    if (shouldBlockEmptyOverwrite(snapshot, snapshotRef.current)) return;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      void (async () => {
        setSaveStatus("saving");
        try {
          let activeId = projectId;
          const body = {
            snapshot,
            name:
              snapshot.inputs.product.trim() ||
              snapshot.inputs.headline.trim() ||
              "Untitled project",
          };
          let res = await fetch(`/api/projects/${activeId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(body),
          });

          // Stale localStorage id (deleted project / other account) → recreate once.
          if (res.status === 404) {
            window.localStorage.removeItem(ACTIVE_PROJECT_STORAGE_KEY);
            const freshId = await createProjectId(promotionMode);
            if (!freshId) throw new Error("save failed");
            window.localStorage.setItem(ACTIVE_PROJECT_STORAGE_KEY, freshId);
            setProjectId(freshId);
            activeId = freshId;
            res = await fetch(`/api/projects/${activeId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify(body),
            });
          }

          if (!res.ok) throw new Error("save failed");
          snapshotRef.current = json;
          setSaveStatus("saved");
        } catch {
          setSaveStatus("error");
        }
      })();
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [
    isSignedIn,
    projectId,
    hydrateStatus,
    promotionMode,
    wizard.product,
    wizard.headline,
    wizard.subline,
    wizard.business,
    wizard.offer,
    wizard.conceptIdea,
    wizard.promptExtra,
    wizard.workflowMode,
    wizard.visualStyleId,
    wizard.stepKey,
    wizard.imageUrl,
    wizard.videoUrl,
    wizard.imagePrompt,
    wizard.videoPrompt,
    wizard.campaignPlan,
    wizard.storyboardPlan,
    wizard.adPackPlan,
    wizard.captionLines,
    wizard.campaignSlides,
    wizard.storyboardScenes,
  ]);

  return { projectId, saveStatus, hydrateStatus };
}
