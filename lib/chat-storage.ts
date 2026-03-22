import type { UIMessage } from "ai";

const CHAT_PREFIX = "chat2meet-msgs-";
// Expire after 1 hour of inactivity: 60 * 60 * 1000
const EXPIRE_MS = 3600000;

function getKey(groupId: string | null = null) {
  return `${CHAT_PREFIX}${groupId || "default"}`;
}

export function loadChatMessages(groupId: string | null = null): UIMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(getKey(groupId));
    if (!raw) return [];
    
    const parsed = JSON.parse(raw) as { timestamp: number; messages: UIMessage[] };
    if (!parsed || !Array.isArray(parsed.messages)) {
      // Migrate old format safely
      if (Array.isArray(parsed)) return parsed as UIMessage[];
      return [];
    }
    
    // Check expiration - clear if inactive for a "while"
    if (Date.now() - parsed.timestamp > EXPIRE_MS) {
      localStorage.removeItem(getKey(groupId));
      return [];
    }
    
    return parsed.messages;
  } catch {
    return [];
  }
}

export function saveChatMessages(groupId: string | null, messages: UIMessage[]): void {
  if (typeof window === "undefined") return;
  try {
    const data = {
      timestamp: Date.now(),
      messages,
    };
    localStorage.setItem(getKey(groupId), JSON.stringify(data));
  } catch (e) {
    console.warn("Could not save chat to localStorage", e);
  }
}

export function clearChatMessages(groupId: string | null = null): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(getKey(groupId));
  } catch (e) {
    console.warn("Could not clear chat in localStorage", e);
  }
}
