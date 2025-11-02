import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Alert } from "react-native";
import type { AuthSession as Session, AuthUser as SupabaseUser } from "@/lib/supabase";
import { supabase, ensureSupabaseInitialized } from "@/lib/supabase";
import { ENV } from "../config/env";
import { logger } from "../utils/logger";
import {
  getSecureJSON,
  setSecureJSON,
  deleteSecureItem,
  migrateFromAsyncStorage,
} from "../utils/secureStorage";

export interface User {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
  phone_number?: string;
  email_confirmed_at?: string;
  created_at: string;
  updated_at?: string;
  tier?: "free" | "premium" | "savage";
}

export interface AuthState {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  bypassAuth: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

function mapUser(supabaseUser: SupabaseUser | null | undefined): User | null {
  if (!supabaseUser) return null;
  return {
    id: supabaseUser.id,
    email: supabaseUser.email ?? "",
    name: (supabaseUser.user_metadata as Record<string, any>)?.name,
    avatar_url: (supabaseUser.user_metadata as Record<string, any>)?.avatar_url,
    phone_number: (supabaseUser.user_metadata as Record<string, any>)?.phone_number,
    email_confirmed_at: supabaseUser.email_confirmed_at ?? undefined,
    created_at: supabaseUser.created_at,
    updated_at: supabaseUser.updated_at ?? undefined,
    tier: (supabaseUser.user_metadata as Record<string, any>)?.subscription_tier,
  };
}

const STORAGE_KEY = (env: string) => `mindfork-auth-${env}`;

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let subscription: { unsubscribe: () => void } | null = null;

    const bootstrap = async () => {
      try {
        await ensureSupabaseInitialized();

        // Migrate from insecure AsyncStorage to SecureStore if needed
        await migrateFromAsyncStorage(STORAGE_KEY(ENV.APP_ENV));

        // Restore cached session from secure storage if still valid
        const cached = await getSecureJSON<Session>(STORAGE_KEY(ENV.APP_ENV));
        if (cached?.access_token) {
          // Validate session hasn't expired
          const expiresAt = cached.expires_at ? cached.expires_at * 1000 : 0;
          const isExpired = expiresAt > 0 && Date.now() > expiresAt;

          if (!isExpired) {
            setSession(cached);
            setUser(mapUser(cached.user) ?? null);
            logger.debug("Restored session from secure storage", { userId: cached.user?.id });
          } else {
            logger.info("Cached session expired, clearing", { expiresAt: new Date(expiresAt) });
            await deleteSecureItem(STORAGE_KEY(ENV.APP_ENV));
          }
        }

        // Get fresh session from Supabase
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          logger.warn("Supabase getSession error", { error: error.message });
        } else if (active) {
          setSession(data.session);
          setUser(mapUser(data.session?.user) ?? null);
          if (data.session) {
            await setSecureJSON(STORAGE_KEY(ENV.APP_ENV), data.session);
            logger.debug("Session stored securely", { userId: data.session.user?.id });
          }
        }

        // Listen for auth state changes
        const listener = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
          if (!active) return;

          setSession(nextSession);
          setUser(mapUser(nextSession?.user) ?? null);

          if (nextSession) {
            await setSecureJSON(STORAGE_KEY(ENV.APP_ENV), nextSession);
            logger.debug("Session updated in secure storage", { userId: nextSession.user?.id });
          } else {
            await deleteSecureItem(STORAGE_KEY(ENV.APP_ENV));
            logger.debug("Session removed from secure storage");
          }
        });
        subscription = listener.data.subscription;
      } catch (error) {
        logger.error("Auth bootstrap failed", error as Error);
      } finally {
        if (active) {
          setIsInitialized(true);
        }
      }
    };

    bootstrap();

    return () => {
      active = false;
      subscription?.unsubscribe();
    };
  }, []);

  const handleAuthError = (message: string) => {
    setError(message);
    Alert.alert("Authentication", message);
  };

  const signIn = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (authError) {
        throw authError;
      }
    } catch (err: any) {
      handleAuthError(err?.message ?? "Unable to sign in");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });
      if (signUpError) {
        throw signUpError;
      }
    } catch (err: any) {
      handleAuthError(err?.message ?? "Unable to sign up");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    setIsLoading(true);
    try {
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) {
        throw signOutError;
      }
      await deleteSecureItem(STORAGE_KEY(ENV.APP_ENV));
      setUser(null);
      setSession(null);
      logger.info("User signed out successfully");
    } catch (err: any) {
      handleAuthError(err?.message ?? "Unable to sign out");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const bypassAuth = useCallback(async () => {
    if (!ENV.BYPASS_AUTH || !__DEV__) {
      logger.warn("Bypass auth attempted but not allowed");
      return;
    }

    logger.info("Bypassing authentication for development");
    setIsLoading(true);

    try {
      // Create a mock user and session for development
      const mockUser: User = {
        id: "dev-user-123",
        email: "dev@mindfork.app",
        name: "Development User",
        created_at: new Date().toISOString(),
        tier: "premium",
      };

      const mockSupabaseUser = {
        id: mockUser.id,
        email: mockUser.email,
        user_metadata: {
          name: mockUser.name,
          subscription_tier: mockUser.tier,
        },
        created_at: mockUser.created_at,
        updated_at: new Date().toISOString(),
        email_confirmed_at: new Date().toISOString(),
        aud: "authenticated",
        role: "authenticated",
        app_metadata: {},
        identities: [],
        factors: [],
      };

      const mockSession: Session = {
        access_token: "mock-access-token-dev",
        refresh_token: "mock-refresh-token-dev",
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        token_type: "bearer",
        user: mockSupabaseUser,
      };

      // Clear any existing error
      setError(null);

      // Set the state directly - this should trigger navigation
      setUser(mockUser);
      setSession(mockSession);

      // Cache the mock session securely
      await setSecureJSON(STORAGE_KEY(ENV.APP_ENV), mockSession);

      logger.info("Development auth bypass successful", {
        userId: mockUser.id,
        hasUser: !!mockUser,
        hasSession: !!mockSession
      });
    } catch (error) {
      logger.error("Failed to bypass auth", error as Error);
      setError("Failed to bypass authentication");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const value = useMemo<AuthState>(() => {
    const isAuthenticated = !!user && !!session;
    
    // Debug logging for auth state
    if (__DEV__) {
      logger.debug("Auth state update", {
        hasUser: !!user,
        hasSession: !!session,
        isAuthenticated,
        userId: user?.id,
        userEmail: user?.email,
      });
    }
    
    return {
      user,
      session,
      isAuthenticated,
      isLoading,
      isInitialized,
      error,
      signIn,
      signUp,
      signOut,
      bypassAuth,
      clearError: () => setError(null),
    };
  }, [bypassAuth, error, isInitialized, isLoading, session, signIn, signOut, signUp, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export default AuthContext;
