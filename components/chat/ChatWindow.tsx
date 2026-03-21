/**
 * ChatWindow — legacy component retained for backwards compatibility.
 * The main app screen now lives in /app/page.tsx which renders the
 * calendar + chat bottom-sheet layout directly.
 */

import { SAMPLE_CHAT_MESSAGES } from "@/lib/mock-data";
import { ChatMessage } from "@/components/chat/ChatMessage";

export function ChatWindow() {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-0 py-2">
      {SAMPLE_CHAT_MESSAGES.map((msg) => (
        <ChatMessage key={msg.id} role={msg.role}>
          {msg.content}
        </ChatMessage>
      ))}
    </div>
  );
}
