import { useEffect, useId, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

export type AddFriendsModalProps = {
  open: boolean;
  onClose: () => void;
  onInvite?: (users: any[]) => void;
  title?: string;
};

export function AddFriendsModal({
  open,
  onClose,
  onInvite,
  title = "Search users to add",
}: AddFriendsModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<any[]>([]);
  const labelId = useId();

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
      setSelected([]);
    }
    
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const delay = setTimeout(() => {
      setLoading(true);
      fetch(`/api/users?query=${encodeURIComponent(query)}&limit=10`)
        .then((res) => res.json())
        .then((data) => {
          if (data.users) {
            setResults(data.users);
          }
        })
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(delay);
  }, [query]);

  if (!open) return null;

  function toggleUser(user: any) {
    setSelected((prev) => {
      if (prev.find((u) => u.id === user.id)) {
        return prev.filter((u) => u.id !== user.id);
      }
      return [...prev, user];
    });
  }

  function submit() {
    onInvite?.(selected);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/60"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelId}
        className={cn(
          "relative z-10 flex max-h-[85vh] w-full max-w-md flex-col rounded-2xl border border-[var(--border)]",
          "bg-[var(--bg-secondary)] shadow-[var(--shadow-elevated)]",
        )}
      >
        <div className="shrink-0 border-b border-[var(--divider)] p-4">
          <h2 id={labelId} className="text-base font-semibold text-[var(--text-primary)]">
            {title}
          </h2>
          <p className="mt-1 text-[13px] text-[var(--text-tertiary)]">
            Search for people by name or email.
          </p>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search users..."
            className={cn(
              "mt-3 w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)]",
              "px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--input-placeholder)] focus:outline-none focus:border-[var(--border-focused)]",
            )}
          />
        </div>

        <div className="flex-1 overflow-y-auto p-4 min-h-[50px]">
          {loading && <p className="text-sm text-[var(--text-secondary)] text-center py-4">Searching...</p>}
          
          {!loading && results.length > 0 && (
            <div className="flex flex-col gap-2">
              {results.map((u) => {
                const isSelected = selected.some((s) => s.id === u.id);
                return (
                  <button
                    key={u.id}
                    onClick={() => toggleUser(u)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors",
                      isSelected
                        ? "border-[var(--accent-primary)] bg-[var(--bg-tertiary)]"
                        : "border-[var(--border)] hover:bg-[var(--bg-tertiary)]",
                    )}
                  >
                    <Avatar name={u.name || "User"} size={36} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[var(--text-primary)]">
                        {u.name || "Anonymous User"}
                      </p>
                      <p className="truncate text-xs text-[var(--text-tertiary)]">
                        {u.email}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
          {!loading && query && results.length === 0 && (
            <p className="text-sm text-[var(--text-secondary)] text-center py-4">No users found.</p>
          )}
        </div>

        <div className="shrink-0 flex justify-end gap-2 border-t border-[var(--divider)] p-4">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={submit}
            disabled={selected.length === 0}
          >
            Add selected
          </Button>
        </div>
      </div>
    </div>
  );
}
