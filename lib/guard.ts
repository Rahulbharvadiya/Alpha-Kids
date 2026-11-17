import type { CoachReply } from "./types";
import { fixedCrisisReply } from "./safety";

// Block clear violations of "no diagnosis, no medical or legal instructions".
const FORBIDDEN: RegExp[] = [
  /\b\d+(\.\d+)?\s?(mg|ml|mcg|tablets?|pills?|drops)\b/i, // dosages
  /\b(give|take|administer)\b.{0,40}\b(ibuprofen|paracetamol|acetaminophen|antibiotic|aspirin|melatonin)\b/i,
  /\b(your child|he|she) (has|is suffering from|suffers from) (adhd|autism|asd|depression|anxiety disorder|ocd|dyslexia)\b/i,
  /\b(you should|you must|you need to) (sue|file a lawsuit|file for custody|get a restraining order)\b/i,
  /\b(diagnos(e|is|ed) (with|as))\b/i,
];

export function guardReply(reply: CoachReply, ur: boolean): CoachReply {
  const blob = [reply.understanding, ...reply.plan, reply.followUp].join(" ");
  if (FORBIDDEN.some((re) => re.test(blob))) {
    const safe = fixedGeneralFallback(ur);
    return { ...safe, title: reply.title ?? safe.title };
  }
  if (reply.mode === "self_harm") return { ...fixedCrisisReply("self_harm", ur) };
  if (reply.mode === "emergency") return { ...fixedCrisisReply("emergency", ur) };
  return reply;
}

function fixedGeneralFallback(ur: boolean): CoachReply {
  return ur
    ? {
        mode: "normal",
        language: "ur",
        title: "رہنمائی",
        understanding: "میں اس سوال پر تشخیص یا طبی اور قانونی ہدایات نہیں دے سکتا۔ اس کے لیے ماہر سے بات کرنا بہتر ہے۔",
        plan: ["اپنے بچے کے ڈاکٹر یا متعلقہ ماہر سے رابطہ کریں۔", "اپنی تشویش کی مثالیں لکھ لیں تاکہ ملاقات میں آسانی ہو۔"],
        followUp: "کیا آپ روزمرہ معمول یا رویے کے بارے میں عمومی تجاویز چاہیں گے؟",
        quickReplies: [],
      }
    : {
        mode: "normal",
        language: "en",
        title: "Guidance",
        understanding: "I can't diagnose or give medical or legal instructions. A qualified professional is the right person for that.",
        plan: ["Talk with your child's doctor or the relevant professional.", "Write down specific examples of what worries you to make that visit easier."],
        followUp: "Would you like general tips on routines or behaviour in the meantime?",
        quickReplies: [],
      };
}
