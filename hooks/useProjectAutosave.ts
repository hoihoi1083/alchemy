"use client";

import { useAuth } from "@clerk/nextjs";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { StudioWizardValue } from "@/hooks/useStudioWizard";
import type { PromotionMode } from "@/lib/promotion-mode";
import {
  EMPTY_PROJECT_SNAPSHOT,
  projectDisplayName,
  type ProjectSnapshot,
} from "@/lib/project-snapshot";
import {
  clearLibraryBrowseSession,
  isLibraryBrowseQuery,
  markBrowseSession,
} from "@/lib/project-browse";
import {
  ACTIVE_PROJECT_STORAGE_KEY,
  buildProjectResumeHint,
  clearProjectResumeHint,
  shouldBlockEmptyOverwrite,
  snapshotFromWizard,
  writeProjectResumeHint,
} from "@/lib/wizard-project-snapshot";

const DEBOUNCE_MS = 2500;
const HYDRATE_TIMEOUT_MS = 15000;

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
  signal?: AbortSignal,
): Promise<{ snapshot: ProjectSnapshot; name?: string } | null> {
  const res = await fetch(`/api/projects/${projectId}`, {
    method: "GET",
    credentials: "include",
    signal,
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("load failed");
  const data = (await res.json()) as { snapshot?: ProjectSnapshot; name?: string };
  if (!data.snapshot || data.snapshot.version !== 1) {
    throw new Error("invalid snapshot");
  }
  return { snapshot: data.snapshot, name: data.name };
}

export function useProjectAutosave(
  wizard: StudioWizardValue,
  promotionMode: PromotionMode,
  opts?: { startFresh?: boolean },
) {
  const startFresh = opts?.startFresh ?? false;
  const searchParams = useSearchParams();
  const urlProjectId = searchParams.get("project")?.trim() || null;
  const urlFromLibrary = isLibraryBrowseQuery(searchParams.get("from"));
  const { isSignedIn, isLoaded } = useAuth();
  const [projectId, setProjectId] = useState<string | null>(null);
  const [projectName, setProjectName] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [hydrateStatus, setHydrateStatus] = useState<"pending" | "ready" | "error">("pending");
  const [hydrateError, setHydrateError] = useState<string | null>(null);
  const initRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const snapshotRef = useRef("");
  const applyRef = useRef(wizard.applyProjectSnapshot);
  applyRef.current = wizard.applyProjectSnapshot;
  const nameLockRef = useRef<string | null>(null);
  const patchAbortRef = useRef<AbortController | null>(null);
  const projectIdRef = useRef<string | null>(null);
  projectIdRef.current = projectId;

  const replaceSnapshotBaseline = useCallback((snapshot: ProjectSnapshot) => {
    snapshotRef.current = JSON.stringify(snapshot);
  }, []);

  const lockProjectName = useCallback((name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    nameLockRef.current = trimmed;
    setProjectName(trimmed);
  }, []);

  const setProjectIdAndClearBrowse = useCallback((id: string | null) => {
    patchAbortRef.current?.abort();
    patchAbortRef.current = null;
    clearLibraryBrowseSession();
    setProjectId(id);
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      setHydrateStatus("ready");
      return;
    }
    if (initRef.current) return;
    initRef.current = true;

    void (async () => {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), HYDRATE_TIMEOUT_MS);
      try {
        if (startFresh) {
          clearProjectResumeHint();
          window.localStorage.removeItem(ACTIVE_PROJECT_STORAGE_KEY);
          clearLibraryBrowseSession();
          nameLockRef.current = null;
          const id = await createProjectId(promotionMode);
          if (id) {
            window.localStorage.setItem(ACTIVE_PROJECT_STORAGE_KEY, id);
            setProjectId(id);
            snapshotRef.current = JSON.stringify(EMPTY_PROJECT_SNAPSHOT(promotionMode));
          }
          setHydrateStatus("ready");
          return;
        }

        const preferred =
          urlProjectId || window.localStorage.getItem(ACTIVE_PROJECT_STORAGE_KEY);

        if (preferred) {
          try {
            const loaded = await fetchProjectSnapshot(preferred, controller.signal);
            if (!loaded) {
              window.localStorage.removeItem(ACTIVE_PROJECT_STORAGE_KEY);
            } else {
              await applyRef.current(loaded.snapshot);
              writeProjectResumeHint(buildProjectResumeHint(loaded.snapshot));
              snapshotRef.current = JSON.stringify(loaded.snapshot);
              window.localStorage.setItem(ACTIVE_PROJECT_STORAGE_KEY, preferred);
              setProjectId(preferred);
              setProjectName(
                loaded.name?.trim() ||
                  projectDisplayName(loaded.snapshot.inputs) ||
                  null,
              );
              if (urlFromLibrary) {
                markBrowseSession(preferred);
              }
              nameLockRef.current = null;
              setHydrateStatus("ready");
              return;
            }
          } catch (err) {
            // Never keep a writable id after failed hydrate — blocks remote wipe.
            snapshotRef.current = "__remote_unknown__";
            setProjectId(null);
            setHydrateError(
              err instanceof Error && err.name === "AbortError"
                ? "timeout"
                : "load_failed",
            );
            setHydrateStatus("error");
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
      } finally {
        window.clearTimeout(timeout);
      }
    })();
  }, [isLoaded, isSignedIn, promotionMode, startFresh, urlFromLibrary, urlProjectId]);

  useEffect(() => {
    if (!isSignedIn || !projectId || hydrateStatus !== "ready") return;
    if (snapshotRef.current === "__remote_unknown__") return;

    const snapshot = snapshotFromWizard(wizard, promotionMode);
    const json = JSON.stringify(snapshot);
    if (json === snapshotRef.current) return;
    if (shouldBlockEmptyOverwrite(snapshot, snapshotRef.current)) return;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      void (async () => {
        const saveForId = projectId;
        patchAbortRef.current?.abort();
        const controller = new AbortController();
        patchAbortRef.current = controller;
        setSaveStatus("saving");
        try {
          let activeId = saveForId;
          const body = {
            snapshot,
            name:
              nameLockRef.current ||
              projectDisplayName(snapshot.inputs),
          };
          let res = await fetch(`/api/projects/${activeId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(body),
            signal: controller.signal,
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
              signal: controller.signal,
            });
          }

          if (controller.signal.aborted) return;
          // Project switched mid-save (e.g. fork) — drop stale write.
          if (projectIdRef.current !== saveForId) return;

          if (!res.ok) throw new Error("save failed");
          snapshotRef.current = json;
          if (!nameLockRef.current) setProjectName(body.name);
          setSaveStatus("saved");
        } catch (err) {
          if (err instanceof Error && err.name === "AbortError") return;
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

  return {
    projectId,
    projectName,
    saveStatus,
    hydrateStatus,
    hydrateError,
    setProjectId: setProjectIdAndClearBrowse,
    setProjectName,
    lockProjectName,
    replaceSnapshotBaseline,
  };
}
