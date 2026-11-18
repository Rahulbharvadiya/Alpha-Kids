import type { CoachReply, Mode } from "./types";

// Map Arabic variants to Urdu forms, strip diacritics and tatweel,
// convert typographic quotes/apostrophes, convert Eastern digits,
// lowercase and collapse whitespace.
export function normalize(input: string): string {
  return input
    .normalize("NFKC")
    .replace(/[\u2018\u2019\u02BC\u2032`´]/g, "'") // typographic apostrophes to straight quote
    .replace(/[\u201C\u201D\u2033]/g, '"') // typographic double quotes to straight
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

type Rule = {
  mode: Exclude<Mode, "normal">;
  level: "hard" | "soft";
  re: RegExp;
  negationRe?: RegExp; // Optional negative pattern: if matches, suppress rule
};

// Patterns are applied to normalized text.
// Designed with stem matching, negation/context awareness, and Unicode script boundaries.
const RULES: Rule[] = [
  // ---- Self-harm (hard) ----
  // Covers parent, adult, and child self-harm disclosures
  {
    mode: "self_harm",
    level: "hard",
    re: /(kill\w*\s+myself|hurt\w*\s+myself|harm\w*\s+myself|end\w*\s+(my|it|all)\b|end\w*\s+my\s+life|suicid\w*|want\w*\s+to\s+die|wanna\s+die|no\s+reason\s+to\s+live|better\s+off\s+without\s+me|(don'?t|dont|not)\s+want\s+to\s+be\s+alive|want\s+to\s+end\s+it\s+all)/,
  },
  // Child / third-party self-harm disclosure
  {
    mode: "self_harm",
    level: "hard",
    re: /(child|son|daughter|kid|baby|boy|girl|\d+\s?year\s+old|she|he)\b.*?(said|says|wants|wanting|talk\w*|think\w*).*?(want\w*\s+to\s+die|kill\w*\s+(him|her)?self|suicid\w*|end\w*\s+(his|her)\s+life|hurt\w*\s+(him|her)?self)|(said|says)\s+(she|he|they)?\s*want\w*\s+to\s+die/,
  },
  // Roman Urdu self-harm
  {
    mode: "self_harm",
    level: "hard",
    re: /(khudkushi|khud\s+kushi|marna\s+chaht\w*|apni\s+jaan\b|jaan\s+den\w*|mar\s+jana\s+chaht\w*|zindagi\s+khatam)/,
  },
  // Urdu script self-harm
  {
    mode: "self_harm",
    level: "hard",
    re: /(خودکشی|خود\s*کشی|مرنا\s+چاہت|مر\s+جانا\s+چاہت|اپنی\s+جان|خود\s+کو\s+نقصان|زندگی\s+ختم)/,
  },

  // ---- Emergency (hard) ----
  // Acute breathing, unresponsiveness, battery/poisoning, heavy bleeding, seizure
  {
    mode: "emergency",
    level: "hard",
    re: /((can'?t|cannot|is(n'?t)?|stopped|not)\s+breath(e|ing)|choking|unconscious|unresponsive|limp\b.*?(won'?t|cannot|can'?t|not)\s+wake|convulsing|bleeding\s+(heavily|a lot|badly|profusely)|swallowed\s+(a\s+)?(battery|magnet|pill|pills|poison|bleach|detergent)|overdos\w*|anaphyla\w*|turning\s+blue)/,
    // Context exclusions: poison ivy, choking hazard questions, overdose of screens/sugar, past seizure history
    negationRe: /(poison\s+(ivy|oak|sumac)|choking\s+hazard|overdose\s+of\s+(screen|screens|sugar|caffeine|tv|youtube|love|fun|media)|(last\s+year|years\s+ago|months\s+ago|in\s+the\s+past|when\s+(he|she|they)\s+was)\b.*?(seizure|convulsing)|had\s+a\s+(febrile\s+)?seizure\s+(last|months|years|in\s+the\s+past))/,
  },
  // Seizure / acute medical events (standalone, if not past history)
  {
    mode: "emergency",
    level: "hard",
    re: /\b(seizure|active\s+seizure)\b/,
    negationRe: /(last\s+year|years\s+ago|months\s+ago|in\s+the\s+past|previously|when\s+(he|she|they)\s+was|had\s+a\s+(febrile\s+)?seizure)/,
  },
  // Acute drowning (excluding fear of swimming/drowning)
  {
    mode: "emergency",
    level: "hard",
    re: /\b(drown\w*)\b/,
    negationRe: /(scared\s+of|afraid\s+of|fear\s+of|refus\w*|nightmare\s+about|drowning\s+in\s+(work|chores|laundry|stress))/,
  },
  // Roman Urdu emergency
  {
    mode: "emergency",
    level: "hard",
    re: /(saans\s+nahi|sans\s+nahi|behosh|bayhosh|khoon\s+(beh|bah)|zehar|zahar|nigal\s+liya|doob\s+gaya|doob\s+gayi|daura\s+pada|dora\s+para|ambulance)/,
  },
  // Urdu script emergency
  {
    mode: "emergency",
    level: "hard",
    re: /(سانس\s+نہیں|بے\s*ہوش|بیہوش|خون\s+بہہ|خون\s+بہ\s+رہا|زہر|نگل\s+لیا|ڈوب\s+گیا|ڈوب\s+گئی|دورہ\s+پڑ|ایمبولینس|نیلا\s+پڑ)/,
  },

  // ---- Abuse / Severe Loss of Control (soft or hard depending on severity) ----
  // Shaken baby syndrome (hard safety trigger)
  {
    mode: "abuse",
    level: "hard",
    re: /(shook|shak(e|ing))\b.*?(baby|infant|toddler|child|son|daughter)/,
  },
  // Abuse / physical harm in English
  {
    mode: "abuse",
    level: "soft",
    re: /(abus\w*|molest\w*|sexual(ly)?\s+(abus\w*|assault\w*|touch\w*|exploit\w*|inappropriate\w*|conduct)|inappropriate(ly)?\s+touch\w*|slap(ped|ping)?\b.*?(son|daughter|child|kid|baby|toddler|him|her)|spank(ed|ing)?\b.*?(bruise|mark|belt|hard)|beat(ing)?\s+(him|her|the\s+child|my\s+child|my\s+son|my\s+daughter|kids)|hit(ting)?\s+(him|her|my\s+child|my\s+son|my\s+daughter)|hurt(ing)?\s+(him|her|my\s+child)|afraid\s+(he|she|they)\s+(will|might)\s+hurt|scared\s+i('m|\s+am)?\s+going\s+to\s+hurt|lose\s+control\s+with\s+(him|her|my\s+child)|being\s+hurt)/,
    // Context exclusion: sexual education / puberty discussions
    negationRe: /(sex(ual)?\s+education|talk\w*\s+about\s+sex|puberty)/,
  },
  // Roman Urdu abuse with strict word boundaries
  {
    mode: "abuse",
    level: "soft",
    re: /(\bma+r(a|i|e|ta|ti|na|ne|unga|ungi)\b|\bpeet(a|i|na|ne)\b|\bpit(ta|ti|ai)\b|\bmarpeet\b|\bzulm\b|\btashaddud\b|\bjinsi\b|\bghalat\s+tareeqe\s+se\s+chhua\b)/,
  },
  // Urdu script abuse with Unicode script boundaries (prevents false match on ہمارا / our child)
  {
    mode: "abuse",
    level: "soft",
    re: /(?<![\u0600-\u06FF])(بدسلوکی|جنسی\s+تشدد|مار\s*پیٹ|مارتا\s+ہوں|مارتی\s+ہوں|مارا\s+ہے|مارا|تشدد|ظلم|غلط\s+طریقے\s+سے\s+چھو)(?![\u0600-\u06FF])/,
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
    // If a negative context rule is specified and matches, skip this rule
    if (r.negationRe && r.negationRe.test(t)) continue;

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
// Region-neutral crisis guidance directing to local crisis lines without hardcoded numbers.
export function fixedCrisisReply(mode: Exclude<Mode, "normal">, ur: boolean): CoachReply {
  if (mode === "emergency") {
    return ur
      ? {
          mode,
          language: "ur",
          title: "ہنگامی صورتحال",
          understanding: "یہ ایک ہنگامی صورتحال لگتی ہے۔ اس وقت فوری طبی مدد سب سے اہم ہے۔",
          plan: [
            "ابھی اپنے علاقے کی ہنگامی سروس کو کال کریں۔",
            "بچے کے ساتھ رہیں، اکیلا نہ چھوڑیں، اور اگر قریب کوئی بالغ ہے تو اسے فوراً بلائیں۔",
            "اگر دم گھٹنے کا خدشہ ہے تو بچے کی پیٹھ پر ہلکی تھپکیاں دیں اور ایمرجنسی آپریٹر کی ہدایات پر عمل کریں۔",
          ],
          followUp: "کیا آپ نے ہنگامی مدد کے لیے کال کر لی ہے؟",
          quickReplies: [],
        }
      : {
          mode,
          language: "en",
          title: "Emergency help",
          understanding: "This sounds like an emergency. Getting immediate medical help right now matters more than anything else.",
          plan: [
            "Call your local emergency services immediately.",
            "Stay with your child, do not leave them unattended, and call any adult nearby to assist.",
            "If choking or unresponsive, follow the emergency dispatcher's immediate instructions.",
          ],
          followUp: "Have you been able to call for emergency help?",
          quickReplies: [],
        };
  }
  if (mode === "self_harm") {
    return ur
      ? {
          mode,
          language: "ur",
          title: "فوری حفاظتی مدد",
          understanding: "آپ نے جو بتایا وہ انتہائی سنجیدہ ہے اور زندگی کا تحفظ سب سے پہلے ہے۔ آپ اور آپ کا بچہ اس میں اکیلے نہیں ہیں۔",
          plan: [
            "پرسکون رہیں اور اپنے یا بچے کے پاس موجود تمام نقصان دہ اشیاء (دوائیں، تیز دھار اوزار) فوراً ہٹا دیں۔",
            "اگر بچہ یا کوئی فرد خطرے میں ہے تو اسے اس وقت بالکل اکیلا نہ چھوڑیں۔",
            "اگر آپ کو لگے کہ آپ ان خیالات پر عمل کر سکتے ہیں تو فوری طور پر مقامی کرائسس ہیلپ لائن یا ہنگامی سروس سے رابطہ کریں۔",
            "کسی قریبی اور قابلِ اعتماد بالغ کو فوری طور پر اپنے پاس بلائیں۔",
          ],
          followUp: "کیا آپ کے پاس اس وقت کوئی قابلِ اعتماد شخص موجود ہے یا آپ نے کال کی ہے؟",
          quickReplies: [],
        }
      : {
          mode,
          language: "en",
          title: "Urgent crisis support",
          understanding: "What was shared is critical, and safety comes first. You and your child are not alone in this.",
          plan: [
            "Stay calm and stay with the person. Do not leave your child or yourself alone right now.",
            "Remove any immediate means of harm (medications, sharp objects) from reach.",
            "Call a local crisis helpline or emergency services if you feel you might act on these thoughts.",
            "Ask a trusted relative, partner, or neighbor to come be with you right away.",
          ],
          followUp: "Is there someone with you right now, or have you reached out to a helpline?",
          quickReplies: [],
        };
  }
  // abuse (used for safeguarding and de-escalation fallbacks)
  return ur
    ? {
        mode,
        language: "ur",
        title: "بچے کی حفاظت اور فوری مدد",
        understanding: "والدین کی ذمہ داری بعض اوقات انسان کو شدید تھکن اور دباؤ میں ڈال دیتی ہے۔ اس وقت آپ اور بچے دونوں کا پرسکون اور محفوظ رہنا سب سے اہم ہے۔",
        plan: [
          "فوراً چند منٹ کے لیے الگ کمرے میں جائیں اور گہرے سانس لیں جبکہ بچے محفوظ جگہ پر ہوں۔",
          "کسی قریبی اور قابلِ اعتماد بالغ (شریکِ حیات، رشتہ دار یا پڑوسی) کو ابھی بلائیں تاکہ وہ کچھ دیر بچے کی دیکھ بھال کر سکیں۔",
          "والدین کی رہنمائی کی ہیلپ لائن یا چائلڈ پروٹیکشن سروس سے رابطہ کریں تاکہ آپ کو فوری مشورہ اور مدد مل سکے۔",
          "اگر کوئی اس وقت فوری جسمانی خطرے میں ہے تو مقامی ہنگامی سروس کو کال کریں۔",
        ],
        followUp: "کیا آپ ابھی چند منٹ کے لیے الگ کمرے میں جا کر پرسکون سانس لے سکتے ہیں؟",
        quickReplies: ["میں الگ کمرے میں ہوں", "کسی کو مدد کے لیے بلایا ہے", "ہیلپ لائن کا نمبر چاہیے"],
      }
    : {
        mode,
        language: "en",
        title: "Support & Child Safety",
        understanding: "Parenting can push anyone to their absolute emotional limit, and feeling this overwhelmed is deeply painful. Keeping both you and your children safe right now is what matters most.",
        plan: [
          "Take an immediate pause: ensure your children are in a safe room or crib, and step into another room to take slow, calming breaths.",
          "Call a partner, family member, or trusted neighbor right now to step in so you can have a break.",
          "Contact a confidential parental stress helpline or local safeguarding service for immediate non-judgmental support.",
          "If anyone is in immediate physical danger, call your local emergency services right away.",
        ],
        followUp: "Can you take a 5-minute break in another room to breathe right now?",
        quickReplies: ["Stepping away now", "Called someone to help", "Need helpline numbers"],
      };
}
