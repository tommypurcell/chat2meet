"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { AvailabilityGrid } from "@/components/calendar/AvailabilityGrid";
import { useTheme } from "@/lib/theme";

export default function AvailabilityPage() {
  const { theme, toggle } = useTheme();

  return (
    <div className="flex h-[100dvh] w-full flex-col bg-[var(--bg-primary)] text-[var(--text-primary)]">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-[var(--divider)] px-6 py-4">
        <div className="flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="icon" aria-label="Back">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Button>
          </Link>
          <h1 className="text-lg font-semibold">Select Availability</h1>
        </div>
        <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme">
          {theme === "dark" ? (
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="10" r="4" stroke="currentColor" strokeWidth="1.5" />
              <path d="M10 2V4M10 16V18M2 10H4M16 10H18M4.93 4.93L6.34 6.34M13.66 13.66L15.07 15.07M15.07 4.93L13.66 6.34M6.34 13.66L4.93 15.07" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
              <path d="M17 11.35A7 7 0 118.65 3 5.5 5.5 0 0017 11.35z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden p-4">
        <AvailabilityGrid />
      </div>
    </div>
  );
}
