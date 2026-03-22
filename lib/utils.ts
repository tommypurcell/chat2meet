export function cn(
  ...classes: (string | false | undefined | null)[]
): string {
  return classes.filter(Boolean).join(" ");
}

/**
 * UIMessage `parts` can include multiple `text` entries after a multi-step agent run
 * (e.g. text before tools + same summary after tools). Rendering each part repeats
 * the paragraph. Collapse identical text parts; join distinct parts with blank lines.
 */
export function mergeUiMessageTextParts(
  parts: { type: string; text?: string }[] | undefined,
): string {
  if (!parts?.length) return "";
  const texts = parts
    .filter(
      (p): p is { type: "text"; text: string } =>
        p.type === "text" && typeof p.text === "string",
    )
    .map((p) => p.text);
  if (texts.length === 0) return "";
  if (texts.length === 1) return texts[0];
  if (texts.every((t) => t === texts[0])) return texts[0];
  return texts.join("\n\n");
}
