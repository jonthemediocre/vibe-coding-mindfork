// Development Configuration
export const isDevelopment = process.env.EXPO_PUBLIC_APP_ENV === 'development';
export const useMockData = process.env.EXPO_PUBLIC_USE_MOCK_DATA === 'true';
export const enableDebugLogs = process.env.EXPO_PUBLIC_ENABLE_DEBUG_LOGS === 'true';
export const mockApiEnabled = process.env.EXPO_PUBLIC_MOCK_API_ENABLED === 'true';
export const offlineMode = process.env.EXPO_PUBLIC_OFFLINE_MODE === 'true';

export const devConfig = {
  // API Configuration
  apiTimeout: 5000, // 5 seconds timeout in dev
  retryAttempts: 2, // Fewer retries in dev
  
  // Mock Data Settings
  useCoachProfiles: useMockData || offlineMode, // Use local coach profiles when offline
  useMockMarketplace: useMockData || offlineMode,
  useMockAuth: useMockData || offlineMode,
  
  // Debug Settings
  logApiCalls: enableDebugLogs,
  logStateChanges: enableDebugLogs,
  showErrorDetails: enableDebugLogs,
  
  // Feature Flags
  enableVoiceCoaching: false, // Disabled in dev
  enableSMSCoaching: false, // Disabled in dev
  enablePushNotifications: false, // Disabled in dev
};

// Development logger
export const devLog = (...args: any[]) => {
  if (enableDebugLogs) {
    console.log('[DEV]', ...args);
  }
};

export const devError = (...args: any[]) => {
  if (enableDebugLogs) {
    console.error('[DEV ERROR]', ...args);
  }
};

export const devWarn = (...args: any[]) => {
  if (enableDebugLogs) {
    console.warn('[DEV WARN]', ...args);
  }
};
