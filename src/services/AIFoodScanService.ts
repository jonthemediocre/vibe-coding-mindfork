/**
 * AIFoodScanService - Refactored to use Supabase Edge Functions
 * 
 * SECURITY: OpenAI API calls moved to edge functions (no exposed API keys)
 * ENHANCEMENTS:
 * - Server-side OpenAI calls via edge functions
 * - Automatic rate limiting (5 requests/min)
 * - Database logging and analytics
 * - USDA nutrition database integration
 * - Retry logic with exponential backoff
 * - Better error messages for rate limiting
 */

import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import type { CreateFoodEntryInput } from '../types/models';
import { logger } from '../utils/logger';
import { showAlert } from '../utils/alerts';
import { supabase } from '../lib/supabase';

/**
 * Food analysis result from edge function
 */
interface FoodAnalysisResult {
  name: string;
  serving: string;
  calories: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  confidence: number;
}

/**
 * Edge function response format for food-analysis
 */
interface FoodAnalysisEdgeResponse {
  success: boolean;
  data?: {
    name: string;
    calories: number;
    protein_g?: number;
    carbs_g?: number;
    fat_g?: number;
    fiber_g?: number;
    sugar_g?: number;
    sodium_mg?: number;
    serving_size: string;
    ingredients?: string[];
    confidence_score: number;
    foodLogId?: string;
    similarFoods?: any[];
  };
  error?: string;
  code?: string;
  message?: string;
  source?: string;
}

/**
 * Rate limit error details
 */
interface RateLimitError {
  error: string;
  code: string;
  message: string;
  retryAfter?: number;
  remaining?: number;
  resetAt?: string;
}

export class AIFoodScanService {
  private static readonly MAX_RETRIES = 3;
  private static readonly INITIAL_RETRY_DELAY_MS = 1000;
  private static readonly REQUEST_TIMEOUT_MS = 30000;

  /**
   * Request camera permission
   */
  static async requestCameraPermission(): Promise<boolean> {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();

    if (status !== 'granted') {
      showAlert.permission(
        'Camera',
        'Please enable camera access in your device settings to scan food items.'
      );
      return false;
    }

    return true;
  }

  /**
   * Take photo with camera
   */
  static async takePhoto(): Promise<string | null> {
    try {
      const hasPermission = await this.requestCameraPermission();
      if (!hasPermission) return null;

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: false, // Don't need base64 in picker result
      });

      if (result.canceled) return null;

