export type PromptSnapshotKind = "image" | "video" | "storyboard" | "campaign";

export type PromptSnapshot = {
  id: string;
  createdAt: number;
  kind: PromptSnapshotKind;
  templateId: string;
  visualStyleId: string;
  imagePrompt?: string;
  videoPrompt?: string;
  negativePrompt?: string;
  seedancePrompt?: string;
  endpoint?: string;
};

const STORAGE_KEY = "alchemy-prompt-snapshots";
const MAX_SNAPSHOTS = 20;

export function createPromptSnapshot(
  input: Omit<PromptSnapshot, "id" | "createdAt">,
): PromptSnapshot {
  return {
    ...input,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: Date.now(),
  };
}

export function savePromptSnapshot(snapshot: PromptSnapshot): void {
  if (typeof window === "undefined") return;
  try {
    const existing = loadPromptSnapshots();
    const next = [snapshot, ...existing].slice(0, MAX_SNAPSHOTS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore quota / private mode
  }
}

export function loadPromptSnapshots(): PromptSnapshot[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PromptSnapshot[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function getLatestPromptSnapshot(
  kind?: PromptSnapshotKind,
): PromptSnapshot | null {
  const all = loadPromptSnapshots();
  if (!kind) return all[0] ?? null;
  return all.find((s) => s.kind === kind) ?? null;
}
