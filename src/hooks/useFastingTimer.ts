import { useState, useEffect, useCallback } from 'react';
import { FastingService } from '../services';
import { useAuth } from '../contexts/AuthContext';
import type { FastingSession } from '../types/models';

export interface UseFastingTimerResult {
  activeSession: FastingSession | null;
  isLoading: boolean;
  error: string | null;
  elapsedHours: number;
  progress: number; // 0-100
  startFasting: (targetHours: number) => Promise<boolean>;
  endFasting: () => Promise<boolean>;
  cancelFasting: () => Promise<boolean>;
  refreshSession: () => Promise<void>;
  clearError: () => void;
}

export const useFastingTimer = (): UseFastingTimerResult => {
  const { user } = useAuth();
  const [activeSession, setActiveSession] = useState<FastingSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [elapsedHours, setElapsedHours] = useState(0);
  const [progress, setProgress] = useState(0);

  const loadActiveSession = useCallback(async () => {
    if (!user?.id) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await FastingService.getActiveFastingSession(user.id);

      if (response.error) {
        setError(response.error);
      } else {
        setActiveSession(response.data || null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load fasting session');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  // Calculate elapsed time
  useEffect(() => {
    if (!activeSession) {
      setElapsedHours(0);
      setProgress(0);
      return;
    }

    const updateElapsed = () => {
      const startTime = new Date(activeSession.start_time).getTime();
      const now = Date.now();
      const elapsed = (now - startTime) / (1000 * 60 * 60);
      setElapsedHours(elapsed);

      const targetHours = activeSession.target_duration_hours;
      const calculatedProgress = Math.min((elapsed / targetHours) * 100, 100);
      setProgress(calculatedProgress);
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000 * 60); // Update every minute

    return () => clearInterval(interval);
  }, [activeSession]);

  useEffect(() => {
    loadActiveSession();
  }, [loadActiveSession]);

  const startFasting = useCallback(
    async (targetHours: number): Promise<boolean> => {
      if (!user?.id) {
        setError('User not authenticated');
        return false;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await FastingService.startFasting(user.id, {
          target_duration_hours: targetHours,
        });

        if (response.error) {
          setError(response.error);
          return false;
        }

        setActiveSession(response.data || null);
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to start fasting');
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [user?.id]
  );

  const endFasting = useCallback(async (): Promise<boolean> => {
    if (!user?.id || !activeSession?.id) {
      setError('No active fasting session');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await FastingService.endFasting(user.id, {
        session_id: activeSession.id,
      });

      if (response.error) {
        setError(response.error);
        return false;
      }

      setActiveSession(null);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to end fasting');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, activeSession?.id]);

  const cancelFasting = useCallback(async (): Promise<boolean> => {
    if (!user?.id || !activeSession?.id) {
      setError('No active fasting session');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await FastingService.cancelFasting(user.id, activeSession.id);

      if (response.error) {
        setError(response.error);
        return false;
      }

      setActiveSession(null);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel fasting');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, activeSession?.id]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    activeSession,
    isLoading,
    error,
    elapsedHours,
    progress,
    startFasting,
    endFasting,
    cancelFasting,
    refreshSession: loadActiveSession,
    clearError,
  };
};
