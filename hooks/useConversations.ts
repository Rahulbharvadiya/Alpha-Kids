"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { Conversation, ChatMessage, CoachReply } from "@/lib/types";
import {
  STORAGE_KEY,
  newConversation,
  fallbackTitle,
  toApiMessages,
} from "@/lib/conversations";

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [activeDraft, setActiveDraft] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState<boolean>(false);

  const abortRef = useRef<AbortController | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Conversation[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setConversations(parsed);
          setActiveId(parsed[0].id);
          setMounted(true);
          return;
        }
      }
    } catch {
      // fallback to new
    }
    const fresh = newConversation();
    setActiveDraft(fresh);
    setActiveId(fresh.id);
    setMounted(true);
  }, []);

  // Save persisted conversations on changes
  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
    } catch {}
  }, [conversations, mounted]);

  // Active conversation is either in persisted list or in draft
  const activeConversation: Conversation | null =
    conversations.find((c) => c.id === activeId) ??
    (activeDraft && activeDraft.id === activeId ? activeDraft : null);

  const startNew = useCallback(() => {
    // Cancel pending request if any
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setLoading(false);
    setError(null);

    // If current conversation is already an empty draft, reuse it
    if (activeDraft && activeDraft.id === activeId && activeDraft.messages.length === 0) {
      return;
    }

    const fresh = newConversation();
    setActiveDraft(fresh);
    setActiveId(fresh.id);
  }, [activeDraft, activeId]);

  const select = useCallback(
    (id: string) => {
      if (id === activeId) return;
      if (abortRef.current) {
        abortRef.current.abort();
        abortRef.current = null;
      }
      setLoading(false);
      setError(null);
      setActiveId(id);
    },
    [activeId]
  );

  const togglePin = useCallback(
    (id: string) => {
      setConversations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, pinned: !c.pinned } : c))
      );
    },
    []
  );

  const remove = useCallback(
    (id: string) => {
      const next = conversations.filter((c) => c.id !== id);
      setConversations(next);

      if (activeId === id) {
        if (next.length > 0) {
          setActiveId(next[0].id);
          setActiveDraft(null);
        } else {
          const fresh = newConversation();
          setActiveDraft(fresh);
          setActiveId(fresh.id);
        }
      } else if (activeDraft?.id === id) {
        const fresh = newConversation();
        setActiveDraft(fresh);
        setActiveId(fresh.id);
      }
    },
    [conversations, activeId, activeDraft]
  );

  const executeCoachCall = useCallback(
    async (convId: string, messagesToSend: ChatMessage[], isFirstTurn: boolean) => {
      setLoading(true);
      setError(null);

      // Cancel previous abort controller
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        // P1-2 Fix: Slice on client before sending to ensure history never exceeds server validation limits
        const apiMessages = toApiMessages(messagesToSend).slice(-14);
        const res = await fetch("/api/coach", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: apiMessages,
            isFirstTurn,
          }),
          signal: controller.signal,
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          const code = errData.error;
          if (code === "rate_limited") {
            throw new Error("Too many requests right now. Please try again in a moment.");
          } else if (code === "server_misconfigured") {
            throw new Error("API key is not configured. Please add GROQ_API_KEY in .env.local.");
          } else {
            throw new Error("Something went wrong on our side. Please try again.");
          }
        }

        const reply: CoachReply = await res.json();
        const coachMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          reply,
          ts: Date.now(),
        };

        setConversations((prev) =>
          prev.map((c) => {
            if (c.id !== convId) return c;
            const newTitle =
              isFirstTurn && reply.title ? reply.title : c.title;
            return {
              ...c,
              title: newTitle,
              messages: [...c.messages, coachMsg],
              updatedAt: Date.now(),
            };
          })
        );
      } catch (err: unknown) {
        if ((err as Error)?.name === "AbortError") {
          return;
        }
        const msg =
          (err as Error)?.message ||
          "You appear to be offline. Check your connection and retry.";
        setError(msg);
      } finally {
        // P1-6 Fix: Only reset state if this controller is still the active one
        if (abortRef.current === controller) {
          setLoading(false);
          abortRef.current = null;
        }
      }
    },
    []
  );

  const send = useCallback(
    async (text: string) => {
      if (!text.trim() || loading) return;

      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: text.trim(),
        ts: Date.now(),
      };

      const currentConv = activeConversation;
      const isFirstTurn = !currentConv || currentConv.messages.length === 0;

      const updatedMessages = currentConv ? [...currentConv.messages, userMsg] : [userMsg];
      const convId = currentConv?.id ?? crypto.randomUUID();

      // Optimistically update conversation state
      if (isFirstTurn) {
        const newConv: Conversation = {
          id: convId,
          title: fallbackTitle(text),
          pinned: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          messages: updatedMessages,
        };
        setActiveDraft(null);
        setConversations((prev) => [newConv, ...prev.filter((c) => c.id !== convId)]);
        setActiveId(convId);
      } else {
        setConversations((prev) =>
          prev.map((c) =>
            c.id === convId
              ? { ...c, messages: updatedMessages, updatedAt: Date.now() }
              : c
          )
        );
      }

      await executeCoachCall(convId, updatedMessages, isFirstTurn);
    },
    [activeConversation, loading, executeCoachCall]
  );

  const retryLast = useCallback(async () => {
    if (!activeConversation || loading) return;
    const msgs = activeConversation.messages;
    const lastUserIdx = msgs.map((m) => m.role).lastIndexOf("user");
    if (lastUserIdx === -1) return;

    // P1-5 Fix: Prune any trailing messages after the user message and re-send without duplicating
    const trimmedMsgs = msgs.slice(0, lastUserIdx + 1);
    const isFirstTurn = trimmedMsgs.length === 1;

    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeConversation.id
          ? { ...c, messages: trimmedMsgs }
          : c
      )
    );

    setError(null);
    await executeCoachCall(activeConversation.id, trimmedMsgs, isFirstTurn);
  }, [activeConversation, loading, executeCoachCall]);

  return {
    conversations,
    activeId,
    activeConversation,
    loading,
    error,
    mounted,
    startNew,
    select,
    togglePin,
    remove,
    send,
    retryLast,
  };
}
