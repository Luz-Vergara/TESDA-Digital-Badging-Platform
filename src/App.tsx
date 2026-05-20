import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { FirebaseProvider } from './lib/FirebaseProvider';
import Home from './pages/public/Home';
import Login from './pages/public/Login';
import Verification from './pages/employer/Verification';
import LearnerDashboard from './pages/learner/LearnerDashboard';
import AvailablePrograms from './pages/learner/AvailablePrograms';
import MyApplications from './pages/learner/MyApplications';
import MyEnrollments from './pages/learner/MyEnrollments';
import MyBadgeWallet from './pages/learner/MyBadgeWallet';
import DistrictOfficeDashboard from './pages/districtoffice/DistrictOfficeDashboard';
import ApprovalQueue from './pages/districtoffice/ApprovalQueue';
import RenewalManagement from './pages/districtoffice/RenewalManagement';
import BadgeRequestStatus from './pages/districtoffice/BadgeRequestStatus';
import TrainingCenters from './pages/districtoffice/TrainingCenters';
import AssessmentCenters from './pages/districtoffice/AssessmentCenters';
import CentralAdminDashboard from './pages/admin/CentralAdminDashboard';
import Organizations from './pages/admin/Organizations';
import Users from './pages/admin/Users';
import BadgeTemplates from './pages/admin/BadgeTemplates';

// Office Modules
import QSODashboard from './pages/qso/QSODashboard';
import BadgeHierarchy from './pages/qso/BadgeHierarchy';
import CODashboard from './pages/co/CODashboard';
import ICTODashboard from './pages/icto/ICTODashboard';

import TrainingDashboard from './pages/training/TrainingDashboard';
import LearnerManagement from './pages/training/LearnerManagement';
import ProgramOfferings from './pages/training/ProgramOfferings';
import ProgramBatches from './pages/training/ProgramBatches';
import LearnerApplications from './pages/training/LearnerApplications';
import UCCompletions from './pages/training/UCCompletions';
import BadgeRequests from './pages/training/BadgeRequests';
import AssessmentDashboard from './pages/assessment/AssessmentDashboard';
import DashboardLayout from './components/layout/DashboardLayout';

