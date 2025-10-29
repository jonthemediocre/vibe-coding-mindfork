import { supabase } from '@/lib/supabase';
import type { Database } from '../types/supabase';
import type {
  FastingSession,
  StartFastingInput,
  EndFastingInput,
  ApiResponse,
} from '../types/models';
import { apiInterceptor } from '../utils/api-interceptor';

type FastingSessionInsert = Database['public']['Tables']['fasting_sessions']['Insert'];
type FastingSessionUpdate = Database['public']['Tables']['fasting_sessions']['Update'];

export class FastingService {
  /**
   * Start a new fasting session
   */
  static async startFasting(
    userId: string,
    input: StartFastingInput
  ): Promise<ApiResponse<FastingSession>> {
    return apiInterceptor.instrumentRequest(
      '/fasting/start',
      'POST',
      async () => {
        try {
          // Check if there's already an active session
          const { data: activeSessions } = await supabase
            .from('fasting_sessions')
            .select('*')
            .eq('user_id', userId)
            .eq('status', 'active')
            .limit(1);

          if (activeSessions && activeSessions.length > 0) {
            return { error: 'You already have an active fasting session' };
          }

          const session: FastingSessionInsert = {
            user_id: userId,
            start_time: new Date().toISOString(),
            target_duration_hours: input.target_duration_hours,
            status: 'active',
          };

          const { data, error } = await supabase
            .from('fasting_sessions')
            // @ts-ignore - Supabase type inference issue
            .insert(session)
            .select()
            .single<FastingSession>();

          if (error) {
            return { error: error.message };
          }

          return { data };
        } catch (err) {
          return { error: err instanceof Error ? err.message : 'Failed to start fasting session' };
        }
      }
    );
  }

  /**
   * End the current fasting session
   */
  static async endFasting(
    userId: string,
    input: EndFastingInput
  ): Promise<ApiResponse<FastingSession>> {
    try {
      const endTime = new Date();

      // Get the session to calculate actual duration
      const { data: session, error: fetchError } = await supabase
        .from('fasting_sessions')
        .select('*')
        .eq('id', input.session_id)
        .eq('user_id', userId)
        .single<FastingSession>();

      if (fetchError || !session) {
        return { error: 'Fasting session not found' };
      }

      const startTime = new Date(session.start_time);
      const actualDurationHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);

      const updateData: FastingSessionUpdate = {
        end_time: endTime.toISOString(),
        actual_duration_hours: actualDurationHours,
        status: 'completed',
        updated_at: new Date().toISOString(),
      };

      const { data, error} = await supabase
        .from('fasting_sessions')
        // @ts-ignore - Supabase type inference issue
        .update(updateData)
        .eq('id', input.session_id)
        .eq('user_id', userId)
        .select()
        .single<FastingSession>();

      if (error) {
        return { error: error.message };
      }

      return { data };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Failed to end fasting session' };
    }
  }

  /**
   * Cancel an active fasting session
   */
  static async cancelFasting(userId: string, sessionId: string): Promise<ApiResponse<void>> {
    try {
      const updateData: FastingSessionUpdate = {
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('fasting_sessions')
        // @ts-ignore - Supabase type inference issue
        .update(updateData)
        .eq('id', sessionId)
        .eq('user_id', userId)
        .eq('status', 'active');

      if (error) {
        return { error: error.message };
      }

      return { message: 'Fasting session cancelled' };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Failed to cancel fasting session' };
    }
  }

  /**
   * Get the current active fasting session
   */
  static async getActiveFastingSession(
    userId: string
  ): Promise<ApiResponse<FastingSession | null>> {
    try {
      const { data, error } = await supabase
        .from('fasting_sessions')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('start_time', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        return { error: error.message };
      }

      return { data: data || null };
    } catch (err) {
      return {
        error: err instanceof Error ? err.message : 'Failed to fetch active fasting session',
      };
    }
  }

  /**
   * Get fasting history
   */
  static async getFastingHistory(
    userId: string,
    options?: { limit?: number; offset?: number }
  ): Promise<ApiResponse<FastingSession[]>> {
    try {
      let query = supabase
        .from('fasting_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('start_time', { ascending: false });

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      if (options?.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
      }

      const { data, error } = await query;

      if (error) {
        return { error: error.message };
      }

      return { data: data || [] };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Failed to fetch fasting history' };
    }
  }

  /**
   * Get fasting stats (average duration, completion rate, etc.)
   */
  static async getFastingStats(userId: string): Promise<
    ApiResponse<{
      total_sessions: number;
      completed_sessions: number;
      average_duration_hours: number;
      completion_rate: number;
      longest_fast_hours: number;
    }>
  > {
    try {
      const { data: sessions, error } = await supabase
        .from('fasting_sessions')
        .select('*')
        .eq('user_id', userId)
        .returns<FastingSession[]>();

      if (error) {
        return { error: error.message };
      }

      const completedSessions = sessions?.filter((s) => s.status === 'completed') || [];
      const totalSessions = sessions?.length || 0;

      const stats = {
        total_sessions: totalSessions,
        completed_sessions: completedSessions.length,
        average_duration_hours:
          completedSessions.reduce((sum, s) => sum + (s.actual_duration_hours || 0), 0) /
            (completedSessions.length || 1),
        completion_rate: totalSessions > 0 ? (completedSessions.length / totalSessions) * 100 : 0,
        longest_fast_hours: Math.max(
          ...completedSessions.map((s) => s.actual_duration_hours || 0),
          0
        ),
      };

      return { data: stats };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Failed to calculate fasting stats' };
    }
  }
}
