import { z } from "zod";

export const MODES = ["normal", "emergency", "abuse", "self_harm"] as const;
export type Mode = (typeof MODES)[number];

export const CoachReplySchema = z.object({
  mode: z.enum(MODES),
  language: z.enum(["en", "ur"]),
  title: z.string().max(100).optional(), // first turn only
  understanding: z.string().max(800),
  plan: z.array(z.string().max(400)).max(6), // empty for crisis modes
  followUp: z.string().max(400),
  quickReplies: z.array(z.string().max(80)).max(4).default([]),
});
export type CoachReply = z.infer<typeof CoachReplySchema>;

export const ApiRequestSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(2000),
      })
    )
    .min(1)
    .max(50),
  isFirstTurn: z.boolean().default(false),
});
export type ApiRequest = z.infer<typeof ApiRequestSchema>;

// Client-side message shapes
export type UserMessage = { id: string; role: "user"; content: string; ts: number };
export type CoachMessage = { id: string; role: "assistant"; reply: CoachReply; ts: number };
export type ChatMessage = UserMessage | CoachMessage;

export type Conversation = {
  id: string;
  title: string;
  pinned: boolean;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
};
