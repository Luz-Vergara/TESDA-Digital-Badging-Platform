import React, { useEffect, useState } from 'react';
import { 
  Award, 
  Plus, 
  Search, 
  Filter, 
  Clock, 
  CheckCircle2, 
  XCircle,
  Eye,
  FileText,
  Upload,
  AlertCircle
} from 'lucide-react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  serverTimestamp,
  doc,
  getDoc
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
import { Textarea } from '@/components/ui/textarea';
import { BadgeIssuanceRequest, Learner, BadgeTemplate } from '@/src/types';

export default function BadgeRequests() {
  const { user, userProfile, isAuthReady } = useFirebase();
  const [requests, setRequests] = useState<BadgeIssuanceRequest[]>([]);
  const [learners, setLearners] = useState<Learner[]>([]);
  const [templates, setTemplates] = useState<BadgeTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<BadgeIssuanceRequest | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    learnerId: '',
    badgeTemplateId: '',
    evidenceUrl: '',
    remarks: ''
  });

  useEffect(() => {
    if (!isAuthReady || !user) return;

    const requestsPath = 'issuedBadges';
    const q = query(
      collection(db, requestsPath),
      where('issuerId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as BadgeIssuanceRequest[];
      setRequests(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, requestsPath);
    });

    // Fetch Learners for selection
    const learnersQuery = query(
      collection(db, 'learners'),
      where('trainingCenterId', '==', user.uid)
    );
    const unsubscribeLearners = onSnapshot(learnersQuery, (snapshot) => {
      setLearners(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Learner[]);
    });

    // Fetch Badge Templates
    const templatesQuery = query(collection(db, 'badgeTemplates'));
    const unsubscribeTemplates = onSnapshot(templatesQuery, (snapshot) => {
      setTemplates(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as BadgeTemplate[]);
    });

    return () => {
      unsubscribe();
      unsubscribeLearners();
      unsubscribeTemplates();
    };
  }, [user, isAuthReady]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !userProfile || !formData.learnerId || !formData.badgeTemplateId) return;

    setIsSubmitting(true);
    try {
      if (!userProfile.assignedDistrictId) {
        alert("Action Required: Your Training Center is not yet linked to a TESDA District Office.\n\nTo fix this:\n1. Log in as Central Admin\n2. Go to 'Organizations'\n3. Edit your Training Center\n4. Select an 'Assigned District Office'\n5. Save and then refresh this page.");
        setIsSubmitting(false);
        return;
      }

      const learner = learners.find(l => l.id === formData.learnerId);
      const template = templates.find(t => t.id === formData.badgeTemplateId);

      if (!learner || !template) throw new Error('Invalid selection');

      const newRequest: Partial<BadgeIssuanceRequest> = {
        learnerId: learner.id,
        learnerName: `${learner.firstName} ${learner.lastName}`,
        learnerEmail: learner.email,
        badgeId: template.id,
        badgeName: template.programName,
        badgeType: template.badgeType,
        programName: template.programName,
        issuerId: user.uid,
        issuerName: userProfile.office || userProfile.name,
        issuerType: 'TrainingCenter',
        districtOfficeId: userProfile.assignedDistrictId,
        status: 'Pending Approval',
        submittedBy: user.uid,
        submittedByName: userProfile.name,
        submittedAt: serverTimestamp() as any,
        evidenceUrl: formData.evidenceUrl,
        remarks: formData.remarks,
        criteria: template.criteria
      };

      await addDoc(collection(db, 'issuedBadges'), newRequest);
      
      // Log Activity
      await addDoc(collection(db, 'auditLogs'), {
        userId: user.uid,
        userName: userProfile.name,
        action: `Submitted badge request for ${newRequest.learnerName}`,
        details: `Badge: ${newRequest.badgeName}`,
        timestamp: serverTimestamp()
      });

      setIsSubmitModalOpen(false);
      setFormData({ learnerId: '', badgeTemplateId: '', evidenceUrl: '', remarks: '' });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'issuedBadges');
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
          <h1 className="text-3xl font-bold text-slate-900">Badge Requests</h1>
          <p className="text-slate-500">Submit and track badge issuance requests for your learners.</p>
        </div>
        
        <Button 
          className="bg-blue-600 hover:bg-blue-700 gap-2"
          onClick={() => setIsSubmitModalOpen(true)}
        >
          <Plus className="h-4 w-4" />
          Submit Badge Request
        </Button>

        <Dialog open={isSubmitModalOpen} onOpenChange={setIsSubmitModalOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>New Badge Request</DialogTitle>
                <DialogDescription>
                  Select a learner and the badge they have earned. Requests are sent to the District Office for approval.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>Select Learner</Label>
                  <Select 
                    value={formData.learnerId} 
                    onValueChange={(v) => setFormData(prev => ({ ...prev, learnerId: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a learner..." />
                    </SelectTrigger>
                    <SelectContent>
                      {learners.map(l => (
                        <SelectItem key={l.id} value={l.id!}>
                          {l.firstName} {l.lastName} ({l.qualification})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Select Badge Template</Label>
                  <Select 
                    value={formData.badgeTemplateId} 
                    onValueChange={(v) => setFormData(prev => ({ ...prev, badgeTemplateId: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a badge..." />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map(t => (
                        <SelectItem key={t.id} value={t.id!}>
                          {t.programName} - {t.badgeType}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="evidenceUrl">Evidence URL (Optional)</Label>
                  <Input 
                    id="evidenceUrl" 
                    placeholder="https://link-to-portfolio-or-certificate.com"
                    value={formData.evidenceUrl}
                    onChange={(e) => setFormData(prev => ({ ...prev, evidenceUrl: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="remarks">Remarks / Notes</Label>
                  <Textarea 
                    id="remarks" 
                    placeholder="Add any additional context for the reviewer..."
                    value={formData.remarks}
                    onChange={(e) => setFormData(prev => ({ ...prev, remarks: e.target.value }))}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsSubmitModalOpen(false)}>Cancel</Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isSubmitting}>
                  {isSubmitting ? 'Submitting...' : 'Submit Request'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <div className="flex justify-between items-start mb-2">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Submitted</p>
              <FileText className="h-4 w-4 text-slate-400" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{requests.length}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <div className="flex justify-between items-start mb-2">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Pending</p>
              <Clock className="h-4 w-4 text-amber-500" />
            </div>
            <p className="text-2xl font-bold text-slate-900">
              {requests.filter(r => r.status === 'Pending Approval').length}
            </p>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <div className="flex justify-between items-start mb-2">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Approved</p>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </div>
            <p className="text-2xl font-bold text-slate-900">
              {requests.filter(r => r.status === 'Approved').length}
            </p>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <div className="flex justify-between items-start mb-2">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Rejected</p>
              <XCircle className="h-4 w-4 text-rose-500" />
            </div>
            <p className="text-2xl font-bold text-slate-900">
              {requests.filter(r => r.status === 'Rejected').length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Submissions Table */}
      <Card className="border-slate-200">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">Submission Tracking</CardTitle>
            <CardDescription>Monitor the status of your badge requests</CardDescription>
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input placeholder="Search requests..." className="pl-9 w-48 h-9 text-sm" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-slate-100">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead>Request ID</TableHead>
                  <TableHead>Learner</TableHead>
                  <TableHead>Badge Type</TableHead>
                  <TableHead>Qualification</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.length > 0 ? (
                  requests.map((request) => (
                    <TableRow key={request.id} className="hover:bg-slate-50/50 transition-colors">
                      <TableCell className="font-mono text-[10px] text-slate-500">
                        {request.id?.slice(-8).toUpperCase()}
                      </TableCell>
                      <TableCell className="font-bold text-slate-900">{request.learnerName}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-slate-700">{request.badgeName}</span>
                          <span className="text-[10px] text-slate-500 uppercase">{request.badgeType}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">{request.programName}</TableCell>
                      <TableCell className="text-xs text-slate-500">
                        {request.submittedAt ? new Date(request.submittedAt.seconds * 1000).toLocaleDateString() : 'N/A'}
                      </TableCell>
                      <TableCell>
                        <Badge className={
                          request.status === 'Approved' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' :
                          request.status === 'Pending Approval' ? 'bg-amber-100 text-amber-700 hover:bg-amber-100' :
                          'bg-rose-100 text-rose-700 hover:bg-rose-100'
                        }>
                          {request.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          onClick={() => {
                            setSelectedRequest(request);
                            setIsDetailsModalOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-slate-500">
                      No badge requests found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Details Modal */}
      <Dialog open={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Request Details</DialogTitle>
            <DialogDescription>
              Full information for badge request #{selectedRequest?.id?.slice(-8).toUpperCase()}
            </DialogDescription>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Learner Information</p>
                  <p className="font-bold text-slate-900">{selectedRequest.learnerName}</p>
                  <p className="text-sm text-slate-500">{selectedRequest.learnerEmail}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Badge Details</p>
                  <p className="font-bold text-slate-900">{selectedRequest.badgeName}</p>
                  <Badge variant="outline" className="text-[10px] uppercase mt-1">
                    {selectedRequest.badgeType}
                  </Badge>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Qualification / Unit</p>
                <p className="text-sm text-slate-700">{selectedRequest.programName}</p>
              </div>

              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Evidence & Remarks</p>
                {selectedRequest.evidenceUrl ? (
                  <a 
                    href={selectedRequest.evidenceUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-blue-600 hover:underline mt-1"
                  >
                    <Upload className="h-3 w-3" />
                    View Evidence Document
                  </a>
                ) : (
                  <p className="text-sm text-slate-400 italic">No evidence URL provided</p>
                )}
                <p className="text-sm text-slate-600 mt-2 bg-slate-50 p-3 rounded-md border border-slate-100">
                  {selectedRequest.remarks || 'No remarks provided.'}
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Approval Status</p>
                  <Badge className={
                    selectedRequest.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' :
                    selectedRequest.status === 'Pending Approval' ? 'bg-amber-100 text-amber-700' :
                    'bg-rose-100 text-rose-700'
                  }>
                    {selectedRequest.status}
                  </Badge>
                </div>

                {selectedRequest.status === 'Rejected' && (
                  <div className="p-4 bg-rose-50 border border-rose-100 rounded-lg flex gap-3">
                    <AlertCircle className="h-5 w-5 text-rose-500 shrink-0" />
                    <div>
                      <p className="text-sm font-bold text-rose-900">Rejection Feedback</p>
                      <p className="text-sm text-rose-700 mt-1">{selectedRequest.rejectionComment || 'No feedback provided.'}</p>
                    </div>
                  </div>
                )}

                {selectedRequest.status === 'Approved' && (
                  <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-lg flex gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                    <div>
                      <p className="text-sm font-bold text-emerald-900">Badge Published</p>
                      <p className="text-sm text-emerald-700 mt-1">
                        Approved by {selectedRequest.approvedBy || 'District Office'} on {selectedRequest.approvedAt ? new Date(selectedRequest.approvedAt.seconds * 1000).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailsModalOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
