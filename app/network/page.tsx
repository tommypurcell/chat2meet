"use client";

import { useState } from "react";
import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { AddFriendsModal } from "@/components/events/AddFriendsModal";
import { MOCK_FRIENDS } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import type { Friend } from "@/lib/mock-data";

export default function NetworkPage() {
  const [friends, setFriends] = useState<Friend[]>(MOCK_FRIENDS);
  const [modalOpen, setModalOpen] = useState(false);

  const acceptedFriends = friends.filter((f) => f.status === "accepted");
  const pendingFriends = friends.filter((f) => f.status === "pending");

  function handleRemoveFriend(id: string) {
    setFriends(friends.filter((f) => f.id !== id));
  }

  function handleAcceptFriend(id: string) {
    setFriends(
      friends.map((f) =>
        f.id === id ? { ...f, status: "accepted" as const } : f
      )
    );
  }

  function handleDeclineFriend(id: string) {
    setFriends(friends.filter((f) => f.id !== id));
  }

  function handleInviteFriends(emails: string[]) {
    const newFriends: Friend[] = emails.map((email, i) => ({
      id: `f${friends.length + i}`,
      name: email.split("@")[0],
      email,
      status: "pending",
    }));
    setFriends([...friends, ...newFriends]);
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[var(--bg-primary)]">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-[var(--divider)] px-6 py-4">
        <div className="flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="icon" aria-label="Back">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Network</h1>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={() => setModalOpen(true)}
        >
          Add friend
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl px-6 py-8">
          {friends.length === 0 ? (
            <EmptyState onAddClick={() => setModalOpen(true)} />
          ) : (
            <div className="flex flex-col gap-6">
              {/* Friends section */}
              {acceptedFriends.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Friends ({acceptedFriends.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col gap-3">
                      {acceptedFriends.map((friend) => (
                        <FriendRow
                          key={friend.id}
                          friend={friend}
                          actions={
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveFriend(friend.id)}
                            >
                              Remove
                            </Button>
                          }
                        />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Pending section */}
              {pendingFriends.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Pending ({pendingFriends.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col gap-3">
                      {pendingFriends.map((friend) => (
                        <FriendRow
                          key={friend.id}
                          friend={friend}
                          actions={
                            <div className="flex gap-2">
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => handleAcceptFriend(friend.id)}
                              >
                                Accept
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeclineFriend(friend.id)}
                              >
                                Decline
                              </Button>
                            </div>
                          }
                        />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      <AddFriendsModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onInvite={handleInviteFriends}
        title="Add friends to your network"
      />
    </div>
  );
}

function FriendRow({
  friend,
  actions,
}: {
  friend: Friend;
  actions: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-[var(--border)] px-3 py-3 hover:bg-[var(--bg-secondary)] transition-colors">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <Avatar name={friend.name} size={36} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-[var(--text-primary)]">
            {friend.name}
          </p>
          <p className="text-xs text-[var(--text-tertiary)] truncate">
            {friend.email}
          </p>
        </div>
      </div>
      <div className="shrink-0">{actions}</div>
    </div>
  );
}

function EmptyState({ onAddClick }: { onAddClick: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-[var(--divider)] px-6 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--bg-secondary)]">
        <svg
          className="h-6 w-6 text-[var(--text-tertiary)]"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden
        >
          <circle
            cx="12"
            cy="8"
            r="3"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path
            d="M6 20c0-3 2-5 6-5s6 2 6 5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M20 12h2M2 12h2"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <div>
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">
          No friends yet
        </h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Start building your network by adding friends
        </p>
      </div>
      <Button variant="primary" onClick={onAddClick}>
        Add your first friend
      </Button>
    </div>
  );
}
