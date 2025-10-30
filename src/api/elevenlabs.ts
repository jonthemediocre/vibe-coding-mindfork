/**
 * ElevenLabs TTS Service
 * Handles text-to-speech generation using ElevenLabs API
 * Provides high-quality, personality-matched voices for all coaches
 */

import { getVoiceConfig, ELEVENLABS_CONFIG, DEFAULT_VOICE_SETTINGS } from '../config/voiceMapping';

export interface TTSOptions {
  text: string;
  coachId: string;
  voiceId?: string; // Optional override
  optimize_streaming_latency?: number;
  output_format?: string;
}

export interface TTSResponse {
  audioUrl?: string;
  audioBlob?: Blob;
  error?: string;
}

/**
 * Generate speech using ElevenLabs API
 * This is a client-side helper - actual generation should happen in edge function
 */
export async function generateSpeech(options: TTSOptions): Promise<TTSResponse> {
  try {
    const { text, coachId, voiceId } = options;

    // Get voice configuration for this coach
    const voiceConfig = getVoiceConfig(coachId);

    if (!voiceConfig && !voiceId) {
      throw new Error(`No voice configuration found for coach: ${coachId}`);
    }

    // Use provided voiceId or get from config
    const targetVoiceId = voiceId || voiceConfig?.elevenLabsVoiceId;

    if (!targetVoiceId || targetVoiceId === 'VOICE_ID_PLACEHOLDER') {
      throw new Error(`Voice ID not configured for coach: ${coachId}. Please update voiceMapping.ts`);
    }

    // This should call your Supabase Edge Function, not directly to ElevenLabs
    // The edge function will handle the API key securely
    const response = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/voice-speak`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        text,
        coachId,
        voiceId: targetVoiceId,
        voiceSettings: voiceConfig?.voiceSettings || DEFAULT_VOICE_SETTINGS
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to generate speech');
    }

    const data = await response.json();
    return {
      audioUrl: data.audioUrl
    };

  } catch (error) {
    console.error('ElevenLabs TTS Error:', error);
    return {
      error: error instanceof Error ? error.message : 'Unknown error generating speech'
    };
  }
}

/**
 * Get available voices from ElevenLabs
 * Useful for voice selection UI
 */
export async function getAvailableVoices(): Promise<any[]> {
  try {
    // This should also go through edge function for security
    const response = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/voice-list`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch voices');
    }

    const data = await response.json();
    return data.voices || [];

  } catch (error) {
    console.error('Failed to get voices:', error);
    return [];
  }
}

/**
 * Validate voice configuration
 */
export function validateVoiceSetup(): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  const coaches = ['synapse', 'vetra', 'verdant', 'veloura', 'aetheris', 'decibel', 'maya-rival'];

  for (const coachId of coaches) {
    const config = getVoiceConfig(coachId);

    if (!config) {
      errors.push(`Missing voice configuration for coach: ${coachId}`);
      continue;
    }

    if (config.elevenLabsVoiceId === 'VOICE_ID_PLACEHOLDER') {
      errors.push(`Voice ID not set for coach: ${coachId}. Please update voiceMapping.ts`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

export default {
  generateSpeech,
  getAvailableVoices,
  validateVoiceSetup
};
