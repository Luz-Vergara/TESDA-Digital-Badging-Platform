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
import { BadgeRequest, ProgramOffering, Learner, BadgeTemplate, NewIssuedBadge, PublicCredential } from '@/src/types';
import { doc, updateDoc, serverTimestamp, addDoc, collection, getDoc, getDocs, query, where, writeBatch } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/src/lib/firebase';
import { useFirebase } from '@/src/lib/FirebaseProvider';
import { generateOfficialBadgeId } from '@/src/lib/badge-utils';

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
  const [template, setTemplate] = useState<BadgeTemplate | null>(null);
  const [learners, setLearners] = useState<Learner[]>([]);

  useEffect(() => {
    if (!request || !isOpen) return;

    const fetchData = async () => {
      try {
        let resolvedOffering: ProgramOffering | null = null;
        setOffering(null);
        setTemplate(null);

        if (!request.externalEligibility && request.programOfferingId) {
          const offDoc = await getDoc(doc(db, 'programOfferings', request.programOfferingId));
          if (offDoc.exists()) {
            const offData = offDoc.data() as ProgramOffering;
            setOffering(offData);
            resolvedOffering = offData;
          }
        }

        const templateId = request.externalEligibility?.mappedBadgeTemplateId ||
          request.badgeTemplateId ||
          resolvedOffering?.badgeTemplateId;
        if (templateId) {
          const tempDoc = await getDoc(doc(db, 'badgeTemplates', templateId));
          if (tempDoc.exists()) {
            setTemplate({ id: tempDoc.id, ...tempDoc.data() } as BadgeTemplate);
          }
        }

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
    const randomBytes = new Uint8Array(16);
    window.crypto.getRandomValues(randomBytes);
    const randomId = Array.from(randomBytes, (byte) => byte.toString(16).padStart(2, '0')).join('').toUpperCase();
    return `V${new Date().getFullYear().toString().slice(-2)}-${randomId}`;
  };

  const handleApprove = async () => {
    if (!user) return;
    setIsSubmitting(true);
    const batch = writeBatch(db);

    try {
      const issuedBadgeSummary = [];
      const year = new Date().getFullYear();
      const districtId = request.districtOfficeId || userProfile?.organizationId || userProfile?.assignedDistrictId || 'demo-district-office';
      const externalEvidence = request.externalEligibility;
      const isExternalRequest = Boolean(externalEvidence);
      const badgeDesignId = template?.badgeDesignId || '';
      const recognitionScope = template?.recognitionScope || (request as any).recognitionScope || '';
      const configuredCompetencyTitle = template?.competencyTitle || template?.relatedCompetency || '';
      const configuredCompetencyCode = template?.competencyCode || '';
      let badgeArtworkUrl = template?.imageUrl || '';

      if (badgeDesignId) {
        const designSnapshot = await getDoc(doc(db, 'badgeDesigns', badgeDesignId));
        if (designSnapshot.exists()) {
          badgeArtworkUrl = String(designSnapshot.data().artworkUrl || badgeArtworkUrl);
        }
      }

      // Determine template prefix per specifications (Rule B)
      let prefix = template?.badgeIdPrefix || '';
      if (!prefix) {
        const qCode = externalEvidence?.qualificationCode || request.qualificationCode || template?.qualificationCode || request.templateDetails?.qualificationCode || (offering && offering.qualificationCode) || "QUAL";
        const bType = template?.badgeType || request.badgeType || "PROF";
        prefix = `${qCode}-${bType}`.toUpperCase();
      }
      // Clean prefix to remove non-alphanumeric symbols except dash (Rule 13)
      prefix = prefix.toUpperCase().replace(/[^A-Z0-9-]/g, '');

      // 1. Create IssuedBadge for each learner sequentially via Firestore transaction counter inside generateOfficialBadgeId
      for (const learner of learners) {
        const verificationId = generateVerificationId();
        const badgeId = await generateOfficialBadgeId(
          year,
          districtId,
          externalEvidence?.mappedBadgeTemplateId || template?.id || request.badgeTemplateId,
          prefix,
        );
        const verificationUrl = `${window.location.origin}/#/verify/${verificationId}`;
        const qrPayload = verificationUrl;

        const issuedBadgeRef = doc(collection(db, 'issuedBadges'));

        let expiryDate = null;
        // Check validityMonths from template, default to 36 months if not specified
        const validityMonths = template?.validityMonths || (request.templateDetails as any)?.validityMonths || 36;
        const expMs = Date.now() + (Number(validityMonths) * 30 * 24 * 60 * 60 * 1000);
        expiryDate = new Date(expMs);

        const badgeData: any = {
          badgeId,
          verificationId,
          badgeTemplateId: externalEvidence?.mappedBadgeTemplateId || request.badgeTemplateId || template?.id || '',
          badgeDesignId,
          badgeArtworkUrl,
          badgeTemplateName: externalEvidence?.mappedBadgeTemplateName || request.badgeTemplateName || request.templateDetails?.badgeName || template?.badgeName || (offering && offering.badgeTemplateName) || (offering && offering.programTitle) || '',
          badgeRequestId: request.id,
          requestNumber: request.requestNumber || '',
          programOfferingId: request.programOfferingId || '',
          programBatchId: request.programBatchId || '',
          programTitle: externalEvidence?.programTitle || request.programTitle || (offering && offering.programTitle) || template?.badgeName || '',
          badgeType: externalEvidence?.mappedBadgeType || request.badgeType || template?.badgeType || 'Proficient',
          learnerId: learner.id,
          learnerName: externalEvidence?.learnerName || `${learner.firstName} ${learner.lastName}`,
          learnerEmail: externalEvidence?.learnerEmail || learner.email,
          trainingCenterId: request.trainingCenterId || (offering && offering.trainingCenterId) || '',
          trainingCenterName: request.trainingCenterName || (offering && offering.trainingCenterName) || '',
          districtOfficeId: districtId,
          districtOfficeName: userProfile?.office || 'District Office',
          issueDate: serverTimestamp() as any,
          dateIssued: serverTimestamp() as any,
          validUntil: expiryDate,
          expiryDate: expiryDate,
          status: 'Active',
          publishedToLearner: true,
          evidenceUrl: request.evidenceUrl || '',
          qualificationName: externalEvidence?.programTitle || request.qualificationName || request.templateDetails?.qualificationName || template?.qualificationName || (offering && offering.qualificationName) || '',
          qualificationCode: externalEvidence?.qualificationCode || request.qualificationCode || request.templateDetails?.qualificationCode || template?.qualificationCode || (offering && offering.qualificationCode) || '',
          standardId: template?.standardId || (request as any).standardId || '',
          standardType: template?.standardType || (request as any).standardType || '',
          recognitionScope,
          ...(recognitionScope === 'Competency' && configuredCompetencyTitle ? { competencyTitle: configuredCompetencyTitle } : {}),
          ...(recognitionScope === 'Competency' && configuredCompetencyCode ? { competencyCode: configuredCompetencyCode } : {}),
          credentialLevel: request.templateDetails?.credentialLevel || template?.credentialLevel || 'Unit of Competency',
          criteria: request.templateDetails?.criteria || template?.criteria || '',
          alignment: request.templateDetails?.alignment || template?.alignment || '',
          description: request.templateDetails?.description || template?.description || '',
          ucTitle: (request as any).badgeTemplateName || request.templateDetails?.badgeName || template?.badgeName || (offering && offering.programTitle) || '',
          verificationUrl,
          qrPayload,
          isDemo: (request as any).isDemo || false,
          metadata: {
            ...(request.programBatchId ? { batchId: request.programBatchId } : {}),
            programTitle: externalEvidence?.programTitle || request.programTitle || (offering && offering.programTitle) || '',
            qualificationCode: externalEvidence?.qualificationCode || request.qualificationCode || (offering && offering.qualificationCode) || '',
            requestType: request.requestType,
            externalEligibility: externalEvidence || null,
          },
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };

        batch.set(issuedBadgeRef, badgeData);

        const standardCode = badgeData.qualificationCode || '';
        const standardTitle = badgeData.qualificationName || badgeData.programTitle || badgeData.badgeTemplateName;
        const competencyCode = badgeData.competencyCode || '';
        const competencyTitle = badgeData.competencyTitle || '';
        const publicCredential: PublicCredential = {
          verificationId,
          badgeId,
          badgeName: badgeData.badgeTemplateName || badgeData.programTitle,
          badgeType: badgeData.badgeType,
          ...(badgeDesignId ? { badgeDesignId } : {}),
          ...(badgeArtworkUrl ? { badgeArtworkUrl } : {}),
          standardType: badgeData.standardType || template?.standardType || 'TR',
          standardCode,
          standardTitle,
          ...(badgeData.recognitionScope === 'Competency' && competencyCode ? { competencyCode } : {}),
          ...(badgeData.recognitionScope === 'Competency' && competencyTitle ? { competencyTitle } : {}),
          holderDisplayName: badgeData.learnerName,
          trainingProviderDisplayName: badgeData.trainingCenterName || 'Training Center',
          issueDate: serverTimestamp(),
          expiryDate,
          credentialStatus: 'Active',
        };
        batch.set(doc(db, 'publicCredentials', verificationId), publicCredential);

        // Update learner badge status
        const learnerRef = doc(db, 'learners', learner.id);
        batch.update(learnerRef, {
          badgeStatus: 'Active',
          updatedAt: serverTimestamp()
        });

        // Add to the summary array (Rule F and Goal 9)
        issuedBadgeSummary.push({
          learnerId: learner.id,
          learnerName: externalEvidence?.learnerName || `${learner.firstName} ${learner.lastName}`,
          learnerEmail: externalEvidence?.learnerEmail || learner.email || '',
          badgeId,
          verificationId,
          issuedBadgeId: issuedBadgeRef.id
        });
      }

      // 2. Fetch and update matching enrollments for these approved learners (Rule G)
      if (!isExternalRequest) {
        const enrollmentsRef = collection(db, 'enrollments');
        const qEnr = query(
          enrollmentsRef,
          where('programOfferingId', '==', request.programOfferingId),
          where('learnerId', 'in', request.learnerIds)
        );
        const enrSnap = await getDocs(qEnr);
        enrSnap.docs.forEach(enrDoc => {
          batch.update(enrDoc.ref, {
            badgeRequestStatus: 'Approved',
            enrollmentStatus: 'Completed',
            dateCompleted: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        });
      }

      // 3. Update Badge Request status (Rule F and Goal 9)
      const requestRef = doc(db, 'badgeRequests', request.id);
      batch.update(requestRef, {
        status: 'Approved',
        badgeIdStatus: 'Issued',
        approvedBy: user.uid,
        approvedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        issuedBadgeSummary,
        verificationId: issuedBadgeSummary[0]?.verificationId || '',
        badgeId: issuedBadgeSummary[0]?.badgeId || ''
      });

      // 4. Audit Log
      const auditRef = doc(collection(db, 'auditLogs'));
      batch.set(auditRef, {
        action: `Approved Badge Request: ${request.id}`,
        userName: userProfile?.name || 'District Staff',
        timestamp: serverTimestamp(),
        details: `Issued ${learners.length} badges for ${externalEvidence?.programTitle || request.programTitle || (offering && offering.programTitle) || request.templateDetails?.badgeName || 'program'}`
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
    const batch = writeBatch(db);
    try {
      const isExternalRequest = Boolean(request.externalEligibility);
      // 1. Update Badge Request status and badgeIdStatus (Rule 15 rejection)
      const requestRef = doc(db, 'badgeRequests', request.id);
      batch.update(requestRef, {
        status: 'Rejected',
        rejectionReason,
        rejectedBy: user.uid,
        rejectedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // 2. Fetch and update matching enrollments for these rejected learners
      if (!isExternalRequest) {
        const enrollmentsRef = collection(db, 'enrollments');
        const qEnr = query(
          enrollmentsRef,
          where('programOfferingId', '==', request.programOfferingId),
          where('learnerId', 'in', request.learnerIds)
        );
        const enrSnap = await getDocs(qEnr);
        enrSnap.docs.forEach(enrDoc => {
          batch.update(enrDoc.ref, {
            badgeRequestStatus: 'Rejected',
            updatedAt: serverTimestamp()
          });
        });
      }

      // 3. Audit Log
      const auditRef = doc(collection(db, 'auditLogs'));
      batch.set(auditRef, {
        action: `Rejected Badge Request: ${request.id}`,
        userName: userProfile?.name || 'District Staff',
        timestamp: serverTimestamp(),
        details: `Reason: ${rejectionReason}`
      });

      await batch.commit();
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
            Approval request for {request.requestType} issuance from {request.externalEligibility?.trainingCenterName || request.trainingCenterName || offering?.trainingCenterName || 'the submitting center'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="grid grid-cols-2 gap-4">
            <Card className="bg-slate-50 border-slate-100 shadow-none">
              <CardContent className="p-4">
                <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Program / Qualification</p>
                <p className="text-sm font-bold text-slate-900">{request.externalEligibility?.programTitle || request.programTitle || request.qualificationName || offering?.programTitle || '—'}</p>
                <p className="text-xs text-slate-500">{request.externalEligibility?.qualificationCode || request.qualificationCode || offering?.qualificationCode || ''}</p>
              </CardContent>
            </Card>
            <Card className="bg-slate-50 border-slate-100 shadow-none">
              <CardContent className="p-4">
                <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Badge Level</p>
                <Badge className={
                  request.badgeType === 'Skilled' ? 'bg-blue-100 text-blue-700' :
                  'bg-emerald-100 text-emerald-700'
                }>{request.badgeType}</Badge>
              </CardContent>
            </Card>
          </div>

          {request.externalEligibility && (
            <Card className="border-indigo-100 bg-indigo-50/40 shadow-none">
              <CardContent className="space-y-3 p-4 text-sm">
                <p className="text-[10px] font-bold uppercase tracking-wide text-indigo-700">External eligibility evidence snapshot</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <p><span className="text-slate-500">Learner:</span> {request.externalEligibility.learnerName}</p>
                  <p><span className="text-slate-500">Learner ULI:</span> {request.externalEligibility.learnerUli}</p>
                  <p><span className="text-slate-500">CTPR:</span> {request.externalEligibility.ctprNumber}</p>
                  <p><span className="text-slate-500">Enrollment/source:</span> {request.externalEligibility.externalEnrollmentId} / {request.externalEligibility.sourceRecordId}</p>
                  <p><span className="text-slate-500">Competencies:</span> {request.externalEligibility.completedCompetencyCount}/{request.externalEligibility.requiredCompetencyCount} complete</p>
                  <p><span className="text-slate-500">Evaluated:</span> {request.externalEligibility.evaluatedAt}</p>
                  <p><span className="text-slate-500">Retrieved:</span> {request.externalEligibility.retrievedAt}</p>
                </div>
                {request.externalEligibility.missingCompetencyCodes.length > 0 && (
                  <p><span className="text-slate-500">Missing competencies:</span> {request.externalEligibility.missingCompetencyCodes.join(', ')}</p>
                )}
                <div className="border-t border-indigo-100 pt-3">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-indigo-700">Mapped QSO template</p>
                  <p className="font-semibold text-slate-900">{request.externalEligibility.mappedBadgeTemplateName}</p>
                  <p className="text-xs text-slate-600">{request.externalEligibility.mappedBadgeType} · {request.externalEligibility.mappedBadgeTemplateId}</p>
                </div>
              </CardContent>
            </Card>
          )}

          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
              <Users className="h-4 w-4 text-slate-400" />
              Learners ({learners.length})
            </h3>
            <div className="border border-slate-100 rounded-lg divide-y divide-slate-50">
              {learners.map(learner => (
                <div key={learner.id} className="p-3 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">
                      {request.externalEligibility?.learnerName || `${learner.firstName} ${learner.lastName}`}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {request.externalEligibility?.learnerEmail || learner.email}
                    </span>
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
