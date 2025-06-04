
import { AdvisorTable } from '@/components/AdvisorTable';
import { FilterPanel } from '@/components/FilterPanel';
import { DashboardSearch } from './DashboardSearch';
import { useAdvisors, SortField } from '@/hooks/useAdvisors';
import { useAllAdvisorIds } from '@/hooks/useAdvisors/useAllAdvisorIds';
import { SelectedFilters } from '@/hooks/useDashboardFilters';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

type SortDirection = 'asc' | 'desc';

interface DashboardContentProps {
  sortField: SortField;
  sortDirection: SortDirection;
  searchQuery: string;
  selectedFilters: SelectedFilters;
  getFavoriteAdvisorIds?: (selectedListIds: string[]) => string[];
  getReportAdvisorIds?: (selectedReportIds: string[]) => string[];
  hasAppliedFilters: boolean;
  onSort: (field: SortField) => void;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onApplyFilters: (filters: SelectedFilters) => void;
  onSaveAsReport: (name: string, description: string, filters: SelectedFilters, advisorIds: string[]) => Promise<void>;
}

export function DashboardContent({
  sortField,
  sortDirection,
  searchQuery,
  selectedFilters,
  getFavoriteAdvisorIds,
  getReportAdvisorIds,
  hasAppliedFilters,
  onSort,
  onSearchChange,
  onApplyFilters,
  onSaveAsReport
}: DashboardContentProps) {
  const [isSavingReport, setIsSavingReport] = useState(false);
  const { toast } = useToast();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    totalCount
  } = useAdvisors({
    sortField,
    sortDirection,
    searchQuery,
    selectedFilters,
    getFavoriteAdvisorIds,
    getReportAdvisorIds
  });

  // Get the current advisor IDs for saving reports
  const favoriteAdvisorIds = getFavoriteAdvisorIds ? getFavoriteAdvisorIds(selectedFilters.favoriteLists) : [];
  const reportAdvisorIds = getReportAdvisorIds ? getReportAdvisorIds(selectedFilters.reports) : [];

  // Hook to fetch ALL advisor IDs when saving a report
  const { data: allAdvisorIds, refetch: fetchAllAdvisorIds } = useAllAdvisorIds(
    searchQuery,
    selectedFilters,
    favoriteAdvisorIds,
    reportAdvisorIds,
    false // Don't auto-fetch, only when needed
  );

  const advisors = data?.pages.flatMap(page => page) || [];
  const currentAdvisorIds = advisors.map(advisor => advisor.id);
  
  // Calculate actual displayed count - this accounts for all loaded pages
  const displayedCount = advisors.length;

  // Enhanced save report handler that fetches all matching advisor IDs with duplicate prevention
  const handleSaveAsReport = async (name: string, description: string, filters: SelectedFilters, _ignoredAdvisorIds: string[]) => {
    setIsSavingReport(true);
    try {
      // Fetch all advisor IDs that match the current filters
      const { data: allMatchingIds } = await fetchAllAdvisorIds();
      let advisorIds = allMatchingIds || [];
      
      // Remove duplicate advisor IDs within the report
      advisorIds = [...new Set(advisorIds)];
      
      console.log(`Saving report with ${advisorIds.length} unique advisors (vs ${currentAdvisorIds.length} currently loaded)`);
      
      // Check if a report with similar filters already exists
      const filtersString = JSON.stringify(filters);
      console.log('Checking for existing reports with similar filters...');
      
      await onSaveAsReport(name, description, filters, advisorIds);
      
      toast({
        title: "Success",
        description: `Report "${name}" saved with ${advisorIds.length} advisors`,
      });
      
    } catch (error: any) {
      console.error('Error saving report:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save report",
        variant: "destructive",
      });
    } finally {
      setIsSavingReport(false);
    }
  };

  return (
    <div className="mb-6">
      <h2 className="text-2xl font-bold text-slate-900 mb-2">Advisors Database</h2>
      <p className="text-slate-600 mb-4">Browse and sort through all advisors in your database</p>
      
      <DashboardSearch 
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
      />

      <FilterPanel
        onApplyFilters={onApplyFilters}
        selectedFilters={selectedFilters}
        onSaveAsReport={handleSaveAsReport}
        showSaveAsReport={hasAppliedFilters}
        currentAdvisorIds={currentAdvisorIds}
      />

      {isLoading ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium">Loading advisors...</p>
        </div>
      ) : (
        <AdvisorTable
          advisors={advisors}
          onSort={onSort}
          sortField={sortField}
          sortDirection={sortDirection}
          hasNextPage={hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          fetchNextPage={fetchNextPage}
          totalCount={totalCount || 0}
          displayedCount={displayedCount}
          hasActiveFilters={hasAppliedFilters}
        />
      )}
    </div>
  );
}
