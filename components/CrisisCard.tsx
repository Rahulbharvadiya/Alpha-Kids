"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, ShieldCheck, HeartHandshake, Volume2, VolumeX } from "lucide-react";
import type { CoachReply } from "@/lib/types";
import { isRtl } from "@/lib/lang";

interface CrisisCardProps {
  reply: CoachReply;
  isLatest?: boolean;
  onQuickReply?: (text: string) => void;
}

export default function CrisisCard({ reply, isLatest = false, onQuickReply }: CrisisCardProps) {
  const [speaking, setSpeaking] = useState(false);
  const isUrdu = reply.language === "ur" || isRtl(reply.understanding + " " + reply.followUp);
  const dir = isUrdu ? "rtl" : "ltr";
  const urduClass = isUrdu ? "urdu" : "";

  // Stop speech when unmounting
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleToggleSpeak = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel();

    const textToSpeak = [
      reply.understanding,
      ...reply.plan,
      reply.followUp,
    ]
      .filter(Boolean)
      .join(". ");

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = isUrdu ? "ur-PK" : "en-US";
    utterance.rate = 0.95;

    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find((v) =>
      isUrdu ? v.lang.startsWith("ur") : v.lang.startsWith("en")
    );
    if (voice) {
      utterance.voice = voice;
    }

    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);

    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const titleText =
    reply.title ||
    (reply.mode === "emergency"
      ? (isUrdu ? "ہنگامی طبی مدد" : "Emergency Help")
      : reply.mode === "self_harm"
      ? (isUrdu ? "فوری جذباتی مدد" : "Urgent Support")
      : (isUrdu ? "بچے کی حفاظت اور فوری مدد" : "Support & Child Safety"));

  return (
    <div
      role="alert"
      dir={dir}
      className={`rounded-2xl border p-5 max-w-2xl w-full my-2 shadow-xs transition-all
        bg-[var(--danger-bg)] border-[var(--danger-border)] text-[var(--danger-text)] ${urduClass}`}
    >
      {/* Header with appropriate supportive icon & Listen button */}
      <div className="flex items-center justify-between mb-3.5 gap-2">
        <div className="flex items-center gap-2 font-heading font-semibold text-sm tracking-wide">
          {reply.mode === "emergency" ? (
            <AlertTriangle className="h-5 w-5 shrink-0 animate-pulse text-[var(--danger-text)]" />
          ) : reply.mode === "self_harm" ? (
            <HeartHandshake className="h-5 w-5 shrink-0 text-[var(--danger-text)]" />
          ) : (
            <ShieldCheck className="h-5 w-5 shrink-0 text-[var(--danger-text)]" />
          )}
          <span>{titleText}</span>
        </div>

        <button
          type="button"
          onClick={handleToggleSpeak}
          aria-label={speaking ? "Stop listening" : "Listen to answer"}
          title={speaking ? "Stop listening" : "Listen to response"}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-button transition-all cursor-pointer border ${
            speaking
              ? "border-[var(--danger-text)] bg-[var(--danger-text)] text-white"
              : "border-[var(--danger-border)] bg-surface/80 text-text hover:border-[var(--danger-text)]"
          }`}
        >
          {speaking ? (
            <>
              <VolumeX className="h-3.5 w-3.5 animate-pulse" />
              <span className="font-medium">Stop</span>
            </>
          ) : (
            <>
              <Volume2 className="h-3.5 w-3.5" />
              <span>Listen</span>
            </>
          )}
        </button>
      </div>

      {/* Gentle, validating, de-escalating understanding */}
      <p className="text-base font-body leading-relaxed mb-4 font-normal text-text">
        {reply.understanding}
      </p>

      {/* Structured, non-judgmental protective plan */}
      {reply.plan.length > 0 && (
        <div className="space-y-2 mb-4">
          <ol className="space-y-2 text-sm font-body leading-relaxed text-text">
            {reply.plan.map((step, idx) => (
              <li key={idx} className="flex items-start gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--danger-border)] text-[var(--danger-text)] text-xs font-bold font-heading mt-0.5">
                  {idx + 1}
                </span>
                <span className="flex-1 font-medium">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Check-in question and quick reply buttons */}
      {reply.followUp && (
        <div className="pt-3 border-t border-[var(--danger-border)]/60 text-sm font-body">
          <p className="font-medium text-text leading-snug mb-2">
            {reply.followUp}
          </p>

          {reply.quickReplies && reply.quickReplies.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {reply.quickReplies.map((qr, idx) => (
                <button
                  key={idx}
                  type="button"
                  disabled={!isLatest}
                  onClick={() => onQuickReply && onQuickReply(qr)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-button transition-all text-left ${
                    isLatest
                      ? "bg-surface hover:bg-surface-2 text-text border border-[var(--danger-border)] shadow-xs cursor-pointer hover:border-[var(--danger-text)] active:scale-95"
                      : "bg-surface/50 text-muted border border-border/40 cursor-not-allowed opacity-60"
                  }`}
                >
                  {qr}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
