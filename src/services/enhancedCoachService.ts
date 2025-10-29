// Enhanced Coach Service with Development Mode Support
import { devConfig, devLog, devError } from '../config/developmentConfig';
import { coachProfiles, getAvailableCoaches } from '../data/coachProfiles';
import { MockAuthService } from './mockAuthService';

export class EnhancedCoachService {
  static async getCoaches() {
    devLog('Getting coaches...');
    
    if (devConfig.useCoachProfiles) {
      devLog('Using coach profiles');
      return getAvailableCoaches();
    }
    
    try {
      // Real API call would go here
      devLog('Would call real API for coaches');
      // For now, return mock data
      return getAvailableCoaches();
    } catch (error) {
      devError('Failed to get coaches:', error);
      return getAvailableCoaches(); // Fallback to mock
    }
  }

  static async sendMessage(coachId: string, message: string) {
    devLog('Sending message to coach:', coachId, message);
    
    if (devConfig.useMockAuth) {
      const user = await MockAuthService.getCurrentUser();
      if (!user) {
        throw new Error('Please sign in to chat with coaches');
      }
    }
    
    if (devConfig.useCoachProfiles) {
      devLog('Using coach profile response');
      return this.getMockResponse(coachId, message);
    }
    
    try {
      // Real API call would go here
      devLog('Would call real API for coach message');
      // For now, return mock response
      return this.getMockResponse(coachId, message);
    } catch (error) {
      devError('Failed to send message:', error);
      return this.getMockResponse(coachId, message); // Fallback to mock
    }
  }

  static async getChatHistory(coachId: string) {
    devLog('Getting chat history for coach:', coachId);
    
    if (devConfig.useCoachProfiles) {
      devLog('Using coach profile chat history');
      return []; // Empty history for now
    }
    
    try {
      // Real API call would go here
      devLog('Would call real API for chat history');
      return [];
    } catch (error) {
      devError('Failed to get chat history:', error);
      return []; // Fallback to empty
    }
  }

  private static getMockResponse(coachId: string, message: string) {
    const coach = coachProfiles.find(c => c.id === coachId);
    if (!coach) {
      throw new Error('Coach not found');
    }

    const responses = {
      'nora-gentle': [
        "I understand how you're feeling. Let's take this one step at a time. 💙",
        "You're doing great! Remember, every small step counts toward your goals.",
        "It's okay to have challenging days. What matters is that you're here and trying.",
        "I'm here to support you. What would help you feel more confident today?"
      ],
      'blaze-hype': [
        "LET'S GO! You've got this! 🔥 Time to crush those goals!",
        "ENERGY CHECK! You're stronger than you think - let's prove it!",
        "No excuses, just results! You're about to do something amazing!",
        "BOOM! That's the spirit I want to see! Keep that fire burning! 🚀"
      ],
      'kai-planner': [
        "Let me analyze your progress and suggest an optimized approach. 📊",
        "Based on your data, here's what I recommend for maximum efficiency.",
        "Let's break this down systematically and create a strategic plan.",
        "I've calculated the optimal path forward. Here's your next move..."
      ],
      'sato-discipline': [
        "Discipline is the bridge between goals and accomplishment. Stay focused. 🥋",
        "Consistency beats perfection. Keep showing up, even when it's hard.",
        "Your commitment today determines your success tomorrow. Stay disciplined.",
        "True strength comes from doing what needs to be done, especially when you don't feel like it."
      ],
      'maya-rival': [
        "Think you can handle a real challenge? Let's see what you're made of! 🏆",
        "Good, but I know you can do better. Push harder!",
        "Impressive, but don't get comfortable. The competition never sleeps!",
        "You want to beat me? Prove it! Show me what real dedication looks like!"
      ]
    };

    const coachResponses = responses[coachId as keyof typeof responses] || responses['nora-gentle'];
    const randomResponse = coachResponses[Math.floor(Math.random() * coachResponses.length)];

    return {
      id: `mock-${Date.now()}`,
      coach_id: coachId,
      user_id: 'mock-user',
      message: message,
      response: randomResponse,
      created_at: new Date().toISOString(),
      mock: true
    };
  }
}
