/**
 * Read tool outputs from UIMessage objects. AI SDK v5 uses `parts` with
 * `type: "tool-<name>"` and `state: "output-available"`; older code assumed
 * `toolResults` on the message, which is usually undefined — so chips/heatmap
 * never saw suggestTimes data.
 */

export type SuggestedTimeSlot = {
  id: string;
  time: string;
  date: string;
};

export type GuestEventResult = {
  success: true;
  eventId: string;
  shareUrl: string;
  guestId: string;
  creatorName: string;
  message?: string;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function appendSuggestedSlots(
  acc: Map<string, SuggestedTimeSlot>,
  arr: unknown,
): void {
  if (!Array.isArray(arr)) return;
  for (const item of arr) {
    if (!isRecord(item)) continue;
    const id = item.id;
    const time = item.time;
    const date = item.date;
    if (
      typeof id === "string" &&
      typeof time === "string" &&
      typeof date === "string"
    ) {
      acc.set(id, { id, time, date });
    }
  }
}

/** Collect suggestTimes slots from assistant messages (parts + legacy toolResults). */
export function extractSuggestedTimesFromMessages(
  messages: unknown[],
): SuggestedTimeSlot[] {
  const byId = new Map<string, SuggestedTimeSlot>();

  for (const msg of messages) {
    if (!isRecord(msg) || msg.role !== "assistant") continue;

    const legacy = msg.toolResults;
    if (Array.isArray(legacy)) {
      for (const tr of legacy) {
        if (!isRecord(tr) || tr.toolName !== "suggestTimes") continue;
        const result = tr.result;
        if (!isRecord(result)) continue;
        appendSuggestedSlots(byId, result.suggestedTimes);
      }
    }

    const parts = msg.parts;
    if (!Array.isArray(parts)) continue;

    for (const part of parts) {
      if (!isRecord(part)) continue;
      const type = part.type;
      const isSuggest =
        type === "tool-suggestTimes" ||
        (type === "dynamic-tool" && part.toolName === "suggestTimes");
      if (!isSuggest) continue;
      if (part.state !== "output-available") continue;
      const output = part.output;
      if (!isRecord(output)) continue;
      appendSuggestedSlots(byId, output.suggestedTimes);
    }
  }

  return [...byId.values()];
}

/** Successful createEvent tool outputs (for UI badges). */
export function extractCreateEventResultsFromMessages(
  messages: unknown[],
): unknown[] {
  const out: unknown[] = [];

  for (const msg of messages) {
    if (!isRecord(msg) || msg.role !== "assistant") continue;

    const legacy = msg.toolResults;
    if (Array.isArray(legacy)) {
      for (const tr of legacy) {
        if (!isRecord(tr) || tr.toolName !== "createEvent") continue;
        const result = tr.result;
        if (isRecord(result) && result.success) out.push(result);
      }
    }

    const parts = msg.parts;
    if (!Array.isArray(parts)) continue;

    for (const part of parts) {
      if (!isRecord(part)) continue;
      const type = part.type;
      const isCreate =
        type === "tool-createEvent" ||
        (type === "dynamic-tool" && part.toolName === "createEvent");
      if (!isCreate) continue;
      if (part.state !== "output-available") continue;
      const output = part.output;
      if (isRecord(output) && output.success) out.push(output);
    }
  }

  return out;
}

/** Successful createGuestEvent tool outputs (for guest session handoff). */
export function extractGuestEventResultsFromMessages(
  messages: unknown[],
): GuestEventResult[] {
  const out: GuestEventResult[] = [];

  for (const msg of messages) {
    if (!isRecord(msg) || msg.role !== "assistant") continue;

    const legacy = msg.toolResults;
    if (Array.isArray(legacy)) {
      for (const tr of legacy) {
        if (!isRecord(tr) || tr.toolName !== "createGuestEvent") continue;
        const result = tr.result;
        if (
          isRecord(result) &&
          result.success === true &&
          typeof result.eventId === "string" &&
          typeof result.shareUrl === "string" &&
          typeof result.guestId === "string" &&
          typeof result.creatorName === "string"
        ) {
          out.push(result as unknown as GuestEventResult);
        }
      }
    }

    const parts = msg.parts;
    if (!Array.isArray(parts)) continue;

    for (const part of parts) {
      if (!isRecord(part)) continue;
      const type = part.type;
      const isCreateGuest =
        type === "tool-createGuestEvent" ||
        (type === "dynamic-tool" && part.toolName === "createGuestEvent");
      if (!isCreateGuest) continue;
      if (part.state !== "output-available") continue;
      const output = part.output;
      if (
        isRecord(output) &&
        output.success === true &&
        typeof output.eventId === "string" &&
        typeof output.shareUrl === "string" &&
        typeof output.guestId === "string" &&
        typeof output.creatorName === "string"
      ) {
        out.push(output as unknown as GuestEventResult);
      }
    }
  }

  return out;
}

/** Parse agent date strings (e.g. "Mon Mar 25", "Mar 25") for heatmap columns. */
export function parseSuggestedSlotDate(
  dateStr: string,
  reference: Date,
): Date | null {
  const s = dateStr.trim();
  const tryParse = (x: string): Date | null => {
    const d = new Date(x);
    return Number.isNaN(d.getTime()) ? null : d;
  };

  let d = tryParse(s);
  if (d) return d;

  const y = reference.getFullYear();
  if (!/\b\d{4}\b/.test(s)) {
    d = tryParse(`${s} ${y}`) ?? tryParse(`${s}, ${y}`);
    if (d) return d;
  }

  return null;
}
