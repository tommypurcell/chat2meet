import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg" | "icon";
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    { className, variant = "primary", size = "md", type = "button", ...props },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          "inline-flex items-center justify-center gap-2 font-semibold tracking-[-0.2px] transition-opacity duration-150 cursor-pointer",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--border-focused)]",
          "disabled:pointer-events-none disabled:opacity-40",
          size === "sm" && "rounded-lg px-3.5 py-1.5 text-sm",
          size === "md" && "rounded-xl px-5 py-2.5 text-base",
          size === "lg" && "rounded-[14px] px-7 py-3.5 text-[17px]",
          size === "icon" && "rounded-xl p-2.5",
          variant === "primary" &&
            "bg-[var(--accent-primary)] text-white shadow-[var(--glow-soft)] hover:opacity-90",
          variant === "secondary" &&
            "border-[1.5px] border-[var(--accent-primary)] bg-transparent text-[var(--accent-primary)] hover:opacity-80",
          variant === "ghost" &&
            "bg-transparent text-[var(--accent-primary)] hover:opacity-70",
          variant === "danger" &&
            "bg-[var(--accent-danger)] text-white hover:opacity-90",
          className,
        )}
        {...props}
      />
    );
  },
);
