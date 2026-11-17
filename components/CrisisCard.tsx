import { AlertTriangle, ShieldCheck, HeartHandshake } from "lucide-react";
import type { CoachReply } from "@/lib/types";
import { isRtl } from "@/lib/lang";

interface CrisisCardProps {
  reply: CoachReply;
  isLatest?: boolean;
  onQuickReply?: (text: string) => void;
}

export default function CrisisCard({ reply, isLatest = false, onQuickReply }: CrisisCardProps) {
  const isUrdu = reply.language === "ur" || isRtl(reply.understanding + " " + reply.followUp);
  const dir = isUrdu ? "rtl" : "ltr";
  const urduClass = isUrdu ? "urdu" : "";

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
      {/* Header with appropriate supportive icon */}
      <div className="flex items-center gap-2 mb-3.5 font-heading font-semibold text-sm tracking-wide">
        {reply.mode === "emergency" ? (
          <AlertTriangle className="h-5 w-5 shrink-0 animate-pulse text-[var(--danger-text)]" />
        ) : reply.mode === "self_harm" ? (
          <HeartHandshake className="h-5 w-5 shrink-0 text-[var(--danger-text)]" />
        ) : (
          <ShieldCheck className="h-5 w-5 shrink-0 text-[var(--danger-text)]" />
        )}
        <span>{titleText}</span>
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
