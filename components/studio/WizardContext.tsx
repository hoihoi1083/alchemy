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
  children,
}: {
  promotionMode: PromotionMode;
  children: ReactNode;
}) {
  const wizard = useWizard();
  const { saveStatus } = useProjectAutosave(wizard, promotionMode);
  return <AutosaveContext.Provider value={{ saveStatus }}>{children}</AutosaveContext.Provider>;
}

export function WizardProvider({
  children,
  promotionMode,
}: {
  children: ReactNode;
  promotionMode: PromotionMode;
}) {
  const value = useStudioWizard(promotionMode);
  return (
    <WizardContext.Provider value={value}>
      <WizardAutosaveBridge promotionMode={promotionMode}>{children}</WizardAutosaveBridge>
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
