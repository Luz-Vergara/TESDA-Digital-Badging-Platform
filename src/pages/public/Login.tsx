import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, User, Building2, Briefcase, Lock, FileCheck, LayoutDashboard, LogOut } from 'lucide-react';
import { signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { auth, db } from '@/src/lib/firebase';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, collection, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import Navbar from '@/src/components/layout/Navbar';
import { useFirebase } from '@/src/lib/FirebaseProvider';

export default function Login() {
  const navigate = useNavigate();

  const { user, userProfile, logout } = useFirebase();

  const getDashboardLink = () => {
    if (!userProfile) return '/login';
    switch (userProfile.role) {
      case 'Admin': return '/admin';
      case 'qso_admin': return '/qso';
      case 'co_admin': return '/co';
      case 'icto_admin': return '/icto';
      case 'TrainingCenter': return '/trainingcenter';
      case 'AssessmentCenter': return '/assessmentcenter';
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

      const redirectPath = finalRole === 'qso_admin' ? '/qso' : finalRole === 'co_admin' ? '/co' : finalRole === 'icto_admin' ? '/icto' : `/${finalRole.toLowerCase()}`;
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
              <CardDescription>Unified access for Super Admin, QSO, CO, and ICTO modules.</CardDescription>
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
            className={`hover:border-blue-500 cursor-pointer transition-all hover:shadow-md group relative overflow-hidden ${user ? 'grayscale opacity-50' : ''}`}
            onClick={() => !user && handleGoogleLogin('AssessmentCenter')}
          >
            {isLoggingIn && (
              <div className="absolute inset-0 bg-white/20 backdrop-blur-[1px] flex items-center justify-center z-10">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            )}
            <CardHeader>
              <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center mb-4 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <Shield className="h-6 w-6" />
              </div>
              <CardTitle>Assessment Center</CardTitle>
              <CardDescription>Record assessment results and issue Skilled and Master badges.</CardDescription>
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
