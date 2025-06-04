
import { useAdvisorsCount } from './useAdvisorsCount';
import { useAdvisorsInfinite } from './useAdvisorsInfinite';
import { UseAdvisorsProps } from './types';

export function useAdvisors({
  sortField,
  sortDirection,
  searchQuery,
  selectedFilters,
  getFavoriteAdvisorIds,
  getReportAdvisorIds
}: UseAdvisorsProps) {
  console.log('🎯 useAdvisors called with sort parameters:', { sortField, sortDirection });
  
  // Get filtered advisor IDs based on selected filters
  const favoriteAdvisorIds = getFavoriteAdvisorIds ? getFavoriteAdvisorIds(selectedFilters.favoriteLists) : [];
  const reportAdvisorIds = getReportAdvisorIds ? getReportAdvisorIds(selectedFilters.reports) : [];
  
  // Get filtered count - pass parameters separately
  const { data: totalCount, error: countError } = useAdvisorsCount(
    searchQuery,
    selectedFilters,
    favoriteAdvisorIds,
    reportAdvisorIds
  );

  // Get paginated data - pass parameters separately including sort parameters
  const infiniteQuery = useAdvisorsInfinite(
    searchQuery,
    selectedFilters,
    favoriteAdvisorIds,
    reportAdvisorIds,
    sortField,
    sortDirection
  );

  return {
    ...infiniteQuery,
    totalCount,
    countError
  };
}

// Re-export types and hooks for convenience
export type { SortField, SortDirection, SelectedFilters, UseAdvisorsProps } from './types';
export { useAllAdvisorIds } from './useAllAdvisorIds';
