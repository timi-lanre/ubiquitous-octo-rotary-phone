
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/utils/logger';

export function useDashboardData() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['dashboard-stats', user?.id],
    queryFn: async () => {
      try {
        const [advisorsResult, favoritesResult, reportsResult] = await Promise.all([
          supabase.from('advisors').select('*', { count: 'exact', head: true }),
          user?.id ? supabase
            .from('favorite_lists')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id) : { count: 0, error: null },
          user?.id ? supabase
            .from('reports')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id) : { count: 0, error: null },
        ]);

        // Check for errors in any of the queries
        if (advisorsResult.error) {
          throw new Error(`Failed to fetch advisors count: ${advisorsResult.error.message}`);
        }
        if (favoritesResult.error) {
          throw new Error(`Failed to fetch favorites count: ${favoritesResult.error.message}`);
        }
        if (reportsResult.error) {
          throw new Error(`Failed to fetch reports count: ${reportsResult.error.message}`);
        }

        return {
          totalAdvisors: advisorsResult.count || 0,
          totalFavorites: favoritesResult.count || 0,
          totalReports: reportsResult.count || 0,
        };
      } catch (error) {
        logger.error('Error fetching dashboard stats', {
          error: error as Error,
          component: 'useDashboardData',
          operation: 'fetch_dashboard_stats',
          userId: user?.id
        });
        
        // Return fallback data instead of throwing
        return {
          totalAdvisors: 0,
          totalFavorites: 0,
          totalReports: 0,
        };
      }
    },
    enabled: true,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error: any) => {
      if (error?.status >= 400 && error?.status < 500) {
        return false;
      }
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
  });
}
