import type { ReactNode } from "react";

/**
 * Match home “chrome” tones: sidebar / panels use --bg-secondary, not bare --bg-primary (#000).
 * Body still uses primary globally; this wrapper paints the events subtree charcoal so it never feels like a void.
 */
export default function EventsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh w-full bg-[var(--bg-secondary)] text-[var(--text-primary)]">
      {children}
    </div>
  );
}
