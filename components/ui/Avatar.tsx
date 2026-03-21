import { cn } from "@/lib/utils";

type AvatarProps = {
  name: string;
  size?: number;
  className?: string;
};

export function Avatar({ name, size = 36, className }: AvatarProps) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-semibold text-white",
        className,
      )}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.4,
        background: "linear-gradient(135deg, var(--accent-primary), #00B86E)",
      }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}
