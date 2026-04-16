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

export const FirebaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        // Fetch or create user profile
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        
        let profile = userDoc.exists() ? userDoc.data() : null;

        // Always check for admin-created profiles by email to ensure sync/linking
        // This handles cases where an admin updated a user's role after they already logged in as a learner
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('email', '==', currentUser.email));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          // Find the admin-created doc (one that isn't the UID-indexed one, or the UID one if it's the only one)
          const adminDoc = querySnapshot.docs.find(d => d.id !== currentUser.uid) || querySnapshot.docs[0];
          const adminData = adminDoc.data();

          // If we found an admin-created doc with a different ID, or the UID doc doesn't exist,
          // or if the current profile is just a default 'Learner' and the admin assigned a specific role
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
          // Robust sync for assignedDistrictId
          const isCenter = profile.role === 'TrainingCenter' || profile.role === 'AssessmentCenter';
          if (isCenter && profile.organizationId) {
            try {
              const orgDoc = await getDoc(doc(db, 'organizations', profile.organizationId));
              if (orgDoc.exists()) {
                const orgData = orgDoc.data();
                if (orgData.assignedDistrictId && profile.assignedDistrictId !== orgData.assignedDistrictId) {
                  profile.assignedDistrictId = orgData.assignedDistrictId;
                  // Update the doc to persist the sync
                  await updateDoc(userDocRef, { assignedDistrictId: orgData.assignedDistrictId });
                }
              }
            } catch (e) {
              console.error("Error syncing district ID:", e);
            }
          }
          setUserProfile(profile);
        } else {
          // Create default profile for new users (Learner by default)
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
      } else {
        setUserProfile(null);
      }
      
      setLoading(false);
      setIsAuthReady(true);
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    try {
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
