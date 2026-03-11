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

        const langchainMessages = [
            new SystemMessage(SYSTEM_PROMPT),
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
