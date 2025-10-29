import { useState, useEffect, useCallback } from 'react';
import { CoachMarketplaceService } from '../services/CoachMarketplaceService';
import type {
  Coach,
  CoachCategory,
  CoachPurchase,
  CoachReview,
  MarketplaceFilters,
  MarketplaceSortOptions,
  PurchaseCoachInput,
  CreateReviewInput,
} from '../types/marketplace';
import { useAuth } from '../contexts/AuthContext';

export const useCoachMarketplace = () => {
  const { user } = useAuth();
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [categories, setCategories] = useState<CoachCategory[]>([]);
  const [purchasedCoaches, setPurchasedCoaches] = useState<Coach[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState<MarketplaceFilters>({});
  const [sort, setSort] = useState<MarketplaceSortOptions>({
    sort_by: 'rating',
    sort_order: 'desc',
  });

  // Load categories on mount
  useEffect(() => {
    loadCategories();
  }, []);

  // Load coaches when filters or sort changes
  useEffect(() => {
    loadCoaches();
  }, [filters, sort, user?.id]);

  // Load purchased coaches when user changes
  useEffect(() => {
    if (user?.id) {
      loadPurchasedCoaches();
    }
  }, [user?.id]);

  const loadCategories = async () => {
    const response = await CoachMarketplaceService.getCoachCategories();
    if (response.data) {
      setCategories(response.data);
    }
  };

  const loadCoaches = async () => {
    setIsLoading(true);
    setError(null);
    const response = await CoachMarketplaceService.getAvailableCoaches(
      user?.id,
      filters,
      sort
    );
    setIsLoading(false);

    if (response.error) {
      setError(response.error);
    } else if (response.data) {
      setCoaches(response.data);
    }
  };

  const loadPurchasedCoaches = async () => {
    if (!user?.id) return;

    const response = await CoachMarketplaceService.getPurchasedCoaches(user.id);
    if (response.data) {
      setPurchasedCoaches(response.data);
    }
  };

  const searchCoaches = useCallback(
    async (query: string) => {
      setIsLoading(true);
      setError(null);
      const response = await CoachMarketplaceService.searchCoaches(query, user?.id);
      setIsLoading(false);

      if (response.error) {
        setError(response.error);
      } else if (response.data) {
        setCoaches(response.data);
      }
    },
    [user?.id]
  );

  const purchaseCoach = useCallback(
    async (input: PurchaseCoachInput): Promise<boolean> => {
      if (!user?.id) {
        setError('User not authenticated');
        return false;
      }

      setError(null);
      const response = await CoachMarketplaceService.purchaseCoach(user.id, input);

      if (response.error) {
        setError(response.error);
        return false;
      }

      // Refresh coaches and purchased list
      await Promise.all([loadCoaches(), loadPurchasedCoaches()]);
      return true;
    },
    [user?.id]
  );

  const startTrial = useCallback(
    async (coachId: string): Promise<boolean> => {
      if (!user?.id) {
        setError('User not authenticated');
        return false;
      }

      setError(null);
      const response = await CoachMarketplaceService.startTrial(user.id, coachId);

      if (response.error) {
        setError(response.error);
        return false;
      }

      // Refresh coaches and purchased list
      await Promise.all([loadCoaches(), loadPurchasedCoaches()]);
      return true;
    },
    [user?.id]
  );

  const cancelTrial = useCallback(
    async (coachId: string): Promise<boolean> => {
      if (!user?.id) {
        setError('User not authenticated');
        return false;
      }

      setError(null);
      const response = await CoachMarketplaceService.cancelTrial(user.id, coachId);

      if (response.error) {
        setError(response.error);
        return false;
      }

      // Refresh coaches and purchased list
      await Promise.all([loadCoaches(), loadPurchasedCoaches()]);
      return true;
    },
    [user?.id]
  );

  const rateCoach = useCallback(
    async (input: CreateReviewInput): Promise<boolean> => {
      if (!user?.id) {
        setError('User not authenticated');
        return false;
      }

      setError(null);
      const response = await CoachMarketplaceService.rateCoach(user.id, input);

      if (response.error) {
        setError(response.error);
        return false;
      }

      // Refresh coaches to update ratings
      await loadCoaches();
      return true;
    },
    [user?.id]
  );

  const updateFilters = useCallback((newFilters: MarketplaceFilters) => {
    setFilters(newFilters);
  }, []);

  const updateSort = useCallback((newSort: MarketplaceSortOptions) => {
    setSort(newSort);
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({});
    setSort({ sort_by: 'rating', sort_order: 'desc' });
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const refreshAll = useCallback(async () => {
    await Promise.all([loadCategories(), loadCoaches(), loadPurchasedCoaches()]);
  }, [user?.id]);

  return {
    // State
    coaches,
    categories,
    purchasedCoaches,
    isLoading,
    error,
    filters,
    sort,

    // Actions
    searchCoaches,
    purchaseCoach,
    startTrial,
    cancelTrial,
    rateCoach,
    updateFilters,
    updateSort,
    clearFilters,
    clearError,
    refreshAll,
    loadCoaches,
  };
};

export default useCoachMarketplace;
