import { useState, useCallback, useRef } from "react";
import { getAnthropicTextResponse } from "../api/chat-service";
import { AIMessage } from "../types/ai";

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
}

interface KnowledgeState {
  itemsUsed?: number;
  sources?: string[];
  categories?: string[];
}

interface AgentState {
  messages: Message[];
  thinking: boolean;
  status: "idle" | "streaming" | "error";
  error?: string;
  steps: string[];
  knowledge?: KnowledgeState;
}

interface UseAgentStreamOptions {
  userId: string;
  coachPersona?: string;
  roastLevel?: number;
  isPremium?: boolean;
  accessToken?: string;
  includeCredentials?: boolean;
}

export function useAgentStream(options: UseAgentStreamOptions) {
  const [state, setState] = useState<AgentState>({
    messages: [],
    thinking: false,
    status: "idle",
    steps: [],
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(
    async (userMessage: string) => {
      // Cancel any ongoing request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;

      // Create user message
      const newUserMessage: Message = {
        id: Date.now().toString(),
        role: "user",
        content: userMessage,
      };

      // Update state with user message and set thinking
      setState((prev) => ({
        ...prev,
        messages: [...prev.messages, newUserMessage],
        thinking: true,
        status: "streaming",
        error: undefined,
      }));

      try {
        // Build conversation history for AI
        const conversationHistory: AIMessage[] = [
          {
            role: "system",
            content: `You are a ${options.coachPersona || "supportive"} coach with a roast level of ${
              options.roastLevel || 3
            }/10. Help the user with their fitness and nutrition goals.`,
          },
          ...state.messages.map((msg) => ({
            role: msg.role as "user" | "assistant",
            content: msg.content,
          })),
          {
            role: "user",
            content: userMessage,
          },
        ];

        // Get AI response
        const response = await getAnthropicTextResponse(conversationHistory, {
          maxTokens: 1024,
          temperature: 0.7,
        });

        // Check if request was aborted
        if (controller.signal.aborted) {
          return;
        }

        // Create assistant message
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: response.content,
        };

        // Update state with assistant response
        setState((prev) => ({
          ...prev,
          messages: [...prev.messages, assistantMessage],
          thinking: false,
          status: "idle",
        }));
      } catch (error: any) {
        // Check if request was aborted
        if (controller.signal.aborted) {
          return;
        }

        // Handle error
        setState((prev) => ({
          ...prev,
          thinking: false,
          status: "error",
          error: error.message || "Failed to get response from coach",
        }));
      } finally {
        abortControllerRef.current = null;
      }
    },
    [options.coachPersona, options.roastLevel, state.messages]
  );

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setState((prev) => ({
        ...prev,
        thinking: false,
        status: "idle",
      }));
    }
  }, []);

  return {
    state,
    sendMessage,
    cancel,
  };
}
