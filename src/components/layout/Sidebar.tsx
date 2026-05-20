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
  CheckCircle,
  FileCode,
  Layers,
  ShieldAlert,
  Server,
  Lock,
  Globe,
  Database,
  Terminal,
  Settings2,
  GitMerge,
  BadgeCheck,
  ClipboardCheck,
  Search,
  Plus,
  TrendingUp,
  ClipboardList,
  Clock,
  Hash,
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFirebase } from '@/src/lib/FirebaseProvider';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const EXAMPLE_NOTIFICATIONS = [
  { id: 1, title: 'Badge Issued', message: 'Your Network Administration NC III badge has been issued.', time: '2 hours ago', type: 'success' },
  { id: 2, title: 'Profile Updated', message: 'Your account profile has been successfully updated.', time: '5 hours ago', type: 'info' },
  { id: 3, title: 'New Program', message: 'A new Advanced Cloud Computing program is now available.', time: '1 day ago', type: 'info' },
  { id: 4, title: 'Renewal Reminder', message: 'Your UI/UX Design badge expires in 30 days.', time: '2 days ago', type: 'warning' },
];

interface SidebarProps {
  role: 'Learner' | 'Admin' | 'TrainingCenter' | 'AssessmentCenter' | 'DistrictOffice' | 'qso_admin' | 'co_admin' | 'icto_admin';
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
      { name: 'Dashboard', href: role === 'qso_admin' ? '/qso' : role === 'co_admin' ? '/co' : role === 'icto_admin' ? '/icto' : `/${role.toLowerCase()}`, icon: LayoutDashboard },
      { name: 'Notifications', type: 'dropdown', icon: Bell },
    ];

    if (role === 'Learner') {
      return [
        ...common,
        { name: 'Available Programs', href: '/learner/programs', icon: Search },
        { name: 'My Applications', href: '/learner/applications', icon: ClipboardList },
        { name: 'My Enrollments', href: '/learner/enrollments', icon: Users },
        { name: 'My Badge Wallet', href: '/learner/wallet', icon: Wallet },
        { name: 'Badge Hierarchy', href: '/learner/hierarchy', icon: Award },
      ];
    }

    if (role === 'Admin') {
      return [
        ...common,
        { name: 'Organizations', href: '/admin/organizations', icon: Building2 },
        { name: 'User Accounts', href: '/admin/users', icon: Users },
        { name: 'District Assignments', href: '/admin/assignments', icon: GitMerge },
        { name: 'Reports', href: '/admin/reports', icon: FileText },
        { name: 'Audit Logs', href: '/admin/logs', icon: Activity },
        { name: 'Platform Settings', href: '/admin/settings', icon: Settings },
      ];
    }

    if (role === 'qso_admin') {
      return [
        ...common,
        { name: 'Badge Templates', href: '/qso/templates', icon: Award },
        { name: 'Metadata Standards', href: '/qso/metadata', icon: FileCode },
        { name: 'Badge Hierarchy', href: '/qso/hierarchy', icon: Layers },
        { name: 'Qualification Alignment', href: '/qso/alignment', icon: BadgeCheck },
        { name: 'Naming Conventions', href: '/qso/conventions', icon: FileText },
      ];
    }

    if (role === 'co_admin') {
      return [
        { name: 'Dashboard', href: '/co', icon: LayoutDashboard },
        { name: 'Notifications', href: '/co?view=notifications', icon: Bell },
        { name: 'Skilled & Master Requests', href: '/co?view=requests', icon: Clock },
        { name: 'Badge ID Generation', href: '/co?view=id-generation', icon: Hash },
        { name: 'Forward to District Office', href: '/co?view=forwarding', icon: ArrowRight },
        { name: 'Validity Monitoring', href: '/co?view=validity', icon: ShieldCheck },
        { name: 'Renewal Management', href: '/co?view=renewal', icon: RefreshCw },
        { name: 'Revocation / Suspension', href: '/co?view=revocation', icon: ShieldAlert },
        { name: 'Certification Reports', href: '/co?view=reports', icon: TrendingUp },
      ];
    }

    if (role === 'icto_admin') {
      return [
        ...common,
        { name: 'Authentication Settings', href: '/icto/auth', icon: Lock },
        { name: 'Verification System', href: '/icto/verification', icon: CheckCircle },
        { name: 'Security & Encryption', href: '/icto/security', icon: Server },
        { name: 'Integrations', href: '/icto/integrations', icon: Globe },
        { name: 'System Logs', href: '/icto/logs', icon: Terminal },
        { name: 'Platform Config', href: '/icto/config', icon: Settings2 },
      ];
    }

    if (role === 'DistrictOffice') {
      return [
        ...common,
        { name: 'Approval Queue', href: '/districtoffice/queue', icon: ClipboardCheck },
        { name: 'Badge Request Status', href: '/districtoffice/status', icon: TrendingUp },
        { name: 'Training Centers', href: '/districtoffice/training-centers', icon: Building2 },
        { name: 'Assessment Centers', href: '/districtoffice/assessment-centers', icon: Building2 },
      ];
    }

    if (role === 'TrainingCenter') {
      return [
        ...common,
        { name: 'Learners', href: '/trainingcenter/learners', icon: Users },
        { name: 'Programs Offered', href: '/trainingcenter/programs', icon: Layers },
        { name: 'Batches / Classes', href: '/trainingcenter/batches', icon: Layers },
        { name: 'Learner Applications', href: '/trainingcenter/applications', icon: Building2 },
        { name: 'Badge Requests', href: '/trainingcenter/requests', icon: Award },
        { name: 'Reports', href: '/trainingcenter/reports', icon: TrendingUp },
      ];
    }

    if (role === 'AssessmentCenter') {
      return [
        ...common,
        { name: 'Learner Search', href: '/assessmentcenter/search', icon: Search },
        { name: 'Learner Profiles', href: '/assessmentcenter/profiles', icon: Users },
        { name: 'Assessment Records', href: '/assessmentcenter/records', icon: FileText },
        { name: 'RPL Records', href: '/assessmentcenter/rpl', icon: ClipboardList },
        { name: 'Submit Badge Request', href: '/assessmentcenter/submit', icon: Plus },
        { name: 'Submission Tracking', href: '/assessmentcenter/tracking', icon: TrendingUp },
      ];
    }

    return common;
  };

  const links = getLinks();

  return (
    <aside className={cn(
      "w-64 border-r border-slate-200 flex flex-col h-[calc(100vh-64px)] sticky top-16 transition-all",
      role === 'co_admin' ? "bg-white" : "bg-white"
    )}>
      <div className="p-4">
        {role === 'co_admin' ? (
          <div className="p-5 bg-blue-600 rounded-2xl shadow-lg shadow-blue-100/50 mb-6 uppercase">
            <p className="text-[10px] font-bold text-blue-100 uppercase tracking-widest mb-1 opacity-80">Certification Authority</p>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-white" />
              <p className="font-bold text-white text-sm">Central Office</p>
            </div>
          </div>
        ) : (
          <div className="px-3 py-2 mb-6 bg-slate-50 rounded-lg border border-slate-100">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Current Role</p>
            <p className="text-sm font-semibold text-slate-900">{role.replace(/([A-Z])/g, ' $1').trim()}</p>
          </div>
        )}
        
        <nav className="space-y-1.5">
          {links.map((link) => {
            if (link.type === 'dropdown') {
              return (
                <div key={link.name}>
                  <DropdownMenu>
                    <DropdownMenuTrigger className="w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-all group text-slate-600 hover:bg-slate-50 hover:text-slate-900 outline-none cursor-pointer">
                      <span className="flex items-center gap-3">
                        <link.icon className="h-4 w-4 text-slate-400 group-hover:text-slate-600" />
                        {link.name}
                      </span>
                      <ChevronRight className="h-3 w-3 text-slate-400" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" side="right" sideOffset={12} className="w-80 p-0 shadow-xl border-slate-200 bg-white">
                      <div className="p-4 bg-slate-50 rounded-t-lg border-b border-slate-200">
                        <div className="flex items-center justify-between">
                          <h3 className="font-bold text-slate-900">Notifications</h3>
                          <span className="text-[10px] font-bold bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">4 NEW</span>
                        </div>
                      </div>
                      <div className="max-h-[400px] overflow-y-auto">
                        {EXAMPLE_NOTIFICATIONS.map((note) => (
                          <div key={note.id} className="p-4 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors cursor-pointer group">
                            <div className="flex gap-3">
                              <div className={cn(
                                "w-2 h-2 rounded-full mt-1.5 shrink-0",
                                note.type === 'success' ? 'bg-emerald-500' : 
                                note.type === 'warning' ? 'bg-amber-500' : 'bg-blue-500'
                              )} />
                              <div className="space-y-1">
                                <p className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{note.title}</p>
                                <p className="text-xs text-slate-500 leading-relaxed">{note.message}</p>
                                <p className="text-[10px] text-slate-400 font-medium">{note.time}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="p-3 bg-slate-50 rounded-b-lg border-t border-slate-200">
                        <button className="w-full text-center text-xs font-bold text-blue-600 hover:text-blue-700 py-1">
                          Clear All Notifications
                        </button>
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              );
            }

            const isActive = link.href === '/co' 
              ? (location.pathname === '/co' && !location.search)
              : (link.href?.includes('?view=') 
                  ? location.search === '?' + link.href.split('?')[1]
                  : location.pathname === link.href);

            return (
              <Link
                key={link.name}
                to={link.href!}
                className={cn(
                  "flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all group",
                  isActive 
                    ? "bg-blue-600 text-white shadow-md shadow-blue-100 font-bold" 
                    : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
                )}
              >
                <div className="flex items-center gap-3">
                  <link.icon className={cn("h-4 w-4", isActive ? "text-white" : "text-slate-400 group-hover:text-slate-600")} />
                  {link.name}
                </div>
                {isActive && <div className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />}
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
