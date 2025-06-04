import { useState, useCallback, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';
import { useDashboardData } from './useDashboardData';
import { useUserProfile } from './useUserProfile';
import { SelectedFilters } from '@/components/FilterPanel';

export function useDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const dashboardData = useDashboardData();
  const userProfile = useUserProfile();

  // Simplified favorite lists fetching with explicit joins
  const { data: favoriteLists = [] } = useQuery({
    queryKey: ['favorite-lists-with-items', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      console.log('🔍 Fetching favorite lists with items for user:', user.id);
      
      // First get the lists
      const { data: lists, error: listsError } = await supabase
        .from('favorite_lists')
        .select('id, name')
        .eq('user_id', user.id);
      
      if (listsError) {
        console.error('❌ Error fetching favorite lists:', listsError);
        throw listsError;
      }
      
      if (!lists || lists.length === 0) {
        console.log('📝 No favorite lists found');
        return [];
      }
      
      console.log('📝 Found favorite lists:', lists);
      
      // Then get the items for each list
      const listsWithItems = await Promise.all(
        lists.map(async (list) => {
          const { data: items, error: itemsError } = await supabase
            .from('favorite_list_items')
            .select('advisor_id')
            .eq('favorite_list_id', list.id);
          
          if (itemsError) {
            console.error(`❌ Error fetching items for list ${list.name}:`, itemsError);
            return { ...list, favorite_list_items: [] };
          }
          
          console.log(`📝 List "${list.name}" has ${items?.length || 0} items:`, items?.map(item => item.advisor_id));
          
          return {
            ...list,
            favorite_list_items: items || []
          };
        })
      );
      
      console.log('✅ Final lists with items:', listsWithItems);
      return listsWithItems;
    },
    enabled: !!user?.id,
  });

  // Fetch all reports with their advisor IDs
  const { data: userReports = [] } = useQuery({
    queryKey: ['user-reports-dashboard', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      console.log('🔍 Fetching reports for user:', user.id);
      
      const { data, error } = await supabase
        .from('reports')
        .select('id, name, advisor_ids')
        .eq('user_id', user.id);
      
      if (error) {
        console.error('❌ Error fetching reports:', error);
        throw error;
      }
      
      console.log('✅ Fetched reports with full data:', data?.map(r => ({ 
        id: r.id, 
        name: r.name, 
        advisor_ids_count: r.advisor_ids?.length || 0,
        first_few_ids: r.advisor_ids?.slice(0, 3)
      })));
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Function to get advisor IDs for selected favorite list NAMES
  const getFavoriteAdvisorIds = useCallback((selectedListNames: string[]) => {
    if (selectedListNames.length === 0) return [];
    
    console.log('🔍 Getting advisor IDs for favorite list names:', selectedListNames);
    console.log('🔍 Available favorite lists:', favoriteLists.map(list => ({ id: list.id, name: list.name })));
    
    const advisorIds = favoriteLists
      .filter(list => {
        const isMatch = selectedListNames.includes(list.name);
        console.log(`🔍 Checking list "${list.name}" against selected names:`, selectedListNames, 'Match:', isMatch);
        return isMatch;
      })
      .flatMap(list => {
        const advisorIds = list.favorite_list_items?.map(item => item.advisor_id) || [];
        console.log(`🔍 List "${list.name}" has advisor IDs:`, advisorIds);
        return advisorIds;
      });
    
    console.log('✅ Found advisor IDs from favorite lists:', advisorIds);
    return advisorIds;
  }, [favoriteLists]);

  // Function to get advisor IDs for selected report NAMES
  const getReportAdvisorIds = useCallback((selectedReportNames: string[]) => {
    if (selectedReportNames.length === 0) return [];
    
    console.log('🔍 Getting advisor IDs for report names:', selectedReportNames);
    console.log('🔍 Available reports with detailed info:', userReports.map(report => ({ 
      id: report.id, 
      name: report.name, 
      advisor_ids_count: report.advisor_ids?.length || 0,
      advisor_ids_sample: report.advisor_ids?.slice(0, 3)
    })));
    
    const matchingReports = userReports.filter(report => {
      const isMatch = selectedReportNames.includes(report.name);
      console.log(`🔍 Checking report "${report.name}" against selected names:`, selectedReportNames, 'Match:', isMatch);
      console.log(`🔍 Report "${report.name}" has ${report.advisor_ids?.length || 0} advisor IDs`);
      return isMatch;
    });
    
    const advisorIds = matchingReports.flatMap(report => {
      const ids = report.advisor_ids || [];
      console.log(`🔍 Report "${report.name}" contributing ${ids.length} advisor IDs:`, ids.slice(0, 5));
      return ids;
    });
    
    console.log('✅ Found advisor IDs from reports:', advisorIds.length, 'total IDs');
    return advisorIds;
  }, [userReports]);

  // NEW: Function to get advisor IDs based on current filters
  const getAdvisorIdsFromFilters = useCallback((selectedFilters: SelectedFilters) => {
    const favoriteIds = getFavoriteAdvisorIds(selectedFilters.favoriteLists || []);
    const reportIds = getReportAdvisorIds(selectedFilters.reports || []);
    
    console.log('🔍 getAdvisorIdsFromFilters:', {
      selectedFavoriteLists: selectedFilters.favoriteLists,
      selectedReports: selectedFilters.reports,
      favoriteIds: favoriteIds.length,
      reportIds: reportIds.length
    });
    
    return { favoriteIds, reportIds };
  }, [getFavoriteAdvisorIds, getReportAdvisorIds]);

  const saveReportMutation = useMutation({
    mutationFn: async ({
      name,
      description,
      filters,
      advisorIds
    }: {
      name: string;
      description: string;
      filters: SelectedFilters;
      advisorIds: string[];
    }) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('reports')
        .insert({
          name,
          description,
          search_filters: filters as any, // Convert to JSON
          advisor_ids: advisorIds,
          user_id: user.id
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Invalidate all report-related queries including the specific ones used by FilterPanelData
      queryClient.invalidateQueries({ queryKey: ['user-reports'] });
      queryClient.invalidateQueries({ queryKey: ['user-reports-combined'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      queryClient.invalidateQueries({ queryKey: ['user-reports-filter', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['user-reports-dashboard', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['filter-options-optimized'] });
      queryClient.invalidateQueries({ queryKey: ['filter-options'] });
      
      // Also invalidate the dashboard filter data queries
      queryClient.invalidateQueries({ queryKey: ['favorite-lists-with-items', user?.id] });
      
      toast({
        title: "Success",
        description: "Report saved successfully",
      });
    },
    onError: (error: Error) => {
      logger.error('Error saving report', {
        error,
        component: 'useDashboard',
        operation: 'save_report'
      });
      toast({
        title: "Error",
        description: error.message || "Failed to save report",
        variant: "destructive",
      });
    },
  });

  const handleSaveAsReport = useCallback(async (
    name: string,
    description: string,
    filters: SelectedFilters,
    advisorIds: string[]
  ) => {
    await saveReportMutation.mutateAsync({
      name,
      description,
      filters,
      advisorIds
    });
  }, [saveReportMutation]);

  return {
    data: dashboardData.data,
    profile: userProfile.data,
    // UPDATED: Remove the state variables and provide the functions instead
    getFavoriteAdvisorIds,
    getReportAdvisorIds,
    getAdvisorIdsFromFilters, // NEW: Helper function
    saveReportMutation: handleSaveAsReport,
    isLoading: dashboardData.isLoading || userProfile.isLoading,
    // Expose the raw data for debugging
    favoriteLists,
    userReports
  };
}
