"use client";

import { useEffect, useRef } from "react";
import type { Conversation } from "@/lib/types";
import CoachCard from "./CoachCard";
import CrisisCard from "./CrisisCard";
import Composer from "./Composer";
import Disclaimer from "./Disclaimer";
import Logo from "./Logo";
import { isRtl } from "@/lib/lang";
import { AlertCircle, RefreshCw } from "lucide-react";

interface ChatViewProps {
  conversation: Conversation | null;
  loading: boolean;
  error: string | null;
  onSend: (text: string) => void;
  onRetry: () => void;
}

const STARTER_CHIPS = [
  "My 5-year-old has tantrums when screen time ends",
  "My child won't go to sleep at bedtime",
  "میرا بچہ سونے سے پہلے ضد کرتا ہے",
];

export default function ChatView({
  conversation,
  loading,
  error,
  onSend,
  onRetry,
}: ChatViewProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const messages = conversation?.messages ?? [];
  const isEmpty = messages.length === 0;

  // Auto-scroll on new message or loading change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, loading, error]);

  return (
    <div className="flex flex-1 flex-col h-full overflow-hidden bg-bg">
      {/* Scrollable Message List / Empty State */}
      <div
        className="flex-1 overflow-y-auto px-4 py-6 md:px-8"
        aria-live="polite"
      >
        <div className="mx-auto max-w-3xl flex flex-col justify-end min-h-full">
          {isEmpty ? (
            <div className="my-auto flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-surface border border-border shadow-xs">
                <Logo className="h-10 w-10" size={40} />
              </div>
              <h1 className="font-heading text-2xl md:text-3xl font-semibold tracking-tight text-text mb-3">
                How can I support you today?
              </h1>
              <p className="max-w-md text-sm text-muted mb-8 leading-relaxed font-body">
                Share what&apos;s on your mind in English or اردو—whether you need practical guidance, a step-by-step plan, or support on an overwhelming day.
              </p>

              {/* Starter Chips */}
              <div className="flex flex-wrap items-center justify-center gap-2 max-w-lg">
                {STARTER_CHIPS.map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => onSend(chip)}
                    className="rounded-xl border border-border bg-surface px-4 py-2.5 text-xs md:text-sm font-button text-text shadow-2xs transition-all hover:bg-surface-2 hover:border-accent hover:shadow-xs active:scale-[0.98] cursor-pointer"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6 pb-4">
              {messages.map((msg, index) => {
                const isUser = msg.role === "user";
                const isLatestCoach = !isUser && index === messages.length - 1;

                if (isUser) {
                  const rtl = isRtl(msg.content);
                  return (
                    <div
                      key={msg.id}
                      className="flex justify-end"
                      dir={rtl ? "rtl" : "ltr"}
                    >
                      <div
                        className={`max-w-[85%] md:max-w-xl rounded-2xl rounded-tr-xs bg-surface-2 px-4 py-3 text-sm font-body text-text leading-relaxed shadow-2xs whitespace-pre-wrap ${
                          rtl ? "urdu" : ""
                        }`}
                      >
                        {msg.content}
                      </div>
                    </div>
                  );
                }

                // Coach Message
                const reply = msg.reply;
                const isCrisis =
                  reply.mode === "emergency" ||
                  reply.mode === "abuse" ||
                  reply.mode === "self_harm";

                return (
                  <div key={msg.id} className="flex justify-start">
                    {isCrisis ? (
                      <CrisisCard
                        reply={reply}
                        isLatest={isLatestCoach && !loading}
                        onQuickReply={onSend}
                      />
                    ) : (
                      <CoachCard
                        reply={reply}
                        isLatest={isLatestCoach && !loading}
                        onQuickReply={onSend}
                      />
                    )}
                  </div>
                );
              })}

              {/* Loading indicator */}
              {loading && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-2.5 rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-muted shadow-2xs">
                    <span className="font-heading font-medium text-xs">Thinking</span>
                    <div className="flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-accent animate-bounce [animation-delay:-0.3s]" />
                      <span className="h-1.5 w-1.5 rounded-full bg-accent animate-bounce [animation-delay:-0.15s]" />
                      <span className="h-1.5 w-1.5 rounded-full bg-accent animate-bounce" />
                    </div>
                  </div>
                </div>
              )}

              {/* Error indicator */}
              {error && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-3 rounded-xl border border-[var(--danger-border)] bg-[var(--danger-bg)] px-4 py-3 text-xs text-[var(--danger-text)] shadow-xs max-w-lg">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span className="flex-1">{error}</span>
                    <button
                      type="button"
                      onClick={onRetry}
                      className="flex items-center gap-1 rounded-md bg-[var(--danger-text)] text-white px-2.5 py-1 font-medium hover:opacity-90 active:scale-95 transition-all cursor-pointer"
                    >
                      <RefreshCw className="h-3 w-3" />
                      <span>Retry</span>
                    </button>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Composer & Disclaimer pinned at bottom */}
      <div className="border-t border-border/40 bg-bg px-4 pt-3 pb-2 md:px-8">
        <div className="mx-auto max-w-3xl">
          <Composer onSend={onSend} loading={loading} />
          <Disclaimer />
        </div>
      </div>
    </div>
  );
}
