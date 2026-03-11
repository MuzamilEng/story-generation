import OpenAI from 'openai';
import { AzureOpenAI } from 'openai';

const isAzure = !!process.env.AZURE_OPENAI_API_KEY && !!process.env.AZURE_OPENAI_ENDPOINT;

export const openai = isAzure
    ? new AzureOpenAI({
        apiKey: process.env.AZURE_OPENAI_API_KEY,
        endpoint: process.env.AZURE_OPENAI_ENDPOINT,
        apiVersion: process.env.AZURE_OPENAI_API_VERSION || '2024-12-01-preview',
        deployment: process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'gpt-4o',
    })
    : new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    });
