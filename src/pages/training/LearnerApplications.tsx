import React, { useState, useEffect } from 'react';
import { Search, CheckCircle, XCircle, UserCheck, Clock } from 'lucide-react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  updateDoc, 
  doc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/src/lib/firebase';
import { useFirebase } from '@/src/lib/FirebaseProvider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Enrollment, ProgramOffering, ProgramBatch } from '@/src/types';

export default function LearnerApplications() {
  const { user } = useFirebase();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [offerings, setOfferings] = useState<ProgramOffering[]>([]);
  const [batches, setBatches] = useState<ProgramBatch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'enrollments'),
      where('trainingCenterId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setEnrollments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Enrollment[]);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'enrollments');
      setLoading(false);
    });

    const offQuery = query(collection(db, 'programOfferings'), where('trainingCenterId', '==', user.uid));
    const unsubscribeOff = onSnapshot(offQuery, (snapshot) => {
      setOfferings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ProgramOffering[]);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'programOfferings');
    });

    const batchQuery = query(collection(db, 'programBatches'), where('trainingCenterId', '==', user.uid));
    const unsubscribeBatches = onSnapshot(batchQuery, (snapshot) => {
      setBatches(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ProgramBatch[]);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'programBatches');
    });

    return () => {
      unsubscribe();
      unsubscribeOff();
      unsubscribeBatches();
    };
  }, [user]);

  const handleStatusUpdate = async (enrollmentId: string, newStatus: 'Enrolled' | 'Rejected') => {
    try {
      if (newStatus === 'Enrolled') {
        const enr = enrollments.find(e => e.id === enrollmentId);
        if (!enr) {
          alert("Selected enrollment application not found.");
          return;
        }

        // Find open or ongoing batches for this program offering and training center
        const programBatches = batches.filter(batch => 
          batch.programOfferingId === enr.programOfferingId &&
          batch.trainingCenterId === enr.trainingCenterId &&
          (batch.status === 'Open' || batch.status === 'Ongoing')
        );

        if (programBatches.length === 0) {
          alert("No available batch/class for this program. Please create a new batch first.");
          return;
        }

        // Auto-assign to the first batch that has available slots
        let selectedBatch: ProgramBatch | null = null;
        for (const batch of programBatches) {
          const count = enrollments.filter(e => e.programBatchId === batch.id && (e.enrollmentStatus === 'Enrolled' || e.enrollmentStatus === 'Completed')).length;
          if (count < batch.maxSlots) {
            selectedBatch = batch;
            break;
          }
        }

        if (!selectedBatch) {
          alert("No available batch/class for this program. Please create a new batch first.");
          return;
        }

        await updateDoc(doc(db, 'enrollments', enrollmentId), {
          enrollmentStatus: 'Enrolled',
          completionStatus: 'Not Started',
          programBatchId: selectedBatch.id,
          dateAccepted: serverTimestamp(),
          dateEnrolled: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      } else {
        await updateDoc(doc(db, 'enrollments', enrollmentId), {
          enrollmentStatus: 'Rejected',
          updatedAt: serverTimestamp()
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'enrollments');
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Loading applications...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Learner Applications</h1>
        <p className="text-slate-500">Review and process new applications for your programs.</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg">Pending Applications</CardTitle>
            <div className="flex gap-2">
              <div className="relative w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <Input placeholder="Search learners..." className="pl-9 h-9" />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Learner Name</TableHead>
                <TableHead>Program Applied</TableHead>
                <TableHead>Preferred Batch</TableHead>
                <TableHead>Date Applied</TableHead>
                <TableHead className="text-right pr-6">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {enrollments.filter(e => e.enrollmentStatus === 'Applied').map((enr) => {
                const offering = offerings.find(o => o.id === enr.programOfferingId);
                const batch = batches.find(b => b.id === enr.programBatchId);
                return (
                  <TableRow key={enr.id}>
                    <TableCell className="pl-6 font-medium">
                      <div className="flex flex-col">
                        <span>{enr.learnerName}</span>
                        <span className="text-xs text-slate-500">{enr.learnerEmail}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm font-semibold text-blue-600">{offering?.programTitle || 'Program'}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{batch?.batchName || 'No specific batch'}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {enr.dateApplied ? new Date(enr.dateApplied.seconds * 1000).toLocaleDateString() : 'N/A'}
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="text-emerald-600 border-emerald-200 hover:bg-emerald-50 gap-1.5"
                          onClick={() => handleStatusUpdate(enr.id, 'Enrolled')}
                        >
                          <CheckCircle className="h-4 w-4" /> Accept
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="text-rose-600 border-rose-200 hover:bg-rose-50 gap-1.5"
                          onClick={() => handleStatusUpdate(enr.id, 'Rejected')}
                        >
                          <XCircle className="h-4 w-4" /> Reject
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {enrollments.filter(e => e.enrollmentStatus === 'Applied').length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-slate-500">No pending applications.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
