import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { invokeWithFallback } from '@/lib/langchain';
import { SYSTEM_PROMPT } from '@/app/types/goal-discovery';
import { HumanMessage, SystemMessage, AIMessage } from "@langchain/core/messages";

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { messages } = await req.json();

        if (!messages || !Array.isArray(messages)) {
            return NextResponse.json({ error: 'Invalid messages' }, { status: 400 });
        }

        // Build the system prompt with area-by-area enforcement and current date
        const currentMonthYear = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
        let systemPrompt = `CURRENT_DATE: ${currentMonthYear}\n\n${SYSTEM_PROMPT}`;

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
        // Count how many assistant messages contain CAPTURE for actionsAfter (= completed Q&A exchanges)
        const proofActionCaptures = messages.filter(
            (m: any) => m.role === 'assistant' && /CAPTURE[:\s]*\{[^}]*"label"\s*:\s*"actionsAfter"/i.test(m.content || '')
        ).length;

        // Extract selected life areas from the conversation to enforce per-area coverage
        const selectedAreasMatch = allContent.match(/life areas i want to transform are:\s*(.+)/i);
        let selectedAreasList: string[] = [];
        if (selectedAreasMatch) {
            selectedAreasList = selectedAreasMatch[1].split(',').map((a: string) => a.trim().replace(/\.$/, '')).filter(Boolean);
        }
        // Also try to parse from CAPTURE tags for selectedAreas
        const selectedAreasCaptureMatch = allContent.match(/CAPTURE[:\s]*\{[^}]*"label"\s*:\s*"selectedAreas"[^}]*"value"\s*:\s*\[([^\]]*)\]/i);
        if (selectedAreasCaptureMatch && selectedAreasList.length === 0) {
            selectedAreasList = selectedAreasCaptureMatch[1].replace(/"/g, '').split(',').map((a: string) => a.trim()).filter(Boolean);
        }

        // Minimum proof action exchanges: at least 2, scaled up if many areas (capped at 4 per spec)
        const minProofExchanges = Math.max(2, Math.min(selectedAreasList.length > 0 ? Math.ceil(selectedAreasList.length / 2) + 1 : 2, 4));

        if (isInProofActions && proofActionCaptures < minProofExchanges) {
            // Try to identify which areas have proof action coverage from CAPTURE values
            const proofCaptureTexts = messages
                .filter((m: any) => m.role === 'assistant' && /CAPTURE[:\s]*\{[^}]*"label"\s*:\s*"actionsAfter"/i.test(m.content || ''))
                .map((m: any) => m.content || '');
            const coveredAreasInProof = selectedAreasList.filter(area =>
                proofCaptureTexts.some((text: string) => text.toLowerCase().includes(area.toLowerCase()))
            );
            const uncoveredAreas = selectedAreasList.filter(area => !coveredAreasInProof.includes(area));

            systemPrompt += `\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PROOF ACTIONS ENFORCEMENT — ACTIVE NOW
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
You are currently in Phase 3 (Proof Actions). You have completed ${proofActionCaptures} proof-action question(s) so far.
The user selected these life areas: ${selectedAreasList.length > 0 ? selectedAreasList.join(', ') : 'multiple areas'}.
You MUST ask at least ${minProofExchanges} separate proof-action questions total before moving to Phase 4.
${proofActionCaptures === 0 ? 'Ask Step 1 now — the opening proof action question: "Once [reference their most important goal] is real — what is the very first thing you do?"' : ''}
${proofActionCaptures >= 1 && uncoveredAreas.length > 0 ? `Ask Step 2 now — the following life areas still need proof action coverage: ${uncoveredAreas.join(', ')}. Ask about ONE uncovered area at a time: "You also mentioned [uncovered goal area] — what is one moment that tells you that is completely real too?"` : ''}
${proofActionCaptures >= 1 && uncoveredAreas.length === 0 ? 'Ask the final confirmation step — list all captured proof actions and confirm: "Does this cover the life that is waiting for you — or is there anything else?"' : ''}
The proof action prompt MUST reference ALL goals from ALL selected areas, not just a subset.
Do NOT skip to Phase 4 (Story Anchors/Tone). Do NOT move past Proof Actions until you have asked at least ${minProofExchanges} questions and received responses covering ALL selected life areas.`;
        }

        const langchainMessages = [
            new SystemMessage(systemPrompt),
            ...messages.map((m: any) =>
                m.role === 'user' ? new HumanMessage(m.content) : new AIMessage(m.content)
            )
        ];

        const response = await invokeWithFallback(langchainMessages, { primaryRetries: 2 });

        return NextResponse.json({ text: response.content });
    } catch (error: any) {
        console.error('Error in LangChain chat API:', error);
        return NextResponse.json({ error: error.message || 'Error occurred' }, { status: 500 });
    }
}
