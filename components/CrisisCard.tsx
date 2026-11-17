import { AlertTriangle, ShieldAlert } from "lucide-react";
import type { CoachReply } from "@/lib/types";
import { isRtl } from "@/lib/lang";

interface CrisisCardProps {
  reply: CoachReply;
}

export default function CrisisCard({ reply }: CrisisCardProps) {
  const isUrdu = reply.language === "ur" || isRtl(reply.understanding + " " + reply.followUp);
  const dir = isUrdu ? "rtl" : "ltr";
  const urduClass = isUrdu ? "urdu" : "";

  const titleText =
    reply.title ||
    (reply.mode === "emergency"
      ? (isUrdu ? "ہنگامی صورتحال" : "Emergency help")
      : reply.mode === "self_harm"
      ? (isUrdu ? "فوری مدد" : "Urgent support")
      : (isUrdu ? "بچے کی حفاظت" : "Child safety"));

  return (
    <div
      role="alert"
      dir={dir}
      className={`rounded-2xl border p-5 max-w-2xl w-full my-2 shadow-sm transition-all
        bg-[var(--danger-bg)] border-[var(--danger-border)] text-[var(--danger-text)] ${urduClass}`}
    >
      <div className="flex items-center gap-2 mb-3 font-semibold font-heading text-sm tracking-wide uppercase">
        {reply.mode === "emergency" ? (
          <AlertTriangle className="h-5 w-5 shrink-0 animate-pulse text-[var(--danger-text)]" />
        ) : (
          <ShieldAlert className="h-5 w-5 shrink-0 text-[var(--danger-text)]" />
        )}
        <span>{titleText}</span>
      </div>

      <p className="text-base font-body leading-relaxed mb-4 font-medium opacity-95">
        {reply.understanding}
      </p>

      {reply.plan.length > 0 && (
        <div className="space-y-2 mb-4">
          <ol className="list-decimal list-inside space-y-2 text-sm font-body leading-relaxed font-semibold">
            {reply.plan.map((step, idx) => (
              <li key={idx} className="pl-1">
                <span className="font-normal">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {reply.followUp && (
        <div className="pt-3 border-t border-[var(--danger-border)]/60 text-sm font-body font-medium">
          {reply.followUp}
        </div>
      )}
    </div>
  );
}
