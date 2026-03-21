import type { ReactNode } from "react";
import type { MessageRole } from "@/lib/types";
import { cn } from "@/lib/utils";

type ChatMessageProps = {
  role: MessageRole;
  children: ReactNode;
  className?: string;
};

export function ChatMessage({ role, children, className }: ChatMessageProps) {
  return (
    <div
      className={cn(
        "flex w-full gap-3 px-4 py-3 text-[15px] leading-relaxed",
        role === "user" ? "justify-end" : "justify-start",
        className,
      )}
    >
      <div
        className={cn(
          "max-w-[min(720px,100%)] rounded-2xl px-4 py-2.5",
          role === "user"
            ? "bg-[var(--chat-surface)] text-[var(--chat-fg)]"
            : "bg-transparent text-[var(--chat-fg)]",
        )}
      >
        {children}
      </div>
    </div>
  );
}
