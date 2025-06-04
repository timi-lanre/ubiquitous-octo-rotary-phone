
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/utils/logger';

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterOptions {
  provinces: string[];
  cities: string[];
  firms: string[];
  branches: string[];
  teams: string[];
  favoriteLists: Array<{ id: string; name: string }>;
  reports: Array<{ id: string; name: string }>;
}

interface RpcFilterResponse {
  provinces?: string[];
  cities?: string[];
  firms?: string[];
  branches?: string[];
  teams?: string[];
}

export function useFilterData() {
  const { user } = useAuth();

  // Fetch filter options with proper error handling
  const { data: filterOptions = {}, isLoading: isLoadingFilters } = useQuery({
    queryKey: ['filter-options-optimized'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase.rpc('get_cascading_filter_options_optimized');
        
        if (error) {
          throw new Error(`Failed to fetch filter options: ${error.message}`);
        }
        
        // Type assertion for the RPC response
        const typedData = data as RpcFilterResponse | null;
        
        return typedData || {
          provinces: [],
          cities: [],
          firms: [],
          branches: [],
          teams: []
        };
      } catch (error) {
        logger.error('Error fetching filter options', {
          error: error as Error,
          component: 'FilterPanelData',
          operation: 'fetch_filter_options'
        });
        
        // Return empty options as fallback
        return {
          provinces: [],
          cities: [],
          firms: [],
          branches: [],
          teams: []
        };
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error: any) => {
      if (error?.status >= 400 && error?.status < 500) {
        return false;
      }
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
  });

  // Fetch user's favorite lists with proper error handling
  const { data: favoriteLists = [] } = useQuery({
    queryKey: ['user-lists-filter', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      try {
        const { data, error } = await supabase
          .from('favorite_lists')
          .select('id, name')
          .eq('user_id', user.id)
          .order('name');
        
        if (error) {
          throw new Error(`Failed to fetch favorite lists: ${error.message}`);
        }
        
        return data || [];
      } catch (error) {
        logger.error('Error fetching favorite lists', {
          error: error as Error,
          component: 'FilterPanelData',
          operation: 'fetch_favorite_lists',
          userId: user?.id
        });
        
        return [];
      }
    },
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: (failureCount, error: any) => {
      if (error?.status >= 400 && error?.status < 500) {
        return false;
      }
      return failureCount < 2;
    },
  });

  // Fetch user's reports with proper error handling
  const { data: reports = [] } = useQuery({
    queryKey: ['user-reports-filter', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      try {
        const { data, error } = await supabase
          .from('reports')
          .select('id, name')
          .eq('user_id', user.id)
          .order('name');
        
        if (error) {
          throw new Error(`Failed to fetch reports: ${error.message}`);
        }
        
        return data || [];
      } catch (error) {
        logger.error('Error fetching reports', {
          error: error as Error,
          component: 'FilterPanelData',
          operation: 'fetch_reports',
          userId: user?.id
        });
        
        return [];
      }
    },
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: (failureCount, error: any) => {
      if (error?.status >= 400 && error?.status < 500) {
        return false;
      }
      return failureCount < 2;
    },
  });

  // Combine all data into the expected format
  const combinedFilterOptions: FilterOptions = {
    provinces: filterOptions.provinces || [],
    cities: filterOptions.cities || [],
    firms: filterOptions.firms || [],
    branches: filterOptions.branches || [],
    teams: filterOptions.teams || [],
    favoriteLists: favoriteLists,
    reports: reports,
  };

  return {
    filterOptions: combinedFilterOptions,
    isLoading: isLoadingFilters,
  };
}

// Keep the old hook name for backward compatibility
export const useFilterPanelData = useFilterData;
