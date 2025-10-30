import { generateImage } from '../api/image-generation';

/**
 * Service to create welcome images by compositing user photos with AI coach images
 * for social media sharing
 */

interface WelcomeImageOptions {
  userPhotoUri: string;
  userName: string;
  userGoal?: string;
}

/**
 * Generate a shareable welcome image that composites the user's photo with an AI coach
 * @param options User photo URI, name, and optional goal
 * @returns URL of the generated composite image
 */
export async function generateWelcomeImage(
  options: WelcomeImageOptions
): Promise<string> {
  const { userName, userGoal } = options;

  // Create a detailed prompt for the AI image generation
  // This will create a friendly, motivational image suitable for social media
  const goalText = userGoal || 'wellness journey';

  const prompt = `Create a vibrant, inspiring social media post image for a health and wellness app called MindFork.

The image should feature:
- Two friends standing side by side, smiling and giving each other a high-five or fist bump
- One person represents ${userName}, looking happy and determined
- The other person is an AI health coach named Synapse, appearing friendly and supportive
- Modern, clean aesthetic with a gradient background in shades of purple, pink, and blue
- Soft lighting that gives an uplifting, motivational vibe
- Both people are diverse, fit, and wearing casual athletic/wellness attire
- Include subtle brain/wellness/health icons floating in the background

Style: Modern digital art, friendly and approachable, professional but warm, Instagram-worthy
Mood: Inspiring, motivational, friendly, supportive
Colors: Purple (#9333ea), pink (#ec4899), blue (#3b82f6), white accents

Text overlay at the bottom: "Starting my ${goalText} with MindFork! 🧠💪"

The image should look like a professional social media announcement post, suitable for sharing on Instagram, Facebook, or Twitter.`;

  try {
    console.log('[WelcomeImageService] Generating welcome image...');

    const imageUrl = await generateImage(prompt, {
      size: '1024x1024',
      quality: 'high',
      format: 'png',
    });

    console.log('[WelcomeImageService] Welcome image generated successfully');
    return imageUrl;
  } catch (error) {
    console.error('[WelcomeImageService] Error generating welcome image:', error);
    throw new Error('Failed to generate welcome image. Please try again.');
  }
}

/**
 * Get a personalized message for social media sharing
 */
export function getShareMessage(userName: string, userGoal?: string): string {
  const goalText = userGoal || 'wellness journey';

  return `🧠 I just started my ${goalText} with MindFork AI!

Join me on this journey to better health with personalized AI coaching, meal planning, and wellness tracking.

Download MindFork and start your transformation today! 💪

#MindFork #AICoach #HealthJourney #WellnessGoals #Transformation`;
}
