/*
IMPORTANT NOTICE: DO NOT REMOVE
./src/api/chat-service.ts
If the user wants to use AI to generate text, answer questions, or analyze images you can use the functions defined in this file to communicate with the OpenAI, Anthropic, and Grok APIs.
*/
import { AIMessage, AIRequestOptions, AIResponse } from "../types/ai";
import { getAnthropicClient } from "./anthropic";
import { getOpenAIClient } from "./openai";
import { getGrokClient } from "./grok";
import {
  AIServiceError,
  AITimeoutError,
  AIRateLimitError,
  AIInvalidRequestError,
} from "../types/errors";

// Default timeout for AI requests (30 seconds)
const DEFAULT_TIMEOUT_MS = 30000;

/**
 * Create a timeout promise that rejects after a given time
 */
function createTimeoutPromise<T>(
  timeoutMs: number,
  provider: "openai" | "anthropic" | "grok"
): Promise<T> {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new AITimeoutError(provider, timeoutMs));
    }, timeoutMs);
  });
}

/**
 * Wrap an async function with timeout
 */
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  provider: "openai" | "anthropic" | "grok"
): Promise<T> {
  return Promise.race([promise, createTimeoutPromise<T>(timeoutMs, provider)]);
}

/**
 * Parse error from AI provider and throw typed error
 */
function handleAIError(error: any, provider: "openai" | "anthropic" | "grok"): never {
  // Check for rate limit errors
  if (error?.status === 429 || error?.statusCode === 429) {
    const retryAfter = error?.headers?.["retry-after"]
      ? parseInt(error.headers["retry-after"], 10)
      : undefined;
    throw new AIRateLimitError(provider, retryAfter);
  }

  // Check for invalid request errors
  if (error?.status === 400 || error?.statusCode === 400) {
    const reason = error?.message || error?.error?.message || "Unknown reason";
    throw new AIInvalidRequestError(provider, reason);
  }

  // Check for timeout errors (already typed)
  if (error instanceof AITimeoutError) {
    throw error;
  }

  // Generic service error
  const message = error?.message || error?.error?.message || "AI service error";
  const statusCode = error?.status || error?.statusCode;
  throw new AIServiceError(message, provider, statusCode, error);
}

/**
 * Get a text response from Anthropic
 * @param messages - The messages to send to the AI
 * @param options - The options for the request
 * @returns The response from the AI
 */
export const getAnthropicTextResponse = async (
  messages: AIMessage[],
  options?: AIRequestOptions,
): Promise<AIResponse> => {
  const timeoutMs = options?.timeout || DEFAULT_TIMEOUT_MS;

  try {
    const client = getAnthropicClient();
    const defaultModel = "claude-3-5-sonnet-20240620";

    const apiCall = client.messages.create({
      model: options?.model || defaultModel,
      messages: messages.map((msg) => ({
        role: msg.role === "assistant" ? "assistant" : "user",
        content: msg.content,
      })),
      max_tokens: options?.maxTokens || 2048,
      temperature: options?.temperature || 0.7,
    });

    const response = await withTimeout(apiCall, timeoutMs, "anthropic");

    // Handle content blocks from the response
    const content = response.content.reduce((acc, block) => {
      if ("text" in block) {
        return acc + block.text;
      }
      return acc;
    }, "");

    return {
      content,
      usage: {
        promptTokens: response.usage?.input_tokens || 0,
        completionTokens: response.usage?.output_tokens || 0,
        totalTokens: (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0),
      },
    };
  } catch (error) {
    handleAIError(error, "anthropic");
  }
};

/**
 * Get a simple chat response from Anthropic
 * @param prompt - The prompt to send to the AI
 * @returns The response from the AI
 */
export const getAnthropicChatResponse = async (prompt: string): Promise<AIResponse> => {
  return await getAnthropicTextResponse([{ role: "user", content: prompt }]);
};

/**
 * Get a text response from OpenAI
 * @param messages - The messages to send to the AI
 * @param options - The options for the request
 * @returns The response from the AI
 */
export const getOpenAITextResponse = async (messages: AIMessage[], options?: AIRequestOptions): Promise<AIResponse> => {
  const timeoutMs = options?.timeout || DEFAULT_TIMEOUT_MS;

  try {
    const client = getOpenAIClient();
    const defaultModel = "gpt-4o"; //accepts images as well, use this for image analysis

    const apiCall = client.chat.completions.create({
      model: options?.model || defaultModel,
      messages: messages,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens || 2048,
    });

    const response = await withTimeout(apiCall, timeoutMs, "openai");

    return {
      content: response.choices[0]?.message?.content || "",
      usage: {
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0,
      },
    };
  } catch (error) {
    handleAIError(error, "openai");
  }
};

/**
 * Get a simple chat response from OpenAI
 * @param prompt - The prompt to send to the AI
 * @returns The response from the AI
 */
export const getOpenAIChatResponse = async (prompt: string): Promise<AIResponse> => {
  return await getOpenAITextResponse([{ role: "user", content: prompt }]);
};

/**
 * Get a text response from Grok
 * @param messages - The messages to send to the AI
 * @param options - The options for the request
 * @returns The response from the AI
 */
export const getGrokTextResponse = async (messages: AIMessage[], options?: AIRequestOptions): Promise<AIResponse> => {
  const timeoutMs = options?.timeout || DEFAULT_TIMEOUT_MS;

  try {
    const client = getGrokClient();
    const defaultModel = "grok-4-fast-non-reasoning"; // Latest Grok 4 - best for math and reasoning

    const apiCall = client.chat.completions.create({
      model: options?.model || defaultModel,
      messages: messages,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens || 2048,
    });

    const response = await withTimeout(apiCall, timeoutMs, "grok");

    return {
      content: response.choices[0]?.message?.content || "",
      usage: {
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0,
      },
    };
  } catch (error) {
    handleAIError(error, "grok");
  }
};

/**
 * Get a simple chat response from Grok
 * @param prompt - The prompt to send to the AI
 * @returns The response from the AI
 */
export const getGrokChatResponse = async (prompt: string): Promise<AIResponse> => {
  return await getGrokTextResponse([{ role: "user", content: prompt }]);
};
