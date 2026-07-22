"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useRef, useState } from "react";
import type { StudioWizardValue } from "@/hooks/useStudioWizard";
import type { PromotionMode } from "@/lib/promotion-mode";
import { snapshotFromWizard } from "@/lib/wizard-project-snapshot";

const STORAGE_KEY = "alchemy-active-project-id";
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

export function useProjectAutosave(wizard: StudioWizardValue, promotionMode: PromotionMode) {
  const { isSignedIn } = useAuth();
  const [projectId, setProjectId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const initRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const snapshotRef = useRef("");

  useEffect(() => {
    if (!isSignedIn || initRef.current) return;
    initRef.current = true;

    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setProjectId(stored);
      return;
    }

    void (async () => {
      try {
        const id = await createProjectId(promotionMode);
        if (!id) return;
        window.localStorage.setItem(STORAGE_KEY, id);
        setProjectId(id);
      } catch {
        /* Mongo optional in dev */
      }
    })();
  }, [isSignedIn, promotionMode]);

  useEffect(() => {
    if (!isSignedIn || !projectId) return;

    const snapshot = snapshotFromWizard(wizard, promotionMode);
    const json = JSON.stringify(snapshot);
    if (json === snapshotRef.current) return;

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
            window.localStorage.removeItem(STORAGE_KEY);
            const freshId = await createProjectId(promotionMode);
            if (!freshId) throw new Error("save failed");
            window.localStorage.setItem(STORAGE_KEY, freshId);
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

  return { projectId, saveStatus };
}
