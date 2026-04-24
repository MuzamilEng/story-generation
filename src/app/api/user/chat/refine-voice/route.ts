import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/lib/openai";
import { appLog } from "@/lib/app-logger";

export async function POST(req: NextRequest) {
  try {
    const { text, context } = await req.json();

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return NextResponse.json(
        { error: "No text provided" },
        { status: 400 },
      );
    }

    const systemPrompt = `You are a voice-input transcription cleaner for a manifestation story app.
The user just spoke their answer aloud and it was transcribed by speech-to-text.

Your ONLY job is to clean up the raw transcription — NOT rewrite, summarize, or shorten it.

Rules:
1. Fix speech-to-text errors (misheard words, merged words, wrong homophones)
2. Fix punctuation, capitalization, and sentence breaks
3. Remove filler words ONLY if excessive (um, uh, like, you know) — keep light natural ones
4. Keep EVERY sentence, thought, and detail the user said — do NOT remove, merge, or condense anything
5. Keep the SAME length — your output should be roughly the same word count as the input
6. Keep it in first person if they spoke in first person
7. Keep their exact vocabulary and phrasing — just make it grammatically correct
8. Do NOT add new ideas, goals, emotions, or words they didn't say
9. Do NOT summarize, paraphrase, or shorten
10. Do NOT wrap in quotes or add any prefix/suffix labels

Think of yourself as a professional transcriptionist — you produce a clean, accurate transcript, not a rewrite.

${context ? `Context (helps disambiguate words): ${context}` : ""}

Return ONLY the cleaned transcript, nothing else.`;

    const response = await openai.chat.completions.create({
      model: process.env.AZURE_OPENAI_DEPLOYMENT_NAME || "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Raw transcription: "${text.trim()}"` },
      ],
      temperature: 0.15,
      max_tokens: 1000,
    });

    const refined =
      response.choices[0]?.message?.content?.trim() || text.trim();

    return NextResponse.json({ text: refined });
  } catch (error: any) {
    console.error("Voice refinement error:", error);
    appLog({ level: "error", source: "api/user/chat/refine-voice", message: `Voice refinement error: ${error?.message || error}` });
    return NextResponse.json(
      { error: error?.message || "Refinement failed" },
      { status: 500 },
    );
  }
}
