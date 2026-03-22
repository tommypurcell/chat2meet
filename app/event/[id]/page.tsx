"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";

interface EventData {
  id: string;
  title: string;
  createdBy: string;
  participantIds: string[];
  dateRangeStart: string;
  dateRangeEnd: string;
  durationMinutes: number;
  status: string;
  finalizedSlot: { date: string; time: string } | null;
  bestSlot: { date: string; time: string } | null;
}

export default function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = React.use(params);
  const [event, setEvent] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelled, setCancelled] = useState(false);

  useEffect(() => {
    async function fetchEvent() {
      try {
        const res = await fetch(`/api/events/${id}`);
        if (!res.ok) {
          setError(res.status === 404 ? "Meeting not found" : "Failed to load meeting");
          return;
        }
        const data = await res.json();
        setEvent(data);
      } catch {
        setError("Failed to load meeting");
      } finally {
        setLoading(false);
      }
    }
    fetchEvent();
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[var(--bg-primary)]">
        <p className="text-sm text-[var(--text-tertiary)]">Loading...</p>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[var(--bg-primary)] px-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="flex flex-col items-center gap-4 py-10">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--bg-tertiary)]">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="9" stroke="var(--text-tertiary)" strokeWidth="2" />
                <path d="M12 8v4M12 16h.01" stroke="var(--text-tertiary)" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-[var(--text-primary)]">{error || "Meeting not found"}</h2>
            <p className="text-[var(--text-secondary)]">This meeting may have been deleted or the link is invalid.</p>
            <Link href="/">
              <Button variant="secondary" size="md">Back to home</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const slot = event.finalizedSlot || event.bestSlot;
  const displayDate = slot?.date || event.dateRangeStart;
  const displayTime = slot?.time || `${event.durationMinutes} min`;

  async function handleCancel() {
    try {
      await fetch(`/api/events/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" }),
      });
      setCancelled(true);
    } catch {
      console.error("Failed to cancel meeting");
    }
  }

  if (cancelled) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[var(--bg-primary)] px-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="flex flex-col items-center gap-4 py-10">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--bg-tertiary)]">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6l12 12" stroke="var(--text-tertiary)" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-[var(--text-primary)]">Meeting cancelled</h2>
            <p className="text-[var(--text-secondary)]">All attendees have been notified.</p>
            <Link href="/">
              <Button variant="secondary" size="md">Back to home</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[var(--bg-primary)] px-4 py-6">
      <div className="mx-auto w-full max-w-md">
        {/* Back button */}
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--text-link)] transition-opacity hover:opacity-80"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to home
        </Link>

        {/* Event title + status */}
        <div className="mb-6">
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
              {event.title}
            </h1>
            <span className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-semibold text-white ${
              event.status === "finalized" ? "bg-[var(--accent-primary)] shadow-[var(--glow-soft)]" : "bg-[var(--text-tertiary)]"
            }`}>
              {event.status === "finalized" ? "Confirmed" : event.status.charAt(0).toUpperCase() + event.status.slice(1)}
            </span>
          </div>
        </div>

        {/* Detail sections */}
        <Card className="mb-6 overflow-hidden">
          <CardContent className="space-y-5 p-5">
            {/* When */}
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--bg-tertiary)]">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="4" width="18" height="18" rx="3" stroke="var(--accent-primary)" strokeWidth="1.75" />
                  <path d="M3 10h18M8 2v4M16 2v4" stroke="var(--accent-primary)" strokeWidth="1.75" strokeLinecap="round" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-tertiary)]">When</p>
                <p className="text-[15px] font-semibold text-[var(--text-primary)]">{displayDate}</p>
                <p className="text-sm text-[var(--text-secondary)]">{displayTime}</p>
              </div>
            </div>

            {/* Who */}
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--bg-tertiary)]">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <circle cx="9" cy="8" r="4" stroke="var(--accent-primary)" strokeWidth="1.75" />
                  <path d="M1 20c0-3.31 3.58-6 8-6s8 2.69 8 6" stroke="var(--accent-primary)" strokeWidth="1.75" strokeLinecap="round" />
                  <circle cx="17" cy="8" r="3" stroke="var(--accent-primary)" strokeWidth="1.75" />
                  <path d="M20 20c0-2.21-1.79-4-4-4" stroke="var(--accent-primary)" strokeWidth="1.75" strokeLinecap="round" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-tertiary)]">Who</p>
                <div className="mt-1.5 flex flex-col gap-2">
                  {event.participantIds.map((pid) => (
                    <div key={pid} className="flex items-center gap-2">
                      <Avatar name={pid} size={28} />
                      <span className="text-sm text-[var(--text-primary)]">{pid}</span>
                      {pid === event.createdBy && (
                        <span className="rounded-md bg-[var(--bubble-action)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--text-link)]">
                          Organizer
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action buttons */}
        <div className="space-y-2">
          <Button variant="secondary" size="lg" className="w-full gap-2">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2 2.5h12v9H4l-2 2V2.5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Message organizer
          </Button>
          <Button variant="ghost" size="md" className="w-full">
            Reschedule
          </Button>
          <Button
            variant="ghost"
            size="md"
            className="w-full text-[var(--accent-danger)]"
            onClick={handleCancel}
          >
            Cancel meeting
          </Button>
        </div>
      </div>
    </div>
  );
}
