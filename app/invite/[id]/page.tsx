"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";

type InviteStatus = "pending" | "accepted" | "declined" | "countering" | "countered";

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

export default function InvitePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = React.use(params);
  const [status, setStatus] = useState<InviteStatus>("pending");
  const [event, setEvent] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchEvent() {
      try {
        const res = await fetch(`/api/events/${id}`);
        if (!res.ok) {
          setError(res.status === 404 ? "Invite not found" : "Failed to load invite");
          return;
        }
        const data = await res.json();
        setEvent(data);
      } catch {
        setError("Failed to load invite");
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
            <h2 className="text-xl font-bold text-[var(--text-primary)]">{error || "Invite not found"}</h2>
            <p className="text-[var(--text-secondary)]">This invite may have expired or the link is invalid.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const slot = event.finalizedSlot || event.bestSlot;
  const displayDate = slot?.date || event.dateRangeStart;
  const displayTime = slot?.time || `${event.durationMinutes} min meeting`;

  async function handleAccept() {
    try {
      await fetch(`/api/events/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "finalized" }),
      });
      setStatus("accepted");
    } catch {
      console.error("Failed to accept invite");
    }
  }

  if (status === "accepted") {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[var(--bg-primary)] px-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="flex flex-col items-center gap-4 py-10">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--accent-success)]">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                <path d="M5 13l4 4L19 7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-[var(--text-primary)]">You're in!</h2>
            <p className="text-[var(--text-secondary)]">
              {event.title} — {displayDate}, {displayTime}
            </p>
            <p className="text-sm text-[var(--text-tertiary)]">Added to your calendar</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === "declined") {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[var(--bg-primary)] px-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="flex flex-col items-center gap-4 py-10">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--bg-tertiary)]">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6l12 12" stroke="var(--text-tertiary)" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-[var(--text-primary)]">Invite declined</h2>
            <p className="text-[var(--text-secondary)]">
              The organizer will be notified.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[var(--bg-primary)] px-4 py-8">
      <Card className="w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-[var(--bg-tertiary)] px-6 py-5 text-center">
          <p className="mb-1 text-sm font-medium text-[var(--text-tertiary)]">
            You've been invited
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
            {event.title}
          </h1>
        </div>

        <CardContent className="space-y-5 px-6 pt-5">
          {/* Organizer */}
          <div className="flex items-center gap-3">
            <Avatar name={event.createdBy} size={40} />
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">
                {event.createdBy}
              </p>
              <p className="text-xs text-[var(--text-tertiary)]">Organizer</p>
            </div>
          </div>

          {/* Date & Time */}
          <div className="flex items-start gap-3 rounded-xl bg-[var(--bg-tertiary)] p-4">
            <svg className="mt-0.5 shrink-0" width="20" height="20" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="4" width="18" height="18" rx="3" stroke="var(--accent-primary)" strokeWidth="2" />
              <path d="M3 10h18M8 2v4M16 2v4" stroke="var(--accent-primary)" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <div>
              <p className="font-semibold text-[var(--text-primary)]">{displayDate}</p>
              <p className="text-sm text-[var(--text-secondary)]">{displayTime}</p>
            </div>
          </div>

          {/* Attendees */}
          <div>
            <p className="mb-2 text-sm font-medium text-[var(--text-tertiary)]">Attendees</p>
            <div className="flex items-center gap-2 flex-wrap">
              {event.participantIds.map((pid) => (
                <div key={pid} className="flex items-center gap-2">
                  <Avatar name={pid} size={32} />
                  <span className="text-sm text-[var(--text-secondary)]">{pid}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-[var(--divider)]" />

          {/* Actions */}
          <div className="flex flex-col gap-2 pb-2">
            <Button
              variant="primary"
              size="lg"
              className="w-full bg-[var(--accent-success)] shadow-none"
              onClick={handleAccept}
            >
              Accept
            </Button>
            <Button
              variant="ghost"
              size="md"
              className="w-full text-[var(--accent-danger)]"
              onClick={() => setStatus("declined")}
            >
              Decline
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

