import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import { useFirebase } from '@/src/lib/FirebaseProvider';

interface DashboardLayoutProps {
  role: 'Learner' | 'Admin' | 'TrainingCenter' | 'AssessmentCenter' | 'DistrictOffice' | 'qso_admin' | 'co_admin' | 'icto_admin';
}

export default function DashboardLayout({ role }: DashboardLayoutProps) {
  const { user, isAuthReady, userProfile } = useFirebase();

  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (userProfile && userProfile.role !== 'Admin' && userProfile.role !== role) {
    const defaultPaths: Record<string, string> = {
      Learner: '/learner',
      Admin: '/admin',
      qso_admin: '/qso',
      co_admin: '/co',
      icto_admin: '/icto',
      DistrictOffice: '/districtoffice',
      TrainingCenter: '/trainingcenter',
      AssessmentCenter: '/assessmentcenter',
    };
    const dest = defaultPaths[userProfile.role] || '/';
    return <Navigate to={dest} replace />;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="flex">
        <Sidebar role={role} />
        <main className="flex-1 p-6 lg:p-8">
          <div className="max-w-6xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
