import { supabase } from '@/lib/supabase';
import type { ApiResponse } from '../types/models';
import type {
  Coach,
  CoachCategory,
  CoachPurchase,
  CoachReview,
  MarketplaceFilters,
  MarketplaceSortOptions,
  PurchaseCoachInput,
  CreateReviewInput,
  UpdateReviewInput,
  PurchaseStatus,
} from '../types/marketplace';

export class CoachMarketplaceService {
  /**
   * Get all available coaches in the marketplace with filters
   */
  static async getAvailableCoaches(
    userId?: string,
    filters?: MarketplaceFilters,
    sort?: MarketplaceSortOptions
  ): Promise<ApiResponse<Coach[]>> {
    try {
      let query = supabase
        .from('coaches')
        .select(`
          *,
          coach_marketplace_info!inner (
            category_id,
            price_type,
            price_amount,
            currency,
            trial_days,
            is_public,
            is_featured,
            downloads,
            rating,
            total_ratings,
            tags,
            sample_interactions
          ),
          coach_categories (
            id,
            name,
            icon
          )
        `)
        .eq('is_active', true)
        .eq('coach_marketplace_info.is_public', true);

      // Apply filters
      if (filters?.category) {
        query = query.eq('coach_marketplace_info.category_id', filters.category);
      }

      if (filters?.price_type) {
        query = query.eq('coach_marketplace_info.price_type', filters.price_type);
      }

      if (filters?.min_rating) {
        query = query.gte('coach_marketplace_info.rating', filters.min_rating);
      }

      if (filters?.featured_only) {
        query = query.eq('coach_marketplace_info.is_featured', true);
      }

      if (filters?.search) {
        query = query.or(
          `name.ilike.%${filters.search}%,description.ilike.%${filters.search}%,tags.cs.{${filters.search}}`
        );
      }

      if (filters?.tags && filters.tags.length > 0) {
        query = query.contains('coach_marketplace_info.tags', filters.tags);
      }

      // Apply sorting
      const sortBy = sort?.sort_by || 'rating';
      const sortOrder = sort?.sort_order || 'desc';

      switch (sortBy) {
        case 'rating':
          query = query.order('coach_marketplace_info.rating', { ascending: sortOrder === 'asc' });
          break;
        case 'downloads':
          query = query.order('coach_marketplace_info.downloads', { ascending: sortOrder === 'asc' });
          break;
        case 'price':
          query = query.order('coach_marketplace_info.price_amount', { ascending: sortOrder === 'asc' });
          break;
        case 'newest':
          query = query.order('created_at', { ascending: sortOrder === 'asc' });
          break;
        case 'name':
          query = query.order('name', { ascending: sortOrder === 'asc' });
          break;
      }

      const { data, error } = await query;

      if (error) {
        return { error: error.message };
      }

      // Flatten and transform data
      const coaches: Coach[] = (data || []).map((item: any) => ({
        ...item,
        category_id: item.coach_marketplace_info?.category_id,
        category_name: item.coach_categories?.name,
        category_icon: item.coach_categories?.icon,
        price_type: item.coach_marketplace_info?.price_type,
        price_amount: item.coach_marketplace_info?.price_amount,
        currency: item.coach_marketplace_info?.currency,
        trial_days: item.coach_marketplace_info?.trial_days,
        is_public: item.coach_marketplace_info?.is_public,
        is_featured: item.coach_marketplace_info?.is_featured,
        downloads: item.coach_marketplace_info?.downloads,
        rating: item.coach_marketplace_info?.rating,
        total_ratings: item.coach_marketplace_info?.total_ratings,
        sample_interactions: item.coach_marketplace_info?.sample_interactions,
      }));

      // If userId provided, check which coaches are purchased
      if (userId) {
        const { data: purchases } = await supabase
          .from('coach_purchases')
          .select('coach_id, status, is_trial, trial_ends_at')
          .eq('user_id', userId)
          .eq('status', 'active');

        if (purchases) {
          const purchaseMap = new Map(
            purchases.map((p) => [p.coach_id, p])
          );

          coaches.forEach((coach) => {
            const purchase = purchaseMap.get(coach.id) as any;
            if (purchase) {
              coach.is_purchased = true;
              coach.purchase_status = purchase.status as PurchaseStatus;
              coach.is_trial = purchase.is_trial as boolean;
              coach.trial_ends_at = purchase.trial_ends_at as string | undefined;
            }
          });
        }
      }

      return { data: coaches };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Failed to fetch coaches' };
    }
  }

