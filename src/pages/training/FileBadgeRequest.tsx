import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Send } from 'lucide-react';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '@/src/lib/firebase';
import { useFirebase } from '@/src/lib/FirebaseProvider';
import {
  findExistingExternalBadgeRequestForTrainingCenter,
  getExistingExternalBadgeRequestMessage,
  getExternalBadgeRequestIdentity,
  isFirestorePermissionDenied,
  selectExternalBadgeEligibility,
  validateExternalBadgeTemplateMapping,
  type ExistingExternalBadgeRequest,
} from '@/src/lib/external-badge-request';
import { externalApi, ExternalApiError } from '@/src/services/externalApi';
import type { ExternalBadgeEligibility, ExternalLearnerSummary } from '@/src/types/external-api';
import type { BadgeRequest, BadgeTemplate } from '@/src/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface ExternalRequestTarget {
  learner: ExternalLearnerSummary;
  eligibility: ExternalBadgeEligibility;
  retrievedAt: string;
}

export default function FileBadgeRequest() {
  const { user, userProfile } = useFirebase();
  const [params] = useSearchParams();
  const [target, setTarget] = useState<ExternalRequestTarget | null>(null);
  const [mappedTemplate, setMappedTemplate] = useState<BadgeTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [mappingError, setMappingError] = useState<string | null>(null);
  const [existingRequest, setExistingRequest] = useState<ExistingExternalBadgeRequest | null>(null);
  const learnerUli = params.get('uli') || '';
  const enrollmentId = params.get('enrollment') || '';
  const eligibilityId = params.get('eligibility') || undefined;

  useEffect(() => {
    void (async () => {
      setLoading(true);
      setError(null);
      setMappingError(null);
      setMappedTemplate(null);
      setExistingRequest(null);

      try {
        const response = await externalApi.getMyTrainingCenterLearners();
        const learner = response.data.find((item) => item.learnerUli === learnerUli);
        if (!learner) {
          setTarget(null);
          return;
        }
        const selection = selectExternalBadgeEligibility(learner, enrollmentId, eligibilityId);
        if (!selection.eligibility) {
          setTarget(null);
          setError(selection.error);
          return;
        }
        const eligibility = selection.eligibility;

        setTarget({ learner, eligibility, retrievedAt: response.meta.retrievedAt });

        if (!eligibility.firebaseBadgeTemplateId) {
          setMappingError('QSO badge mapping not configured.');
          return;
        }

        const templateDocument = await getDoc(
          doc(db, 'badgeTemplates', eligibility.firebaseBadgeTemplateId),
        );
        const template = templateDocument.exists()
          ? ({ id: templateDocument.id, ...templateDocument.data() } as BadgeTemplate)
          : null;

        const mappingValidationError = validateExternalBadgeTemplateMapping(eligibility, template);
        if (mappingValidationError) {
          setMappingError(mappingValidationError);
          return;
        }

        setMappedTemplate(template);
        const { externalRequestId } = getExternalBadgeRequestIdentity({
          externalTrainingCenterId: eligibility.trainingCenterId,
          externalEnrollmentId: eligibility.enrollmentId,
          badgeTemplateId: template.id,
        });

        try {
          const existing = await findExistingExternalBadgeRequestForTrainingCenter(
            externalRequestId,
            userProfile?.organizationId || '',
            db,
          );
          setExistingRequest(existing);
        } catch (caughtError) {
          setError(isFirestorePermissionDenied(caughtError)
            ? 'You do not have permission to check whether an existing badge request has already been filed.'
            : caughtError instanceof Error
              ? caughtError.message
              : 'Unable to check whether an existing badge request has already been filed.');
        }
      } catch (caughtError) {
        setError(
          caughtError instanceof ExternalApiError
            ? caughtError.message
            : 'Unable to load external eligibility.',
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [eligibilityId, enrollmentId, learnerUli, userProfile?.organizationId]);

  const submit = async () => {
    if (!target || !mappedTemplate || !user || !userProfile) return;

    const mappedTemplateId = target.eligibility.firebaseBadgeTemplateId;
    const mappingValidationError = validateExternalBadgeTemplateMapping(target.eligibility, mappedTemplate);
    if (!mappedTemplateId || mappingValidationError) {
      setMappingError(mappingValidationError || 'QSO badge mapping not configured.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const { mappingKey, externalRequestId } = getExternalBadgeRequestIdentity({
        externalTrainingCenterId: target.eligibility.trainingCenterId,
        externalEnrollmentId: target.eligibility.enrollmentId,
        badgeTemplateId: mappedTemplate.id,
      });
      const requestRef = doc(db, 'badgeRequests', externalRequestId);

      let existing: ExistingExternalBadgeRequest | null;
      try {
        existing = await findExistingExternalBadgeRequestForTrainingCenter(
          externalRequestId,
          userProfile.organizationId || '',
          db,
        );
      } catch (caughtError) {
        setError(isFirestorePermissionDenied(caughtError)
          ? 'You do not have permission to check whether an existing badge request has already been filed.'
          : caughtError instanceof Error
            ? caughtError.message
            : 'Unable to check whether an existing badge request has already been filed.');
        return;
      }

      if (existing) {
        setExistingRequest(existing);
        setNotice(getExistingExternalBadgeRequestMessage(existing));
        return;
      }

      const learnerLink = await getDoc(
        doc(db, 'integrationLearnerLinks', target.learner.learnerUli),
      );
      const firebaseLearnerId = learnerLink.data()?.firebaseLearnerId;
      if (typeof firebaseLearnerId !== 'string') {
        throw new Error('No approved Firebase learner link exists.');
      }

      const externalEnrollment = target.learner.enrollments.find(
        (item) => item.id === target.eligibility.enrollmentId,
      );
      const programTitle = externalEnrollment?.registeredProgram.qualification.title;
      const qualificationCode = externalEnrollment?.registeredProgram.qualification.code;
      const externalEligibility: NonNullable<BadgeRequest['externalEligibility']> = {
        externalBadgeDefinitionId: target.eligibility.externalBadgeDefinitionId,
        externalTrainingCenterId: target.eligibility.trainingCenterId,
        trainingCenterName: userProfile.office || userProfile.name,
        learnerName: target.learner.displayName,
        ...(target.learner.email ? { learnerEmail: target.learner.email } : {}),
        learnerUli: target.eligibility.learnerUli,
        externalEnrollmentId: target.eligibility.enrollmentId,
        sourceRecordId: target.eligibility.sourceRecordId,
        ctprNumber: target.eligibility.ctprNumber,
        standardType: target.eligibility.standardType!,
        competencyId: target.eligibility.competency!.id,
        competencyCode: target.eligibility.competency!.code,
        competencyTitle: target.eligibility.competency!.title,
        ...(programTitle ? { programTitle } : {}),
        ...(qualificationCode ? { qualificationCode } : {}),
        requiredCompetencyCount: target.eligibility.requiredCompetencyCount,
        completedCompetencyCount: target.eligibility.completedCompetencyCount,
        completedCompetencyCodes: target.eligibility.completedCompetencyCodes,
        missingCompetencyCodes: target.eligibility.missingCompetencyCodes,
        firebaseBadgeTemplateId: mappedTemplate.id,
        evaluatedAt: target.eligibility.evaluatedAt,
        retrievedAt: target.retrievedAt,
        mappedBadgeTemplateId: mappedTemplate.id,
        mappedBadgeTemplateName: mappedTemplate.badgeName,
        mappedBadgeType: mappedTemplate.badgeType,
      };

      await setDoc(requestRef, {
        requestType: 'Individual',
        requestNumber: `EXT-${Date.now()}`,
        badgeIdStatus: 'Pending District Approval',
        trainingCenterId: userProfile.organizationId || user.uid,
        trainingCenterName: userProfile.office || userProfile.name,
        programOfferingId: `external:${target.eligibility.enrollmentId}`,
        learnerIds: [firebaseLearnerId],
        learnerId: firebaseLearnerId,
        learnerName: target.learner.displayName,
        ...(target.learner.email ? { learnerEmail: target.learner.email } : {}),
        badgeTemplateId: mappedTemplate.id,
        badgeTemplateName: mappedTemplate.badgeName,
        badgeType: mappedTemplate.badgeType,
        ...(programTitle ? { programTitle, qualificationName: programTitle } : {}),
        ...(qualificationCode ? { qualificationCode } : {}),
        districtOfficeId: userProfile.assignedDistrictId,
        status: 'Pending Review',
        submittedBy: user.uid,
        externalEligibilityKey: mappingKey,
        externalEligibility,
        templateDetails: {
          badgeName: mappedTemplate.badgeName,
          description: mappedTemplate.description,
          criteria: mappedTemplate.criteria,
          alignment: mappedTemplate.alignment,
          qualificationName: mappedTemplate.qualificationName,
          qualificationCode: mappedTemplate.qualificationCode,
          badgeType: mappedTemplate.badgeType,
          credentialLevel: mappedTemplate.credentialLevel,
        },
        submittedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setNotice('Badge request filed with an immutable external-evidence snapshot.');
    } catch (caughtError) {
      setError(isFirestorePermissionDenied(caughtError)
        ? 'This Training Center is not authorized to file this badge request.'
        : caughtError instanceof Error ? caughtError.message : 'Unable to file request.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">File Badge Request</h1>
        <p className="text-sm text-slate-500">
          Create a District Office request from approved external eligibility evidence.
        </p>
      </div>

      {error && (
        <Card className="border-rose-200">
          <CardContent className="p-4 text-sm text-rose-700">{error}</CardContent>
        </Card>
      )}
      {notice && (
        <Card className="border-emerald-200">
          <CardContent className="p-4 text-sm text-emerald-800">{notice}</CardContent>
        </Card>
      )}

      {!target ? (
        <Card>
          <CardContent className="p-8 text-center text-slate-500">
            Select an eligible learner from{' '}
            <Link className="font-semibold text-blue-600" to="/trainingcenter/eligibility">
              Badge Eligibility
            </Link>
            .
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{target.learner.displayName}</CardTitle>
            <CardDescription>
              ULI {target.learner.learnerUli} · CTPR {target.eligibility.ctprNumber} ·{' '}
              {target.eligibility.completedCompetencyCount}/{target.eligibility.requiredCompetencyCount}{' '}
              competencies complete
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
              Eligible external enrollment
            </Badge>

            {mappingError ? (
              <Card className="border-amber-200 bg-amber-50">
                <CardContent className="p-4 text-sm font-medium text-amber-800">
                  {mappingError}
                </CardContent>
              </Card>
            ) : (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  Authoritative QSO badge mapping
                </p>
                <p className="mt-1 text-sm font-bold text-slate-900">{mappedTemplate?.badgeName}</p>
                <p className="mt-1 text-xs text-slate-600">
                  {mappedTemplate?.badgeType} · {mappedTemplate?.id}
                </p>
              </div>
            )}

            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <div><span className="text-slate-500">Enrollment/source ID:</span> {target.eligibility.enrollmentId} / {target.eligibility.sourceRecordId}</div>
              <div><span className="text-slate-500">Required competencies:</span> {target.eligibility.requiredCompetencyCount}</div>
              <div><span className="text-slate-500">Completed competencies:</span> {target.eligibility.completedCompetencyCount}</div>
              <div><span className="text-slate-500">Evaluation date:</span> {target.eligibility.evaluatedAt}</div>
              {target.eligibility.missingCompetencyCodes.length > 0 && (
                <div className="sm:col-span-2">
                  <span className="text-slate-500">Missing competencies:</span>{' '}
                  {target.eligibility.missingCompetencyCodes.join(', ')}
                </div>
              )}
            </div>

            {existingRequest ? (
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-sm font-medium text-emerald-800">
                  {getExistingExternalBadgeRequestMessage(existingRequest)}
                </p>
                <Link className="font-semibold text-blue-600" to="/trainingcenter/requests">
                  View Badge Requests
                </Link>
              </div>
            ) : (
              <Button
                onClick={() => void submit()}
                disabled={saving || !userProfile.assignedDistrictId || Boolean(mappingError)}
              >
                <Send className="mr-2 h-4 w-4" />
                {saving ? 'Filing request…' : 'File Badge Request'}
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
