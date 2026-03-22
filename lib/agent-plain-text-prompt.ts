/**
 * Appended to agent system prompts so user-facing replies never use Markdown.
 */
export const AGENT_PLAIN_TEXT_OUTPUT_RULES = `
OUTPUT FORMAT (mandatory — applies to every message you write to the user):
- Use plain text only. Never use Markdown or any markup: no asterisks for emphasis, no hash headings, no hyphen or asterisk bullet syntax, no bracket-and-parenthesis links, no code fences, and no HTML tags.
- Use normal sentences and line breaks. For lists, use numbered lines like "1) ..." or short paragraphs.
- Any text you pass to tools for the user (e.g. the suggestTimes explanation) must also be plain text with no Markdown.`;
