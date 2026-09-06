import type { BadgeRequest, Learner } from '@/src/types';

export interface ResolvedRequestLearner {
  id: string;
  displayName: string;
  email?: string;
  learnerUli?: string;
  source: 'internal' | 'external';
}

export interface RequestLearnerResolution {
  requestedLearnerCount: number;
  resolvedLearnerCount: number;
  learners: ResolvedRequestLearner[];
  error: string | null;
}

export interface ApprovalReadiness {
  ready: boolean;
  error: string | null;
}

const requiredText = (value: unknown): string | null => (
  typeof value === 'string' && value.trim() ? value.trim() : null
);

const failedResolution = (
  requestedLearnerCount: number,
  error: string,
): RequestLearnerResolution => ({
  requestedLearnerCount,
  resolvedLearnerCount: 0,
  learners: [],
  error,
});

const resolutionCountError = (requested: number, resolved: number) => (
  `Unable to approve: resolved ${resolved} of ${requested} requested learners. ` +
  'All requested learners must resolve before any credentials can be issued.'
);

export function resolveRequestLearners(
  request: BadgeRequest,
  internalLearnerDocs: Learner[],
): RequestLearnerResolution {
  const learnerIds = Array.isArray(request.learnerIds) ? request.learnerIds : [];
  const requestedLearnerCount = learnerIds.length;
  const requestedIds = learnerIds.map(requiredText);

  if (requestedLearnerCount === 0) {
    return failedResolution(0, resolutionCountError(0, 0));
  }
  if (requestedIds.some((id) => !id)) {
    return failedResolution(
      requestedLearnerCount,
      'Unable to approve: every requested learner must have a valid Firebase UID.',
    );
  }

  const externalEvidence = request.externalEligibility;
  if (!externalEvidence) {
    const learnerById = new Map(internalLearnerDocs.map((learner) => [learner.id, learner]));
    const learners = (requestedIds as string[]).flatMap((id) => {
      const learner = learnerById.get(id);
      if (!learner) return [];

      return [{
        id,
        displayName: `${learner.firstName || ''} ${learner.lastName || ''}`.trim() || id,
        ...(requiredText(learner.email) ? { email: learner.email.trim() } : {}),
        source: 'internal' as const,
      }];
    });

    return {
      requestedLearnerCount,
      resolvedLearnerCount: learners.length,
      learners,
      error: learners.length === requestedLearnerCount
        ? null
        : resolutionCountError(requestedLearnerCount, learners.length),
    };
  }

  if (request.requestType !== 'Individual' || requestedLearnerCount !== 1) {
    return failedResolution(
      requestedLearnerCount,
      'Unable to approve: an external request must be Individual and contain exactly one learner.',
    );
  }

  const firebaseLearnerId = requestedIds[0] as string;
  const topLevelLearnerId = request.learnerId === undefined
    ? null
    : requiredText(request.learnerId);
  if (request.learnerId !== undefined && topLevelLearnerId !== firebaseLearnerId) {
    return failedResolution(
      requestedLearnerCount,
      'Unable to approve: the external learner ID does not match the requested learner ID.',
    );
  }

  const learnerName = requiredText(request.learnerName);
  const evidenceLearnerName = requiredText(externalEvidence.learnerName);
  const learnerUli = requiredText(externalEvidence.learnerUli);
  if (!learnerName || !evidenceLearnerName || learnerName !== evidenceLearnerName) {
    return failedResolution(
      requestedLearnerCount,
      'Unable to approve: the external learner name is missing or inconsistent.',
    );
  }
  if (!learnerUli) {
    return failedResolution(
      requestedLearnerCount,
      'Unable to approve: the external learner ULI is missing.',
    );
  }

  const requestEmail = requiredText(request.learnerEmail);
  const evidenceEmail = requiredText(externalEvidence.learnerEmail);
  if (requestEmail && evidenceEmail && requestEmail !== evidenceEmail) {
    return failedResolution(
      requestedLearnerCount,
      'Unable to approve: the external learner email is inconsistent.',
    );
  }

  const externalTrainingCenterId = requiredText(externalEvidence.externalTrainingCenterId);
  const externalEnrollmentId = requiredText(externalEvidence.externalEnrollmentId);
  const badgeTemplateId = requiredText(request.badgeTemplateId);
  const mappedBadgeTemplateId = requiredText(externalEvidence.mappedBadgeTemplateId);
  const mappedBadgeTemplateName = requiredText(externalEvidence.mappedBadgeTemplateName);
  const mappedBadgeType = requiredText(externalEvidence.mappedBadgeType);
  const requestBadgeType = requiredText(request.badgeType);
  if (
    !externalTrainingCenterId ||
    !externalEnrollmentId ||
    !badgeTemplateId ||
    !mappedBadgeTemplateId ||
    badgeTemplateId !== mappedBadgeTemplateId ||
    !mappedBadgeTemplateName ||
    !mappedBadgeType ||
    requestBadgeType !== mappedBadgeType
  ) {
    return failedResolution(
      requestedLearnerCount,
      'Unable to approve: the external request and mapped badge template are inconsistent.',
    );
  }

  const firebaseBadgeTemplateId = requiredText(externalEvidence.firebaseBadgeTemplateId);
  if (firebaseBadgeTemplateId && firebaseBadgeTemplateId !== badgeTemplateId) {
    return failedResolution(
      requestedLearnerCount,
      'Unable to approve: the Firebase and mapped badge template IDs are inconsistent.',
    );
  }
  if (
    (requiredText(request.badgeTemplateName) && request.badgeTemplateName!.trim() !== mappedBadgeTemplateName) ||
    (requiredText(request.templateDetails?.badgeName) && request.templateDetails!.badgeName.trim() !== mappedBadgeTemplateName) ||
    (requiredText(request.templateDetails?.badgeType) && request.templateDetails!.badgeType.trim() !== mappedBadgeType)
  ) {
    return failedResolution(
      requestedLearnerCount,
      'Unable to approve: the stored badge template snapshot is inconsistent.',
    );
  }

  const eligibilityKey = `${externalTrainingCenterId}:${externalEnrollmentId}:${badgeTemplateId}`;
  if (
    requiredText(request.externalEligibilityKey) !== eligibilityKey ||
    requiredText(request.id) !== `external-${eligibilityKey}`
  ) {
    return failedResolution(
      requestedLearnerCount,
      'Unable to approve: the external eligibility identity is inconsistent.',
    );
  }
  if (
    requiredText(request.programOfferingId) &&
    request.programOfferingId!.trim() !== `external:${externalEnrollmentId}`
  ) {
    return failedResolution(
      requestedLearnerCount,
      'Unable to approve: the external enrollment identity is inconsistent.',
    );
  }

  if (mappedBadgeType === 'Proficient') {
    const externalBadgeDefinitionId = requiredText(externalEvidence.externalBadgeDefinitionId);
    const competencyId = requiredText(externalEvidence.competencyId);
    const competencyCode = requiredText(externalEvidence.competencyCode);
    const competencyTitle = requiredText(externalEvidence.competencyTitle);
    const completedCodes = Array.isArray(externalEvidence.completedCompetencyCodes)
      ? externalEvidence.completedCompetencyCodes
      : [];
    const missingCodes = Array.isArray(externalEvidence.missingCompetencyCodes)
      ? externalEvidence.missingCompetencyCodes
      : null;
    if (
      !externalBadgeDefinitionId ||
      !competencyId ||
      !competencyCode ||
      !competencyTitle ||
      !completedCodes.includes(competencyCode) ||
      typeof externalEvidence.requiredCompetencyCount !== 'number' ||
      externalEvidence.requiredCompetencyCount <= 0 ||
      typeof externalEvidence.completedCompetencyCount !== 'number' ||
      externalEvidence.completedCompetencyCount !== externalEvidence.requiredCompetencyCount ||
      !missingCodes ||
      missingCodes.length > 0
    ) {
      return failedResolution(
        requestedLearnerCount,
        'Unable to approve: the external competency identity or completion snapshot is inconsistent.',
      );
    }
  }

  const learner: ResolvedRequestLearner = {
    id: firebaseLearnerId,
    displayName: learnerName,
    learnerUli,
    ...(evidenceEmail || requestEmail ? { email: evidenceEmail || requestEmail || undefined } : {}),
    source: 'external',
  };

  return {
    requestedLearnerCount,
    resolvedLearnerCount: 1,
    learners: [learner],
    error: null,
  };
}

export function getApprovalReadiness(
  requestedLearnerCount: number,
  resolvedLearnerCount: number,
  plannedCredentialCount: number,
): ApprovalReadiness {
  if (requestedLearnerCount <= 0 || resolvedLearnerCount !== requestedLearnerCount) {
    return {
      ready: false,
      error: resolutionCountError(requestedLearnerCount, resolvedLearnerCount),
    };
  }
  if (plannedCredentialCount <= 0) {
    return {
      ready: false,
      error: 'Unable to approve: planned credential count is 0. At least one credential must be issued.',
    };
  }

  return { ready: true, error: null };
}
