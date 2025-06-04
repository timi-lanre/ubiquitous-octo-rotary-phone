
import { Navigate } from 'react-router-dom';
import { AdminHeader } from '@/components/AdminHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, ArrowLeft, CheckCircle, Clock, User, Building, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useAdminProfile } from '@/hooks/useAdminProfile';
import { useIssueReports } from '@/hooks/useIssueReports';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { formatDate } from '@/utils/issueReportsUtils';

type StatusFilter = 'all' | 'open' | 'resolved';

export default function IssueReports() {
  const navigate = useNavigate();
  const { profile, profileLoading, isAdmin } = useAdminProfile();
  const { 
    issueReports, 
    isLoading, 
    error, 
    updateStatusMutation,
    deleteReportMutation
  } = useIssueReports();
  
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  if (profileLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  if (!profile || !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleResolve = (issueId: string) => {
    console.log('=== RESOLVE BUTTON CLICKED ===');
    console.log('Issue ID:', issueId);
    console.log('Mutation function exists:', !!updateStatusMutation.mutate);
    console.log('Mutation state:', {
      isPending: updateStatusMutation.isPending,
      isError: updateStatusMutation.isError,
      error: updateStatusMutation.error
    });
    
    try {
      updateStatusMutation.mutate(issueId);
      console.log('Mutation called successfully');
    } catch (error) {
      console.error('Error calling mutation:', error);
    }
  };

  const handleBackToAdmin = () => {
    navigate('/admin');
  };

  const filteredReports = issueReports.filter((report) => {
    if (statusFilter === 'all') return true;
    return report.status === statusFilter;
  });

  const openCount = issueReports?.filter(r => r.status === 'open').length || 0;
  const resolvedCount = issueReports?.filter(r => r.status === 'resolved').length || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <AdminHeader profile={profile} />

      <main className="px-6 lg:px-12 pb-12 pt-6">
        <div className="max-w-7xl mx-auto">
          {/* Header Section */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-6">
              <Button
                onClick={handleBackToAdmin}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Admin
              </Button>
            </div>
            
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold text-slate-900 mb-2">Issue Reports</h1>
                <p className="text-slate-600">Manage and resolve reported data issues</p>
              </div>
              
              {/* Status Filter Buttons */}
              <div className="flex gap-3">
                <Button
                  variant={statusFilter === 'all' ? 'default' : 'outline'}
                  onClick={() => setStatusFilter('all')}
                  className="flex items-center gap-2"
                >
                  All Issues
                  <Badge variant="secondary" className="ml-1">
                    {issueReports?.length || 0}
                  </Badge>
                </Button>
                
                <Button
                  variant={statusFilter === 'open' ? 'default' : 'outline'}
                  onClick={() => setStatusFilter('open')}
                  className="flex items-center gap-2"
                >
                  <Clock className="h-4 w-4" />
                  Open
                  <Badge variant="secondary" className="ml-1 bg-yellow-100 text-yellow-800">
                    {openCount}
                  </Badge>
                </Button>
                
                <Button
                  variant={statusFilter === 'resolved' ? 'default' : 'outline'}
                  onClick={() => setStatusFilter('resolved')}
                  className="flex items-center gap-2"
                >
                  <CheckCircle className="h-4 w-4" />
                  Resolved
                  <Badge variant="secondary" className="ml-1 bg-green-100 text-green-800">
                    {resolvedCount}
                  </Badge>
                </Button>
              </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-slate-600">Total Reports</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-slate-900">
                    {issueReports?.length || 0}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-slate-600">Open Issues</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-600">
                    {openCount}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-slate-600">Resolved Issues</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {resolvedCount}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Issues List */}
          <div className="space-y-4">
            {filteredReports.length === 0 ? (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center">
                    <AlertCircle className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-900 mb-2">No issues found</h3>
                    <p className="text-slate-600">
                      {statusFilter === 'all' 
                        ? 'No issues have been reported yet.'
                        : `No ${statusFilter} issues found.`
                      }
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              filteredReports.map((report) => (
                <Card key={report.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-4">
                        {/* Status and Column */}
                        <div className="flex items-center gap-3">
                          {report.status === 'resolved' ? (
                            <Badge className="bg-green-100 text-green-800">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Resolved
                            </Badge>
                          ) : (
                            <Badge className="bg-yellow-100 text-yellow-800">
                              <Clock className="h-3 w-3 mr-1" />
                              Open
                            </Badge>
                          )}
                          <Badge variant="outline">
                            Column: {report.column_name}
                          </Badge>
                        </div>

                        {/* Issue Description */}
                        <div>
                          <h3 className="font-medium text-slate-900 mb-2">Issue Description</h3>
                          <p className="text-slate-700">{report.issue_description}</p>
                        </div>

                        {/* Advisor Info */}
                        <div className="flex items-start gap-6">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-slate-400" />
                            <div>
                              <p className="font-medium text-slate-900">
                                {report.advisors?.first_name || 'Unknown'} {report.advisors?.last_name || 'Advisor'}
                              </p>
                              {report.advisors?.firm && (
                                <div className="flex items-center gap-1 text-sm text-slate-600">
                                  <Building className="h-3 w-3" />
                                  {report.advisors.firm}
                                </div>
                              )}
                              {report.advisors?.city && report.advisors?.province && (
                                <div className="flex items-center gap-1 text-sm text-slate-600">
                                  <MapPin className="h-3 w-3" />
                                  {report.advisors.city}, {report.advisors.province}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Reporter Info */}
                        <div className="text-sm text-slate-600">
                          <span className="font-medium">Reported by:</span>{' '}
                          {report.profiles?.first_name || 'Unknown'} {report.profiles?.last_name || 'User'} 
                          {report.profiles?.email && ` (${report.profiles.email})`}
                          <span className="mx-2">•</span>
                          <span>{formatDate(report.created_at)}</span>
                        </div>

                        {/* Resolution Info */}
                        {report.status === 'resolved' && report.resolved_at && (
                          <div className="text-sm text-green-600 bg-green-50 p-3 rounded-lg">
                            <span className="font-medium">Resolved:</span> {formatDate(report.resolved_at)}
                          </div>
                        )}
                      </div>

                      {/* Action Button */}
                      <div className="ml-6">
                        {report.status === 'open' && (
                          <Button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              console.log('Button clicked - calling handleResolve with:', report.id);
                              handleResolve(report.id);
                            }}
                            disabled={updateStatusMutation.isPending}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            {updateStatusMutation.isPending ? 'Resolving...' : 'Mark as Resolved'}
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
