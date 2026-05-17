import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  User, 
  Building2, 
  Award, 
  Calendar, 
  FileText, 
  ExternalLink,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Users
} from 'lucide-react';
import { BadgeRequest, ProgramOffering, Learner, BadgeTemplate, NewIssuedBadge } from '@/src/types';
import { doc, updateDoc, serverTimestamp, addDoc, collection, getDoc, writeBatch } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/src/lib/firebase';
import { useFirebase } from '@/src/lib/FirebaseProvider';

interface RequestDetailsModalProps {
  request: BadgeRequest | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function RequestDetailsModal({ request, isOpen, onClose }: RequestDetailsModalProps) {
  const { user, userProfile } = useFirebase();
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [offering, setOffering] = useState<ProgramOffering | null>(null);
  const [learners, setLearners] = useState<Learner[]>([]);

  useEffect(() => {
    if (!request || !isOpen) return;

    const fetchData = async () => {
      try {
        const offDoc = await getDoc(doc(db, 'programOfferings', request.programOfferingId));
        if (offDoc.exists()) setOffering(offDoc.data() as ProgramOffering);

        const learnerDocs = await Promise.all(
          request.learnerIds.map(id => getDoc(doc(db, 'learners', id)))
        );
        setLearners(learnerDocs.filter(d => d.exists()).map(d => ({ id: d.id, ...d.data() })) as Learner[]);
      } catch (error) {
        console.error("Error fetching request details:", error);
      }
    };

    fetchData();
  }, [request, isOpen]);

  if (!request) return null;

  const generateVerificationId = () => {
    return `TESDA-${Math.random().toString(36).substring(2, 10).toUpperCase()}-${Date.now().toString().slice(-4)}`;
  };

  const handleApprove = async () => {
    if (!user || !offering) return;
    setIsSubmitting(true);
    const batch = writeBatch(db);

    try {
      // 1. Create IssuedBadge for each learner
      for (const learner of learners) {
        const verificationId = generateVerificationId();
        const issuedBadgeRef = doc(collection(db, 'issuedBadges'));
        
        const badgeData: any = {
          verificationId,
          badgeId: request.badgeTemplateId,
          badgeTemplateId: request.badgeTemplateId,
          badgeTemplateName: (request as any).badgeTemplateName || request.templateDetails?.badgeName || offering.badgeTemplateName || offering.programTitle,
          badgeRequestId: request.id,
          programOfferingId: request.programOfferingId || '',
          programTitle: (request as any).programTitle || offering.programTitle,
          badgeType: request.badgeType,
          learnerId: learner.id,
          learnerName: `${learner.firstName} ${learner.lastName}`,
          learnerEmail: learner.email,
          trainingCenterId: request.trainingCenterId || '',
          trainingCenterName: offering.trainingCenterName || (request as any).trainingCenterName,
          districtOfficeId: request.districtOfficeId || '',
          issueDate: serverTimestamp() as any,
          status: 'Active',
          publishedToLearner: true,
          evidenceUrl: request.evidenceUrl || '',
          qualificationName: (request as any).qualificationName || request.templateDetails?.qualificationName || offering.qualificationName || offering.programTitle,
          qualificationCode: (request as any).qualificationCode || request.templateDetails?.qualificationCode || offering.qualificationCode,
          credentialLevel: request.templateDetails?.credentialLevel,
          criteria: request.templateDetails?.criteria,
          alignment: request.templateDetails?.alignment,
          description: request.templateDetails?.description,
          ucTitle: (request as any).badgeTemplateName || request.templateDetails?.badgeName || offering.programTitle,
          metadata: {
            batchId: request.programBatchId,
            programTitle: (request as any).programTitle || offering.programTitle,
            qualificationCode: (request as any).qualificationCode || offering.qualificationCode,
            requestType: request.requestType
          }
        };
        
        batch.set(issuedBadgeRef, {
          ...badgeData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });

        // Update learner badge status - if it exists on learner doc
        const learnerRef = doc(db, 'learners', learner.id);
        batch.update(learnerRef, {
          badgeStatus: 'Active',
          updatedAt: serverTimestamp()
        });
      }

      // 2. Update Badge Request status
      const requestRef = doc(db, 'badgeRequests', request.id);
      batch.update(requestRef, {
        status: 'Approved',
        approvedBy: user.uid,
        approvedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // 3. Audit Log
      const auditRef = doc(collection(db, 'auditLogs'));
      batch.set(auditRef, {
        action: `Approved Badge Request: ${request.id}`,
        userName: userProfile?.name || 'District Staff',
        timestamp: serverTimestamp(),
        details: `Issued ${learners.length} badges for ${offering.programTitle}`
      });

      await batch.commit();
      onClose();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'badgeRequests/issuedBadges');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!user || !rejectionReason) return;
    setIsSubmitting(true);
    try {
      await updateDoc(doc(db, 'badgeRequests', request.id), {
        status: 'Rejected',
        rejectionReason,
        rejectedBy: user.uid,
        rejectedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      onClose();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'badgeRequests');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-blue-600" />
            Badge Issuance Review
          </DialogTitle>
          <DialogDescription>
            Approval request for {request.requestType} issuance from {offering?.trainingCenterName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="grid grid-cols-2 gap-4">
            <Card className="bg-slate-50 border-slate-100 shadow-none">
              <CardContent className="p-4">
                <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Program / Qualification</p>
                <p className="text-sm font-bold text-slate-900">{offering?.programTitle}</p>
                <p className="text-xs text-slate-500">{offering?.qualificationCode}</p>
              </CardContent>
            </Card>
            <Card className="bg-slate-50 border-slate-100 shadow-none">
              <CardContent className="p-4">
                <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Badge Level</p>
                <Badge className={
                  request.badgeType === 'Master' ? 'bg-purple-100 text-purple-700' :
                  request.badgeType === 'Skilled' ? 'bg-blue-100 text-blue-700' :
                  'bg-emerald-100 text-emerald-700'
                }>{request.badgeType}</Badge>
              </CardContent>
            </Card>
          </div>

          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
              <Users className="h-4 w-4 text-slate-400" />
              Learners ({learners.length})
            </h3>
            <div className="border border-slate-100 rounded-lg divide-y divide-slate-50">
              {learners.map(learner => (
                <div key={learner.id} className="p-3 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{learner.firstName} {learner.lastName}</span>
                    <span className="text-[10px] text-slate-500">{learner.email}</span>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-mono uppercase">ID: {learner.id.slice(-6).toUpperCase()}</Badge>
                </div>
              ))}
            </div>
          </div>

          {request.remarks && (
            <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100">
              <p className="text-[10px] text-blue-600 uppercase font-bold mb-1">Center Remarks</p>
              <p className="text-sm text-slate-700 italic">"{request.remarks}"</p>
            </div>
          )}

          {request.evidenceUrl && (
            <div>
              <p className="text-[10px] text-slate-500 uppercase font-bold">Evidence Document</p>
              <a href={request.evidenceUrl} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline flex items-center gap-1.5 mt-1">
                View Submission Evidence <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          )}

          {showRejectForm && (
            <div className="space-y-3 p-4 bg-rose-50 border border-rose-100 rounded-lg animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-2 text-rose-700">
                <AlertCircle className="h-4 w-4" />
                <Label className="font-bold">Reason for Rejection</Label>
              </div>
              <Textarea 
                placeholder="Please describe why this request cannot be approved..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="bg-white border-rose-200"
              />
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          {!showRejectForm ? (
            <>
              <Button 
                variant="outline" 
                className="text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700"
                onClick={() => setShowRejectForm(true)}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reject Request
              </Button>
              <Button 
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                onClick={handleApprove}
                disabled={isSubmitting}
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                {isSubmitting ? 'Processing...' : 'Approve & Issue Badges'}
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={() => setShowRejectForm(false)}>Cancel</Button>
              <Button variant="destructive" onClick={handleReject} disabled={!rejectionReason || isSubmitting}>
                Confirm Rejection
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
