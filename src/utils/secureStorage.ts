/**
 * Secure Storage Utility
 * Provides encrypted storage for sensitive data using expo-secure-store
 * Falls back to AsyncStorage for non-sensitive data or when SecureStore is unavailable
 */

import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { logger } from './logger';

// SecureStore is only available on iOS and Android
const isSecureStoreAvailable = Platform.OS === 'ios' || Platform.OS === 'android';

export interface SecureStorageOptions {
  keychainAccessible?: SecureStore.KeychainAccessibilityConstant;
  requireAuthentication?: boolean;
}

/**
 * Securely store a value
 * Uses expo-secure-store on mobile, falls back to AsyncStorage on web
 */
export async function setSecureItem(
  key: string,
  value: string,
  options?: SecureStorageOptions
): Promise<void> {
  try {
    if (isSecureStoreAvailable) {
      await SecureStore.setItemAsync(key, value, {
        keychainAccessible: options?.keychainAccessible || SecureStore.WHEN_UNLOCKED,
        requireAuthentication: options?.requireAuthentication || false,
      });
      logger.debug('Secure item stored', { key });
    } else {
      // Fallback for web or unsupported platforms
      // Note: This is NOT encrypted on web - for production web apps, consider alternative storage
      await AsyncStorage.setItem(key, value);
      logger.warn('Secure storage not available, using AsyncStorage fallback', { key, platform: Platform.OS });
    }
  } catch (error) {
    logger.error('Failed to store secure item', error as Error, { key });
    throw new SecureStorageError(`Failed to store item: ${key}`, error as Error);
  }
}

/**
 * Retrieve a securely stored value
 */
export async function getSecureItem(key: string): Promise<string | null> {
  try {
    if (isSecureStoreAvailable) {
      const value = await SecureStore.getItemAsync(key);
      logger.debug('Secure item retrieved', { key, found: !!value });
      return value;
    } else {
      // Fallback for web or unsupported platforms
      const value = await AsyncStorage.getItem(key);
      logger.warn('Secure storage not available, using AsyncStorage fallback', { key, platform: Platform.OS });
      return value;
    }
  } catch (error) {
    logger.error('Failed to retrieve secure item', error as Error, { key });
    return null;
  }
}

/**
 * Delete a securely stored value
 */
export async function deleteSecureItem(key: string): Promise<void> {
  try {
    if (isSecureStoreAvailable) {
      await SecureStore.deleteItemAsync(key);
      logger.debug('Secure item deleted', { key });
    } else {
      // Fallback for web or unsupported platforms
      await AsyncStorage.removeItem(key);
      logger.warn('Secure storage not available, using AsyncStorage fallback', { key, platform: Platform.OS });
    }
  } catch (error) {
    logger.error('Failed to delete secure item', error as Error, { key });
    throw new SecureStorageError(`Failed to delete item: ${key}`, error as Error);
  }
}

/**
 * Check if a secure item exists
 */
export async function hasSecureItem(key: string): Promise<boolean> {
  try {
    const value = await getSecureItem(key);
    return value !== null;
  } catch (error) {
    logger.error('Failed to check secure item existence', error as Error, { key });
    return false;
  }
}

/**
 * Clear all secure items with a given prefix
 * Useful for cleanup operations like logout
 */
export async function clearSecureItemsWithPrefix(prefix: string): Promise<void> {
  try {
    if (!isSecureStoreAvailable) {
      // For AsyncStorage fallback, we need to get all keys and filter
      const allKeys = await AsyncStorage.getAllKeys();
      const keysToDelete = allKeys.filter((key) => key.startsWith(prefix));
      await AsyncStorage.multiRemove(keysToDelete);
      logger.debug('Secure items cleared (AsyncStorage)', { prefix, count: keysToDelete.length });
    } else {
      // SecureStore doesn't provide a way to list keys
      // This is a limitation - callers should track keys they use
      logger.warn('Cannot clear items by prefix in SecureStore - please delete items individually', { prefix });
    }
  } catch (error) {
    logger.error('Failed to clear secure items', error as Error, { prefix });
    throw new SecureStorageError(`Failed to clear items with prefix: ${prefix}`, error as Error);
  }
}

/**
 * Store JSON data securely
 */
export async function setSecureJSON<T>(
  key: string,
  value: T,
  options?: SecureStorageOptions
): Promise<void> {
  try {
    const jsonString = JSON.stringify(value);
    await setSecureItem(key, jsonString, options);
  } catch (error) {
    logger.error('Failed to store secure JSON', error as Error, { key });
    throw new SecureStorageError(`Failed to store JSON for: ${key}`, error as Error);
  }
}

/**
 * Retrieve JSON data securely
 */
export async function getSecureJSON<T>(key: string): Promise<T | null> {
  try {
    const jsonString = await getSecureItem(key);
    if (!jsonString) {
      return null;
    }
    return JSON.parse(jsonString) as T;
  } catch (error) {
    logger.error('Failed to retrieve secure JSON', error as Error, { key });
    return null;
  }
}

/**
 * Custom error class for secure storage operations
 */
export class SecureStorageError extends Error {
  public readonly originalError?: Error;

  constructor(message: string, originalError?: Error) {
    super(message);
    this.name = 'SecureStorageError';
    this.originalError = originalError;
  }
}

/**
 * Migrate data from AsyncStorage to SecureStore
 * Useful for upgrading from insecure to secure storage
 */
export async function migrateFromAsyncStorage(key: string): Promise<void> {
  try {
    if (!isSecureStoreAvailable) {
      logger.debug('SecureStore not available, skipping migration', { key });
      return;
    }

    // Check if already migrated
    const existsInSecure = await hasSecureItem(key);
    if (existsInSecure) {
      logger.debug('Item already in SecureStore, cleaning up AsyncStorage', { key });
      await AsyncStorage.removeItem(key);
      return;
    }

    // Migrate from AsyncStorage
    const value = await AsyncStorage.getItem(key);
    if (value) {
      await SecureStore.setItemAsync(key, value, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED,
      });
      await AsyncStorage.removeItem(key);
      logger.info('Successfully migrated item from AsyncStorage to SecureStore', { key });
    } else {
      logger.debug('No item found in AsyncStorage to migrate', { key });
    }
  } catch (error) {
    logger.error('Failed to migrate from AsyncStorage', error as Error, { key });
    // Don't throw - migration failures shouldn't break the app
  }
}
