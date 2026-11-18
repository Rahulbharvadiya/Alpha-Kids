import type { CoachReply } from "./types";
import { fixedCrisisReply } from "./safety";

// Block clear violations of "no diagnosis, no medical or legal instructions".
// Evaluated across English, Urdu script, and Roman Urdu.
const FORBIDDEN: RegExp[] = [
  // --- Dosages (English, Roman Urdu, Urdu script) ---
  /\b\d+(\.\d+)?\s?(mg|ml|mcg|tablets?|pills?|drops|g|grams)\b/i,
  /\b\d+(\.\d+)?\s?(goli|goliyan|chamach|boond)\b/i,
  /\d+(\.\d+)?\s*(ملی\s*گرام|ایم\s*ایل|گولی|گولیاں|قطرے|چمچ)/,

  // --- Specific Medications (English, Roman Urdu, Urdu script) ---
  /\b(ibuprofen|paracetamol|acetaminophen|antibiotic|aspirin|melatonin|panadol|calpol|brufen|disprin)\b/i,
  /(پیراسیٹامول|بروفین|پیناڈول|بروفن|اسپرین|اینٹی\s*بائیوٹک|میلاٹونن|ڈسپرین|کیلپول)/,

  // --- Medical & Psychiatric Diagnoses (English, Roman Urdu, Urdu script) ---
  /\b(your child|he|she|they|child)\s+(has|have|may have|might have|is suffering from|suffers from|showing symptoms of|shows signs of)\s+(adhd|autism|asd|depression|anxiety disorder|ocd|dyslexia|bipolar)\b/i,
  /\b(diagnos(e|is|ed|ing)\s+(with|as))\b/i,
  /\b(symptoms of|signs of)\s+(adhd|autism|depression|anxiety disorder)\b/i,
  /\b(adhd|autism|depression)\s+(hai|ho sakta hai|ka shikar)\b/i,
  /(بچے کو|اسے)?\s*(اے ڈی ایچ ڈی|آٹزم|ڈپریشن|ذہنی دباؤ کی بیماری)\s*(ہے|ہو سکتا ہے|کی تشخیص|کی علامات)/,

  // --- Legal Advice & Directives (English, Roman Urdu, Urdu script) ---
  /\b(you should|you must|you need to|recommend)\s+(sue|file a lawsuit|file for custody|get a restraining order|take legal action|hire a lawyer|go to court)\b/i,
  /\b(court jao|case karo|custody ka case|kanoni karwai)\b/i,
  /(عدالت جائیں|مقدمہ کریں|کسٹڈی کا کیس|قانونی کارروائی کریں)/,
];

export function guardReply(reply: CoachReply, ur: boolean): CoachReply {
  // P0-4 Fix: Crisis modes PRECEDES everything. An emergency or self-harm reply
  // must NEVER be downgraded to a normal generic fallback, even if it mentions safety dosages.
  if (reply.mode === "self_harm") return { ...fixedCrisisReply("self_harm", ur) };
  if (reply.mode === "emergency") return { ...fixedCrisisReply("emergency", ur) };

  const blob = [reply.understanding, ...reply.plan, reply.followUp].join(" ");
  if (FORBIDDEN.some((re) => re.test(blob))) {
    const safe = fixedGeneralFallback(ur);
    return { ...safe, title: reply.title ?? safe.title };
  }

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
