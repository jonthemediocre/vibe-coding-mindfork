// Official coach profiles for MindFork app
export interface Coach {
  id: string;
  name: string;
  personality: string;
  description: string;
  avatar: string; // Emoji fallback
  imageUrl?: any; // Local PNG image
  specialties: string[];
  available: boolean;
}

export const coachProfiles: Coach[] = [
  {
    id: "synapse",
    name: "Synapse",
    personality: "Gentle & Supportive",
    description: "A wise owl mixed with almonds - analytical and nutty about nutrition. Perfect for beginners seeking gentle, thoughtful guidance.",
    avatar: "🦉",
    imageUrl: require('../../assets/coaches/assets_coaches_coach_synapse.png'),
    specialties: ["Beginner Support", "Nutrition Science", "Mindful Eating"],
    available: true
  },
  {
    id: "vetra",
    name: "Vetra",
    personality: "Energetic & Motivational",
    description: "A vibrant parakeet mixed with berries - colorful, energetic, and bursting with antioxidants! Keeps you motivated and flying high.",
    avatar: "🦜",
    imageUrl: require('../../assets/coaches/assets_coaches_coach_vetra.png'),
    specialties: ["Fitness Motivation", "Energy Boost", "Active Lifestyle"],
    available: true
  },
  {
    id: "verdant",
    name: "Verdant",
    personality: "Calm & Zen",
    description: "A peaceful turtle mixed with leafy greens - slow, steady, and full of vitality. Master of sustainable healthy habits.",
    avatar: "🐢",
    imageUrl: require('../../assets/coaches/assets_coaches_coach_verdant.png'),
    specialties: ["Habit Building", "Plant-Based Nutrition", "Sustainability"],
    available: true
  },
  {
    id: "veloura",
    name: "Veloura",
    personality: "Disciplined & Structured",
    description: "A determined rabbit mixed with carrots - fast, focused, and full of beta-carotene. Structured approach to fitness goals.",
    avatar: "🐰",
    imageUrl: require('../../assets/coaches/assets_coaches_coach_veloura.png'),
    specialties: ["Discipline", "Goal Setting", "Performance"],
    available: true
  },
  {
    id: "aetheris",
    name: "Aetheris",
    personality: "Mystical & Inspiring",
    description: "An elegant phoenix mixed with ginger root - fiery rebirth and anti-inflammatory wisdom. Helps you rise from setbacks.",
    avatar: "🔥",
    imageUrl: require('../../assets/coaches/assets_coaches_coach_aetheris.png'),
    specialties: ["Recovery", "Anti-Inflammatory Diet", "Resilience"],
    available: true
  },
  {
    id: "decibel",
    name: "Decibel",
    personality: "Cheerful & Playful",
    description: "A joyful dolphin mixed with salmon - smart, social, and packed with omega-3s! Makes healthy eating fun and social.",
    avatar: "🐬",
    imageUrl: require('../../assets/coaches/assets_coaches_coach_decibel.png'),
    specialties: ["Social Support", "Omega-3 Nutrition", "Positive Reinforcement"],
    available: true
  },
  {
    id: "maya-rival",
    name: "Maya",
    personality: "Competitive & Challenging",
    description: "Your friendly rival who pushes you to exceed your limits and achieve greatness.",
    avatar: "🏆",
    imageUrl: undefined, // No PNG available for Maya yet
    specialties: ["Competition", "Challenge", "Peak Performance"],
    available: true
  }
];

export const getAvailableCoaches = (): Coach[] => {
  return coachProfiles.filter(coach => coach.available);
};

export const getCoachById = (id: string): Coach | undefined => {
  return coachProfiles.find(coach => coach.id === id);
};

// Legacy exports for backward compatibility (will be removed after migration)
export const mockCoaches = coachProfiles;