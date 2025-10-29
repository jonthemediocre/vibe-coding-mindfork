import { useState, useEffect, useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import { Pedometer } from 'expo-sensors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../contexts/AuthContext';
import { StepTrackingService } from '../services/StepTrackingService';

export interface UseStepCounterResult {
  steps: number;
  dailyGoal: number;
  progress: number; // 0-100
  caloriesBurned: number;
  permissionStatus: 'granted' | 'denied' | 'undetermined';
  isLoading: boolean;
  error: string | null;
  requestPermission: () => Promise<boolean>;
  resetSteps: () => void;
  saveTodaySteps: () => Promise<void>;
}

const STORAGE_KEYS = {
  STEPS_DATE: '@step_counter_date',
  STEPS_COUNT: '@step_counter_count',
  DAILY_GOAL: '@step_counter_goal',
};

const DEFAULT_DAILY_GOAL = 10000; // WHO recommendation
const CALORIES_PER_STEP = 0.04; // Average for 150lb person
const AVERAGE_WEIGHT_LBS = 150;

/**
 * Hook for tracking daily steps using device pedometer
 * - Requests permissions on iOS/Android
 * - Tracks steps throughout the day
 * - Resets at midnight
 * - Calculates calories burned
 * - Persists data to Supabase
 */
export const useStepCounter = (): UseStepCounterResult => {
  const { user } = useAuth();
  const [steps, setSteps] = useState(0);
  const [dailyGoal, setDailyGoal] = useState(DEFAULT_DAILY_GOAL);
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'undetermined'>('undetermined');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const pedometerSubscription = useRef<any>(null);
  const lastSaveDate = useRef<string | null>(null);

  /**
   * Calculate calories burned from steps
   * Formula: steps × 0.04 (adjustable by weight)
   */
  const calculateCalories = useCallback((stepCount: number): number => {
    // TODO: Get user weight from profile for more accurate calculation
    // For now, use average weight
    return Math.round(stepCount * CALORIES_PER_STEP);
  }, []);

  /**
   * Check if Pedometer is available on device
   */
  const checkPedometerAvailability = useCallback(async (): Promise<boolean> => {
    try {
      const isAvailable = await Pedometer.isAvailableAsync();
      if (!isAvailable) {
        setError('Pedometer not available on this device');
        setIsLoading(false);
      }
      return isAvailable;
    } catch (err) {
      setError('Failed to check pedometer availability');
      setIsLoading(false);
      return false;
    }
  }, []);

  /**
   * Request pedometer permissions
   */
  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      const { status } = await Pedometer.requestPermissionsAsync();

      if (status === 'granted') {
        setPermissionStatus('granted');
        setError(null);
        return true;
      } else {
        setPermissionStatus('denied');
        setError('Step tracking permission denied. Please enable in settings.');
        return false;
      }
    } catch (err) {
      setError('Failed to request permissions');
      setPermissionStatus('denied');
      return false;
    }
  }, []);

  /**
   * Load today's steps from AsyncStorage
   */
  const loadTodaySteps = useCallback(async (): Promise<number> => {
    try {
      const today = new Date().toDateString();
      const storedDate = await AsyncStorage.getItem(STORAGE_KEYS.STEPS_DATE);

      // Check if we need to reset (new day)
      if (storedDate !== today) {
        // Save yesterday's data if exists
        if (storedDate && user?.id) {
          const yesterdaySteps = await AsyncStorage.getItem(STORAGE_KEYS.STEPS_COUNT);
          if (yesterdaySteps) {
            const stepCount = parseInt(yesterdaySteps, 10);
            await StepTrackingService.saveSteps(
              user.id,
              stepCount,
              calculateCalories(stepCount),
              new Date(storedDate)
            );
          }
        }

        // Reset for new day
        await AsyncStorage.setItem(STORAGE_KEYS.STEPS_DATE, today);
        await AsyncStorage.setItem(STORAGE_KEYS.STEPS_COUNT, '0');
        return 0;
      }

      const storedSteps = await AsyncStorage.getItem(STORAGE_KEYS.STEPS_COUNT);
      return storedSteps ? parseInt(storedSteps, 10) : 0;
    } catch (err) {
      console.error('Error loading steps:', err);
      return 0;
    }
  }, [user?.id, calculateCalories]);

  /**
   * Save steps to AsyncStorage
   */
  const saveStepsLocally = useCallback(async (stepCount: number) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.STEPS_COUNT, stepCount.toString());
    } catch (err) {
      console.error('Error saving steps locally:', err);
    }
  }, []);

  /**
   * Save today's steps to Supabase
   */
  const saveTodaySteps = useCallback(async () => {
    if (!user?.id) return;

    try {
      const today = new Date().toDateString();

      // Avoid duplicate saves on same day
      if (lastSaveDate.current === today) {
        return;
      }

      const response = await StepTrackingService.saveSteps(
        user.id,
        steps,
        calculateCalories(steps)
      );

      if (!response.error) {
        lastSaveDate.current = today;
      }
    } catch (err) {
      console.error('Error saving steps to Supabase:', err);
    }
  }, [user?.id, steps, calculateCalories]);

  /**
   * Subscribe to step updates from Pedometer
   */
  const subscribeToPedometer = useCallback(async () => {
    try {
      const isAvailable = await checkPedometerAvailability();
      if (!isAvailable) return;

      // Check permissions
      const { status } = await Pedometer.getPermissionsAsync();
      if (status !== 'granted') {
        setPermissionStatus('denied');
        setIsLoading(false);
        return;
      }

      setPermissionStatus('granted');

      // Get today's start time (midnight)
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      // Load any stored steps first
      const storedSteps = await loadTodaySteps();
      setSteps(storedSteps);

      // Subscribe to step updates
      pedometerSubscription.current = Pedometer.watchStepCount((result) => {
        const totalSteps = storedSteps + result.steps;
        setSteps(totalSteps);
        saveStepsLocally(totalSteps);
      });

      setIsLoading(false);
    } catch (err) {
      console.error('Error subscribing to pedometer:', err);
      setError('Failed to start step tracking');
      setIsLoading(false);
    }
  }, [checkPedometerAvailability, loadTodaySteps, saveStepsLocally]);

  /**
   * Reset steps to 0 (for testing)
   */
  const resetSteps = useCallback(() => {
    setSteps(0);
    saveStepsLocally(0);
  }, [saveStepsLocally]);

  /**
   * Load user's daily step goal from profile or storage
   */
  const loadDailyGoal = useCallback(async () => {
    try {
      const storedGoal = await AsyncStorage.getItem(STORAGE_KEYS.DAILY_GOAL);
      if (storedGoal) {
        setDailyGoal(parseInt(storedGoal, 10));
      } else {
        setDailyGoal(DEFAULT_DAILY_GOAL);
      }
    } catch (err) {
      setDailyGoal(DEFAULT_DAILY_GOAL);
    }
  }, []);

  /**
   * Initialize step counter
   */
  useEffect(() => {
    loadDailyGoal();
    subscribeToPedometer();

    return () => {
      if (pedometerSubscription.current) {
        pedometerSubscription.current.remove();
      }
    };
  }, [loadDailyGoal, subscribeToPedometer]);

  /**
   * Auto-save steps periodically (every 5 minutes)
   */
  useEffect(() => {
    if (!user?.id || permissionStatus !== 'granted') return;

    const interval = setInterval(() => {
      saveTodaySteps();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [user?.id, permissionStatus, saveTodaySteps]);

  /**
   * Save steps when app goes to background
   */
  useEffect(() => {
    // Save on unmount (app closing/backgrounding)
    return () => {
      if (steps > 0 && user?.id) {
        saveTodaySteps();
      }
    };
  }, [steps, user?.id, saveTodaySteps]);

  const progress = dailyGoal > 0 ? Math.min((steps / dailyGoal) * 100, 100) : 0;
  const caloriesBurned = calculateCalories(steps);

  return {
    steps,
    dailyGoal,
    progress,
    caloriesBurned,
    permissionStatus,
    isLoading,
    error,
    requestPermission,
    resetSteps,
    saveTodaySteps,
  };
};
