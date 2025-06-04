
import { useQuery } from '@tanstack/react-query';
import { buildQuery } from './queryBuilders';
import { SelectedFilters } from './types';
import { logger } from '@/utils/logger';

export function useAllAdvisorIds(
  searchQuery: string,
  selectedFilters: SelectedFilters,
  favoriteAdvisorIds: string[] = [],
  reportAdvisorIds: string[] = [],
  enabled: boolean = false
) {
  return useQuery({
    queryKey: ['all-advisor-ids', searchQuery, selectedFilters, favoriteAdvisorIds, reportAdvisorIds],
    queryFn: async () => {
      logger.debug('Fetching all advisor IDs that match filters', { 
        search: searchQuery, 
        filters: selectedFilters,
        favoriteAdvisorIds,
        reportAdvisorIds,
        context: 'useAllAdvisorIds'
      });
      
      const query = buildQuery(searchQuery, selectedFilters, favoriteAdvisorIds, reportAdvisorIds);
      
      if (!query) return [];
      
      // Only select the ID to minimize data transfer
      const { data, error } = await query.select('id');
      
      if (error) {
        logger.error('Error fetching all advisor IDs', { error: error.message, context: 'useAllAdvisorIds' });
        throw error;
      }
      
      const advisorIds = data?.map(advisor => advisor.id) || [];
      logger.debug('Fetched all matching advisor IDs', { count: advisorIds.length, context: 'useAllAdvisorIds' });
      return advisorIds;
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
