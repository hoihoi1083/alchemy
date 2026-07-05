import type { CoachTaskKind } from "@/lib/studio-assistant-coach-profile";

export const COACH_ACK_STORAGE_KEY = "alchemy-studio-coach-ack";

export function readCoachAck(): CoachTaskKind[] {
  if (typeof sessionStorage === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(COACH_ACK_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as CoachTaskKind[]) : [];
  } catch {
    return [];
  }
}

export function writeCoachAck(tasks: CoachTaskKind[]): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(COACH_ACK_STORAGE_KEY, JSON.stringify([...new Set(tasks)]));
}

export function ackCoachTask(task: CoachTaskKind): void {
  const next = readCoachAck();
  if (!next.includes(task)) next.push(task);
  writeCoachAck(next);
}

export function clearCoachAck(): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.removeItem(COACH_ACK_STORAGE_KEY);
}

export function isCoachTaskAcked(
  task: CoachTaskKind,
  ack?: CoachTaskKind[],
): boolean {
  return (ack ?? []).includes(task);
}
