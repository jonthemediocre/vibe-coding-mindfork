import { FoodService } from '../FoodService';
import { supabase } from '../../lib/supabase';

// Mock logger
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    withCorrelationId: jest.fn(() => ({
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    })),
  },
}));

// Mock Supabase
jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
    auth: {
      getUser: jest.fn(),
    },
  },
}));

describe('FoodService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getFoodEntries', () => {
    it('should fetch food entries for a user', async () => {
      const mockData = [
        {
          id: '1',
          user_id: 'user-123',
          name: 'Chicken Breast',
          serving: '100g',
          calories: 165,
          protein: 31,
          carbs: 0,
          fat: 3.6,
        },
      ];

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        returns: jest.fn().mockResolvedValue({ data: mockData, error: null }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      const result = await FoodService.getFoodEntries('user-123');

      expect(supabase.from).toHaveBeenCalledWith('food_entries');
      expect(mockQuery.select).toHaveBeenCalledWith('*');
      expect(mockQuery.eq).toHaveBeenCalledWith('user_id', 'user-123');
      expect(mockQuery.order).toHaveBeenCalledWith('logged_at', { ascending: false });
      expect(result.data).toEqual(mockData);
      expect(result.error).toBeUndefined();
    });

    it('should handle errors gracefully', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        returns: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      const result = await FoodService.getFoodEntries('user-123');

      expect(result.error).toBe('Database error');
      expect(result.data).toBeUndefined();
    });
  });

  describe('createFoodEntry', () => {
    it('should create a new food entry', async () => {
      const mockEntry = {
        id: 'new-entry',
        user_id: 'user-123',
        name: 'Apple',
        serving: '1 medium',
        calories: 95,
        protein: 0.5,
        carbs: 25,
        fat: 0.3,
        logged_at: '2025-09-30T12:00:00Z',
      };

      const mockQuery = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockEntry, error: null }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      const result = await FoodService.createFoodEntry('user-123', {
        name: 'Apple',
        serving: '1 medium',
        calories: 95,
        protein: 0.5,
        carbs: 25,
        fat: 0.3,
      });

      expect(supabase.from).toHaveBeenCalledWith('food_entries');
      expect(mockQuery.insert).toHaveBeenCalled();
      expect(result.data).toEqual(mockEntry);
    });
  });

  describe('getDailyStats', () => {
    it('should calculate daily nutrition stats', async () => {
      const mockEntries = [
        {
          id: '1',
          calories: 500,
          protein: 30,
          carbs: 50,
          fat: 15,
          fiber: 5,
        },
        {
          id: '2',
          calories: 400,
          protein: 25,
          carbs: 40,
          fat: 10,
          fiber: 3,
        },
      ];

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        returns: jest.fn().mockResolvedValue({ data: mockEntries, error: null }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      const result = await FoodService.getDailyStats('user-123', '2025-09-30');

      expect(result.data).toBeDefined();
      expect(result.data?.total_calories).toBe(900);
      expect(result.data?.total_protein).toBe(55);
      expect(result.data?.total_carbs).toBe(90);
      expect(result.data?.total_fat).toBe(25);
      expect(result.data?.total_fiber).toBe(8);
      expect(result.data?.meal_count).toBe(2);
    });
  });
});
