import { NextRequest, NextResponse } from 'next/server';
import { model } from '@/lib/langchain';
import { SYSTEM_PROMPT } from '@/app/types/goal-discovery';
import { HumanMessage, SystemMessage, AIMessage } from "@langchain/core/messages";

export async function POST(req: NextRequest) {
    try {
        const { messages } = await req.json();

        if (!messages || !Array.isArray(messages)) {
            return NextResponse.json({ error: 'Invalid messages' }, { status: 400 });
        }

        // Build the system prompt with area-by-area enforcement
        let systemPrompt = SYSTEM_PROMPT;

        // If this is the first message and it contains selected areas, inject a strict reminder
        if (messages.length === 1 && messages[0].role === 'user') {
            const firstMsg = messages[0].content.toLowerCase();
            const areaMatch = firstMsg.match(/life areas i want to transform are:\s*(.+)/i);
            if (areaMatch) {
                const areas = areaMatch[1].split(',').map((a: string) => a.trim().replace(/\.$/, ''));
                const firstArea = areas[0];
                systemPrompt += `\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━
IMMEDIATE INSTRUCTION — YOUR VERY FIRST RESPONSE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
The user selected these areas: ${areas.join(', ')}
You MUST start with "${firstArea}" ONLY. Do NOT mention or ask about ${areas.slice(1).join(', ')} yet.
Your response must:
1. One sentence acknowledging their orientation and that you'll explore each area
2. "Let's start with ${firstArea}." 
3. Present the goal check for ${firstArea} ONLY as three chips:
• I have a specific goal in mind
• I have a general direction
• I'm not sure yet — help me explore
Do NOT ask a combined question about all areas. Each area gets its own turn.`;
            }
        }

        const langchainMessages = [
            new SystemMessage(systemPrompt),
            ...messages.map((m: any) =>
                m.role === 'user' ? new HumanMessage(m.content) : new AIMessage(m.content)
            )
        ];

        const response = await model.invoke(langchainMessages);

        return NextResponse.json({ text: response.content });
    } catch (error: any) {
        console.error('Error in LangChain chat API:', error);
        return NextResponse.json({ error: error.message || 'Error occurred' }, { status: 500 });
    }
}
