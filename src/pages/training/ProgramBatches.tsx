import React, { useState, useEffect } from 'react';
import { Plus, Search, Calendar, Users, Edit2, Trash2 } from 'lucide-react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc,
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
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProgramBatch, ProgramOffering, Enrollment } from '@/src/types';

export default function ProgramBatches() {
  const { user, userProfile, isAuthReady } = useFirebase();
  const [batches, setBatches] = useState<ProgramBatch[]>([]);
  const [offerings, setOfferings] = useState<ProgramOffering[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [selectedBatchForLearners, setSelectedBatchForLearners] = useState<ProgramBatch | null>(null);
  const [isViewLearnersOpen, setIsViewLearnersOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    programOfferingId: '',
    batchName: '',
    startDate: '',
    endDate: '',
    trainerName: '',
    maxSlots: 25,
    status: 'Open' as any
  });

  useEffect(() => {
    if (!isAuthReady || !user) return;

    const path = 'programBatches';
    // Admins see all batches, Training Centers see only their own
    const q = userProfile?.role === 'Admin' 
      ? query(collection(db, path))
      : query(collection(db, path), where('trainingCenterId', '==', user.uid));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setBatches(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ProgramBatch[]);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
      setLoading(false);
    });

    const offPath = 'programOfferings';
    const offQuery = userProfile?.role === 'Admin'
      ? query(collection(db, offPath))
      : query(collection(db, offPath), where('trainingCenterId', '==', user.uid));
      
    const unsubscribeOff = onSnapshot(offQuery, (snapshot) => {
      setOfferings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ProgramOffering[]);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, offPath);
    });

    const enrPath = 'enrollments';
    const enrQuery = userProfile?.role === 'Admin'
      ? query(collection(db, enrPath))
      : query(collection(db, enrPath), where('trainingCenterId', '==', user.uid));
      
    const unsubscribeEnr = onSnapshot(enrQuery, (snapshot) => {
      setEnrollments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Enrollment[]);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, enrPath);
    });

    return () => {
      unsubscribe();
      unsubscribeOff();
      unsubscribeEnr();
    };
  }, [user, userProfile, isAuthReady]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSubmitting(true);
    try {
      const offering = offerings.find(o => o.id === formData.programOfferingId);
      const payload = {
        ...formData,
        badgeTemplateId: offering?.badgeTemplateId || '',
        trainingCenterId: user.uid,
        updatedAt: serverTimestamp(),
      };

      if (editingId) {
        await updateDoc(doc(db, 'programBatches', editingId), payload);
      } else {
        await addDoc(collection(db, 'programBatches'), {
          ...payload,
          createdAt: serverTimestamp()
        });
      }

      setIsModalOpen(false);
      setEditingId(null);
      setFormData({
        programOfferingId: '',
        batchName: '',
        startDate: '',
        endDate: '',
        trainerName: '',
        maxSlots: 25,
        status: 'Open'
      });
    } catch (error) {
      handleFirestoreError(error, editingId ? OperationType.UPDATE : OperationType.CREATE, 'programBatches');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      setTimeout(() => setConfirmDeleteId(null), 3000);
      return;
    }

    setDeletingId(id);
    console.log("Attempting to delete batch:", id);
    try {
      await deleteDoc(doc(db, 'programBatches', id));
      console.log("Successfully deleted batch:", id);
      setConfirmDeleteId(null);
    } catch (error: any) {
      console.error("Delete failed:", error);
      const errorMessage = error?.message || String(error);
      alert(`Failed to delete batch: ${errorMessage}`);
      handleFirestoreError(error, OperationType.DELETE, 'programBatches');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Loading batches...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Program Batches / Classes</h1>
          <p className="text-slate-500">Schedule and manage learning groups for your programs.</p>
        </div>
        <Button onClick={() => { setEditingId(null); setIsModalOpen(true); }} className="bg-blue-600 hover:bg-blue-700 gap-2">
          <Plus className="h-4 w-4" /> Create New Batch
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Batch Name</TableHead>
                <TableHead>Program</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead>Trainer</TableHead>
                <TableHead>Seats</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right pr-6">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {batches.map((batch) => {
                const offering = offerings.find(o => o.id === batch.programOfferingId);
                const enrolledCount = enrollments.filter(e => e.programBatchId === batch.id && (e.enrollmentStatus === 'Enrolled' || e.enrollmentStatus === 'Completed')).length;
                
                const isFull = enrolledCount >= batch.maxSlots;
                
                return (
                  <TableRow key={batch.id}>
                    <TableCell className="pl-6 font-medium">{batch.batchName}</TableCell>
                    <TableCell className="text-sm font-semibold text-blue-600">{offering?.programTitle || 'Linked Program'}</TableCell>
                    <TableCell className="text-xs">
                      <div className="flex flex-col">
                        <span>{batch.startDate}</span>
                        <span className="text-slate-400">to</span>
                        <span>{batch.endDate}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{batch.trainerName}</TableCell>
                    <TableCell className="text-sm font-medium">
                      <div className="flex flex-col">
                        <span className={isFull ? "font-bold text-red-600" : "text-slate-800"}>
                          {enrolledCount} / {batch.maxSlots}
                        </span>
                        <span className="text-[10px] text-slate-400">seats filled</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {batch.status === 'Cancelled' ? (
                        <Badge variant="destructive" className="bg-slate-500">Cancelled</Badge>
                      ) : batch.status === 'Completed' ? (
                        <Badge variant="secondary" className="bg-blue-600 text-white">Completed</Badge>
                      ) : isFull ? (
                        <Badge variant="destructive" className="bg-red-500 text-white animate-pulse">Full</Badge>
                      ) : batch.status === 'Ongoing' ? (
                        <Badge variant="default" className="bg-amber-500 text-white">Ongoing</Badge>
                      ) : (
                        <Badge variant="default" className="bg-emerald-500 text-white">Open</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <div className="flex justify-end gap-2 items-center">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="text-blue-600 border-blue-200 hover:bg-blue-50 gap-1"
                          onClick={() => {
                            setSelectedBatchForLearners(batch);
                            setIsViewLearnersOpen(true);
                          }}
                        >
                          <Users className="h-3.5 w-3.5" /> View Learners
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => {
                          setEditingId(batch.id);
                          setFormData({
                            programOfferingId: batch.programOfferingId,
                            batchName: batch.batchName,
                            startDate: batch.startDate,
                            endDate: batch.endDate,
                            trainerName: batch.trainerName,
                            maxSlots: batch.maxSlots,
                            status: batch.status
                          });
                          setIsModalOpen(true);
                        }}><Edit2 className="h-4 w-4" /></Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className={confirmDeleteId === batch.id ? "text-white bg-rose-600 hover:bg-rose-700" : "text-rose-600 hover:text-rose-700 hover:bg-rose-50"}
                          onClick={() => handleDelete(batch.id)}
                          disabled={deletingId === batch.id}
                        >
                          {deletingId === batch.id ? (
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                          ) : confirmDeleteId === batch.id ? (
                            <span className="text-[10px] font-bold px-1">Confirm?</span>
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {batches.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-slate-500 italic">No batches created yet.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{editingId ? 'Edit Batch' : 'Create Batch'}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Linked Program Offering</Label>
                <Select value={formData.programOfferingId} onValueChange={(v) => setFormData({...formData, programOfferingId: v})}>
                  <SelectTrigger><SelectValue placeholder="Select program..." /></SelectTrigger>
                  <SelectContent>
                    {offerings.map(o => (
                      <SelectItem key={o.id} value={o.id}>{o.programTitle}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="batchName">Batch / Class Name</Label>
                <Input id="batchName" value={formData.batchName} onChange={(e) => setFormData({...formData, batchName: e.target.value})} required placeholder="e.g. Batch 2024-A" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input id="startDate" type="date" value={formData.startDate} onChange={(e) => setFormData({...formData, startDate: e.target.value})} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="endDate">End Date</Label>
                  <Input id="endDate" type="date" value={formData.endDate} onChange={(e) => setFormData({...formData, endDate: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="trainer">Trainer Name</Label>
                  <Input id="trainer" value={formData.trainerName} onChange={(e) => setFormData({...formData, trainerName: e.target.value})} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="slots">Max Slots</Label>
                  <Input id="slots" type="number" value={formData.maxSlots} onChange={(e) => setFormData({...formData, maxSlots: parseInt(e.target.value)})} />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({...formData, status: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Open">Open</SelectItem>
                    <SelectItem value="Ongoing">Ongoing</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                    <SelectItem value="Cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save Batch'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isViewLearnersOpen} onOpenChange={setIsViewLearnersOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Learners in {selectedBatchForLearners?.batchName}</DialogTitle>
            <DialogDescription>
              A complete list of learners officially assigned to this class.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-2 max-h-[400px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Learner Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Enrollment Status</TableHead>
                  <TableHead>Completion Status</TableHead>
                  <TableHead>Date Enrolled</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {enrollments
                  .filter(e => e.programBatchId === selectedBatchForLearners?.id)
                  .map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="font-semibold">{e.learnerName}</TableCell>
                      <TableCell className="text-sm text-slate-500">{e.learnerEmail}</TableCell>
                      <TableCell>
                        <Badge variant={e.enrollmentStatus === 'Enrolled' ? 'default' : 'secondary'} className={e.enrollmentStatus === 'Enrolled' ? 'bg-emerald-500 text-white hover:bg-emerald-600' : ''}>
                          {e.enrollmentStatus}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-slate-600 bg-slate-50">
                          {e.completionStatus || 'Not Started'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">
                        {e.dateEnrolled ? (e.dateEnrolled.seconds ? new Date(e.dateEnrolled.seconds * 1000).toLocaleDateString() : new Date(e.dateEnrolled).toLocaleDateString()) : 'N/A'}
                      </TableCell>
                    </TableRow>
                  ))}
                {enrollments.filter(e => e.programBatchId === selectedBatchForLearners?.id).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-slate-500 italic">
                      No learners assigned to this batch yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewLearnersOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
