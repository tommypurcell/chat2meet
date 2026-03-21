"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { cn } from "@/lib/utils";

type UserMenuProps = {
  /** Tighter layout for sidebars */
  variant?: "header" | "sidebar";
};

export function UserMenu({ variant = "header" }: UserMenuProps) {
  const { user, loading, refresh } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  async function signOut() {
    setOpen(false);
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    await refresh();
    router.push("/");
    router.refresh();
  }

  if (loading) {
    return (
      <div
        className={cn(
          "h-8 w-8 shrink-0 animate-pulse rounded-full bg-[var(--bg-tertiary)]",
          variant === "sidebar" && "h-9 w-9",
        )}
        aria-hidden
      />
    );
  }

  if (!user) {
    return (
      <Link
        href="/login"
        className="text-sm font-medium text-[var(--accent-primary)] hover:underline"
      >
        Sign in
      </Link>
    );
  }

  const label = user.displayName || user.email || "Account";

  return (
    <div
      className={cn("relative flex items-center gap-2", variant === "sidebar" && "w-full")}
      ref={rootRef}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex items-center gap-2 rounded-xl py-1 pr-1 text-left transition-colors hover:bg-[var(--bg-tertiary)] cursor-pointer",
          variant === "sidebar" && "w-full px-2",
        )}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <UserAvatar
          name={label}
          photoURL={user.photoURL}
          size={variant === "sidebar" ? 32 : 28}
        />
        {variant === "header" && (
          <span className="hidden max-w-[120px] truncate text-sm font-medium text-[var(--text-primary)] sm:inline">
            {label}
          </span>
        )}
        {variant === "sidebar" && (
          <div className="min-w-0 flex-1 text-left">
            <p className="truncate text-sm font-medium text-[var(--text-primary)]">{label}</p>
            <p className="truncate text-[11px] text-[var(--text-tertiary)]">Account</p>
          </div>
        )}
        <svg
          width="14"
          height="14"
          viewBox="0 0 20 20"
          fill="none"
          className={cn(
            "shrink-0 text-[var(--text-tertiary)]",
            variant === "sidebar" && "ml-auto",
          )}
          aria-hidden
        >
          <path
            d="M5 8l5 5 5-5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className={cn(
            "absolute z-50 mt-1 min-w-[200px] rounded-xl border border-[var(--border)] bg-[var(--bg-sheet)] py-1 shadow-[var(--shadow-elevated)]",
            variant === "sidebar" ? "left-0 top-full" : "right-0 top-full",
          )}
        >
          <Link
            href="/calendar"
            role="menuitem"
            className="block px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]"
            onClick={() => setOpen(false)}
          >
            Calendar
          </Link>
          <Link
            href="/profile"
            role="menuitem"
            className="block px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]"
            onClick={() => setOpen(false)}
          >
            Profile
          </Link>
          <Link
            href="/settings"
            role="menuitem"
            className="block px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]"
            onClick={() => setOpen(false)}
          >
            Settings
          </Link>
          <button
            type="button"
            role="menuitem"
            className="w-full px-3 py-2 text-left text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]"
            onClick={signOut}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
