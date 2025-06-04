
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { SelectedFilters } from '@/hooks/useDashboardFilters';

export function useReportDuplicateCheck(filters: SelectedFilters, enabled: boolean = false) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['report-duplicate-check', user?.id, filters],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('reports')
        .select('id, name, search_filters')
        .eq('user_id', user.id);

      if (error) throw error;

      // Find reports with similar filters
      const filtersString = JSON.stringify(filters);
      const similarReports = data?.filter(report => {
        if (!report.search_filters) return false;
        const reportFiltersString = JSON.stringify(report.search_filters);
        return reportFiltersString === filtersString;
      }) || [];

      return similarReports;
    },
    enabled: enabled && !!user?.id,
    staleTime: 30 * 1000, // 30 seconds
  });
}
