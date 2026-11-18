import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { ApiRequestSchema, CoachReplySchema, type CoachReply } from "@/lib/types";
import { assessRisk, fixedCrisisReply, hasUrdu, mostSevere } from "@/lib/safety";
import { buildSystemPrompt } from "@/lib/prompt";
import { guardReply } from "@/lib/guard";
import { checkRateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const maxDuration = 30;

const DEFAULT_MODEL = "llama-3.3-70b-versatile";
const FALLBACK_MODELS = [
  process.env.GROQ_MODEL || DEFAULT_MODEL,
  DEFAULT_MODEL,
  "llama-3.1-8b-instant",
].filter((m, i, arr) => m && arr.indexOf(m) === i);

function parseModelJson(raw: string): unknown {
  // Strip <think>...</think> reasoning blocks if present (from reasoning models)
  let cleaned = raw.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  // Strip markdown code fences
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1));
      } catch {
        // Continue to error
      }
    }
    throw new Error("no_json");
  }
}

// Ensure the parsed JSON strictly complies with CoachReply shape before Zod validation
function sanitizeModelOutput(rawObj: unknown, ur: boolean): CoachReply {
  const obj = (typeof rawObj === "object" && rawObj !== null ? rawObj : {}) as Record<string, unknown>;

  const mode = ["normal", "emergency", "abuse", "self_harm"].includes(obj.mode as string)
    ? (obj.mode as CoachReply["mode"])
    : "normal";

  const language = obj.language === "ur" || obj.language === "en"
    ? (obj.language as CoachReply["language"])
    : (ur ? "ur" : "en");

  const title = typeof obj.title === "string" ? obj.title.slice(0, 100) : undefined;
  const understanding = typeof obj.understanding === "string" && obj.understanding.trim()
    ? obj.understanding.slice(0, 800)
    : (ur
        ? "والدین کی ذمہ داری بعض اوقات انسان کو بہت تھکا دیتی ہے۔ میں آپ کی مدد کے لیے حاضر ہوں۔"
        : "Parenting can be demanding and overwhelming at times. I am here to help you navigate this.");

  let plan: string[] = [];
  if (Array.isArray(obj.plan)) {
    plan = obj.plan
      .filter((p): p is string => typeof p === "string")
      .map((p) => p.slice(0, 400))
      .slice(0, 5);
  } else if (typeof obj.plan === "string" && obj.plan.trim()) {
    plan = [obj.plan.slice(0, 400)];
  }

  const followUp = typeof obj.followUp === "string" && obj.followUp.trim()
    ? obj.followUp.slice(0, 400)
    : (ur ? "کیا آپ اس معاملے میں مزید تجاویز چاہیں گے؟" : "Would you like more specific steps for your situation?");

  const quickReplies = Array.isArray(obj.quickReplies)
    ? obj.quickReplies
        .filter((q): q is string => typeof q === "string")
        .map((q) => q.slice(0, 80))
        .slice(0, 3)
    : [];

  return {
    mode,
    language,
    ...(title ? { title } : {}),
    understanding,
    plan,
    followUp,
    quickReplies,
  };
}

function safeEmergencyFallback(ur: boolean): CoachReply {
  return ur
    ? {
        mode: "normal",
        language: "ur",
        title: "رہنمائی",
        understanding: "والدین کی ذمہ داری بعض اوقات انسان کو بہت تھکا دیتی ہے۔ میں اس وقت آپ کے ساتھ ہوں۔",
        plan: [
          "ایک گہرا سانس لیں اور صورتحال کا جائزہ پرسکون ہو کر لیں۔",
          "بچے کے ساتھ نرمی اور واضح انداز میں بات کریں۔",
          "اپنی تشویش کے بارے میں مزید تفصیل بتائیں تاکہ میں بہتر تجاویز دے سکوں۔",
        ],
        followUp: "کیا آپ اس بارے میں کچھ اور بتانا چاہیں گے؟",
        quickReplies: ["مزید بتاتا ہوں", "یہ مددگار ہے", "کوئی اور مشورہ دیں"],
      }
    : {
        mode: "normal",
        language: "en",
        title: "Guidance",
        understanding: "Parenting can be emotionally demanding and overwhelming. I'm right here with you.",
        plan: [
          "Take a slow, calming breath and pause before reacting.",
          "Keep your communication warm, simple, and consistent.",
          "Feel free to share a bit more detail so we can explore tailored steps.",
        ],
        followUp: "Would you like to share a bit more context about what happened?",
        quickReplies: ["Tell you more", "That helps", "Need another tip"],
      };
}

export async function POST(req: NextRequest) {
  // P1-1: Rate limit by client IP (30 requests/minute)
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown-ip";
  const limit = checkRateLimit(`coach:${ip}`, { windowMs: 60_000, max: 30 });
  if (!limit.success) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  let body;
  try {
    body = ApiRequestSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const lastUser = [...body.messages].reverse().find((m) => m.role === "user");
  if (!lastUser) return NextResponse.json({ error: "invalid_input" }, { status: 400 });

  const ur = hasUrdu(lastUser.content);
  const risk = assessRisk(lastUser.content);

  // Layer 1: hard match -> fixed reply, model is never called.
  if (risk.level === "hard" && risk.mode !== "normal") {
    return NextResponse.json(fixedCrisisReply(risk.mode, ur));
  }

  // Pre-check for Groq API key before calling LLM
  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json({ error: "server_misconfigured" }, { status: 500 });
  }

  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  // Layer 2: model, with a soft risk hint if the server saw one.
  const system = buildSystemPrompt({
    isFirstTurn: body.isFirstTurn,
    riskHint: risk.level === "soft" ? risk.mode : undefined,
  });

  const messages = [
    { role: "system" as const, content: system },
    ...body.messages.slice(-12),
  ];

  async function tryModel(modelName: string): Promise<CoachReply> {
    const completion = await groq.chat.completions.create({
      model: modelName,
      messages,
      temperature: 0.4,
      max_completion_tokens: 1536,
      response_format: { type: "json_object" },
    });
    const raw = completion.choices[0]?.message?.content ?? "";
    const parsed = parseModelJson(raw);
    const sanitized = sanitizeModelOutput(parsed, ur);
    return CoachReplySchema.parse(sanitized);
  }

  try {
    let reply: CoachReply | null = null;
    let lastError: unknown = null;

    // Model cascade: try primary model, then reliable fallbacks if an error occurs
    for (const modelToTry of FALLBACK_MODELS) {
      try {
        reply = await tryModel(modelToTry);
        if (reply) break;
      } catch (err: unknown) {
        lastError = err;
        if ((err as { status?: number })?.status === 429) {
          return NextResponse.json({ error: "rate_limited" }, { status: 429 });
        }
        console.warn(`Model ${modelToTry} failed, trying next fallback:`, err);
      }
    }

    // If all models failed (e.g. temporary upstream provider outage), use safe graceful fallback
    if (!reply) {
      console.error("All models in cascade failed:", lastError);
      reply = safeEmergencyFallback(ur);
    }

    // Final mode is the most severe of server signal and model classification.
    reply.mode = mostSevere(reply.mode, risk.mode);

    // Layer 3: output guard.
    const guarded = guardReply(reply, reply.language === "ur" || ur);
    return NextResponse.json(guarded);
  } catch (e: unknown) {
    console.error("Unexpected coach route error:", e);
    // Even on unexpected error, deliver a safe coach reply so user is never stranded
    const safeFallback = safeEmergencyFallback(ur);
    return NextResponse.json(safeFallback);
  }
}
