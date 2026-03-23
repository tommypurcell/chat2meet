"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { EventAvailabilityGrid } from "@/components/events/EventAvailabilityGrid";
import { EventGroupHeatmap } from "@/components/events/EventGroupHeatmap";

function linkButtonClass(variant: "primary" | "secondary" | "ghost", size: "sm" | "md") {
  return cn(
    "inline-flex items-center justify-center gap-2 font-semibold tracking-[-0.2px] transition-opacity duration-150",
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--border-focused)]",
    size === "sm" && "rounded-lg px-3.5 py-1.5 text-sm",
    size === "md" && "rounded-xl px-5 py-2.5 text-base",
    variant === "primary" &&
      "bg-[var(--accent-primary)] text-white shadow-[var(--glow-soft)] hover:opacity-90",
    variant === "secondary" &&
      "border-[1.5px] border-[var(--accent-primary)] bg-transparent text-[var(--accent-primary)] hover:opacity-80",
    variant === "ghost" &&
      "bg-transparent text-[var(--accent-primary)] hover:opacity-70",
  );
}

interface Event {
  id: string;
  title: string;
  dateRangeStart: string;
  dateRangeEnd: string;
  timezone: string;
  earliestTime?: string;
  latestTime?: string;
  durationMinutes?: number;
  status: string;
  createdBy: string;
  creatorName?: string;
  participantIds?: string[];
  shareUrl?: string;
}

