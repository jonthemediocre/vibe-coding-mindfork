/**
 * Voice Mapping Configuration
 * Maps each coach personality to their optimal ElevenLabs voice
 * Ensures consistency across all voice interactions (messages, phone calls)
 */

export interface VoiceConfig {
  coachId: string;
  coachName: string;
  elevenLabsVoiceId: string; // ElevenLabs voice ID (will be configured after voice selection)
  voiceName: string; // Human-readable voice name
  voiceDescription: string; // Why this voice matches the personality
  voiceSettings: {
    stability: number; // 0-1: How consistent the voice is
    similarity_boost: number; // 0-1: How close to original voice
    style: number; // 0-1: Exaggeration level
    use_speaker_boost: boolean; // Enhance clarity
  };
}

/**
 * Voice mapping for all 7 MindFork coaches
 *
 * SETUP INSTRUCTIONS:
 * 1. Go to https://elevenlabs.io/voice-library
 * 2. For each coach, find a voice that matches their personality
 * 3. Copy the voice ID and update the `elevenLabsVoiceId` field
 * 4. OR use Voice Design to create custom voices
 *
 * RECOMMENDED VOICES FROM ELEVENLABS LIBRARY:
 * - Professional Male (30-50 years): Good for Synapse, Verdant
 * - Energetic Female (25-35 years): Good for Vetra, Decibel
 * - Authoritative Female (30-40 years): Good for Veloura, Maya
 * - Warm Androgynous: Good for Aetheris
 */
export const coachVoiceMapping: Record<string, VoiceConfig> = {
  synapse: {
    coachId: 'synapse',
    coachName: 'Synapse',
    elevenLabsVoiceId: 'VOICE_ID_PLACEHOLDER', // TODO: Replace with actual voice ID
    voiceName: 'Thoughtful Scholar',
    voiceDescription: 'Wise, patient, analytical voice with measured pace. Think professor who genuinely cares about students. Deep and calm with intellectual warmth.',
    voiceSettings: {
      stability: 0.75, // High stability for consistent, measured delivery
      similarity_boost: 0.75,
      style: 0.3, // Low exaggeration - stays neutral and thoughtful
      use_speaker_boost: true
    }
  },

  vetra: {
    coachId: 'vetra',
    coachName: 'Vetra',
    elevenLabsVoiceId: 'VOICE_ID_PLACEHOLDER', // TODO: Replace with actual voice ID
    voiceName: 'Energetic Motivator',
    voiceDescription: 'Bright, energetic, enthusiastic female voice. Like a personal trainer who makes 6am workouts sound fun. High energy with infectious optimism.',
    voiceSettings: {
      stability: 0.5, // Medium stability for dynamic, varied delivery
      similarity_boost: 0.75,
      style: 0.8, // High exaggeration - expressive and animated
      use_speaker_boost: true
    }
  },

  verdant: {
    coachId: 'verdant',
    coachName: 'Verdant',
    elevenLabsVoiceId: 'VOICE_ID_PLACEHOLDER', // TODO: Replace with actual voice ID
    voiceName: 'Calm Meditation Guide',
    voiceDescription: 'Deeply soothing, slow-paced, grounding voice. Like a meditation teacher or nature documentary narrator. Creates instant calm and presence.',
    voiceSettings: {
      stability: 0.9, // Very high stability - consistent and calming
      similarity_boost: 0.7,
      style: 0.2, // Very low exaggeration - stays serene and gentle
      use_speaker_boost: true
    }
  },

  veloura: {
    coachId: 'veloura',
    coachName: 'Veloura',
    elevenLabsVoiceId: 'VOICE_ID_PLACEHOLDER', // TODO: Replace with actual voice ID
    voiceName: 'Strategic Executive',
    voiceDescription: 'Confident, direct, authoritative female voice. Think high-performance coach or executive mentor. Clear and precise with commanding presence.',
    voiceSettings: {
      stability: 0.75, // High stability for consistent authority
      similarity_boost: 0.8,
      style: 0.5, // Medium exaggeration - professional but engaging
      use_speaker_boost: true
    }
  },

  aetheris: {
    coachId: 'aetheris',
    coachName: 'Aetheris',
    elevenLabsVoiceId: 'VOICE_ID_PLACEHOLDER', // TODO: Replace with actual voice ID
    voiceName: 'Mystical Healer',
    voiceDescription: 'Warm, poetic, slightly androgynous voice with healing quality. Like a spiritual guide or transformational therapist. Profound and inspiring.',
    voiceSettings: {
      stability: 0.6, // Medium-high stability with room for emotional depth
      similarity_boost: 0.7,
      style: 0.7, // Higher exaggeration for poetic, expressive delivery
      use_speaker_boost: true
    }
  },

  decibel: {
    coachId: 'decibel',
    coachName: 'Decibel',
    elevenLabsVoiceId: 'VOICE_ID_PLACEHOLDER', // TODO: Replace with actual voice ID
    voiceName: 'Playful Best Friend',
    voiceDescription: 'Cheerful, conversational, playful female voice. Like your fun friend who makes everything an adventure. Warm and approachable with natural enthusiasm.',
    voiceSettings: {
      stability: 0.5, // Medium stability for varied, playful delivery
      similarity_boost: 0.75,
      style: 0.75, // High exaggeration - expressive and fun
      use_speaker_boost: true
    }
  },

  'maya-rival': {
    coachId: 'maya-rival',
    coachName: 'Maya',
    elevenLabsVoiceId: 'VOICE_ID_PLACEHOLDER', // TODO: Replace with actual voice ID
    voiceName: 'Tough Love Coach',
    voiceDescription: 'Strong, intense, no-nonsense female voice. Think drill sergeant meets life coach. Direct and challenging with underlying respect.',
    voiceSettings: {
      stability: 0.7, // Medium-high stability for consistent intensity
      similarity_boost: 0.8,
      style: 0.6, // Medium-high exaggeration - impactful and commanding
      use_speaker_boost: true
    }
  }
};

/**
 * Get voice configuration for a specific coach
 */
export function getVoiceConfig(coachId: string): VoiceConfig | undefined {
  return coachVoiceMapping[coachId];
}

/**
 * Get all configured coach voice IDs
 */
export function getAllCoachIds(): string[] {
  return Object.keys(coachVoiceMapping);
}

/**
 * Validate that all coaches have voice IDs configured
 */
export function validateVoiceConfiguration(): {
  isValid: boolean;
  missingVoices: string[];
} {
  const missingVoices = Object.entries(coachVoiceMapping)
    .filter(([_, config]) => config.elevenLabsVoiceId === 'VOICE_ID_PLACEHOLDER')
    .map(([coachId, _]) => coachId);

  return {
    isValid: missingVoices.length === 0,
    missingVoices
  };
}

/**
 * ElevenLabs API Configuration
 */
export const ELEVENLABS_CONFIG = {
  apiBaseUrl: 'https://api.elevenlabs.io/v1',
  model: 'eleven_multilingual_v2', // Best quality model as of Jan 2025
  outputFormat: 'mp3_44100_128', // High quality MP3
  optimizeStreamingLatency: 2, // Balance quality vs latency (0-4)
};

/**
 * Default voice settings if coach-specific settings not found
 */
export const DEFAULT_VOICE_SETTINGS = {
  stability: 0.6,
  similarity_boost: 0.75,
  style: 0.5,
  use_speaker_boost: true
};
