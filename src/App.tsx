import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { FirebaseProvider } from './lib/FirebaseProvider';
import Home from './pages/public/Home';
import Login from './pages/public/Login';
import Verification from './pages/employer/Verification';
import LearnerDashboard from './pages/learner/LearnerDashboard';
import DistrictOfficeDashboard from './pages/districtoffice/DistrictOfficeDashboard';
import ApprovalQueue from './pages/districtoffice/ApprovalQueue';
import ApprovalHistory from './pages/districtoffice/ApprovalHistory';
import RenewalManagement from './pages/districtoffice/RenewalManagement';
import CenterMonitoring from './pages/districtoffice/CenterMonitoring';
import CentralAdminDashboard from './pages/admin/CentralAdminDashboard';
import Organizations from './pages/admin/Organizations';
import Users from './pages/admin/Users';
import BadgeTemplates from './pages/admin/BadgeTemplates';
import TrainingDashboard from './pages/training/TrainingDashboard';
import LearnerManagement from './pages/training/LearnerManagement';
import TrainingRecords from './pages/training/TrainingRecords';
import BadgeRequests from './pages/training/BadgeRequests';
import Submissions from './pages/training/Submissions';
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
            <Route path="wallet" element={<LearnerDashboard />} />
            <Route path="hierarchy" element={<div className="p-8 text-center text-slate-500">Badge Hierarchy View (Coming Soon)</div>} />
            <Route path="programs" element={<div className="p-8 text-center text-slate-500">Programs & Recommendations (Coming Soon)</div>} />
            <Route path="notifications" element={<div className="p-8 text-center text-slate-500">Notifications (Coming Soon)</div>} />
          </Route>

          {/* Central Admin Portal */}
          <Route path="/admin" element={<DashboardLayout role="Admin" />}>
            <Route index element={<CentralAdminDashboard />} />
            <Route path="organizations" element={<Organizations />} />
            <Route path="users" element={<Users />} />
            <Route path="templates" element={<BadgeTemplates />} />
            <Route path="oversight" element={<div className="p-8 text-center text-slate-500">Approval Oversight (Coming Soon)</div>} />
            <Route path="logs" element={<div className="p-8 text-center text-slate-500">Audit Logs (Coming Soon)</div>} />
            <Route path="notifications" element={<div className="p-8 text-center text-slate-500">Notifications (Coming Soon)</div>} />
          </Route>

          {/* District Office Portal */}
          <Route path="/districtoffice" element={<DashboardLayout role="DistrictOffice" />}>
            <Route index element={<DistrictOfficeDashboard />} />
            <Route path="queue" element={<ApprovalQueue />} />
            <Route path="approved" element={<ApprovalHistory />} />
            <Route path="rejected" element={<ApprovalHistory />} />
            <Route path="renewal" element={<RenewalManagement />} />
            <Route path="centers" element={<CenterMonitoring />} />
            <Route path="notifications" element={<div className="p-8 text-center text-slate-500">Notifications (Coming Soon)</div>} />
          </Route>

          {/* Training Center Portal */}
          <Route path="/trainingcenter" element={<DashboardLayout role="TrainingCenter" />}>
            <Route index element={<TrainingDashboard />} />
            <Route path="learners" element={<LearnerManagement />} />
            <Route path="records" element={<TrainingRecords />} />
            <Route path="requests" element={<BadgeRequests />} />
            <Route path="submissions" element={<Submissions />} />
            <Route path="notifications" element={<div className="p-8 text-center text-slate-500">Notifications (Coming Soon)</div>} />
          </Route>

          {/* Assessment Center Portal */}
          <Route path="/assessmentcenter" element={<DashboardLayout role="AssessmentCenter" />}>
            <Route index element={<AssessmentDashboard />} />
            <Route path="issue" element={<div className="p-8 text-center text-slate-500">Issue Skilled/Master Badges (Coming Soon)</div>} />
            <Route path="pending" element={<div className="p-8 text-center text-slate-500">Pending Approvals (Coming Soon)</div>} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </FirebaseProvider>
  );
}
