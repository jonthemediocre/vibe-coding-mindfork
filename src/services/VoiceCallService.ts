/**
 * Voice Call Service
 * Wrapper for backend voice calling APIs
 */

import { ENV } from '../config/env';
import { apiInterceptor } from '../utils/api-interceptor';
import { logger } from '../utils/logger';

export interface Call {
  id: string;
  call_sid?: string;
  user_id: string;
  user_phone: string;
  twilio_number: string;
  coach_id: string;
  direction: 'inbound' | 'outbound';
  status: 'initiated' | 'ringing' | 'in-progress' | 'completed' | 'failed' | 'busy' | 'no-answer' | 'cancelled' | 'scheduled';
  call_type: 'reminder' | 'check_in' | 'emergency' | 'scheduled';
  started_at?: string;
  ended_at?: string;
  duration_seconds?: number;
  scheduled_at?: string;
  custom_message?: string;
  created_at: string;
}

export interface InitiateCallRequest {
  phoneNumber: string;
  coachId: string;
  callType: 'reminder' | 'check_in' | 'emergency' | 'scheduled';
  message?: string;
  scheduledAt?: string;
}

export interface InitiateCallResponse {
  callSid?: string;
  callId?: string;
  status: string;
  coach?: string;
  scheduledAt?: string;
  message: string;
}

export interface CallHistoryResponse {
  calls: Call[];
  total: number;
}

export interface CallDetailsResponse {
  call: Call;
}

class VoiceCallService {
  private baseUrl: string;

  constructor() {
    // Use Supabase edge functions endpoint
    this.baseUrl = ENV.SUPABASE_URL
      ? ENV.SUPABASE_URL.replace(/\/$/, '')
      : '';

    if (!this.baseUrl) {
      logger.error('SUPABASE_URL not configured - voice calls will fail');
    }

    if (__DEV__) {
      logger.debug('Voice Call Service initialized', { baseUrl: this.baseUrl });
    }
  }

  /**
   * Initiate an outbound call to user
   */
  async initiateCall(
    accessToken: string,
    request: InitiateCallRequest
  ): Promise<InitiateCallResponse> {
    return apiInterceptor.instrumentRequest(
      '/api/voice/call',
      'POST',
      async () => {
        const response = await fetch(`${this.baseUrl}/functions/v1/make-voice-call`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify(request),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to initiate call');
        }

        return data.data;
      },
      { timeout: 15000 }
    );
  }

  /**
   * Get call history
   */
  async getCallHistory(
    accessToken: string,
    options?: {
      callSid?: string;
      limit?: number;
    }
  ): Promise<CallHistoryResponse | CallDetailsResponse> {
    try {
      const params = new URLSearchParams();
      if (options?.callSid) params.append('callSid', options.callSid);
      if (options?.limit) params.append('limit', options.limit.toString());

      const url = `${this.baseUrl}/api/voice/call${params.toString() ? `?${params.toString()}` : ''}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get call history');
      }

      return data.data;
    } catch (error) {
      logger.error('Failed to get call history', error as Error, {
        operation: 'getCallHistory',
        callSid: options?.callSid,
        limit: options?.limit
      });
      throw error;
    }
  }

  /**
   * Cancel a scheduled call
   */
  async cancelScheduledCall(
    accessToken: string,
    callId: string
  ): Promise<{ message: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/voice/call?callId=${callId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to cancel call');
      }

      return data.data;
    } catch (error) {
      logger.error('Failed to cancel scheduled call', error as Error, {
        operation: 'cancelScheduledCall',
        callId
      });
      throw error;
    }
  }

  /**
   * Format phone number for display
   */
  formatPhoneNumber(phone: string): string {
    // Remove non-numeric characters
    const cleaned = phone.replace(/\D/g, '');

    // Format as (XXX) XXX-XXXX for US numbers
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }

    // Format as +X XXX XXX XXXX for international
    if (cleaned.length === 11 && cleaned[0] === '1') {
      return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
    }

    return phone;
  }

  /**
   * Validate phone number format
   */
  isValidPhoneNumber(phone: string): boolean {
    // Remove non-numeric characters
    const cleaned = phone.replace(/\D/g, '');

    // Check if it's a valid 10-digit US number or 11-digit with country code
    return cleaned.length === 10 || (cleaned.length === 11 && cleaned[0] === '1');
  }
}

export const voiceCallService = new VoiceCallService();
