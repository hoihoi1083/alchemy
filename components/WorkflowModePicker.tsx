"use client";

import { CreationPathPicker } from "@/components/studio/CreationPathPicker";
import type { WorkflowMode } from "@/lib/workflow-mode";

type Props = {
  value: WorkflowMode | null;
  onChange: (mode: WorkflowMode) => void;
  showPhaseStepper?: boolean;
};

/** Creation-path cards (images / video / combined) — purple SaaS layout. */
export function WorkflowModePicker({
  value,
  onChange,
  showPhaseStepper = false,
}: Props) {
  return (
    <CreationPathPicker
      value={value}
      onChange={onChange}
      showPhaseStepper={showPhaseStepper}
    />
  );
}
