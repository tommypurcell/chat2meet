import { Fragment } from "react";
import { cn } from "@/lib/utils";

type Segment = { kind: "text"; text: string } | { kind: "url"; raw: string };

/** http(s) URLs and bare www.… (https:// added on click) */
const URL_REGEX =
  /https?:\/\/[^\s<>"'{}|\\^`[\]]+|www\.[^\s<>"'{}|\\^`[\]]+/gi;

export function splitChatMessageSegments(text: string): Segment[] {
  if (!text) return [];
  const segments: Segment[] = [];
  const re = new RegExp(URL_REGEX.source, URL_REGEX.flags);
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) {
      segments.push({ kind: "text", text: text.slice(last, m.index) });
    }
    segments.push({ kind: "url", raw: m[0] });
    last = m.index + m[0].length;
  }
  if (last < text.length) {
    segments.push({ kind: "text", text: text.slice(last) });
  }
  return segments;
}

function hrefForUrl(raw: string): string {
  if (raw.startsWith("www.")) return `https://${raw}`;
  return raw;
}

const linkClass = cn(
  "break-all font-medium text-[var(--text-link)] underline underline-offset-2 hover:opacity-90",
  "[text-decoration-color:color-mix(in_srgb,var(--text-link)_55%,transparent)]",
  "focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2",
  "focus-visible:outline-offset-2 focus-visible:outline-[var(--border-focused)]",
);

export function ChatMessageText({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  if (!text) {
    return <span className={cn("whitespace-pre-wrap", className)} />;
  }

  const segments = splitChatMessageSegments(text);

  return (
    <span className={cn("whitespace-pre-wrap", className)}>
      {segments.map((seg, i) =>
        seg.kind === "text" ? (
          <Fragment key={i}>{seg.text}</Fragment>
        ) : (
          <a
            key={i}
            href={hrefForUrl(seg.raw)}
            target="_blank"
            rel="noopener noreferrer"
            className={linkClass}
          >
            {seg.raw}
          </a>
        ),
      )}
    </span>
  );
}
