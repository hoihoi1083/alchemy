import type { StudioAssistantMessage } from "@/lib/studio-assistant-types";

export const ASSISTANT_CHAT_STORAGE_KEY = "alchemy-studio-assistant-chat";

export type StoredAssistantChat = {
  messages: StudioAssistantMessage[];
  pendingUrl?: string;
  open: boolean;
  updatedAt: string;
};

export function readAssistantChat(): StoredAssistantChat | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(ASSISTANT_CHAT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredAssistantChat;
    if (!Array.isArray(parsed.messages)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeAssistantChat(data: StoredAssistantChat): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(ASSISTANT_CHAT_STORAGE_KEY, JSON.stringify(data));
}

export function clearAssistantChat(): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.removeItem(ASSISTANT_CHAT_STORAGE_KEY);
}

/** After navigating to studio, reopen the panel with history intact. */
export const ASSISTANT_REOPEN_FLAG = "alchemy-studio-assistant-reopen";

export function markAssistantReopenAfterNavigate(): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(ASSISTANT_REOPEN_FLAG, "1");
}

export function consumeAssistantReopenFlag(): boolean {
  if (typeof sessionStorage === "undefined") return false;
  const v = sessionStorage.getItem(ASSISTANT_REOPEN_FLAG);
  if (v) sessionStorage.removeItem(ASSISTANT_REOPEN_FLAG);
  return v === "1";
}
