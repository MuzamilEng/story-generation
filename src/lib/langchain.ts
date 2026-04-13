import { AzureChatOpenAI, ChatOpenAI } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";

// Support both env var naming conventions
const anthropicKey = process.env.ANTHROPIC_API_KEY || process.env.Anthropic_API;
const isAnthropic = !!anthropicKey;
const isAzure = !!process.env.AZURE_OPENAI_API_KEY && !!process.env.AZURE_OPENAI_ENDPOINT;

console.log(`[LangChain] Model selection: Anthropic=${isAnthropic}, Azure=${isAzure}`);

export const model = isAnthropic
    ? new ChatAnthropic({
        anthropicApiKey: anthropicKey,
        modelName: "claude-sonnet-4-20250514",
        temperature: 0.88,
        maxTokens: 16384,
        maxRetries: 3,
    })
    : isAzure
    ? new AzureChatOpenAI({
        azureOpenAIApiKey: process.env.AZURE_OPENAI_API_KEY,
        azureOpenAIEndpoint: process.env.AZURE_OPENAI_ENDPOINT,
        azureOpenAIApiDeploymentName: process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'gpt-4o',
        azureOpenAIApiVersion: process.env.AZURE_OPENAI_API_VERSION || '2024-12-01-preview',
        temperature: 0.88,
    })
    : new ChatOpenAI({
        apiKey: process.env.OPENAI_API_KEY,
        model: "gpt-4o-2024-08-06",
        temperature: 0.88,
        maxTokens: 16384,
    });
