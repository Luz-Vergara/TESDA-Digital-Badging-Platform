import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Shield, User, Building2, Briefcase, Lock, FileCheck, LayoutDashboard, LogOut, CheckCircle2, Sparkles, HelpCircle, AlertTriangle } from 'lucide-react';
import { createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, signOut, signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '@/src/lib/firebase';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, collection, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import Navbar from '@/src/components/layout/Navbar';
import { useFirebase, getDemoRoleByEmail } from '@/src/lib/FirebaseProvider';
import { demoAccountGroups } from '@/src/config/demoAccounts';

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const { user, userProfile, logout } = useFirebase();

  const [demoEmail, setDemoEmail] = useState('');
  const [demoPassword, setDemoPassword] = useState('');
  const [isDemoSubmitting, setIsDemoSubmitting] = useState(false);
  const [isDemoLoginOpen, setIsDemoLoginOpen] = useState(false);

  // Seeding states
  const [isSeeding, setIsSeeding] = useState(false);
  const [seedingProgress, setSeedingProgress] = useState<{email: string; label: string; status: 'idle' | 'creating' | 'done' | 'exists' | 'error'; error?: string}[]>([]);
  const [seedingDone, setSeedingDone] = useState(false);
  const [seedPassword, setSeedPassword] = useState('demo123456');
  const [seedingGlobalError, setSeedingGlobalError] = useState<string | null>(null);
  const [isBootstrappingSectionOpen, setIsBootstrappingSectionOpen] = useState(false);

  useEffect(() => {
    const emailParam = searchParams.get('email');
    if (emailParam) {
      setDemoEmail(emailParam);
      setIsDemoLoginOpen(true);
      setTimeout(() => {
        const passInput = document.querySelector('input[type="password"]');
        if (passInput) {
          (passInput as HTMLInputElement).focus();
        }
      }, 300);
    }
  }, [searchParams]);

  const handleDemoLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isDemoSubmitting || !demoEmail || !demoPassword) return;

    setIsDemoSubmitting(true);
    setLoginError(null);

    try {
      localStorage.setItem('is_demo_user', 'true');
      const result = await signInWithEmailAndPassword(auth, demoEmail, demoPassword);
      const user = result.user;
      
      const role = getDemoRoleByEmail(user.email || '');
      
      const redirectPath = role === 'qso_admin' ? '/qso' : 
                           role === 'icto_admin' ? '/icto' : 
                           `/${role.toLowerCase()}`;
      
      navigate(redirectPath);
    } catch (error: any) {
      console.error('Demo Login failed:', error);
      localStorage.setItem('is_demo_user', 'false');
      
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        setLoginError('Invalid demo credentials. Ensure this account has been manually created in the Firebase Console and that the email and password are correct.');
      } else {
        setLoginError('Error signing in to demo account: ' + (error.message || 'Unknown error'));
      }
    } finally {
      setIsDemoSubmitting(false);
    }
  };

  const handleBootstrapDemoAccounts = async () => {
    if (isSeeding) return;
    setIsSeeding(true);
    setSeedingGlobalError(null);
    setSeedingDone(false);

    // Get all unique emails from demoAccountGroups
    const accountsToCreate: { email: string; label: string; role: string }[] = [];
    const seenEmails = new Set<string>();

    demoAccountGroups.forEach(group => {
      group.accounts.forEach(acc => {
        const emailLower = acc.email.toLowerCase();
        if (!seenEmails.has(emailLower)) {
          seenEmails.add(emailLower);
          accountsToCreate.push({
            email: acc.email,
            label: acc.label,
            role: group.role
          });
        }
      });
    });

    // Initialize progress state
    setSeedingProgress(accountsToCreate.map(acc => ({
      email: acc.email,
      label: acc.label,
      status: 'idle' as const
    })));

    // Since we are going to create them, we sign out current auth user first
    if (auth.currentUser) {
      try {
        await signOut(auth);
      } catch (e) {
        console.warn("Sign out before seed failed:", e);
      }
    }

    let operationNotAllowedDetected = false;

    for (let i = 0; i < accountsToCreate.length; i++) {
      const acc = accountsToCreate[i];
      
      // Update state to 'creating'
      setSeedingProgress(prev => prev.map((p, idx) => idx === i ? { ...p, status: 'creating' } : p));

      try {
        // Attempt to create user in Firebase Auth
        await createUserWithEmailAndPassword(auth, acc.email, seedPassword);
        
        // Update state to 'done'
        setSeedingProgress(prev => prev.map((p, idx) => idx === i ? { ...p, status: 'done' } : p));

        // Sign out right after creating so we can create the next one
        await signOut(auth);
      } catch (error: any) {
        console.error(`Error creating ${acc.email}:`, error);
        
        if (error.code === 'auth/email-already-in-use') {
          setSeedingProgress(prev => prev.map((p, idx) => idx === i ? { ...p, status: 'exists' } : p));
        } else if (error.code === 'auth/operation-not-allowed') {
          operationNotAllowedDetected = true;
          setSeedingProgress(prev => prev.map((p, idx) => idx === i ? { ...p, status: 'error', error: 'Email/Password provider is disabled.' } : p));
          break; // Stop execution as this means Email/Password provider is disabled
        } else {
          setSeedingProgress(prev => prev.map((p, idx) => idx === i ? { ...p, status: 'error', error: error.message || 'Failed' } : p));
        }
      }
    }

    setIsSeeding(false);
    if (operationNotAllowedDetected) {
      setSeedingGlobalError(
        'Email/Password provider is currently disabled in your brand new Firebase project. ' +
        'Please open your Firebase Console (https://console.firebase.google.com/) > Select project "badging-6a4d1" > Build > Authentication > Sign-in method, click "Email/Password" under Native providers, Toggle is as "Enabled", and click "Save". Then return here and click Bootstrap again!'
      );
    } else {
      setSeedingDone(true);
    }
  };

  const getDashboardLink = () => {
    if (!userProfile) return '/login';
    switch (userProfile.role) {
      case 'Admin': return '/admin';
      case 'qso_admin': return '/qso';
      case 'icto_admin': return '/icto';
      case 'TrainingCenter': return '/trainingcenter';
      case 'DistrictOffice': return '/districtoffice';
      default: return '/learner';
    }
  };

  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const handleGoogleLogin = async (targetRole: string) => {
    if (isLoggingIn) return;
    
    setIsLoggingIn(true);
    setLoginError(null);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Master Admin emails that can bypass the "pre-registered" check
      const masterAdmins = ["lmvergara@tesda.gov.ph", "domsrock123@gmail.com"];
      const isMasterAdmin = masterAdmins.includes(user.email || '');

      // Check if user profile exists in Firestore by UID
      const userDocRef = doc(db, 'users', user.uid);
      let userDoc = await getDoc(userDocRef);
      let finalRole = targetRole;

      if (!userDoc.exists()) {
        // Not found by UID, let's search by email in 'users' collection
        const usersRef = collection(db, 'users');
        const qUsers = query(usersRef, where('email', '==', user.email));
        const userQuerySnap = await getDocs(qUsers);

        if (!userQuerySnap.empty) {
          // User was pre-registered by email, let's migrate/link the document
          const existingDoc = userQuerySnap.docs[0];
          const existingData = existingDoc.data();
          
          // Copy data to the UID-based document and delete the old one (or just use it)
          // For simplicity and consistency with our auth provider hook, we migrate to UID-based document
          await setDoc(userDocRef, {
            ...existingData,
            uid: user.uid,
            lastLogin: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
          
          // If the IDs are different, delete the old random ID document
          if (existingDoc.id !== user.uid) {
            await deleteDoc(doc(db, 'users', existingDoc.id));
          }
          
          userDoc = await getDoc(userDocRef);
          finalRole = existingData.role;
        } else {
          // Not found in 'users', check in 'learners' if they are logging in as a learner
          const learnersRef = collection(db, 'learners');
          const qLearners = query(learnersRef, where('email', '==', user.email));
          const learnerQuerySnap = await getDocs(qLearners);

          if (!learnerQuerySnap.empty) {
            // Found in learners, create a user profile for them
            finalRole = 'Learner';
            await setDoc(userDocRef, {
              uid: user.uid,
              name: user.displayName || 'Learner',
              email: user.email,
              role: 'Learner',
              createdAt: serverTimestamp(),
              lastLogin: serverTimestamp()
            });
            userDoc = await getDoc(userDocRef);
          } else if (isMasterAdmin) {
            // Bootstrap master admin if it's their first time
            finalRole = 'Admin';
            await setDoc(userDocRef, {
              uid: user.uid,
              name: user.displayName || 'Master Admin',
              email: user.email,
              role: finalRole,
              createdAt: serverTimestamp(),
              lastLogin: serverTimestamp()
            });
            userDoc = await getDoc(userDocRef);
          } else {
            // Log out immediately if not found anywhere and not a master admin
            await auth.signOut();
            setLoginError('Your email is not registered for any access portal. Please contact a TESDA Super Admin to gain access.');
            setIsLoggingIn(false);
            return;
          }
        }
      } else {
        // Doc exists by UID
        const existingData = userDoc.data();
        finalRole = existingData.role;
        await updateDoc(userDocRef, {
          lastLogin: serverTimestamp()
        });
      }

      const redirectPath = finalRole === 'qso_admin' ? '/qso' : finalRole === 'icto_admin' ? '/icto' : `/${finalRole.toLowerCase()}`;
      navigate(redirectPath);
    } catch (error: any) {
      console.error('Login failed:', error);
      if (error.code === 'auth/cancelled-popup-request') {
        setLoginError('Login was cancelled. Please try again.');
      } else if (error.code === 'auth/popup-closed-by-user') {
        setLoginError('Login window was closed. Please try again.');
      } else {
        setLoginError('An unexpected error occurred during login.');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-slate-900 mb-4">Sign In to TESDA Badging</h1>
          <p className="text-slate-600">Select your portal to continue. Access is restricted to authorized users.</p>
          
          {loginError && (
            <div className="mt-8 p-4 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg animate-in fade-in slide-in-from-top-2 duration-300 max-w-md mx-auto">
              {loginError}
            </div>
          )}

          {user && (
            <div className="mt-8 p-6 bg-white rounded-2xl border border-blue-100 shadow-sm max-w-md mx-auto">
              <p className="text-sm text-slate-500 mb-4">You are currently signed in as <span className="font-bold text-slate-900">{user.email}</span></p>
              <Button 
                className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-lg font-bold gap-2"
                onClick={() => navigate(getDashboardLink())}
              >
                <LayoutDashboard className="h-5 w-5" />
                Continue to {userProfile?.role || 'Learner'} Dashboard
              </Button>
              <Button 
                variant="outline"
                className="w-full mt-3 h-11 border-slate-200 text-slate-600 gap-2 font-bold"
                onClick={() => logout()}
              >
                <LogOut className="h-4 w-4" />
                Sign Out to Switch Account
              </Button>
              <p className="text-xs text-slate-400 mt-4 italic">Or select a different portal below to switch roles (for testing)</p>
            </div>
          )}
        </div>

        <div className="text-center mb-8">
          <Button
            variant="outline"
            onClick={() => setIsDemoLoginOpen(!isDemoLoginOpen)}
            className="border-blue-200 bg-blue-50/50 text-blue-700 hover:bg-blue-100/50 hover:text-blue-800 font-bold text-sm gap-2 px-6 h-11 shadow-sm rounded-full"
          >
            <Lock className="h-4 w-4" />
            {isDemoLoginOpen ? "Hide Prototype Testing Login" : "Show Demo Account Login for Prototype Testing"}
          </Button>
        </div>

        {isDemoLoginOpen && (
          <Card className="max-w-md mx-auto mb-12 border-blue-200 bg-blue-50/20 p-6 shadow-sm animate-in fade-in slide-in-from-top-4 duration-300">
            <CardHeader className="p-0 mb-4 text-center">
              <CardTitle className="text-lg font-bold text-slate-800 gap-2 flex items-center justify-center">
                <Lock className="h-5 w-5 text-blue-600 animate-pulse" />
                Demo Account Sign In
              </CardTitle>
              <CardDescription className="text-slate-600 mt-1">
                Enter email and password for a manually created Firebase console user to test roles.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <form onSubmit={handleDemoLogin} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">Email Address</label>
                  <input
                    type="email"
                    value={demoEmail}
                    onChange={(e) => setDemoEmail(e.target.value)}
                    placeholder="learner@demo.com"
                    required
                    className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">Password</label>
                  <input
                    type="password"
                    value={demoPassword}
                    onChange={(e) => setDemoPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 shadow-sm"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={isDemoSubmitting}
                  className="w-full bg-blue-600 hover:bg-blue-700 font-bold h-11 text-white gap-2 mt-2"
                >
                  {isDemoSubmitting ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    "Login to Demo Portal"
                  )}
                </Button>
              </form>
              
              <div className="mt-6 border-t border-slate-200 pt-4">
                <p className="text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-wide">Prototype Testing Key (Email Mapping)</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-slate-600 font-mono bg-white p-3 rounded-lg border border-slate-100">
                  <div>• learner@demo.com <span className="text-blue-600 font-sans font-medium">(Learner)</span></div>
                  <div>• admin@demo.com <span className="text-blue-600 font-sans font-medium">(Admin)</span></div>
                  <div>• qso@demo.com <span className="text-blue-600 font-sans font-medium">(QSO)</span></div>
                  <div>• district@demo.com <span className="text-blue-600 font-sans font-medium">(District)</span></div>
                  <div>• training@demo.com <span className="text-blue-600 font-sans font-medium">(Training)</span></div>
                  <div>• icto@demo.com <span className="text-blue-600 font-sans font-medium">(ICTO)</span></div>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsBootstrappingSectionOpen(!isBootstrappingSectionOpen)}
                    className="w-full text-left flex items-center justify-between text-xs font-bold text-blue-700 hover:text-blue-800 transition-colors p-2.5 bg-blue-50/50 rounded-lg border border-blue-100"
                  >
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-blue-600 animate-pulse" />
                      Bootstrap Project Demo Accounts
                    </span>
                    <span className="text-[10px] bg-blue-200/50 px-1.5 py-0.5 rounded text-blue-800">
                      {isBootstrappingSectionOpen ? 'Hide Setup' : '1-Click Setup'}
                    </span>
                  </button>

                  {isBootstrappingSectionOpen && (
                    <div className="mt-3 p-3 bg-white rounded-lg border border-slate-200 text-xs text-slate-700 space-y-3 animate-in fade-in duration-200">
                      <p className="leading-relaxed">
                        To easily test all platform roles in your personal Firebase project (<code>badging-6a4d1</code>) without registering each user manually, set a shared password below and trigger our 1-click bootstrapper:
                      </p>

                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Shared Password</label>
                        <input
                          type="text"
                          value={seedPassword}
                          disabled={isSeeding}
                          onChange={(e) => setSeedPassword(e.target.value)}
                          placeholder="demo123456"
                          className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs font-mono text-slate-800 shadow-inner"
                        />
                      </div>

                      <Button
                        type="button"
                        onClick={handleBootstrapDemoAccounts}
                        disabled={isSeeding}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-9 text-xs shadow-sm gap-2 mt-1"
                      >
                        {isSeeding ? (
                          <span className="flex items-center gap-2">
                            <span className="animate-spin inline-block h-3.5 w-3.5 border-b-2 border-white rounded-full" />
                            Registering Accounts...
                          </span>
                        ) : (
                          <>
                            <Sparkles className="h-3.5 w-3.5 animate-pulse" />
                            Run 1-Click Bootstrap
                          </>
                        )}
                      </Button>

                      {/* Display Progress details */}
                      {seedingProgress.length > 0 && (
                        <div className="space-y-1.5 max-h-40 overflow-y-auto border border-slate-100 p-2 rounded bg-slate-50 text-[10px] font-mono">
                          {seedingProgress.map((p) => (
                            <div key={p.email} className="flex items-center justify-between gap-2 border-b border-slate-200/40 pb-1 last:border-0 last:pb-0">
                              <span className="truncate flex-1" title={p.email}>
                                <strong>{p.label}</strong> ({p.email})
                              </span>
                              <span>
                                {p.status === 'idle' && <span className="text-slate-400">Waiting</span>}
                                {p.status === 'creating' && <span className="text-blue-600 font-bold animate-pulse">Creating...</span>}
                                {p.status === 'done' && <span className="text-emerald-600 font-bold flex items-center gap-0.5">✓ Created</span>}
                                {p.status === 'exists' && <span className="text-amber-600 font-medium">✓ Ready</span>}
                                {p.status === 'error' && <span className="text-rose-600 font-bold">✗ Error</span>}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {seedingGlobalError && (
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded text-amber-900 leading-relaxed text-[11px] font-medium flex gap-2">
                          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                          <div>{seedingGlobalError}</div>
                        </div>
                      )}

                      {seedingDone && !seedingGlobalError && (
                        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded text-emerald-950 font-medium text-[11px] flex gap-2">
                          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                          <div>
                            <strong>Demo bootstrapping complete!</strong> All accounts are registered in your Firebase project! Click any account in the launcher or login directly with password: <code>{seedPassword}</code>.
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className={`grid md:grid-cols-2 gap-6 transition-opacity duration-300 ${isLoggingIn || user ? 'opacity-50 pointer-events-none' : ''}`}>
          <Card 
            className={`hover:border-blue-500 cursor-pointer transition-all hover:shadow-md group relative overflow-hidden ${user ? 'grayscale opacity-50' : ''}`}
            onClick={() => !user && handleGoogleLogin('Learner')}
          >
            {isLoggingIn && (
              <div className="absolute inset-0 bg-white/20 backdrop-blur-[1px] flex items-center justify-center z-10">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            )}
            <CardHeader>
              <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mb-4 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <User className="h-6 w-6" />
              </div>
              <CardTitle>Learner Portal</CardTitle>
              <CardDescription>Access your badge wallet and monitor your progress.</CardDescription>
            </CardHeader>
          </Card>

          <Card 
            className={`hover:border-blue-500 cursor-pointer transition-all hover:shadow-md group relative overflow-hidden ${user ? 'grayscale opacity-50' : ''}`}
            onClick={() => !user && handleGoogleLogin('Admin')}
          >
            {isLoggingIn && (
              <div className="absolute inset-0 bg-white/20 backdrop-blur-[1px] flex items-center justify-center z-10">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            )}
            <CardHeader>
              <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center mb-4 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <Shield className="h-6 w-6" />
              </div>
              <CardTitle>TESDA Admin Portal</CardTitle>
              <CardDescription>Unified access for Super Admin, QSO, and ICTO modules.</CardDescription>
            </CardHeader>
          </Card>

          <Card 
            className={`hover:border-blue-500 cursor-pointer transition-all hover:shadow-md group relative overflow-hidden ${user ? 'grayscale opacity-50' : ''}`}
            onClick={() => !user && handleGoogleLogin('DistrictOffice')}
          >
            {isLoggingIn && (
              <div className="absolute inset-0 bg-white/20 backdrop-blur-[1px] flex items-center justify-center z-10">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            )}
            <CardHeader>
              <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center mb-4 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <FileCheck className="h-6 w-6" />
              </div>
              <CardTitle>TESDA District Office</CardTitle>
              <CardDescription>Badge approvals and regional institution oversight.</CardDescription>
            </CardHeader>
          </Card>

          <Card 
            className={`hover:border-blue-500 cursor-pointer transition-all hover:shadow-md group relative overflow-hidden ${user ? 'grayscale opacity-50' : ''}`}
            onClick={() => !user && handleGoogleLogin('TrainingCenter')}
          >
            {isLoggingIn && (
              <div className="absolute inset-0 bg-white/20 backdrop-blur-[1px] flex items-center justify-center z-10">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            )}
            <CardHeader>
              <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <Building2 className="h-6 w-6" />
              </div>
              <CardTitle>Training Center</CardTitle>
              <CardDescription>Issue Proficient and Expert badges for completed programs.</CardDescription>
            </CardHeader>
          </Card>

          <Card 
            className="hover:border-blue-500 cursor-pointer transition-all hover:shadow-md group"
            onClick={() => navigate('/verify')}
          >
            <CardHeader>
              <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center mb-4 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <Briefcase className="h-6 w-6" />
              </div>
              <CardTitle>Employer / Verifier</CardTitle>
              <CardDescription>Public verification portal for industry partners.</CardDescription>
            </CardHeader>
          </Card>
        </div>

        <div className="mt-12 p-6 bg-blue-50 rounded-xl border border-blue-100 flex items-start gap-4">
          <Lock className="h-6 w-6 text-blue-600 shrink-0 mt-1" />
          <div>
            <p className="font-bold text-blue-900">Security Notice</p>
            <p className="text-sm text-blue-800">
              This is a secure government system. Unauthorized access is strictly prohibited and subject to legal action. 
              All activities are logged and monitored.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
