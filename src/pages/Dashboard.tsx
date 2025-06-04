
import { DashboardHeader } from '@/components/DashboardHeader';
import { DashboardContent } from '@/components/Dashboard/DashboardContent';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useDashboardFilters, SelectedFilters } from '@/hooks/useDashboardFilters';
import { useDashboard } from '@/hooks/useDashboard';
import { useCallback } from 'react';

export default function Dashboard() {
  const {
    sortField,
    sortDirection,
    searchQuery,
    selectedFilters,
    hasAppliedFilters,
    handleSort,
    handleSearchChange,
    handleApplyFilters
  } = useDashboardFilters();

  const {
    data: dashboardStats,
    profile,
    getFavoriteAdvisorIds,
    getReportAdvisorIds,
    saveReportMutation,
    isLoading
  } = useDashboard();

  const handleSaveAsReport = useCallback(async (
    name: string,
    description: string,
    filters: SelectedFilters,
    advisorIds: string[]
  ) => {
    await saveReportMutation(name, description, filters, advisorIds);
  }, [saveReportMutation]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <DashboardHeader profile={profile} />

      <main className="px-2 lg:px-4 pb-12 pt-6">
        <div className="w-full max-w-none">
          <DashboardContent
            sortField={sortField}
            sortDirection={sortDirection}
            searchQuery={searchQuery}
            selectedFilters={selectedFilters}
            getFavoriteAdvisorIds={getFavoriteAdvisorIds}
            getReportAdvisorIds={getReportAdvisorIds}
            hasAppliedFilters={hasAppliedFilters}
            onSort={handleSort}
            onSearchChange={handleSearchChange}
            onApplyFilters={handleApplyFilters}
            onSaveAsReport={handleSaveAsReport}
          />
        </div>
      </main>
    </div>
  );
}
