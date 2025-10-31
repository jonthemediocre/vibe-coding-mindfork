import { useState, useCallback, useRef } from "react";
import { getAnthropicTextResponse } from "../api/chat-service";
import { AIMessage } from "../types/ai";
import { buildRoastModePrompt } from "../services/RoastModeService";

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
  coachId?: string; // Changed from coachPersona to coachId for proper integration
  coachPersona?: string; // Keep for backwards compatibility
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
        // Build proper system prompt with coach personality and roast level
        const coachId = options.coachId || options.coachPersona || 'synapse';
        const roastLevel = options.roastLevel || 3;

        const systemPrompt = buildRoastModePrompt({
          coachId,
          roastLevel,
          context: undefined // Can be added later for context-aware coaching
        });

        // Build conversation history for AI
        // IMPORTANT: System message is NOT stored in state.messages to prevent leaking
        // Only user/assistant messages are stored and displayed to user
        const conversationHistory: AIMessage[] = [
          {
            role: "system",
            content: systemPrompt,
          },
          ...state.messages
            .filter(msg => msg.role !== "system") // Never include system messages from state
            .map((msg) => ({
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
    [options.coachId, options.coachPersona, options.roastLevel, state.messages]
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
