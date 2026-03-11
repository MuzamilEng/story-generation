import { AzureChatOpenAI, ChatOpenAI } from "@langchain/openai";

const isAzure = !!process.env.AZURE_OPENAI_API_KEY && !!process.env.AZURE_OPENAI_ENDPOINT;

export const model = isAzure
    ? new AzureChatOpenAI({
        azureOpenAIApiKey: process.env.AZURE_OPENAI_API_KEY,
        azureOpenAIEndpoint: process.env.AZURE_OPENAI_ENDPOINT,
        azureOpenAIApiDeploymentName: process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'gpt-4o',
        azureOpenAIApiVersion: process.env.AZURE_OPENAI_API_VERSION || '2024-12-01-preview',
        temperature: 0.7,
    })
    : new ChatOpenAI({
        apiKey: process.env.OPENAI_API_KEY,
        model: "gpt-4o",
        temperature: 0.7,
    });