export default function EventPage() {
  const params = useParams();
  const eventId = params.id as string;

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  useEffect(() => {
    // Use shareUrl from event if available, otherwise fall back to window.location
    if (event?.shareUrl) {
      setShareUrl(event.shareUrl);
    } else if (typeof window !== "undefined") {
      setShareUrl(window.location.href);
    }
  }, [event]);

  useEffect(() => {
    if (!eventId) return;

    const fetchEvent = async () => {
      try {
        setLoading(true);

        const eventRes = await fetch(`/api/events/${eventId}`);
        if (!eventRes.ok) throw new Error("Failed to fetch event");
        const eventData = await eventRes.json();
        setEvent({ id: eventId, ...eventData });
      } catch (err) {
        console.error("Error fetching event:", err);
        setError(err instanceof Error ? err.message : "Failed to load event");
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [eventId]);

  function formatDateRange(start: string, end: string) {
    try {
      const startDate = new Date(start);
      const endDate = new Date(end);

      const options: Intl.DateTimeFormatOptions = {
        month: "short",
        day: "numeric",
      };

      if (startDate.toDateString() === endDate.toDateString()) {
        return startDate.toLocaleDateString("en-US", options);
      }

      return `${startDate.toLocaleDateString("en-US", options)} – ${endDate.toLocaleDateString("en-US", options)}`;
    } catch {
      return `${start} – ${end}`;
    }
  }

  async function copyShareLink() {
    const url = shareUrl || (typeof window !== "undefined" ? window.location.href : "");
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setShowShareModal(false);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  const groupParticipantIds = useMemo(
    () =>
      Array.from(
        new Set([...(event?.participantIds ?? []), event?.createdBy].filter(Boolean) as string[]),
      ),
    [event?.participantIds, event?.createdBy],
  );

  if (loading) {
    return (
      <div className="flex min-h-dvh w-full flex-col">
        <header className="shrink-0 border-b border-[var(--divider)] bg-[var(--bg-tertiary)] px-4 py-3 lg:px-6">
          <div className="mx-auto max-w-3xl">
            <div className="h-4 w-24 animate-pulse rounded bg-[var(--bg-tertiary)]" />
          </div>
        </header>
        <div className="flex flex-1 items-center justify-center px-4">
          <p className="text-sm text-[var(--text-tertiary)]">Loading event…</p>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="flex min-h-dvh w-full flex-col">
        <header className="shrink-0 border-b border-[var(--divider)] bg-[var(--bg-tertiary)] px-4 py-3 lg:px-6">
          <div className="mx-auto flex max-w-3xl items-center gap-2">
            <Link href="/" className={linkButtonClass("ghost", "sm")}>
              ← Home
            </Link>
          </div>
        </header>
        <div className="flex flex-1 items-center justify-center px-4 py-10">
          <Card className="max-w-md w-full bg-[var(--bg-tertiary)] p-10 text-center">
            <div className="mb-4 flex h-16 w-16 mx-auto items-center justify-center rounded-full bg-[var(--bg-secondary)]">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="9" stroke="var(--text-tertiary)" strokeWidth="2" />
                <path d="M12 8v4M12 16h.01" stroke="var(--text-tertiary)" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-[var(--text-primary)]">Couldn&apos;t load event</h2>
            <p className="mt-2 text-[var(--accent-danger)]">{error || "Event not found"}</p>
            <Link
              href="/"
              className={cn(linkButtonClass("secondary", "md"), "mt-6 inline-flex")}
            >
              Back to Chat2Meet
            </Link>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh w-full flex-col bg-[var(--bg-secondary)]">
      {/* Header */}
      <header className="shrink-0 border-b border-[var(--divider)] bg-[var(--bg-tertiary)] px-4 py-4 lg:px-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className={cn(linkButtonClass("ghost", "sm"), "-ml-1")}
              >
                ← Home
              </Link>
              <h1 className="truncate text-[17px] font-semibold tracking-[-0.24px] text-[var(--text-primary)]">
                {event.title}
              </h1>
            </div>
            <p className="mt-1 text-[13px] text-[var(--text-tertiary)]">
              {formatDateRange(event.dateRangeStart, event.dateRangeEnd)}
              {" • "}
              {event.durationMinutes || 30} min
              {" • "}
              {event.timezone}
            </p>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowShareModal(true)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <circle cx="18" cy="5" r="3" stroke="currentColor" strokeWidth="2" />
              <circle cx="6" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
              <circle cx="18" cy="19" r="3" stroke="currentColor" strokeWidth="2" />
              <path
                d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98"
                stroke="currentColor"
                strokeWidth="2"
              />
            </svg>
            Share
          </Button>
        </div>
      </header>

      {/* Main Content: Two-Panel Layout */}
      <main className="flex flex-1 overflow-auto">
        <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-4 p-4 lg:flex-row">
          {/* Left Panel: Your Availability */}
          <Card className="flex min-h-[520px] flex-1 flex-col overflow-hidden bg-[var(--bg-tertiary)] p-4">
            <EventAvailabilityGrid
              eventId={eventId}
              startDate={event.dateRangeStart}
              endDate={event.dateRangeEnd}
              creatorId={event.createdBy}
              creatorName={event.creatorName}
              earliestTime={event.earliestTime}
              latestTime={event.latestTime}
              timePosition="left"
            />
          </Card>

          {/* Right Panel: Group Availability */}
          <Card className="flex min-h-[520px] flex-1 flex-col overflow-hidden bg-[var(--bg-tertiary)] p-4">
            <EventGroupHeatmap
              eventId={eventId}
              startDate={event.dateRangeStart}
              endDate={event.dateRangeEnd}
              participantIds={groupParticipantIds}
              earliestTime={event.earliestTime}
              latestTime={event.latestTime}
            />
          </Card>
        </div>
      </main>

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <Card className="w-full max-w-md bg-[var(--bg-secondary)] p-6">
            <h2 className="mb-4 text-[17px] font-semibold text-[var(--text-primary)]">
              Share Event
            </h2>
            <p className="mb-4 text-[13px] text-[var(--text-secondary)]">
              Share this link with participants:
            </p>

            <div className="mb-4 flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="min-w-0 flex-1 rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-[13px] text-[var(--text-primary)] focus:border-[var(--border-focused)] focus:outline-none"
              />
              <Button variant="primary" size="sm" onClick={copyShareLink}>
                {copied ? "Copied!" : "Copy"}
              </Button>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowShareModal(false)}
              >
                Close
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
