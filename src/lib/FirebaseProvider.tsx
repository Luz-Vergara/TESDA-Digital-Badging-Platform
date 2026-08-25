import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { demoAccountGroups } from '../config/demoAccounts';
import { externalApi } from '../services/externalApi';
import { auth, db } from './firebase';

export interface LinkedExternalLearnerIdentity {
  displayName: string;
  learnerUli: string;
  email: string | null;
}

interface FirebaseContextType {
  user: User | null;
  userProfile: any | null;
  linkedExternalLearner: LinkedExternalLearnerIdentity | null;
  linkedExternalLearnerLoading: boolean;
  loading: boolean;
  isAuthReady: boolean;
  logout: () => Promise<void>;
  offlineError: string | null;
  profileError: string | null;
}

const FirebaseContext = createContext<FirebaseContextType>({
  user: null,
  userProfile: null,
  linkedExternalLearner: null,
  linkedExternalLearnerLoading: false,
  loading: true,
  isAuthReady: false,
  logout: async () => {},
  offlineError: null,
  profileError: null,
});

export const useFirebase = () => useContext(FirebaseContext);

export function getDemoRoleByEmail(email: string): string {
  const e = email.toLowerCase();
  const username = e.split('@')[0] || '';

  if (username.includes('qso')) return 'qso_admin';
  if (username.includes('co') || username.includes('cert') || username.includes('licens') || username.includes('credential')) return 'co_admin';
  if (username.includes('icto')) return 'icto_admin';
  if (username.includes('district') || username.includes('do')) return 'DistrictOffice';
  if (username.includes('training') || username.includes('tc')) return 'TrainingCenter';
  if (username.includes('assessment') || username.includes('ac')) return 'AssessmentCenter';
  if (username.includes('admin') || username.includes('superuser')) return 'Admin';
  if (username.includes('learner') || username.includes('student') || username.includes('holder')) return 'Learner';
  if (username.includes('employer') || username.includes('verify')) return 'Employer';

  // Safe defaults
  return 'Learner';
}

