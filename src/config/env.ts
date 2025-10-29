import Constants from "expo-constants";
import { logger } from "../utils/logger";

const extra = Constants.expoConfig?.extra ?? {};

const readEnv = (key: string, fallback = ""): string => {
  if (typeof extra[key] === "string" && extra[key]) {
    return extra[key] as string;
  }
  if (__DEV__ && process.env[key]) {
    return process.env[key] as string;
  }
  return fallback;
};

export const ENV = {
  SUPABASE_URL: readEnv("EXPO_PUBLIC_SUPABASE_URL", ""),
  SUPABASE_ANON_KEY: readEnv("EXPO_PUBLIC_SUPABASE_ANON_KEY", ""),
  OPENAI_API_KEY: readEnv("EXPO_PUBLIC_OPENAI_API_KEY", ""),
  SENTRY_DSN: readEnv("EXPO_PUBLIC_SENTRY_DSN", ""),
  STRIPE_PUBLISHABLE_KEY: readEnv("EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY", ""),
  STRIPE_PREMIUM_MONTHLY_PRICE_ID: readEnv("EXPO_PUBLIC_STRIPE_PREMIUM_MONTHLY_PRICE_ID", ""),
  STRIPE_PREMIUM_YEARLY_PRICE_ID: readEnv("EXPO_PUBLIC_STRIPE_PREMIUM_YEARLY_PRICE_ID", ""),
  BYPASS_AUTH: readEnv("EXPO_PUBLIC_BYPASS_AUTH", "false") === "true",
  APP_ENV: readEnv("EXPO_PUBLIC_APP_ENV", __DEV__ ? "development" : "production"),
};

const hasSupabaseUrl = !!ENV.SUPABASE_URL && ENV.SUPABASE_URL.startsWith("https://");
const hasSupabaseKey = !!ENV.SUPABASE_ANON_KEY;
const hasOpenAIKey = !!ENV.OPENAI_API_KEY;
const hasSentryDSN = !!ENV.SENTRY_DSN && ENV.SENTRY_DSN.startsWith("https://");

export const ENV_VALIDATION = {
  isValid: hasSupabaseUrl && hasSupabaseKey,
  hasCriticalVars: hasSupabaseUrl && hasSupabaseKey,
  hasValidUrl: hasSupabaseUrl,
  canUseSupabase: hasSupabaseUrl && hasSupabaseKey,
  canUseOpenAI: hasOpenAIKey,
  canUseSentry: hasSentryDSN,
};

if (__DEV__) {
  // Helpful debug log once during development.
  logger.debug("Environment variables loaded", {
    supabaseUrl: hasSupabaseUrl ? ENV.SUPABASE_URL.replace(/https:\/\/([^.]+)\./, "https://***.") : "missing",
    supabaseKey: hasSupabaseKey ? "set" : "missing",
    openaiKey: hasOpenAIKey ? "set" : "missing",
  });
}
