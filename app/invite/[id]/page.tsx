"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { TimeChip } from "@/components/ui/TimeChip";
import { SAMPLE_INVITE, SAMPLE_TIME_SLOTS } from "@/lib/mock-data";

type InviteStatus = "pending" | "accepted" | "declined" | "countering" | "countered";

export default function InvitePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  React.use(params);
  const [status, setStatus] = useState<InviteStatus>("pending");
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);

  const invite = SAMPLE_INVITE;

  const toggleSlot = (slotId: string) => {
    setSelectedSlots((prev) =>
      prev.includes(slotId) ? prev.filter((s) => s !== slotId) : [...prev, slotId]
    );
  };

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
              {invite.title} with {invite.organizer} — {invite.date}, {invite.time}
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
              {invite.organizer} will be notified.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === "countered") {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[var(--bg-primary)] px-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="flex flex-col items-center gap-4 py-10">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--accent-primary)]">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path d="M12 8v4l3 3" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="12" cy="12" r="9" stroke="white" strokeWidth="2.5" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-[var(--text-primary)]">Counter-proposal sent</h2>
            <p className="text-[var(--text-secondary)]">
              {invite.organizer} will review your proposed times.
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
            {invite.title}
          </h1>
        </div>

        <CardContent className="space-y-5 px-6 pt-5">
          {/* Organizer */}
          <div className="flex items-center gap-3">
            <Avatar name={invite.organizer} size={40} />
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">
                {invite.organizer}
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
              <p className="font-semibold text-[var(--text-primary)]">{invite.date}</p>
              <p className="text-sm text-[var(--text-secondary)]">{invite.time}</p>
            </div>
          </div>

          {/* Location */}
          {invite.location && (
            <div className="flex items-start gap-3 rounded-xl bg-[var(--bg-tertiary)] p-4">
              <svg className="mt-0.5 shrink-0" width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" stroke="var(--accent-primary)" strokeWidth="2" />
                <circle cx="12" cy="9" r="2.5" stroke="var(--accent-primary)" strokeWidth="2" />
              </svg>
              <p className="font-medium text-[var(--text-primary)]">{invite.location}</p>
            </div>
          )}

          {/* Attendees */}
          <div>
            <p className="mb-2 text-sm font-medium text-[var(--text-tertiary)]">Attendees</p>
            <div className="flex items-center gap-2">
              {invite.attendees.map((name) => (
                <div key={name} className="flex items-center gap-2">
                  <Avatar name={name} size={32} />
                  <span className="text-sm text-[var(--text-secondary)]">{name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-[var(--divider)]" />

          {/* Counter-proposal section */}
          {status === "countering" ? (
            <div className="space-y-4">
              <p className="text-sm font-medium text-[var(--text-primary)]">
                Pick times that work for you
              </p>
              <div className="flex flex-wrap gap-2">
                {SAMPLE_TIME_SLOTS.map((slot) => (
                  <TimeChip
                    key={slot.id}
                    time={slot.time}
                    date={slot.date}
                    selected={selectedSlots.includes(slot.id)}
                    onClick={() => toggleSlot(slot.id)}
                  />
                ))}
              </div>
              <div className="flex flex-col gap-2">
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full"
                  disabled={selectedSlots.length === 0}
                  onClick={() => setStatus("countered")}
                >
                  Send counter-proposal
                </Button>
                <Button
                  variant="ghost"
                  size="md"
                  className="w-full"
                  onClick={() => setStatus("pending")}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2 pb-2">
              <Button
                variant="primary"
                size="lg"
                className="w-full bg-[var(--accent-success)] shadow-none"
                onClick={() => setStatus("accepted")}
              >
                Accept
              </Button>
              <Button
                variant="secondary"
                size="lg"
                className="w-full"
                onClick={() => setStatus("countering")}
              >
                Propose new time
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
