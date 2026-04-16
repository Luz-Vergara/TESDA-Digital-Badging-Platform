import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Wallet, 
  Award, 
  History as HistoryIcon, 
  Settings, 
  Bell, 
  FileCheck, 
  Users, 
  Building2,
  LogOut,
  ChevronRight,
  FileText,
  Activity,
  ShieldCheck,
  CheckCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFirebase } from '@/src/lib/FirebaseProvider';

interface SidebarProps {
  role: 'Learner' | 'Admin' | 'TrainingCenter' | 'AssessmentCenter' | 'DistrictOffice';
}

export default function Sidebar({ role }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useFirebase();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const getLinks = () => {
    const common = [
      { name: 'Dashboard', href: `/${role.toLowerCase()}`, icon: LayoutDashboard },
      { name: 'Notifications', href: `/${role.toLowerCase()}/notifications`, icon: Bell },
    ];

    if (role === 'Learner') {
      return [
        ...common,
        { name: 'My Badge Wallet', href: '/learner/wallet', icon: Wallet },
        { name: 'Badge Hierarchy', href: '/learner/hierarchy', icon: Award },
        { name: 'Programs', href: '/learner/programs', icon: FileCheck },
      ];
    }

    if (role === 'Admin') {
      return [
        ...common,
        { name: 'Organizations', href: '/admin/organizations', icon: Building2 },
        { name: 'User Accounts', href: '/admin/users', icon: Users },
        { name: 'Badge Templates', href: '/admin/templates', icon: FileText },
        { name: 'Approval Oversight', href: '/admin/oversight', icon: ShieldCheck },
        { name: 'Audit Logs', href: '/admin/logs', icon: Activity },
      ];
    }

    if (role === 'DistrictOffice') {
      return [
        ...common,
        { name: 'Approval Queue', href: '/districtoffice/queue', icon: CheckCircle },
        { name: 'Approved Badges', href: '/districtoffice/approved', icon: Award },
        { name: 'Rejected Requests', href: '/districtoffice/rejected', icon: HistoryIcon },
        { name: 'Renewal Management', href: '/districtoffice/renewal', icon: FileText },
        { name: 'Center Monitoring', href: '/districtoffice/centers', icon: Building2 },
      ];
    }

    if (role === 'TrainingCenter') {
      return [
        ...common,
        { name: 'Learners', href: '/trainingcenter/learners', icon: Users },
        { name: 'Training Records', href: '/trainingcenter/records', icon: FileText },
        { name: 'Badge Requests', href: '/trainingcenter/requests', icon: Award },
        { name: 'Submissions', href: '/trainingcenter/submissions', icon: HistoryIcon },
      ];
    }

    if (role === 'AssessmentCenter') {
      return [
        ...common,
        { name: 'Issue Badges', href: '/assessmentcenter/issue', icon: Award },
        { name: 'Pending Approvals', href: '/assessmentcenter/pending', icon: HistoryIcon },
      ];
    }

    return common;
  };

  const links = getLinks();

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col h-[calc(100vh-64px)] sticky top-16">
      <div className="p-4">
        <div className="px-3 py-2 mb-6 bg-slate-50 rounded-lg border border-slate-100">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Current Role</p>
          <p className="text-sm font-semibold text-slate-900">{role.replace(/([A-Z])/g, ' $1').trim()}</p>
        </div>
        
        <nav className="space-y-1">
          {links.map((link) => {
            const isActive = location.pathname === link.href;
            return (
              <Link
                key={link.name}
                to={link.href}
                className={cn(
                  "flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-all group",
                  isActive 
                    ? "bg-blue-50 text-blue-700" 
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                <div className="flex items-center gap-3">
                  <link.icon className={cn("h-4 w-4", isActive ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600")} />
                  {link.name}
                </div>
                {isActive && <ChevronRight className="h-3 w-3" />}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="mt-auto p-4 border-t border-slate-100">
        <Link
          to="/settings"
          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 mb-1"
        >
          <Settings className="h-4 w-4 text-slate-400" />
          Settings
        </Link>
        <button 
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-rose-600 hover:bg-rose-50 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
