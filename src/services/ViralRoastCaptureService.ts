/**
 * VIRAL ROAST MOMENT CAPTURE SERVICE
 *
 * Automatically detects and captures viral-worthy roast moments from:
 * - Text chat messages
 * - Voice messages (transcribed)
 * - Phone call recordings (transcribed)
 * - SMS exchanges
 *
 * Turns them into shareable social media content with CTAs
 */

import { supabase } from '../lib/supabase';
import { isViralRoastMoment } from './RoastModeService';
import { generateImage } from '../api/image-generation';
import { generateReferralCode } from './NanoBananaService';
import * as FileSystem from 'expo-file-system';

export interface RoastMoment {
  id: string;
  user_id: string;
  coach_id: string;
  coach_name: string;
  roast_level: number;
  roast_text: string;
  user_prompt?: string; // What the user said to trigger the roast
  source_type: 'text' | 'voice' | 'call' | 'sms';
  transcript?: string; // Full transcript for voice/call
  audio_url?: string; // Original audio if from voice/call
  created_at: string;
  is_viral_candidate: boolean;
  share_count: number;
  view_count: number;
}

export interface ViralContentCard {
  imageUri: string;
  shareText: string;
  referralCode: string;
  hashtags: string[];
}

/**
 * Detect and save viral roast moment
 */
export async function captureRoastMoment(
  userId: string,
  coachId: string,
  coachName: string,
  roastLevel: number,
  roastText: string,
  sourceType: 'text' | 'voice' | 'call' | 'sms',
  options?: {
    userPrompt?: string;
    transcript?: string;
    audioUrl?: string;
  }
): Promise<RoastMoment | null> {
  console.log('[RoastCapture] Analyzing message for viral potential...');

  const isViral = isViralRoastMoment(roastText, roastLevel);

  if (!isViral && roastLevel < 7) {
    // Not viral-worthy and not high roast level
    return null;
  }

  // Save to database
  const roastMoment: Omit<RoastMoment, 'id'> = {
    user_id: userId,
    coach_id: coachId,
    coach_name: coachName,
    roast_level: roastLevel,
    roast_text: roastText,
    user_prompt: options?.userPrompt,
    source_type: sourceType,
    transcript: options?.transcript,
    audio_url: options?.audioUrl,
    created_at: new Date().toISOString(),
    is_viral_candidate: isViral,
    share_count: 0,
    view_count: 0,
  };

  const { data, error } = await supabase
    .from('roast_moments')
    .insert(roastMoment)
    .select()
    .single();

  if (error) {
    console.error('[RoastCapture] Failed to save roast moment:', error);
    return null;
  }

  console.log('[RoastCapture] ✅ Viral roast moment captured!');
  return data as RoastMoment;
}

/**
 * Generate shareable content card from roast moment
 */
export async function generateRoastCard(
  roastMoment: RoastMoment,
  userId: string,
  userPhotoUri?: string
): Promise<ViralContentCard> {
  console.log('[RoastCard] Generating shareable card...');

  const referralCode = await generateReferralCode(userId);

  // Build prompt for image generation
  const prompt = buildRoastCardPrompt(roastMoment, referralCode);

  // Generate image
  const imageUrl = await generateImage(prompt, {
    size: '1024x1024', // Square for Instagram
    quality: 'high',
  });

  // Download to local storage
  const filename = `roast_${roastMoment.id}_${Date.now()}.jpg`;
  const localUri = `${FileSystem.cacheDirectory}${filename}`;
  await FileSystem.downloadAsync(imageUrl, localUri);

  // Build share text
  const shareText = buildShareText(roastMoment, referralCode);

  // Get hashtags based on coach
  const hashtags = getHashtagsForCoach(roastMoment.coach_id, roastMoment.roast_level);

  return {
    imageUri: localUri,
    shareText,
    referralCode,
    hashtags,
  };
}

/**
 * Build AI prompt for roast card image
 */
function buildRoastCardPrompt(roastMoment: RoastMoment, referralCode: string): string {
  const baseStyle = 'Modern social media card, bold typography, high contrast design, shareable format';

  // Truncate roast if too long
  let displayRoast = roastMoment.roast_text;
  if (displayRoast.length > 150) {
    displayRoast = displayRoast.substring(0, 147) + '...';
  }

  return `${baseStyle}. Design a viral roast moment card:

MAIN QUOTE (Large, bold text at center):
"${displayRoast}"

COACH INFO (Top corner):
- ${roastMoment.coach_name} (AI Coach)
- 🔥 Roast Level ${roastMoment.roast_level}/10

FOOTER (Bottom):
"Think you can handle this? Use code ${referralCode}"
MindFork logo/branding

DESIGN NOTES:
- Quote should be the star - large, readable, impactful
- Use fire emojis 🔥 strategically
- High contrast colors (dark background, bright text)
- Modern, bold typography
- Instagram-ready aesthetic
- Make it look like a roast/challenge card that people WANT to screenshot`;
}

/**
 * Build share text for social media
 */
function buildShareText(roastMoment: RoastMoment, referralCode: string): string {
  const intensityEmoji = roastMoment.roast_level >= 9 ? '💀' : roastMoment.roast_level >= 7 ? '🔥' : '💪';

  return `${intensityEmoji} My AI coach ${roastMoment.coach_name} just roasted me (Level ${roastMoment.roast_level}/10)

"${roastMoment.roast_text}"

Think you can handle an AI coach that keeps it real?

Join me on MindFork - Use code ${referralCode} to get started!

#mindfork #aicoach #roastmode #wellness #accountability`;
}

