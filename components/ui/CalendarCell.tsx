import { cn } from "@/lib/utils";

type CalendarCellProps = {
  day: number;
  active?: boolean;
  today?: boolean;
  hasEvent?: boolean;
  onClick?: () => void;
  className?: string;
};

export function CalendarCell({
  day,
  active,
  today,
  hasEvent,
  onClick,
  className,
}: CalendarCellProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative flex h-11 w-10 cursor-pointer flex-col items-center justify-center rounded-[10px] text-base transition-all duration-150",
        active && "bg-[var(--bg-calendar-cell-active)] text-[var(--bubble-sender-text)] font-semibold shadow-[var(--glow-soft)]",
        today && !active && "bg-[var(--bg-calendar-today)] font-semibold",
        !active && !today && "text-[var(--text-primary)] hover:bg-[var(--bg-calendar-cell-hover)]",
        className,
      )}
    >
      {day}
      {hasEvent && (
        <div
          className={cn(
            "mt-0.5 h-[5px] w-[5px] rounded-full",
            active ? "bg-white" : "bg-[var(--accent-primary)]",
          )}
        />
      )}
    </button>
  );
}
