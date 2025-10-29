/**
 * AIFoodScanService Error Path Tests
 * Tests P0 fix error handling for AI food scanning
 */

import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { AIFoodScanService } from '../AIFoodScanService';
import { apiInterceptor } from '../../utils/api-interceptor';

// Mock expo modules
jest.mock('expo-image-picker');
jest.mock('expo-file-system');
jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  Alert: {
    alert: jest.fn(),
  },
}));

jest.mock('../../utils/api-interceptor', () => ({
  apiInterceptor: {
    instrumentRequest: jest.fn(),
  },
}));

describe('AIFoodScanService Error Handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
    // Set API key for tests (unless explicitly testing missing key)
    process.env.EXPO_PUBLIC_OPENAI_API_KEY = 'test-api-key-12345';
  });

  describe('Camera Permission Handling', () => {
    it('should handle denied camera permission', async () => {
      // Arrange
      (ImagePicker.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'denied',
        granted: false,
      });

      // Act
      const result = await AIFoodScanService.requestCameraPermission();

      // Assert
      expect(result).toBe(false);
      expect(Alert.alert).toHaveBeenCalledWith(
        'Camera Permission',
        'Please enable camera access in your device settings to scan food items.',
        [{ text: 'OK' }]
      );
    });

    it('should return true on granted camera permission', async () => {
      // Arrange
      (ImagePicker.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
        granted: true,
      });

      // Act
      const result = await AIFoodScanService.requestCameraPermission();

      // Assert
      expect(result).toBe(true);
      expect(Alert.alert).not.toHaveBeenCalled();
    });
  });

  describe('Photo Taking Error Handling', () => {
    it('should handle cancelled photo capture', async () => {
      // Arrange
      (ImagePicker.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });
      (ImagePicker.launchCameraAsync as jest.Mock).mockResolvedValue({
        canceled: true,
      });

      // Act
      const result = await AIFoodScanService.takePhoto();

      // Assert
      expect(result).toBeNull();
    });

    it('should handle camera launch error', async () => {
      // Arrange
      (ImagePicker.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });
      (ImagePicker.launchCameraAsync as jest.Mock).mockRejectedValue(
        new Error('Camera not available')
      );

      // Act
      const result = await AIFoodScanService.takePhoto();

      // Assert
      expect(result).toBeNull();
      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        'Failed to take photo. Please try again.',
        [{ text: 'OK' }]
      );
    });

    it('should return URI on successful photo capture', async () => {
      // Arrange
      (ImagePicker.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });
      (ImagePicker.launchCameraAsync as jest.Mock).mockResolvedValue({
        canceled: false,
        assets: [{ uri: 'file://test-photo.jpg' }],
      });

      // Act
      const result = await AIFoodScanService.takePhoto();

      // Assert
      expect(result).toBe('file://test-photo.jpg');
    });
  });

  describe('Gallery Selection Error Handling', () => {
    it('should handle denied media library permission', async () => {
      // Arrange
      (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'denied',
        granted: false,
      });

      // Act
      const result = await AIFoodScanService.pickPhoto();

      // Assert
      expect(result).toBeNull();
      expect(Alert.alert).toHaveBeenCalledWith(
        'Photos Permission',
        'Please enable photo library access to select food photos.',
        [{ text: 'OK' }]
      );
    });

    it('should handle cancelled gallery selection', async () => {
      // Arrange
      (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });
      (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
        canceled: true,
      });

      // Act
      const result = await AIFoodScanService.pickPhoto();

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('Image URI to Base64 Conversion', () => {
    it('should handle invalid file URI', async () => {
      // Arrange
      (FileSystem.readAsStringAsync as jest.Mock).mockRejectedValue(
        new Error('File not found')
      );

      // Mock fetch to not be called since we expect early rejection
      (global.fetch as jest.Mock).mockClear();

      // Act
      const result = await AIFoodScanService.analyzeFoodImage('file://invalid.jpg');

      // Assert - File read error throws and returns null with error alert
      expect(result).toBeNull();
      expect(Alert.alert).toHaveBeenCalledWith(
        'Analysis Error',
        'Could not analyze the image. Please try manual entry or try again.',
        [{ text: 'OK' }]
      );
      // Fetch should not be called when file read fails
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should handle data URI format', async () => {
      // Arrange
      const dataUri = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';
      (apiInterceptor.instrumentRequest as jest.Mock).mockImplementation(
        async (path, method, fn) => fn()
      );
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  name: 'Test Food',
                  serving: '1 cup',
                  calories: 100,
                  protein: 5,
                  carbs: 20,
                  fat: 2,
                }),
              },
            },
          ],
        }),
      });

      // Act
      const result = await AIFoodScanService.analyzeFoodImage(dataUri);

      // Assert - Data URI should be processed successfully
      expect(result).toBeTruthy();
      expect(result?.name).toBe('Test Food');
      expect(result?.calories).toBe(100);
    });
  });

  describe('OpenAI API Error Handling', () => {
    beforeEach(() => {
      (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue('base64imagedata');
      (apiInterceptor.instrumentRequest as jest.Mock).mockImplementation(
        async (path, method, fn) => fn()
      );
    });

    it('should handle malformed JSON response', async () => {
      // Arrange
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: '{invalid json' } }],
        }),
      });

      // Act
      const result = await AIFoodScanService.analyzeFoodImage('file://test.jpg');

      // Assert: Should fall back to estimate
      expect(result).toBeTruthy();
      expect(result?.name).toBe('Food Item');
      expect(result?.confidence).toBe(0.5);
    });

    it('should handle OpenAI API timeout', async () => {
      // Arrange
      (apiInterceptor.instrumentRequest as jest.Mock).mockRejectedValue(
        new Error('Request timeout')
      );

      // Act
      const result = await AIFoodScanService.analyzeFoodImage('file://test.jpg');

      // Assert - Network timeout returns null with error alert
      expect(result).toBeNull();
      expect(Alert.alert).toHaveBeenCalledWith(
        'Analysis Error',
        'Could not analyze the image. Please try manual entry or try again.',
        [{ text: 'OK' }]
      );
    });

    it('should handle 429 rate limit error', async () => {
      // Arrange
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 429,
        text: async () => 'Rate limit exceeded',
      });

      // Act
      const result = await AIFoodScanService.analyzeFoodImage('file://test.jpg');

      // Assert - Rate limit returns estimate with alert
      expect(result).toBeTruthy(); // Returns estimate
      expect(Alert.alert).toHaveBeenCalledWith(
        'Rate Limit',
        'API rate limit reached. Please try again later.',
        [{ text: 'OK' }]
      );
      expect(result?.confidence).toBe(0.5); // Estimate confidence
    });

    it('should handle 401 unauthorized error', async () => {
      // Arrange
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized',
      });

      // Act
      const result = await AIFoodScanService.analyzeFoodImage('file://test.jpg');

      // Assert - Unauthorized returns estimate with alert
      expect(result).toBeTruthy(); // Returns estimate
      expect(Alert.alert).toHaveBeenCalledWith(
        'API Error',
        'Invalid API key. Please check your configuration.',
        [{ text: 'OK' }]
      );
    });

    it('should handle missing API key', async () => {
      // Arrange: Test with empty API key (already in implementation)
      const originalEnv = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
      process.env.EXPO_PUBLIC_OPENAI_API_KEY = '';

      // Act
      const result = await AIFoodScanService.analyzeFoodImage('file://test.jpg');

      // Assert
      expect(result).toBeTruthy(); // Returns estimate
      expect(Alert.alert).toHaveBeenCalledWith(
        'AI Vision Not Configured',
        'OpenAI API key is not configured. Using nutritional estimate instead.',
        [{ text: 'OK' }]
      );

      // Cleanup
      process.env.EXPO_PUBLIC_OPENAI_API_KEY = originalEnv;
    });

    it('should handle missing nutrition data in response', async () => {
      // Arrange
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  name: 'Test Food',
                  // Missing calories and other nutrition
                }),
              },
            },
          ],
        }),
      });

      // Act
      const result = await AIFoodScanService.analyzeFoodImage('file://test.jpg');

      // Assert: Should fall back to estimate
      expect(result).toBeTruthy();
      expect(result?.name).toBe('Food Item');
      expect(result?.confidence).toBe(0.5);
    });

    it('should handle empty AI response content', async () => {
      // Arrange
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: '' } }],
        }),
      });

      // Act
      const result = await AIFoodScanService.analyzeFoodImage('file://test.jpg');

      // Assert
      expect(result).toBeTruthy();
      expect(result?.name).toBe('Food Item');
    });

    it('should handle malformed AI response structure', async () => {
      // Arrange
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [], // Empty choices array
        }),
      });

      // Act
      const result = await AIFoodScanService.analyzeFoodImage('file://test.jpg');

      // Assert
      expect(result).toBeTruthy();
      expect(result?.confidence).toBe(0.5);
    });
  });

  describe('Text Parsing Fallback', () => {
    beforeEach(() => {
      (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue('base64imagedata');
      (apiInterceptor.instrumentRequest as jest.Mock).mockImplementation(
        async (path, method, fn) => fn()
      );
    });

    it('should parse text format response when JSON fails', async () => {
      // Arrange: Non-JSON response
      const textResponse = `
        Name: Chicken Breast
        Serving: 100g
        Calories: 165
        Protein: 31g
        Carbs: 0g
        Fat: 3.6g
      `;
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: textResponse } }],
        }),
      });

      // Act
      const result = await AIFoodScanService.analyzeFoodImage('file://test.jpg');

      // Assert - Text parsing extracts nutrition info
      expect(result).toBeTruthy();
      expect(result?.name).toBe('Chicken Breast');
      expect(result?.serving).toBe('100g');
      expect(result?.calories).toBe(165);
      expect(result?.protein).toBe(31);
      expect(result?.confidence).toBe(0.75); // Text parsing confidence
    });

    it('should handle text format with missing fields', async () => {
      // Arrange
      const textResponse = `Name: Apple\nCalories: 95`;
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: textResponse } }],
        }),
      });

      // Act
      const result = await AIFoodScanService.analyzeFoodImage('file://test.jpg');

      // Assert
      expect(result).toBeTruthy();
      expect(result?.name).toBe('Apple');
      expect(result?.calories).toBe(95);
      expect(result?.serving).toBe('1 serving'); // Default
    });

    it('should handle text format with zero calories', async () => {
      // Arrange
      const textResponse = `Name: Water\nCalories: 0`;
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: textResponse } }],
        }),
      });

      // Act
      const result = await AIFoodScanService.analyzeFoodImage('file://test.jpg');

      // Assert: Zero calories should fall back to estimate
      expect(result).toBeTruthy();
      expect(result?.name).toBe('Food Item');
      expect(result?.confidence).toBe(0.5);
    });
  });

  describe('Successful Parsing', () => {
    beforeEach(() => {
      (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue('base64imagedata');
      (apiInterceptor.instrumentRequest as jest.Mock).mockImplementation(
        async (path, method, fn) => fn()
      );
    });

    it('should parse valid JSON response', async () => {
      // Arrange
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  name: 'Grilled Salmon',
                  serving: '6 oz',
                  calories: 350,
                  protein: 40,
                  carbs: 0,
                  fat: 20,
                  fiber: 0,
                  confidence: 0.95,
                }),
              },
            },
          ],
        }),
      });

      // Act
      const result = await AIFoodScanService.analyzeFoodImage('file://test.jpg');

      // Assert
      expect(result).toEqual({
        name: 'Grilled Salmon',
        serving: '6 oz',
        calories: 350,
        protein: 40,
        carbs: 0,
        fat: 20,
        fiber: 0,
        confidence: 0.95,
      });
    });

    it('should handle alternative field names in JSON', async () => {
      // Arrange: Test with food_name, carbohydrates
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  food_name: 'Brown Rice',
                  serving_size: '1 cup',
                  calories: 216,
                  protein: 5,
                  carbohydrates: 45,
                  fat: 2,
                }),
              },
            },
          ],
        }),
      });

      // Act
      const result = await AIFoodScanService.analyzeFoodImage('file://test.jpg');

      // Assert
      expect(result?.name).toBe('Brown Rice');
      expect(result?.serving).toBe('1 cup');
      expect(result?.carbs).toBe(45);
    });
  });

  describe('Full Workflow Tests', () => {
    it('should return null if takePhoto returns null', async () => {
      // Arrange
      (ImagePicker.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'denied',
      });

      // Act
      const result = await AIFoodScanService.scanFood();

      // Assert
      expect(result).toBeNull();
    });

    it('should return estimate if analysis fails', async () => {
      // Arrange
      (ImagePicker.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });
      (ImagePicker.launchCameraAsync as jest.Mock).mockResolvedValue({
        canceled: false,
        assets: [{ uri: 'file://test.jpg' }],
      });
      (FileSystem.readAsStringAsync as jest.Mock).mockRejectedValue(new Error('File error'));

      // Act
      const result = await AIFoodScanService.scanFood();

      // Assert - Service gracefully degrades to estimate
      expect(result).toBeTruthy();
      expect(result?.name).toBe('Food Item');
      expect(result?.confidence).toBe(0.5);
    });

    it('should return food entry on successful scan', async () => {
      // Arrange
      (ImagePicker.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });
      (ImagePicker.launchCameraAsync as jest.Mock).mockResolvedValue({
        canceled: false,
        assets: [{ uri: 'file://test.jpg' }],
      });
      (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue('base64data');
      (apiInterceptor.instrumentRequest as jest.Mock).mockImplementation(
        async (path, method, fn) => fn()
      );
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  name: 'Pizza',
                  serving: '2 slices',
                  calories: 540,
                  protein: 20,
                  carbs: 60,
                  fat: 22,
                }),
              },
            },
          ],
        }),
      });

      // Act
      const result = await AIFoodScanService.scanFood();

      // Assert
      expect(result).toBeTruthy();
      expect(result?.name).toBe('Pizza');
      expect(result?.calories).toBe(540);
    });
  });
});
