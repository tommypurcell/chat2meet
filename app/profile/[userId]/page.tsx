"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { useTheme } from "@/lib/theme";

type FriendProfile = {
  id: string;
  name: string;
  email: string;
  timezone: string;
  calendarConnected: boolean;
  publicStatement: string;
  availability: {
    freeWindows: Array<{
      start: string;
      end: string;
      quality: "high" | "medium" | "low";
    }>;
    busyBlocks: Array<{
      start: string;
      end: string;
    }>;
  };
};

export default function FriendProfilePage() {
  const { theme, toggle } = useTheme();
  const params = useParams();
  const userId = params.userId as string;

  const [friend, setFriend] = useState<FriendProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFriend = async () => {
      try {
        const response = await fetch(`/api/user/${userId}`);
        if (response.ok) {
          const data = await response.json();
          setFriend(data);
        }
      } catch (error) {
        console.error("Failed to fetch friend:", error);
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchFriend();
    }
  }, [userId]);

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="flex h-[100dvh] w-full flex-col bg-[var(--bg-primary)] text-[var(--text-primary)]">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-[var(--divider)] px-4 py-4 md:px-6">
        <div className="flex items-center gap-3">
          <Link href="/profile">
            <Button variant="ghost" size="icon" aria-label="Back">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path
                  d="M19 12H5M12 19l-7-7 7-7"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Button>
          </Link>
          <h1 className="text-lg font-semibold">
            {loading ? "Loading..." : friend?.name || "Friend"}
          </h1>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggle}
          aria-label="Toggle theme"
        >
          {theme === "dark" ? (
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="10" r="4" stroke="currentColor" strokeWidth="1.5" />
              <path
                d="M10 2V4M10 16V18M2 10H4M16 10H18M4.93 4.93L6.34 6.34M13.66 13.66L15.07 15.07M15.07 4.93L13.66 6.34M6.34 13.66L4.93 15.07"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
              <path
                d="M17 11.35A7 7 0 118.65 3 5.5 5.5 0 0017 11.35z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </Button>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col overflow-y-auto">
        {loading || !friend ? (
          <div className="flex items-center justify-center flex-1">
            <p className="text-[var(--text-secondary)]">Loading profile...</p>
          </div>
        ) : (
          <>
            {/* Profile Header */}
            <div className="border-b border-[var(--divider)] bg-[var(--bg-secondary)]">
              <div className="mx-auto flex max-w-4xl items-center gap-6 px-4 py-6 md:px-6">
                <div className="relative shrink-0">
                  <Avatar name={friend.name} size={64} />
                  <div
                    className={`absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-[var(--bg-secondary)] ${
                      friend.calendarConnected
                        ? "bg-[var(--accent-primary)]"
                        : "bg-[var(--text-tertiary)]"
                    }`}
                  />
                </div>
                <div className="flex-1">
                  <h1 className="text-2xl font-bold text-[var(--text-primary)]">
                    {friend.name}
                  </h1>
                  <p className="text-sm text-[var(--text-secondary)]">
                    {friend.email}
                  </p>
                  <div className="mt-3 flex gap-6">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                        Timezone
                      </p>
                      <p className="mt-1 text-sm text-[var(--text-primary)]">
                        {friend.timezone}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                        Calendar
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        <div
                          className={`h-2 w-2 rounded-full ${
                            friend.calendarConnected
                              ? "bg-[var(--accent-primary)]"
                              : "bg-[var(--text-tertiary)]"
                          }`}
                        />
                        <p className="text-sm text-[var(--text-secondary)]">
                          {friend.calendarConnected
                            ? "Connected"
                            : "Not connected"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Content Section */}
            <div className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 md:px-6">
              {/* Public Statement */}
              <div className="mb-8">
                <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
                  About
                </h2>
                <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
                  <p className="text-sm text-[var(--text-secondary)]">
                    {friend.publicStatement || "No public statement"}
                  </p>
                </div>
              </div>

              {/* Availability */}
              <div>
                <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
                  Availability
                </h2>
                {friend.availability.freeWindows.length === 0 ? (
                  <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
                    <p className="text-sm text-[var(--text-tertiary)]">
                      No availability data
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {friend.availability.freeWindows.map((window, i) => (
                      <div
                        key={i}
                        className="rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-4"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <p className="font-medium text-[var(--text-primary)]">
                              {formatDate(window.start)}
                            </p>
                            <p className="text-sm text-[var(--text-secondary)]">
                              {formatTime(window.start)} -{" "}
                              {formatTime(window.end)}
                            </p>
                          </div>
                          <div
                            className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                              window.quality === "high"
                                ? "bg-[var(--accent-primary)] text-[var(--text-inverse)]"
                                : window.quality === "medium"
                                  ? "bg-[var(--accent-warning)] text-[var(--text-inverse)]"
                                  : "bg-[var(--text-tertiary)] text-[var(--text-inverse)]"
                            }`}
                          >
                            {window.quality}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
