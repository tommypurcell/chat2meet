import type { ReactNode } from "react";
import type { MessageRole } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/Avatar";

type ChatMessageProps = {
  role: MessageRole;
  children: ReactNode;
  className?: string;
};

export function ChatMessage({ role, children, className }: ChatMessageProps) {
  return (
    <div
      className={cn(
        "flex gap-2 px-4 py-1",
        role === "user" ? "justify-end" : "justify-start",
        className,
      )}
    >
      {role === "assistant" && (
        <Avatar name="W" size={28} className="mt-1" />
      )}
      <div
        className={cn(
          "max-w-[280px] rounded-2xl px-3.5 py-2 text-base leading-[1.35] tracking-[-0.32px]",
          role === "user"
            ? "rounded-br-[4px] bg-[var(--bubble-sender)] text-[var(--bubble-sender-text)] shadow-[var(--glow-primary)]"
            : "rounded-bl-[4px] bg-[var(--bubble-receiver)] text-[var(--bubble-receiver-text)]",
        )}
      >
        {children}
      </div>
    </div>
  );
}
