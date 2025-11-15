/**
 * ROAST MODE INTEGRATION
 *
 * Integrates roast levels (1-10) with detailed coach personalities
 * Creates viral-worthy roast moments that users WANT to share
 */

import { CoachPersonalityProfile, getCoachPersonality } from '../data/coachPersonalities';

export interface RoastConfig {
  coachId: string;
  roastLevel: number; // 1-10
  context?: string; // User's situation for personalized roasts
}

export interface RoastModulation {
  directness: number; // How blunt (0-10)
  calloutIntensity: number; // How hard to call out excuses (0-10)
  sugarcoating: number; // How much to soften (0-10, inverse)
  competitiveEdge: number; // Challenge/rivalry language (0-10)
  humor: number; // Roast humor level (0-10)
  encouragementRatio: number; // Encouragement to challenge ratio (0-1)
}

/**
 * Get roast modulation values based on level
 */
export function getRoastModulation(roastLevel: number): RoastModulation {
  // Clamp between 1-10
  const level = Math.max(1, Math.min(10, roastLevel));

  return {
    directness: level,
    calloutIntensity: level,
    sugarcoating: 10 - level,
    competitiveEdge: level,
    humor: Math.min(8, level), // Cap humor at 8 to avoid meanness
    encouragementRatio: (10 - level) / 10, // More challenge at higher levels
  };
}

/**
 * Build enhanced system prompt with personality + roast level
 */
export function buildRoastModePrompt(config: RoastConfig): string {
  const personality = getCoachPersonality(config.coachId);

  const coachName = personality?.name || 'Coach';
  const basePersonality = personality?.corePersonality?.split('\n')[0] || 'supportive wellness coach';

  // Simple, concise system prompt
  let prompt = `You are ${coachName}, a ${basePersonality}. Keep responses brief (2-3 sentences max). DO NOT include action descriptions like *claps hands* or *nods* - write only spoken dialogue.`;

  // Add roast level intensity
  if (config.roastLevel <= 3) {
    prompt += ` Be gentle, supportive, and encouraging.`;
  } else if (config.roastLevel <= 6) {
    prompt += ` Balance support with accountability. Be honest but warm.`;
  } else if (config.roastLevel <= 8) {
    prompt += ` Be direct and challenge excuses. No sugarcoating.`;
  } else {
    prompt += ` ROAST MODE: Be witty, challenging, and quotable. Call out excuses with humor. Make it memorable!`;
  }

  // Add context if provided
  if (config.context) {
    prompt += `\n\nContext: ${config.context}`;
  }

  return prompt;
}

/**
 * Detect if a message is a "viral roast moment" worth capturing
 */
export function isViralRoastMoment(message: string, roastLevel: number): boolean {
  if (roastLevel < 7) return false;

  const viralIndicators = [
    // Quotable challenge phrases
    /let's be real/i,
    /calling you out/i,
    /excuses or results/i,
    /champions/i,
    /are you serious/i,
    /not going to fly/i,
    /show me.*don't tell me/i,

    // Competitive language
    /step up/i,
    /prove it/i,
    /show me what you're made of/i,

    // Direct confrontation
    /that's not good enough/i,
    /you know what you need to do/i,
    /the question is whether you're going to/i,

    // Memorable one-liners
    /talk is cheap/i,
    /actions speak louder/i,
    /time to walk the walk/i,
  ];

  // Check if message contains viral indicators
  const hasViralPhrase = viralIndicators.some(regex => regex.test(message));

  // Check for quotable length (not too long)
  const isQuotableLength = message.split(' ').length <= 50;

  // Check for strong punctuation (emphasis)
  const hasEmphasis = message.includes('!') || message.includes('?');

  return hasViralPhrase && isQuotableLength && hasEmphasis;
}

/**
 * Get roast level display name
 */
export function getRoastLevelName(level: number): string {
  if (level <= 2) return '😊 Gentle Encouragement';
  if (level <= 4) return '💪 Supportive Push';
  if (level <= 6) return '🎯 Balanced Accountability';
  if (level <= 8) return '🔥 Direct Challenge';
  if (level === 9) return '⚡ Roast Mode';
  if (level === 10) return '💀 FULL ROAST';
  return 'Custom';
}

