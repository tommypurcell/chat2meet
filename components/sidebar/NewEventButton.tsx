import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

type NewEventButtonProps = {
  className?: string;
  onClick?: () => void;
};

export function NewEventButton({ className, onClick }: NewEventButtonProps) {
  return (
    <Button
      type="button"
      variant="secondary"
      size="md"
      onClick={onClick}
      className={cn("w-full justify-start", className)}
    >
      <PlusIcon className="h-4 w-4" />
      New event
    </Button>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 5v14M5 12h14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