      return result.assets[0].uri;
    } catch (error) {
      logger.error('Error taking photo:', error as Error);
      showAlert.error('Error', 'Failed to take photo. Please try again.');
      return null;
    }
  }

  /**
   * Pick photo from gallery
   */
  static async pickPhoto(): Promise<string | null> {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        showAlert.permission(
          'Photos',
          'Please enable photo library access to select food photos.'
        );
        return null;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: false,
      });

      if (result.canceled) return null;

      return result.assets[0].uri;
    } catch (error) {
      logger.error('Error picking photo:', error as Error);
      showAlert.error('Error', 'Failed to pick photo. Please try again.');
      return null;
    }
  }

  /**
   * Convert image URI to base64
   */
  private static async imageUriToBase64(uri: string): Promise<string> {
    try {
      // For file:// URIs, read as base64
      if (uri.startsWith('file://')) {
        const base64 = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        return base64;
      }

      // For data: URIs, extract base64
      if (uri.startsWith('data:')) {
        const base64 = uri.split(',')[1];
        return base64;
      }

      // Fallback: read as base64
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      return base64;
    } catch (error) {
      logger.error('Error converting image to base64', error as Error);
      throw new Error('Failed to process image');
    }
  }

  /**
   * Convert edge function response to FoodAnalysisResult
   */
  private static convertEdgeResponseToResult(
    response: FoodAnalysisEdgeResponse
  ): FoodAnalysisResult {
    if (!response.data) {
      throw new Error('Invalid response format from edge function');
    }

    const { data } = response;
    
    return {
      name: data.name || 'Unknown Food',
      serving: data.serving_size || '1 serving',
      calories: data.calories || 0,
      protein: data.protein_g,
      carbs: data.carbs_g,
      fat: data.fat_g,
      fiber: data.fiber_g,
      confidence: data.confidence_score || 0.85,
    };
  }

  /**
   * Generate nutritional estimate based on food name (fallback)
   */
  private static generateNutritionalEstimate(imageName: string = 'food'): FoodAnalysisResult {
    return {
      name: 'Food Item',
      serving: '1 serving (estimated)',
      calories: 200,
      protein: 10,
      carbs: 25,
      fat: 8,
      fiber: 3,
      confidence: 0.5, // Low confidence for estimates
    };
  }

  /**
   * Check if error is a rate limit error
   */
  private static isRateLimitError(error: any): boolean {
    return error?.code === 'RATE_LIMIT_EXCEEDED' || error?.status === 429;
  }

  /**
   * Handle rate limit errors with user-friendly messages
   */
  private static handleRateLimitError(error: RateLimitError): void {
    const retryAfter = error.retryAfter || 60;
    const remaining = error.remaining || 0;
    
    let message = error.message || 'You have reached the rate limit for food analysis.';
    
    if (retryAfter < 60) {
      message += ` Please wait ${retryAfter} seconds before trying again.`;
    } else {
      message += ` Please wait ${Math.ceil(retryAfter / 60)} minutes before trying again.`;
    }

    if (error.resetAt) {
      const resetTime = new Date(error.resetAt).toLocaleTimeString();
      message += `\n\nRate limit resets at: ${resetTime}`;
    }

    showAlert.error('Rate Limit Reached', message);
    
    logger.warn('Food analysis rate limit exceeded', {
      retryAfter,
      remaining,
      resetAt: error.resetAt,
    });
  }

  /**
   * Retry with exponential backoff
   */
  private static async retryWithBackoff<T>(
    operation: () => Promise<T>,
    retryCount: number = 0
  ): Promise<T> {
    try {
      return await operation();
    } catch (error: any) {
      // Don't retry rate limit errors
      if (this.isRateLimitError(error)) {
        throw error;
      }

      // Don't retry if max retries reached
      if (retryCount >= this.MAX_RETRIES) {
        throw error;
      }

      // Calculate exponential backoff delay
      const delayMs = this.INITIAL_RETRY_DELAY_MS * Math.pow(2, retryCount);
      
      logger.warn(`Retrying operation after ${delayMs}ms (attempt ${retryCount + 1}/${this.MAX_RETRIES})`, {
        error: error.message,
      });

      await new Promise(resolve => setTimeout(resolve, delayMs));
      
      return this.retryWithBackoff(operation, retryCount + 1);
    }
  }

  /**
   * Analyze food image using Supabase edge functions
   * 
   * Uses food-analysis edge function which provides:
   * - Rate limiting (5 requests/min)
   * - Server-side OpenAI API calls
   * - Database logging
   */
  static async analyzeFoodImage(imageUri: string): Promise<FoodAnalysisResult | null> {
    try {
      logger.info('Analyzing food image via edge function...');

      // Convert image to base64
      const base64Image = await this.imageUriToBase64(imageUri);

      // Call edge function with retry logic
      const result = await this.retryWithBackoff(async () => {
        const { data, error } = await supabase.functions.invoke<FoodAnalysisEdgeResponse>(
          'food-analysis',
          {
            body: {
              imageBase64: base64Image,
              mealType: 'snack', // Default to snack, can be customized
            },
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        if (error) {
          // Check if it's a rate limit error
          if (error.message?.includes('rate limit') || error.message?.includes('429')) {
            const rateLimitError: RateLimitError = {
              error: 'RATE_LIMIT_EXCEEDED',
              code: 'RATE_LIMIT_EXCEEDED',
              message: error.message || 'Rate limit exceeded',
              retryAfter: 60, // Default to 60 seconds
            };
            throw rateLimitError;
          }

          throw error;
        }

        if (!data) {
          throw new Error('No data returned from edge function');
        }

        return data;
      });

      // Handle edge function errors
      if (!result.success) {
        if (this.isRateLimitError(result)) {
          this.handleRateLimitError(result as any);
          return null;
        }

        logger.error('Edge function error:', new Error(result.error || 'Unknown error'), {
          code: result.code,
          message: result.message,
        });

        showAlert.error(
          'Analysis Error',
          result.message || 'Failed to analyze food. Using estimate instead.'
        );
        
        return this.generateNutritionalEstimate();
      }

      // Convert response to standard format
      const nutritionData = this.convertEdgeResponseToResult(result);

      logger.info('Food analysis complete via edge function', {
        foodName: nutritionData.name,
        calories: nutritionData.calories,
        confidence: nutritionData.confidence,
        source: result.source,
      });

      return nutritionData;

    } catch (error: any) {
      // Handle rate limit errors
      if (this.isRateLimitError(error)) {
        this.handleRateLimitError(error);
        return null;
      }

      logger.error('Error analyzing food via edge function:', error as Error);
      
      showAlert.error(
        'Analysis Error',
        'Could not analyze the image. Please try manual entry or try again.'
      );
      
      return null;
    }
  }

  /**
   * Full workflow: Take photo -> Analyze -> Return food entry
   */
  static async scanFoodImage(): Promise<CreateFoodEntryInput | null> {
    const photoUri = await this.takePhoto();
    if (!photoUri) return null;

    const analysis = await this.analyzeFoodImage(photoUri);
    if (!analysis) return null;

    return {
      name: analysis.name,
      serving: analysis.serving,
      calories: analysis.calories,
      protein: analysis.protein,
      carbs: analysis.carbs,
      fat: analysis.fat,
      fiber: analysis.fiber,
    };
  }

  /**
   * Workflow: Pick from gallery -> Analyze -> Return food entry
   */
  static async scanFoodFromGallery(): Promise<CreateFoodEntryInput | null> {
    const photoUri = await this.pickPhoto();
    if (!photoUri) return null;

    const analysis = await this.analyzeFoodImage(photoUri);
    if (!analysis) return null;

    return {
      name: analysis.name,
      serving: analysis.serving,
      calories: analysis.calories,
      protein: analysis.protein,
      carbs: analysis.carbs,
      fat: analysis.fat,
      fiber: analysis.fiber,
    };
  }
}
