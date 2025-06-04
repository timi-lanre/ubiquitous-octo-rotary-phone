
import { useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { buildQuery } from './queryBuilders';
import { applySortWithNullHandling } from '@/utils/sortingUtils';
import { logger } from '@/utils/logger';
import { SelectedFilters } from './types';

export function useAdvisorsInfinite(
  searchQuery: string,
  selectedFilters: SelectedFilters,
  favoriteAdvisorIds: string[] = [],
  reportAdvisorIds: string[] = [],
  sortField: string = 'first_name',
  sortDirection: 'asc' | 'desc' = 'asc'
) {
  console.log('🔍 useAdvisorsInfinite called with:', {
    sortField,
    sortDirection,
    favoriteIds: favoriteAdvisorIds.length,
    reportIds: reportAdvisorIds.length,
    totalFilters: Object.values(selectedFilters).flat().length
  });
  
  return useInfiniteQuery({
    queryKey: ['advisors-infinite', searchQuery, selectedFilters, favoriteAdvisorIds, reportAdvisorIds, sortField, sortDirection],
    queryFn: async ({ pageParam = 0 }) => {
      logger.debug('Fetching advisor page', { 
        pageParam, 
        search: searchQuery, 
        filters: selectedFilters,
        favoriteAdvisorIds: favoriteAdvisorIds.length,
        reportAdvisorIds: reportAdvisorIds.length,
        sortField,
        sortDirection,
        context: 'useAdvisorsInfinite'
      });
      
      const from = pageParam;
      const to = pageParam === 0 ? 39 : pageParam + 99; // First page: 40 rows, subsequent: 100 rows
      
      console.log('🔍 Building query for page:', { from, to, pageParam });
      
      const query = buildQuery(searchQuery, selectedFilters, favoriteAdvisorIds, reportAdvisorIds);
      
      if (!query) {
        console.log('❌ No query built, returning empty array');
        return [];
      }
      
      // Apply sorting with proper null handling
      console.log('🎯 Applying sort to query:', { sortField, sortDirection });
      const sortedQuery = applySortWithNullHandling(query, sortField, sortDirection);
      
      console.log('🔍 Executing query with range:', { from, to });
      const { data, error, count } = await sortedQuery.range(from, to);
      
      if (error) {
        logger.error('Error fetching advisors', { error: error.message, context: 'useAdvisorsInfinite' });
        console.error('❌ Query error:', error);
        return [];
      }
      
      logger.debug('Fetched advisor data', { count: data?.length, context: 'useAdvisorsInfinite' });
      console.log('✅ Query returned data:', {
        count: data?.length,
        firstAdvisor: data?.[0] ? `${data[0].first_name} ${data[0].last_name}` : 'None',
        totalCount: count
      });
      
      return data || [];
    },
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length === 0) return undefined;
      
      // Calculate the next starting point
      if (allPages.length === 1) {
        // First page had 40 items, next should start at 40
        return lastPage.length < 40 ? undefined : 40;
      } else {
        // Subsequent pages have 100 items each
        const nextStart = 40 + (allPages.length - 1) * 100;
        return lastPage.length < 100 ? undefined : nextStart;
      }
    },
    initialPageParam: 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}