export const FirebaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<any | null>(null);
  const [linkedExternalLearner, setLinkedExternalLearner] = useState<LinkedExternalLearnerIdentity | null>(null);
  const [linkedExternalLearnerLoading, setLinkedExternalLearnerLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [offlineError, setOfflineError] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Connection probe on load
  useEffect(() => {
    async function probeConnection() {
      try {
        await getDoc(doc(db, 'system-metadata', 'probe'));
      } catch (err: any) {
        if (err instanceof Error && (err.message.includes('offline') || err.message.includes('client is offline'))) {
          setOfflineError("Firestore client is offline.");
        }
      }
    }
    probeConnection();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      try {
        setUser(currentUser);
        setProfileError(null);

        if (currentUser) {
          setIsAuthReady(false);
          setLoading(true);
          setUserProfile(null);

          const isDemo = currentUser.providerData.some(p => p.providerId === 'password') ||
                         currentUser.email?.toLowerCase().includes('demo') ||
                         localStorage.getItem('is_demo_user') === 'true';

          if (isDemo) {
            localStorage.setItem('is_demo_user', 'true');
            let stage = 'user_doc_fetch';

            try {
              // Read existing user profile
              const userDocRef = doc(db, 'users', currentUser.uid);
              const userDoc = await getDoc(userDocRef);

              stage = 'role_and_org_resolution';
              let profile = userDoc.exists() ? userDoc.data() : null;

              if (!profile) {
                // Read-only fallback profile construction if doc is not yet seeded
                const role = getDemoRoleByEmail(currentUser.email || '');
                let organizationId = '';
                let assignedDistrictId = '';

                if (role === 'TrainingCenter') {
                  const emailLower = currentUser.email?.toLowerCase() || '';
                  if (emailLower === 'training1@demo.com') {
                    organizationId = 'demo-training-center-1';
                  } else if (emailLower === 'training2@demo.com') {
                    organizationId = 'demo-training-center-2';
                  } else {
                    organizationId = 'demo-training-center';
                  }
                  assignedDistrictId = 'demo-district-office';
                } else if (role === 'AssessmentCenter') {
                  organizationId = 'demo-assessment-center';
                  assignedDistrictId = 'demo-district-office';
                } else if (role === 'DistrictOffice') {
                  organizationId = 'demo-district-office';
                  assignedDistrictId = 'demo-district-office';
                }

                let office = '';
                if (role === 'TrainingCenter') {
                  if (organizationId === 'demo-training-center-1') office = 'Demo Training Center 1';
                  else if (organizationId === 'demo-training-center-2') office = 'Demo Training Center 2';
                  else office = 'Demo Training Center - Manila';
                } else if (role === 'AssessmentCenter') {
                  office = 'Demo Assessment Center - Manila';
                } else if (role === 'DistrictOffice') {
                  office = 'Demo District Office - National Capital Region';
                } else if (role === 'qso_admin') {
                  office = 'Central QSO';
                } else if (role === 'icto_admin') {
                  office = 'ICTO Central';
                } else if (role === 'Admin') {
                  office = 'TESDA Main';
                }

                const emailLower = currentUser.email?.toLowerCase() || '';
                let defaultName = `Demo ${role.replace(/([A-Z])/g, ' $1').trim()}`;
                const demoAccount = demoAccountGroups
                  .flatMap(group => group.accounts)
                  .find(account => account.email.toLowerCase() === emailLower);
                if (demoAccount) defaultName = demoAccount.label;

                profile = {
                  uid: currentUser.uid,
                  name: currentUser.displayName || defaultName,
                  email: currentUser.email,
                  role,
                  office: office || null,
                  status: 'Active',
                  isDemo: true,
                  organizationId: organizationId || null,
                  assignedDistrictId: assignedDistrictId || null,
                  createdAt: serverTimestamp(),
                  updatedAt: serverTimestamp()
                };

                stage = 'user_doc_write';
                await setDoc(userDocRef, profile);
              }

              setUserProfile(profile);
            } catch (demoInitError: any) {
              console.error("[FirebaseProvider] Demo profile initialization failed:", {
                uid: currentUser.uid,
                email: currentUser.email,
                stage,
                code: demoInitError?.code || 'unknown',
                message: demoInitError?.message || String(demoInitError)
              });
              setUserProfile(null);
              setProfileError("Unable to initialize demo profile (" + stage + "). Please sign out and try again.");
            }
          } else {
            localStorage.setItem('is_demo_user', 'false');
            let stage = 'user_doc_fetch';

            try {
              // Regular real user authentication profile lookup
              const userDocRef = doc(db, 'users', currentUser.uid);
              const userDoc = await getDoc(userDocRef);

              let profile = userDoc.exists() ? userDoc.data() : null;

              stage = 'user_query_by_email';
              const usersRef = collection(db, 'users');
              const q = query(usersRef, where('email', '==', currentUser.email));
              const querySnapshot = await getDocs(q);

              if (!querySnapshot.empty) {
                const adminDoc = querySnapshot.docs.find(d => d.id !== currentUser.uid) || querySnapshot.docs[0];
                const adminData = adminDoc.data();

                if (adminDoc.id !== currentUser.uid || !profile || (profile.role === 'Learner' && adminData.role !== 'Learner')) {
                  profile = {
                    ...(profile || {}),
                    ...adminData,
                    uid: currentUser.uid,
                    updatedAt: serverTimestamp()
                  };
                  stage = 'user_doc_write';
                  await setDoc(userDocRef, profile);
                }
              }

              if (profile) {
                const isCenter = profile.role === 'TrainingCenter';
                if (isCenter && profile.organizationId) {
                  try {
                    stage = 'org_sync';
                    const orgDoc = await getDoc(doc(db, 'organizations', profile.organizationId));
                    if (orgDoc.exists()) {
                      const orgData = orgDoc.data();
                      if (orgData.assignedDistrictId && profile.assignedDistrictId !== orgData.assignedDistrictId) {
                        profile.assignedDistrictId = orgData.assignedDistrictId;
                        await updateDoc(userDocRef, { assignedDistrictId: orgData.assignedDistrictId });
                      }
                    }
                  } catch (e) {
                    console.error("Error syncing district ID:", e);
                  }
                }
                setUserProfile(profile);
              } else {
                const newProfile = {
                  uid: currentUser.uid,
                  name: currentUser.displayName || 'New Learner',
                  email: currentUser.email,
                  role: 'Learner',
                  createdAt: serverTimestamp(),
                };
                stage = 'new_user_doc_write';
                await setDoc(userDocRef, newProfile);
                setUserProfile(newProfile);
              }
            } catch (nonDemoError: any) {
              console.error("[FirebaseProvider] Non-demo profile initialization failed:", {
                uid: currentUser.uid,
                email: currentUser.email,
                stage,
                code: nonDemoError?.code || 'unknown',
                message: nonDemoError?.message || String(nonDemoError)
              });
              setUserProfile(null);
              setProfileError("Unable to initialize user profile (" + stage + "). Please sign out and try again.");
            }
          }
        } else {
          localStorage.setItem('is_demo_user', 'false');
          setUserProfile(null);
          setProfileError(null);
        }
      } catch (err: any) {
        console.error("[FirebaseProvider] Error loading user authenticated session:", {
          uid: auth.currentUser?.uid || 'unknown',
          email: auth.currentUser?.email || 'unknown',
          code: err?.code || 'unknown',
          message: err?.message || String(err)
        });
        const errMsg = err?.message || String(err);
        if (errMsg.includes('offline') || errMsg.includes('client is offline')) {
          setOfflineError("Firestore client is offline.");
        }
        setProfileError("Error loading authenticated user session. Please sign out and try again.");
      } finally {
        setLoading(false);
        setIsAuthReady(true);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function resolveLinkedExternalLearner() {
      setLinkedExternalLearner(null);

      if (!isAuthReady || !user || userProfile?.role !== 'Learner' || !userProfile?.isDemo) {
        setLinkedExternalLearnerLoading(false);
        return;
      }

      const demoAccount = demoAccountGroups
        .flatMap(group => group.accounts)
        .find(account => account.email.toLowerCase() === user.email?.toLowerCase());
      const learnerUli = demoAccount?.externalLearnerUli;

      if (!learnerUli) {
        setLinkedExternalLearnerLoading(false);
        return;
      }

      setLinkedExternalLearnerLoading(true);
      try {
        const linkSnapshot = await getDoc(doc(db, 'integrationLearnerLinks', learnerUli));
        const link = linkSnapshot.data();
        if (!linkSnapshot.exists() || link?.active !== true || link?.firebaseLearnerId !== user.uid) {
          throw new Error('The configured external learner link is missing, inactive, or belongs to another Firebase identity.');
        }

        const response = await externalApi.getLearnerDetails(linkSnapshot.id);
        if (!cancelled) {
          setLinkedExternalLearner({
            displayName: response.data.displayName,
            learnerUli: response.data.learnerUli,
            email: response.data.email,
          });
        }
      } catch (error) {
        console.error('[FirebaseProvider] Linked external learner identity unavailable:', error);
        if (!cancelled) setLinkedExternalLearner(null);
      } finally {
        if (!cancelled) setLinkedExternalLearnerLoading(false);
      }
    }

    void resolveLinkedExternalLearner();
    return () => {
      cancelled = true;
    };
  }, [isAuthReady, user, userProfile?.isDemo, userProfile?.role]);

  const logout = async () => {
    try {
      localStorage.setItem('is_demo_user', 'false');
      await auth.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <FirebaseContext.Provider value={{ user, userProfile, linkedExternalLearner, linkedExternalLearnerLoading, loading, isAuthReady, logout, offlineError, profileError }}>
      {children}
    </FirebaseContext.Provider>
  );
};