/**
 * Get hashtags based on coach and roast level
 */
function getHashtagsForCoach(coachId: string, roastLevel: number): string[] {
  const baseHashtags = ['#mindfork', '#aicoach', '#wellness'];

  if (roastLevel >= 8) {
    baseHashtags.push('#roastmode', '#toughlove', '#accountability', '#noexcuses');
  }

  const coachHashtags: Record<string, string[]> = {
    synapse: ['#sciencebased', '#nutrition', '#smartwellness'],
    vetra: ['#fitness', '#energy', '#workout', '#fitnessmotivation'],
    verdant: ['#mindful', '#sustainable', '#wellness', '#selfcare'],
    veloura: ['#discipline', '#goals', '#performance', '#results'],
    aetheris: ['#transformation', '#growth', '#mindset', '#phoenix'],
    decibel: ['#foodie', '#healthyeats', '#delicious', '#wellness'],
    'maya-rival': ['#competitive', '#challenge', '#beast', '#grind'],
  };

  return [...baseHashtags, ...(coachHashtags[coachId] || [])];
}

/**
 * Get user's recent roast moments for gallery
 */
export async function getRecentRoastMoments(
  userId: string,
  limit: number = 10
): Promise<RoastMoment[]> {
  const { data, error } = await supabase
    .from('roast_moments')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[RoastCapture] Failed to fetch roast moments:', error);
    return [];
  }

  return data as RoastMoment[];
}

/**
 * Get viral roast moments for inspiration/leaderboard
 */
export async function getViralRoastMoments(limit: number = 20): Promise<RoastMoment[]> {
  const { data, error } = await supabase
    .from('roast_moments')
    .select('*')
    .eq('is_viral_candidate', true)
    .order('share_count', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[RoastCapture] Failed to fetch viral moments:', error);
    return [];
  }

  return data as RoastMoment[];
}

/**
 * Track when a roast moment is shared
 */
export async function trackRoastShare(roastMomentId: string, platform: string): Promise<void> {
  // Increment share count
  await supabase.rpc('increment_roast_share_count', {
    roast_id: roastMomentId,
    platform_name: platform,
  });

  console.log('[RoastCapture] Share tracked:', roastMomentId, platform);
}

/**
 * Track when a roast moment is viewed
 */
export async function trackRoastView(roastMomentId: string): Promise<void> {
  // Increment view count
  await supabase.rpc('increment_roast_view_count', {
    roast_id: roastMomentId,
  });
}

/**
 * Transcribe audio to text for roast moment capture
 */
export async function transcribeAudioForRoast(audioUri: string): Promise<string> {
  // Use OpenAI Whisper for transcription
  const { transcribeAudio } = await import('../api/transcribe-audio');

  try {
    const transcript = await transcribeAudio(audioUri);
    return transcript;
  } catch (error) {
    console.error('[RoastCapture] Transcription failed:', error);
    return '';
  }
}

/**
 * Process voice message and capture roast moment
 */
export async function processVoiceRoast(
  userId: string,
  coachId: string,
  coachName: string,
  roastLevel: number,
  audioUri: string,
  roastText: string,
  userPrompt?: string
): Promise<RoastMoment | null> {
  console.log('[RoastCapture] Processing voice roast...');

  // Transcribe the audio
  const transcript = await transcribeAudioForRoast(audioUri);

  // Capture the roast moment
  return captureRoastMoment(
    userId,
    coachId,
    coachName,
    roastLevel,
    roastText,
    'voice',
    {
      userPrompt,
      transcript,
      audioUrl: audioUri,
    }
  );
}

/**
 * Get roast stats for user
 */
export async function getRoastStats(userId: string): Promise<{
  totalRoasts: number;
  viralMoments: number;
  totalShares: number;
  topRoastLevel: number;
  favoriteCoach: string;
}> {
  const { data: roasts } = await supabase
    .from('roast_moments')
    .select('*')
    .eq('user_id', userId);

  if (!roasts || roasts.length === 0) {
    return {
      totalRoasts: 0,
      viralMoments: 0,
      totalShares: 0,
      topRoastLevel: 0,
      favoriteCoach: '',
    };
  }

  const totalRoasts = roasts.length;
  const viralMoments = roasts.filter((r: RoastMoment) => r.is_viral_candidate).length;
  const totalShares = roasts.reduce((sum: number, r: RoastMoment) => sum + r.share_count, 0);
  const topRoastLevel = Math.max(...roasts.map((r: RoastMoment) => r.roast_level));

  // Find favorite coach (most roasts from)
  const coachCounts: Record<string, number> = {};
  roasts.forEach((r: RoastMoment) => {
    coachCounts[r.coach_id] = (coachCounts[r.coach_id] || 0) + 1;
  });
  const favoriteCoach = Object.keys(coachCounts).reduce((a, b) =>
    coachCounts[a] > coachCounts[b] ? a : b
  );

  return {
    totalRoasts,
    viralMoments,
    totalShares,
    topRoastLevel,
    favoriteCoach,
  };
}
