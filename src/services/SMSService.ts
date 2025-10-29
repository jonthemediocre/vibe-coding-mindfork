/**
 * SMS Service
 * Wrapper for backend SMS messaging APIs
 */

import { ENV } from '../config/env';
import { apiInterceptor } from '../utils/api-interceptor';
import { logger } from '../utils/logger';

export interface SMSMessage {
  id: string;
  message_sid?: string;
  user_id: string;
  user_phone: string;
  twilio_number: string;
  coach_id: string;
  direction: 'inbound' | 'outbound';
  body: string;
  message_type: 'reminder' | 'check_in' | 'motivation' | 'alert' | 'custom';
  status: 'queued' | 'sent' | 'delivered' | 'failed' | 'scheduled' | 'cancelled';
  scheduled_at?: string;
  in_reply_to?: string;
  created_at: string;
  updated_at?: string;
}

export interface SendSMSRequest {
  phoneNumber: string;
  message: string;
  coachId: string;
  messageType: 'reminder' | 'check_in' | 'motivation' | 'alert' | 'custom';
  scheduledAt?: string;
}

export interface SendSMSResponse {
  messageSid?: string;
  messageId?: string;
  status: string;
  coach?: string;
  messageLength?: number;
  segments?: number;
  scheduledAt?: string;
  message: string;
}

export interface SMSHistoryResponse {
  messages: SMSMessage[];
  conversations: Conversation[];
  total: number;
  filters: {
    phoneNumber?: string;
    coachId?: string;
    limit: number;
  };
}

export interface Conversation {
  phoneNumber: string;
  coachId: string;
  messages: SMSMessage[];
  lastMessageAt: string;
  messageCount: number;
}

export interface MessageDetailsResponse {
  message: SMSMessage;
}

class SMSService {
  private baseUrl: string;
  private maxMessageLength = 1600; // 10 SMS segments

  constructor() {
    // Use Supabase edge functions endpoint
    this.baseUrl = ENV.SUPABASE_URL
      ? ENV.SUPABASE_URL.replace(/\/$/, '')
      : '';

    if (!this.baseUrl) {
      logger.error('SUPABASE_URL not configured - SMS will fail');
    }

    if (__DEV__) {
      logger.debug('SMS Service initialized', { baseUrl: this.baseUrl });
    }
  }

  /**
   * Send an SMS message
   */
  async sendSMS(
    accessToken: string,
    request: SendSMSRequest
  ): Promise<SendSMSResponse> {
    return apiInterceptor.instrumentRequest(
      '/functions/v1/send-sms-direct',
      'POST',
      async () => {
        // Validate message length
        if (request.message.length > this.maxMessageLength) {
          throw new Error(`Message too long. Maximum ${this.maxMessageLength} characters (10 SMS segments)`);
        }

        const response = await fetch(`${this.baseUrl}/functions/v1/send-sms-direct`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify(request),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to send SMS');
        }

        return data.data;
      },
      { timeout: 10000 }
    );
  }

  /**
   * Get SMS message history
   */
  async getMessageHistory(
    accessToken: string,
    options?: {
      messageSid?: string;
      phoneNumber?: string;
      coachId?: string;
      limit?: number;
    }
  ): Promise<SMSHistoryResponse | MessageDetailsResponse> {
    try {
      const params = new URLSearchParams();
      if (options?.messageSid) params.append('messageSid', options.messageSid);
      if (options?.phoneNumber) params.append('phoneNumber', options.phoneNumber);
      if (options?.coachId) params.append('coachId', options.coachId);
      if (options?.limit) params.append('limit', options.limit.toString());

      const url = `${this.baseUrl}/functions/v1/send-sms-direct${params.toString() ? `?${params.toString()}` : ''}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get message history');
      }

      return data.data;
    } catch (error) {
      logger.error('Failed to get message history', error as Error, {
        operation: 'getMessageHistory',
        messageSid: options?.messageSid,
        phoneNumber: options?.phoneNumber,
        coachId: options?.coachId,
        limit: options?.limit
      });
      throw error;
    }
  }

  /**
   * Cancel a scheduled SMS
   */
  async cancelScheduledSMS(
    accessToken: string,
    messageId: string
  ): Promise<{ message: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/functions/v1/send-sms-direct?messageId=${messageId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to cancel SMS');
      }

      return data.data;
    } catch (error) {
      logger.error('Failed to cancel scheduled SMS', error as Error, {
        operation: 'cancelScheduledSMS',
        messageId
      });
      throw error;
    }
  }

  /**
   * Calculate SMS segments for a message
   */
  calculateSegments(message: string): number {
    // Basic SMS segment calculation
    // 160 chars for GSM-7, 70 for Unicode
    const isUnicode = /[^\x00-\x7F]/.test(message);
    const segmentSize = isUnicode ? 70 : 160;
    return Math.ceil(message.length / segmentSize);
  }

  /**
   * Get remaining characters for current segment
   */
  getRemainingChars(message: string): number {
    const isUnicode = /[^\x00-\x7F]/.test(message);
    const segmentSize = isUnicode ? 70 : 160;
    const segments = this.calculateSegments(message);
    return (segments * segmentSize) - message.length;
  }

  /**
   * Validate message length
   */
  isValidMessageLength(message: string): boolean {
    return message.length > 0 && message.length <= this.maxMessageLength;
  }

  /**
   * Get quick reply templates
   */
  getQuickReplyTemplates(): Array<{ label: string; message: string; type: string }> {
    return [
      {
        label: 'Check In',
        message: "Hey coach! Just checking in. How am I doing with my nutrition goals?",
        type: 'check_in'
      },
      {
        label: 'Need Motivation',
        message: "I need some motivation today. Can you help?",
        type: 'motivation'
      },
      {
        label: 'Quick Question',
        message: "Quick question about my meal plan...",
        type: 'custom'
      },
      {
        label: 'Progress Update',
        message: "Great progress today! Staying on track with my goals.",
        type: 'check_in'
      },
    ];
  }

  /**
   * Format phone number for display
   */
  formatPhoneNumber(phone: string): string {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    if (cleaned.length === 11 && cleaned[0] === '1') {
      return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
    }
    return phone;
  }
}

export const smsService = new SMSService();
