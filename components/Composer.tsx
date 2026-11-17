"use client";

import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { ArrowUp } from "lucide-react";

interface ComposerProps {
  onSend: (text: string) => void;
  loading: boolean;
}

export default function Composer({ onSend, loading }: ComposerProps) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-grow textarea up to ~6 lines
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const newHeight = Math.min(el.scrollHeight, 160);
    el.style.height = `${Math.max(newHeight, 48)}px`;
  }, [input]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.nativeEvent.isComposing) return;
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    const trimmed = input.trim();
    if (!trimmed || loading || trimmed.length > 1000) return;
    onSend(trimmed);
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const charCount = input.length;
  const isOverLimit = charCount > 1000;
  const showCount = charCount > 800;

  return (
    <div className="w-full">
      <div className="relative rounded-2xl border border-border bg-surface shadow-xs transition-colors focus-within:border-accent">
        <textarea
          ref={textareaRef}
          dir="auto"
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Share what's on your mind in English or اردو..."
          disabled={loading}
          maxLength={1200}
          className="w-full resize-none bg-transparent px-4 py-3.5 pr-14 text-sm font-body text-text placeholder:text-muted focus:outline-hidden disabled:opacity-50"
        />

        <div className="absolute right-2.5 bottom-2.5 flex items-center gap-2">
          {showCount && (
            <span
              className={`text-xs select-none ${
                isOverLimit ? "text-[var(--danger-text)] font-semibold" : "text-muted"
              }`}
            >
              {charCount}/1000
            </span>
          )}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!input.trim() || loading || isOverLimit}
            aria-label="Send message"
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-[var(--on-primary)] transition-all
                       hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent cursor-pointer"
          >
            <ArrowUp className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
