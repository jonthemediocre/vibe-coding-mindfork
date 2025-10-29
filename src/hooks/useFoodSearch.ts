import { useState, useEffect, useCallback, useRef } from 'react';
import { FoodService } from '../services/FoodService';
import type { UnifiedFood } from '../types/food';

export interface UseFoodSearchResult {
  results: UnifiedFood[];
  isSearching: boolean;
  error: string | null;
  search: (query: string) => void;
  clearResults: () => void;
}

/**
 * Hook for debounced food search with USDA database integration
 * Automatically debounces search queries by 500ms
 */
export const useFoodSearch = (debounceMs: number = 500): UseFoodSearchResult => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UnifiedFood[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Perform the actual search
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery || searchQuery.length < 2) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    setIsSearching(true);
    setError(null);

    try {
      const response = await FoodService.searchFood(searchQuery, 25);

      if (response.error) {
        setError(response.error);
        setResults([]);
      } else {
        setResults(response.data || []);
      }
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setError('Failed to search foods');
        setResults([]);
      }
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Debounced search function
  const search = useCallback((searchQuery: string) => {
    setQuery(searchQuery);

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new timer
    debounceTimerRef.current = setTimeout(() => {
      performSearch(searchQuery);
    }, debounceMs);
  }, [performSearch, debounceMs]);

  const clearResults = useCallback(() => {
    setResults([]);
    setQuery('');
    setError(null);
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    results,
    isSearching,
    error,
    search,
    clearResults,
  };
};
