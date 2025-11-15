-- ============================================
-- Add HeyGen Avatar & ElevenLabs Voice IDs to Coaches
-- ============================================
-- This migration adds avatar and voice IDs for video generation
-- Migration: 20251112_add_coach_video_avatar_columns
-- ============================================

-- Add new columns to coaches table
ALTER TABLE coaches
  ADD COLUMN IF NOT EXISTS heygen_avatar_id TEXT,
  ADD COLUMN IF NOT EXISTS elevenlabs_voice_id TEXT,
  ADD COLUMN IF NOT EXISTS did_avatar_id TEXT;

-- Add comments for documentation
COMMENT ON COLUMN coaches.heygen_avatar_id IS 'HeyGen avatar ID for video generation (primary provider)';
COMMENT ON COLUMN coaches.elevenlabs_voice_id IS 'ElevenLabs voice ID for TTS generation';
COMMENT ON COLUMN coaches.did_avatar_id IS 'D-ID avatar ID for video generation (fallback provider)';

-- ============================================
-- Update existing coaches with avatar/voice mappings
-- ============================================

-- BLAZE - High energy male coach
UPDATE coaches SET
  heygen_avatar_id = 'REPLACE_WITH_HEYGEN_ID',
  elevenlabs_voice_id = 'ErXwobaYiN019PkySvjV',
  did_avatar_id = 'blaze-avatar'
WHERE name = 'Blaze';

-- KAI - Workout buddy energy
UPDATE coaches SET
  heygen_avatar_id = 'REPLACE_WITH_HEYGEN_ID',
  elevenlabs_voice_id = 'ErXwobaYiN019PkySvjV',
  did_avatar_id = 'kai-avatar'
WHERE name = 'Kai';

-- DECIBEL - Strong, dynamic
UPDATE coaches SET
  heygen_avatar_id = 'REPLACE_WITH_HEYGEN_ID',
  elevenlabs_voice_id = 'VR6AewLTigWG4xSOukaG',
  did_avatar_id = 'decibel-avatar'
WHERE name = 'Decibel';

-- SATO - Calm, measured
UPDATE coaches SET
  heygen_avatar_id = 'REPLACE_WITH_HEYGEN_ID',
  elevenlabs_voice_id = 'pNInz6obpgDQGcFmaJgB',
  did_avatar_id = 'sato-avatar'
WHERE name = 'Sato';

-- SYNAPSE - Analytical
UPDATE coaches SET
  heygen_avatar_id = 'REPLACE_WITH_HEYGEN_ID',
  elevenlabs_voice_id = 'pNInz6obpgDQGcFmaJgB',
  did_avatar_id = 'synapse-avatar'
WHERE name = 'Synapse';

-- MAYA - Assertive, professional female
UPDATE coaches SET
  heygen_avatar_id = 'REPLACE_WITH_HEYGEN_ID',
  elevenlabs_voice_id = 'EXAVITQu4vr4xnSDxMaL',
  did_avatar_id = 'maya-avatar'
WHERE name = 'Maya';

-- AETHERIS - Professional, articulate female
UPDATE coaches SET
  heygen_avatar_id = 'REPLACE_WITH_HEYGEN_ID',
  elevenlabs_voice_id = '21m00Tcm4TlvDq8ikWAM',
  did_avatar_id = 'aetheris-avatar'
WHERE name = 'Aetheris';

-- NORA - Warm, empathetic female
UPDATE coaches SET
  heygen_avatar_id = 'REPLACE_WITH_HEYGEN_ID',
  elevenlabs_voice_id = 'EXAVITQu4vr4xnSDxMaL',
  did_avatar_id = 'nora-avatar'
WHERE name = 'Nora';

-- VELOURA - Graceful, supportive female
UPDATE coaches SET
  heygen_avatar_id = 'REPLACE_WITH_HEYGEN_ID',
  elevenlabs_voice_id = '21m00Tcm4TlvDq8ikWAM',
  did_avatar_id = 'veloura-avatar'
WHERE name = 'Veloura';

-- VETRA - Scientific, analytical
UPDATE coaches SET
  heygen_avatar_id = 'REPLACE_WITH_HEYGEN_ID',
  elevenlabs_voice_id = 'pNInz6obpgDQGcFmaJgB',
  did_avatar_id = 'vetra-avatar'
WHERE name = 'Vetra';

-- ============================================
-- Create indexes for performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_coaches_heygen_avatar_id ON coaches(heygen_avatar_id);
CREATE INDEX IF NOT EXISTS idx_coaches_elevenlabs_voice_id ON coaches(elevenlabs_voice_id);
CREATE INDEX IF NOT EXISTS idx_coaches_did_avatar_id ON coaches(did_avatar_id);
