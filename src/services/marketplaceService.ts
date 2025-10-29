// Marketplace Service with API fallback
import { supabase } from './supabaseClient';
import { ApiErrorHandler, withFallback } from '../utils/apiErrorHandler';

export interface MarketplaceItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image_url?: string;
  available: boolean;
}

const mockMarketplaceItems: MarketplaceItem[] = [
  {
    id: 'premium-plan',
    name: 'Premium Plan',
    description: 'Unlock advanced AI coaching, unlimited food analysis, and premium features.',
    price: 9.99,
    category: 'subscription',
    available: true
  },
  {
    id: 'savage-plan',
    name: 'Savage Plan',
    description: 'Ultimate plan with voice coaching, SMS support, and priority features.',
    price: 99.99,
    category: 'subscription',
    available: true
  },
  {
    id: 'meal-plans',
    name: 'Custom Meal Plans',
    description: 'Personalized meal plans created by nutrition experts.',
    price: 19.99,
    category: 'nutrition',
    available: true
  }
];

export class MarketplaceService {
  static async getItems() {
    return withFallback(
      async () => {
        const { data, error } = await supabase
          .from('marketplace_items')
          .select('*')
          .eq('available', true);
        
        if (error) throw error;
        return data || [];
      },
      () => mockMarketplaceItems
    );
  }

  static async purchaseItem(itemId: string) {
    return withFallback(
      async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { data, error } = await supabase.functions.invoke('stripe-checkout', {
          body: {
            item_id: itemId,
            user_id: user.id
          }
        });

        if (error) throw error;
        return data;
      },
      () => ({
        success: false,
        message: 'Purchase temporarily unavailable. Please try again later.',
        mock: true
      })
    );
  }
}
