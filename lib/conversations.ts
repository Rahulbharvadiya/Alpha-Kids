import type { ChatMessage, Conversation } from "./types";

export const STORAGE_KEY = "alphakids:v1";

export const newConversation = (): Conversation => ({
  id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9),
  title: "New chat",
  pinned: false,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  messages: [],
});

// Fallback title if the model did not return one.
export function fallbackTitle(text: string): string {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length > 36 ? t.slice(0, 36).trimEnd() + "…" : t || "New chat";
}

// Convert UI messages into the compact API format.
export function toApiMessages(messages: ChatMessage[]) {
  return messages.map((m) =>
    m.role === "user"
      ? { role: "user" as const, content: m.content }
      : {
          role: "assistant" as const,
          content: [
            m.reply.understanding,
            m.reply.plan.length ? "Plan: " + m.reply.plan.join(" | ") : "",
            "Check-in: " + m.reply.followUp,
          ]
            .filter(Boolean)
            .join("\n"),
        }
  );
}

// Sidebar grouping: Pinned, Today, Yesterday, Previous 7 days, Older.
export function groupConversations(list: Conversation[]) {
  const sorted = [...list].sort((a, b) => b.updatedAt - a.updatedAt);
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const today = startOfDay(new Date());
  const DAY = 86_400_000;

  const groups: { label: string; items: Conversation[] }[] = [
    { label: "Pinned", items: [] },
    { label: "Today", items: [] },
    { label: "Yesterday", items: [] },
    { label: "Previous 7 days", items: [] },
    { label: "Older", items: [] },
  ];

  for (const c of sorted) {
    if (c.pinned) groups[0].items.push(c);
    else if (c.updatedAt >= today) groups[1].items.push(c);
    else if (c.updatedAt >= today - DAY) groups[2].items.push(c);
    else if (c.updatedAt >= today - 7 * DAY) groups[3].items.push(c);
    else groups[4].items.push(c);
  }
  return groups.filter((g) => g.items.length > 0);
}
