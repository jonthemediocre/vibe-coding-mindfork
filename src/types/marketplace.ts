/**
 * Coach Marketplace Types
 */

export interface CoachCategory {
  id: string;
  name: string;
  icon?: string;
  description?: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export type PriceType = 'free' | 'one_time' | 'monthly' | 'lifetime';
export type PurchaseStatus = 'active' | 'expired' | 'cancelled' | 'refunded';

export interface CoachMarketplaceInfo {
  coach_id: string;
  category_id?: string;
  price_type: PriceType;
  price_amount: number;
  currency: string;
  trial_days: number;
  is_public: boolean;
  is_featured: boolean;
  downloads: number;
  rating: number;
  total_ratings: number;
  tags: string[];
  sample_interactions?: SampleInteraction[];
  created_at: string;
  updated_at?: string;
}

export interface SampleInteraction {
  user: string;
  coach: string;
}

export interface Coach {
  // Core coach data
  id: string;
  name: string;
  level: number;
  tone: string;
  description?: string;
  avatar_url?: string;
  default_severity: number;
  supported_modes: string[];
  is_active: boolean;
  tags: string[];

  // Marketplace info (joined)
  category_id?: string;
  category_name?: string;
  category_icon?: string;
  price_type: PriceType;
  price_amount: number;
  currency: string;
  trial_days: number;
  is_public: boolean;
  is_featured: boolean;
  downloads: number;
  rating: number;
  total_ratings: number;
  sample_interactions?: SampleInteraction[];

  // User-specific
  is_purchased?: boolean;
  purchase_status?: PurchaseStatus;
  is_trial?: boolean;
  trial_ends_at?: string;

  created_at: string;
  updated_at?: string;
}

export interface CoachPurchase {
  id: string;
  user_id: string;
  coach_id: string;
  purchase_type: 'trial' | 'one_time' | 'monthly' | 'lifetime';
  status: PurchaseStatus;
  amount_paid: number;
  currency: string;
  is_trial: boolean;
  trial_ends_at?: string;
  trial_converted: boolean;
  purchased_at: string;
  expires_at?: string;
  auto_renew: boolean;
  stripe_payment_id?: string;
  stripe_subscription_id?: string;
  created_at: string;
  updated_at?: string;
}

export interface CoachReview {
  id: string;
  user_id: string;
  coach_id: string;
  rating: number;
  review_text?: string;
  title?: string;
  is_verified_purchase: boolean;
  helpful_count: number;
  not_helpful_count: number;
  is_flagged: boolean;
  is_approved: boolean;
  created_at: string;
  updated_at?: string;

  // Joined data
  user_name?: string;
  user_avatar?: string;
}

export interface CoachReviewVote {
  id: string;
  review_id: string;
  user_id: string;
  is_helpful: boolean;
  created_at: string;
}

export interface MarketplaceFilters {
  category?: string;
  price_type?: PriceType;
  min_rating?: number;
  featured_only?: boolean;
  search?: string;
  tags?: string[];
}

export interface MarketplaceSortOptions {
  sort_by?: 'rating' | 'downloads' | 'price' | 'newest' | 'name';
  sort_order?: 'asc' | 'desc';
}

export interface PurchaseCoachInput {
  coach_id: string;
  purchase_type: 'trial' | 'one_time' | 'monthly' | 'lifetime';
  with_trial?: boolean;
}

export interface CreateReviewInput {
  coach_id: string;
  rating: number;
  review_text?: string;
  title?: string;
}

export interface UpdateReviewInput {
  id: string;
  rating?: number;
  review_text?: string;
  title?: string;
}
