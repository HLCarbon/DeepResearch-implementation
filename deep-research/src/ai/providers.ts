import { createOpenAI, type OpenAIProviderSettings } from '@ai-sdk/openai';
import { getEncoding } from 'js-tiktoken';
import * as fs from 'fs/promises';
import { zodToJsonSchema } from "zod-to-json-schema";

import { RecursiveCharacterTextSplitter } from './text-splitter';
import { RateLimiter } from '../utils/RateLimiter';
import { appendFileSync, writeFile } from 'fs';
import { z } from 'zod';
import { generateText, LanguageModel } from 'ai';
import { getSchemaPrompt } from '../prompt';

interface CustomOpenAIProviderSettings extends OpenAIProviderSettings {
  baseURL?: string;
}

// Providers
const openai = createOpenAI({
  apiKey: process.env.OPENROUTER_KEY!,
  baseURL: process.env.OPENROUTER_ENDPOINT,
} as CustomOpenAIProviderSettings);

// --- Rate Limiting Setup ---
// Configure the maximum calls per minute and rate limit interval.
const MAX_CALLS_PER_MINUTE = 9; // Adjust this value per your model's limit.
const RATE_LIMIT_INTERVAL_MS = 61000; // 60,000 ms = 1 minute.
const modelCallTimestamps: number[] = [];

// Create a RateLimiter instance for Gemini API (10 calls per minute)
const geminiLimiter = new RateLimiter(MAX_CALLS_PER_MINUTE, RATE_LIMIT_INTERVAL_MS);

// Helper function to enforce the rate limit.
// It removes outdated timestamps, then waits if we've reached the maximum allowed calls.
export async function checkRateLimit() {
  await geminiLimiter.schedule(() => Promise.resolve());
}

function logDebug(...args: any[]) {
  const timestamp = new Date().toISOString();
  // Only log non-object arguments or small object summaries
  const message = args.map(a => {
    if (typeof a === 'object') {
      if (a instanceof Error) return a.message;
      return '[Object]'; // Don't log raw content
    }
    return String(a);
  }).join(' ');
  const logMessage = `${timestamp} ${message}`;
  appendFileSync('debug.log', logMessage + '\n', { encoding: 'utf8', flag: 'a' });
  console.debug(message);
}

