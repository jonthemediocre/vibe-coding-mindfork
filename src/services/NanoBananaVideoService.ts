/**
 * NANO-BANANA Video Service
 *
 * CapCut-style video editor for creating viral wellness content
 * Combines user footage + AI coach animations + text overlays + music
 *
 * GAME CHANGER for viral growth!
 */

import { Video, ResizeMode } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { generateImage } from '../api/image-generation';

export interface VideoTemplate {
  id: string;
  name: string;
  description: string;
  duration: number; // seconds
  aspectRatio: '9:16' | '1:1' | '16:9'; // Reels/TikTok, Instagram, YouTube
  scenes: VideoScene[];
  music?: string; // URL to background music
  hashtags: string[];
}

export interface VideoScene {
  duration: number; // seconds
  type: 'coach_intro' | 'user_footage' | 'before_after' | 'stats' | 'call_to_action';
  coachAnimation?: CoachAnimation;
  textOverlay?: TextOverlay;
  transition?: 'fade' | 'slide' | 'zoom' | 'none';
}

export interface CoachAnimation {
  coachName: string;
  coachImageUrl: string;
  animation: 'wave' | 'celebrate' | 'thumbs_up' | 'thinking' | 'pointing';
  position: 'left' | 'right' | 'center' | 'corner';
  size: 'small' | 'medium' | 'large';
}

export interface TextOverlay {
  text: string;
  style: 'title' | 'subtitle' | 'caption' | 'metric' | 'cta';
  animation: 'fade_in' | 'slide_up' | 'typewriter' | 'bounce' | 'none';
  color?: string;
  position?: 'top' | 'center' | 'bottom';
}

export interface NanoBananaVideoConfig {
  userId: string;
  templateId: string;
  userFootageUri?: string; // Optional user video
  userPhotoUri?: string; // For before/after
  achievementData: {
    metric: string; // "Weight", "Days Tracked", "Fasts Completed"
    before: number;
    after: number;
    timeframe: string; // "2 weeks", "1 month"
  };
  customText?: string;
  referralCode: string;
}

/**
 * Pre-built viral video templates
 */
