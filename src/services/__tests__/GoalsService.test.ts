import { GoalsService } from '../GoalsService';
import { supabase } from '../../lib/supabase';
import { goalFactory } from '../../__tests__/factories';

jest.mock('../../lib/supabase');

describe('GoalsService', () => {
  const mockUserId = 'user-123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getGoals', () => {
    it('should fetch all goals for user', async () => {
      const mockGoals = [
        goalFactory({ id: 'goal-1', title: 'Weight Loss' }),
        goalFactory({ id: 'goal-2', title: 'Build Muscle' }),
      ];

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockGoals, error: null }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockQueryBuilder);

      const result = await GoalsService.getGoals(mockUserId);

      expect(supabase.from).toHaveBeenCalledWith('goals');
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('user_id', mockUserId);
      expect(result.data).toEqual(mockGoals);
    });

    it('should filter by status', async () => {
      const mockActiveGoals = [goalFactory({ status: 'active' })];

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockActiveGoals, error: null }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockQueryBuilder);

      const result = await GoalsService.getGoals(mockUserId, 'active');

      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('status', 'active');
      expect(result.data).toEqual(mockActiveGoals);
    });
  });

  describe('createGoal', () => {
    it('should create new goal', async () => {
      const newGoal = {
        title: 'Lose 20 lbs',
        type: 'weight' as const,
        target_value: 180,
        current_value: 200,
        target_date: '2025-12-31',
      };

      const mockCreatedGoal = goalFactory(newGoal);

      const mockQueryBuilder = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockCreatedGoal, error: null }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockQueryBuilder);

      const result = await GoalsService.createGoal(mockUserId, newGoal);

      expect(mockQueryBuilder.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: mockUserId,
          ...newGoal,
        })
      );
      expect(result.data).toEqual(mockCreatedGoal);
    });

    it('should validate target_value > current_value', async () => {
      const invalidGoal = {
        title: 'Invalid Goal',
        type: 'weight' as const,
        target_value: 200,
        current_value: 180, // Already below target
        target_date: '2025-12-31',
      };

      const result = await GoalsService.createGoal(mockUserId, invalidGoal);

      expect(result.error).toContain('Target value');
      expect(result.data).toBeUndefined();
    });
  });

  describe('updateGoalProgress', () => {
    it('should update goal current value', async () => {
      const mockUpdatedGoal = goalFactory({ 
        current_value: 190,
        progress: 50,
      });

      const mockQueryBuilder = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockUpdatedGoal, error: null }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockQueryBuilder);

      const result = await GoalsService.updateGoalProgress('goal-1', 190);

      expect(mockQueryBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          current_value: 190,
        })
      );
      expect(result.data).toEqual(mockUpdatedGoal);
    });

    it('should calculate progress percentage', async () => {
      // Goal: 200 -> 180 (20 lbs to lose)
      // Current: 190 (10 lbs lost, 50% progress)
      const mockGoal = goalFactory({
        target_value: 180,
        current_value: 200,
      });

      const mockGetBuilder = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockGoal, error: null }),
      };

      const mockUpdateBuilder = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { ...mockGoal, current_value: 190, progress: 50 },
          error: null,
        }),
      };

      (supabase.from as jest.Mock)
        .mockReturnValueOnce(mockGetBuilder)
        .mockReturnValueOnce(mockUpdateBuilder);

      const result = await GoalsService.updateGoalProgress('goal-1', 190);

      expect(mockUpdateBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          progress: expect.any(Number),
        })
      );
    });
  });

  describe('deleteGoal', () => {
    it('should delete goal', async () => {
      const mockQueryBuilder = {
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockQueryBuilder);

      const result = await GoalsService.deleteGoal('goal-1');

      expect(mockQueryBuilder.delete).toHaveBeenCalled();
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('id', 'goal-1');
      expect(result.error).toBeUndefined();
    });
  });

  describe('getGoalProgress', () => {
    it('should calculate goal progress data', async () => {
      const mockGoal = goalFactory({
        target_value: 180,
        current_value: 190,
        start_date: '2025-01-01',
        target_date: '2025-12-31',
      });

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockGoal, error: null }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockQueryBuilder);

      const result = await GoalsService.getGoalProgress('goal-1');

      expect(result.data).toBeDefined();
      expect(result.data?.progress_percentage).toBeDefined();
      expect(result.data?.days_remaining).toBeDefined();
      expect(result.data?.on_track).toBeDefined();
    });
  });

  describe('updateStreak', () => {
    it('should increment streak on goal completion', async () => {
      const mockGoal = goalFactory({ streak: 5 });

      const mockQueryBuilder = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { ...mockGoal, streak: 6 },
          error: null,
        }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockQueryBuilder);

      const result = await GoalsService.updateStreak('goal-1', true);

      expect(mockQueryBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          streak: expect.any(Number),
        })
      );
    });

    it('should reset streak on goal miss', async () => {
      const mockGoal = goalFactory({ streak: 5 });

      const mockQueryBuilder = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { ...mockGoal, streak: 0 },
          error: null,
        }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockQueryBuilder);

      const result = await GoalsService.updateStreak('goal-1', false);

      expect(mockQueryBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          streak: 0,
        })
      );
    });
  });

  describe('completeGoal', () => {
    it('should mark goal as completed', async () => {
      const mockCompletedGoal = goalFactory({ status: 'completed' });

      const mockQueryBuilder = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockCompletedGoal, error: null }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockQueryBuilder);

      const result = await GoalsService.completeGoal('goal-1');

      expect(mockQueryBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'completed',
          completed_at: expect.any(String),
        })
      );
      expect(result.data?.status).toBe('completed');
    });
  });
});
