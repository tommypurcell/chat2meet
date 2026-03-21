import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type ChatBubbleProps = {
  children: ReactNode;
  sender?: boolean;
  tail?: boolean;
  className?: string;
};

export function ChatBubble({ children, sender, tail, className }: ChatBubbleProps) {
  return (
    <div className={cn("flex", sender ? "justify-end" : "justify-start", "mb-1")}>
      <div
        className={cn(
          "max-w-[280px] px-3.5 py-2 text-base leading-[1.35] tracking-[-0.32px]",
          sender
            ? "rounded-2xl bg-[var(--bubble-sender)] text-[var(--bubble-sender-text)] shadow-[var(--glow-primary)]"
            : "rounded-2xl bg-[var(--bubble-receiver)] text-[var(--bubble-receiver-text)]",
          sender && tail && "rounded-br-[4px]",
          !sender && tail && "rounded-bl-[4px]",
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}
