import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useInfiniteQuery, useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { AdminHeader } from '@/components/AdminHeader';
import { DashboardSearch } from '@/components/Dashboard/DashboardSearch';
import { FilterPanel, SelectedFilters } from '@/components/FilterPanel';
import { Plus, Pencil, Trash2, Loader2, ChevronUp, ChevronDown } from 'lucide-react';
import { buildQuery, buildCountQuery } from '@/hooks/useAdvisors/queryBuilders';
import { applySortWithNullHandling } from '@/utils/sortingUtils';
import { logger } from '@/utils/logger';
import { useAuth } from '@/contexts/AuthContext';

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

interface AdvisorFormData {
  first_name: string;
  last_name: string;
  title: string;
  firm: string;
  branch: string;
  team_name: string;
  city: string;
  province: string;
  email: string;
  linkedin_url: string;
  website_url: string;
  address: string;
  postal_code: string;
  business_phone: string;
  mobile_phone: string;
}

export default function AdvisorManagement() {
  const { user } = useAuth();
  const [selectedAdvisor, setSelectedAdvisor] = useState<Advisor | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('first_name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [selectedFilters, setSelectedFilters] = useState<SelectedFilters>({
    provinces: [],
    cities: [],
    firms: [],
    branches: [],
    teams: [],
    favoriteLists: [],
    reports: []
  });
  const [favoriteAdvisorIds, setFavoriteAdvisorIds] = useState<string[]>([]);
  const [reportAdvisorIds, setReportAdvisorIds] = useState<string[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Fetch advisor IDs from favorite lists
  const { data: favoriteLists = [] } = useQuery({
    queryKey: ['user-lists-admin', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('favorite_lists')
        .select('id, name')
        .eq('user_id', user.id);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Fetch advisor IDs from reports
  const { data: userReports = [] } = useQuery({
    queryKey: ['user-reports-admin', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('reports')
        .select('id, name, advisor_ids')
        .eq('user_id', user.id);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Update favorite advisor IDs when favorite lists change
  useEffect(() => {
    const updateFavoriteAdvisorIds = async () => {
      if (!user?.id || selectedFilters.favoriteLists.length === 0) {
        setFavoriteAdvisorIds([]);
        return;
      }

      try {
        // Get the IDs of selected favorite lists
        const selectedListIds = favoriteLists
          .filter(list => selectedFilters.favoriteLists.includes(list.name))
          .map(list => list.id);

        if (selectedListIds.length === 0) {
          setFavoriteAdvisorIds([]);
          return;
        }

        const { data, error } = await supabase
          .from('favorite_list_items')
          .select('advisor_id')
          .in('favorite_list_id', selectedListIds);

        if (error) {
          console.error('Error fetching favorite advisor IDs:', error);
          setFavoriteAdvisorIds([]);
          return;
        }

        const advisorIds = data?.map(item => item.advisor_id) || [];
        console.log('Updated favorite advisor IDs for management:', advisorIds);
        setFavoriteAdvisorIds(advisorIds);
      } catch (error) {
        console.error('Error updating favorite advisor IDs:', error);
        setFavoriteAdvisorIds([]);
      }
    };

    updateFavoriteAdvisorIds();
  }, [user?.id, favoriteLists, selectedFilters.favoriteLists]);

  // Update report advisor IDs when reports change
  useEffect(() => {
    if (selectedFilters.reports.length === 0) {
      setReportAdvisorIds([]);
      return;
    }

    // Get the advisor IDs from selected reports
    const selectedReports = userReports.filter(report => 
      selectedFilters.reports.includes(report.name)
    );

    const allAdvisorIds = selectedReports.reduce((acc, report) => {
      if (report.advisor_ids && Array.isArray(report.advisor_ids)) {
        return [...acc, ...report.advisor_ids];
      }
      return acc;
    }, [] as string[]);

    console.log('Updated report advisor IDs for management:', allAdvisorIds);
    setReportAdvisorIds(allAdvisorIds);
  }, [userReports, selectedFilters.reports]);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchInput);
    }, 500); // 500ms delay

    return () => clearTimeout(timer);
  }, [searchInput]);

  // Handle filter changes
  const handleApplyFilters = useCallback((newFilters: SelectedFilters) => {
    console.log('Applying filters in management:', newFilters);
    setSelectedFilters(newFilters);
  }, []);

  // Handle sorting
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
  };

  const getSortIcon = (field: SortField) => {
    if (sortField === field) {
      return sortDirection === 'asc' 
        ? <ChevronUp className="h-4 w-4 ml-1" />
        : <ChevronDown className="h-4 w-4 ml-1" />;
    }
    return <ChevronDown className="h-4 w-4 ml-1 opacity-0 group-hover:opacity-50" />;
  };

  // Fetch total count of advisors (filtered by search and filters)
  const { data: totalCount } = useQuery({
    queryKey: ['advisors-management-count', debouncedSearchQuery, selectedFilters, favoriteAdvisorIds, reportAdvisorIds, sortField, sortDirection],
    queryFn: async () => {
      const query = buildCountQuery(debouncedSearchQuery, selectedFilters, favoriteAdvisorIds, reportAdvisorIds);
      
      if (!query) return 0;
      
      const { count, error } = await query;
      
      if (error) {
        logger.error('Error fetching advisor count', { error: error.message, context: 'AdvisorManagement' });
        return 0;
      }
      return count || 0;
    },
  });

  // Fetch advisors data with infinite scroll, search, filters, and sorting
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ['advisors-management', debouncedSearchQuery, selectedFilters, favoriteAdvisorIds, reportAdvisorIds, sortField, sortDirection],
    queryFn: async ({ pageParam = 0 }) => {
      logger.debug('Fetching advisor page', { 
        pageParam, 
        search: debouncedSearchQuery, 
        filters: selectedFilters,
        favoriteAdvisorIds,
        reportAdvisorIds,
        sortField,
        sortDirection,
        context: 'AdvisorManagement'
      });
      
      const from = pageParam;
      const to = pageParam === 0 ? 39 : pageParam + 99; // First page: 40 rows, subsequent: 100 rows
      
      const query = buildQuery(debouncedSearchQuery, selectedFilters, favoriteAdvisorIds, reportAdvisorIds);
      
      if (!query) return [];
      
      // Apply sorting with proper null handling
      const sortedQuery = applySortWithNullHandling(query, sortField, sortDirection);
      
      const { data, error } = await sortedQuery.range(from, to);
      
      if (error) {
        logger.error('Error fetching advisors', { error: error.message, context: 'AdvisorManagement' });
        return [];
      }
      
      logger.debug('Fetched advisor data', { count: data?.length, context: 'AdvisorManagement' });
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
  });

  // Flatten all pages into a single array
  const advisors = data?.pages.flatMap(page => page) || [];

  // Handle scroll for infinite loading
  const handleScroll = useCallback(() => {
    const scrollContainer = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    if (!scrollContainer) return;

    const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
    const scrollPercentage = (scrollTop + clientHeight) / scrollHeight;
    
    // Trigger when 90% scrolled
    if (scrollPercentage > 0.9 && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  // Set up scroll listener
  useEffect(() => {
    const scrollContainer = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    if (!scrollContainer) return;

    scrollContainer.addEventListener('scroll', handleScroll);
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  // Create advisor mutation
  const createAdvisorMutation = useMutation({
    mutationFn: async (formData: AdvisorFormData) => {
      const { data, error } = await supabase
        .from('advisors')
        .insert([formData])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['advisors-management'] });
      queryClient.invalidateQueries({ queryKey: ['advisors-management-count'] });
      setIsAddDialogOpen(false);
      logger.info('Advisor created successfully', { context: 'AdvisorManagement' });
      toast({
        title: "Success",
        description: "Advisor created successfully",
      });
    },
    onError: (error) => {
      logger.error('Failed to create advisor', { error: error.message, context: 'AdvisorManagement' });
      toast({
        title: "Error",
        description: `Failed to create advisor: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Update advisor mutation
  const updateAdvisorMutation = useMutation({
    mutationFn: async ({ id, formData }: { id: string; formData: AdvisorFormData }) => {
      const { data, error } = await supabase
        .from('advisors')
        .update(formData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['advisors-management'] });
      queryClient.invalidateQueries({ queryKey: ['advisors-management-count'] });
      setIsEditDialogOpen(false);
      setSelectedAdvisor(null);
      logger.info('Advisor updated successfully', { context: 'AdvisorManagement' });
      toast({
        title: "Success",
        description: "Advisor updated successfully",
      });
    },
    onError: (error) => {
      logger.error('Failed to update advisor', { error: error.message, context: 'AdvisorManagement' });
      toast({
        title: "Error",
        description: `Failed to update advisor: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Delete advisor mutation
  const deleteAdvisorMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('advisors')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['advisors-management'] });
      queryClient.invalidateQueries({ queryKey: ['advisors-management-count'] });
      logger.info('Advisor deleted successfully', { context: 'AdvisorManagement' });
      toast({
        title: "Success",
        description: "Advisor deleted successfully",
      });
    },
    onError: (error) => {
      logger.error('Failed to delete advisor', { error: error.message, context: 'AdvisorManagement' });
      toast({
        title: "Error",
        description: `Failed to delete advisor: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleDelete = (advisor: Advisor) => {
    if (window.confirm(`Are you sure you want to delete ${advisor.first_name} ${advisor.last_name}?`)) {
      deleteAdvisorMutation.mutate(advisor.id);
    }
  };

  const handleEdit = (advisor: Advisor) => {
    setSelectedAdvisor(advisor);
    setIsEditDialogOpen(true);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInput(e.target.value);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <AdminHeader profile={{ first_name: '', last_name: '', role: 'admin' }} />
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <AdminHeader profile={{ first_name: '', last_name: '', role: 'admin' }} />

      <main className="px-2 lg:px-4 pb-12 pt-6">
        <div className="w-full max-w-none">
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Advisor Management</h2>
                <p className="text-slate-600">Manage advisors in the database</p>
              </div>
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Add Advisor
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Add New Advisor</DialogTitle>
                    <DialogDescription>
                      Create a new advisor record in the database.
                    </DialogDescription>
                  </DialogHeader>
                  <AdvisorForm
                    onSubmit={(formData) => createAdvisorMutation.mutate(formData)}
                    isLoading={createAdvisorMutation.isPending}
                  />
                </DialogContent>
              </Dialog>
            </div>

            {/* Add Filter Panel */}
            <div className="mb-6">
              <FilterPanel 
                onApplyFilters={handleApplyFilters}
                selectedFilters={selectedFilters}
                showSaveAsReport={false}
              />
            </div>

            {/* Replace the old search input with DashboardSearch component */}
            <DashboardSearch 
              searchQuery={searchInput}
              onSearchChange={handleSearchChange}
            />
            {searchInput !== debouncedSearchQuery && (
              <div className="flex items-center gap-2 mb-4 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Searching...
              </div>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Advisors ({totalCount?.toLocaleString() || 0})</CardTitle>
                <CardDescription>
                  {debouncedSearchQuery || Object.values(selectedFilters).some(arr => arr.length > 0) 
                    ? `Filtered results` 
                    : 'All advisors in the database'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="w-full bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="relative">
                    {/* Sticky Header with Sorting */}
                    <div className="sticky top-0 z-30 bg-white border-b-2 border-slate-200">
                      <div className="w-full overflow-x-auto">
                        <Table className="min-w-full">
                          <TableHeader>
                            <TableRow>
                              <TableHead className="px-3 py-2 w-12 text-center font-medium text-slate-700">#</TableHead>
                              <TableHead 
                                className="px-3 py-2 cursor-pointer hover:bg-slate-50 group transition-colors font-medium text-slate-700" 
                                style={{ width: '120px', minWidth: '120px', maxWidth: '120px' }}
                                onClick={() => handleSort('first_name')}
                              >
                                <div className="flex items-center">
                                  First Name
                                  {getSortIcon('first_name')}
                                </div>
                              </TableHead>
                              <TableHead 
                                className="px-3 py-2 cursor-pointer hover:bg-slate-50 group transition-colors font-medium text-slate-700" 
                                style={{ width: '120px', minWidth: '120px', maxWidth: '120px' }}
                                onClick={() => handleSort('last_name')}
                              >
                                <div className="flex items-center">
                                  Last Name
                                  {getSortIcon('last_name')}
                                </div>
                              </TableHead>
                              <TableHead 
                                className="px-3 py-2 cursor-pointer hover:bg-slate-50 group transition-colors font-medium text-slate-700" 
                                style={{ width: '180px', minWidth: '180px', maxWidth: '180px' }}
                                onClick={() => handleSort('title')}
                              >
                                <div className="flex items-center">
                                  Title
                                  {getSortIcon('title')}
                                </div>
                              </TableHead>
                              <TableHead 
                                className="px-3 py-2 cursor-pointer hover:bg-slate-50 group transition-colors font-medium text-slate-700" 
                                style={{ width: '200px', minWidth: '200px', maxWidth: '200px' }}
                                onClick={() => handleSort('firm')}
                              >
                                <div className="flex items-center">
                                  Firm
                                  {getSortIcon('firm')}
                                </div>
                              </TableHead>
                              <TableHead 
                                className="px-3 py-2 cursor-pointer hover:bg-slate-50 group transition-colors font-medium text-slate-700" 
                                style={{ width: '180px', minWidth: '180px', maxWidth: '180px' }}
                                onClick={() => handleSort('branch')}
                              >
                                <div className="flex items-center">
                                  Branch
                                  {getSortIcon('branch')}
                                </div>
                              </TableHead>
                              <TableHead 
                                className="px-3 py-2 cursor-pointer hover:bg-slate-50 group transition-colors font-medium text-slate-700" 
                                style={{ width: '100px', minWidth: '100px', maxWidth: '100px' }}
                                onClick={() => handleSort('city')}
                              >
                                <div className="flex items-center">
                                  City
                                  {getSortIcon('city')}
                                </div>
                              </TableHead>
                              <TableHead 
                                className="px-3 py-2 cursor-pointer hover:bg-slate-50 group transition-colors font-medium text-slate-700" 
                                style={{ width: '80px', minWidth: '80px', maxWidth: '80px' }}
                                onClick={() => handleSort('province')}
                              >
                                <div className="flex items-center">
                                  Province
                                  {getSortIcon('province')}
                                </div>
                              </TableHead>
                              <TableHead className="px-3 py-2 font-medium text-slate-700" style={{ width: '200px', minWidth: '200px', maxWidth: '200px' }}>Email</TableHead>
                              <TableHead className="px-3 py-2 text-center font-medium text-slate-700" style={{ width: '140px', minWidth: '140px', maxWidth: '140px' }}>Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                        </Table>
                      </div>
                    </div>
                    
                    {/* Scrollable Content */}
                    <ScrollArea className="h-[600px] w-full" ref={scrollAreaRef}>
                      <div className="w-full overflow-x-auto">
                        <Table className="min-w-full">
                          <TableBody>
                            {advisors?.map((advisor, index) => (
                              <TableRow key={advisor.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                                <TableCell className="px-3 py-1.5 text-center text-slate-500 text-sm w-12">
                                  {index + 1}
                                </TableCell>
                                <TableCell className="px-3 py-1.5 font-medium text-slate-900 text-sm" style={{ width: '120px', minWidth: '120px', maxWidth: '120px' }}>
                                  <div className="break-words" title={advisor.first_name || ''}>
                                    {advisor.first_name || <span className="text-slate-400">-</span>}
                                  </div>
                                </TableCell>
                                <TableCell className="px-3 py-1.5 font-medium text-slate-900 text-sm" style={{ width: '120px', minWidth: '120px', maxWidth: '120px' }}>
                                  <div className="break-words" title={advisor.last_name || ''}>
                                    {advisor.last_name || <span className="text-slate-400">-</span>}
                                  </div>
                                </TableCell>
                                <TableCell className="px-3 py-1.5 text-slate-700 text-sm" style={{ width: '180px', minWidth: '180px', maxWidth: '180px' }}>
                                  <div className="break-words" title={advisor.title || ''}>
                                    {advisor.title || <span className="text-slate-400">-</span>}
                                  </div>
                                </TableCell>
                                <TableCell className="px-3 py-1.5 text-slate-700 text-sm" style={{ width: '200px', minWidth: '200px', maxWidth: '200px' }}>
                                  <div className="break-words" title={advisor.firm || ''}>
                                    {advisor.firm || <span className="text-slate-400">-</span>}
                                  </div>
                                </TableCell>
                                <TableCell className="px-3 py-1.5 text-slate-700 text-sm" style={{ width: '180px', minWidth: '180px', maxWidth: '180px' }}>
                                  <div className="break-words" title={advisor.branch || ''}>
                                    {advisor.branch || <span className="text-slate-400">-</span>}
                                  </div>
                                </TableCell>
                                <TableCell className="px-3 py-1.5 text-slate-700 text-sm" style={{ width: '100px', minWidth: '100px', maxWidth: '100px' }}>
                                  <div className="break-words" title={advisor.city || ''}>
                                    {advisor.city || <span className="text-slate-400">-</span>}
                                  </div>
                                </TableCell>
                                <TableCell className="px-3 py-1.5 text-slate-700 text-sm" style={{ width: '80px', minWidth: '80px', maxWidth: '80px' }}>
                                  <div className="break-words" title={advisor.province || ''}>
                                    {advisor.province || <span className="text-slate-400">-</span>}
                                  </div>
                                </TableCell>
                                <TableCell className="px-3 py-1.5 text-slate-700 text-sm" style={{ width: '200px', minWidth: '200px', maxWidth: '200px' }}>
                                  <div className="break-words" title={advisor.email || ''}>
                                    {advisor.email || <span className="text-slate-400">-</span>}
                                  </div>
                                </TableCell>
                                <TableCell className="px-3 py-1.5 text-center" style={{ width: '140px', minWidth: '140px', maxWidth: '140px' }}>
                                  <div className="flex justify-center gap-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleEdit(advisor)}
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleDelete(advisor)}
                                      disabled={deleteAdvisorMutation.isPending}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                            {isFetchingNextPage && (
                              <TableRow>
                                <TableCell colSpan={10} className="text-center py-12">
                                  <div className="flex flex-col items-center gap-3">
                                    <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                                    <p className="text-slate-500 font-medium">Loading more advisors...</p>
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                      
                      {advisors && advisors.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                            <span className="text-2xl text-slate-400">📋</span>
                          </div>
                          <h3 className="text-lg font-semibold text-slate-900 mb-2">
                            {debouncedSearchQuery ? 'No advisors found' : 'No advisors in database'}
                          </h3>
                          <p className="text-slate-500">
                            {debouncedSearchQuery ? `No advisors match "${debouncedSearchQuery}"` : 'There are no advisors in the database.'}
                          </p>
                        </div>
                      )}
                    </ScrollArea>
                  </div>
                  
                  {/* Row count display */}
                  <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                    <div className="text-sm text-slate-600">
                      Showing <span className="font-semibold text-slate-900">{advisors.length.toLocaleString()}</span> of{' '}
                      <span className="font-semibold text-slate-900">{totalCount?.toLocaleString() || 0}</span> advisors
                      {debouncedSearchQuery && (
                        <span className="ml-2 text-slate-500">for "{debouncedSearchQuery}"</span>
                      )}
                    </div>
                    {hasNextPage && (
                      <div className="text-sm text-slate-500">
                        Scroll down to load more
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Advisor</DialogTitle>
            <DialogDescription>
              Update the advisor information.
            </DialogDescription>
          </DialogHeader>
          {selectedAdvisor && (
            <AdvisorForm
              initialData={selectedAdvisor}
              onSubmit={(formData) => 
                updateAdvisorMutation.mutate({ 
                  id: selectedAdvisor.id, 
                  formData 
                })
              }
              isLoading={updateAdvisorMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface AdvisorFormProps {
  initialData?: Advisor;
  onSubmit: (data: AdvisorFormData) => void;
  isLoading: boolean;
}

function AdvisorForm({ initialData, onSubmit, isLoading }: AdvisorFormProps) {
  const [formData, setFormData] = useState<AdvisorFormData>({
    first_name: initialData?.first_name || '',
    last_name: initialData?.last_name || '',
    title: initialData?.title || '',
    firm: initialData?.firm || '',
    branch: initialData?.branch || '',
    team_name: initialData?.team_name || '',
    city: initialData?.city || '',
    province: initialData?.province || '',
    email: initialData?.email || '',
    linkedin_url: initialData?.linkedin_url || '',
    website_url: initialData?.website_url || '',
    address: initialData?.address || '',
    postal_code: initialData?.postal_code || '',
    business_phone: initialData?.business_phone || '',
    mobile_phone: initialData?.mobile_phone || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Convert empty strings to null to avoid "not empty" constraint violations
    // This handles all fields that might have check constraints preventing empty strings
    const sanitizedData = Object.fromEntries(
      Object.entries(formData).map(([key, value]) => [
        key,
        typeof value === 'string' && value.trim() === '' ? null : (typeof value === 'string' ? value.trim() : value)
      ])
    ) as AdvisorFormData;
    
    onSubmit(sanitizedData);
  };

  const handleChange = (field: keyof AdvisorFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="first_name">First Name</Label>
          <Input
            id="first_name"
            value={formData.first_name}
            onChange={(e) => handleChange('first_name', e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="last_name">Last Name</Label>
          <Input
            id="last_name"
            value={formData.last_name}
            onChange={(e) => handleChange('last_name', e.target.value)}
            required
          />
        </div>
      </div>

      <div>
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => handleChange('title', e.target.value)}
          placeholder="Optional"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="firm">Firm</Label>
          <Input
            id="firm"
            value={formData.firm}
            onChange={(e) => handleChange('firm', e.target.value)}
            placeholder="Optional"
          />
        </div>
        <div>
          <Label htmlFor="branch">Branch</Label>
          <Input
            id="branch"
            value={formData.branch}
            onChange={(e) => handleChange('branch', e.target.value)}
            placeholder="Optional"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="team_name">Team Name</Label>
        <Input
          id="team_name"
          value={formData.team_name}
          onChange={(e) => handleChange('team_name', e.target.value)}
          placeholder="Optional"
        />
      </div>

      <div>
        <Label htmlFor="address">Address</Label>
        <Input
          id="address"
          value={formData.address}
          onChange={(e) => handleChange('address', e.target.value)}
          placeholder="Optional"
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="city">City</Label>
          <Input
            id="city"
            value={formData.city}
            onChange={(e) => handleChange('city', e.target.value)}
            placeholder="Optional"
          />
        </div>
        <div>
          <Label htmlFor="province">Province</Label>
          <Input
            id="province"
            value={formData.province}
            onChange={(e) => handleChange('province', e.target.value)}
            placeholder="Optional"
          />
        </div>
        <div>
          <Label htmlFor="postal_code">Postal Code</Label>
          <Input
            id="postal_code"
            value={formData.postal_code}
            onChange={(e) => handleChange('postal_code', e.target.value)}
            placeholder="Optional"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => handleChange('email', e.target.value)}
          placeholder="Optional"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="business_phone">Business Phone</Label>
          <Input
            id="business_phone"
            type="tel"
            value={formData.business_phone}
            onChange={(e) => handleChange('business_phone', e.target.value)}
            placeholder="Optional"
          />
        </div>
        <div>
          <Label htmlFor="mobile_phone">Mobile Phone</Label>
          <Input
            id="mobile_phone"
            type="tel"
            value={formData.mobile_phone}
            onChange={(e) => handleChange('mobile_phone', e.target.value)}
            placeholder="Optional"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="linkedin_url">LinkedIn URL</Label>
        <Input
          id="linkedin_url"
          type="url"
          value={formData.linkedin_url}
          onChange={(e) => handleChange('linkedin_url', e.target.value)}
          placeholder="Optional"
        />
      </div>

      <div>
        <Label htmlFor="website_url">Website URL</Label>
        <Input
          id="website_url"
          type="url"
          value={formData.website_url}
          onChange={(e) => handleChange('website_url', e.target.value)}
          placeholder="Optional"
        />
      </div>

      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            {initialData ? 'Updating...' : 'Creating...'}
          </>
        ) : (
          initialData ? 'Update Advisor' : 'Create Advisor'
        )}
      </Button>
    </form>
  );
}
