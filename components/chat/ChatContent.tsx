import React from "react";
import { ChatMessage } from "./ChatMessage";
import { ActionBubble } from "./ActionBubble";
import { TimeChip } from "../ui/TimeChip";
import { Avatar } from "../ui/Avatar";
import { CHAT_SUGGESTIONS, SAMPLE_INVITE } from "@/lib/mock-data";
import { mergeUiMessageTextParts } from "@/lib/utils";

/* ── Invite preview card (Screen 6) ──────────────────── */
function InvitePreview({ onClose }: { onClose: () => void }) {
  return (
    <div className="mx-4 mb-2 rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4 shadow-[var(--shadow-card)]">
      <h3 className="text-base font-semibold text-[var(--text-primary)]">
        {SAMPLE_INVITE.title}
      </h3>
      <p className="mt-1 text-sm text-[var(--text-secondary)]">
        {SAMPLE_INVITE.date} &middot; {SAMPLE_INVITE.time}
      </p>
      {SAMPLE_INVITE.location && (
        <p className="mt-0.5 text-sm text-[var(--text-tertiary)]">
          {SAMPLE_INVITE.location}
        </p>
      )}
      <div className="mt-3 flex items-center gap-2">
        {SAMPLE_INVITE.attendees.map((name) => (
          <div key={name} className="flex items-center gap-1.5">
            <Avatar name={name} size={24} />
            <span className="text-xs text-[var(--text-secondary)]">{name}</span>
          </div>
        ))}
      </div>
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 rounded-lg bg-[var(--accent-primary)] py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          Send invite
        </button>
        <button
          type="button"
          className="flex-1 rounded-lg bg-[var(--bg-tertiary)] py-2 text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--divider)]"
          onClick={onClose}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export type ChatContentProps = {
  messages: any[];
  isLoading: boolean;
  selectedSlot: string | null;
  showInvitePreview?: boolean;
  onSelectSlot: (id: string) => void;
  onShowInvite?: () => void;
  onCloseInvite?: () => void;
  onSuggestionClick?: (text: string) => void;
};

export function ChatContent({
  messages,
  isLoading,
  selectedSlot,
  showInvitePreview = false,
  onSelectSlot,
  onShowInvite,
  onCloseInvite,
  onSuggestionClick,
}: ChatContentProps) {
  // Extract time slots from tool results in messages
  const suggestedTimes = messages
    .filter((msg) => msg.role === "assistant")
    .flatMap((msg) => {
      return msg.toolResults
        ?.filter((result: any) => result.toolName === "suggestTimes")
        .flatMap((result: any) => result.result?.suggestedTimes || []) || [];
    });

  return (
    <div className="flex-1 overflow-y-auto">
      {messages.length === 0 && !isLoading ? (
        <div className="flex flex-col gap-2 px-4 py-4">
          <p className="text-sm text-[var(--text-secondary)]">Start a conversation to find meeting times</p>
          {CHAT_SUGGESTIONS.map((s) => (
            <button
              key={s.title}
              type="button"
              className="flex items-start gap-3 rounded-xl bg-[var(--bg-secondary)] px-3 py-2.5 text-left transition-colors hover:bg-[var(--bg-tertiary)]"
              onClick={() => onSuggestionClick?.(s.body)}
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-[var(--text-primary)]">{s.title}</p>
                <p className="text-xs text-[var(--text-tertiary)]">{s.body}</p>
              </div>
            </button>
          ))}
        </div>
      ) : (
        messages.map((msg) => (
          <ChatMessage key={msg.id} role={msg.role}>
            <span className="whitespace-pre-wrap">
              {mergeUiMessageTextParts(msg.parts) ||
                (typeof msg.content === "string" ? msg.content : "")}
            </span>
          </ChatMessage>
        ))
      )}

      {suggestedTimes.length > 0 && (
        <div className="flex flex-wrap gap-2 px-4 py-2">
          {suggestedTimes.map((slot: any) => (
            <TimeChip
              key={slot.id}
              time={slot.time}
              date={slot.date}
              selected={selectedSlot === slot.id}
              onClick={() => onSelectSlot(slot.id)}
            />
          ))}
        </div>
      )}

      {selectedSlot && !showInvitePreview && onShowInvite && (
        <ActionBubble
          text="Create calendar invite"
          onClick={onShowInvite}
        />
      )}

      {showInvitePreview && onCloseInvite && (
        <InvitePreview onClose={onCloseInvite} />
      )}
    </div>
  );
}
