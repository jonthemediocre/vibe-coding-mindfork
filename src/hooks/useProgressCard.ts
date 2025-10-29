/**
 * useProgressCard - Hook for generating shareable progress cards
 *
 * Features:
 * - Generates progress card with user data
 * - Converts card to image for sharing
 * - Multiple card templates
 */

import { useCallback, useState } from 'react';
import { captureRef } from 'react-native-view-shot';
import * as FileSystem from 'expo-file-system';
import type { DailyStats, Goal, FastingSession } from '../types/models';

export type CardTemplate = 'simple' | 'detailed' | 'motivational';

export interface ProgressCardData {
  dailyStats: DailyStats | null;
  goals: Goal[];
  activeGoals: Goal[];
  totalProgress: number;
  fastingSession: FastingSession | null;
  elapsedHours: number;
  userName?: string;
}

export interface UseProgressCardResult {
  isGenerating: boolean;
  error: string | null;
  generateImage: (viewRef: any, template: CardTemplate) => Promise<string | null>;
  clearError: () => void;
}

export const useProgressCard = (): UseProgressCardResult => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateImage = useCallback(
    async (viewRef: any, template: CardTemplate): Promise<string | null> => {
      setIsGenerating(true);
      setError(null);

      try {
        if (!viewRef || !viewRef.current) {
          throw new Error('View reference is not available');
        }

        // Capture the view as an image
        const uri = await captureRef(viewRef, {
          format: 'png',
          quality: 1.0,
          result: 'tmpfile',
        });

        // Verify the file exists
        const fileInfo = await FileSystem.getInfoAsync(uri);
        if (!fileInfo.exists) {
          throw new Error('Failed to generate image file');
        }

        return uri;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to generate card image';
        setError(errorMessage);
        return null;
      } finally {
        setIsGenerating(false);
      }
    },
    []
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isGenerating,
    error,
    generateImage,
    clearError,
  };
};
