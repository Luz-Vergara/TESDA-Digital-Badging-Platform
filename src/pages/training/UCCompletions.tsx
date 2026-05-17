import React, { useState, useEffect } from 'react';
import { Search, CheckCircle2, Clock, Award, Plus, Filter, AlertCircle } from 'lucide-react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
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
import { Label } from '@/components/ui/label';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from '@/components/ui/textarea';
import { UCCompletion, Enrollment, ProgramOffering, ProgramBatch } from '@/src/types';

export default function UCCompletions() {
  const { user, userProfile } = useFirebase();
  const [completions, setCompletions] = useState<UCCompletion[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [offerings, setOfferings] = useState<ProgramOffering[]>([]);
  const [batches, setBatches] = useState<ProgramBatch[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    enrollmentId: '',
    ucTitle: '',
    ucCode: '',
    completionStatus: 'Completed' as any,
    evidenceUrl: '',
    remarks: ''
  });

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'ucCompletions'),
      where('trainingCenterId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setCompletions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as UCCompletion[]);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'ucCompletions');
      setLoading(false);
    });

    const enrQuery = query(collection(db, 'enrollments'), where('trainingCenterId', '==', user.uid), where('enrollmentStatus', '==', 'Enrolled'));
    const unsubscribeEnr = onSnapshot(enrQuery, (snapshot) => {
      setEnrollments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Enrollment[]);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'enrollments');
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
      unsubscribeEnr();
      unsubscribeOff();
      unsubscribeBatches();
    };
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !userProfile || !formData.enrollmentId) return;

    setIsSubmitting(true);
    try {
      const enrollment = enrollments.find(e => e.id === formData.enrollmentId);
      if (!enrollment) {
        alert("Enrollment not found. Please select a valid learner.");
        return;
      }
      
      const offering = offerings.find(o => o.id === enrollment.programOfferingId);
      
      const payload = {
        ...formData,
        trainingCenterId: user.uid,
        learnerId: enrollment.learnerId,
        programOfferingId: enrollment.programOfferingId,
        programBatchId: enrollment.programBatchId,
        badgeTemplateId: (enrollment as any).badgeTemplateId || offering?.badgeTemplateId || '', 
        verifiedBy: userProfile.name,
        completedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await addDoc(collection(db, 'ucCompletions'), payload);
      
      // Update enrollment progress
      await updateDoc(doc(db, 'enrollments', enrollment.id), {
        completionStatus: 'Completed',
        updatedAt: serverTimestamp()
      });

      setIsModalOpen(false);
      setFormData({ enrollmentId: '', ucTitle: '', ucCode: '', completionStatus: 'Completed', evidenceUrl: '', remarks: '' });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'ucCompletions');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Loading completions...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">UC Completion</h1>
          <p className="text-slate-500">Log and verify completion of Units of Competency for your learners.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 gap-1.5">
          <Plus className="h-4 w-4" /> Log UC Completion
        </Button>
      </div>

      <Card className="border-slate-200">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="pl-6">Learner</TableHead>
                <TableHead>UC / Program Title</TableHead>
                <TableHead>Completed Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right pr-6">Badge Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {completions.map((comp) => {
                const enrollment = enrollments.find(e => e.id === comp.enrollmentId);
                return (
                  <TableRow key={comp.id}>
                    <TableCell className="pl-6 font-medium">
                      <div className="flex flex-col">
                        <span>{enrollment?.learnerName || 'Learner'}</span>
                        <span className="text-[10px] text-slate-400 font-mono uppercase">ID: {comp.learnerId.slice(-8).toUpperCase()}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-900">{comp.ucTitle}</span>
                        <span className="text-[10px] text-slate-500">{comp.ucCode}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {comp.completedAt ? new Date(comp.completedAt.seconds * 1000).toLocaleDateString() : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 shadow-none">
                        <CheckCircle2 className="h-3 w-3 mr-1.5" /> Checked
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <Badge variant={comp.completionStatus === 'Badge Requested' ? 'default' : 'secondary'} className={
                        comp.completionStatus === 'Badge Requested' ? 'bg-blue-600' : 
                        comp.completionStatus === 'For Badge Request' ? 'bg-amber-100 text-amber-700 border-amber-200' : ''
                      }>
                        {comp.completionStatus}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
              {completions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-slate-500 italic">No completions logged yet.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Log Program or UC Completion</DialogTitle>
              <DialogDescription>Mark a learner as having completed a specific competency or program.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Select Enrolled Learner</Label>
                <Select value={formData.enrollmentId} onValueChange={(v) => {
                  const enr = enrollments.find(e => e.id === v);
                  const off = offerings.find(o => o.id === enr?.programOfferingId);
                  setFormData({
                    ...formData, 
                    enrollmentId: v,
                    ucTitle: off?.programTitle || '',
                    ucCode: off?.qualificationCode || ''
                  });
                }}>
                  <SelectTrigger><SelectValue placeholder="Choose learner..." /></SelectTrigger>
                  <SelectContent>
                    {enrollments.map(e => {
                       const off = offerings.find(o => o.id === e.programOfferingId);
                       return <SelectItem key={e.id} value={e.id}>{e.learnerName} - {off?.programTitle}</SelectItem>
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="ucTitle">UC / Program Title</Label>
                  <Input id="ucTitle" value={formData.ucTitle} onChange={(e) => setFormData({...formData, ucTitle: e.target.value})} required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="ucCode">UC / Program Code</Label>
                  <Input id="ucCode" value={formData.ucCode} onChange={(e) => setFormData({...formData, ucCode: e.target.value})} />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="evidence">Evidence URL (Optional)</Label>
                <Input id="evidence" placeholder="https://..." value={formData.evidenceUrl} onChange={(e) => setFormData({...formData, evidenceUrl: e.target.value})} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="remarks">Remarks</Label>
                <Textarea id="remarks" placeholder="Add context..." value={formData.remarks} onChange={(e) => setFormData({...formData, remarks: e.target.value})} />
              </div>
              <div className="grid gap-2">
                <Label>Completion Status</Label>
                <Select value={formData.completionStatus} onValueChange={(v) => setFormData({...formData, completionStatus: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Completed">Completed</SelectItem>
                    <SelectItem value="For Badge Request">For Badge Request</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700" disabled={isSubmitting}>
                {isSubmitting ? 'Logging...' : 'Confirm Completion'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
