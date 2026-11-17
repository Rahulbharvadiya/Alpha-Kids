import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { ApiRequestSchema, CoachReplySchema, type CoachReply } from "@/lib/types";
import { assessRisk, fixedCrisisReply, hasUrdu, mostSevere } from "@/lib/safety";
import { buildSystemPrompt } from "@/lib/prompt";
import { guardReply } from "@/lib/guard";

export const runtime = "nodejs";
export const maxDuration = 30;

const MODEL = process.env.GROQ_MODEL ?? "openai/gpt-oss-120b";

function parseModelJson(raw: string): unknown {
  const cleaned = raw.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end + 1));
    throw new Error("no_json");
  }
}

export async function POST(req: NextRequest) {
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

  async function callModel(): Promise<CoachReply> {
    const completion = await groq.chat.completions.create({
      model: MODEL,
      messages,
      temperature: 0.4,
      max_completion_tokens: 1024,
      response_format: { type: "json_object" },
    });
    const raw = completion.choices[0]?.message?.content ?? "";
    return CoachReplySchema.parse(parseModelJson(raw));
  }

  try {
    let reply: CoachReply;
    try {
      reply = await callModel();
    } catch (e: unknown) {
      if ((e as { status?: number })?.status === 429) throw e;
      reply = await callModel(); // one retry on bad JSON or schema mismatch
    }

    // Final mode is the most severe of server signal and model classification.
    reply.mode = mostSevere(reply.mode, risk.mode);

    // Layer 3: output guard.
    const guarded = guardReply(reply, reply.language === "ur" || ur);
    return NextResponse.json(guarded);
  } catch (e: unknown) {
    const status = (e as { status?: number })?.status;
    if (status === 429) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    return NextResponse.json({ error: "model_failure" }, { status: 502 });
  }
}
