import { NextRequest, NextResponse } from "next/server";
import { pipeline } from "@xenova/transformers";
import { writeFile, unlink } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { appLog } from "@/lib/app-logger";

export const runtime = "nodejs";
export const maxDuration = 60;

// Singleton — model is downloaded once (~150MB for whisper-base) and kept in memory
let transcriber: any = null;

async function getTranscriber() {
  if (!transcriber) {
    transcriber = await pipeline(
      "automatic-speech-recognition",
      "Xenova/whisper-base",
    );
  }
  return transcriber;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audioFile = formData.get("audio") as File | null;

    if (!audioFile) {
      return NextResponse.json({ error: "No audio file provided" }, { status: 400 });
    }

    if (audioFile.size > 25 * 1024 * 1024) {
      return NextResponse.json({ error: "Audio file too large (max 25MB)" }, { status: 400 });
    }

    // Save uploaded WAV to a temp file (client sends 16kHz mono WAV)
    const buffer = Buffer.from(await audioFile.arrayBuffer());
    const tempPath = join(tmpdir(), `whisper_${Date.now()}.wav`);
    await writeFile(tempPath, buffer);

    const pipe = await getTranscriber();
    const result = await pipe(tempPath, {
      chunk_length_s: 30,
      stride_length_s: 5,
      return_timestamps: false,
    });

    // Cleanup temp file
    await unlink(tempPath).catch(() => {});

    return NextResponse.json({ text: result.text?.trim() || "" });
  } catch (error: any) {
    console.error("Transcription error:", error);
    appLog({ level: "error", source: "api/user/transcribe", message: `Transcription error: ${error?.message || error}` });
    return NextResponse.json(
      { error: error?.message || "Transcription failed" },
      { status: 500 },
    );
  }
}
