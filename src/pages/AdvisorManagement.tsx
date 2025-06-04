import React from 'react';
import { Navigate } from 'react-router-dom';
import { AdminHeader } from '@/components/AdminHeader';
import { useAdminProfile } from '@/hooks/useAdminProfile';

function AdvisorManagement() {
  const { isAdmin, isLoading } = useAdminProfile();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <AdminHeader title="Advisor Management" />
      <main className="mt-8">
        {/* Content will be added here in future updates */}
      </main>
    </div>
  );
}

export default AdvisorManagement;