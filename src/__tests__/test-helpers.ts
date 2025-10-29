/**
 * Test Utilities for P0 Fixes
 * Comprehensive mocking utilities for external APIs and services
 */

import type { Session, User as SupabaseUser } from '@supabase/supabase-js';

/**
 * Mock Supabase Session Generator
 */
export const createMockSession = (overrides?: Partial<Session>): Session => ({
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
  expires_in: 3600,
  token_type: 'bearer',
  user: createMockSupabaseUser(),
  ...overrides,
});

/**
 * Mock Supabase User Generator
 */
export const createMockSupabaseUser = (overrides?: Partial<SupabaseUser>): SupabaseUser => ({
  id: 'user-123',
  email: 'test@example.com',
  aud: 'authenticated',
  role: 'authenticated',
  created_at: '2024-01-01T00:00:00Z',
  app_metadata: {},
  user_metadata: { name: 'Test User' },
  ...overrides,
});

/**
 * Mock OpenAI Vision API Response
 */
export const createMockOpenAIResponse = (content: any) => ({
  ok: true,
  status: 200,
  json: async () => ({
    id: 'chatcmpl-mock',
    object: 'chat.completion',
    created: Date.now(),
    model: 'gpt-4-vision-preview',
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant',
          content: typeof content === 'string' ? content : JSON.stringify(content),
        },
        finish_reason: 'stop',
      },
    ],
    usage: {
      prompt_tokens: 100,
      completion_tokens: 50,
      total_tokens: 150,
    },
  }),
});

/**
 * Mock OpenAI Error Response
 */
export const createMockOpenAIError = (status: number, message: string) => ({
  ok: false,
  status,
  statusText: message,
  text: async () => JSON.stringify({
    error: {
      message,
      type: status === 401 ? 'invalid_api_key' : 'api_error',
      code: status === 429 ? 'rate_limit_exceeded' : 'error',
    },
  }),
  json: async () => ({
    error: {
      message,
      type: status === 401 ? 'invalid_api_key' : 'api_error',
      code: status === 429 ? 'rate_limit_exceeded' : 'error',
    },
  }),
});

/**
 * Mock Stripe Subscription Response
 */
export const createMockStripeSubscription = (
  tier: 'free' | 'premium' | 'savage',
  status: 'active' | 'canceled' | 'past_due' = 'active'
) => ({
  ok: true,
  status: 200,
  json: async () => ({
    object: 'list',
    data:
      tier === 'free'
        ? []
        : [
            {
              id: `sub_${tier}`,
              object: 'subscription',
              status,
              customer: 'cus_test123',
              items: {
                object: 'list',
                data: [
                  {
                    id: 'si_test',
                    price: {
                      id: `price_${tier}`,
                      product: `prod_${tier}`,
                      unit_amount: tier === 'premium' ? 999 : 2999,
                      currency: 'usd',
                    },
                  },
                ],
              },
              current_period_start: Math.floor(Date.now() / 1000) - 86400,
              current_period_end: Math.floor(Date.now() / 1000) + 2592000,
              cancel_at_period_end: status === 'canceled',
            },
          ],
    has_more: false,
    url: '/v1/subscriptions',
  }),
});

/**
 * Mock Stripe Error Response
 */
export const createMockStripeError = (status: number, type: string, message: string) => ({
  ok: false,
  status,
  statusText: message,
  text: async () => JSON.stringify({
    error: {
      type,
      message,
      code: type,
    },
  }),
  json: async () => ({
    error: {
      type,
      message,
      code: type,
    },
  }),
});

/**
 * Mock AsyncStorage with Error Injection
 */
export class MockAsyncStorageWithErrors {
  private storage = new Map<string, string>();
  private shouldFailGet = false;
  private shouldFailSet = false;

  setGetError(shouldFail: boolean) {
    this.shouldFailGet = shouldFail;
  }

  setSetError(shouldFail: boolean) {
    this.shouldFailSet = shouldFail;
  }

  async getItem(key: string): Promise<string | null> {
    if (this.shouldFailGet) {
      throw new Error('AsyncStorage.getItem failed');
    }
    return this.storage.get(key) ?? null;
  }

