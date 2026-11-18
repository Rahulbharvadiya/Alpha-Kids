"use client";

import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { ArrowUp, Mic, X, Check, Loader2, AlertCircle } from "lucide-react";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";

interface ComposerProps {
  onSend: (text: string) => void;
  loading: boolean;
}

export default function Composer({ onSend, loading }: ComposerProps) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const {
    isRecording,
    isTranscribing,
    duration,
    interimTranscript,
    error: audioError,
    isSupported: isAudioSupported,
    startRecording,
    stopRecording,
    cancelRecording,
    clearError,
  } = useAudioRecorder();

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

  // Stop recording and insert transcribed text into textarea for review
  const handleStopAndInsert = async () => {
    const transcribed = await stopRecording();
    if (transcribed) {
      setInput((prev) => (prev.trim() ? `${prev.trim()} ${transcribed}` : transcribed));
      if (textareaRef.current) {
        setTimeout(() => textareaRef.current?.focus(), 50);
      }
    }
  };

  // Stop recording and directly send to the coach
  const handleStopAndSend = async () => {
    const transcribed = await stopRecording();
    if (transcribed) {
      const combined = input.trim() ? `${input.trim()} ${transcribed}` : transcribed;
      const fullText = combined.slice(0, 1000).trim();
      if (fullText) {
        onSend(fullText);
        setInput("");
        if (textareaRef.current) {
          textareaRef.current.style.height = "auto";
        }
      }
    }
  };

  const formatDuration = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remSecs = secs % 60;
    return `${mins.toString().padStart(2, "0")}:${remSecs.toString().padStart(2, "0")}`;
  };

  const charCount = input.length;
  const isOverLimit = charCount > 1000;
  const showCount = charCount > 800;

  return (
    <div className="w-full">
      {/* Audio Error Banner */}
      {audioError && (
        <div className="mb-2 flex items-center justify-between gap-2 rounded-xl border border-[var(--danger-border)] bg-[var(--danger-bg)] px-3.5 py-2 text-xs text-[var(--danger-text)] shadow-2xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{audioError}</span>
          </div>
          <button
            type="button"
            onClick={clearError}
            aria-label="Dismiss error"
            className="text-[var(--danger-text)] opacity-70 hover:opacity-100 p-0.5 cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <div className="relative rounded-2xl border border-border bg-surface shadow-xs transition-colors focus-within:border-accent">
        {/* Active Audio Recording Overlay */}
        {isRecording ? (
          <div className="flex min-h-[56px] w-full items-center justify-between px-4 py-2.5">
            {/* Visualizer & Timer */}
            <div className="flex items-center gap-3 min-w-0 flex-1 mr-2">
              <div className="relative flex items-center justify-center">
                <span className="h-3 w-3 rounded-full bg-red-500 animate-ping absolute" />
                <span className="h-3 w-3 rounded-full bg-red-500 relative" />
              </div>

              {/* Sound wave animated bars */}
              <div className="flex items-center gap-0.5 h-4">
                <span className="w-1 bg-red-500/80 rounded-full animate-pulse h-2 [animation-duration:600ms]" />
                <span className="w-1 bg-red-500 rounded-full animate-pulse h-4 [animation-duration:400ms]" />
                <span className="w-1 bg-red-500/90 rounded-full animate-pulse h-3 [animation-duration:700ms]" />
                <span className="w-1 bg-red-500/70 rounded-full animate-pulse h-2 [animation-duration:500ms]" />
              </div>

              <span className="font-heading font-semibold text-xs tabular-nums text-text">
                {formatDuration(duration)}
              </span>

              {/* Live transcript or prompt */}
              <span className="text-xs text-muted truncate flex-1 font-body">
                {interimTranscript ? (
                  <span className="text-text font-medium italic">
                    &ldquo;{interimTranscript}&rdquo;
                  </span>
                ) : (
                  "Listening... Speak now..."
                )}
              </span>
            </div>

            {/* Action buttons while recording */}
            <div className="flex items-center gap-1.5 shrink-0">
              {/* Cancel Button */}
              <button
                type="button"
                onClick={cancelRecording}
                aria-label="Cancel recording"
                title="Cancel recording"
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-border bg-surface text-muted transition-all hover:bg-surface-2 hover:text-text cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>

              {/* Stop & Insert Button */}
              <button
                type="button"
                onClick={handleStopAndInsert}
                aria-label="Done speaking, review text"
                title="Done speaking, review text"
                className="flex h-8 px-2.5 items-center gap-1 rounded-xl border border-accent/40 bg-accent/10 text-accent transition-all hover:bg-accent/20 cursor-pointer text-xs font-button"
              >
                <Check className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Review</span>
              </button>

              {/* Stop & Send Button */}
              <button
                type="button"
                onClick={handleStopAndSend}
                aria-label="Send audio message"
                title="Send verbal message"
                className="flex h-8 px-3 items-center gap-1.5 rounded-xl bg-primary text-[var(--on-primary)] transition-all hover:opacity-90 cursor-pointer text-xs font-button shadow-2xs"
              >
                <ArrowUp className="h-3.5 w-3.5" />
                <span>Send</span>
              </button>
            </div>
          </div>
        ) : isTranscribing ? (
          /* Transcribing Spinner State */
          <div className="flex min-h-[56px] w-full items-center justify-center gap-2.5 px-4 py-3 text-xs text-muted">
            <Loader2 className="h-4 w-4 animate-spin text-accent" />
            <span className="font-heading font-medium">Processing your voice message...</span>
          </div>
        ) : (
          /* Standard Textarea with Voice & Send Buttons */
          <>
            <textarea
              ref={textareaRef}
              dir="auto"
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Share what's on your mind..."
              disabled={loading}
              maxLength={1000}
              className="w-full resize-none bg-transparent px-4 py-3.5 pr-24 text-sm font-body text-text placeholder:text-muted focus:outline-hidden disabled:opacity-50"
            />

            <div className="absolute right-2.5 bottom-2.5 flex items-center gap-1.5">
              {showCount && (
                <span
                  className={`text-xs select-none mr-1 ${
                    isOverLimit ? "text-[var(--danger-text)] font-semibold" : "text-muted"
                  }`}
                >
                  {charCount}/1000
                </span>
              )}

              {/* Microphone / Audio Button */}
              {isAudioSupported && (
                <button
                  type="button"
                  onClick={startRecording}
                  disabled={loading}
                  aria-label="Use microphone to verbally speak"
                  title="Speak with microphone"
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-surface text-muted transition-all
                             hover:bg-surface-2 hover:text-accent hover:border-accent disabled:cursor-not-allowed disabled:opacity-30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent cursor-pointer"
                >
                  <Mic className="h-4 w-4" />
                </button>
              )}

              {/* Send Button */}
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!input.trim() || loading || isOverLimit}
                aria-label="Send message"
                title="Send message"
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-[var(--on-primary)] transition-all
                           hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent cursor-pointer"
              >
                <ArrowUp className="h-4 w-4" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
