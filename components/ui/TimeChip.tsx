import { cn } from "@/lib/utils";

type TimeChipProps = {
  time: string;
  date?: string;
  selected?: boolean;
  onClick?: () => void;
  className?: string;
};

export function TimeChip({ time, date, selected, onClick, className }: TimeChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "cursor-pointer rounded-xl px-4 py-2 text-[15px] font-medium transition-all duration-150",
        selected
          ? "bg-[var(--accent-primary)] text-[var(--bubble-sender-text)] shadow-[var(--glow-soft)]"
          : "border border-[var(--bubble-action-border)] bg-[var(--bubble-action)] text-[var(--text-link)]",
        className,
      )}
    >
      {date && <span className="mr-1 text-[13px] opacity-70">{date}</span>}
      {time}
    </button>
  );
}
