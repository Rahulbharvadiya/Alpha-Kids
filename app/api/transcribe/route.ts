import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { checkRateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4 MB cap

export async function POST(req: NextRequest) {
  // P1-1: Rate limit by client IP
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown-ip";
  const limit = checkRateLimit(`transcribe:${ip}`, { windowMs: 60_000, max: 20 });
  if (!limit.success) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: "missing_file" }, { status: 400 });
    }

    // P1-1: Body size validation
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "file_too_large" }, { status: 413 });
    }

    // P1-1: Audio MIME type validation
    const mimeType = file.type || "audio/webm";
    if (
      !mimeType.startsWith("audio/") &&
      !["video/webm", "video/mp4"].includes(mimeType)
    ) {
      return NextResponse.json({ error: "invalid_file_type" }, { status: 400 });
    }

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ error: "server_misconfigured" }, { status: 500 });
    }

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const fileName = (file as { name?: string }).name || "audio.webm";

    const uploadFile = await Groq.toFile(buffer, fileName, {
      type: mimeType,
    });

    const transcription = await groq.audio.transcriptions.create({
      file: uploadFile,
      model: "whisper-large-v3-turbo",
      response_format: "json",
      temperature: 0.2,
    });

    return NextResponse.json({ text: (transcription.text || "").trim() });
  } catch (err: unknown) {
    console.error("Transcription API error:", err);
    return NextResponse.json({ error: "transcription_failed" }, { status: 500 });
  }
}
