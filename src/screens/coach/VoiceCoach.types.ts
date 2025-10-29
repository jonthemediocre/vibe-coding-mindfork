/**
 * Shared TypeScript interfaces for Voice Coach components (Mobile)
 * [SCOPE: M] - Molecular voice conversation component
 */

export type VoiceState = 'idle' | 'listening' | 'processing' | 'speaking' | 'error';

export type CoachVoice = 'cedar' | 'marin' | 'ash' | 'ballad' | 'coral' | 'sage' | 'verse';

export interface VoiceMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  audioUrl?: string;
  timestamp: Date;
  duration?: number;
}

export interface VoiceSessionConfig {
  coachId: string;
  userId: string;
  voice?: CoachVoice;
  autoStart?: boolean;
  maxDuration?: number;
}
