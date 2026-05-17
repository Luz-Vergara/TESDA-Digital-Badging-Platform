import React, { useState, useEffect } from 'react';
import { Clock, Search, Building2, MapPin, Award, ArrowRight, XCircle } from 'lucide-react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  getDoc 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/src/lib/firebase';
import { useFirebase } from '@/src/lib/FirebaseProvider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Enrollment, ProgramOffering } from '@/src/types';

export default function MyApplications() {
  const { user } = useFirebase();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [offerings, setOfferings] = useState<ProgramOffering[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const enrPath = 'enrollments';
    const q = query(
      collection(db, enrPath),
      where('learnerId', '==', user.uid),
      where('enrollmentStatus', 'in', ['Applied', 'Rejected'])
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Enrollment[];
      setEnrollments(data);
      
      if (data.length > 0) {
        const offIds = [...new Set(data.map(d => d.programOfferingId))];
        const offDocs = await Promise.all(offIds.map(id => getDoc(doc(db, 'programOfferings', id))));
        setOfferings(offDocs.filter(d => d.exists()).map(d => ({ id: d.id, ...d.data() })) as ProgramOffering[]);
      }
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, enrPath);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  if (loading) return <div className="p-8 text-center text-slate-500">Loading your applications...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">My Applications</h1>
        <p className="text-slate-500">Track your ongoing expressions of interest with training centers.</p>
      </div>

      <div className="grid gap-4">
        {enrollments.map((enr) => {
          const off = offerings.find(o => o.id === enr.programOfferingId);
          return (
            <Card key={enr.id} className="border-slate-200">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="bg-slate-100 p-3 rounded-lg text-slate-400">
                      <Clock className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900">{off?.programTitle || 'Program Title'}</h3>
                      <div className="flex items-center gap-2 text-slate-500 text-sm mt-1">
                        <Building2 className="h-3.5 w-3.5" />
                        <span>{off?.trainingCenterName || 'Training Center'}</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-2">
                        Applied on: {enr.dateApplied ? new Date(enr.dateApplied.seconds * 1000).toLocaleDateString() : 'Pending'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end gap-2 text-right">
                    <Badge variant={enr.enrollmentStatus === 'Applied' ? 'secondary' : 'destructive'} className={
                      enr.enrollmentStatus === 'Applied' ? 'bg-amber-100 text-amber-700 hover:bg-amber-100' : ''
                    }>
                      {enr.enrollmentStatus === 'Applied' ? 'Pending Review' : 'Rejected'}
                    </Badge>
                    <p className="text-xs text-slate-400">Status updated recently</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {enrollments.length === 0 && (
          <Card className="border-dashed flex flex-col items-center justify-center p-12 text-center">
            <div className="bg-slate-50 p-4 rounded-full mb-4">
              <Search className="h-8 w-8 text-slate-300" />
            </div>
            <h3 className="font-bold text-slate-900 mb-1">No applications found</h3>
            <p className="text-slate-500 max-w-xs mx-auto text-sm mb-6">
              You haven't applied for any programs yet. Browse available programs to get started.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