export const VIRAL_VIDEO_TEMPLATES: VideoTemplate[] = [
  {
    id: 'transformation_reveal',
    name: 'Transformation Reveal',
    description: 'Show your before/after with coach celebration',
    duration: 15,
    aspectRatio: '9:16',
    hashtags: ['#transformation', '#weightloss', '#wellness', '#mindfork'],
    scenes: [
      {
        duration: 3,
        type: 'coach_intro',
        coachAnimation: {
          coachName: 'Synapse',
          coachImageUrl: '',
          animation: 'wave',
          position: 'center',
          size: 'large',
        },
        textOverlay: {
          text: 'Watch this transformation!',
          style: 'title',
          animation: 'fade_in',
          position: 'top',
        },
        transition: 'fade',
      },
      {
        duration: 5,
        type: 'before_after',
        textOverlay: {
          text: 'Before',
          style: 'subtitle',
          animation: 'fade_in',
          position: 'top',
        },
        transition: 'slide',
      },
      {
        duration: 5,
        type: 'before_after',
        textOverlay: {
          text: 'After',
          style: 'subtitle',
          animation: 'fade_in',
          position: 'top',
        },
        transition: 'zoom',
      },
      {
        duration: 2,
        type: 'call_to_action',
        coachAnimation: {
          coachName: 'Synapse',
          coachImageUrl: '',
          animation: 'celebrate',
          position: 'corner',
          size: 'medium',
        },
        textOverlay: {
          text: 'Join me on MindFork!\nUse code: REF123',
          style: 'cta',
          animation: 'bounce',
          position: 'center',
        },
        transition: 'fade',
      },
    ],
  },
  {
    id: 'progress_stats',
    name: 'Progress Stats',
    description: 'Animated stats reveal with coach',
    duration: 10,
    aspectRatio: '1:1',
    hashtags: ['#progress', '#fitness', '#goals', '#mindfork'],
    scenes: [
      {
        duration: 2,
        type: 'coach_intro',
        coachAnimation: {
          coachName: 'Synapse',
          coachImageUrl: '',
          animation: 'pointing',
          position: 'left',
          size: 'large',
        },
        textOverlay: {
          text: 'Check out my progress!',
          style: 'title',
          animation: 'slide_up',
          position: 'top',
        },
        transition: 'fade',
      },
      {
        duration: 6,
        type: 'stats',
        textOverlay: {
          text: '15 lbs lost\n30 days tracked\n20 fasts completed',
          style: 'metric',
          animation: 'typewriter',
          position: 'center',
        },
        transition: 'none',
      },
      {
        duration: 2,
        type: 'call_to_action',
        coachAnimation: {
          coachName: 'Synapse',
          coachImageUrl: '',
          animation: 'thumbs_up',
          position: 'right',
          size: 'medium',
        },
        textOverlay: {
          text: 'Start your journey!\nCode: REF123',
          style: 'cta',
          animation: 'bounce',
          position: 'bottom',
        },
        transition: 'fade',
      },
    ],
  },
  {
    id: 'daily_win',
    name: 'Daily Win',
    description: 'Quick win celebration (TikTok-style)',
    duration: 7,
    aspectRatio: '9:16',
    hashtags: ['#wellness', '#healthy', '#motivation', '#mindfork'],
    scenes: [
      {
        duration: 3,
        type: 'user_footage',
        coachAnimation: {
          coachName: 'Synapse',
          coachImageUrl: '',
          animation: 'celebrate',
          position: 'corner',
          size: 'small',
        },
        textOverlay: {
          text: "Today's Win",
          style: 'title',
          animation: 'bounce',
          position: 'top',
        },
        transition: 'fade',
      },
      {
        duration: 4,
        type: 'stats',
        textOverlay: {
          text: 'Under calorie goal!\n7 days streak!',
          style: 'metric',
          animation: 'fade_in',
          position: 'center',
        },
        transition: 'zoom',
      },
    ],
  },
  {
    id: 'coach_meet',
    name: 'Meet My Coach',
    description: 'Introduce your AI coach to friends',
    duration: 12,
    aspectRatio: '9:16',
    hashtags: ['#ai', '#coach', '#wellness', '#mindfork'],
    scenes: [
      {
        duration: 4,
        type: 'coach_intro',
        coachAnimation: {
          coachName: 'Synapse',
          coachImageUrl: '',
          animation: 'wave',
          position: 'center',
          size: 'large',
        },
        textOverlay: {
          text: 'Meet my AI coach!',
          style: 'title',
          animation: 'slide_up',
          position: 'top',
        },
        transition: 'fade',
      },
      {
        duration: 5,
        type: 'user_footage',
        coachAnimation: {
          coachName: 'Synapse',
          coachImageUrl: '',
          animation: 'thinking',
          position: 'corner',
          size: 'medium',
        },
        textOverlay: {
          text: 'They help me stay on track every day!',
          style: 'caption',
          animation: 'typewriter',
          position: 'bottom',
        },
        transition: 'slide',
      },
      {
        duration: 3,
        type: 'call_to_action',
        coachAnimation: {
          coachName: 'Synapse',
          coachImageUrl: '',
          animation: 'pointing',
          position: 'left',
          size: 'large',
        },
        textOverlay: {
          text: 'Get your own AI coach!\nUse code: REF123',
          style: 'cta',
          animation: 'bounce',
          position: 'bottom',
        },
        transition: 'fade',
      },
    ],
  },
];

/**
 * Generate animated coach sticker frames
 * Creates a sequence of images for animation
 */
