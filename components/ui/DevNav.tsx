"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

const ROUTES = [
  { href: "/onboarding", label: "1. Sign Up" },
  { href: "/onboarding/preferences", label: "2. Preferences" },
  { href: "/", label: "3. Home" },
  { href: "/network", label: "4. Network" },
  { href: "/calendar", label: "5. Calendar" },
  { href: "/settings", label: "6. Settings" },
  { href: "/test-calendar", label: "7. Test Calendar" },
  { href: "/invite/demo", label: "8. Invite" },
  { href: "/join/demo", label: "9. Join Gate" },
  { href: "/event/demo", label: "10. Event Detail" },
];

export function DevNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { theme, toggle } = useTheme();

  return (
    <div className="fixed top-4 left-4 z-[100]">
      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          />
          <div className="absolute top-12 left-0 z-50 flex flex-col gap-1 rounded-xl border border-[var(--border)] bg-[var(--bg-sheet)] p-2 shadow-[var(--shadow-elevated)] backdrop-blur-xl min-w-48">
            <div className="flex items-center justify-between px-2 py-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                Screens
              </p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded p-1 hover:bg-[var(--bg-tertiary)] transition-colors"
                aria-label="Close"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <button
              type="button"
              onClick={toggle}
              className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-[13px] font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
            >
              {theme === "dark" ? "☀ Light" : "● Dark"}
            </button>
            <div className="mx-1 h-px bg-[var(--divider)]" />
            {ROUTES.map((r) => (
              <Link
                key={r.href}
                href={r.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors",
                  pathname === r.href
                    ? "bg-[var(--accent-primary)] text-white"
                    : "text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]",
                )}
              >
                {r.label}
              </Link>
            ))}
          </div>
        </>
      )}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent-primary)] text-white shadow-[var(--glow-primary)] transition-transform hover:scale-105 cursor-pointer"
        aria-label="Screen navigator"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <rect x="2" y="2" width="5" height="5" rx="1.5" fill="currentColor" />
          <rect x="11" y="2" width="5" height="5" rx="1.5" fill="currentColor" />
          <rect x="2" y="11" width="5" height="5" rx="1.5" fill="currentColor" />
          <rect x="11" y="11" width="5" height="5" rx="1.5" fill="currentColor" />
        </svg>
      </button>
    </div>
  );
}
