
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';

export function useIssueReports() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: issueReports = [], isLoading, error } = useQuery({
    queryKey: ['issue-reports'],
    queryFn: async () => {
      console.log('Fetching issue reports...');
      try {
        const { data, error } = await supabase
          .from('issue_reports')
          .select(`
            *,
            advisors (
              first_name,
              last_name,
              firm,
              city,
              province
            ),
            profiles!issue_reports_user_id_fkey (
              first_name,
              last_name,
              email
            )
          `)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Supabase error:', error);
          throw new Error(`Failed to fetch issue reports: ${error.message}`);
        }

        console.log('Fetched issue reports:', data);
        return data || [];
      } catch (error) {
        console.error('Error in useIssueReports fetch:', error);
        logger.error('Error fetching issue reports', {
          error: error as Error,
          component: 'useIssueReports',
          operation: 'fetch_issue_reports',
          userId: user?.id
        });
        throw error;
      }
    },
    retry: (failureCount, error: any) => {
      if (error?.status >= 400 && error?.status < 500) {
        return false;
      }
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (id: string) => {
      console.log('=== MUTATION STARTED ===');
      console.log('Issue ID to resolve:', id);
      console.log('Current user:', user?.id);
      
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      // First, let's check if the record exists
      console.log('Checking if record exists...');
      const { data: existingRecord, error: checkError } = await supabase
        .from('issue_reports')
        .select('*')
        .eq('id', id)
        .single();

      console.log('Existing record check:', { existingRecord, checkError });

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error checking existing record:', checkError);
        throw new Error(`Failed to check existing record: ${checkError.message}`);
      }

      if (!existingRecord) {
        throw new Error('Issue report not found');
      }

      if (existingRecord.status === 'resolved') {
        throw new Error('Issue is already resolved');
      }
      
      const updateData = {
        status: 'resolved',
        resolved_at: new Date().toISOString(),
        resolved_by: user.id
      };
      
      console.log('Update data to send:', updateData);
      
      const { data, error } = await supabase
        .from('issue_reports')
        .update(updateData)
        .eq('id', id)
        .select();

      console.log('Supabase response:', { data, error });

      if (error) {
        console.error('Supabase update error:', error);
        throw new Error(`Failed to update issue status: ${error.message}`);
      }

      if (!data || data.length === 0) {
        throw new Error('No rows were updated. This might be due to permissions or the record not existing.');
      }

      console.log('Successfully updated issue:', data);
      return data;
    },
    onSuccess: (data) => {
      console.log('=== MUTATION SUCCESS ===');
      console.log('Updated data:', data);
      queryClient.invalidateQueries({ queryKey: ['issue-reports'] });
      toast({
        title: "Success",
        description: "Issue status updated successfully",
      });
    },
    onError: (error: Error) => {
      console.error('=== MUTATION ERROR ===');
      console.error('Error details:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update issue status",
        variant: "destructive",
      });
    },
  });

  const deleteReportMutation = useMutation({
    mutationFn: async (id: string) => {
      try {
        const { error } = await supabase
          .from('issue_reports')
          .delete()
          .eq('id', id);

        if (error) {
          throw new Error(`Failed to delete issue report: ${error.message}`);
        }
      } catch (error) {
        logger.error('Error deleting issue report', {
          error: error as Error,
          component: 'useIssueReports',
          operation: 'delete_issue_report',
          userId: user?.id,
          metadata: { issueId: id }
        });
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issue-reports'] });
      toast({
        title: "Success",
        description: "Issue report deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete issue report",
        variant: "destructive",
      });
    },
  });

  return {
    issueReports,
    isLoading,
    error,
    updateStatusMutation,
    deleteReportMutation,
  };
}
