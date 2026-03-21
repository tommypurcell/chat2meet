import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "outline" | "ghost" | "accent";
  size?: "sm" | "md" | "lg" | "icon";
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    { className, variant = "default", size = "md", type = "button", ...props },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          "inline-flex items-center justify-center gap-2 font-medium transition",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--chat-accent)]",
          "disabled:pointer-events-none disabled:opacity-40",
          size === "sm" && "rounded-lg px-2.5 py-1.5 text-xs",
          size === "md" && "rounded-lg px-3 py-2 text-sm",
          size === "lg" && "rounded-xl px-4 py-2.5 text-sm",
          size === "icon" && "rounded-lg p-2",
          variant === "default" &&
            "bg-[var(--chat-surface)] text-[var(--chat-fg)] hover:bg-[var(--chat-surface-hover)]",
          variant === "outline" &&
            "border border-[var(--chat-border)] bg-transparent text-[var(--chat-fg)] hover:bg-[var(--chat-surface-hover)]",
          variant === "ghost" &&
            "bg-transparent text-[var(--chat-muted)] hover:bg-[var(--chat-surface-hover)] hover:text-[var(--chat-fg)]",
          variant === "accent" &&
            "bg-[var(--chat-accent)] text-white hover:opacity-90",
          className,
        )}
        {...props}
      />
    );
  },
);
