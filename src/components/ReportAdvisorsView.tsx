
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileText, Loader2 } from 'lucide-react';
import { Table, TableBody } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AdvisorTableHeader } from '@/components/AdvisorTableHeader';
import { ReportAdvisorTableRow } from '@/components/ReportAdvisorTableRow';
import { useState, useEffect } from 'react';
import { Progress } from '@/components/ui/progress';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

type SortField = 'first_name' | 'last_name' | 'firm' | 'city' | 'province' | 'title' | 'branch' | 'team_name';
type SortDirection = 'asc' | 'desc';

interface Advisor {
  id: string;
  first_name: string | null;
  last_name: string | null;
  title: string | null;
  firm: string | null;
  branch: string | null;
  team_name: string | null;
  city: string | null;
  province: string | null;
  email: string | null;
  linkedin_url: string | null;
  website_url: string | null;
  address: string | null;
  postal_code: string | null;
  business_phone: string | null;
  mobile_phone: string | null;
}

interface ReportAdvisorsViewProps {
  selectedReportId: string;
  selectedReportName: string;
  advisors: Advisor[];
  currentPage: number;
  totalPages: number;
  totalCount: number;
  onBackToReports: () => void;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
  error?: Error | null;
  optimizationProgress?: number;
}

export function ReportAdvisorsView({ 
  selectedReportId, 
  selectedReportName, 
  advisors, 
  currentPage,
  totalPages,
  totalCount,
  onBackToReports,
  onPageChange,
  isLoading = false,
  error = null,
  optimizationProgress
}: ReportAdvisorsViewProps) {
  const [sortField, setSortField] = useState<SortField>('first_name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [sortedAdvisors, setSortedAdvisors] = useState<Advisor[]>(advisors);

  const isLargeReport = totalCount > 1000;

  const handleSort = (field: SortField) => {
    const newDirection = sortField === field && sortDirection === 'asc' ? 'desc' : 'asc';
    setSortField(field);
    setSortDirection(newDirection);
  };

  // Update sorted advisors when advisors prop changes or sort criteria changes
  useEffect(() => {
    console.log('🔄 ReportAdvisorsView: Sorting advisors');
    console.log('Input advisors:', advisors.length);
    console.log('Sort field:', sortField, 'Sort direction:', sortDirection);
    
    if (!advisors || advisors.length === 0) {
      console.log('❌ No advisors to sort');
      setSortedAdvisors([]);
      return;
    }

    const sorted = [...advisors].sort((a, b) => {
      const aValue = (a[sortField] || '').toString();
      const bValue = (b[sortField] || '').toString();
      
      console.log(`Comparing: "${aValue}" vs "${bValue}"`);
      
      // Apply proper null handling for consistent sorting
      const aIsNull = !aValue || aValue.trim() === '';
      const bIsNull = !bValue || bValue.trim() === '';
      
      if (aIsNull && bIsNull) return 0;
      
      if (sortDirection === 'asc') {
        // Ascending: A-Z then blanks (nulls last)
        if (aIsNull) return 1;  // a goes after b
        if (bIsNull) return -1; // a goes before b
        return aValue.localeCompare(bValue);
      } else {
        // Descending: blanks then Z-A (nulls first)
        if (aIsNull) return -1; // a goes before b
        if (bIsNull) return 1;  // a goes after b
        return bValue.localeCompare(aValue);
      }
    });
    
    console.log('✅ Sorted advisors:', sorted.length);
    console.log('First sorted advisor:', sorted[0]?.first_name, sorted[0]?.last_name);
    setSortedAdvisors(sorted);
  }, [advisors, sortField, sortDirection]);

  console.log('🖥️ ReportAdvisorsView render state:', {
    advisorsLength: advisors.length,
    sortedAdvisorsLength: sortedAdvisors.length,
    isLoading,
    error: error?.message,
    totalCount,
    isLargeReport,
    optimizationProgress
  });

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <Button
            onClick={onBackToReports}
            variant="ghost"
            size="sm"
            className="text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Reports
          </Button>
        </div>
        <div className="flex items-center gap-4 mb-2">
          <h2 className="text-2xl font-bold text-slate-900">{selectedReportName}</h2>
          {isLargeReport && (
            <span className="px-3 py-1 bg-amber-100 text-amber-800 text-sm font-medium rounded-full">
              Large Report ({totalCount.toLocaleString()} advisors)
            </span>
          )}
        </div>
        <p className="text-slate-600">
          {totalCount.toLocaleString()} advisor{totalCount !== 1 ? 's' : ''}
          {isLargeReport && (
            <span className="ml-2 text-sm text-amber-600">
              • Using optimized loading for better performance
            </span>
          )}
        </p>
        
        {/* Progress bar for large report optimization */}
        {typeof optimizationProgress === 'number' && optimizationProgress > 0 && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-3 mb-2">
              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
              <span className="text-sm font-medium text-blue-900">
                Processing large report data... {Math.round(optimizationProgress)}%
              </span>
            </div>
            <Progress value={optimizationProgress} className="h-2" />
            <p className="text-xs text-blue-700 mt-1">
              Large reports are processed in chunks for optimal performance
            </p>
          </div>
        )}
      </div>

      {error ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <FileText className="h-16 w-16 text-red-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Error loading advisors</h3>
          <p className="text-slate-600">{error.message}</p>
          <p className="text-sm text-slate-400 mt-2">Please try again or contact support if the issue persists.</p>
          {isLargeReport && (
            <p className="text-sm text-amber-600 mt-2">
              This error may be related to the large size of this report. Consider breaking it into smaller reports.
            </p>
          )}
        </div>
      ) : isLoading ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <Loader2 className="h-16 w-16 text-slate-300 mx-auto mb-4 animate-spin" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Loading advisors...</h3>
          <p className="text-slate-600">
            {isLargeReport 
              ? 'Processing large report data for optimal performance...' 
              : 'Please wait while we fetch the data.'
            }
          </p>
          {isLargeReport && (
            <p className="text-sm text-blue-600 mt-2">
              Large reports may take a moment to load
            </p>
          )}
        </div>
      ) : advisors.length === 0 && totalCount > 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <FileText className="h-16 w-16 text-yellow-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No advisors found for this page</h3>
          <p className="text-slate-600">The report contains {totalCount.toLocaleString()} advisors, but none were found for the current page.</p>
          <p className="text-sm text-slate-400 mt-2">This might indicate a data synchronization issue.</p>
        </div>
      ) : advisors.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <FileText className="h-16 w-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No advisors in this report</h3>
          <p className="text-slate-600">This report appears to be empty.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="w-full bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="relative">
              {/* Sticky Header */}
              <div className="sticky top-0 z-30 bg-white border-b-2 border-slate-200">
                <div className="w-full overflow-x-auto">
                  <Table className="min-w-full">
                    <AdvisorTableHeader 
                      onSort={handleSort} 
                      sortField={sortField}
                      sortDirection={sortDirection}
                    />
                  </Table>
                </div>
              </div>
              
              {/* Scrollable Content */}
              <ScrollArea className="h-[800px] w-full">
                <div className="w-full overflow-x-auto">
                  <Table className="min-w-full">
                    <TableBody>
                      {sortedAdvisors.map((advisor, index) => (
                        <ReportAdvisorTableRow
                          key={advisor.id}
                          advisor={advisor}
                          index={(currentPage - 1) * 50 + index + 1}
                        />
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </ScrollArea>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (currentPage > 1) onPageChange(currentPage - 1);
                      }}
                      className={currentPage <= 1 ? 'pointer-events-none opacity-50' : ''}
                    />
                  </PaginationItem>
                  
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNumber;
                    if (totalPages <= 5) {
                      pageNumber = i + 1;
                    } else if (currentPage <= 3) {
                      pageNumber = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNumber = totalPages - 4 + i;
                    } else {
                      pageNumber = currentPage - 2 + i;
                    }
                    
                    return (
                      <PaginationItem key={pageNumber}>
                        <PaginationLink
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            onPageChange(pageNumber);
                          }}
                          isActive={currentPage === pageNumber}
                        >
                          {pageNumber}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  })}
                  
                  <PaginationItem>
                    <PaginationNext 
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (currentPage < totalPages) onPageChange(currentPage + 1);
                      }}
                      className={currentPage >= totalPages ? 'pointer-events-none opacity-50' : ''}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
