"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { SAMPLE_INVITE } from "@/lib/mock-data";

export default function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  React.use(params);
  const [cancelled, setCancelled] = useState(false);

  const event = SAMPLE_INVITE;

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
              <Button variant="secondary" size="md">Back to calendar</Button>
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
          Back to calendar
        </Link>

        {/* Event title + status */}
        <div className="mb-6">
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
              {event.title}
            </h1>
            <span className="shrink-0 rounded-lg bg-[var(--accent-primary)] px-2.5 py-1 text-xs font-semibold text-white shadow-[var(--glow-soft)]">
              Confirmed
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
                <p className="text-[15px] font-semibold text-[var(--text-primary)]">{event.date}</p>
                <p className="text-sm text-[var(--text-secondary)]">{event.time}</p>
              </div>
            </div>

            {/* Where */}
            {event.location && (
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--bg-tertiary)]">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" stroke="var(--accent-primary)" strokeWidth="1.75" />
                    <circle cx="12" cy="9" r="2.5" stroke="var(--accent-primary)" strokeWidth="1.75" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-tertiary)]">Where</p>
                  <p className="text-[15px] font-semibold text-[var(--text-primary)]">{event.location}</p>
                </div>
              </div>
            )}

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
                  {event.attendees.map((name) => (
                    <div key={name} className="flex items-center gap-2">
                      <Avatar name={name} size={28} />
                      <span className="text-sm text-[var(--text-primary)]">{name}</span>
                      {name === event.organizer && (
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
            Message {event.organizer}
          </Button>
          <Button variant="ghost" size="md" className="w-full">
            Reschedule
          </Button>
          <Button
            variant="ghost"
            size="md"
            className="w-full text-[var(--accent-danger)]"
            onClick={() => setCancelled(true)}
          >
            Cancel meeting
          </Button>
        </div>

        {/* Calendar status */}
        <div className="mt-6 flex items-center justify-center gap-2 rounded-xl bg-[var(--bg-secondary)] px-4 py-3">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="7" stroke="var(--accent-primary)" strokeWidth="1.5" />
            <path d="M5 8l2 2 4-4" stroke="var(--accent-primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-sm text-[var(--text-secondary)]">Added to Google Calendar</span>
        </div>
      </div>
    </div>
  );
}
