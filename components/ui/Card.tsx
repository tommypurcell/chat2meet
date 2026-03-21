import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-primary)] shadow-[var(--shadow-card)]",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex flex-col gap-1 p-4 pb-2", className)} {...props} />
  );
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn("text-[15px] font-semibold leading-tight tracking-[-0.24px]", className)}
      {...props}
    />
  );
}

export function CardDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("text-[13px] text-[var(--text-tertiary)] leading-[1.38]", className)} {...props} />
  );
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-4 pb-4 pt-0", className)} {...props} />;
}

export function CardFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex items-center gap-2 border-t border-[var(--divider)] p-4", className)}
      {...props}
    />
  );
}
