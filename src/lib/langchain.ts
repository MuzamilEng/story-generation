import { AzureChatOpenAI, ChatOpenAI } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";
import { BaseLanguageModel } from "@langchain/core/language_models/base";

// Support both env var naming conventions
const anthropicKey = process.env.ANTHROPIC_API_KEY || process.env.Anthropic_API;
const isAnthropic = !!anthropicKey;
const isAzure = !!process.env.AZURE_OPENAI_API_KEY && !!process.env.AZURE_OPENAI_ENDPOINT;
const isOpenAI = !!process.env.OPENAI_API_KEY;

console.log(`[LangChain] Model selection: Anthropic=${isAnthropic}, Azure=${isAzure}, OpenAI=${isOpenAI}`);

// Primary model
export const model = isAnthropic
    ? new ChatAnthropic({
        anthropicApiKey: anthropicKey,
        modelName: "claude-sonnet-4-20250514",
        temperature: 0.88,
        maxTokens: 16384,
        maxRetries: 0, // We handle retries + fallback ourselves
    })
    : isAzure
    ? new AzureChatOpenAI({
        azureOpenAIApiKey: process.env.AZURE_OPENAI_API_KEY,
        azureOpenAIEndpoint: process.env.AZURE_OPENAI_ENDPOINT,
        azureOpenAIApiDeploymentName: process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'gpt-4o',
        azureOpenAIApiVersion: process.env.AZURE_OPENAI_API_VERSION || '2024-12-01-preview',
        temperature: 0.88,
        maxRetries: 0,
    })
    : new ChatOpenAI({
        apiKey: process.env.OPENAI_API_KEY,
        model: "gpt-4o-2024-08-06",
        temperature: 0.88,
        maxTokens: 16384,
        maxRetries: 0,
    });

// Fallback models tried in order when primary fails with 529/503/429
const fallbackModels: BaseLanguageModel[] = [];

// Fallback 1: Claude 3.5 Sonnet — same API key, different model, much less traffic
if (isAnthropic) {
    fallbackModels.push(new ChatAnthropic({
        anthropicApiKey: anthropicKey,
        modelName: "claude-3-5-sonnet-20241022",
        temperature: 0.88,
        maxTokens: 16384,
        maxRetries: 0,
    }));
}

// Fallback 2: Azure OpenAI (if configured)
if (isAnthropic && isAzure) {
    fallbackModels.push(new AzureChatOpenAI({
        azureOpenAIApiKey: process.env.AZURE_OPENAI_API_KEY,
        azureOpenAIEndpoint: process.env.AZURE_OPENAI_ENDPOINT,
        azureOpenAIApiDeploymentName: process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'gpt-4o',
        azureOpenAIApiVersion: process.env.AZURE_OPENAI_API_VERSION || '2024-12-01-preview',
        temperature: 0.88,
        maxRetries: 0,
    }));
}

if (isAnthropic && isOpenAI && !isAzure) {
    fallbackModels.push(new ChatOpenAI({
        apiKey: process.env.OPENAI_API_KEY,
        model: "gpt-4o-2024-08-06",
        temperature: 0.88,
        maxTokens: 16384,
        maxRetries: 0,
    }));
}

/**
 * Invoke the primary model with automatic retry + fallback to secondary models.
 * Retryable statuses: 529 (overloaded), 503 (unavailable), 429 (rate limit).
 * Tries primary up to `primaryRetries` times, then each fallback once.
 */
export async function invokeWithFallback(
    messages: any[],
    opts: { primaryRetries?: number } = {}
): Promise<any> {
    const { primaryRetries = 2 } = opts;
    const isRetryable = (err: any) => {
        const s = err?.status || err?.response?.status;
        return s === 529 || s === 503 || s === 429;
    };

    // Try primary with retries
    for (let attempt = 1; attempt <= primaryRetries; attempt++) {
        try {
            return await (model as any).invoke(messages);
        } catch (err: any) {
            if (isRetryable(err) && attempt < primaryRetries) {
                const delay = Math.min(1000 * Math.pow(2, attempt - 1), 8000) + Math.random() * 500;
                console.warn(`[LangChain] Primary attempt ${attempt}/${primaryRetries} failed (status ${err?.status}). Retrying in ${Math.round(delay)}ms...`);
                await new Promise(r => setTimeout(r, delay));
            } else if (isRetryable(err) && fallbackModels.length > 0) {
                console.warn(`[LangChain] Primary exhausted after ${primaryRetries} attempts (status ${err?.status}). Trying fallback models...`);
                break; // Fall through to fallbacks
            } else {
                throw err;
            }
        }
    }

    // Try each fallback model
    for (let i = 0; i < fallbackModels.length; i++) {
        try {
            console.log(`[LangChain] Using fallback model ${i + 1}/${fallbackModels.length}`);
            return await (fallbackModels[i] as any).invoke(messages);
        } catch (err: any) {
            console.error(`[LangChain] Fallback model ${i + 1} failed:`, err?.status || err?.message);
            if (i === fallbackModels.length - 1) throw err;
        }
    }

    throw new Error('All models failed');
}

