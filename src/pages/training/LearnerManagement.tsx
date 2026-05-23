import React, { useEffect, useState } from 'react';
import { 
  Users, 
  UserPlus, 
  Search, 
  Filter, 
  Edit2, 
  MoreVertical,
  Award,
  Mail,
  Phone,
  Calendar,
  BookOpen,
  X,
  Check,
  Trash2,
  ShieldCheck,
  ArrowRight,
  GraduationCap,
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle,
  ExternalLink,
  ShieldAlert,
  Save,
  Link as LinkIcon
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
  getDocs,
  writeBatch
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/src/lib/firebase';
import { useFirebase } from '@/src/lib/FirebaseProvider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Learner, Enrollment, ProgramOffering, ProgramBatch, BadgeTemplate, UCCompletion, BadgeRequest } from '@/src/types';
import { cn } from '@/lib/utils';

export default function LearnerManagement() {
  const { user, userProfile, isAuthReady } = useFirebase();
  
  // Shared State
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [organization, setOrganization] = useState<any>(null);

  // Directory State
  const [learners, setLearners] = useState<Learner[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingLearner, setEditingLearner] = useState<Learner | null>(null);
  const [learnerToDelete, setLearnerToDelete] = useState<Learner | null>(null);
  
  // Enrollment State
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [offerings, setOfferings] = useState<ProgramOffering[]>([]);
  const [batches, setBatches] = useState<ProgramBatch[]>([]);
  const [templates, setTemplates] = useState<BadgeTemplate[]>([]);
  const [completions, setCompletions] = useState<UCCompletion[]>([]);
  const [requests, setRequests] = useState<BadgeRequest[]>([]);
  const [selectedEnrollment, setSelectedEnrollment] = useState<Enrollment | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [filterProgram, setFilterProgram] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // UC Completion Form State (integrated)
  const [ucFormData, setUcFormData] = useState({
    ucTitle: '',
    ucCode: '',
    evidenceUrl: '',
    remarks: '',
    completionStatus: 'Completed' as any
  });

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
        }
      } catch (err) {
        console.error("Error fetching organization in Training Center:", err);
      }
    };
    fetchOrg();
  }, [userProfile, isAuthReady]);

  // Directory Subscription
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
      handleFirestoreError(error, OperationType.LIST, path);
    });

    return () => unsubscribe();
  }, [user, isAuthReady]);

  // Enrollment Subscriptions
  useEffect(() => {
    if (!user) return;

    const enrPath = 'enrollments';
    const q = query(
      collection(db, enrPath),
      where('trainingCenterId', '==', user.uid),
      where('enrollmentStatus', 'in', ['Enrolled', 'Completed'])
    );

    const unsubscribeEnr = onSnapshot(q, (snapshot) => {
      setEnrollments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Enrollment[]);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, enrPath);
    });

    const offPath = 'programOfferings';
    const offQuery = query(collection(db, offPath), where('trainingCenterId', '==', user.uid));
    const unsubscribeOff = onSnapshot(offQuery, (snapshot) => {
      setOfferings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ProgramOffering[]);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, offPath);
    });

    const batchPath = 'programBatches';
    const batchQuery = query(collection(db, batchPath), where('trainingCenterId', '==', user.uid));
    const unsubscribeBatches = onSnapshot(batchQuery, (snapshot) => {
      setBatches(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ProgramBatch[]);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, batchPath);
    });

    const completionQuery = query(collection(db, 'ucCompletions'), where('trainingCenterId', '==', user.uid));
    const unsubscribeCompletions = onSnapshot(completionQuery, (snapshot) => {
      setCompletions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as UCCompletion[]);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'ucCompletions');
    });

    const requestsQuery = query(collection(db, 'badgeRequests'), where('trainingCenterId', '==', user.uid));
    const unsubscribeRequests = onSnapshot(requestsQuery, (snapshot) => {
      setRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as BadgeRequest[]);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'badgeRequests');
    });

    const templateQuery = query(collection(db, 'badgeTemplates'), where('status', 'in', ['Approved', 'Active']));
    const unsubscribeTemplates = onSnapshot(templateQuery, (snapshot) => {
      setTemplates(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as BadgeTemplate[]);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'badgeTemplates');
    });

    return () => {
      unsubscribeEnr();
      unsubscribeOff();
      unsubscribeBatches();
      unsubscribeCompletions();
      unsubscribeRequests();
      unsubscribeTemplates();
    };
  }, [user]);

  // Database duplicate cleanup effect
  useEffect(() => {
    if (enrollments.length === 0) return;

    // Group enrollments by learner email and program offering ID
    const groups: { [key: string]: Enrollment[] } = {};
    enrollments.forEach(enr => {
      const key = `${enr.learnerEmail.toLowerCase()}_${enr.programOfferingId}`;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(enr);
    });

    const toDeleteIds: string[] = [];
    Object.keys(groups).forEach(key => {
      const list = groups[key];
      if (list.length > 1) {
        // Find which one to keep
        // High priority: keep the learner record that has a batch ID assigned.
        let keepIndex = 0;
        let highestScore = -1;

        list.forEach((enr, i) => {
          const hasBatch = !!enr.programBatchId && enr.programBatchId !== "";
          const score = hasBatch ? 10 : 0;
          if (score > highestScore) {
            highestScore = score;
            keepIndex = i;
          }
        });

        // Add all others to deletion list
        list.forEach((enr, i) => {
          if (i !== keepIndex && enr.id) {
            toDeleteIds.push(enr.id);
          }
        });
      }
    });

    if (toDeleteIds.length > 0) {
      console.log("Automatically purging duplicate enrollment records from Firestore:", toDeleteIds);
      toDeleteIds.forEach(async (id) => {
        try {
          await deleteDoc(doc(db, 'enrollments', id));
        } catch (error) {
          console.error("Error during duplicate enrollment clean up:", id, error);
        }
      });
    }
  }, [enrollments]);

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

  const handleEnroll = async (id: string) => {
    try {
      await updateDoc(doc(db, 'enrollments', id), {
        enrollmentStatus: 'Enrolled',
        dateEnrolled: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } catch (error) {
       handleFirestoreError(error, OperationType.UPDATE, 'enrollments');
    }
  };

  const handleDetails = (enr: Enrollment) => {
    setSelectedEnrollment(enr);
    const offering = offerings.find(o => o.id === enr.programOfferingId);
    
    // Predetermin current completion record if it exists
    const existingComp = completions.find(c => c.enrollmentId === enr.id);
    
    setUcFormData({
      ucTitle: existingComp?.ucTitle || offering?.programTitle || '',
      ucCode: existingComp?.ucCode || offering?.qualificationCode || '',
      evidenceUrl: existingComp?.evidenceUrl || '',
      remarks: existingComp?.remarks || '',
      completionStatus: existingComp?.completionStatus || 'Completed'
    });
    
    setIsDetailsModalOpen(true);
  };

  const handleSaveUCProgress = async () => {
    if (!user || !userProfile || !selectedEnrollment) return;
    setIsSubmitting(true);
    try {
      const existingComp = completions.find(c => c.enrollmentId === selectedEnrollment.id);
      
      const payload = {
        ...ucFormData,
        enrollmentId: selectedEnrollment.id,
        trainingCenterId: user.uid,
        learnerId: selectedEnrollment.learnerId,
        programOfferingId: selectedEnrollment.programOfferingId,
        programBatchId: selectedEnrollment.programBatchId || '',
        badgeTemplateId: selectedEnrollment.badgeTemplateId || '',
        verifiedBy: userProfile.name,
        updatedAt: serverTimestamp()
      };

      if (existingComp) {
        await updateDoc(doc(db, 'ucCompletions', existingComp.id), payload);
      } else {
        await addDoc(collection(db, 'ucCompletions'), {
          ...payload,
          completedAt: serverTimestamp(),
          createdAt: serverTimestamp()
        });
      }

      // Update enrollment completion status
      await updateDoc(doc(db, 'enrollments', selectedEnrollment.id), {
        completionStatus: ucFormData.completionStatus === 'Completed' || ucFormData.completionStatus === 'Badge Requested' || ucFormData.completionStatus === 'For Badge Request' ? 'Completed' : 'In Progress',
        updatedAt: serverTimestamp()
      });

      alert("Progress saved successfully.");
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'ucCompletions');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitBadgeRequest = async () => {
    if (!user || !userProfile || !selectedEnrollment) return;
    
    if (!userProfile.assignedDistrictId) {
      alert("Training Center must be assigned to a District Office.");
      return;
    }

    const confirmReq = window.confirm("Are you sure you want to submit a badge request for this learner?");
    if (!confirmReq) return;

    setIsSubmitting(true);
    try {
      const offering = offerings.find(o => o.id === selectedEnrollment.programOfferingId);
      const template = templates.find(t => t.id === (selectedEnrollment.badgeTemplateId || offering?.badgeTemplateId));
      const existingComp = completions.find(c => c.enrollmentId === selectedEnrollment.id);

      if (!template) {
        alert("No badge template found for this program. Please contact QSO admin.");
        return;
      }

      const payload: Partial<BadgeRequest> = {
        requestType: 'Individual',
        trainingCenterId: user.uid,
        programOfferingId: selectedEnrollment.programOfferingId,
        programBatchId: selectedEnrollment.programBatchId || '',
        ucCompletionId: existingComp?.id || '',
        learnerIds: [selectedEnrollment.learnerId],
        badgeTemplateId: template.id,
        badgeType: template.badgeType || offering?.badgeType || 'Proficient',
        districtOfficeId: userProfile.assignedDistrictId,
        issuancePath: 'Standard Training-Based',
        evidenceUrl: existingComp?.evidenceUrl || '',
        remarks: existingComp?.remarks || '',
        status: 'Pending Review',
        submittedBy: user.uid,
        submittedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        templateDetails: {
          badgeName: template.badgeName,
          description: template.description,
          criteria: template.criteria,
          alignment: template.alignment,
          qualificationName: template.qualificationName,
          qualificationCode: template.qualificationCode,
          badgeType: template.badgeType,
          credentialLevel: template.credentialLevel
        }
      };

      await addDoc(collection(db, 'badgeRequests'), payload);
      
      // Update UC completion status
      if (existingComp) {
        await updateDoc(doc(db, 'ucCompletions', existingComp.id), {
          completionStatus: 'Badge Requested',
          updatedAt: serverTimestamp()
        });
      }

      alert("Badge request submitted successfully.");
      setIsDetailsModalOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'badgeRequests');
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
      const usersRef = collection(db, "users");
      const userEmailQuery = query(usersRef, where("email", "==", formData.email));
      const userEmailSnap = await getDocs(userEmailQuery);

      if (userEmailSnap.empty) {
        await addDoc(usersRef, {
          name: `${formData.firstName} ${formData.lastName}`,
          email: formData.email,
          role: "Learner",
          createdAt: serverTimestamp(),
          isPreRegistered: true,
          registeredBy: user.uid,
          trainingCenterId: user.uid,
          trainingCenterName: userProfile.office || userProfile.name
        });
      }

      if (editingLearner) {
        const updatedLearner = {
          ...formData,
          updatedAt: serverTimestamp()
        };
        await updateDoc(doc(db, 'learners', editingLearner.id), updatedLearner);
      } else {
        const learnersRef = collection(db, 'learners');
        const q = query(learnersRef, where('email', '==', formData.email));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const existingDoc = querySnapshot.docs[0];
          await updateDoc(doc(db, 'learners', existingDoc.id), {
            ...formData,
            updatedAt: serverTimestamp()
          });
        } else {
          // Create the learner
          const learnerDoc = await addDoc(collection(db, 'learners'), {
            ...formData,
            trainingCenterId: user.uid,
            trainingCenterName: userProfile.office || userProfile.name,
            districtOfficeId: organization?.assignedDistrictId || userProfile.assignedDistrictId || '',
            status: 'Enrolled',
            createdAt: serverTimestamp()
          });

          // Automatically enroll in the chosen program if it matches an offering
          const selectedOffering = offerings.find(o => o.programTitle === formData.qualification);
          if (selectedOffering) {
            await addDoc(collection(db, 'enrollments'), {
              learnerId: learnerDoc.id,
              learnerName: `${formData.firstName} ${formData.lastName}`,
              learnerEmail: formData.email,
              trainingCenterId: user.uid,
              programOfferingId: selectedOffering.id,
              badgeTemplateId: selectedOffering.badgeTemplateId || '', // Carry through
              programBatchId: '', // Initially no batch assigned
              enrollmentStatus: 'Enrolled',
              completionStatus: 'In Progress',
              dateApplied: serverTimestamp(),
              dateEnrolled: serverTimestamp(),
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            });
          }
        }
      }

      setIsAddModalOpen(false);
      setEditingLearner(null);
      
      await addDoc(collection(db, 'auditLogs'), {
        userId: user.uid,
        userName: userProfile.name,
        action: editingLearner 
          ? `Updated Learner Profile: ${formData.firstName} ${formData.lastName}`
          : `Registered New Learner: ${formData.firstName} ${formData.lastName}`,
        timestamp: serverTimestamp()
      });

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

  const baseFilteredEnrollments = enrollments.filter(enr => {
    const matchesProgram = filterProgram === 'all' || enr.programOfferingId === filterProgram;
    const matchesSearch = enr.learnerName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         enr.learnerEmail.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesProgram && matchesSearch;
  });

  // Deduplicate by program (programOfferingId) and learnerEmail.
  // Prioritize keeping the enrollment with an assigned batch.
  const uniqueEnrollmentsMap = new Map<string, Enrollment>();
  baseFilteredEnrollments.forEach(enr => {
    const key = `${enr.learnerEmail.toLowerCase()}_${enr.programOfferingId}`;
    const existing = uniqueEnrollmentsMap.get(key);
    if (!existing) {
      uniqueEnrollmentsMap.set(key, enr);
    } else {
      const currentHasBatch = !!existing.programBatchId && existing.programBatchId !== "";
      const newHasBatch = !!enr.programBatchId && enr.programBatchId !== "";
      if (!currentHasBatch && newHasBatch) {
        uniqueEnrollmentsMap.set(key, enr);
      }
    }
  });

  const filteredEnrollments = Array.from(uniqueEnrollmentsMap.values());

  const filteredDirectory = learners.filter(l => 
    l.firstName.toLowerCase().includes(searchQuery.toLowerCase()) || 
    l.lastName.toLowerCase().includes(searchQuery.toLowerCase()) || 
    l.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.qualification.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Learner Management</h1>
          <p className="text-slate-500">Unified workspace for learner accounts and enrollment progress.</p>
        </div>
        
        <Button 
          className="bg-blue-600 hover:bg-blue-700 gap-2"
          onClick={() => {
            setEditingLearner(null);
            setFormData({
              firstName: '',
              lastName: '',
              email: '',
              contactNumber: '',
              qualification: '',
              enrollmentDate: new Date().toISOString().split('T')[0]
            });
            setIsAddModalOpen(true);
          }}
        >
          <UserPlus className="h-4 w-4" />
          Add New Learner
        </Button>
      </div>

      <Tabs defaultValue="directory" className="space-y-6">
        <TabsList className="bg-slate-100 p-1">
          <TabsTrigger value="directory" className="gap-2 text-sm">
            <Users className="h-4 w-4" />
            Learner Directory
          </TabsTrigger>
          <TabsTrigger value="enrollments" className="gap-2 text-sm">
            <ShieldCheck className="h-4 w-4" />
            Active Enrollments
          </TabsTrigger>
        </TabsList>

        <TabsContent value="directory" className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input 
                    placeholder="Search by name, email, or program..." 
                    className="pl-10" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="gap-2">
                    <Filter className="h-4 w-4" />
                    Filter
                  </Button>
                  <Button variant="outline">Export Directory</Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Registered Learners</CardTitle>
              <CardDescription>Accounts created and profiles managed by your center.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow>
                    <TableHead className="pl-6">Learner Name</TableHead>
                    <TableHead>Contact Info</TableHead>
                    <TableHead>Program</TableHead>
                    <TableHead>Enrollment</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right pr-6">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDirectory.length > 0 ? (
                    filteredDirectory.map((learner) => (
                      <TableRow key={learner.id} className="hover:bg-slate-50/30">
                        <TableCell className="pl-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-900">{learner.firstName} {learner.lastName}</span>
                            <span className="text-xs text-slate-500">{learner.email}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-xs text-slate-600">
                            <Phone className="h-3.5 w-3.5" />
                            {learner.contactNumber}
                          </div>
                        </TableCell>
                        <TableCell>
                           <span className="text-sm font-medium text-slate-700">{learner.qualification}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-slate-600">{new Date(learner.enrollmentDate).toLocaleDateString()}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={
                            learner.status === 'Enrolled' ? 'border-blue-200 text-blue-700 bg-blue-50' :
                            learner.status === 'Completed' ? 'border-emerald-200 text-emerald-700 bg-emerald-50' :
                            'border-slate-200 text-slate-700 bg-slate-50'
                          }>
                            {learner.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right pr-6">
                            <DropdownMenu>
                              <DropdownMenuTrigger render={
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              } />
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEdit(learner)}>
                                  <Edit2 className="mr-2 h-4 w-4" /> Edit
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  className="text-rose-600"
                                  onClick={() => {
                                    setLearnerToDelete(learner);
                                    setIsDeleteModalOpen(true);
                                  }}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="h-32 text-center text-slate-500">No learners match your search.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="enrollments" className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4 items-end">
                <div className="grid gap-2 flex-1">
                  <Label>Filter by Program</Label>
                  <Select value={filterProgram} onValueChange={setFilterProgram}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Programs" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Programs</SelectItem>
                      {offerings.map(o => (
                        <SelectItem key={o.id} value={o.id}>{o.programTitle}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="relative flex-[2]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input 
                    placeholder="Search enrolled learner..." 
                    className="pl-10" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Track Progress</CardTitle>
              <CardDescription>Learners currently active in training batches.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50/50">
                   <TableRow>
                    <TableHead className="pl-6">Learner</TableHead>
                    <TableHead>Program / Batch</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead className="text-right pr-6">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEnrollments.map((enr) => {
                    const offering = offerings.find(o => o.id === enr.programOfferingId);
                    const batch = batches.find(b => b.id === enr.programBatchId);
                    return (
                      <TableRow key={enr.id} className="hover:bg-slate-50/30">
                        <TableCell className="pl-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-900">{enr.learnerName}</span>
                            <span className="text-xs text-slate-500">{enr.learnerEmail}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-blue-600">{offering?.programTitle}</span>
                            <span className="text-[10px] text-slate-400 font-mono italic">{batch?.batchName || 'No Batch'}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={
                            enr.enrollmentStatus === 'Enrolled' ? 'bg-emerald-500' : 
                            enr.enrollmentStatus === 'Completed' ? 'bg-blue-600' : 'bg-slate-500'
                          }>
                            {enr.enrollmentStatus}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1.5 min-w-[120px]">
                            <span className="text-[10px] font-bold text-slate-500 uppercase">{enr.completionStatus}</span>
                            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                              <div className={cn(
                                "h-full transition-all",
                                enr.completionStatus === 'Completed' ? "bg-emerald-500 w-full" :
                                enr.completionStatus === 'For Assessment' ? "bg-blue-500 w-[75%]" :
                                enr.completionStatus === 'In Progress' ? "bg-amber-500 w-[40%]" : "bg-slate-300 w-[5%]"
                              )} />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          {(enr.enrollmentStatus === 'Enrolled' || enr.enrollmentStatus === 'Completed') && (
                            <Button variant="outline" size="sm" onClick={() => handleDetails(enr)}>Details</Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filteredEnrollments.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="h-32 text-center text-slate-500">No active enrollments found.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add/Edit Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{editingLearner ? 'Edit Learner' : 'Add New Learner'}</DialogTitle>
              <DialogDescription>
                {editingLearner ? 'Update the learner\'s profile information.' : 'Register a new learner and create their system account.'}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input id="firstName" name="firstName" value={formData.firstName} onChange={handleInputChange} required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input id="lastName" name="lastName" value={formData.lastName} onChange={handleInputChange} required />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email Address</Label>
                <Input id="email" name="email" type="email" value={formData.email} onChange={handleInputChange} required disabled={!!editingLearner} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="contactNumber">Contact Number</Label>
                <Input id="contactNumber" name="contactNumber" value={formData.contactNumber} onChange={handleInputChange} required />
              </div>
              {!editingLearner && (
                <div className="grid gap-2">
                   <Label htmlFor="qualification">Program</Label>
                   <Select 
                     value={formData.qualification} 
                     onValueChange={(value) => setFormData(prev => ({ ...prev, qualification: value }))}
                     required={!editingLearner}
                   >
                     <SelectTrigger id="qualification">
                       <SelectValue placeholder="Select Program" />
                     </SelectTrigger>
                     <SelectContent>
                       {offerings.length > 0 ? (
                         offerings.map(offering => (
                           <SelectItem key={offering.id} value={offering.programTitle}>
                             {offering.programTitle}
                           </SelectItem>
                         ))
                       ) : (
                         <SelectItem value="none" disabled>No programs offered</SelectItem>
                       )}
                     </SelectContent>
                   </Select>
                </div>
              )}
              <div className="grid gap-2">
                <Label htmlFor="enrollmentDate">Registration Date</Label>
                <Input id="enrollmentDate" name="enrollmentDate" type="date" value={formData.enrollmentDate} onChange={handleInputChange} required />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-blue-600" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : editingLearner ? 'Update Profile' : 'Register Learner'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Enrollment Details Modal */}
      <Dialog open={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-blue-600" />
              Enrollment Workspace
            </DialogTitle>
            <DialogDescription>
              Track and manage program progress for <span className="font-bold text-slate-900">{selectedEnrollment?.learnerName}</span>
            </DialogDescription>
          </DialogHeader>

          {selectedEnrollment && (
            <div className="space-y-6 py-4">
              {/* Enrollment Summary */}
              <div className="grid grid-cols-3 gap-4">
                <Card className="bg-slate-50 border-none shadow-none">
                  <CardContent className="p-4">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Program</p>
                    <p className="text-sm font-bold text-slate-900 leading-tight">
                      {offerings.find(o => o.id === selectedEnrollment.programOfferingId)?.programTitle}
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-slate-50 border-none shadow-none">
                  <CardContent className="p-4">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Batch</p>
                    <p className="text-sm font-bold text-slate-900 leading-tight">
                      {batches.find(b => b.id === selectedEnrollment.programBatchId)?.batchName || 'General / No Batch'}
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-slate-50 border-none shadow-none">
                  <CardContent className="p-4">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Current Status</p>
                    <div className="flex items-center gap-2">
                      <Badge className={
                        selectedEnrollment.enrollmentStatus === 'Enrolled' ? 'bg-emerald-500' : 'bg-blue-600'
                      }>
                        {selectedEnrollment.enrollmentStatus}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Tabs defaultValue="progress" className="w-full">
                <TabsList className="bg-slate-100 w-full justify-start p-1 border-slate-200">
                  <TabsTrigger value="progress" className="text-xs">UC / Program Progress</TabsTrigger>
                  <TabsTrigger value="badge" className="text-xs">Badge Eligibility</TabsTrigger>
                </TabsList>

                <TabsContent value="progress" className="space-y-4 pt-4">
                  <div className="grid gap-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label>Qualification / UC Title</Label>
                        <Input 
                          value={ucFormData.ucTitle} 
                          onChange={e => setUcFormData({...ucFormData, ucTitle: e.target.value})}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label>Qualification Code</Label>
                        <Input 
                          value={ucFormData.ucCode} 
                          onChange={e => setUcFormData({...ucFormData, ucCode: e.target.value})}
                        />
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <Label>Evidence URL</Label>
                      <div className="flex gap-2">
                        <Input 
                          placeholder="https://..." 
                          value={ucFormData.evidenceUrl} 
                          onChange={e => setUcFormData({...ucFormData, evidenceUrl: e.target.value})}
                        />
                        {ucFormData.evidenceUrl && (
                          <Button variant="outline" size="icon" asChild>
                            <a href={ucFormData.evidenceUrl} target="_blank" rel="noreferrer">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 italic">Link to LMS records, portfolio, or assessment documents.</p>
                    </div>

                    <div className="grid gap-2">
                      <Label>Verification Remarks</Label>
                      <Textarea 
                        placeholder="Add notes about the learner's performance or completion..."
                        className="h-20"
                        value={ucFormData.remarks}
                        onChange={e => setUcFormData({...ucFormData, remarks: e.target.value})}
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-blue-50/50 border border-blue-100 rounded-lg">
                      <div className="space-y-0.5">
                        <Label className="text-blue-900">Completion Status</Label>
                        <p className="text-xs text-blue-700">Mark this when the learner has finished the requirements.</p>
                      </div>
                      <Select 
                        value={ucFormData.completionStatus} 
                        onValueChange={v => setUcFormData({...ucFormData, completionStatus: v})}
                      >
                        <SelectTrigger className="w-[200px] bg-white border-blue-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="In Progress">In Progress</SelectItem>
                          <SelectItem value="Completed">Completed / Verified</SelectItem>
                          <SelectItem value="For Badge Request">Ready for Badge Request</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex justify-end pt-2">
                      <Button 
                        onClick={handleSaveUCProgress} 
                        className="bg-blue-600 gap-2"
                        disabled={isSubmitting}
                      >
                        <Save className="h-4 w-4" />
                        {isSubmitting ? 'Saving...' : 'Save Progress Data'}
                      </Button>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="badge" className="space-y-6 pt-4">
                  {/* Badge Eligibility Status */}
                  <div className="grid gap-4">
                    <div className="flex items-start gap-4 p-4 rounded-xl border border-slate-100 bg-slate-50/50">
                      <div className={cn(
                        "p-2 rounded-lg",
                        ucFormData.completionStatus === 'For Badge Request' || ucFormData.completionStatus === 'Badge Requested'
                          ? "bg-emerald-100" : "bg-slate-100"
                      )}>
                        <Award className={cn(
                          "h-6 w-6",
                          ucFormData.completionStatus === 'For Badge Request' || ucFormData.completionStatus === 'Badge Requested'
                            ? "text-emerald-600" : "text-slate-400"
                        )} />
                      </div>
                      <div className="flex-1 space-y-1">
                        <h4 className="font-bold text-slate-900">Badge Eligibility</h4>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={cn(
                            "gap-1.5 py-1 pt-0.5 pt-0.5",
                            ucFormData.completionStatus === 'For Badge Request' ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                            ucFormData.completionStatus === 'Badge Requested' ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-slate-100 text-slate-600"
                          )}>
                            {ucFormData.completionStatus === 'For Badge Request' ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                            {ucFormData.completionStatus === 'Badge Requested' ? 'Request Submitted' : 
                             ucFormData.completionStatus === 'For Badge Request' ? 'Eligible for Badge' : 'Not Yet Eligible'}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-500">
                          {ucFormData.completionStatus === 'For Badge Request' 
                            ? "This learner has completed the program components and is ready for badge issuance."
                            : "Completion must be verified and marked as 'Ready for Badge Request' before proceeding."}
                        </p>
                      </div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                      <h4 className="text-sm font-bold text-slate-900">Request Action</h4>
                      
                      {ucFormData.completionStatus === 'Badge Requested' ? (
                        <div className="flex items-center gap-3 p-4 bg-blue-50 text-blue-700 rounded-lg">
                          <Clock className="h-5 w-5" />
                          <div className="text-sm">
                            <span className="font-bold">Badge Request is processing.</span>
                            <p className="text-xs opacity-80">Submitted to District Office for approval.</p>
                          </div>
                        </div>
                      ) : ucFormData.completionStatus === 'For Badge Request' ? (
                        <div className="space-y-4">
                          <p className="text-sm text-slate-600 leading-relaxed italic">
                            By requesting a badge, you verify that the learner has met all administrative and technical requirements for the qualification.
                          </p>
                          <Button 
                            className="w-full bg-blue-600 hover:bg-blue-700 h-10 gap-2" 
                            onClick={handleSubmitBadgeRequest}
                            disabled={isSubmitting}
                          >
                            <Award className="h-4 w-4" />
                            {isSubmitting ? 'Submitting...' : 'Submit Individual Badge Request'}
                          </Button>
                        </div>
                      ) : (
                        <div className="p-4 bg-slate-50 border border-slate-200 border-dashed rounded-lg flex flex-col items-center text-center gap-2">
                          <ShieldAlert className="h-5 w-5 text-slate-400" />
                          <p className="text-xs text-slate-500 max-w-[250px]">
                            Please complete the UC progress tracking and mark as 'Ready' to enable badge requests.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailsModalOpen(false)}>Close Workspace</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

