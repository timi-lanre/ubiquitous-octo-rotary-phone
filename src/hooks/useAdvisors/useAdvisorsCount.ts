import { useQuery } from '@tanstack/react-query';
import { buildCountQuery } from './queryBuilders';
import { SelectedFilters } from './types';
import { logger } from '@/utils/logger';

export function useAdvisorsCount(
  searchQuery: string,
  selectedFilters: SelectedFilters,
  favoriteAdvisorIds: string[] = [],
  reportAdvisorIds: string[] = []
) {
  return useQuery({
    queryKey: ['advisors-count', searchQuery, selectedFilters, favoriteAdvisorIds, reportAdvisorIds],
    queryFn: async () => {
      console.log('🔍 Fetching advisor count with:', {
        searchQuery,
        favoriteIds: favoriteAdvisorIds.length,
        reportIds: reportAdvisorIds.length,
        filters: selectedFilters
      });
      
      console.log('🔍 Executing count query...');
      const countQuery = buildCountQuery(searchQuery, selectedFilters, favoriteAdvisorIds, reportAdvisorIds);
      const { count, error } = await countQuery;
      
      if (error) {
        logger.error('Error fetching advisor count', { 
          error: error.message, 
          context: 'useAdvisorsCount',
          searchQuery,
          favoriteIds: favoriteAdvisorIds.length,
          reportIds: reportAdvisorIds.length
        });
        console.error('❌ Count query error:', error);
        return 0;
      }
      
      console.log('✅ Count query result:', count);
      logger.debug('Fetched advisor count', { count, context: 'useAdvisorsCount' });
      return count || 0;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