export async function generateWithGemini<T>({ 
  prompt, 
  system = '', 
  schema,
  model,
  replaceQuotes = false 
}: { 
  prompt: string;
  system?: string;
  schema: z.ZodType<T>;
  model: LanguageModel;
  replaceQuotes?:boolean
}) {
  const fullPrompt = `${system ? system + '\n\n' : ''}${prompt}${getSchemaPrompt(JSON.stringify(zodToJsonSchema(schema), null, 2))}`

  // Enforce the model's rate limit.
  await checkRateLimit();
  logDebug("Sending request to API");

  let result;
  try {
    result = await generateText({model:model,prompt:fullPrompt, maxRetries:2, abortSignal: AbortSignal.timeout(120_000)} )
    logDebug("API request successful");
  } catch (apiError) {
    logError("API call failed", apiError);
    throw apiError;
  }

  const response = result.response;
  var cleanedText = "";
  logDebug("Processing API response");

  let text;
  try {
    text = response.messages[0]?.content[0]["text"];
    logDebug("Successfully extracted response text");
  } catch (err) {
    logError("Failed to extract response text", err);
    throw err;
  }

  try {
    // Clean the response text - remove any markdown formatting
    cleanedText = text
      .replace(/```(?:json)?\s*([\s\S]*?)\s*```/gi, '$1') // Remove any markdown code fences with optional language tag
      .replace(/```(?:json)?\s*([\s\S]*?)\s*```/gi, '$1') // Remove any markdown code fences with optional language tag
      .replace(/`/g, '') // Remove any residual backticks
      .trim() // Trim whitespace and newlines
      //.replace(/\\n/g, ' ')
      .replace(/\\\\\$/g, "$") // Replace escaped newlines with spaces
      .replace(/\\\$/g, "$") // Replace escaped newlines with spaces
      .replace(/,\s*\]/g, ']') // Remove trailing commas in arrays
      .replace(/,\s*\}/g, '}')
      .replace(/\\_/g, "/") // Remove trailing commas in objects
      .replace(/\_/g, "/") // Remove trailing commas in objects
      .replace(/[\r\v\f\u2028\u2029]+/g, "")
      .trim();
    if (cleanedText[0]=='['&& cleanedText[cleanedText.length-1]==']'){
      cleanedText = `{"queries":` + cleanedText +`}`
    }
    if (cleanedText.includes('"learnings":')&& !cleanedText.includes("followUpQuestions:")){
      cleanedText = cleanedText.slice(0,cleanedText.length-1) + ',"followUpQuestions":[]' + cleanedText[cleanedText.length-1]
    }
    if (replaceQuotes){
      cleanedText= escapeFourthQuote(cleanedText);
    }

    try {
      // First try direct JSON parse
      const json = JSON.parse(cleanedText);
      const finalJson = Array.isArray(json) ? { ...json } : json;
      return { object: schema.parse(finalJson) };
    } catch (parseError) {
      // Fallback: try to extract JSON if still needed
      const jsonMatch = cleanedText.match(/[\{\[][\s\S]*[\}\]]/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      const json = JSON.parse(jsonMatch[0]);
      const finalJson = Array.isArray(json) ? { ...json } : json;
      return { object: schema.parse(finalJson) };
    }
  } catch (e: any) {
    // Add more context to the error
    const errorMessage = e.message || '';
    const schemaContext = `Expected schema: ${schema.toString()}\n`;
    const responseContext = `Full response: ${text}`;
    const cl = `Cleaned response: ${cleanedText}`;
    await fs.writeFile('error.json', cleanedText, 'utf-8');
    throw new Error(`Failed to parse response as JSON: ${errorMessage}\n${schemaContext}\n${responseContext}`);
  }
}
function logError(...args: any[]) {
  const timestamp = new Date().toISOString();
  const message = args.map(a => {
    if (typeof a === 'object') {
      if (a instanceof Error) return a.message;
      return '[Object]'; // Don't log raw content
    }
    return String(a);
  }).join(' ');
  const logMessage = `${timestamp} ERROR: ${message}`;
  appendFileSync('debug.log', logMessage + '\n', { encoding: 'utf8', flag: 'a' });
  console.error(message);
}

const customModel = process.env.OPENROUTER_MODEL || 'o3-mini';

// Models

export const o3MiniModel = openai(customModel, {
  reasoningEffort: customModel.startsWith('o') ? 'medium' : undefined,
  structuredOutputs: true,
});

const MinChunkSize = 140;
const encoder = getEncoding('o200k_base');

// trim prompt to maximum context size
export function trimPrompt(
  prompt: string,
  contextSize = Number(process.env.CONTEXT_SIZE) || 128_000,
) {
  if (!prompt) {
    return '';
  }

  const length = encoder.encode(prompt).length;
  if (length <= contextSize) {
    return prompt;
  }

  const overflowTokens = length - contextSize;
  // on average it's 3 characters per token, so multiply by 3 to get a rough estimate of the number of characters
  const chunkSize = prompt.length - overflowTokens * 3;
  if (chunkSize < MinChunkSize) {
    return prompt.slice(0, MinChunkSize);
  }

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize,
    chunkOverlap: 0,
  });
  const trimmedPrompt = splitter.splitText(prompt)[0] ?? '';

  // last catch, there's a chance that the trimmed prompt is same length as the original prompt, due to how tokens are split & innerworkings of the splitter, handle this case by just doing a hard cut
  if (trimmedPrompt.length === prompt.length) {
    return trimPrompt(prompt.slice(0, chunkSize), contextSize);
  }

  // recursively trim until the prompt is within the context size
  return trimPrompt(trimmedPrompt, contextSize);
}

export function escapeFourthQuote(input: string): string {
  let count = 0;
  let lastIndex = input.lastIndexOf('"');

  return input.replace(/"/g, (match, index) => {
      count++;
      if (count >= 4 && index !== lastIndex) {
          return "'"; // Add a backslash before the fourth quote
      }
      return match;
  });
}

function schemaToString(schema: z.ZodTypeAny): string {
  return JSON.stringify(schema._def, null, 2);
}