export default function App() {
  return (
    <FirebaseProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/verify" element={<Verification />} />
          
          {/* Learner Portal */}
          <Route path="/learner" element={<DashboardLayout role="Learner" />}>
            <Route index element={<LearnerDashboard />} />
            <Route path="programs" element={<AvailablePrograms />} />
            <Route path="applications" element={<MyApplications />} />
            <Route path="enrollments" element={<MyEnrollments />} />
            <Route path="wallet" element={<MyBadgeWallet />} />
            <Route path="hierarchy" element={<BadgeHierarchy />} />
          </Route>

          {/* Super Admin Module */}
          <Route path="/admin" element={<DashboardLayout role="Admin" />}>
            <Route index element={<CentralAdminDashboard />} />
            <Route path="organizations" element={<Organizations />} />
            <Route path="users" element={<Users />} />
            <Route path="assignments" element={<div className="p-8 text-center text-slate-500">District Assignment Module</div>} />
            <Route path="reports" element={<div className="p-8 text-center text-slate-500">System Reports</div>} />
            <Route path="logs" element={<div className="p-8 text-center text-slate-500 font-medium italic">Audit Trail Logs (Live Monitoring)</div>} />
            <Route path="settings" element={<div className="p-8 text-center text-slate-500">Platform-wide Settings</div>} />
          </Route>

          {/* QSO Module */}
          <Route path="/qso" element={<DashboardLayout role="qso_admin" />}>
            <Route index element={<QSODashboard />} />
            <Route path="templates" element={<BadgeTemplates />} />
            <Route path="metadata" element={<div className="p-8 text-center text-slate-500">Metadata Standards Management</div>} />
            <Route path="hierarchy" element={<BadgeHierarchy />} />
            <Route path="alignment" element={<div className="p-8 text-center text-slate-500">Qualification Alignment Tool</div>} />
            <Route path="conventions" element={<div className="p-8 text-center text-slate-500">Naming Conventions Policy</div>} />
          </Route>

          {/* CO Module */}
          <Route path="/co" element={<DashboardLayout role="co_admin" />}>
            <Route index element={<CODashboard />} />
            <Route path="oversight" element={<div className="p-8 text-center text-slate-500">Skilled & Master Oversight Queue</div>} />
            <Route path="renewal" element={<div className="p-8 text-center text-slate-500">Validity and Renewal Configuration</div>} />
            <Route path="revocation" element={<div className="p-8 text-center text-slate-500">Revocation and Suspension Management</div>} />
            <Route path="monitoring" element={<div className="p-8 text-center text-slate-500 font-mono text-sm">Certification Pulse Monitor</div>} />
          </Route>

          {/* ICTO Module */}
          <Route path="/icto" element={<DashboardLayout role="icto_admin" />}>
            <Route index element={<ICTODashboard />} />
            <Route path="auth" element={<div className="p-8 text-center text-slate-500">Auth Service Settings</div>} />
            <Route path="verification" element={<div className="p-8 text-center text-slate-500">Public Verification Node Config</div>} />
            <Route path="security" element={<div className="p-8 text-center text-slate-500 font-mono text-sm">Security & Encryption Modules</div>} />
            <Route path="integrations" element={<div className="p-8 text-center text-slate-500">External API Integrations (TESDABest)</div>} />
            <Route path="logs" element={<div className="p-8 text-center text-slate-500 font-mono text-xs">RAW SYSTEM LOGS</div>} />
            <Route path="config" element={<div className="p-8 text-center text-slate-500">Infrastructure Configuration</div>} />
          </Route>

          {/* Regional & Center Portals */}
          <Route path="/districtoffice" element={<DashboardLayout role="DistrictOffice" />}>
            <Route index element={<DistrictOfficeDashboard />} />
            <Route path="queue" element={<ApprovalQueue />} />
            <Route path="status" element={<BadgeRequestStatus />} />
            <Route path="renewal" element={<RenewalManagement />} />
            <Route path="training-centers" element={<TrainingCenters />} />
            <Route path="assessment-centers" element={<AssessmentCenters />} />
            <Route path="notifications" element={<div className="p-8 text-center text-slate-500">Notifications (Coming Soon)</div>} />
          </Route>

          {/* Training Center Portal */}
          <Route path="/trainingcenter" element={<DashboardLayout role="TrainingCenter" />}>
            <Route index element={<TrainingDashboard />} />
            <Route path="learners" element={<LearnerManagement />} />
            <Route path="programs" element={<ProgramOfferings />} />
            <Route path="batches" element={<ProgramBatches />} />
            <Route path="applications" element={<LearnerApplications />} />
            <Route path="completions" element={<UCCompletions />} />
            <Route path="requests" element={<BadgeRequests />} />
            <Route path="reports" element={<div className="p-8 text-center text-slate-500 font-medium">Training Center performance reports (Coming Soon)</div>} />
            <Route path="notifications" element={<div className="p-8 text-center text-slate-500">Notifications (Coming Soon)</div>} />
          </Route>

          {/* Assessment Center Portal */}
          <Route path="/assessmentcenter" element={<DashboardLayout role="AssessmentCenter" />}>
            <Route index element={<AssessmentDashboard />} />
            <Route path="search" element={<AssessmentDashboard />} />
            <Route path="profiles" element={<AssessmentDashboard />} />
            <Route path="records" element={<AssessmentDashboard />} />
            <Route path="rpl" element={<AssessmentDashboard />} />
            <Route path="submit" element={<AssessmentDashboard />} />
            <Route path="tracking" element={<AssessmentDashboard />} />
            <Route path="notifications" element={<AssessmentDashboard />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </FirebaseProvider>
  );
}
