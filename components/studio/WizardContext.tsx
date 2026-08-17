"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useStudioWizard, type StudioWizardValue } from "@/hooks/useStudioWizard";
import { useProjectAutosave } from "@/hooks/useProjectAutosave";
import type { PromotionMode } from "@/lib/promotion-mode";

const WizardContext = createContext<StudioWizardValue | null>(null);

type SaveStatus = "idle" | "saving" | "saved" | "error";

const AutosaveContext = createContext<{ saveStatus: SaveStatus }>({ saveStatus: "idle" });

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
  const { saveStatus } = useProjectAutosave(wizard, promotionMode, { startFresh });
  return <AutosaveContext.Provider value={{ saveStatus }}>{children}</AutosaveContext.Provider>;
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
