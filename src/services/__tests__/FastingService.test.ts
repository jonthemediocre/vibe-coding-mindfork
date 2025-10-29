import { FastingService } from '../FastingService';
import { supabase } from '../../lib/supabase';
import { fastingSessionFactory, completedFastingSessionFactory } from '../../__tests__/factories';

// Mock Supabase
jest.mock('../../lib/supabase');

describe('FastingService', () => {
  const mockUserId = 'user-123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getCurrentSession', () => {
    it('should fetch active fasting session for user', async () => {
      const mockSession = fastingSessionFactory();
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockSession, error: null }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockQueryBuilder);

      const result = await FastingService.getCurrentSession(mockUserId);

      expect(supabase.from).toHaveBeenCalledWith('fasting_sessions');
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('user_id', mockUserId);
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('status', 'active');
      expect(result.data).toEqual(mockSession);
      expect(result.error).toBeUndefined();
    });

    it('should return null when no active session exists', async () => {
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockQueryBuilder);

      const result = await FastingService.getCurrentSession(mockUserId);

      expect(result.data).toBeNull();
      expect(result.error).toBeUndefined();
    });

    it('should handle database errors gracefully', async () => {
      const mockError = { message: 'Database connection failed' };
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: mockError }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockQueryBuilder);

      const result = await FastingService.getCurrentSession(mockUserId);

      expect(result.error).toBe('Database connection failed');
      expect(result.data).toBeUndefined();
    });
  });

  describe('startFastingSession', () => {
    it('should create new fasting session', async () => {
      const plannedDuration = 16 * 60 * 60; // 16 hours
      const mockSession = fastingSessionFactory({ planned_duration: plannedDuration });

      const mockQueryBuilder = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockSession, error: null }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockQueryBuilder);

      const result = await FastingService.startFastingSession(mockUserId, plannedDuration);

      expect(supabase.from).toHaveBeenCalledWith('fasting_sessions');
      expect(mockQueryBuilder.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: mockUserId,
          planned_duration: plannedDuration,
          status: 'active',
        })
      );
      expect(result.data).toEqual(mockSession);
    });

    it('should prevent starting session when active session exists', async () => {
      // First call: Check for active session
      const mockActiveSession = fastingSessionFactory();
      const mockGetBuilder = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockActiveSession, error: null }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockGetBuilder);

      const result = await FastingService.startFastingSession(mockUserId, 16 * 60 * 60);

      expect(result.error).toContain('already active');
      expect(result.data).toBeUndefined();
    });

    it('should handle invalid duration', async () => {
      const result = await FastingService.startFastingSession(mockUserId, -100);

      expect(result.error).toContain('Invalid');
      expect(result.data).toBeUndefined();
    });
  });

  describe('endFastingSession', () => {
    it('should complete active fasting session', async () => {
      const mockActiveSession = fastingSessionFactory({ id: 'fasting-123' });
      const mockCompletedSession = completedFastingSessionFactory({ id: 'fasting-123' });

      const mockUpdateBuilder = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockCompletedSession, error: null }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockUpdateBuilder);

      const result = await FastingService.endFastingSession('fasting-123');

      expect(supabase.from).toHaveBeenCalledWith('fasting_sessions');
      expect(mockUpdateBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'completed',
          end_time: expect.any(String),
        })
      );
      expect(mockUpdateBuilder.eq).toHaveBeenCalledWith('id', 'fasting-123');
      expect(result.data).toEqual(mockCompletedSession);
    });

    it('should calculate actual duration when ending session', async () => {
      const startTime = new Date(Date.now() - 16 * 60 * 60 * 1000); // 16 hours ago
      const mockSession = fastingSessionFactory({
        id: 'fasting-123',
        start_time: startTime.toISOString(),
      });

      const mockUpdateBuilder = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockSession, error: null }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockUpdateBuilder);

      const result = await FastingService.endFastingSession('fasting-123');

      expect(mockUpdateBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          actual_duration: expect.any(Number),
        })
      );
    });
  });

  describe('getFastingHistory', () => {
    it('should fetch completed fasting sessions', async () => {
      const mockSessions = [
        completedFastingSessionFactory({ id: 'fasting-1' }),
        completedFastingSessionFactory({ id: 'fasting-2' }),
      ];

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({ data: mockSessions, error: null }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockQueryBuilder);

      const result = await FastingService.getFastingHistory(mockUserId, 10);

      expect(supabase.from).toHaveBeenCalledWith('fasting_sessions');
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('user_id', mockUserId);
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('status', 'completed');
      expect(mockQueryBuilder.order).toHaveBeenCalledWith('end_time', { ascending: false });
      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(10);
      expect(result.data).toEqual(mockSessions);
    });
  });

  describe('getFastingStats', () => {
    it('should calculate fasting statistics', async () => {
      const mockSessions = [
        completedFastingSessionFactory({ actual_duration: 16 * 60 * 60 }),
        completedFastingSessionFactory({ actual_duration: 18 * 60 * 60 }),
        completedFastingSessionFactory({ actual_duration: 14 * 60 * 60 }),
      ];

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockResolvedValue({ data: mockSessions, error: null }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockQueryBuilder);

      const result = await FastingService.getFastingStats(mockUserId, '2025-01-01', '2025-01-31');

      expect(result.data).toBeDefined();
      expect(result.data?.total_sessions).toBe(3);
      expect(result.data?.average_duration).toBe(16 * 60 * 60); // Average: 16 hours
      expect(result.data?.longest_fast).toBe(18 * 60 * 60);
      expect(result.data?.shortest_fast).toBe(14 * 60 * 60);
    });

    it('should handle no sessions in date range', async () => {
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockResolvedValue({ data: [], error: null }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockQueryBuilder);

      const result = await FastingService.getFastingStats(mockUserId, '2025-01-01', '2025-01-31');

      expect(result.data?.total_sessions).toBe(0);
      expect(result.data?.average_duration).toBe(0);
    });
  });

  describe('pauseFastingSession', () => {
    it('should pause active fasting session', async () => {
      const mockSession = fastingSessionFactory({ status: 'active' });

      const mockUpdateBuilder = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { ...mockSession, status: 'paused' },
          error: null,
        }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockUpdateBuilder);

      const result = await FastingService.pauseFastingSession('fasting-123');

      expect(mockUpdateBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'paused',
        })
      );
      expect(result.data?.status).toBe('paused');
    });
  });

  describe('resumeFastingSession', () => {
    it('should resume paused fasting session', async () => {
      const mockSession = fastingSessionFactory({ status: 'paused' });

      const mockUpdateBuilder = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { ...mockSession, status: 'active' },
          error: null,
        }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockUpdateBuilder);

      const result = await FastingService.resumeFastingSession('fasting-123');

      expect(mockUpdateBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'active',
        })
      );
      expect(result.data?.status).toBe('active');
    });
  });

  describe('calculateStreak', () => {
    it('should calculate current fasting streak', async () => {
      const today = new Date();
      const mockSessions = [
        completedFastingSessionFactory({ 
          end_time: today.toISOString(),
        }),
        completedFastingSessionFactory({ 
          end_time: new Date(today.getTime() - 24 * 60 * 60 * 1000).toISOString(),
        }),
        completedFastingSessionFactory({ 
          end_time: new Date(today.getTime() - 48 * 60 * 60 * 1000).toISOString(),
        }),
      ];

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockSessions, error: null }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockQueryBuilder);

      const result = await FastingService.calculateStreak(mockUserId);

      expect(result.data?.current_streak).toBeGreaterThan(0);
      expect(result.data?.longest_streak).toBeGreaterThanOrEqual(result.data?.current_streak);
    });
  });
});
