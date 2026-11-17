import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: "missing_file" }, { status: 400 });
    }

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ error: "server_misconfigured" }, { status: 500 });
    }

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const fileName = (file as { name?: string }).name || "audio.webm";
    const mimeType = file.type || "audio/webm";

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
