import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/src/lib/firebase';
import { useFirebase } from '@/src/lib/FirebaseProvider';
import { isExternalApiDemoEnabled } from '@/src/config/environment';
import ExternalTrainingDashboard, { type ExternalTrainingView } from './ExternalTrainingDashboard';
import { Card, CardContent } from '@/components/ui/card';

interface Props { initialView: ExternalTrainingView; }

/** Uses the approved Integration API rather than treating local learner data as external evidence. */
export default function ExternalTrainingCenterRoute({ initialView }: Props) {
  const { user, userProfile, isAuthReady } = useFirebase();
  const [linkActive, setLinkActive] = useState<boolean | null>(null);

  useEffect(() => {
    if (!isAuthReady || !user || !isExternalApiDemoEnabled) { setLinkActive(false); return; }
    const organizationId = userProfile?.organizationId || user.uid;
    void getDoc(doc(db, 'integrationTrainingCenterLinks', organizationId))
      .then((snapshot) => setLinkActive(snapshot.exists() && snapshot.data().active !== false))
      .catch((error) => { handleFirestoreError(error, OperationType.GET, `integrationTrainingCenterLinks/${organizationId}`); setLinkActive(false); });
  }, [isAuthReady, user, userProfile]);

  if (!isAuthReady || !user || linkActive === null) return <div className="min-h-[60vh] flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" /></div>;
  if (!isExternalApiDemoEnabled || !linkActive) return <Card className="border-amber-200 bg-amber-50/40"><CardContent className="p-5 text-sm text-amber-800">External training records are unavailable because this Training Center has no approved integration link.</CardContent></Card>;

  return <ExternalTrainingDashboard
    initialView={initialView}
    firebaseTrainingCenterId={userProfile?.organizationId || user.uid}
    firebaseTrainingCenterName={userProfile?.office || userProfile?.name || 'Training Center'}
    firebaseUserId={user.uid}
    districtOfficeId={userProfile?.assignedDistrictId}
  />;
}
