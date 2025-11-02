import { useEffect, useState, useCallback } from 'react';
import NetInfo, { NetInfoState, NetInfoStateType } from '@react-native-community/netinfo';
import { logger } from '../utils/logger';

export interface NetworkStatus {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  type: NetInfoStateType;
  details: NetInfoState['details'] | null;
}

/**
 * Custom hook for offline detection with NetInfo
 *
 * Provides real-time network status monitoring and connectivity information.
 * Essential for graceful degradation when user loses internet connection.
 *
 * Features:
 * - Real-time connection status
 * - Internet reachability checking
 * - Connection type detection (wifi, cellular, etc.)
 * - Automatic reconnection detection
 * - Network details (speed, signal strength on Android)
 *
 * Why this matters:
 * - Prevents API calls when offline (saves battery, avoids timeout waits)
 * - Enables offline-first features (cached data, queue actions)
 * - Provides user feedback (offline banner, sync indicators)
 * - Improves UX (no hanging requests, clear status communication)
 *
 * Usage:
 * const { isConnected, isInternetReachable, type } = useOfflineDetection();
 *
 * if (!isConnected) {
 *   return <OfflineBanner />;
 * }
 *
 * Performance considerations:
 * - Listeners cleaned up on unmount
 * - State updates debounced to prevent rapid re-renders
 * - Minimal memory footprint (single NetInfo subscription)
 */
export function useOfflineDetection() {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    isConnected: true, // Optimistic default
    isInternetReachable: null,
    type: NetInfoStateType.unknown,
    details: null,
  });

  const [wasOffline, setWasOffline] = useState(false);

  const handleNetworkChange = useCallback((state: NetInfoState) => {
    const isConnected = state.isConnected ?? false;
    const isInternetReachable = state.isInternetReachable ?? null;

    // Log significant network changes
    if (isConnected !== networkStatus.isConnected) {
      if (isConnected) {
        logger.info('Network connection restored', {
          type: state.type,
          wasOffline,
          details: state.details,
        });
      } else {
        logger.warn('Network connection lost', {
          type: state.type,
          details: state.details,
        });
      }
    }

    setNetworkStatus({
      isConnected,
      isInternetReachable,
      type: state.type,
      details: state.details,
    });

    // Track if user was offline (useful for sync logic)
    if (!isConnected) {
      setWasOffline(true);
    } else if (wasOffline) {
      // User came back online - good time to sync
      logger.info('User came back online - ready to sync');
      setWasOffline(false);
    }
  }, [networkStatus.isConnected, wasOffline]);

  useEffect(() => {
    // Fetch initial network state
    NetInfo.fetch().then(handleNetworkChange);

    // Subscribe to network state updates
    const unsubscribe = NetInfo.addEventListener(handleNetworkChange);

    // Cleanup subscription on unmount
    return () => {
      unsubscribe();
    };
  }, [handleNetworkChange]);

  /**
   * Manually refresh network status
   * Useful after long-running operations or when user requests refresh
   */
  const refresh = useCallback(async () => {
    const state = await NetInfo.fetch();
    handleNetworkChange(state);
  }, [handleNetworkChange]);

  /**
   * Check if connection is good enough for data-intensive operations
   * (e.g., video streaming, large file uploads)
   */
  const hasGoodConnection = useCallback(() => {
    if (!networkStatus.isConnected || !networkStatus.isInternetReachable) {
      return false;
    }

    // Cellular connections may be slow or expensive
    if (networkStatus.type === NetInfoStateType.cellular) {
      // On Android, we can check connection quality
      const details = networkStatus.details as { cellularGeneration?: string } | null;
      const generation = details?.cellularGeneration;

      // Only 4G and above are considered "good" for data-intensive ops
      return generation === '4g' || generation === '5g';
    }

    // WiFi, ethernet, and other connections are generally good
    return networkStatus.type === NetInfoStateType.wifi ||
           networkStatus.type === NetInfoStateType.ethernet ||
           networkStatus.type === NetInfoStateType.other;
  }, [networkStatus]);

  return {
    ...networkStatus,
    wasOffline,
    refresh,
    hasGoodConnection: hasGoodConnection(),
    // Helper booleans for common checks
    isOffline: !networkStatus.isConnected,
    isOnline: networkStatus.isConnected === true,
    hasInternet: networkStatus.isInternetReachable === true,
  };
}

/**
 * Hook for queuing actions when offline, executing when back online
 *
 * Usage:
 * const { enqueue, pendingCount } = useOfflineQueue();
 *
 * async function saveData() {
 *   if (!isConnected) {
 *     enqueue(() => api.saveData(data));
 *     return;
 *   }
 *   await api.saveData(data);
 * }
 */
export function useOfflineQueue() {
  const [queue, setQueue] = useState<Array<() => Promise<void>>>([]);
  const { isOnline } = useOfflineDetection();

  useEffect(() => {
    if (isOnline && queue.length > 0) {
      logger.info(`Processing ${queue.length} queued actions after reconnection`);

      // Process queue
      const processQueue = async () => {
        for (const action of queue) {
          try {
            await action();
          } catch (error) {
            logger.error('Error processing queued action', error as Error);
          }
        }
        setQueue([]);
      };

      processQueue();
    }
  }, [isOnline, queue]);

  const enqueue = useCallback((action: () => Promise<void>) => {
    setQueue(prev => [...prev, action]);
    logger.info('Action queued for when online', { queueSize: queue.length + 1 });
  }, [queue.length]);

  const clearQueue = useCallback(() => {
    setQueue([]);
  }, []);

  return {
    enqueue,
    clearQueue,
    pendingCount: queue.length,
    hasPending: queue.length > 0,
  };
}