/**
 * Get roast level description
 */
export function getRoastLevelDescription(level: number): string {
  if (level <= 2) return 'Warm, patient, and highly supportive. Perfect for beginners or those needing extra encouragement.';
  if (level <= 4) return 'Supportive but honest. Will gently call out patterns while maintaining warmth.';
  if (level <= 6) return 'Balanced approach. Direct feedback mixed with encouragement.';
  if (level <= 8) return 'No-nonsense coaching. Direct challenges and honest accountability.';
  if (level === 9) return '🔥 Roast Mode! Witty call-outs and competitive fire. Creates shareable moments.';
  if (level === 10) return '💀 MAXIMUM ROAST! Full competitive fire. Every response is a potential viral moment.';
  return 'Customizable intensity based on your needs.';
}

/**
 * Example roast lines by coach at different levels
 */
export const EXAMPLE_ROAST_LINES: Record<string, Record<number, string[]>> = {
  synapse: {
    3: ["Let's explore why this pattern keeps showing up...", "I'm curious - what's making this difficult?"],
    6: ["The data shows you're capable of more than this.", "Let's be honest about what's actually happening here."],
    9: ["Research shows excuses don't burn calories. What's the real plan?", "You have all the knowledge. Why aren't you applying it?"],
  },
  vetra: {
    3: ["You've got this! Let's find your energy!", "Time to fuel up and crush it!"],
    6: ["Energy check! Are you fueling like the champion you want to be?", "Let's GO! No more 'I'll start tomorrow' energy!"],
    9: ["You said you wanted to feel amazing. Scrolling instead of meal prepping isn't the move.", "Champions don't skip leg day OR meal prep. Let's see which one you are."],
  },
  verdant: {
    3: ["Slow down and breathe. Let's create space for this...", "Your body is wise. Let's listen together..."],
    6: ["Notice the pattern here? Your body is telling you something.", "Let's be real about whether this pace is sustainable."],
    9: ["You keep rushing. Nature doesn't rush, yet everything gets done. What are you running from?", "Slow is fast. You know this. Why are you still hustling yourself to exhaustion?"],
  },
  veloura: {
    3: ["Here's your clear plan. You've got this.", "Let's build a system that works for you."],
    6: ["Your execution rate is 60%. That's not going to cut it. Here's how we fix it:", "You have a plan. You're not following it. What's breaking down?"],
    9: ["You said you wanted results. Results require execution. Where's yours?", "I'm looking at your data. Want to explain why you're not following the system we built?"],
  },
  aetheris: {
    3: ["You're not broken, you're transforming...", "This struggle is preparing you for something greater..."],
    6: ["The fire you're walking through is refining you. But you have to keep walking.", "This pain has wisdom. Are you listening or just complaining?"],
    9: ["Phoenix energy means you rise. So rise. Or stop calling yourself a phoenix.", "You keep saying you're transforming. I'm seeing the same patterns. Where's the transformation?"],
  },
  decibel: {
    3: ["Let's make this fun! Here's a delicious way to...", "You're going to love this approach!"],
    6: ["Real talk: You can't out-fun a bad diet. Let's get strategic.", "You said health should be fun. Great! So why are you making it miserable with restriction?"],
    9: ["You post about wellness but I see those late-night snack logs. Make it make sense.", "Let's be real: Your Instagram says one thing, your food diary says another. Which one is the real you?"],
  },
  "maya-rival": {
    3: ["You're capable of more. Here's the standard:", "Champions do the work. Let's see what you're made of."],
    6: ["That excuse might work on someone else. Not me. What's the real reason?", "You say you want this. Your actions say otherwise. Which is true?"],
    9: ["You came here for results, not validation. So let's talk about why you're failing.", "I've seen people with less potential achieve more. What's your excuse?"],
    10: ["You're wasting my time with excuses. Show up or shut up.", "Talked a big game. Where's the execution? I'm not impressed."],
  },
};
