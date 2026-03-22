"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { NetworkPickerModal } from "@/components/network/NetworkPickerModal";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/Button";

export default function AddNetworkPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[var(--bg-primary)] text-[var(--text-secondary)]">
        Loading…
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 bg-[var(--bg-primary)] px-6 text-center">
        <p className="text-sm text-[var(--text-secondary)]">
          Sign in to view your network.
        </p>
        <Link href="/login?returnTo=/addnetwork">
          <Button variant="primary">Sign in</Button>
        </Link>
        <Link href="/">
          <Button variant="ghost" size="sm">
            Back home
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-[var(--bg-primary)]">
      <NetworkPickerModal
        open
        ownerUserId={user.uid}
        onClose={() => router.push("/")}
      />
    </div>
  );
}
