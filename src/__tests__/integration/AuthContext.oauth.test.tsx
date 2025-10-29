/**
 * OAuth Integration Tests for AuthContext
 * 
 * CRITICAL PATH: OAuth must never break again
 * 
 * Protected File: AuthContext.tsx
 * Risk Level: CRITICAL
 * Last Incident: 2025-10-20 (500 error from URL mismatch)
 * 
 * Tests verify:
 * 1. Redirect URL is correct hardcoded value
 * 2. OAuth flow end-to-end (mocked Google response)
 * 3. Session persistence
 * 4. Token extraction from redirect
 * 5. Error handling (network failures, invalid tokens)
 * 6. Session restoration on app restart
 * 
 * Coverage Target: 90%+
 * RFLVR Target: ≥ 0.85
 */

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import { Alert } from 'react-native';
import { AuthProvider, useAuth } from '../../contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { sessionFactory, userFactory } from '../factories';
import type { Session } from '@supabase/supabase-js';

// Mock modules
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      signInWithOAuth: jest.fn(),
      setSession: jest.fn(),
      signOut: jest.fn(),
      onAuthStateChange: jest.fn(),
    },
  },
  ensureSupabaseInitialized: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('expo-secure-store');
jest.mock('expo-web-browser');

jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  Alert: {
    alert: jest.fn(),
  },
}));

