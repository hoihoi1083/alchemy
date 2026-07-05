"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useStudioWizard, type StudioWizardValue } from "@/hooks/useStudioWizard";
import { useProjectAutosave } from "@/hooks/useProjectAutosave";
import type { PromotionMode } from "@/lib/promotion-mode";

const WizardContext = createContext<StudioWizardValue | null>(null);

function WizardAutosave({ promotionMode }: { promotionMode: PromotionMode }) {
  const wizard = useWizard();
  useProjectAutosave(wizard, promotionMode);
  return null;
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
      <WizardAutosave promotionMode={promotionMode} />
      {children}
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
