import "react-native-url-polyfill/auto";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Database } from "../types/supabase";
import { ENV, ENV_VALIDATION } from "../config/env";

const initializeSupabase = () => {
  if (!ENV_VALIDATION.hasValidUrl || !ENV_VALIDATION.hasCriticalVars) {
    throw new Error("Supabase URL or anon key missing. Check EXPO_PUBLIC_SUPABASE_* variables.");
  }

  return createClient<Database>(ENV.SUPABASE_URL, ENV.SUPABASE_ANON_KEY, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      storageKey: `mindfork-auth-${ENV.APP_ENV}`,
    },
  });
};

// Initialize immediately to fail fast if env config is wrong - typed as Database
export const supabase = initializeSupabase();

export const ensureSupabaseInitialized = async () => {
  return supabase;
};

export type { SupabaseClient };
export const isSupabaseInitialized = () => !!supabase;
export const isUsingMockData = () => false;

export default supabase;
