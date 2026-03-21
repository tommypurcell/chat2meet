"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { useTheme } from "@/lib/theme";

type Friend = {
  id: string;
  name: string;
  email: string;
};

export default function NetworkPage() {
  const { theme, toggle } = useTheme();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFriends = async () => {
      try {
        const response = await fetch("/api/user");
        if (response.ok) {
          const data = await response.json();
          setFriends(data.friends || []);
        }
      } catch (error) {
        console.error("Failed to fetch friends:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchFriends();
  }, []);

  return (
    <div className="flex h-[100dvh] w-full flex-col bg-[var(--bg-primary)] text-[var(--text-primary)]">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-[var(--divider)] px-4 py-4 md:px-6">
        <div className="flex items-center gap-3">
          <Link href="/">
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
          <h1 className="text-lg font-semibold">Your Network</h1>
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
        <div className="mx-auto w-full max-w-4xl px-4 py-8 md:px-6">
          {loading ? (
            <p className="text-center text-[var(--text-secondary)]">
              Loading your network...
            </p>
          ) : friends.length === 0 ? (
            <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-8 text-center">
              <p className="text-[var(--text-secondary)]">
                You haven't added any friends yet.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {friends.map((friend) => (
                <Link
                  key={friend.id}
                  href={`/profile/${friend.id}`}
                  className="flex items-center gap-4 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-4 hover:bg-[var(--bg-tertiary)] transition-colors"
                >
                  <Avatar name={friend.name} size={48} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[var(--text-primary)]">
                      {friend.name}
                    </p>
                    <p className="text-sm text-[var(--text-tertiary)]">
                      {friend.email}
                    </p>
                  </div>
                  <div className="shrink-0 text-[var(--text-tertiary)]">
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <path
                        d="M9 6l6 6-6 6"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
