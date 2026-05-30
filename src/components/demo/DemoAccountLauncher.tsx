import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, Key, Shield, ChevronRight, Check, AlertCircle, 
  Lock, Loader2, Sparkles, LogIn, ExternalLink, HelpCircle 
} from 'lucide-react';
import { useFirebase } from '@/src/lib/FirebaseProvider';
import { demoAccountGroups, shouldShowDemoLauncher, DemoAccount } from '@/src/config/demoAccounts';
import { loginWithDemoAccount } from '@/src/services/demoLoginService';
import { Button } from '@/components/ui/button';

export default function DemoAccountLauncher() {
  const navigate = useNavigate();
  const { user, userProfile } = useFirebase();
  const [isOpen, setIsOpen] = useState(false);
  const [activeGroupIndex, setActiveGroupIndex] = useState<number | null>(null);
  
  // Login flow states
  const [status, setStatus] = useState<'idle' | 'signing_out' | 'authenticating' | 'success' | 'failed'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [errorText, setErrorText] = useState<string | null>(null);

  // Password collection modal/inline state
  const [passwordPromptOpen, setPasswordPromptOpen] = useState(false);
  const [pendingAccount, setPendingAccount] = useState<DemoAccount | null>(null);
  const [passwordValue, setPasswordValue] = useState('');
  const [savePasswordCheck, setSavePasswordCheck] = useState(true);

  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setActiveGroupIndex(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const visible = shouldShowDemoLauncher(user, userProfile);

  if (!visible) return null;

  const handleAccountClick = async (account: DemoAccount, groupPath: string) => {
    setPendingAccount(account);
    setErrorText(null);

    const cachedPass = sessionStorage.getItem('demo_session_password');
    if (cachedPass) {
      // We already have password cached in session, sign in directly!
      await executeLogin(account, cachedPass, groupPath);
    } else {
      // Need password prompt
      setPasswordPromptOpen(true);
      setPasswordValue('');
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingAccount || !passwordValue) return;

    setPasswordPromptOpen(false);
    await executeLogin(pendingAccount, passwordValue, pendingAccount.email.includes('admin') ? '/admin' : undefined);
  };

  const executeLogin = async (account: DemoAccount, pass: string, targetPath?: string) => {
    setStatus('authenticating');
    setStatusMessage(`Signing in to ${account.label}...`);
    setErrorText(null);

    // Look up correct dashboard path for the role group
    const matchedGroup = demoAccountGroups.find(g => 
      g.accounts.some(acc => acc.id === account.id)
    );
    const destinationPath = targetPath || matchedGroup?.dashboardPath || '/learner';

    try {
      const success = await loginWithDemoAccount(
        account,
        async () => pass, // return the submitted password
        (statusVal, msg) => {
          setStatus(statusVal);
          if (msg) setStatusMessage(msg);
        }
      );

      if (success) {
        setIsOpen(false);
        setActiveGroupIndex(null);
        // Clear password cached if user unchecked "remember for this session"
        if (!savePasswordCheck) {
          sessionStorage.removeItem('demo_session_password');
        }
        navigate(destinationPath);
      }
    } catch (err: any) {
      console.error(err);
      setStatus('failed');
      setErrorText(err.message || 'Login failed. Please verify credentials.');
    }
  };

  const handleGoToLoginPage = () => {
    setPasswordPromptOpen(false);
    setIsOpen(false);
    if (pendingAccount) {
      navigate(`/login?email=${encodeURIComponent(pendingAccount.email)}`);
    } else {
      navigate('/login');
    }
  };

  return (
    <div className="relative inline-block text-left" id="demo-account-launcher" ref={containerRef}>
      {/* Launcher Trigger Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className={`gap-2 h-9 px-4 rounded-lg font-bold border transition-all duration-200 shadow-sm ${
          isOpen
            ? 'bg-blue-50 border-blue-300 text-blue-700 font-extrabold ring-2 ring-blue-500/20'
            : 'border-blue-200 bg-blue-50/40 text-blue-800 hover:bg-blue-50 hover:text-blue-900'
        }`}
      >
        <Sparkles className="h-4 w-4 text-blue-600 animate-pulse" />
        <span className="text-xs tracking-wide">Demo Accounts</span>
        <ChevronRight className={`h-3 w-3 text-blue-500 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`} />
      </Button>

      {/* Main Dropdown Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute right-0 mt-2 w-80 md:w-[480px] bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50 flex flex-col md:flex-row max-h-[85vh]"
          >
            {/* Roles Sidebar Section */}
            <div className="w-full md:w-1/2 border-b md:border-b-0 md:border-r border-slate-100 bg-slate-50/50 p-3 max-h-[40vh] md:max-h-none overflow-y-auto">
              <div className="flex items-center justify-between px-2 pb-2 mb-2 border-b border-slate-200/60">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Select Role Group</span>
                <span className="text-[9px] bg-blue-100/80 text-blue-700 font-extrabold px-1.5 py-0.5 rounded uppercase">Prototype</span>
              </div>
              <ul className="space-y-1">
                {demoAccountGroups.map((group, index) => {
                  const isGroupActive = activeGroupIndex === index;
                  return (
                    <li key={group.role}>
                      <button
                        onMouseEnter={() => setActiveGroupIndex(index)}
                        onClick={() => setActiveGroupIndex(index)}
                        className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-lg flex items-center justify-between transition-colors ${
                          isGroupActive
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Users className={`h-3.5 w-3.5 ${isGroupActive ? 'text-white' : 'text-slate-400'}`} />
                          <span>{group.label}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                            isGroupActive ? 'bg-blue-500 text-white' : 'bg-slate-200/70 text-slate-600'
                          }`}>
                            {group.accounts.length}
                          </span>
                          <ChevronRight className={`h-3.5 w-3.5 transition-transform ${isGroupActive ? 'translate-x-0.5' : 'text-slate-400'}`} />
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Selected Accounts List Section */}
            <div className="w-full md:w-1/2 p-3 bg-white flex flex-col justify-between max-h-[45vh] md:max-h-none overflow-y-auto">
              <div>
                <div className="px-2 pb-2 mb-2 border-b border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    {activeGroupIndex !== null 
                      ? `${demoAccountGroups[activeGroupIndex].label} Accounts`
                      : 'Choose a role'
                    }
                  </span>
                </div>

                {activeGroupIndex !== null ? (
                  <div className="space-y-2">
                    {demoAccountGroups[activeGroupIndex].accounts.map((account) => (
                      <button
                        key={account.id}
                        onClick={() => handleAccountClick(account, demoAccountGroups[activeGroupIndex].dashboardPath)}
                        className="w-full text-left p-2.5 rounded-lg border border-slate-100 hover:border-blue-200 hover:bg-blue-50/30 transition-all group flex flex-col"
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="text-xs font-bold text-slate-800 group-hover:text-blue-700">
                            {account.label}
                          </span>
                          <LogIn className="h-3 w-3 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all" />
                        </div>
                        <span className="text-[10px] font-mono text-slate-500 mt-0.5">
                          {account.email}
                        </span>
                        {account.organizationName && (
                          <span className="text-[9px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded mt-1.5 font-medium w-fit">
                            {account.organizationName}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="h-40 flex flex-col items-center justify-center text-center p-4">
                    <HelpCircle className="h-8 w-8 text-slate-300 mb-2 animate-bounce" />
                    <p className="text-xs font-medium text-slate-400">Hover or click a role group in the left panel to show accounts</p>
                  </div>
                )}
              </div>

              {/* Status and Feedback Footer inside Dropdown */}
              {(status !== 'idle' || errorText) && (
                <div className="mt-4 pt-3 border-t border-slate-100">
                  {status === 'signing_out' || status === 'authenticating' ? (
                    <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-lg flex items-center gap-2">
                      <Loader2 className="h-4 w-4 text-blue-600 animate-spin shrink-0" />
                      <span className="text-[11px] font-bold text-slate-700 animate-pulse">
                        {statusMessage}
                      </span>
                    </div>
                  ) : null}

                  {errorText && (
                    <div className="bg-rose-50 border border-rose-200 p-2.5 rounded-lg flex items-start gap-2 text-rose-800">
                      <AlertCircle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-[10px] font-extrabold uppercase tracking-wide">Authentication Error</p>
                        <p className="text-[10px] leading-normal">{errorText}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Secure Secure Session Password Prompt Dialog */}
      <AnimatePresence>
        {passwordPromptOpen && pendingAccount && (
          <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-[2px] flex items-center justify-center z-[1000] p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden"
            >
              <div className="bg-blue-600 p-5 text-white flex items-center gap-3">
                <div className="bg-white/15 p-2 rounded-xl">
                  <Lock className="h-5 w-5 text-white animate-pulse" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Secure Demo Authentication</h3>
                  <p className="text-blue-100 text-[11px]">Connecting to {pendingAccount.label}</p>
                </div>
              </div>

              <form onSubmit={handlePasswordSubmit} className="p-6 space-y-4">
                <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg text-xs text-blue-800 leading-relaxed">
                  <p className="font-bold mb-1 flex items-center gap-1.5">
                    <Shield className="h-3.5 w-3.5 text-blue-600" />
                    No Pre-stored Secret Password
                  </p>
                  To respect security mandates, credentials are not stored in frontend source code. Enter the demo user's password once below. It will be cached for your session.
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Demo Account Email
                  </label>
                  <input
                    type="text"
                    disabled
                    value={pendingAccount.email}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-500 font-mono focus:outline-none"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                      Demo Password
                    </label>
                    <span className="text-[10px] text-slate-400 italic">e.g. system demo credential</span>
                  </div>
                  <input
                    type="password"
                    required
                    autoFocus
                    placeholder="••••••••"
                    value={passwordValue}
                    onChange={(e) => setPasswordValue(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 shadow-sm"
                  />
                </div>

                {/* Session checkbox */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="save_password_check"
                    checked={savePasswordCheck}
                    onChange={(e) => setSavePasswordCheck(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 rounded border-slate-300"
                  />
                  <label htmlFor="save_password_check" className="text-xs text-slate-600 font-medium">
                    Cache password for this tab session (enables instantaneous switching)
                  </label>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-3 pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setPasswordPromptOpen(false);
                      setPendingAccount(null);
                    }}
                    className="flex-1 h-11 text-slate-500 text-xs font-bold hover:bg-slate-50"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-blue-600 hover:bg-blue-700 h-11 font-bold text-white text-xs shadow-sm gap-2"
                  >
                    <Key className="h-4 w-4" />
                    Enter Portal
                  </Button>
                </div>

                {/* External Login backup link */}
                <div className="border-t border-slate-100 pt-4 text-center">
                  <button
                    type="button"
                    onClick={handleGoToLoginPage}
                    className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-700 text-xs font-bold transition-colors"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Prefill and go to full Demo Sign In page
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
