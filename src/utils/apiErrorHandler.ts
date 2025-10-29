// API Error Handler for graceful error handling and fallbacks

export interface ApiError {
  status: number;
  message: string;
  code?: string;
}

export class ApiErrorHandler {
  static handle(error: any): ApiError {
    console.log('API Error:', error);
    
    if (error.response) {
      // Server responded with error status
      const status = error.response.status;
      const message = error.response.data?.message || error.message || 'Unknown error';
      
      switch (status) {
        case 401:
          return {
            status: 401,
            message: 'Authentication required. Please log in again.',
            code: 'UNAUTHORIZED'
          };
        case 403:
          return {
            status: 403,
            message: 'Access denied. Please check your subscription.',
            code: 'FORBIDDEN'
          };
        case 404:
          return {
            status: 404,
            message: 'Service not found. Please try again later.',
            code: 'NOT_FOUND'
          };
        case 429:
          return {
            status: 429,
            message: 'Too many requests. Please wait a moment.',
            code: 'RATE_LIMITED'
          };
        case 500:
          return {
            status: 500,
            message: 'Server error. Please try again later.',
            code: 'SERVER_ERROR'
          };
        default:
          return {
            status,
            message,
            code: 'API_ERROR'
          };
      }
    } else if (error.request) {
      // Network error
      return {
        status: 0,
        message: 'Network error. Please check your connection.',
        code: 'NETWORK_ERROR'
      };
    } else {
      // Other error
      return {
        status: -1,
        message: error.message || 'An unexpected error occurred.',
        code: 'UNKNOWN_ERROR'
      };
    }
  }

  static shouldUseFallback(error: ApiError): boolean {
    // Use fallback for auth errors, network errors, or server errors
    return [401, 403, 0, 500, 502, 503, 504].includes(error.status);
  }

  static getRetryDelay(attempt: number): number {
    // Exponential backoff: 1s, 2s, 4s, 8s, max 30s
    return Math.min(1000 * Math.pow(2, attempt), 30000);
  }
}

export const withFallback = async <T>(
  apiCall: () => Promise<T>,
  fallback: () => T,
  maxRetries: number = 3
): Promise<T> => {
  let lastError: ApiError;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await apiCall();
    } catch (error) {
      lastError = ApiErrorHandler.handle(error);
      
      if (ApiErrorHandler.shouldUseFallback(lastError)) {
        console.log(`API call failed (attempt ${attempt + 1}), using fallback:`, lastError.message);
        return fallback();
      }
      
      if (attempt < maxRetries - 1) {
        const delay = ApiErrorHandler.getRetryDelay(attempt);
        console.log(`Retrying API call in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  // All retries failed, use fallback
  console.log('All API retries failed, using fallback:', lastError!.message);
  return fallback();
};
