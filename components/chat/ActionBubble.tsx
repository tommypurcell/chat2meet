import { cn } from "@/lib/utils";

type ActionBubbleProps = {
  text: string;
  onClick?: () => void;
  className?: string;
};

export function ActionBubble({ text, onClick, className }: ActionBubbleProps) {
  return (
    <div className="flex justify-end mb-1">
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "flex items-center gap-1.5 rounded-2xl border border-[var(--bubble-action-border)] bg-[var(--bubble-action)] px-4 py-2.5 text-[15px] font-medium text-[var(--text-link)] transition-opacity hover:opacity-80 cursor-pointer",
          className,
        )}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
          <path d="M5 8H11M8 5V11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        {text}
      </button>
    </div>
  );
}