describe('AuthContext OAuth Integration Tests', () => {
  const EXPECTED_REDIRECT_URL = 'com.mindfork.app://auth/callback';
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  );

  beforeEach(() => {
    jest.clearAllMocks();
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
    (SecureStore.setItemAsync as jest.Mock).mockResolvedValue(undefined);
    (SecureStore.deleteItemAsync as jest.Mock).mockResolvedValue(undefined);
    (supabase.auth.onAuthStateChange as jest.Mock).mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } },
    });
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: null },
      error: null,
    });
  });

  describe('OAuth Redirect URL Configuration', () => {
    it('CRITICAL: should use hardcoded redirect URL com.mindfork.app://auth/callback', async () => {
      // Arrange
      (supabase.auth.signInWithOAuth as jest.Mock).mockResolvedValue({
        data: { 
          url: 'https://accounts.google.com/oauth?state=test',
          provider: 'google'
        },
        error: null,
      });

      (WebBrowser.openAuthSessionAsync as jest.Mock).mockResolvedValue({
        type: 'cancel'
      });

      // Act
      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.isInitialized).toBe(true));

      await act(async () => {
        await result.current.signInWithGoogle();
      });

      // Assert: Verify hardcoded URL is used (not dynamic)
      expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: {
          redirectTo: EXPECTED_REDIRECT_URL,
          skipBrowserRedirect: false,
        },
      });
    });

    it('SNAPSHOT: should maintain OAuth configuration consistency', async () => {
      // Arrange
      (supabase.auth.signInWithOAuth as jest.Mock).mockResolvedValue({
        data: { 
          url: 'https://accounts.google.com/oauth?state=test',
          provider: 'google'
        },
        error: null,
      });

      (WebBrowser.openAuthSessionAsync as jest.Mock).mockResolvedValue({
        type: 'cancel'
      });

      // Act
      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.isInitialized).toBe(true));

      await act(async () => {
        await result.current.signInWithGoogle();
      });

      // Assert: Snapshot OAuth configuration
      const oauthCall = (supabase.auth.signInWithOAuth as jest.Mock).mock.calls[0][0];
      expect(oauthCall).toMatchSnapshot('oauth-configuration');
    });

    it('should pass redirect URL to WebBrowser.openAuthSessionAsync', async () => {
      // Arrange
      const mockOAuthUrl = 'https://accounts.google.com/oauth?state=test&redirect_uri=com.mindfork.app%3A%2F%2Fauth%2Fcallback';
      
      (supabase.auth.signInWithOAuth as jest.Mock).mockResolvedValue({
        data: { url: mockOAuthUrl, provider: 'google' },
        error: null,
      });

      (WebBrowser.openAuthSessionAsync as jest.Mock).mockResolvedValue({
        type: 'cancel'
      });

      // Act
      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.isInitialized).toBe(true));

      await act(async () => {
        await result.current.signInWithGoogle();
      });

      // Assert
      expect(WebBrowser.openAuthSessionAsync).toHaveBeenCalledWith(
        mockOAuthUrl,
        EXPECTED_REDIRECT_URL
      );
    });
  });

  describe('OAuth Flow End-to-End', () => {
    it('should complete OAuth flow successfully with hash fragment tokens', async () => {
      // Arrange: Mock successful OAuth flow with valid JWT
      const validAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
      const validRefreshToken = 'valid-refresh-token-value';
      const mockSession = sessionFactory({ access_token: validAccessToken, refresh_token: validRefreshToken });
      const callbackUrl = `${EXPECTED_REDIRECT_URL}#access_token=${validAccessToken}&refresh_token=${validRefreshToken}&token_type=bearer&expires_in=3600`;

      (supabase.auth.signInWithOAuth as jest.Mock).mockResolvedValue({
        data: { url: 'https://accounts.google.com/oauth', provider: 'google' },
        error: null,
      });

      (WebBrowser.openAuthSessionAsync as jest.Mock).mockResolvedValue({
        type: 'success',
        url: callbackUrl,
      });

      (supabase.auth.setSession as jest.Mock).mockResolvedValue({
        data: { session: mockSession, user: mockSession.user },
        error: null,
      });

      // Act
      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.isInitialized).toBe(true));

      await act(async () => {
        await result.current.signInWithGoogle();
      });

      // Assert - wait for setSession
      await waitFor(() => {
        expect(supabase.auth.setSession).toHaveBeenCalledWith({
          access_token: validAccessToken,
          refresh_token: validRefreshToken,
        });
      });
    });

    it('should complete OAuth flow successfully with query string tokens', async () => {
      // Arrange: Some OAuth providers use query strings
      const validAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
      const validRefreshToken = 'valid-refresh-token-value';
      const mockSession = sessionFactory({ access_token: validAccessToken, refresh_token: validRefreshToken });
      const callbackUrl = `${EXPECTED_REDIRECT_URL}?access_token=${validAccessToken}&refresh_token=${validRefreshToken}&token_type=bearer&expires_in=3600`;

      (supabase.auth.signInWithOAuth as jest.Mock).mockResolvedValue({
        data: { url: 'https://accounts.google.com/oauth', provider: 'google' },
        error: null,
      });

      (WebBrowser.openAuthSessionAsync as jest.Mock).mockResolvedValue({
        type: 'success',
        url: callbackUrl,
      });

      (supabase.auth.setSession as jest.Mock).mockResolvedValue({
        data: { session: mockSession, user: mockSession.user },
        error: null,
      });

      // Act
      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.isInitialized).toBe(true));

      await act(async () => {
        await result.current.signInWithGoogle();
      });

      // Assert - wait for setSession
      await waitFor(() => {
        expect(supabase.auth.setSession).toHaveBeenCalledWith({
          access_token: validAccessToken,
          refresh_token: validRefreshToken,
        });
      });
    });

    it('should handle user cancellation gracefully', async () => {
      // Arrange
      (supabase.auth.signInWithOAuth as jest.Mock).mockResolvedValue({
        data: { url: 'https://accounts.google.com/oauth', provider: 'google' },
        error: null,
      });

      (WebBrowser.openAuthSessionAsync as jest.Mock).mockResolvedValue({
        type: 'cancel',
      });

      // Act
      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.isInitialized).toBe(true));

      await act(async () => {
        await result.current.signInWithGoogle();
      });

      // Assert
      expect(result.current.error).toBe('Sign-in cancelled');
      expect(result.current.isAuthenticated).toBe(false);
      expect(supabase.auth.setSession).not.toHaveBeenCalled();
    });

    it('should handle browser dismissal', async () => {
      // Arrange
      (supabase.auth.signInWithOAuth as jest.Mock).mockResolvedValue({
        data: { url: 'https://accounts.google.com/oauth', provider: 'google' },
        error: null,
      });

      (WebBrowser.openAuthSessionAsync as jest.Mock).mockResolvedValue({
        type: 'dismiss',
      });

      // Act
      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.isInitialized).toBe(true));

      await act(async () => {
        await result.current.signInWithGoogle();
      });

      // Assert: Dismissal should not set error or authenticate
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe('Token Extraction and Validation', () => {
    it('should extract and validate JWT access tokens', async () => {
      // Arrange: Valid JWT format
      const validJWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
      const refreshToken = 'refresh_token_value';
      const callbackUrl = `${EXPECTED_REDIRECT_URL}#access_token=${validJWT}&refresh_token=${refreshToken}`;

      (supabase.auth.signInWithOAuth as jest.Mock).mockResolvedValue({
        data: { url: 'https://accounts.google.com/oauth', provider: 'google' },
        error: null,
      });

      (WebBrowser.openAuthSessionAsync as jest.Mock).mockResolvedValue({
        type: 'success',
        url: callbackUrl,
      });

      (supabase.auth.setSession as jest.Mock).mockResolvedValue({
        data: { session: sessionFactory({ access_token: validJWT }), user: userFactory() },
        error: null,
      });

      // Act
      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.isInitialized).toBe(true));

      await act(async () => {
        await result.current.signInWithGoogle();
      });

      // Assert: Should accept valid JWT
      expect(supabase.auth.setSession).toHaveBeenCalledWith({
        access_token: validJWT,
        refresh_token: refreshToken,
      });
    });

    it('should reject invalid JWT format tokens', async () => {
      // Arrange: Invalid JWT (missing parts)
      const invalidJWT = 'invalid.token';
      const callbackUrl = `${EXPECTED_REDIRECT_URL}#access_token=${invalidJWT}&refresh_token=refresh_token`;

      (supabase.auth.signInWithOAuth as jest.Mock).mockResolvedValue({
        data: { url: 'https://accounts.google.com/oauth', provider: 'google' },
        error: null,
      });

      (WebBrowser.openAuthSessionAsync as jest.Mock).mockResolvedValue({
        type: 'success',
        url: callbackUrl,
      });

      // Act
      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.isInitialized).toBe(true));

      await act(async () => {
        await result.current.signInWithGoogle();
      });

      // Assert: Should reject and show error
      expect(result.current.error).toBe('Invalid access token format');
      expect(supabase.auth.setSession).not.toHaveBeenCalled();
    });

    it('should handle missing access token', async () => {
      // Arrange: Callback without access_token
      const callbackUrl = `${EXPECTED_REDIRECT_URL}#refresh_token=refresh_token`;

      (supabase.auth.signInWithOAuth as jest.Mock).mockResolvedValue({
        data: { url: 'https://accounts.google.com/oauth', provider: 'google' },
        error: null,
      });

      (WebBrowser.openAuthSessionAsync as jest.Mock).mockResolvedValue({
        type: 'success',
        url: callbackUrl,
      });

      // Act
      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.isInitialized).toBe(true));

      await act(async () => {
        await result.current.signInWithGoogle();
      });

      // Assert
      expect(result.current.error).toBe('Missing authentication tokens');
      expect(supabase.auth.setSession).not.toHaveBeenCalled();
    });

    it('should handle missing refresh token', async () => {
      // Arrange: Callback without refresh_token
      const validJWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';
      const callbackUrl = `${EXPECTED_REDIRECT_URL}#access_token=${validJWT}`;

      (supabase.auth.signInWithOAuth as jest.Mock).mockResolvedValue({
        data: { url: 'https://accounts.google.com/oauth', provider: 'google' },
        error: null,
      });

      (WebBrowser.openAuthSessionAsync as jest.Mock).mockResolvedValue({
        type: 'success',
        url: callbackUrl,
      });

      // Act
      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.isInitialized).toBe(true));

      await act(async () => {
        await result.current.signInWithGoogle();
      });

      // Assert
      expect(result.current.error).toBe('Missing authentication tokens');
      expect(supabase.auth.setSession).not.toHaveBeenCalled();
    });

    it('should handle callback URL without parameters', async () => {
      // Arrange: Malformed callback
      const callbackUrl = EXPECTED_REDIRECT_URL;

      (supabase.auth.signInWithOAuth as jest.Mock).mockResolvedValue({
        data: { url: 'https://accounts.google.com/oauth', provider: 'google' },
        error: null,
      });

      (WebBrowser.openAuthSessionAsync as jest.Mock).mockResolvedValue({
        type: 'success',
        url: callbackUrl,
      });

      // Act
      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.isInitialized).toBe(true));

      await act(async () => {
        await result.current.signInWithGoogle();
      });

      // Assert
      expect(result.current.error).toBe('No OAuth parameters found in callback URL');
    });

    it('should handle empty hash fragment', async () => {
      // Arrange: Hash but no parameters
      const callbackUrl = `${EXPECTED_REDIRECT_URL}#`;

      (supabase.auth.signInWithOAuth as jest.Mock).mockResolvedValue({
        data: { url: 'https://accounts.google.com/oauth', provider: 'google' },
        error: null,
      });

      (WebBrowser.openAuthSessionAsync as jest.Mock).mockResolvedValue({
        type: 'success',
        url: callbackUrl,
      });

      // Act
      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.isInitialized).toBe(true));

      await act(async () => {
        await result.current.signInWithGoogle();
      });

      // Assert
      expect(result.current.error).toBe('Missing OAuth callback parameters');
    });
  });

  describe('Session Persistence', () => {
    it('should persist session to SecureStore after successful OAuth', async () => {
      // Arrange
      const validAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';
      const validRefreshToken = 'valid-refresh-token';
      const mockSession = sessionFactory({ access_token: validAccessToken, refresh_token: validRefreshToken });
      const callbackUrl = `${EXPECTED_REDIRECT_URL}#access_token=${validAccessToken}&refresh_token=${validRefreshToken}`;

      (supabase.auth.signInWithOAuth as jest.Mock).mockResolvedValue({
        data: { url: 'https://accounts.google.com/oauth', provider: 'google' },
        error: null,
      });

      (WebBrowser.openAuthSessionAsync as jest.Mock).mockResolvedValue({
        type: 'success',
        url: callbackUrl,
      });

      (supabase.auth.setSession as jest.Mock).mockResolvedValue({
        data: { session: mockSession, user: mockSession.user },
        error: null,
      });

      let authStateCallback: any;
      (supabase.auth.onAuthStateChange as jest.Mock).mockImplementation((callback) => {
        authStateCallback = callback;
        return { data: { subscription: { unsubscribe: jest.fn() } } };
      });

      // Act
      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.isInitialized).toBe(true));

      await act(async () => {
        await result.current.signInWithGoogle();
      });

      // Trigger auth state change
      await act(async () => {
        authStateCallback('SIGNED_IN', mockSession);
      });

      // Assert: Session should be persisted
      await waitFor(() => {
        expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
          expect.stringContaining('mindfork-auth'),
          JSON.stringify(mockSession)
        );
      });
    });

    it('should restore OAuth session on app restart', async () => {
      // Arrange: Simulate app restart with cached OAuth session
      const mockSession = sessionFactory();
      
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(
        JSON.stringify(mockSession)
      );

      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      // Act: Initialize auth (simulates app restart)
      const { result } = renderHook(() => useAuth(), { wrapper });

      // Assert: Session should be restored
      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
        expect(result.current.isAuthenticated).toBe(true);
        expect(result.current.user?.email).toBe(mockSession.user.email);
      });
    });

    it('should handle SecureStore persistence failures gracefully', async () => {
      // Arrange
      const validAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';
      const validRefreshToken = 'valid-refresh-token';
      const mockSession = sessionFactory({ access_token: validAccessToken, refresh_token: validRefreshToken });
      const callbackUrl = `${EXPECTED_REDIRECT_URL}#access_token=${validAccessToken}&refresh_token=${validRefreshToken}`;

      (supabase.auth.signInWithOAuth as jest.Mock).mockResolvedValue({
        data: { url: 'https://accounts.google.com/oauth', provider: 'google' },
        error: null,
      });

      (WebBrowser.openAuthSessionAsync as jest.Mock).mockResolvedValue({
        type: 'success',
        url: callbackUrl,
      });

      (supabase.auth.setSession as jest.Mock).mockResolvedValue({
        data: { session: mockSession, user: mockSession.user },
        error: null,
      });

      (SecureStore.setItemAsync as jest.Mock).mockRejectedValue(
        new Error('Storage quota exceeded')
      );

      let authStateCallback: any;
      (supabase.auth.onAuthStateChange as jest.Mock).mockImplementation((callback) => {
        authStateCallback = callback;
        return { data: { subscription: { unsubscribe: jest.fn() } } };
      });

      // Act
      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.isInitialized).toBe(true));

      await act(async () => {
        await result.current.signInWithGoogle();
      });

      // Trigger auth state change
      await act(async () => {
        authStateCallback('SIGNED_IN', mockSession);
      });

      // Assert: Auth should succeed despite storage error
      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle Supabase OAuth initiation errors', async () => {
      // Arrange
      (supabase.auth.signInWithOAuth as jest.Mock).mockResolvedValue({
        data: { url: null, provider: 'google' },
        error: { message: 'OAuth provider misconfigured' },
      });

      // Act
      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.isInitialized).toBe(true));

      await act(async () => {
        await result.current.signInWithGoogle();
      });

      // Assert - Generic error message
      expect(result.current.error).toBe('Unable to sign in with Google');
      expect(WebBrowser.openAuthSessionAsync).not.toHaveBeenCalled();
    });

    it('should handle network errors during OAuth initiation', async () => {
      // Arrange
      (supabase.auth.signInWithOAuth as jest.Mock).mockRejectedValue(
        new Error('Network request failed')
      );

      // Act
      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.isInitialized).toBe(true));

      await act(async () => {
        await result.current.signInWithGoogle();
      });

      // Assert
      expect(result.current.error).toBe('Network request failed');
      expect(Alert.alert).toHaveBeenCalledWith(
        'Authentication',
        'Network request failed',
        [{ text: 'OK' }]
      );
    });

    it('should handle setSession errors after OAuth callback', async () => {
      // Arrange - Use valid JWT
      const validAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';
      const validRefreshToken = 'refresh-token-value';
      const callbackUrl = `${EXPECTED_REDIRECT_URL}#access_token=${validAccessToken}&refresh_token=${validRefreshToken}`;

      (supabase.auth.signInWithOAuth as jest.Mock).mockResolvedValue({
        data: { url: 'https://accounts.google.com/oauth', provider: 'google' },
        error: null,
      });

      (WebBrowser.openAuthSessionAsync as jest.Mock).mockResolvedValue({
        type: 'success',
        url: callbackUrl,
      });

      (supabase.auth.setSession as jest.Mock).mockResolvedValue({
        data: { session: null, user: null },
        error: { message: 'Invalid token signature' },
      });

      // Act
      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.isInitialized).toBe(true));

      await act(async () => {
        await result.current.signInWithGoogle();
      });

      // Assert
      expect(result.current.error).toBe('Unable to sign in with Google');
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should handle WebBrowser errors', async () => {
      // Arrange
      (supabase.auth.signInWithOAuth as jest.Mock).mockResolvedValue({
        data: { url: 'https://accounts.google.com/oauth', provider: 'google' },
        error: null,
      });

      (WebBrowser.openAuthSessionAsync as jest.Mock).mockRejectedValue(
        new Error('Failed to open browser')
      );

      // Act
      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.isInitialized).toBe(true));

      await act(async () => {
        await result.current.signInWithGoogle();
      });

      // Assert
      expect(result.current.error).toBe('Failed to open browser');
    });
  });

  describe('Loading States', () => {
    it('should set loading state during OAuth flow', async () => {
      // Arrange
      let resolveWebBrowser: ((value: any) => void) | undefined;

      (supabase.auth.signInWithOAuth as jest.Mock).mockResolvedValue({
        data: { url: 'https://accounts.google.com/oauth', provider: 'google' },
        error: null,
      });

      (WebBrowser.openAuthSessionAsync as jest.Mock).mockImplementation(
        () => new Promise((resolve) => { resolveWebBrowser = resolve; })
      );

      // Act
      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.isInitialized).toBe(true));

      // Start OAuth flow (don't await yet)
      let signInPromise: Promise<void> | undefined;
      act(() => {
        signInPromise = result.current.signInWithGoogle();
      });

      // Assert: Loading during OAuth
      await waitFor(() => expect(result.current.isLoading).toBe(true));

      // Complete OAuth
      await act(async () => {
        if (resolveWebBrowser) {
          resolveWebBrowser({ type: 'cancel' });
        }
        if (signInPromise) {
          await signInPromise;
        }
      });

      // Assert: Loading complete
      expect(result.current.isLoading).toBe(false);
    });

    it('should clear loading state on error', async () => {
      // Arrange
      (supabase.auth.signInWithOAuth as jest.Mock).mockRejectedValue(
        new Error('OAuth error')
      );

      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: null },
        error: null,
      });

      // Act
      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.isInitialized).toBe(true), { timeout: 5000 });

      await act(async () => {
        await result.current.signInWithGoogle();
      });

      // Assert
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe('OAuth error');
    });
  });
});