export async function generateCoachAnimation(
  coachName: string,
  animation: CoachAnimation['animation']
): Promise<string[]> {
  console.log('[NanoBananaVideo] Generating coach animation:', animation);

  const animationPrompts: Record<CoachAnimation['animation'], string[]> = {
    wave: [
      `${coachName} AI coach character waving hello, friendly pose, frame 1`,
      `${coachName} AI coach character waving hello, hand raised, frame 2`,
      `${coachName} AI coach character waving hello, friendly smile, frame 3`,
    ],
    celebrate: [
      `${coachName} AI coach character celebrating, arms up, excited, frame 1`,
      `${coachName} AI coach character celebrating, jumping joy, frame 2`,
      `${coachName} AI coach character celebrating, confetti, frame 3`,
    ],
    thumbs_up: [
      `${coachName} AI coach character giving thumbs up, confident, frame 1`,
      `${coachName} AI coach character thumbs up, smiling, frame 2`,
    ],
    thinking: [
      `${coachName} AI coach character thinking, hand on chin, frame 1`,
      `${coachName} AI coach character thinking, thoughtful, frame 2`,
    ],
    pointing: [
      `${coachName} AI coach character pointing forward, encouraging, frame 1`,
      `${coachName} AI coach character pointing, call to action, frame 2`,
    ],
  };

  const frames: string[] = [];
  const prompts = animationPrompts[animation];

  for (const prompt of prompts) {
    const imageUrl = await generateImage(prompt, {
      size: 'auto',
      quality: 'high',
      background: 'transparent',
    });
    frames.push(imageUrl);
  }

  return frames;
}

/**
 * Create a viral video from template
 * This is a simplified version - in production, you'd use FFmpeg or similar
 */
export async function createNanoBananaVideo(
  config: NanoBananaVideoConfig
): Promise<{ videoUri: string; shareUrl: string }> {
  console.log('[NanoBananaVideo] Creating viral video:', config.templateId);

  const template = VIRAL_VIDEO_TEMPLATES.find(t => t.id === config.templateId);
  if (!template) {
    throw new Error('Template not found');
  }

  // For MVP, we'll create an animated slideshow using image sequences
  // In production, integrate with FFmpeg or cloud video rendering service

  // Generate all frames needed for the video
  const frames = await generateVideoFrames(config, template);

  // For now, return the first frame as a preview
  // TODO: Implement actual video rendering with FFmpeg
  const previewUri = frames[0];

  const shareUrl = `https://mindfork.app/join?ref=${config.referralCode}`;

  console.log('[NanoBananaVideo] Video preview created');

  return {
    videoUri: previewUri, // This will be actual video URI after FFmpeg integration
    shareUrl,
  };
}

/**
 * Generate all frames for the video
 */
async function generateVideoFrames(
  config: NanoBananaVideoConfig,
  template: VideoTemplate
): Promise<string[]> {
  const frames: string[] = [];

  for (const scene of template.scenes) {
    const framePrompt = buildScenePrompt(scene, config);
    const frameUrl = await generateImage(framePrompt, {
      // Using 1024x1536 (closest to 1080x1920 standard) until API supports 1080p
      size: template.aspectRatio === '9:16' ? '1024x1536' : '1024x1024',
      quality: 'high',
    });
    frames.push(frameUrl);
  }

  return frames;
}

/**
 * Build AI prompt for a video scene
 */
function buildScenePrompt(scene: VideoScene, config: NanoBananaVideoConfig): string {
  let prompt = 'Professional wellness app video frame, vibrant colors, social media ready. ';

  if (scene.coachAnimation) {
    const coach = scene.coachAnimation;
    prompt += `${coach.coachName} AI coach character (${coach.size} size, ${coach.position} position) doing ${coach.animation} animation. `;
  }

  if (scene.textOverlay) {
    const text = scene.textOverlay.text.replace('REF123', config.referralCode);
    prompt += `Text overlay: "${text}" in ${scene.textOverlay.style} style at ${scene.textOverlay.position || 'center'}. `;
  }

  if (scene.type === 'stats') {
    prompt += `Display stats: ${config.achievementData.metric} from ${config.achievementData.before} to ${config.achievementData.after} in ${config.achievementData.timeframe}. `;
  }

  if (scene.type === 'before_after') {
    prompt += 'Before and after comparison layout. ';
  }

  return prompt;
}

/**
 * Get video templates for user to choose from
 */
export function getVideoTemplates(): VideoTemplate[] {
  return VIRAL_VIDEO_TEMPLATES;
}
