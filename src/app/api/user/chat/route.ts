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

        // Detect if conversation is in or entering Proof Actions phase
        // and inject a strict enforcement reminder
        const allContent = messages.map((m: any) => m.content || '').join('\n');
        const isInProofActions = /phase["']?\s*:\s*["']Proof Actions/i.test(allContent);
        const proofActionQuestionCount = (allContent.match(/actionsAfter/gi) || []).length;
        // Count how many assistant messages contain CAPTURE for actionsAfter (= completed Q&A exchanges)
        const proofActionCaptures = messages.filter(
            (m: any) => m.role === 'assistant' && /CAPTURE[:\s]*\{[^}]*"label"\s*:\s*"actionsAfter"/i.test(m.content || '')
        ).length;

        if (isInProofActions && proofActionCaptures < 2) {
            systemPrompt += `\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PROOF ACTIONS ENFORCEMENT — ACTIVE NOW
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
You are currently in Phase 3 (Proof Actions). You have completed ${proofActionCaptures} proof-action question(s) so far.
You MUST ask at least 2 separate proof-action questions total before moving to Phase 4.
${proofActionCaptures === 0 ? 'Ask Question 1 now — the opening proof action question about what the user will do FIRST when their goals are real.' : ''}
${proofActionCaptures === 1 ? 'Ask Question 2 now — expand across the remaining life areas that were NOT covered by the first proof action. List the uncovered areas by name and ask about them specifically.' : ''}
Do NOT skip to Phase 4 (Story Anchors/Tone). Do NOT move past Proof Actions until you have asked at least 2 questions and received 2 responses.`;
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
