
import { useState, useCallback } from 'react';
import { cache, invalidateAdvisorData } from '@/utils/cacheUtils';
import { debounce } from 'lodash-es';

export interface SelectedFilters {
  provinces: string[];
  cities: string[];
  firms: string[];
  branches: string[];
  teams: string[];
  favoriteLists: string[];
  reports: string[];
}

type SortField = 'first_name' | 'last_name' | 'firm' | 'city' | 'province' | 'title' | 'branch' | 'team_name';
type SortDirection = 'asc' | 'desc';

export function useDashboardFilters() {
  const [sortField, setSortField] = useState<SortField>('first_name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilters, setSelectedFilters] = useState<SelectedFilters>({
    provinces: [],
    cities: [],
    firms: [],
    branches: [],
    teams: [],
    favoriteLists: [],
    reports: []
  });

  // Optimized debounced search with faster response
  const debouncedInvalidateAdvisorData = useCallback(
    debounce(() => {
      invalidateAdvisorData();
    }, 300), // Reduced from 500ms for snappier response
    []
  );

  const handleSort = (field: SortField) => {
    console.log('🔄 Sorting triggered for field:', field);
    console.log('Current sort:', { sortField, sortDirection });
    
    if (sortField === field) {
      const newDirection = sortDirection === 'asc' ? 'desc' : 'asc';
      console.log('Same field, toggling direction to:', newDirection);
      setSortDirection(newDirection);
    } else {
      console.log('New field, setting to asc');
      setSortField(field);
      setSortDirection('asc');
    }
    
    // Only invalidate advisor pages, not all cache
    console.log('Invalidating advisor data for sort change');
    invalidateAdvisorData();
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    // Debounced invalidation to reduce queries during typing
    debouncedInvalidateAdvisorData();
  };

  const handleApplyFilters = (filters: SelectedFilters) => {
    console.log('🎯 Applying filters in dashboard:', filters);
    setSelectedFilters(filters);
    // Only invalidate relevant advisor data
    invalidateAdvisorData();
  };

  const hasAppliedFilters = Object.values(selectedFilters).some(filters => filters.length > 0) || searchQuery.trim() !== '';

  return {
    sortField,
    sortDirection,
    searchQuery,
    selectedFilters,
    hasAppliedFilters,
    handleSort,
    handleSearchChange,
    handleApplyFilters
  };
}