  /**
   * Get detailed coach information
   */
  static async getCoachDetails(coachId: string, userId?: string): Promise<ApiResponse<Coach>> {
    try {
      const { data, error } = await supabase
        .from('coaches')
        .select(`
          *,
          coach_marketplace_info (
            category_id,
            price_type,
            price_amount,
            currency,
            trial_days,
            is_public,
            is_featured,
            downloads,
            rating,
            total_ratings,
            tags,
            sample_interactions
          ),
          coach_categories (
            id,
            name,
            icon
          )
        `)
        .eq('id', coachId)
        .single();

      if (error) {
        return { error: error.message };
      }

      const coach: Coach = {
        ...data,
        category_id: data.coach_marketplace_info?.category_id,
        category_name: data.coach_categories?.name,
        category_icon: data.coach_categories?.icon,
        price_type: data.coach_marketplace_info?.price_type,
        price_amount: data.coach_marketplace_info?.price_amount,
        currency: data.coach_marketplace_info?.currency,
        trial_days: data.coach_marketplace_info?.trial_days,
        is_public: data.coach_marketplace_info?.is_public,
        is_featured: data.coach_marketplace_info?.is_featured,
        downloads: data.coach_marketplace_info?.downloads,
        rating: data.coach_marketplace_info?.rating,
        total_ratings: data.coach_marketplace_info?.total_ratings,
        sample_interactions: data.coach_marketplace_info?.sample_interactions,
      };

      // Check if user has purchased
      if (userId) {
        const { data: purchase } = await supabase
          .from('coach_purchases')
          .select('*')
          .eq('user_id', userId)
          .eq('coach_id', coachId)
          .eq('status', 'active')
          .single();

        if (purchase) {
          coach.is_purchased = true;
          coach.purchase_status = purchase.status;
          coach.is_trial = purchase.is_trial;
          coach.trial_ends_at = purchase.trial_ends_at;
        }
      }

      return { data: coach };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Failed to fetch coach details' };
    }
  }

  /**
   * Search coaches by query
   */
  static async searchCoaches(
    query: string,
    userId?: string,
    limit: number = 20
  ): Promise<ApiResponse<Coach[]>> {
    return this.getAvailableCoaches(
      userId,
      { search: query },
      { sort_by: 'rating', sort_order: 'desc' }
    );
  }

  /**
   * Get user's purchased coaches
   */
  static async getPurchasedCoaches(userId: string): Promise<ApiResponse<Coach[]>> {
    try {
      const { data: purchases, error: purchaseError } = await supabase
        .from('coach_purchases')
        .select('coach_id, status, is_trial, trial_ends_at, expires_at')
        .eq('user_id', userId)
        .eq('status', 'active');

      if (purchaseError) {
        return { error: purchaseError.message };
      }

      if (!purchases || purchases.length === 0) {
        return { data: [] };
      }

      const coachIds = purchases.map((p) => p.coach_id);

      const { data, error } = await supabase
        .from('coaches')
        .select(`
          *,
          coach_marketplace_info (
            category_id,
            price_type,
            price_amount,
            currency,
            trial_days,
            is_public,
            is_featured,
            downloads,
            rating,
            total_ratings,
            tags,
            sample_interactions
          ),
          coach_categories (
            id,
            name,
            icon
          )
        `)
        .in('id', coachIds)
        .eq('is_active', true);

      if (error) {
        return { error: error.message };
      }

      const purchaseMap = new Map(
        purchases.map((p) => [p.coach_id, p])
      );

      const coaches: Coach[] = (data || []).map((item: any) => {
        const purchase = purchaseMap.get(item.id) as any;
        return {
          ...item,
          category_id: item.coach_marketplace_info?.category_id,
          category_name: item.coach_categories?.name,
          category_icon: item.coach_categories?.icon,
          price_type: item.coach_marketplace_info?.price_type,
          price_amount: item.coach_marketplace_info?.price_amount,
          currency: item.coach_marketplace_info?.currency,
          trial_days: item.coach_marketplace_info?.trial_days,
          is_public: item.coach_marketplace_info?.is_public,
          is_featured: item.coach_marketplace_info?.is_featured,
          downloads: item.coach_marketplace_info?.downloads,
          rating: item.coach_marketplace_info?.rating,
          total_ratings: item.coach_marketplace_info?.total_ratings,
          sample_interactions: item.coach_marketplace_info?.sample_interactions,
          is_purchased: true,
          purchase_status: purchase?.status as PurchaseStatus | undefined,
          is_trial: purchase?.is_trial as boolean | undefined,
          trial_ends_at: purchase?.trial_ends_at as string | undefined,
        };
      });

      return { data: coaches };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Failed to fetch purchased coaches' };
    }
  }

