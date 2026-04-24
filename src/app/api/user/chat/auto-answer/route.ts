import { NextRequest, NextResponse } from 'next/server';
import { invokeWithFallback } from '@/lib/langchain';
import { HumanMessage, SystemMessage, AIMessage } from "@langchain/core/messages";
import { appLog } from '@/lib/app-logger';

const AUTO_ANSWER_SYSTEM_PROMPT = `You are role-playing as a young individual (early-to-mid 20s) who is going through a personal-growth intake conversation with a guide named Maya. You must generate a realistic, thoughtful, and natural-sounding answer to Maya's latest question.

RULES:
- Respond ONLY with the user's answer text. Do NOT include any meta-commentary, quotation marks, or labels like "Answer:".
- The answer should sound authentic, personal, and emotionally honest — like a real young person sharing their thoughts.
- Keep answers concise (1-3 sentences) unless the question clearly calls for more detail.
- Draw on the captured goals and previous conversation to make the answer contextually relevant.
- Do NOT repeat or parrot Maya's words back. Use your own phrasing.
- If Maya offers chips/options, pick the most meaningful one and elaborate briefly.
- The tone should be warm, slightly vulnerable, and genuine — not robotic or overly formal.`;

export async function POST(req: NextRequest) {
    try {
        const { messages, capturedGoals } = await req.json();

        if (!messages || !Array.isArray(messages)) {
            return NextResponse.json({ error: 'Invalid messages' }, { status: 400 });
        }

        // Build context about the user's captured goals
        let goalsContext = '';
        if (capturedGoals && typeof capturedGoals === 'object') {
            const entries = Object.entries(capturedGoals).filter(
                ([, v]) => v !== null && v !== undefined && v !== ''
            );
            if (entries.length > 0) {
                goalsContext = `\n\nThe user's captured goals/data so far:\n${entries
                    .map(([k, v]) => `- ${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
                    .join('\n')}`;
            }
        }

        const systemPrompt = AUTO_ANSWER_SYSTEM_PROMPT + goalsContext;

        const langchainMessages = [
            new SystemMessage(systemPrompt),
            ...messages.map((m: any) =>
                m.role === 'user' ? new HumanMessage(m.content) : new AIMessage(m.content)
            ),
            new HumanMessage('Generate a realistic answer to the assistant\'s latest message above.'),
        ];

        const response = await invokeWithFallback(langchainMessages, { primaryRetries: 2 });

        // Strip any wrapping quotes the LLM might add
        let text = (response.content as string).trim();
        if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) {
            text = text.slice(1, -1);
        }

        return NextResponse.json({ text });
    } catch (error: any) {
        console.error('Error in auto-answer API:', error);
        appLog({ level: "error", source: "api/user/chat/auto-answer", message: `Auto-answer error: ${error.message || error}` });
        return NextResponse.json({ error: error.message || 'Error occurred' }, { status: 500 });
    }
}
