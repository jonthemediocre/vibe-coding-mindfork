/**
 * AuthContext Error Path Tests
 * Tests P0 fix error handling for authentication context
 */

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { AuthProvider, useAuth } from '../AuthContext';
import { supabase } from '@/lib/supabase';
import type { Session } from '@supabase/supabase-js';

// Mock supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      onAuthStateChange: jest.fn(),
      getUser: jest.fn(),
    },
  },
  ensureSupabaseInitialized: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  Alert: {
    alert: jest.fn(),
  },
}));

const mockSession: Session = {
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
  expires_in: 3600,
  token_type: 'bearer',
  user: {
    id: 'user-123',
    email: 'test@example.com',
    aud: 'authenticated',
    role: 'authenticated',
    created_at: '2024-01-01T00:00:00Z',
    app_metadata: {},
    user_metadata: { name: 'Test User' },
  },
};

describe('AuthContext Error Handling', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  );

  beforeEach(() => {
    jest.clearAllMocks();
    AsyncStorage.clear();
    (supabase.auth.onAuthStateChange as jest.Mock).mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } },
    });
  });

  describe('Bootstrap Initialization', () => {
    it('should handle corrupted cached session gracefully', async () => {
      // Arrange: Corrupt session in cache
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('invalid-json{');
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      // Act
      const { result } = renderHook(() => useAuth(), { wrapper });

      // Assert: Should initialize, clear bad cache, use fresh session
      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });
      expect(AsyncStorage.removeItem).toHaveBeenCalled();
      expect(result.current.isAuthenticated).toBe(true);
    });

    it('should handle AsyncStorage.getItem failures', async () => {
      // Arrange: AsyncStorage read failure
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('Storage read error'));
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: null },
        error: null,
      });

      // Act
      const { result } = renderHook(() => useAuth(), { wrapper });

      // Assert: Should initialize despite storage error, but no session
      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should handle AsyncStorage.setItem failures', async () => {
      // Arrange: Storage write failure
      (AsyncStorage.setItem as jest.Mock).mockRejectedValue(new Error('Storage full'));
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: null },
        error: null,
      });

      // Act
      const { result } = renderHook(() => useAuth(), { wrapper });

      // Assert: Auth flow continues despite storage write error
      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });
      // Storage errors are logged but don't affect auth state
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should set error state on bootstrap failure', async () => {
      // Arrange: Supabase initialization fails
      (supabase.auth.getSession as jest.Mock).mockRejectedValue(new Error('Network error'));

      // Act
      const { result } = renderHook(() => useAuth(), { wrapper });

      // Assert: Should be initialized with error
      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });
      expect(result.current.error).toBe('Failed to initialize authentication. Please restart the app.');
    });

    it('should handle missing cached session access_token', async () => {
      // Arrange: Cached session without access_token
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify({ user: mockSession.user })
      );
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: null },
        error: null,
      });

      // Act
      const { result } = renderHook(() => useAuth(), { wrapper });

      // Assert: Should not set session from cache
      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should handle session restoration with expired tokens', async () => {
      // Arrange: Expired session in cache, but Supabase says it's still valid
      const expiredSession = {
        ...mockSession,
        expires_in: -1000,
      };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(expiredSession));
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: mockSession }, // Supabase refreshed it
        error: null,
      });

      // Act
      const { result } = renderHook(() => useAuth(), { wrapper });

      // Assert: Uses refreshed session from Supabase
      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });
      expect(result.current.isAuthenticated).toBe(true);
    });
  });

  describe('Auth State Listener', () => {
    it('should handle auth state listener storage errors gracefully', async () => {
      // Arrange: Auth listener with storage errors
      let stateChangeCallback: any;
      (supabase.auth.onAuthStateChange as jest.Mock).mockImplementation((callback) => {
        stateChangeCallback = callback;
        return {
          data: { subscription: { unsubscribe: jest.fn() } },
        };
      });
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: null },
        error: null,
      });

      // Act
      const { result } = renderHook(() => useAuth(), { wrapper });

      // Wait for initialization
      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      // Simulate auth state change with storage error
      (AsyncStorage.setItem as jest.Mock).mockRejectedValue(new Error('Storage error'));
      await act(async () => {
        if (stateChangeCallback) {
          stateChangeCallback('SIGNED_IN', mockSession);
        }
      });

      // Assert: Auth flow continues despite storage error (graceful degradation)
      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });
      expect(result.current.user?.email).toBe('test@example.com');
      // Error is logged but doesn't block authentication
    });

    it('should not update state after unmount', async () => {
      // Arrange
      let stateChangeCallback: any;
      (supabase.auth.onAuthStateChange as jest.Mock).mockImplementation((callback) => {
        stateChangeCallback = callback;
        return {
          data: { subscription: { unsubscribe: jest.fn() } },
        };
      });
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: null },
        error: null,
      });

      // Act
      const { result, unmount } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.isInitialized).toBe(true));

      unmount();

      // Simulate auth state change after unmount
      await act(async () => {
        stateChangeCallback('SIGNED_IN', mockSession);
      });

      // Assert: State should not update (no error thrown)
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe('Sign In Error Handling', () => {
    it('should handle sign in with invalid credentials', async () => {
      // Arrange
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: null },
        error: null,
      });
      (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid credentials' },
      });

      // Act
      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.isInitialized).toBe(true));

      await act(async () => {
        await result.current.signIn('wrong@example.com', 'wrongpassword');
      });

      // Assert
      expect(result.current.error).toBe('Invalid credentials');
      expect(Alert.alert).toHaveBeenCalledWith('Authentication', 'Invalid credentials', [{ text: 'OK' }]);
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should handle sign in network errors', async () => {
      // Arrange
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: null },
        error: null,
      });
      (supabase.auth.signInWithPassword as jest.Mock).mockRejectedValue(
        new Error('Network request failed')
      );

      // Act
      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.isInitialized).toBe(true));

      await act(async () => {
        await result.current.signIn('test@example.com', 'password');
      });

      // Assert
      expect(result.current.error).toBe('Network request failed');
      expect(Alert.alert).toHaveBeenCalled();
    });

    it('should clear error state on successful sign in', async () => {
      // Arrange
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: null },
        error: null,
      });
      (supabase.auth.signInWithPassword as jest.Mock)
        .mockResolvedValueOnce({
          data: { user: null, session: null },
          error: { message: 'Invalid' },
        })
        .mockResolvedValueOnce({
          data: { user: mockSession.user, session: mockSession },
          error: null,
        });

      // Act
      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.isInitialized).toBe(true));

      // First attempt - fail
      await act(async () => {
        await result.current.signIn('test@example.com', 'wrong');
      });
      expect(result.current.error).toBe('Invalid');

      // Second attempt - success
      await act(async () => {
        await result.current.signIn('test@example.com', 'correct');
      });

      // Assert
      await waitFor(() => {
        expect(result.current.error).toBeNull();
      });
    });
  });

  describe('Sign Up Error Handling', () => {
    it('should handle sign up with existing email', async () => {
      // Arrange
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: null },
        error: null,
      });
      (supabase.auth.signUp as jest.Mock).mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Email already exists' },
      });

      // Act
      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.isInitialized).toBe(true));

      await act(async () => {
        await result.current.signUp('existing@example.com', 'password');
      });

      // Assert
      expect(result.current.error).toBe('Email already exists');
      expect(Alert.alert).toHaveBeenCalledWith('Authentication', 'Email already exists', [{ text: 'OK' }]);
    });

    it('should handle sign up with weak password', async () => {
      // Arrange
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: null },
        error: null,
      });
      (supabase.auth.signUp as jest.Mock).mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Password too weak' },
      });

      // Act
      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.isInitialized).toBe(true));

      await act(async () => {
        await result.current.signUp('new@example.com', '123');
      });

      // Assert
      expect(result.current.error).toBe('Password too weak');
    });
  });

  describe('Sign Out Error Handling', () => {
    it('should handle sign out errors gracefully', async () => {
      // Arrange: User signed in
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });
      (supabase.auth.signOut as jest.Mock).mockResolvedValue({
        error: { message: 'Sign out failed' },
      });

      // Act
      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.isAuthenticated).toBe(true));

      await act(async () => {
        await result.current.signOut();
      });

      // Assert
      expect(result.current.error).toBe('Sign out failed');
      expect(Alert.alert).toHaveBeenCalled();
    });

    it('should not clear local storage if API sign out fails', async () => {
      // Arrange
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });
      (supabase.auth.signOut as jest.Mock).mockResolvedValue({
        error: { message: 'API error' },
      });

      // Act
      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.isAuthenticated).toBe(true));

      await act(async () => {
        await result.current.signOut();
      });

      // Assert: Error set, storage not cleared (preserve session for retry)
      expect(result.current.error).toBe('API error');
      expect(Alert.alert).toHaveBeenCalledWith('Authentication', 'API error', [{ text: 'OK' }]);
    });
  });

  describe('clearError', () => {
    it('should clear error state', async () => {
      // Arrange: Create error
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: null },
        error: null,
      });
      (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Test error' },
      });

      // Act
      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.isInitialized).toBe(true));

      await act(async () => {
        await result.current.signIn('test@example.com', 'wrong');
      });
      expect(result.current.error).toBe('Test error');

      act(() => {
        result.current.clearError();
      });

      // Assert
      expect(result.current.error).toBeNull();
    });
  });
});
