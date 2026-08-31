"use client";

import { createContext, useContext, useEffect, useRef, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useStudioWizard, type StudioWizardValue } from "@/hooks/useStudioWizard";
import { useProjectAutosave } from "@/hooks/useProjectAutosave";
import type { PromotionMode } from "@/lib/promotion-mode";
import {
  buildForkSnapshot,
  createForkedProject,
  FORK_SUCCESS_PARAM,
  LIBRARY_FROM_PARAM,
  markLibraryHighlightProjectId,
  registerProjectForkHandler,
} from "@/lib/project-browse";
import { projectDisplayName } from "@/lib/project-snapshot";
import { ACTIVE_PROJECT_STORAGE_KEY } from "@/lib/wizard-project-snapshot";

const WizardContext = createContext<StudioWizardValue | null>(null);

type SaveStatus = "idle" | "saving" | "saved" | "error";
type HydrateStatus = "pending" | "ready" | "error";

const AutosaveContext = createContext<{
  saveStatus: SaveStatus;
  hydrateStatus: HydrateStatus;
  hydrateError: string | null;
  projectId: string | null;
  projectName: string | null;
}>({
  saveStatus: "idle",
  hydrateStatus: "pending",
  hydrateError: null,
  projectId: null,
  projectName: null,
});

function WizardAutosaveBridge({
  promotionMode,
  startFresh,
  children,
}: {
  promotionMode: PromotionMode;
  startFresh?: boolean;
  children: ReactNode;
}) {
  const wizard = useWizard();
  const wizardRef = useRef(wizard);
  wizardRef.current = wizard;
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    saveStatus,
    hydrateStatus,
    hydrateError,
    projectId,
    projectName,
    setProjectId,
    lockProjectName,
    replaceSnapshotBaseline,
  } = useProjectAutosave(wizard, promotionMode, { startFresh });

  useEffect(() => {
    registerProjectForkHandler(async () => {
      const snap = buildForkSnapshot(wizardRef.current, promotionMode);
      const stamp = new Date().toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
      const base = projectDisplayName(snap.inputs);
      const id = await createForkedProject({
        promotionMode,
        snapshot: snap,
        baseName: base,
      });
      if (!id) throw new Error("fork_failed");
      markLibraryHighlightProjectId(id);
      replaceSnapshotBaseline(snap);
      const stamped = `${base} · ${stamp}`;
      lockProjectName(stamped);
      setProjectId(id);
      try {
        window.localStorage.setItem(ACTIVE_PROJECT_STORAGE_KEY, id);
      } catch {
        /* ignore */
      }
      const params = new URLSearchParams(searchParams.toString());
      params.set("project", id);
      params.delete(LIBRARY_FROM_PARAM);
      params.set(FORK_SUCCESS_PARAM, "1");
      if (!params.get("mode")) params.set("mode", promotionMode);
      router.replace(`/studio?${params.toString()}`, { scroll: false });
    });
    return () => registerProjectForkHandler(null);
  }, [
    promotionMode,
    router,
    searchParams,
    setProjectId,
    lockProjectName,
    replaceSnapshotBaseline,
  ]);

  return (
    <AutosaveContext.Provider
      value={{ saveStatus, hydrateStatus, hydrateError, projectId, projectName }}
    >
      {children}
    </AutosaveContext.Provider>
  );
}

export function WizardProvider({
  children,
  promotionMode,
  startFresh,
}: {
  children: ReactNode;
  promotionMode: PromotionMode;
  startFresh?: boolean;
}) {
  const value = useStudioWizard(promotionMode);
  return (
    <WizardContext.Provider value={value}>
      <WizardAutosaveBridge promotionMode={promotionMode} startFresh={startFresh}>
        {children}
      </WizardAutosaveBridge>
    </WizardContext.Provider>
  );
}

export function useWizard(): StudioWizardValue {
  const ctx = useContext(WizardContext);
  if (!ctx) {
    throw new Error("useWizard must be used within WizardProvider");
  }
  return ctx;
}

export function useOptionalWizard(): StudioWizardValue | null {
  return useContext(WizardContext);
}

export function useSaveStatus(): SaveStatus {
  return useContext(AutosaveContext).saveStatus;
}

export function useHydrateStatus(): HydrateStatus {
  return useContext(AutosaveContext).hydrateStatus;
}

export function useHydrateError(): string | null {
  return useContext(AutosaveContext).hydrateError;
}

export function useActiveProjectMeta(): {
  projectId: string | null;
  projectName: string | null;
} {
  const ctx = useContext(AutosaveContext);
  return { projectId: ctx.projectId, projectName: ctx.projectName };
}
