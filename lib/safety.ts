import type { CoachReply, Mode } from "./types";

// Map Arabic variants to Urdu forms, strip diacritics and tatweel,
// convert Eastern digits, lowercase and collapse whitespace.
export function normalize(input: string): string {
  return input
    .normalize("NFKC")
    .replace(/[\u064B-\u065F\u0670\u0640]/g, "") // diacritics, tatweel
    .replace(/\u064A|\u0649/g, "\u06CC") // ي ى -> ی
    .replace(/\u0643/g, "\u06A9") // ك -> ک
    .replace(/[\u06BE\u06C1\u0647]/g, "\u06C1") // unify heh forms -> ہ
    .replace(/[\u06F0-\u06F9\u0660-\u0669]/g, (d) =>
      String(d.charCodeAt(0) & 0xf)
    )
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

type Rule = { mode: Exclude<Mode, "normal">; level: "hard" | "soft"; re: RegExp };

// Patterns are applied to normalized text. Keep them readable and easy to extend.
// Broad matches are acceptable here: a false alarm is far safer than a miss.
const RULES: Rule[] = [
  // ---- Self-harm (hard) ----
  {
    mode: "self_harm",
    level: "hard",
    re: /(kill myself|end my life|suicid|want to die|wanna die|hurt myself|harm myself|no reason to live|better off without me)/,
  },
  {
    mode: "self_harm",
    level: "hard",
    re: /(khudkushi|khud kushi|marna chahta|marna chahti|apni jaan|jaan dena|mar jana chahta|mar jana chahti)/,
  },
  {
    mode: "self_harm",
    level: "hard",
    re: /(خودکشی|خود کشی|مرنا چاہت|مر جانا چاہت|اپنی جان|خود کو نقصان|زندگی ختم)/,
  },

  // ---- Emergency (hard) ----
  {
    mode: "emergency",
    level: "hard",
    re: /(not breathing|can'?t breathe|cannot breathe|stopped breathing|choking|unconscious|unresponsive|seizure|convulsing|bleeding (heavily|a lot|badly)|swallowed (a )?(battery|magnet|pill|pills|poison|bleach|detergent)|overdos|poison|drown|severe burn|anaphyla|ambulance|turning blue)/,
  },
  {
    mode: "emergency",
    level: "hard",
    re: /(saans nahi|sans nahi|behosh|bayhosh|khoon (beh|bah)|zehar|zahar|nigal liya|doob gaya|doob gayi|daura pada|dora para|ambulance)/,
  },
  {
    mode: "emergency",
    level: "hard",
    re: /(سانس نہیں|بے ہوش|بیہوش|خون بہہ|خون بہ رہا|زہر|نگل لیا|ڈوب|دورہ پڑ|ایمبولینس|نیلا پڑ)/,
  },

  // ---- Abuse (soft: let the model handle tone, with a safety-first hint) ----
  {
    mode: "abuse",
    level: "soft",
    re: /(abus|molest|sexual(ly)?|inappropriate(ly)? touch|beat(ing)? (him|her|the child|my child|my son|my daughter)|hit (him|her|my child|my son|my daughter)|hurt (him|her|my child)|afraid (he|she|they) (will|might) hurt|scared i('m| am)? going to hurt|lose control with (him|her|my child)|being hurt)/,
  },
  {
    mode: "abuse",
    level: "soft",
    re: /(\bma+r(a|i|e|ta|ti|na|ne|unga|ungi)?\b|peet(a|i|na|ne)?|pit(ta|ti|ai)|marpeet|zulm|tashaddud|jinsi|ghalat tareeqe se chhua)/,
  },
  {
    mode: "abuse",
    level: "soft",
    re: /(بدسلوکی|جنسی|مار پیٹ|مارتا ہوں|مارتی ہوں|مارا ہے|مارا|تشدد|ظلم|غلط طریقے سے چھو)/,
  },
];

const SEVERITY: Record<Mode, number> = { normal: 0, abuse: 1, emergency: 2, self_harm: 3 };
const LEVEL_RANK: Record<"none" | "soft" | "hard", number> = { none: 0, soft: 1, hard: 2 };

export type Risk = { level: "none" | "soft" | "hard"; mode: Mode };

export function assessRisk(text: string): Risk {
  const t = normalize(text);
  let best: Risk = { level: "none", mode: "normal" };
  for (const r of RULES) {
    if (!r.re.test(t)) continue;
    const better =
      LEVEL_RANK[r.level] > LEVEL_RANK[best.level] ||
      (r.level === best.level && SEVERITY[r.mode] > SEVERITY[best.mode]);
    if (better) best = { level: r.level, mode: r.mode };
  }
  return best;
}

export function mostSevere(a: Mode, b: Mode): Mode {
  return SEVERITY[a] >= SEVERITY[b] ? a : b;
}

export const hasUrdu = (t: string) => /[\u0600-\u06FF]/.test(t);

// ---- Fixed crisis replies (no model involved) ----
// Emergency numbers differ by country. Keep the text region-neutral and
// verify any number before adding it. Example constants for demo purposes only.
const EXAMPLE_NUMBERS_EN = "For example, 112 in India or 999 in the UAE. Numbers differ by country.";
const EXAMPLE_NUMBERS_UR = "مثال کے طور پر بھارت میں 112 یا متحدہ عرب امارات میں 999۔ نمبر ہر ملک میں مختلف ہوتے ہیں۔";

export function fixedCrisisReply(mode: Exclude<Mode, "normal">, ur: boolean): CoachReply {
  if (mode === "emergency") {
    return ur
      ? {
          mode,
          language: "ur",
          title: "ہنگامی صورتحال",
          understanding: "یہ ایک ہنگامی صورتحال لگتی ہے۔ اس وقت فوری مدد سب سے اہم ہے۔",
          plan: [
            "ابھی اپنے علاقے کی ہنگامی سروس کو کال کریں۔ " + EXAMPLE_NUMBERS_UR,
            "بچے کے ساتھ رہیں اور اگر قریب کوئی بالغ ہے تو اسے فوراً بلائیں۔",
            "ہنگامی سروس کی ہدایات پر عمل کریں۔",
          ],
          followUp: "کیا آپ نے مدد کے لیے کال کر لی ہے؟",
          quickReplies: [],
        }
      : {
          mode,
          language: "en",
          title: "Emergency help",
          understanding: "This sounds like an emergency. Getting help right now matters more than anything else.",
          plan: [
            "Call your local emergency number now. " + EXAMPLE_NUMBERS_EN,
            "Stay with your child, and call any adult nearby to help right away.",
            "Follow the instructions the emergency operator gives you.",
          ],
          followUp: "Have you been able to call for help?",
          quickReplies: [],
        };
  }
  if (mode === "self_harm") {
    return ur
      ? {
          mode,
          language: "ur",
          title: "فوری مدد",
          understanding: "آپ نے جو بتایا وہ بہت سنجیدہ ہے، اور آپ کی حفاظت سب سے پہلے ہے۔ آپ اس میں اکیلے نہیں ہیں۔",
          plan: [
            "اگر آپ اس وقت خطرے میں ہیں تو ابھی اپنی مقامی ہنگامی سروس کو کال کریں۔ " + EXAMPLE_NUMBERS_UR,
            "کسی قابلِ اعتماد شخص کو ابھی اپنے پاس بلائیں، جیسے خاندان کا فرد، دوست یا پڑوسی۔",
            "اپنے علاقے کی بحران یا ذہنی صحت کی ہیلپ لائن سے رابطہ کریں۔",
          ],
          followUp: "کیا آپ کے پاس اس وقت کوئی ہے جو آپ کے ساتھ رہ سکے؟",
          quickReplies: [],
        }
      : {
          mode,
          language: "en",
          title: "Urgent support",
          understanding: "What you shared is serious, and your safety comes first. You are not alone in this.",
          plan: [
            "If you may act on these thoughts, call your local emergency number now. " + EXAMPLE_NUMBERS_EN,
            "Ask someone you trust to come be with you right away, such as family, a friend or a neighbour.",
            "Contact a crisis or mental health helpline in your area.",
          ],
          followUp: "Is there someone who can be with you right now?",
          quickReplies: [],
        };
  }
  // abuse (used only by the output guard fallback)
  return ur
    ? {
        mode,
        language: "ur",
        title: "بچے کی حفاظت",
        understanding: "آپ نے یہ بتایا، یہ آسان نہیں تھا۔ بچے کی فوری حفاظت سب سے پہلے ہے۔",
        plan: [
          "اگر بچہ ابھی خطرے میں ہے تو فوراً ہنگامی سروس کو کال کریں۔",
          "بچے کو محفوظ جگہ اور کسی قابلِ اعتماد بالغ کے پاس رکھیں۔",
          "اپنے علاقے کی چائلڈ پروٹیکشن سروس یا کسی ماہر سے رابطہ کریں۔",
        ],
        followUp: "کیا بچہ اس وقت محفوظ ہے؟",
        quickReplies: [],
      }
    : {
        mode,
        language: "en",
        title: "Child safety",
        understanding: "Thank you for telling me. That was not easy to say. The child's immediate safety comes first.",
        plan: [
          "If the child is in danger right now, call your local emergency number.",
          "Keep the child in a safe place with a trusted adult.",
          "Contact your local child protection service or a qualified professional for support.",
        ],
        followUp: "Is the child safe right now?",
        quickReplies: [],
      };
}
