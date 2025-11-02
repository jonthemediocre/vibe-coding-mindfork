/**
 * AIFoodScanService - AI-Powered Food Photo Analysis
 *
 * Uses OpenAI GPT-4 Vision to analyze food photos and extract nutritional information
 *
 * FEATURES:
 * - Direct OpenAI Vision API integration
 * - Automatic retry logic with exponential backoff
 * - Base64 image conversion for all platforms (iOS, Android)
 * - Rate limiting handling
 * - Fallback to estimated values if analysis fails
 */

import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import type { CreateFoodEntryInput } from '../types/models';
import { logger } from '../utils/logger';
import { showAlert } from '../utils/alerts';

/**
 * Food analysis result from AI
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
  needsClarification?: boolean;
  clarificationQuestion?: string;
}

/**
 * AI response format for food analysis
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
    needs_clarification?: boolean;
    clarification_question?: string;
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
   * Convert AI response to FoodAnalysisResult
   */
  private static convertEdgeResponseToResult(
    response: FoodAnalysisEdgeResponse
  ): FoodAnalysisResult {
    if (!response.data) {
      throw new Error('Invalid response format from AI');
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
      needsClarification: data.needs_clarification || false,
      clarificationQuestion: data.clarification_question,
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
   * Analyze food image using OpenAI Vision API
   *
   * Uses GPT-4 Vision to analyze food photos and extract nutritional information
   */
  static async analyzeFoodImage(imageUri: string): Promise<FoodAnalysisResult | null> {
    try {
      logger.info('Analyzing food image with OpenAI Vision...');

      // Convert image to base64
      const base64Image = await this.imageUriToBase64(imageUri);

      // Import OpenAI client configured for OpenRouter
      const OpenAI = (await import('openai')).default;
      const openai = new OpenAI({
        apiKey: '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',
        baseURL: 'https://openrouter.ai/api/v1',
        defaultHeaders: {
          'HTTP-Referer': 'https://mindfork.app',
          'X-Title': 'MindFork',
        },
      });

      // STAGE 1: Identify all items in the image
      const itemsResult = await this.retryWithBackoff(async () => {
        const itemsResponse = await openai.chat.completions.create({
          model: 'openai/gpt-4o-2024-11-20',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `Look at this food image and list ALL distinct DISHES you can see. Use DISH NAMES (as they appear on a menu), NOT ingredient names.

IMPORTANT RULES:
- Use dish names like "hamburger", "garden salad", "chicken breast" - NOT ingredient names like "bun", "lettuce", "meat"
- "Salad" is a dish; "lettuce" is an ingredient
- "Hamburger" is a dish; "bun" and "patty" are ingredients
- "Pasta" is a dish; "noodles" and "sauce" are ingredients
- The primary_item should be the MAIN DISH, not the largest ingredient

Return ONLY valid JSON in this format:
{
  "items": ["dish1", "dish2"],
  "primary_item": "the main dish name"
}

CORRECT Examples:
- Burger with fries: {"items": ["hamburger", "french fries"], "primary_item": "hamburger"}
- Salad with toppings: {"items": ["garden salad"], "primary_item": "garden salad"}
- Plain rice: {"items": ["white rice"], "primary_item": "white rice"}
- Steak with sides: {"items": ["beef steak", "french fries", "vegetables"], "primary_item": "beef steak"}

WRONG Examples (do NOT do this):
- {"items": ["bun", "patty", "lettuce"], "primary_item": "bun"} ✗ Use "hamburger"
- {"items": ["lettuce", "tomato"], "primary_item": "lettuce"} ✗ Use "garden salad"
- {"items": ["noodles", "sauce"], "primary_item": "noodles"} ✗ Use "pasta"`
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:image/jpeg;base64,${base64Image}`,
                  },
                },
              ],
            },
          ],
          max_tokens: 200,
        });

        const content = itemsResponse.choices[0]?.message?.content;
        if (!content) {
          throw new Error('No response from Stage 1');
        }

        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error('No JSON found in Stage 1 response');
        }

        return JSON.parse(jsonMatch[0]);
      });

      logger.info('Stage 1 complete - Items identified:', itemsResult);

      const primaryItem = itemsResult.primary_item || itemsResult.items[0];
      const hasMultipleItems = itemsResult.items.length > 1;

      // STAGE 2: Analyze ONLY the primary item, explicitly ignoring others
      const result = await this.retryWithBackoff(async () => {
        const response = await openai.chat.completions.create({
          model: 'openai/gpt-4o-2024-11-20',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `In this image, you identified these items: ${itemsResult.items.join(', ')}.

Now analyze ONLY the "${primaryItem}" and completely IGNORE all other items.

CRITICAL INSTRUCTIONS:
- Estimate calories for ONLY the ${primaryItem}
- Do NOT include any other items in your calorie calculation
- Assume the ${primaryItem} is PLAIN/UNSEASONED unless obviously prepared
- Use TYPICAL RESTAURANT PORTIONS unless the image clearly shows otherwise
- If this is cooked food (like rice, pasta, meat), estimate the COOKED portion size

TYPICAL PORTIONS FOR COMMON FOODS:
- Garden salad: 2 cups mixed greens (~50-80 cal)
- Hamburger: 1 beef patty + bun (~300-400 cal)
- Pizza: 1 large slice (~250-300 cal)
- Chicken breast: 4-6 oz cooked (~165-250 cal)
- Steak: 6-8 oz cooked (~250-350 cal)
- Rice: 1 cup cooked (~200 cal)
- Pasta: 1 cup cooked (~200 cal)
- Eggs: 2 large eggs (~140-160 cal)
- Avocado: 1 whole avocado (~240 cal) or 1/2 avocado (~120 cal)

Return ONLY valid JSON in this exact format:
{
  "name": "${primaryItem}",
  "serving_size": "realistic serving size for just the ${primaryItem} (use typical portions above)",
  "calories": number (ONLY for the ${primaryItem}, use typical portions guide),
  "protein_g": number,
  "carbs_g": number,
  "fat_g": number,
  "fiber_g": number,
  "confidence_score": number (0.0 to 1.0),
  "needs_clarification": ${hasMultipleItems},
  "clarification_question": ${hasMultipleItems ? `"I see ${itemsResult.items.join(', ')}. Should I log just the ${primaryItem}, or include other items?"` : "null"}
}`
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:image/jpeg;base64,${base64Image}`,
                  },
                },
              ],
            },
          ],
          max_tokens: 500,
        });

        const content = response.choices[0]?.message?.content;
        if (!content) {
          throw new Error('No response from OpenAI');
        }

        // Parse JSON response
        try {
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (!jsonMatch) {
            throw new Error('No JSON found in response');
          }

          const parsed = JSON.parse(jsonMatch[0]);

          return {
            success: true,
            data: {
              name: parsed.name,
              serving_size: parsed.serving_size,
              calories: parsed.calories,
              protein_g: parsed.protein_g,
              carbs_g: parsed.carbs_g,
              fat_g: parsed.fat_g,
              fiber_g: parsed.fiber_g,
              confidence_score: parsed.confidence_score || 0.85,
              needs_clarification: parsed.needs_clarification || false,
              clarification_question: parsed.clarification_question || undefined,
            },
          } as FoodAnalysisEdgeResponse;
        } catch (parseError) {
          logger.error('Failed to parse OpenAI response:', parseError as Error, {
            content,
          });
          throw new Error('Invalid response format from OpenAI');
        }
      });

      // Handle errors
      if (!result.success) {
        logger.error('OpenAI analysis error:', new Error(result.error || 'Unknown error'));
        showAlert.error(
          'Analysis Error',
          result.message || 'Failed to analyze food. Using estimate instead.'
        );
        return this.generateNutritionalEstimate();
      }

      // Convert response to standard format
      const nutritionData = this.convertEdgeResponseToResult(result);

      logger.info('Food analysis complete with OpenAI Vision', {
        foodName: nutritionData.name,
        calories: nutritionData.calories,
        confidence: nutritionData.confidence,
      });

      return nutritionData;

    } catch (error: any) {
      // Handle rate limit errors
      if (this.isRateLimitError(error) || error?.status === 429) {
        this.handleRateLimitError({
          error: 'RATE_LIMIT_EXCEEDED',
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'OpenAI API rate limit exceeded. Please try again in a moment.',
          retryAfter: 60,
        });
        return null;
      }

      logger.error('Error analyzing food with OpenAI:', error as Error);

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
