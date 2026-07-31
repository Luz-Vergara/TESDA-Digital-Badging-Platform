import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Shield, Menu, X, Search, User, LogIn, LogOut, Settings, LayoutDashboard, HelpCircle, AlertTriangle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFirebase } from '@/src/lib/FirebaseProvider';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import DemoAccountLauncher from '@/src/components/demo/DemoAccountLauncher';
import firebaseConfig from '../../../firebase-applet-config.json';

export default function Navbar() {
  const [isOpen, setIsOpen] = React.useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, userProfile, logout, offlineError } = useFirebase();

  const getCleanDisplayName = () => {
    const raw = userProfile?.name || user?.displayName || '';
    if (!raw) return 'User';
    const parenthesizedMatch = raw.match(/\(([^)]+)\)/);
    if (parenthesizedMatch && parenthesizedMatch[1]) {
      return parenthesizedMatch[1];
    }
    return raw;
  };

  const navLinks = [
    { name: 'Home', href: '/' },
    { name: 'About', href: '/about' },
    { name: 'Verify Badge', href: '/verify' },
    { name: 'Orientation', href: '/orientation' },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const getDashboardLink = () => {
    if (!userProfile) return '/login';
    switch (userProfile.role) {
      case 'Admin': return '/admin';
      case 'TrainingCenter': return '/trainingcenter';
      case 'DistrictOffice': return '/districtoffice';
      default: return '/learner';
    }
  };

  return (
    <>
      {offlineError && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-950 px-4 py-3 text-xs md:text-sm font-medium sticky top-0 z-[60]">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div className="flex gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5 md:mt-0 animate-pulse" />
              <div>
                <span className="font-bold">Firestore Database is Offline for Project {firebaseConfig.projectId}</span>
                <p className="text-slate-600 mt-0.5 text-[11px] font-sans leading-relaxed pt-1">
                  To activate your database and enable digital badging: 
                  Open the <a href={`https://console.firebase.google.com/project/${firebaseConfig.projectId}/firestore`} target="_blank" rel="noopener noreferrer" className="underline font-semibold text-blue-700 hover:text-blue-800 inline-flex items-center gap-0.5">Firebase Console <ExternalLink className="h-3 w-3 inline" /></a>, 
                  click <strong className="text-slate-800">"Create database"</strong>, select <strong className="text-slate-800">"Start in test mode"</strong> (or production rules), choose your region, keep the <strong className="text-slate-800">default database ID</strong>, and save!
                </p>
              </div>
            </div>
            <div className="self-end md:self-center shrink-0">
              <Button
                size="sm"
                variant="outline"
                onClick={() => window.location.reload()}
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs border-transparent hover:text-white"
              >
                I Enabled It: Refresh App
              </Button>
            </div>
          </div>
        </div>
      )}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center gap-2">
            <Link to="/" className="flex items-center gap-2">
              <div className="bg-blue-600 p-1.5 rounded-lg">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-bold text-slate-900 leading-none">TESDA</span>
                <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Digital Badging</span>
              </div>
            </Link>
            {userProfile?.isDemo && (
              <Badge variant="destructive" className="bg-rose-500 hover:bg-rose-600 text-white animate-pulse text-[10px] font-extrabold py-1 px-2.5 tracking-wider rounded border border-rose-400 shadow-sm ml-2 font-mono">
                DEMO ACCOUNT
              </Badge>
            )}
          </div>

          {/* Desktop Links */}
          <div className="hidden md:flex items-center space-x-8">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.href}
                className={`text-sm font-medium transition-colors hover:text-blue-600 ${
                  location.pathname === link.href ? 'text-blue-600' : 'text-slate-600'
                }`}
              >
                {link.name}
              </Link>
            ))}
            <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
              <DemoAccountLauncher />
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0">
                        <Avatar className="h-10 w-10 border border-slate-200">
                          <AvatarImage src={user.photoURL || ''} alt={getCleanDisplayName()} />
                          <AvatarFallback className="bg-blue-100 text-blue-600">
                            {getCleanDisplayName().charAt(0) || <User className="h-5 w-5" />}
                          </AvatarFallback>
                        </Avatar>
                      </Button>
                    }
                  />
                  <DropdownMenuContent className="w-56" align="end">
                    <DropdownMenuGroup>
                      <DropdownMenuLabel className="font-normal">
                        <div className="flex flex-col space-y-1">
                          <p className="text-sm font-medium leading-none">{getCleanDisplayName()}</p>
                          <p className="text-xs leading-none text-slate-500">{user.email}</p>
                          <Badge className="w-fit mt-1 text-[10px] py-0 px-1.5" variant="secondary">
                            {userProfile?.role || 'Learner'}
                          </Badge>
                        </div>
                      </DropdownMenuLabel>
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                      <DropdownMenuItem
                        render={
                          <Link to={getDashboardLink()} className="cursor-pointer">
                            <LayoutDashboard className="mr-2 h-4 w-4" />
                            <span>Dashboard</span>
                          </Link>
                        }
                      />
                      <DropdownMenuItem
                        render={
                          <Link to="/profile" className="cursor-pointer">
                            <User className="mr-2 h-4 w-4" />
                            <span>Profile Settings</span>
                          </Link>
                        }
                      />
                      <DropdownMenuItem
                        render={
                          <Link to="/faq" className="cursor-pointer font-medium text-blue-600">
                            <HelpCircle className="mr-2 h-4 w-4" />
                            <span>Help Center</span>
                          </Link>
                        }
                      />
                    </DropdownMenuGroup>
                    
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="text-rose-600 cursor-pointer">
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Sign Out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Link to="/login">
                  <Button variant="ghost" size="sm" className="gap-2">
                    <LogIn className="h-4 w-4" />
                    Sign In
                  </Button>
                </Link>
              )}
              {!user && (
                <Link to="/faq">
                  <Button variant="outline" size="sm" className="gap-2 border-slate-200">
                    <HelpCircle className="h-4 w-4 text-blue-600" />
                    Help Center
                  </Button>
                </Link>
              )}
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-slate-600 hover:text-slate-900 p-2"
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isOpen && (
        <div className="md:hidden bg-white border-b border-slate-200 py-4 px-4 space-y-2">
          {user && (
            <div className="flex items-center gap-3 px-3 py-4 border-b border-slate-100 mb-2">
              <Avatar className="h-12 w-12 border border-slate-200">
                <AvatarImage src={user.photoURL || ''} alt={getCleanDisplayName()} />
                <AvatarFallback className="bg-blue-100 text-blue-600">
                  {getCleanDisplayName().charAt(0) || <User className="h-6 w-6" />}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-bold text-slate-900">{getCleanDisplayName()}</p>
                <p className="text-xs text-slate-500">{user.email}</p>
              </div>
            </div>
          )}
          {navLinks.map((link) => (
            <Link
              key={link.name}
              to={link.href}
              onClick={() => setIsOpen(false)}
              className="block px-3 py-2 text-base font-medium text-slate-600 hover:text-blue-600 hover:bg-slate-50 rounded-md"
            >
              {link.name}
            </Link>
          ))}
          <div className="pt-4 flex flex-col gap-2">
            <div className="px-3 pb-2 border-b border-slate-100/60 mb-1 flex justify-start">
              <DemoAccountLauncher />
            </div>
            {user ? (
              <>
                <Link to={getDashboardLink()} onClick={() => setIsOpen(false)}>
                  <Button variant="outline" className="w-full justify-start gap-2">
                    <LayoutDashboard className="h-4 w-4" />
                    My Dashboard
                  </Button>
                </Link>
                <Link to="/faq" onClick={() => setIsOpen(false)}>
                  <Button variant="outline" className="w-full justify-start gap-2 border-blue-100 text-blue-600">
                    <HelpCircle className="h-4 w-4" />
                    Help Center
                  </Button>
                </Link>
                <Button 
                  onClick={() => { handleLogout(); setIsOpen(false); }} 
                  variant="ghost" 
                  className="w-full justify-start gap-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </Button>
              </>
            ) : (
              <Link to="/login" onClick={() => setIsOpen(false)}>
                <Button variant="outline" className="w-full justify-start gap-2">
                  <LogIn className="h-4 w-4" />
                  Sign In
                </Button>
              </Link>
            )}
            {!user && (
              <Link to="/faq" onClick={() => setIsOpen(false)}>
                <Button variant="outline" className="w-full justify-start gap-2 border-slate-200">
                  <HelpCircle className="h-4 w-4 text-blue-600" />
                  Help Center
                </Button>
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  </>
  );
}