  /**
   * Purchase a coach
   */
  static async purchaseCoach(
    userId: string,
    input: PurchaseCoachInput
  ): Promise<ApiResponse<CoachPurchase>> {
    try {
      // Check if already purchased
      const { data: existing } = await supabase
        .from('coach_purchases')
        .select('*')
        .eq('user_id', userId)
        .eq('coach_id', input.coach_id)
        .eq('status', 'active')
        .single();

      if (existing) {
        return { error: 'Coach already purchased' };
      }

      // Get coach details for pricing
      const { data: coachInfo } = await supabase
        .from('coach_marketplace_info')
        .select('*')
        .eq('coach_id', input.coach_id)
        .single();

      if (!coachInfo) {
        return { error: 'Coach not found' };
      }

      const isTrial = input.with_trial || input.purchase_type === 'trial';
      const now = new Date();
      const trialEndsAt = isTrial
        ? new Date(now.getTime() + coachInfo.trial_days * 24 * 60 * 60 * 1000)
        : null;

      const purchase = {
        user_id: userId,
        coach_id: input.coach_id,
        purchase_type: input.purchase_type,
        status: 'active' as const,
        amount_paid: isTrial ? 0 : coachInfo.price_amount,
        currency: coachInfo.currency,
        is_trial: isTrial,
        trial_ends_at: trialEndsAt?.toISOString(),
        trial_converted: false,
        purchased_at: now.toISOString(),
        expires_at:
          input.purchase_type === 'monthly'
            ? new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()
            : input.purchase_type === 'lifetime'
            ? null
            : trialEndsAt?.toISOString(),
        auto_renew: input.purchase_type === 'monthly',
      };

      const { data, error } = await supabase
        .from('coach_purchases')
        .insert(purchase)
        .select()
        .single();

      if (error) {
        return { error: error.message };
      }

      return { data };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Failed to purchase coach' };
    }
  }

  /**
   * Start a trial for a coach
   */
  static async startTrial(userId: string, coachId: string): Promise<ApiResponse<CoachPurchase>> {
    return this.purchaseCoach(userId, {
      coach_id: coachId,
      purchase_type: 'trial',
      with_trial: true,
    });
  }

  /**
   * Cancel a trial
   */
  static async cancelTrial(userId: string, coachId: string): Promise<ApiResponse<void>> {
    try {
      const { error } = await supabase
        .from('coach_purchases')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('coach_id', coachId)
        .eq('is_trial', true)
        .eq('status', 'active');

      if (error) {
        return { error: error.message };
      }

      return { message: 'Trial cancelled successfully' };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Failed to cancel trial' };
    }
  }

  /**
   * Get coach categories
   */
  static async getCoachCategories(): Promise<ApiResponse<CoachCategory[]>> {
    try {
      const { data, error } = await supabase
        .from('coach_categories')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      if (error) {
        return { error: error.message };
      }

      return { data: data || [] };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Failed to fetch categories' };
    }
  }

  /**
   * Rate a coach
   */
  static async rateCoach(
    userId: string,
    input: CreateReviewInput
  ): Promise<ApiResponse<CoachReview>> {
    try {
      // Check if user has purchased the coach
      const { data: purchase } = await supabase
        .from('coach_purchases')
        .select('id')
        .eq('user_id', userId)
        .eq('coach_id', input.coach_id)
        .single();

      const review = {
        user_id: userId,
        coach_id: input.coach_id,
        rating: input.rating,
        review_text: input.review_text,
        title: input.title,
        is_verified_purchase: !!purchase,
      };

      const { data, error } = await supabase
        .from('coach_reviews')
        .upsert(review, { onConflict: 'user_id,coach_id' })
        .select()
        .single();

      if (error) {
        return { error: error.message };
      }

      return { data };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Failed to submit review' };
    }
  }

  /**
   * Get reviews for a coach
   */
  static async getCoachReviews(
    coachId: string,
    limit: number = 50
  ): Promise<ApiResponse<CoachReview[]>> {
    try {
      const { data, error } = await supabase
        .from('coach_reviews')
        .select('*')
        .eq('coach_id', coachId)
        .eq('is_approved', true)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        return { error: error.message };
      }

      return { data: data || [] };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Failed to fetch reviews' };
    }
  }

  /**
   * Update a review
   */
  static async updateReview(
    userId: string,
    input: UpdateReviewInput
  ): Promise<ApiResponse<CoachReview>> {
    try {
      const { id, ...updates } = input;

      const { data, error } = await supabase
        .from('coach_reviews')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        return { error: error.message };
      }

      return { data };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Failed to update review' };
    }
  }

  /**
   * Delete a review
   */
  static async deleteReview(userId: string, reviewId: string): Promise<ApiResponse<void>> {
    try {
      const { error } = await supabase
        .from('coach_reviews')
        .delete()
        .eq('id', reviewId)
        .eq('user_id', userId);

      if (error) {
        return { error: error.message };
      }

      return { message: 'Review deleted successfully' };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Failed to delete review' };
    }
  }
}
