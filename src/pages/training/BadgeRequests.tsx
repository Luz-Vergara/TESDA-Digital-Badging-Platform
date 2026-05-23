import React, { useEffect, useState } from 'react';
import { 
  Award, 
  Plus, 
  Search, 
  Clock, 
  CheckCircle2, 
  XCircle,
  Eye,
  FileText,
  Users,
  Layers,
  CheckSquare,
  RotateCcw
} from 'lucide-react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  getDocs,
  addDoc, 
  serverTimestamp,
  doc,
  writeBatch,
  updateDoc,
  deleteDoc
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
import { Textarea } from '@/components/ui/textarea';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BadgeRequest, Enrollment, ProgramOffering, ProgramBatch, BadgeTemplate } from '@/src/types';
import { Checkbox } from '@/components/ui/checkbox';

export default function BadgeRequests() {
  const { user, userProfile, isAuthReady } = useFirebase();
  const [requests, setRequests] = useState<BadgeRequest[]>([]);
  const [offerings, setOfferings] = useState<ProgramOffering[]>([]);
  const [batches, setBatches] = useState<ProgramBatch[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [templates, setTemplates] = useState<BadgeTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [requestType, setRequestType] = useState<'Individual' | 'Batch'>('Individual');
  
  const [formData, setFormData] = useState({
    programOfferingId: '',
    programBatchId: '',
    badgeTemplateId: '',
    learnerIds: [] as string[],
    issuancePath: 'Standard Training-Based' as 'Standard Training-Based' | 'RPL',
    sourceAssessmentCenterId: '',
    evidenceUrl: '',
    remarks: ''
  });

  useEffect(() => {
    if (!isAuthReady || !user) return;

    const reqPath = 'badgeRequests';
    const q = query(collection(db, reqPath), where('trainingCenterId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as BadgeRequest[]);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, reqPath);
      setLoading(false);
    });

    const offPath = 'programOfferings';
    const offQuery = query(collection(db, offPath), where('trainingCenterId', '==', user.uid));
    const unsubOff = onSnapshot(offQuery, (snapshot) => {
      setOfferings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ProgramOffering[]);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, offPath);
    });

    const batchPath = 'programBatches';
    const batchQuery = query(collection(db, batchPath), where('trainingCenterId', '==', user.uid));
    const unsubBatches = onSnapshot(batchQuery, (snapshot) => {
      setBatches(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ProgramBatch[]);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, batchPath);
    });

    const enrPath = 'enrollments';
    const enrQuery = query(collection(db, enrPath), where('trainingCenterId', '==', user.uid));
    const unsubEnr = onSnapshot(enrQuery, (snapshot) => {
      setEnrollments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Enrollment[]);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, enrPath);
    });

    const tempPath = 'badgeTemplates';
    const tempQuery = query(collection(db, tempPath), where('status', 'in', ['Approved', 'Active']));
    const unsubTemp = onSnapshot(tempQuery, (snapshot) => {
      setTemplates(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as BadgeTemplate[]);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, tempPath);
    });

    // Also fetch assessment centers for RPL matching
    const acPath = 'organizations';
    const acQuery = query(collection(db, acPath), where('type', '==', 'AssessmentCenter'));
    const unsubAC = onSnapshot(acQuery, (snapshot) => {
      // Just to populate Source Assessment Center dropdown later if needed
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, acPath);
    });

    return () => {
      unsubscribe();
      unsubOff();
      unsubBatches();
      unsubEnr();
      unsubTemp();
      unsubAC();
    };
  }, [user, isAuthReady]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !userProfile || !formData.programOfferingId || formData.learnerIds.length === 0) return;

    setIsSubmitting(true);
    try {
      if (!userProfile.assignedDistrictId) {
         alert("Training Center must be assigned to a District Office.");
         return;
      }

      const offering = offerings.find(o => o.id === formData.programOfferingId);
      const templateId = formData.badgeTemplateId || offering?.badgeTemplateId;
      const template = templates.find(t => t.id === templateId);
      
      const payload: any = {
        requestType,
        trainingCenterId: user.uid,
        trainingCenterName: userProfile.office || userProfile.name,
        programOfferingId: formData.programOfferingId,
        programBatchId: formData.programBatchId,
        learnerIds: formData.learnerIds,
        badgeTemplateId: templateId || '',
        badgeTemplateName: template?.badgeName || offering?.badgeTemplateName || '',
        badgeType: template?.badgeType || offering?.badgeType || 'Proficient',
        programTitle: offering?.programTitle || template?.badgeName || '',
        qualificationName: template?.qualificationName || offering?.qualificationName || '',
        qualificationCode: template?.qualificationCode || offering?.qualificationCode || '',
        districtOfficeId: userProfile.assignedDistrictId,
        issuancePath: formData.issuancePath,
        sourceAssessmentCenterId: formData.issuancePath === 'RPL' ? formData.sourceAssessmentCenterId : '',
        evidenceUrl: formData.issuancePath === 'RPL' ? formData.evidenceUrl : '',
        remarks: formData.issuancePath === 'RPL' ? formData.remarks : '',
        status: 'Pending Review',
        submittedBy: user.uid,
        submittedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        templateDetails: template ? {
          badgeName: template.badgeName,
          description: template.description,
          criteria: template.criteria,
          alignment: template.alignment,
          qualificationName: template.qualificationName,
          qualificationCode: template.qualificationCode,
          badgeType: template.badgeType,
          credentialLevel: template.credentialLevel
        } : undefined
      };

      await addDoc(collection(db, 'badgeRequests'), payload);
      
      setIsSubmitModalOpen(false);
      setFormData({
        programOfferingId: '',
        programBatchId: '',
        badgeTemplateId: '',
        learnerIds: [],
        evidenceUrl: '',
        remarks: '',
        issuancePath: 'Standard Training-Based',
        sourceAssessmentCenterId: ''
      });
    } catch (error) {
       handleFirestoreError(error, OperationType.CREATE, 'badgeRequests');
    } finally {
      setIsSubmitting(false);
    }
  };

  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetStatus, setResetStatus] = useState<string | null>(null);

  const handleResetData = async () => {
    if (!user) return;
    setIsResetting(true);
    setResetStatus("Initializing reset...");
    
    try {
      const collectionsToClear = ['badgeRequests', 'issuedBadges', 'ucCompletions'];
      let totalDeleted = 0;

      for (const collectionName of collectionsToClear) {
        setResetStatus(`Clearing ${collectionName}...`);
        const orgQuery = query(collection(db, collectionName), where('trainingCenterId', '==', user.uid));
        const districtQuery = query(collection(db, collectionName), where('districtOfficeId', '==', userProfile.assignedDistrictId || 'none'));
        
        const [orgSnap, districtSnap] = await Promise.all([
          getDocs(orgQuery),
          getDocs(districtQuery)
        ]);

        // Merge results and filter specifically for this center's data
        const allDocs = [...orgSnap.docs];
        districtSnap.docs.forEach(doc => {
          if (!allDocs.find(d => d.id === doc.id)) {
            // Only add if it's related to this center's requests or completions
            const data = doc.data();
            if (data.trainingCenterId === user.uid) {
              allDocs.push(doc);
            }
          }
        });
        
        if (allDocs.length === 0) continue;

        // Use chunks of 400
        for (let i = 0; i < allDocs.length; i += 400) {
          const chunk = allDocs.slice(i, i + 400);
          const batch = writeBatch(db);
          chunk.forEach(doc => batch.delete(doc.ref));
          await batch.commit();
          totalDeleted += chunk.length;
        }
      }

      setResetStatus(`Success: ${totalDeleted} records cleared.`);
      setShowResetConfirm(false);
      setTimeout(() => setResetStatus(null), 5000);
    } catch (error) {
      console.error("Reset Error:", error);
      setResetStatus("Error resetting data. Check console.");
    } finally {
      setIsResetting(false);
    }
  };

  const getFilteredLearners = () => {
    let filtered = enrollments;
    if (formData.programOfferingId) {
      filtered = filtered.filter(e => e.programOfferingId === formData.programOfferingId);
    }
    if (formData.programBatchId) {
      filtered = filtered.filter(e => e.programBatchId === formData.programBatchId);
    }
    return filtered.filter(e => e.completionStatus === 'Completed');
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Loading requests...</div>;

  return (
    <div className="space-y-6 text-slate-900">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Badge Requests</h1>
          <p className="text-slate-500 text-sm">Submit and monitor requests for badge approvals.</p>
        </div>
        <div className="flex gap-2 relative">
          {resetStatus && (
            <div className="absolute -top-10 right-0 bg-slate-800 text-white text-[10px] px-3 py-1.5 rounded shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-300 z-50 whitespace-nowrap">
              {resetStatus}
            </div>
          )}
          
          {showResetConfirm ? (
            <div className="flex gap-2 animate-in fade-in slide-in-from-right-2 duration-200">
              <Button 
                variant="destructive" 
                size="sm"
                onClick={handleResetData} 
                disabled={isResetting}
                className="gap-1.5 text-xs h-9 px-3"
              >
                {isResetting ? 'Resetting...' : 'Confirm Reset'}
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setShowResetConfirm(false)}
                disabled={isResetting}
                className="text-slate-500 h-9 px-3"
              >
                Cancel
              </Button>
            </div>
          ) : (
            <Button 
              variant="outline" 
              onClick={() => setShowResetConfirm(true)} 
              disabled={isResetting}
              className="text-slate-500 border-slate-200 hover:bg-slate-50 gap-1.5"
            >
              <RotateCcw className={cn("h-3.5 w-3.5", isResetting && "animate-spin")} /> 
              Reset Testing Data
            </Button>
          )}
          
          <Button onClick={() => setIsSubmitModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 gap-1.5">
            <Plus className="h-4 w-4" /> New Badge Request
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Requests</p>
            <p className="text-2xl font-bold">{requests.length}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-1">Pending Review</p>
            <p className="text-2xl font-bold">{requests.filter(r => r.status === 'Pending Review').length}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-1">Approved</p>
            <p className="text-2xl font-bold">{requests.filter(r => r.status === 'Approved').length}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <p className="text-[10px] font-bold text-rose-500 uppercase tracking-widest mb-1">Rejected</p>
            <p className="text-2xl font-bold">{requests.filter(r => r.status === 'Rejected').length}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Request History</CardTitle>
          <CardDescription>Track all submitted badge requests and their approval status.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Type</TableHead>
                <TableHead>Program / Qualification</TableHead>
                <TableHead>Learners</TableHead>
                <TableHead>Submitted At</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right pr-6">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((request) => {
                const offering = offerings.find(o => o.id === request.programOfferingId);
                return (
                  <TableRow key={request.id}>
                    <TableCell className="pl-6">
                      <Badge variant="outline" className="text-[10px] gap-1 px-2">
                        {request.requestType === 'Individual' && <Plus className="h-2 w-2" />}
                        {request.requestType === 'Batch' && <Users className="h-2 w-2" />}
                        {request.requestType}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-800">{offering?.programTitle || 'Program'}</span>
                        <span className="text-[10px] text-slate-500 uppercase font-medium">{request.badgeType} Level</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-semibold">{request.learnerIds.length} Learner(s)</span>
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {request.submittedAt ? new Date(request.submittedAt.seconds * 1000).toLocaleDateString() : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <Badge className={
                        request.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' :
                        request.status === 'Pending Review' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
                      }>
                        {request.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <Button variant="ghost" size="sm" className="text-blue-600">Details</Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {requests.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-slate-500 italic">No badge requests found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isSubmitModalOpen} onOpenChange={setIsSubmitModalOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>New Badge Issuance Request</DialogTitle>
              <DialogDescription>Submit learner accomplishments for official badge issuance.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-6 py-4">
              <div className="flex bg-slate-100 p-1 rounded-lg">
                {(['Individual', 'Batch'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => { setRequestType(type); setFormData({...formData, learnerIds: []}); }}
                    className={cn(
                      "flex-1 py-1.5 text-xs font-bold rounded-md transition-all",
                      requestType === type ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                    )}
                  >
                    {type} Request
                  </button>
                ))}
              </div>

              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Select Program Offering</Label>
                    <Select value={formData.programOfferingId} onValueChange={(v) => setFormData({...formData, programOfferingId: v})}>
                      <SelectTrigger><SelectValue placeholder="Choose program..." /></SelectTrigger>
                      <SelectContent>
                        {offerings.map(o => (
                          <SelectItem key={o.id} value={o.id}>{o.programTitle}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Select Batch (Recommended)</Label>
                    <Select value={formData.programBatchId} onValueChange={(v) => setFormData({...formData, programBatchId: v})}>
                      <SelectTrigger><SelectValue placeholder="Full Program / All Batches" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">General / No Batch</SelectItem>
                        {batches.filter(b => b.programOfferingId === formData.programOfferingId).map(b => (
                          <SelectItem key={b.id} value={b.id}>{b.batchName}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label>Issuance Path</Label>
                  <Select 
                    value={formData.issuancePath} 
                    onValueChange={(v: any) => setFormData({...formData, issuancePath: v})}
                  >
                    <SelectTrigger className="font-semibold text-blue-600 bg-blue-50/50">
                      <SelectValue placeholder="Select path..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Standard Training-Based">Standard Training-Based</SelectItem>
                      <SelectItem value="RPL">Recognition of Prior Learning (RPL)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.issuancePath === 'RPL' && (
                  <div className="grid gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
                    <Label>Source Assessment Center (Required for RPL)</Label>
                    <Input 
                      placeholder="Enter the name or ID of the AC that conducted the assessment" 
                      value={formData.sourceAssessmentCenterId}
                      onChange={(e) => setFormData({...formData, sourceAssessmentCenterId: e.target.value})}
                      className="border-blue-200"
                    />
                  </div>
                )}

                <div className="grid gap-2">
                  <Label className="flex justify-between items-center">
                    <span>Eligible Learners ({getFilteredLearners().length})</span>
                    <span className="text-[10px] text-slate-400 capitalize">Requirement: Completion Logged</span>
                  </Label>
                  <div className="border border-slate-200 rounded-lg p-2 max-h-[200px] overflow-y-auto space-y-2 bg-slate-50/50">
                    {getFilteredLearners().map((enr) => (
                      <div key={enr.id} className="flex items-center gap-3 p-2 bg-white rounded border border-slate-100 hover:border-blue-200 transition-colors">
                        <Checkbox 
                          id={`learner-${enr.id}`} 
                          checked={formData.learnerIds.includes(enr.learnerId)}
                          onCheckedChange={(checked) => {
                            if (requestType === 'Individual') {
                              setFormData({...formData, learnerIds: checked ? [enr.learnerId] : []});
                            } else {
                              const newIds = checked 
                                ? [...formData.learnerIds, enr.learnerId]
                                : formData.learnerIds.filter(id => id !== enr.learnerId);
                              setFormData({...formData, learnerIds: newIds});
                            }
                          }}
                        />
                        <Label htmlFor={`learner-${enr.id}`} className="flex-1 cursor-pointer">
                          <div className="flex flex-col">
                            <span className="text-sm font-bold">{enr.learnerName}</span>
                            <span className="text-[10px] text-slate-500">{enr.learnerEmail}</span>
                          </div>
                        </Label>
                      </div>
                    ))}
                    {getFilteredLearners().length === 0 && (
                      <div className="p-4 text-center text-slate-400 text-xs italic">No eligible learners found for this selection.</div>
                    )}
                  </div>
                </div>

                {formData.issuancePath === 'RPL' && (
                  <>
                    <div className="grid gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
                      <Label>Evidence Link (URL to Portfolio/LMS/Records)</Label>
                      <Input 
                        placeholder="https://testda.gov.ph/verification/..." 
                        value={formData.evidenceUrl}
                        onChange={(e) => setFormData({...formData, evidenceUrl: e.target.value})}
                      />
                    </div>

                    <div className="grid gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
                      <Label>Remarks / Submission Notes</Label>
                      <Textarea 
                        placeholder="Provide context for the District Office reviewer..."
                        className="h-20"
                        value={formData.remarks}
                        onChange={(e) => setFormData({...formData, remarks: e.target.value})}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsSubmitModalOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isSubmitting || formData.learnerIds.length === 0}>
                {isSubmitting ? 'Submitting Request...' : `Submit ${formData.learnerIds.length > 1 ? 'Batch' : ''} Request`}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
