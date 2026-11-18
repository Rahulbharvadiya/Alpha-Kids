"use client";

import type { CoachReply } from "@/lib/types";
import { isRtl } from "@/lib/lang";
import Logo from "./Logo";
import { HelpCircle, Volume2, VolumeX } from "lucide-react";
import { useSpeech } from "@/hooks/useSpeech";

interface CoachCardProps {
  reply: CoachReply;
  isLatest: boolean;
  onQuickReply?: (text: string) => void;
}

export default function CoachCard({ reply, isLatest, onQuickReply }: CoachCardProps) {
  const { speaking, speak, stop } = useSpeech();
  const combinedText = [reply.understanding, ...reply.plan, reply.followUp].join(" ");
  const isUrdu = reply.language === "ur" || isRtl(combinedText);
  const dir = isUrdu ? "rtl" : "ltr";
  const urduClass = isUrdu ? "urdu" : "";

  const handleToggleSpeak = () => {
    if (speaking) {
      stop();
      return;
    }

    const textToSpeak = [
      reply.understanding,
      ...reply.plan,
      reply.followUp,
    ]
      .filter(Boolean)
      .join(". ");

    speak(textToSpeak, isUrdu);
  };

  return (
    <div
      dir={dir}
      className={`rounded-2xl border border-border bg-surface text-text p-5 max-w-2xl w-full my-2 shadow-xs transition-all ${urduClass}`}
    >
      {/* Title & Listen Speaker Button */}
      <div className="flex items-center justify-between mb-3 gap-2">
        <div className="flex items-center gap-2 text-accent font-heading font-semibold text-sm">
          <Logo className="h-4 w-4 shrink-0" size={16} />
          <span>{reply.title || (isUrdu ? "الفا کڈز کوچ" : "Alpha Kids Coach")}</span>
        </div>

        <button
          type="button"
          onClick={handleToggleSpeak}
          aria-label={speaking ? "Stop listening" : "Listen to answer"}
          title={speaking ? "Stop listening" : "Listen to voice response"}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-button transition-all cursor-pointer border ${
            speaking
              ? "border-accent bg-accent/15 text-accent"
              : "border-border bg-surface-2 text-muted hover:text-accent hover:border-accent"
          }`}
        >
          {speaking ? (
            <>
              <VolumeX className="h-3.5 w-3.5 animate-pulse text-accent" />
              <span className="font-medium text-accent">Stop</span>
            </>
          ) : (
            <>
              <Volume2 className="h-3.5 w-3.5" />
              <span>Listen</span>
            </>
          )}
        </button>
      </div>

      {/* Understanding */}
      <p className="text-base font-body text-text leading-relaxed mb-4">
        {reply.understanding}
      </p>

      {/* Suggested plan */}
      {reply.plan.length > 0 && (
        <div className="mb-4 space-y-2">
          <h4 className="text-xs uppercase tracking-wider font-heading font-semibold text-muted">
            {isUrdu ? "تجویز کردہ لائحہ عمل" : "Suggested Plan"}
          </h4>
          <ol className="space-y-2.5">
            {reply.plan.map((step, idx) => (
              <li key={idx} className="flex items-start gap-3 text-sm font-body text-text leading-relaxed">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent text-[var(--on-accent)] text-xs font-bold font-heading mt-0.5">
                  {idx + 1}
                </span>
                <span className="flex-1">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Follow-up check-in */}
      {reply.followUp && (
        <div className="mt-4 rounded-xl bg-surface-2 p-3.5 border border-border/50">
          <div className="flex items-start gap-2">
            <HelpCircle className="h-4 w-4 text-accent shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-body font-medium text-text leading-snug">
                {reply.followUp}
              </p>
            </div>
          </div>

          {/* Quick-reply buttons */}
          {reply.quickReplies && reply.quickReplies.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2 pt-2 border-t border-border/40">
              {reply.quickReplies.map((qr, idx) => (
                <button
                  key={idx}
                  type="button"
                  disabled={!isLatest}
                  onClick={() => onQuickReply && onQuickReply(qr)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-button transition-all text-left ${
                    isLatest
                      ? "bg-surface hover:bg-border text-text border border-border shadow-xs cursor-pointer hover:border-accent active:scale-95"
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
