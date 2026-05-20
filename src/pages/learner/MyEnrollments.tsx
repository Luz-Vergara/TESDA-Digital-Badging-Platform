import React, { useState, useEffect } from 'react';
import { BookOpen, Search, Building2, Calendar, ClipboardList, CheckCircle2 } from 'lucide-react';
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
import { Enrollment, ProgramOffering, ProgramBatch } from '@/src/types';

export default function MyEnrollments() {
  const { user } = useFirebase();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [offerings, setOfferings] = useState<ProgramOffering[]>([]);
  const [batches, setBatches] = useState<ProgramBatch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const enrPath = 'enrollments';
    const q = query(
      collection(db, enrPath),
      where('learnerId', '==', user.uid),
      where('enrollmentStatus', 'in', ['Enrolled', 'Completed'])
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Enrollment[];
      setEnrollments(data);
      
      if (data.length > 0) {
        const offIds = [...new Set(data.map(d => d.programOfferingId))];
        const batchIds = [...new Set(data.map(d => d.programBatchId).filter(Boolean))];
        
        const [offDocs, batchDocs] = await Promise.all([
          Promise.all(offIds.map(id => getDoc(doc(db, 'programOfferings', id)))),
          Promise.all(batchIds.map(id => getDoc(doc(db, 'programBatches', id))))
        ]);
        
        setOfferings(offDocs.filter(d => d.exists()).map(d => ({ id: d.id, ...d.data() })) as ProgramOffering[]);
        setBatches(batchDocs.filter(d => d.exists()).map(d => ({ id: d.id, ...d.data() })) as ProgramBatch[]);
      }
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, enrPath);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  if (loading) return <div className="p-8 text-center text-slate-500">Loading your courses...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">My Learning Portal</h1>
        <p className="text-slate-500">Manage your active enrollments and learning progress.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {enrollments.map((enr) => {
          const off = offerings.find(o => o.id === enr.programOfferingId);
          const batch = batches.find(b => b.id === enr.programBatchId);
          return (
            <Card key={enr.id} className="border-slate-200 hover:border-blue-300 transition-colors">
              <CardHeader className="pb-4">
                <div className="flex justify-between items-start">
                  <Badge variant={enr.enrollmentStatus === 'Enrolled' ? 'default' : 'secondary'} className={
                    enr.enrollmentStatus === 'Enrolled' ? 'bg-emerald-500' : ''
                  }>
                    {enr.enrollmentStatus}
                  </Badge>
                  <BookOpen className="h-5 w-5 text-blue-600" />
                </div>
                <CardTitle className="text-xl font-bold mt-2">{off?.programTitle || 'Program'}</CardTitle>
                <p className="text-xs text-slate-400 font-mono italic">{off?.qualificationCode || 'Code'}</p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <Building2 className="h-4 w-4 text-slate-400" />
                    <span className="font-semibold">{off?.trainingCenterName || 'Center'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Calendar className="h-4 w-4 text-slate-400" />
                    <span>Batch: <span className="font-medium">{batch?.batchName || 'General'}</span></span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold text-slate-500 uppercase">
                    <span>Progress: {enr.completionStatus}</span>
                    <span>
                      {enr.completionStatus === 'Completed' ? '100%' : 
                       enr.completionStatus === 'For Assessment' ? '75%' : 
                       enr.completionStatus === 'In Progress' ? '40%' : '0%'}
                    </span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className={cn(
                      "h-full transition-all duration-500",
                      enr.completionStatus === 'Completed' ? 'w-full bg-emerald-500' : 
                      enr.completionStatus === 'For Assessment' ? 'w-3/4 bg-blue-500' :
                      enr.completionStatus === 'In Progress' ? 'w-2/5 bg-amber-500' : 'w-0'
                    )} />
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-50 flex gap-2">
                   <div className="flex items-center gap-2 text-xs text-emerald-600 font-bold">
                     <CheckCircle2 className="h-3.5 w-3.5" />
                     Official enrollment confirmed
                   </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {enrollments.length === 0 && (
          <div className="col-span-2 py-12 text-center text-slate-400 italic">
            You don't have any active enrollments yet.
          </div>
        )}
      </div>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