  async setItem(key: string, value: string): Promise<void> {
    if (this.shouldFailSet) {
      throw new Error('AsyncStorage.setItem failed');
    }
    this.storage.set(key, value);
  }

  async removeItem(key: string): Promise<void> {
    this.storage.delete(key);
  }

  async clear(): Promise<void> {
    this.storage.clear();
  }
}

/**
 * Mock fetch with pattern matching
 */
export class MockFetchBuilder {
  private handlers: Array<{ pattern: RegExp | string; handler: () => Promise<any> }> = [];
  private defaultHandler: () => Promise<any> = async () => ({
    ok: true,
    status: 200,
    json: async () => ({}),
  });

  on(pattern: RegExp | string, handler: () => Promise<any>) {
    this.handlers.push({ pattern, handler });
    return this;
  }

  default(handler: () => Promise<any>) {
    this.defaultHandler = handler;
    return this;
  }

  build() {
    return async (url: string | Request | URL, options?: any) => {
      const urlString = typeof url === 'string' ? url : url instanceof URL ? url.toString() : url.url;

      for (const { pattern, handler } of this.handlers) {
        if (typeof pattern === 'string' ? urlString.includes(pattern) : pattern.test(urlString)) {
          return handler();
        }
      }

      return this.defaultHandler();
    };
  }
}

/**
 * Wait for condition with timeout
 */
export const waitForCondition = async (
  condition: () => boolean,
  timeout = 5000,
  interval = 100
): Promise<void> => {
  const startTime = Date.now();
  while (!condition()) {
    if (Date.now() - startTime > timeout) {
      throw new Error('Timeout waiting for condition');
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
};

/**
 * Mock Food Analysis Result
 */
export const createMockFoodAnalysis = (overrides?: any) => ({
  name: 'Test Food',
  serving: '100g',
  calories: 200,
  protein: 20,
  carbs: 30,
  fat: 8,
  fiber: 5,
  confidence: 0.9,
  ...overrides,
});

/**
 * Mock Image Picker Result
 */
export const createMockImagePickerResult = (uri?: string, canceled = false) =>
  canceled
    ? { canceled: true }
    : {
        canceled: false,
        assets: [
          {
            uri: uri || 'file://mock-image.jpg',
            width: 1920,
            height: 1080,
            base64: 'mockbase64data',
            type: 'image',
          },
        ],
      };

/**
 * Test Data Builders
 */
export const TestDataBuilders = {
  session: createMockSession,
  user: createMockSupabaseUser,
  openaiResponse: createMockOpenAIResponse,
  openaiError: createMockOpenAIError,
  stripeSubscription: createMockStripeSubscription,
  stripeError: createMockStripeError,
  foodAnalysis: createMockFoodAnalysis,
  imagePickerResult: createMockImagePickerResult,
};

/**
 * Assert helpers for common patterns
 */
export const AssertHelpers = {
  assertErrorLogged: (mockLogger: any, expectedMessage?: string) => {
    expect(mockLogger.error).toHaveBeenCalled();
    if (expectedMessage) {
      const calls = mockLogger.error.mock.calls;
      expect(calls.some((call: any[]) => call.some((arg) => String(arg).includes(expectedMessage)))).toBe(true);
    }
  },

  assertAlertShown: (expectedTitle?: string, expectedMessage?: string) => {
    const Alert = require('react-native').Alert;
    expect(Alert.alert).toHaveBeenCalled();
    if (expectedTitle || expectedMessage) {
      const calls = Alert.alert.mock.calls;
      if (expectedTitle) {
        expect(calls.some((call: any[]) => call[0] === expectedTitle)).toBe(true);
      }
      if (expectedMessage) {
        expect(calls.some((call: any[]) => call[1] === expectedMessage)).toBe(true);
      }
    }
  },

  assertStorageCleared: (mockStorage: any, key: string) => {
    expect(mockStorage.removeItem).toHaveBeenCalledWith(key);
  },
};

export default {
  TestDataBuilders,
  AssertHelpers,
  MockFetchBuilder,
  MockAsyncStorageWithErrors,
  waitForCondition,
};
