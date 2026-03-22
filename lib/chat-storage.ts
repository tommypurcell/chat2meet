import type { UIMessage } from "ai";

const CHAT_MESSAGES_KEY = "chat2meet-agent-chat-messages";

export function loadChatMessages(): UIMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CHAT_MESSAGES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed as UIMessage[];
  } catch {
    return [];
  }
}

export function saveChatMessages(messages: UIMessage[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CHAT_MESSAGES_KEY, JSON.stringify(messages));
  } catch (e) {
    console.warn("Could not save chat to localStorage", e);
  }
}

/** Remove persisted chat so the next session starts empty */
export function clearChatMessages(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(CHAT_MESSAGES_KEY);
  } catch (e) {
    console.warn("Could not clear chat in localStorage", e);
  }
}
