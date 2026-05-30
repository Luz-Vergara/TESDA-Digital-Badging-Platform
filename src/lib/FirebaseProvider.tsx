import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';

interface FirebaseContextType {
  user: User | null;
  userProfile: any | null;
  loading: boolean;
  isAuthReady: boolean;
  logout: () => Promise<void>;
}

const FirebaseContext = createContext<FirebaseContextType>({
  user: null,
  userProfile: null,
  loading: true,
  isAuthReady: false,
  logout: async () => {},
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

async function seedDemoTemplatesAndData() {
  const demoTemplates = [
    {
      id: 'demo-template-1',
      badgeName: 'Computer Systems Servicing NC II',
      qualificationName: 'Computer Systems Servicing NC II',
      qualificationCode: 'CSS-NCII-2026',
      badgeType: 'Master',
      credentialLevel: 'National Certificate',
      relatedCompetency: 'Install networks, server setup, repair systems',
      description: 'Demonstrates mastery in computer systems servicing',
      criteria: 'Successful completion of national assessment',
      validityMonths: 60,
      alignment: 'PQF Level 3',
      tags: ['IT', 'Hardware', 'Networking'],
      issuableBy: ['CertificationOffice'],
      requiresApproval: true,
      displayOrder: 1,
      hierarchyVisible: true,
      status: 'Approved',
      isDemo: true
    },
    {
      id: 'demo-template-2',
      badgeName: 'Cloud Computing Fundamentals',
      qualificationName: 'Cloud Computing Fundamentals',
      qualificationCode: 'CCF-2026',
      badgeType: 'Expert',
      credentialLevel: 'Full Qualification / Certificate of Training',
      relatedCompetency: 'Deploy cloud infrastructure and serverless systems',
      description: 'Awarded for completing the cloud training course',
      criteria: 'Passed final assessment exam',
      validityMonths: 36,
      alignment: 'Institutional Standard',
      tags: ['Cloud', 'AWS', 'Azure'],
      issuableBy: ['TrainingCenter'],
      requiresApproval: true,
      displayOrder: 2,
      hierarchyVisible: true,
      status: 'Approved',
      isDemo: true
    }
  ];

  for (const tmpl of demoTemplates) {
    const docRef = doc(db, 'badgeTemplates', tmpl.id);
    const tmplDoc = await getDoc(docRef);
    if (!tmplDoc.exists()) {
      await setDoc(docRef, { 
        ...tmpl, 
        createdAt: serverTimestamp(), 
        updatedAt: serverTimestamp() 
      });
    }
  }
}

export const FirebaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        const isDemo = currentUser.providerData.some(p => p.providerId === 'password') || 
                       currentUser.email?.toLowerCase().includes('demo') ||
                       localStorage.getItem('is_demo_user') === 'true';

        if (isDemo) {
          localStorage.setItem('is_demo_user', 'true');
          
          // Force profile mapping & creation/sync
          const userDocRef = doc(db, 'users', currentUser.uid);
          const userDoc = await getDoc(userDocRef);
          
          const role = getDemoRoleByEmail(currentUser.email || '');
          let organizationId = '';
          let assignedDistrictId = '';
          
          if (role === 'TrainingCenter') {
            organizationId = 'demo-training-center';
            assignedDistrictId = 'demo-district-office';
          } else if (role === 'AssessmentCenter') {
            organizationId = 'demo-assessment-center';
            assignedDistrictId = 'demo-district-office';
          } else if (role === 'DistrictOffice') {
            organizationId = 'demo-district-office';
          }

          // Force setup of demo organization if active
          if (organizationId) {
            const orgDocRef = doc(db, 'organizations', organizationId);
            const orgDoc = await getDoc(orgDocRef);
            if (!orgDoc.exists()) {
              await setDoc(orgDocRef, {
                id: organizationId,
                name: role === 'TrainingCenter' ? 'Demo Training Center - Manila' :
                      role === 'AssessmentCenter' ? 'Demo Assessment Center - Manila' :
                      'Demo District Office - National Capital Region',
                type: role === 'DistrictOffice' ? 'DistrictOffice' : role,
                email: currentUser.email,
                location: 'Manila, Philippines',
                assignedDistrictId: assignedDistrictId || null,
                status: 'Active',
                isDemo: true,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
              });
            }
          }

          // Make sure demo district office exists to prevent empty drop downs
          if (assignedDistrictId) {
            const distDocRef = doc(db, 'organizations', assignedDistrictId);
            const distDoc = await getDoc(distDocRef);
            if (!distDoc.exists()) {
              await setDoc(distDocRef, {
                id: assignedDistrictId,
                name: 'Demo District Office - National Capital Region',
                type: 'DistrictOffice',
                email: 'district@demo.com',
                location: 'Manila, Philippines',
                status: 'Active',
                isDemo: true,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
              });
            }
          }

          let profile = userDoc.exists() ? userDoc.data() : null;
          
          const demoProfile = {
            uid: currentUser.uid,
            name: currentUser.displayName || `Demo ${role === 'co_admin' ? 'Certification Officer' : role === 'qso_admin' ? 'QSO Admin' : role === 'icto_admin' ? 'ICTO Admin' : role.replace(/([A-Z])/g, ' $1').trim()}`,
            email: currentUser.email,
            role: role,
            status: 'Active',
            isDemo: true,
            organizationId: organizationId || null,
            assignedDistrictId: assignedDistrictId || null,
            createdAt: profile?.createdAt || serverTimestamp(),
            updatedAt: serverTimestamp()
          };

          await setDoc(userDocRef, demoProfile);
          setUserProfile(demoProfile);

          // Seed standard demo templates so UI functions perfectly
          try {
            await seedDemoTemplatesAndData();
          } catch (e) {
            console.error("Error seeding demo templates:", e);
          }
        } else {
          localStorage.setItem('is_demo_user', 'false');
          
          // Regular real user authentication profile lookup
          const userDocRef = doc(db, 'users', currentUser.uid);
          const userDoc = await getDoc(userDocRef);
          
          let profile = userDoc.exists() ? userDoc.data() : null;

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
              await setDoc(userDocRef, profile);
            }
          }

          if (profile) {
            const isCenter = profile.role === 'TrainingCenter' || profile.role === 'AssessmentCenter';
            if (isCenter && profile.organizationId) {
              try {
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
            await setDoc(userDocRef, newProfile);
            setUserProfile(newProfile);
          }
        }
      } else {
        localStorage.setItem('is_demo_user', 'false');
        setUserProfile(null);
      }
      
      setLoading(false);
      setIsAuthReady(true);
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    try {
      localStorage.setItem('is_demo_user', 'false');
      await auth.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <FirebaseContext.Provider value={{ user, userProfile, loading, isAuthReady, logout }}>
      {children}
    </FirebaseContext.Provider>
  );
};
