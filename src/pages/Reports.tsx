
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useState } from 'react';
import { ReportsHeader } from '@/components/ReportsHeader';
import { ReportListsView } from '@/components/ReportListsView';
import { ReportAdvisorsView } from '@/components/ReportAdvisorsView';
import { ErrorService } from '@/services/errorService';
import { logger } from '@/utils/logger';
import { useLargeReportOptimization } from '@/hooks/useAdvisors/useLargeReportOptimization';

const ADVISORS_PER_PAGE = 50;

export default function Reports() {
  const { user } = useAuth();
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [selectedReportName, setSelectedReportName] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const { processLargeAdvisorList, isProcessing, progress } = useLargeReportOptimization();

  // Fetch user's reports with proper error handling
  const { data: reports = [] } = useQuery({
    queryKey: ['reports', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      try {
        const { data, error } = await supabase
          .from('reports')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        
        if (error) {
          throw new Error(`Failed to fetch reports: ${error.message}`);
        }
        
        logger.info('Reports fetched successfully', { count: data?.length, userId: user.id });
        return data || [];
      } catch (error) {
        ErrorService.logError(error as Error, {
          component: 'Reports',
          operation: 'fetch_reports',
          userId: user?.id
        });
        
        // Return empty array as fallback
        return [];
      }
    },
    enabled: !!user?.id,
    retry: (failureCount, error: any) => {
      if (error?.status >= 400 && error?.status < 500) {
        return false;
      }
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
  });

  // Get selected report data
  const selectedReport = reports.find(r => r.id === selectedReportId);

  // Enhanced fetch advisors for selected report with large list optimization
  const { data: reportAdvisors = [], isLoading: isLoadingAdvisors, error: advisorsError } = useQuery({
    queryKey: ['report-advisors', selectedReportId, currentPage],
    queryFn: async () => {
      if (!selectedReportId || !selectedReport?.advisor_ids) {
        logger.debug('No selected report or advisor IDs available');
        return [];
      }
      
      try {
        const startIndex = (currentPage - 1) * ADVISORS_PER_PAGE;
        const endIndex = startIndex + ADVISORS_PER_PAGE;
        const advisorIdsForPage = selectedReport.advisor_ids.slice(startIndex, endIndex);
        
        logger.debug('Fetching advisors for report', {
          reportId: selectedReportId,
          page: currentPage,
          totalIds: selectedReport.advisor_ids.length,
          pageIds: advisorIdsForPage.length,
          isLargeReport: selectedReport.advisor_ids.length > 1000
        });
        
        if (advisorIdsForPage.length === 0) {
          logger.debug('No advisor IDs for current page');
          return [];
        }

        // Use optimized processing for large reports
        if (selectedReport.advisor_ids.length > 1000) {
          console.log(`📊 Processing large report with ${selectedReport.advisor_ids.length} advisors`);
          const result = await processLargeAdvisorList(advisorIdsForPage);
          
          if (result.error) {
            throw new Error(result.error);
          }
          
          return result.data;
        }
        
        // Regular query for smaller reports
        const { data, error } = await supabase
          .from('advisors')
          .select('*')
          .in('id', advisorIdsForPage);
        
        if (error) {
          throw new Error(`Failed to fetch report advisors: ${error.message}`);
        }
        
        logger.info('Report advisors fetched successfully', {
          reportId: selectedReportId,
          page: currentPage,
          fetched: data?.length || 0,
          expected: advisorIdsForPage.length
        });
        
        return data || [];
      } catch (error) {
        ErrorService.logError(error as Error, {
          component: 'Reports',
          operation: 'fetch_report_advisors',
          userId: user?.id,
          metadata: {
            reportId: selectedReportId,
            page: currentPage,
            isLargeReport: selectedReport?.advisor_ids?.length > 1000
          }
        });
        
        // Return empty array as fallback
        return [];
      }
    },
    enabled: !!selectedReportId && !!selectedReport?.advisor_ids,
    retry: (failureCount, error: any) => {
      if (error?.status >= 400 && error?.status < 500) {
        return false;
      }
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
  });

  const handleSelectReport = (reportId: string) => {
    const report = reports.find(r => r.id === reportId);
    const advisorCount = report?.advisor_ids?.length || 0;
    
    if (advisorCount > 1000) {
      console.log(`⚠️ Large report selected with ${advisorCount} advisors - using optimized loading`);
    }
    
    logger.info('Report selected', {
      reportId,
      advisorCount,
      isLargeReport: advisorCount > 1000
    });
    
    setSelectedReportId(reportId);
    setSelectedReportName(report?.name || '');
    setCurrentPage(1);
  };

  const handleBackToReports = () => {
    setSelectedReportId(null);
    setSelectedReportName('');
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    logger.debug('Page change requested', { page });
    setCurrentPage(page);
  };

  const totalCount = selectedReport?.advisor_ids?.length || 0;
  const totalPages = Math.ceil(totalCount / ADVISORS_PER_PAGE);

  console.log('📊 Report view state:', {
    selectedReportId,
    selectedReportName,
    totalCount,
    totalPages,
    currentPage,
    reportAdvisorsLength: reportAdvisors.length,
    isLoadingAdvisors,
    isProcessingLarge: isProcessing,
    optimizationProgress: progress,
    advisorsError: advisorsError?.message,
    isLargeReport: totalCount > 1000
  });

  return (
    <div className="min-h-screen bg-[#E5D3BC]">
      <ReportsHeader />

      {/* Main Content */}
      <main className="px-2 lg:px-4 py-8">
        <div className="w-full max-w-none">
          {!selectedReportId ? (
            <ReportListsView
              reports={reports}
              onSelectReport={handleSelectReport}
            />
          ) : (
            <ReportAdvisorsView
              selectedReportId={selectedReportId}
              selectedReportName={selectedReportName}
              advisors={reportAdvisors}
              currentPage={currentPage}
              totalPages={totalPages}
              totalCount={totalCount}
              onBackToReports={handleBackToReports}
              onPageChange={handlePageChange}
              isLoading={isLoadingAdvisors || isProcessing}
              error={advisorsError}
              optimizationProgress={isProcessing ? progress : undefined}
            />
          )}
        </div>
      </main>
    </div>
  );
}
