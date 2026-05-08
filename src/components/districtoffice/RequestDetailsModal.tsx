import React, { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
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
  AlertCircle
} from 'lucide-react';
import { BadgeIssuanceRequest } from '@/src/types';
import { doc, updateDoc, serverTimestamp, addDoc, collection } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/src/lib/firebase';
import { useFirebase } from '@/src/lib/FirebaseProvider';

interface RequestDetailsModalProps {
  request: BadgeIssuanceRequest | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function RequestDetailsModal({ request, isOpen, onClose }: RequestDetailsModalProps) {
  const { user, userProfile } = useFirebase();
  const [rejectionComment, setRejectionComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);

  if (!request) return null;

  const handleApprove = async () => {
    if (!user) return;
    setIsSubmitting(true);
    try {
      await updateDoc(doc(db, 'issuedBadges', request.id), {
        status: 'Published to Learner Wallet',
        publishedToLearner: true,
        districtApprovalStatus: 'Approved',
        publicationStatus: 'Published',
        approvedBy: user.uid,
        approvedAt: serverTimestamp(),
        expiryDate: request.expiryDate || null 
      });

      await addDoc(collection(db, 'auditLogs'), {
        action: `Approved Badge Request: ${request.id}`,
        userName: userProfile?.name || 'District Staff',
        timestamp: serverTimestamp(),
        details: `Badge: ${request.badgeName} for ${request.learnerName}`
      });

      onClose();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'issuedBadges');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!user || !rejectionComment) return;
    setIsSubmitting(true);
    try {
      await updateDoc(doc(db, 'issuedBadges', request.id), {
        status: 'Returned by District Office',
        publishedToLearner: true, 
        rejectionComment,
        districtApprovalStatus: 'Rejected',
        approvedBy: user.uid,
        approvedAt: serverTimestamp()
      });

      await addDoc(collection(db, 'auditLogs'), {
        action: `Rejected Badge Request: ${request.id}`,
        userName: userProfile?.name || 'District Staff',
        timestamp: serverTimestamp(),
        details: `Reason: ${rejectionComment}`
      });

      onClose();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'issuedBadges');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            Badge Request Details
          </DialogTitle>
          <DialogDescription>
            Review the submission from {request.issuerName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Learner Info */}
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
              <User className="h-4 w-4 text-slate-500" />
              Learner Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-bold">Full Name</p>
                <p className="text-sm font-medium text-slate-900">{request.learnerName}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-bold">Learner ID</p>
                <p className="text-sm font-mono text-slate-600">{request.learnerId}</p>
              </div>
            </div>
          </div>

          {/* Badge Info */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Award className="h-4 w-4 text-slate-500" />
              Badge Details
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-bold">Badge Name</p>
                <p className="text-sm font-bold text-blue-700">{request.badgeName}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-bold">Badge Type</p>
                <Badge variant="outline" className="mt-1">
                  {request.badgeType}
                </Badge>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-bold">Issuance Pathway</p>
                <Badge className={request.pathway === 'Recognition of Prior Learning (RPL)' ? 'bg-purple-100 text-purple-700 border-purple-200' : 'bg-blue-100 text-blue-700 border-blue-200'}>
                  {request.pathway || 'Standard'}
                </Badge>
              </div>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase font-bold">Criteria / Qualification</p>
              <p className="text-sm text-slate-600 mt-1">{request.criteria || 'Standard qualification criteria applies.'}</p>
            </div>
            {request.evidenceUrl && (
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-bold">Evidence</p>
                <a 
                  href={request.evidenceUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:underline mt-1"
                >
                  View Submission Evidence
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}
          </div>

          {/* Source Info */}
          <div className="border-t border-slate-100 pt-4">
            <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-slate-500" />
              Submission Source
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-bold">Institution</p>
                <p className="text-sm text-slate-700">{request.issuerName}</p>
                <p className="text-[10px] text-slate-400">{request.issuerType.replace(/([A-Z])/g, ' $1').trim()}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-bold">Submitted By</p>
                <p className="text-sm text-slate-700">{request.submittedByName}</p>
                <p className="text-[10px] text-slate-400 flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {new Date(request.submittedAt?.seconds * 1000).toLocaleString()}
                </p>
              </div>
              {(request as any).sourceAssessmentCenterName && (request as any).sourceAssessmentCenterName !== request.issuerName && (
                <div className="col-span-2 pt-2">
                  <p className="text-[10px] text-slate-500 uppercase font-bold">Source Assessment Center</p>
                  <p className="text-sm text-slate-700 font-medium">{(request as any).sourceAssessmentCenterName}</p>
                </div>
              )}
            </div>
          </div>

          {/* Rejection Form */}
          {showRejectForm && (
            <div className="bg-rose-50 p-4 rounded-lg border border-rose-100 space-y-3 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-2 text-rose-700">
                <AlertCircle className="h-4 w-4" />
                <p className="text-sm font-bold">Rejection Reason Required</p>
              </div>
              <Textarea 
                placeholder="Explain why this request is being rejected..."
                value={rejectionComment}
                onChange={(e) => setRejectionComment(e.target.value)}
                className="bg-white border-rose-200 focus:ring-rose-500"
              />
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          {(request.status === 'Pending Approval' || request.status === 'Forwarded to District Office') && (
            <>
              {!showRejectForm ? (
                <>
                  <Button 
                    variant="outline" 
                    className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
                    onClick={() => setShowRejectForm(true)}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Return for Correction
                  </Button>
                  <Button 
                    className="bg-emerald-600 hover:bg-emerald-700 font-bold"
                    onClick={handleApprove}
                    disabled={isSubmitting}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Approve for Publication
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="ghost" onClick={() => setShowRejectForm(false)}>Cancel</Button>
                  <Button 
                    variant="destructive"
                    onClick={handleReject}
                    disabled={isSubmitting || !rejectionComment}
                  >
                    Confirm Return
                  </Button>
                </>
              )}
            </>
          )}
          {request.status !== 'Pending Approval' && request.status !== 'Forwarded to District Office' && (
            <Button variant="outline" onClick={onClose}>Close</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
