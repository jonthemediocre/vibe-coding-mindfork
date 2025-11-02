// Coach Service with API fallback to mock data
import { supabase } from './supabaseClient';
import { coachProfiles, getAvailableCoaches, getCoachById } from '../data/coachProfiles';
import { ApiErrorHandler, withFallback } from '../utils/apiErrorHandler';
import { CoachContextService, type CoachContext } from './CoachContextService';
import { WellnessDataService } from '../utils/hipaaCompliance';

// Development flag to track when we're using mock responses
const __DEV__ = process.env.NODE_ENV === 'development';
let mockResponseCount = 0;

export interface CoachMessage {
  id: string;
  coach_id: string;
  user_id: string;
  message: string;
  response: string;
  created_at: string;
}

export class CoachService {
  // Get available coaches with fallback to mock data
  static async getCoaches() {
    return withFallback(
      async () => {
        const { data, error } = await supabase
          .from('coaches')
          .select('*')
          .eq('available', true);
        
        if (error) throw error;
        return data || [];
      },
      () => getAvailableCoaches()
    );
  }

  // Send message to coach with personalized context
  static async sendMessage(coachId: string, message: string, context?: CoachContext) {
    return withFallback(
      async () => {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        // Get coach personality for context
        const coach = getCoachById(coachId);
        const coachPersonality = coach?.personality || 'supportive';

        // Generate concise system prompt
        let systemPrompt = `You are ${coach?.name}, a ${coachPersonality} health and wellness coach. Keep responses brief, supportive, and personalized. Use 2-3 sentences max.`;

        if (context) {
          // Add only essential context info
          systemPrompt += `\n\nUser context:\n- Goal: ${context.userGoals.primary_goal}\n- Daily calories: ${context.userGoals.daily_calories} kcal\n- Today's progress: ${context.currentProgress.calories_consumed}/${context.userGoals.daily_calories} calories`;
        }

        // Use direct OpenAI/OpenRouter API since Edge Function is broken
        // Prioritize OpenRouter if available (user added credits there)
        const openRouterKey = process.env.EXPO_PUBLIC_OPENROUTER_API_KEY;
        const vibecodeKey = process.env.EXPO_PUBLIC_VIBECODE_OPENAI_API_KEY;
        const apiKey = openRouterKey || vibecodeKey;

        if (!apiKey) {
          throw new Error('No AI API key configured');
        }

        const OpenAI = (await import('openai')).default;
        const usingOpenRouter = !!openRouterKey;

        const openai = new OpenAI({
          apiKey: apiKey,
          ...(usingOpenRouter ? {
            baseURL: 'https://openrouter.ai/api/v1',
            defaultHeaders: {
              'HTTP-Referer': 'https://mindfork.app',
              'X-Title': 'MindFork',
            },
          } : {})
        });

        const modelName = usingOpenRouter ? 'openai/gpt-4o-mini' : 'gpt-4o-mini';

        console.log('[CoachService] Sending to AI:', {
          usingOpenRouter,
          modelName,
          systemPromptLength: systemPrompt.length,
          userMessage: message
        });

        const response = await openai.chat.completions.create({
          model: modelName,
          messages: [
            {
              role: 'system',
              content: systemPrompt || `You are ${coach?.name}, a ${coachPersonality} health and wellness coach. Keep responses brief, supportive, and personalized. Use 2-3 sentences max.`
            },
            {
              role: 'user',
              content: message
            }
          ],
          max_tokens: 200,
          temperature: 0.7,
        });

        const aiResponse = response.choices[0]?.message?.content || 'I apologize, I could not generate a response.';

        console.log('[CoachService] AI Response:', {
          responseLength: aiResponse.length,
          response: aiResponse.substring(0, 100) + '...'
        });

        return {
          id: `${Date.now()}`,
          coach_id: coachId,
          user_id: user.id,
          message: message,
          response: aiResponse,
          created_at: new Date().toISOString()
        };
      },
      () => this.getMockResponse(coachId, message, context)
    );
  }

  // Send message with automatic context generation from user profile
  static async sendMessageWithAutoContext(
    coachId: string, 
    message: string, 
    userProfile: any, 
    dailyStats?: any, 
    weeklyStats?: any[]
  ) {
    // Generate context automatically from user data
    const context = CoachContextService.generateContext(
      userProfile,
      dailyStats,
      weeklyStats
    );

    return this.sendMessage(coachId, message, context);
  }

  // Get chat history with fallback to empty array
  static async getChatHistory(coachId: string) {
    return withFallback(
      async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { data, error } = await supabase
          .from('coach_messages')
          .select('*')
          .eq('coach_id', coachId)
          .eq('user_id', user.id)
          .order('created_at', { ascending: true });

        if (error) throw error;
        return data || [];
      },
      () => []
    );
  }

  // Mock response generator - INTENTIONALLY SIMPLE to avoid false intelligence
  private static getMockResponse(coachId: string, message: string, context?: CoachContext): CoachMessage {
    // WARNING: This is a mock response for development only
    // DO NOT make this context-aware as it creates false confidence in AI capabilities
    
    mockResponseCount++;
    
    if (__DEV__) {
      console.warn(`🚨 MOCK AI RESPONSE #${mockResponseCount} - This is not real AI! Connect to actual service.`);
    }
    
    const coach = getCoachById(coachId);
    const coachName = coach?.name || 'Coach';
    
    // Simple, obviously mock response that makes it clear this is not real AI
    const mockResponse = `[MOCK RESPONSE #${mockResponseCount}] Hi! I'm ${coachName}, but I'm currently in development mode. Your message "${message}" was received, but I can't provide intelligent responses yet. Please connect to the real AI service for personalized coaching.`;

    return {
      id: `mock-${Date.now()}`,
      coach_id: coachId,
      user_id: 'mock-user',
      message: message,
      response: mockResponse,
      created_at: new Date().toISOString()
    };
  }

  // Method to check if we're using real AI or mocks
  static isUsingRealAI(): boolean {
    // This would check if the AI service is properly configured
    // For now, return false to indicate we're in development mode
    return false;
  }

  // Get mock response count for debugging
  static getMockResponseCount(): number {
    return mockResponseCount;
  }
}
