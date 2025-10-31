/*
IMPORTANT NOTICE: DO NOT REMOVE
This is a custom client for the Grok API. You may update this service, but you should not need to.
The Grok API can be communicated with the "openai" package, so you can use the same functions as the openai package. It may not support all the same features, so please be careful.

AVAILABLE MODELS:
grok-4-fast-non-reasoning - Latest, fastest, best for math and reasoning
grok-3-latest
grok-3-fast-latest
grok-3-mini-latest
*/
import OpenAI from "openai";

export const getGrokClient = () => {
  const apiKey = process.env.EXPO_PUBLIC_VIBECODE_GROK_API_KEY;
  if (!apiKey) {
    console.warn("Grok API key not found in environment variables");
  }
  return new OpenAI({
    apiKey: apiKey,
    baseURL: "https://api.x.ai/v1",
  });
};
