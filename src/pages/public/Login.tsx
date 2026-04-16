import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, User, Building2, Briefcase, Lock, FileCheck, LayoutDashboard } from 'lucide-react';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth, db } from '@/src/lib/firebase';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import Navbar from '@/src/components/layout/Navbar';
import { useFirebase } from '@/src/lib/FirebaseProvider';

export default function Login() {
  const navigate = useNavigate();

  const { user, userProfile } = useFirebase();

  const getDashboardLink = () => {
    if (!userProfile) return '/login';
    switch (userProfile.role) {
      case 'Admin': return '/admin';
      case 'TrainingCenter': return '/trainingcenter';
      case 'AssessmentCenter': return '/assessmentcenter';
      case 'DistrictOffice': return '/districtoffice';
      default: return '/learner';
    }
  };

  const handleGoogleLogin = async (targetRole: string) => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Update or create user profile
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);

      let finalRole = targetRole;

      if (userDoc.exists()) {
        const existingData = userDoc.data();
        // If the user is currently a 'Learner', allow them to switch to the target role
        // (This handles cases where an admin assigned them a new role)
        if (existingData.role === 'Learner') {
          finalRole = targetRole;
        } else {
          // Respect existing administrative roles
          finalRole = existingData.role || targetRole;
        }
        
        await updateDoc(userDocRef, {
          role: finalRole,
          lastLogin: serverTimestamp()
        });
      } else {
        // Create new profile with the selected role
        await setDoc(userDocRef, {
          uid: user.uid,
          name: user.displayName || 'New User',
          email: user.email,
          role: targetRole,
          createdAt: serverTimestamp(),
          lastLogin: serverTimestamp()
        });
      }

      navigate(`/${finalRole.toLowerCase()}`);
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-slate-900 mb-4">Sign In to TESDA Badging</h1>
          <p className="text-slate-600">Select your portal to continue. Access is restricted to authorized users.</p>
          
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
              <p className="text-xs text-slate-400 mt-4 italic">Or select a different portal below to switch roles (for testing)</p>
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card 
            className="hover:border-blue-500 cursor-pointer transition-all hover:shadow-md group"
            onClick={() => handleGoogleLogin('Learner')}
          >
            <CardHeader>
              <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mb-4 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <User className="h-6 w-6" />
              </div>
              <CardTitle>Learner Portal</CardTitle>
              <CardDescription>Access your badge wallet and monitor your progress.</CardDescription>
            </CardHeader>
          </Card>

          <Card 
            className="hover:border-blue-500 cursor-pointer transition-all hover:shadow-md group"
            onClick={() => handleGoogleLogin('Admin')}
          >
            <CardHeader>
              <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center mb-4 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <Shield className="h-6 w-6" />
              </div>
              <CardTitle>TESDA Central Admin</CardTitle>
              <CardDescription>System-wide management, organizations, and standards.</CardDescription>
            </CardHeader>
          </Card>

          <Card 
            className="hover:border-blue-500 cursor-pointer transition-all hover:shadow-md group"
            onClick={() => handleGoogleLogin('DistrictOffice')}
          >
            <CardHeader>
              <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center mb-4 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <FileCheck className="h-6 w-6" />
              </div>
              <CardTitle>TESDA District Office</CardTitle>
              <CardDescription>Badge approvals and regional institution oversight.</CardDescription>
            </CardHeader>
          </Card>

          <Card 
            className="hover:border-blue-500 cursor-pointer transition-all hover:shadow-md group"
            onClick={() => handleGoogleLogin('TrainingCenter')}
          >
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
            onClick={() => handleGoogleLogin('AssessmentCenter')}
          >
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
