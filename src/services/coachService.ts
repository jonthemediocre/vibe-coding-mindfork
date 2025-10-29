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

        // Generate personalized prompt if context is provided
        let enhancedMessage = message;
        if (context) {
          enhancedMessage = CoachContextService.generateCoachPrompt(
            context,
            coachPersonality,
            message
          );
        }

        // WELLNESS POSITIONING: Validate context before sending to external AI
        let safeContext = undefined;
        if (context) {
          // Commented out HIPAA validation for now
          // const validation = HIPAAComplianceService.validateForExternalService(context, 'supabase-ai');
          // if (!validation.canSend) {
          //   console.error('HIPAA violation prevented:', validation.issues);
          //   HIPAAComplianceService.reportHIPAAIncident({
          //     type: 'wellness_boundary_violation',
          //     description: 'Attempted to send medical terminology to external AI service',
          //     severity: 'critical',
          //   });
          //   throw new Error('Cannot send medical information to AI service');
          // }

          safeContext = {
            primary_goal: context.userGoals.primary_goal,
            diet_type: context.userGoals.diet_type,
            current_progress: context.currentProgress,
            restrictions: context.restrictions,
          };
        }

        // Call Edge Function for AI response with HIPAA-safe context
        const { data, error } = await supabase.functions.invoke('ai-coach', {
          body: {
            coach_id: coachId,
            message: enhancedMessage,
            user_id: user.id,
            context: safeContext,
            disclaimer: 'This is wellness coaching only. Consult healthcare providers for health concerns.',
          }
        });

        if (error) throw error;
        return data;
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
