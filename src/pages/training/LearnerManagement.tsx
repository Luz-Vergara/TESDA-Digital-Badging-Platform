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
  Check
} from 'lucide-react';
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
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Learner } from '@/src/types';

export default function LearnerManagement() {
  const { user, userProfile, isAuthReady } = useFirebase();
  const [learners, setLearners] = useState<Learner[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !userProfile) return;
    
    setIsSubmitting(true);
    try {
      const newLearner = {
        ...formData,
        trainingCenterId: user.uid,
        trainingCenterName: userProfile.office || userProfile.name,
        status: 'Enrolled',
        createdAt: serverTimestamp()
      };
      
      await addDoc(collection(db, 'learners'), newLearner);
      setIsAddModalOpen(false);
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        contactNumber: '',
        qualification: '',
        enrollmentDate: new Date().toISOString().split('T')[0]
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'learners');
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
                    placeholder="Web Development NC III" 
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
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-blue-600">
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </div>
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
    </div>
  );
}
