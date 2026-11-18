import { normalize, assessRisk, fixedCrisisReply, hasUrdu, mostSevere } from "../lib/safety";
import { guardReply } from "../lib/guard";
import { isRtl } from "../lib/lang";
import { fallbackTitle, groupConversations } from "../lib/conversations";
import type { CoachReply, Conversation } from "../lib/types";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`);
  }
  console.log(`✓ ${msg}`);
}

console.log("=== RUNNING SAFETY & CORE LOGIC TESTS ===\n");

// 1. Normalization
console.log("--- 1. Normalization Tests ---");
assert(normalize("  HELLO   WORLD  ") === "hello world", "Trims and lowercases English");
assert(normalize("كتاب") === "کتاب", "Converts Arabic kaf to Urdu kaf");
assert(normalize("علیٰ") === "علی", "Strips Arabic diacritics/superscript alef");
assert(normalize("۱۲۳۴۵") === "12345", "Converts Eastern Arabic/Persian digits to standard digits");

// 2. Risk Assessment (English, Roman Urdu, Urdu script)
console.log("\n--- 2. Risk Assessment Tests ---");

// Normal cases
assert(assessRisk("My 5-year-old throws tantrums when screen time ends").mode === "normal", "Screen time tantrum is normal");
assert(assessRisk("How to help my toddler sleep through the night?").mode === "normal", "Bedtime query is normal");
assert(assessRisk("میرا بچہ کھانا نہیں کھاتا").mode === "normal", "Urdu eating concern is normal");

// Self-harm (hard match) & Stems
assert(assessRisk("I want to die, I have no reason to live").mode === "self_harm" && assessRisk("I want to die").level === "hard", "English self-harm detected as hard");
assert(assessRisk("I keep thinking about killing myself").mode === "self_harm" && assessRisk("I keep thinking about killing myself").level === "hard", "Reviewer P0-1: 'killing myself' stem detected");
assert(assessRisk("I've been hurting myself lately").mode === "self_harm" && assessRisk("I've been hurting myself lately").level === "hard", "Reviewer P0-1: 'hurting myself' stem detected");
assert(assessRisk("I am ending my life tonight").mode === "self_harm" && assessRisk("I am ending my life tonight").level === "hard", "Reviewer P0-1: 'ending my life' detected");
assert(assessRisk("I don't want to be alive anymore").mode === "self_harm", "Reviewer P0-1: 'don't want to be alive' detected");
assert(assessRisk("I want to end it all").mode === "self_harm", "Reviewer P0-1: 'want to end it all' detected");
assert(assessRisk("My 12 year old said she wants to die").mode === "self_harm", "Reviewer P0-2: Child self-harm statement detected as hard self_harm");

assert(assessRisk("main mar jana chahta hoon").mode === "self_harm" && assessRisk("main mar jana chahta hoon").level === "hard", "Roman Urdu self-harm detected as hard");
assert(assessRisk("میں اپنی جان لینا چاہتا ہوں").mode === "self_harm" && assessRisk("میں اپنی جان لینا چاہتا ہوں").level === "hard", "Urdu script self-harm detected as hard");

// Emergency (hard match) & Typographic quotes / Negation context
assert(assessRisk("My child can't breathe, he swallowed a battery").mode === "emergency" && assessRisk("swallowed a battery").level === "hard", "English swallowing battery / not breathing is hard emergency");
assert(assessRisk("My baby can’t breathe").mode === "emergency", "Reviewer P0-1: Curly apostrophe 'can’t breathe' detected");
assert(assessRisk("My baby isn't breathing").mode === "emergency", "Reviewer P0-1: 'isn't breathing' detected");
assert(assessRisk("He is limp and won't wake up").mode === "emergency", "Reviewer P0-1: 'limp and won't wake up' detected");

assert(assessRisk("bacha saans nahi le raha behosh hai").mode === "emergency" && assessRisk("bacha saans nahi le raha").level === "hard", "Roman Urdu breathing/unconscious is hard emergency");
assert(assessRisk("بچہ بے ہوش ہے اور سانس نہیں لے رہا").mode === "emergency" && assessRisk("بچہ بے ہوش ہے").level === "hard", "Urdu script unconscious is hard emergency");

// False-positive suppression for emergency / medical queries
assert(assessRisk("My son touched poison ivy").mode === "normal", "Reviewer P2: 'poison ivy' does NOT trigger emergency");
assert(assessRisk("Daughter is scared of drowning, refuses swim class").mode === "normal", "Reviewer P2: 'scared of drowning' does NOT trigger emergency");
assert(assessRisk("Child had a febrile seizure last year").mode === "normal", "Reviewer P2: past seizure does NOT trigger emergency");
assert(assessRisk("Is grape a choking hazard for toddlers?").mode === "normal", "Reviewer P2: 'choking hazard' question does NOT trigger emergency");
assert(assessRisk("My kid got an overdose of screen time").mode === "normal", "Reviewer P2: 'overdose of screen time' does NOT trigger emergency");

// Abuse & Loss of control
assert(assessRisk("I shook my baby really hard").mode === "abuse" && assessRisk("I shook my baby really hard").level === "hard", "Reviewer P0-3: Shaken baby pattern triggers hard abuse");
assert(assessRisk("I slapped my son in anger").mode === "abuse", "Reviewer P0-3: 'slapped my son in anger' detected");
assert(assessRisk("I spanked my daughter and left a bruise").mode === "abuse", "Reviewer P0-3: 'spanked daughter and left a bruise' detected");
assert(assessRisk("I hit my child and I'm scared I'm going to hurt him again").mode === "abuse" && assessRisk("I hit my child").level === "soft", "English hitting child detected as soft abuse");
assert(assessRisk("main ne bachay ko mara hai aur dar hai dobara marunga").mode === "abuse", "Roman Urdu hitting child detected as abuse");
assert(assessRisk("میں نے اپنے بچے کو مارا ہے").mode === "abuse", "Urdu script hitting child detected as abuse");

// Abuse False-positive suppression
assert(assessRisk("ہمارا بچہ رات کو نہیں سوتا").mode === "normal", "Reviewer P2: ہمارا (our) does NOT match مارا");
assert(assessRisk("How do I start sexual education talks?").mode === "normal", "Reviewer P2: 'sexual education' does NOT trigger abuse");

// 3. Most Severe resolution
console.log("\n--- 3. Severity Resolution Tests ---");
assert(mostSevere("normal", "abuse") === "abuse", "abuse > normal");
assert(mostSevere("abuse", "emergency") === "emergency", "emergency > abuse");
assert(mostSevere("emergency", "self_harm") === "self_harm", "self_harm > emergency");

// 4. Fixed Crisis Replies
console.log("\n--- 4. Fixed Crisis Replies Tests ---");
const enEmerg = fixedCrisisReply("emergency", false);
assert(enEmerg.mode === "emergency" && enEmerg.language === "en" && enEmerg.plan.length > 0, "English emergency fixed reply valid");
const urEmerg = fixedCrisisReply("emergency", true);
assert(urEmerg.mode === "emergency" && urEmerg.language === "ur" && urEmerg.plan.length > 0, "Urdu emergency fixed reply valid");

// 5. Output Guard (blocking diagnoses, medicine dosage, legal advice)
console.log("\n--- 5. Output Guard Tests ---");
const normalReply: CoachReply = {
  mode: "normal",
  language: "en",
  title: "Bedtime tips",
  understanding: "Bedtime battles are common at this age.",
  plan: ["Establish a predictable 20-minute wind-down routine.", "Dim lights 30 minutes before bed."],
  followUp: "How does his current bedtime routine look?",
  quickReplies: ["It is inconsistent", "We don't have one"],
};
const guardedNormal = guardReply(normalReply, false);
assert(guardedNormal.plan.length === 2, "Normal safe reply passes guard untouched");

const dosageViolation: CoachReply = {
  ...normalReply,
  plan: ["Give 5ml of paracetamol before bed."],
};
const guardedDosage = guardReply(dosageViolation, false);
assert(guardedDosage.understanding.includes("can't diagnose or give medical"), "Dosage blocked by output guard");

const diagnosisViolation: CoachReply = {
  ...normalReply,
  understanding: "Your child has ADHD and needs treatment.",
};
const guardedDiagnosis = guardReply(diagnosisViolation, false);
assert(guardedDiagnosis.understanding.includes("can't diagnose"), "Diagnosis blocked by output guard");

const legalViolation: CoachReply = {
  ...normalReply,
  plan: ["You should sue your ex for full custody immediately."],
};
const guardedLegal = guardReply(legalViolation, false);
assert(guardedLegal.understanding.includes("can't diagnose or give medical or legal"), "Legal directive blocked by output guard");

// Reviewer P0-4: Emergency mode precedence (never downgrade crisis to normal fallback)
const emergWithDosage: CoachReply = {
  mode: "emergency",
  language: "en",
  title: "Emergency help",
  understanding: "Immediate danger. Do not give 5 ml of anything.",
  plan: ["Call emergency immediately"],
  followUp: "Have you called for help?",
  quickReplies: [],
};
const guardedEmerg = guardReply(emergWithDosage, false);
assert(guardedEmerg.mode === "emergency", "Reviewer P0-4: Emergency reply containing dosage keeps emergency mode and is NOT downgraded to normal");

// Reviewer P0-5: Urdu script dosage and medication guarding
const urduDosageViolation: CoachReply = {
  mode: "normal",
  language: "ur",
  title: "طبی رہنمائی",
  understanding: "بچے کو 5 ملی گرام پیراسیٹامول دیں۔",
  plan: ["آرام کرنے دیں"],
  followUp: "کیا بخار کم ہوا؟",
  quickReplies: [],
};
const guardedUrduDosage = guardReply(urduDosageViolation, true);
assert(guardedUrduDosage.understanding.includes("میں اس سوال پر تشخیص یا طبی اور قانونی ہدایات نہیں دے سکتا"), "Reviewer P0-5: Urdu script dosage and medication blocked by guard");

// Reviewer P0-5: Nuanced diagnostic phrase ("He may have ADHD")
const adhdMayHaveViolation: CoachReply = {
  ...normalReply,
  understanding: "He may have ADHD based on these signs.",
};
const guardedAdhd = guardReply(adhdMayHaveViolation, false);
assert(guardedAdhd.understanding.includes("can't diagnose"), "Reviewer P0-5: 'He may have ADHD' blocked by output guard");

// 6. RTL and Urdu Detection
console.log("\n--- 6. RTL Detection Tests ---");
assert(isRtl("میرا بچہ سوتا نہیں ہے") === true, "Urdu sentence detected as RTL");
assert(isRtl("My 5-year-old has tantrums") === false, "English sentence detected as LTR");
assert(hasUrdu("کچھ مدد چاہیے") === true, "hasUrdu detects Urdu characters");
assert(hasUrdu("Hello world") === false, "hasUrdu returns false for English");

// 7. Conversation Helpers & Grouping
console.log("\n--- 7. Conversation Helpers Tests ---");
assert(fallbackTitle("Short title") === "Short title", "Short title unchanged");
assert(fallbackTitle("This is an extremely long user query describing all details of a toddler bedtime battle") === "This is an extremely long user query…", "Long title truncated with ellipsis");

const now = Date.now();
const DAY = 86_400_000;
const mockConvs: Conversation[] = [
  { id: "1", title: "Pinned Chat", pinned: true, createdAt: now, updatedAt: now, messages: [] },
  { id: "2", title: "Today Chat", pinned: false, createdAt: now, updatedAt: now, messages: [] },
  { id: "3", title: "Yesterday Chat", pinned: false, createdAt: now - DAY, updatedAt: now - DAY, messages: [] },
  { id: "4", title: "Older Chat", pinned: false, createdAt: now - 30 * DAY, updatedAt: now - 30 * DAY, messages: [] },
];
const grouped = groupConversations(mockConvs);
assert(grouped.some((g) => g.label === "Pinned" && g.items.some((i) => i.id === "1")), "Pinned chat grouped correctly");
assert(grouped.some((g) => g.label === "Today" && g.items.some((i) => i.id === "2")), "Today chat grouped correctly");
assert(grouped.some((g) => g.label === "Yesterday" && g.items.some((i) => i.id === "3")), "Yesterday chat grouped correctly");
assert(grouped.some((g) => g.label === "Older" && g.items.some((i) => i.id === "4")), "Older chat grouped correctly");

console.log("\n=================================");
console.log("🎉 ALL TESTS PASSED SUCCESSFULLY!");
console.log("=================================\n");
