import { useState } from "react";
import type { SchedulingEvent } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { AddFriendsModal } from "./AddFriendsModal";

const STATUS_LABEL: Record<SchedulingEvent["status"], string> = {
  draft: "Draft",
  collecting: "Collecting availability",
  ready: "Ready to finalize",
};

export type EventCardProps = {
  event: SchedulingEvent;
};

export function EventCard({ event }: EventCardProps) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <Card className="flex flex-col">
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="pr-2">{event.title}</CardTitle>
            <span className="shrink-0 rounded-md bg-[var(--bubble-action)] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--text-link)]">
              {STATUS_LABEL[event.status]}
            </span>
          </div>
          {event.description ? (
            <CardDescription>{event.description}</CardDescription>
          ) : null}
        </CardHeader>
        <CardContent>
          <p className="text-[13px] text-[var(--text-tertiary)]">
            {event.participantCount} participant
            {event.participantCount === 1 ? "" : "s"}
          </p>
        </CardContent>
        <CardFooter className="mt-auto justify-end border-0 pt-0">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setModalOpen(true)}
          >
            Add friends
          </Button>
        </CardFooter>
      </Card>

      <AddFriendsModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onInvite={() => {
          /* wire to API later */
        }}
        title={`Add friends — ${event.title}`}
      />
    </>
  );
}
