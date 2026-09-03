import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import { useFirebase } from '@/src/lib/FirebaseProvider';

interface DashboardLayoutProps {
  role: 'Learner' | 'Admin' | 'TrainingCenter' | 'DistrictOffice' | 'qso_admin' | 'icto_admin';
}

export default function DashboardLayout({ role }: DashboardLayoutProps) {
  const { user, isAuthReady, userProfile, profileError, logout } = useFirebase();

  if (!isAuthReady || (user && !userProfile && !profileError)) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-sm font-medium text-slate-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (profileError || (user && !userProfile)) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-6 text-center border border-slate-200">
          <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Profile Initialization Error</h2>
          <p className="text-sm text-slate-600 mb-6">
            {profileError || "Unable to load user profile information. Please sign out and try again."}
          </p>
          <button
            onClick={() => logout()}
            className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors shadow-sm"
          >
            Sign Out & Return to Login
          </button>
        </div>
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
      icto_admin: '/icto',
      DistrictOffice: '/districtoffice',
      TrainingCenter: '/trainingcenter',
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
