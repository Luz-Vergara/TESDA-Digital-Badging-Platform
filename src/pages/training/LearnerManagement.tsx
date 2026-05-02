import React, { useEffect, useState } from 'react';
import { 
  Users, 
  UserPlus, 
  Search, 
  Filter, 
  Edit2, 
  MoreVertical,
  Mail,
  Phone,
  Calendar,
  BookOpen,
  X,
  Check,
  Trash2
} from 'lucide-react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  doc, 
  serverTimestamp,
  getDocs
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from '@/components/ui/label';
import { Learner } from '@/src/types';

export default function LearnerManagement() {
  const { user, userProfile, isAuthReady } = useFirebase();
  const [learners, setLearners] = useState<Learner[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingLearner, setEditingLearner] = useState<Learner | null>(null);
  const [learnerToDelete, setLearnerToDelete] = useState<Learner | null>(null);
  
  const [organization, setOrganization] = useState<any>(null);
  
  // Form State
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    contactNumber: '',
    qualification: '',
    enrollmentDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    if (!isAuthReady || !userProfile?.office) return;
    const fetchOrg = async () => {
      try {
        const orgName = userProfile.office.trim();
        const orgsRef = collection(db, 'organizations');
        const q = query(orgsRef, where('name', '==', orgName));
        const snap = await getDocs(q);
        if (!snap.empty) {
          setOrganization({ id: snap.docs[0].id, ...snap.docs[0].data() });
        } else {
          const qid = query(orgsRef, where('id', '==', orgName));
          const snapid = await getDocs(qid);
          if (!snapid.empty) {
            setOrganization({ id: snapid.docs[0].id, ...snapid.docs[0].data() });
          } else {
            // Last resort: search for a district office that matches the assignedDistrictId if it's a name
            if (userProfile.assignedDistrictId) {
              const qDist = query(orgsRef, where('name', '==', userProfile.assignedDistrictId), where('type', '==', 'DistrictOffice'));
              const snapDist = await getDocs(qDist);
              if (!snapDist.empty) {
                // We found the actual district doc, we can use its ID
                console.log("Found district by name fallback during enrollment setup");
              }
            }
          }
        }
      } catch (err) {
        console.error("Error fetching organization in Training Center:", err);
      }
    };
    fetchOrg();
  }, [userProfile, isAuthReady]);

  useEffect(() => {
    if (!isAuthReady || !user) return;

    const path = 'learners';
    const q = query(
      collection(db, path),
      where('trainingCenterId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const learnerData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Learner[];
      setLearners(learnerData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });

    return () => unsubscribe();
  }, [user, isAuthReady]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleEdit = (learner: Learner) => {
    setEditingLearner(learner);
    setFormData({
      firstName: learner.firstName,
      lastName: learner.lastName,
      email: learner.email,
      contactNumber: learner.contactNumber,
      qualification: learner.qualification,
      enrollmentDate: learner.enrollmentDate
    });
    setIsAddModalOpen(true);
  };

  const handleDelete = async () => {
    if (!learnerToDelete) return;
    setIsSubmitting(true);
    try {
      await deleteDoc(doc(db, 'learners', learnerToDelete.id));
      await addDoc(collection(db, 'auditLogs'), {
        userId: user!.uid,
        userName: userProfile!.name,
        action: `Deleted Learner: ${learnerToDelete.firstName} ${learnerToDelete.lastName}`,
        timestamp: serverTimestamp()
      });
      setIsDeleteModalOpen(false);
      setLearnerToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'learners');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !userProfile) return;
    if (!organization) {
      alert("Organization data is still loading. Please wait a moment.");
      return;
    }
    
    setIsSubmitting(true);
    try {
      if (editingLearner) {
        const updatedLearner = {
          ...formData,
          updatedAt: serverTimestamp()
        };
        await updateDoc(doc(db, 'learners', editingLearner.id), updatedLearner);
      } else {
        // Check if learner already exists by email
        const learnersRef = collection(db, 'learners');
        const q = query(learnersRef, where('email', '==', formData.email));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          // Update existing learner instead of creating new one
          const existingDoc = querySnapshot.docs[0];
          const updatedLearner = {
            ...formData,
            trainingCenterId: user.uid,
            trainingCenterName: userProfile.office || userProfile.name,
            districtOfficeId: organization?.assignedDistrictId || userProfile.assignedDistrictId || '',
            updatedAt: serverTimestamp()
          };
          await updateDoc(doc(db, 'learners', existingDoc.id), updatedLearner);
        } else {
          // Create new learner
          const newLearner = {
            ...formData,
            trainingCenterId: user.uid,
            trainingCenterName: userProfile.office || userProfile.name,
            districtOfficeId: organization?.assignedDistrictId || userProfile.assignedDistrictId || '',
            status: 'Enrolled',
            createdAt: serverTimestamp()
          };
          await addDoc(collection(db, 'learners'), newLearner);
        }
      }

      setIsAddModalOpen(false);
      setEditingLearner(null);
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        contactNumber: '',
        qualification: '',
        enrollmentDate: new Date().toISOString().split('T')[0]
      });
    } catch (error) {
      handleFirestoreError(error, editingLearner ? OperationType.UPDATE : OperationType.CREATE, 'learners');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Learner Management</h1>
          <p className="text-slate-500">Register and manage learners enrolled in your programs.</p>
        </div>
        
        <Button 
          className="bg-blue-600 hover:bg-blue-700 gap-2"
          onClick={() => setIsAddModalOpen(true)}
        >
          <UserPlus className="h-4 w-4" />
          Add New Learner
        </Button>

        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>Add New Learner</DialogTitle>
                <DialogDescription>
                  Enter the learner's details to create their profile. They will be able to log in using their email.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input 
                      id="firstName" 
                      name="firstName" 
                      value={formData.firstName} 
                      onChange={handleInputChange} 
                      placeholder="Juan" 
                      required 
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input 
                      id="lastName" 
                      name="lastName" 
                      value={formData.lastName} 
                      onChange={handleInputChange} 
                      placeholder="Dela Cruz" 
                      required 
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input 
                    id="email" 
                    name="email" 
                    type="email" 
                    value={formData.email} 
                    onChange={handleInputChange} 
                    placeholder="juan.delacruz@example.com" 
                    required 
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="contactNumber">Contact Number</Label>
                  <Input 
                    id="contactNumber" 
                    name="contactNumber" 
                    value={formData.contactNumber} 
                    onChange={handleInputChange} 
                    placeholder="09123456789" 
                    required 
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="qualification">Qualification / Program</Label>
                  <Input 
                    id="qualification" 
                    name="qualification" 
                    value={formData.qualification} 
                    onChange={handleInputChange} 
                    placeholder="Computer Systems Servicing NC II" 
                    required 
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="enrollmentDate">Enrollment Date</Label>
                  <Input 
                    id="enrollmentDate" 
                    name="enrollmentDate" 
                    type="date" 
                    value={formData.enrollmentDate} 
                    onChange={handleInputChange} 
                    required 
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isSubmitting}>
                  {isSubmitting ? 'Registering...' : 'Register Learner'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters & Search */}
      <Card className="border-slate-200">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input placeholder="Search by name, email, or qualification..." className="pl-10" />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="gap-2">
                <Filter className="h-4 w-4" />
                Filter
              </Button>
              <Button variant="outline">Export List</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Learner List */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600" />
            Enrolled Learners
          </CardTitle>
          <CardDescription>A total of {learners.length} learners are currently registered.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-slate-100">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="w-[250px]">Learner Name</TableHead>
                  <TableHead>Contact Info</TableHead>
                  <TableHead>Qualification</TableHead>
                  <TableHead>Enrollment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {learners.length > 0 ? (
                  learners.map((learner) => (
                    <TableRow key={learner.id} className="hover:bg-slate-50/50 transition-colors">
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900">{learner.firstName} {learner.lastName}</span>
                          <span className="text-xs text-slate-500">{learner.email}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2 text-xs text-slate-600">
                            <Phone className="h-3 w-3" />
                            {learner.contactNumber}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <BookOpen className="h-3 w-3 text-slate-400" />
                          <span className="text-sm font-medium text-slate-700">{learner.qualification}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Calendar className="h-3 w-3" />
                          {new Date(learner.enrollmentDate).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={
                          learner.status === 'Enrolled' ? 'bg-blue-100 text-blue-700 hover:bg-blue-100 border-none' :
                          learner.status === 'Completed' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none' :
                          'bg-slate-100 text-slate-700 hover:bg-slate-100 border-none'
                        }>
                          {learner.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger render={
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          } />
                          <DropdownMenuContent align="end" className="w-[160px]">
                            <DropdownMenuGroup>
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleEdit(learner)} className="cursor-pointer">
                                <Edit2 className="mr-2 h-4 w-4" />
                                <span>Edit Learner</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => {
                                  setLearnerToDelete(learner);
                                  setIsDeleteModalOpen(true);
                                }} 
                                className="cursor-pointer text-rose-600 focus:text-rose-600 focus:bg-rose-50"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                <span>Delete Record</span>
                              </DropdownMenuItem>
                            </DropdownMenuGroup>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-slate-500">
                      No learners found. Start by adding a new learner.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Delete Learner Record</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the record for <span className="font-bold text-slate-900">"{learnerToDelete?.firstName} {learnerToDelete?.lastName}"</span>? This will permanently remove their profile and all associated data.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isSubmitting}>
              {isSubmitting ? 'Deleting...' : 'Delete Record'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
