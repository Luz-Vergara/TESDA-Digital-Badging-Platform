import {
  collection,
  getDocs,
  limit,
  query,
  where,
  type Firestore,
} from 'firebase/firestore';
import type { ExternalBadgeEligibility, ExternalLearnerSummary } from '@/src/types/external-api';

export interface ExternalBadgeRequestIdentityInput {
  externalTrainingCenterId: string;
  externalEnrollmentId: string;
  badgeTemplateId: string;
}

export interface ExternalMappedBadgeTemplate {
  id: string;
  status?: unknown;
  badgeType?: unknown;
  standardType?: unknown;
  recognitionScope?: unknown;
  competencyCode?: unknown;
  competencyTitle?: unknown;
}

export interface ExternalEligibilitySelection {
  eligibility: ExternalBadgeEligibility | null;
  error: string | null;
}

export interface ExistingExternalBadgeRequest {
  id?: string;
  trainingCenterId?: unknown;
  status?: unknown;
  badgeIdStatus?: unknown;
}

export type ExternalBadgeRequestQueryRunner = (
  firestore: Firestore,
  requestId: string,
  trainingCenterId: string,
) => Promise<ExistingExternalBadgeRequest[]>;

async function queryOwnedExternalBadgeRequest(
  firestore: Firestore,
  requestId: string,
  trainingCenterId: string,
): Promise<ExistingExternalBadgeRequest[]> {
  const externalEligibilityKey = requestId.slice('external-'.length);
  const snapshot = await getDocs(query(
    collection(firestore, 'badgeRequests'),
    where('trainingCenterId', '==', trainingCenterId),
    where('externalEligibilityKey', '==', externalEligibilityKey),
    limit(1),
  ));

  return snapshot.docs.map((item) => ({
    ...item.data(),
    id: item.id,
  } as ExistingExternalBadgeRequest));
}

export async function findExistingExternalBadgeRequestForTrainingCenter(
  requestId: string,
  trainingCenterId: string,
  firestore: Firestore,
  runQuery: ExternalBadgeRequestQueryRunner = queryOwnedExternalBadgeRequest,
): Promise<ExistingExternalBadgeRequest | null> {
  const ownedTrainingCenterId = trainingCenterId.trim();
  if (!ownedTrainingCenterId) {
    throw new Error('Authenticated Training Center organization ID is required to check existing requests.');
  }

  const exactRequestId = requestId.trim();
  if (!exactRequestId) {
    throw new Error('External badge request ID is required to check existing requests.');
  }
  if (!exactRequestId.startsWith('external-')) {
    throw new Error('External badge request ID must use the deterministic external request format.');
  }

  const matches = await runQuery(firestore, exactRequestId, ownedTrainingCenterId);
  return matches.find((request) =>
    request.id === exactRequestId && request.trainingCenterId === ownedTrainingCenterId,
  ) || null;
}

export function getExternalBadgeRequestIdentity({
  externalTrainingCenterId,
  externalEnrollmentId,
  badgeTemplateId,
}: ExternalBadgeRequestIdentityInput) {
  const mappingKey = [externalTrainingCenterId, externalEnrollmentId, badgeTemplateId].join(':');
  return { mappingKey, externalRequestId: `external-${mappingKey}` };
}

export function getExternalBadgeRequestRoute(
  learnerUli: string,
  eligibility: ExternalBadgeEligibility,
) {
  const query = new URLSearchParams({
    uli: learnerUli,
    enrollment: eligibility.enrollmentId,
    eligibility: eligibility.id,
  });
  return `/trainingcenter/file-request?${query.toString()}`;
}

export function selectExternalBadgeEligibility(
  learner: ExternalLearnerSummary,
  enrollmentId: string,
  eligibilityId?: string,
): ExternalEligibilitySelection {
  const eligibleForEnrollment = learner.badgeEligibility.filter(
    (item) => item.enrollmentId === enrollmentId && item.eligible,
  );

  if (eligibilityId) {
    const exact = eligibleForEnrollment.find((item) => item.id === eligibilityId) || null;
    return exact
      ? { eligibility: exact, error: null }
      : { eligibility: null, error: 'The selected badge eligibility is unavailable or no longer eligible.' };
  }

  if (eligibleForEnrollment.length === 1) {
    return { eligibility: eligibleForEnrollment[0], error: null };
  }

  if (eligibleForEnrollment.length > 1) {
    return {
      eligibility: null,
      error: 'Multiple badges are eligible for this enrollment. Select the exact badge from Badge Eligibility.',
    };
  }

  return { eligibility: null, error: 'No eligible badge was found for this enrollment.' };
}

export function validateExternalBadgeTemplateMapping(
  eligibility: ExternalBadgeEligibility,
  template: ExternalMappedBadgeTemplate | null,
): string | null {
  if (!eligibility.firebaseBadgeTemplateId) {
    return 'QSO badge mapping not configured.';
  }

  if (!template || template.id !== eligibility.firebaseBadgeTemplateId || template.status !== 'Active') {
    return 'The mapped QSO badge definition is missing or inactive.';
  }

  if (template.badgeType !== eligibility.badgeType) {
    return 'The mapped QSO badge type does not match the external eligibility.';
  }

  if (!eligibility.standardType || template.standardType !== eligibility.standardType) {
    return 'The mapped QSO standard type does not match the external eligibility.';
  }

  if (!eligibility.competency || template.recognitionScope !== 'Competency') {
    return 'The external eligibility must map to a competency-scoped QSO badge definition.';
  }

  if (
    template.competencyCode !== eligibility.competency.code ||
    template.competencyTitle !== eligibility.competency.title
  ) {
    return 'The mapped QSO competency does not match the external eligibility.';
  }

  return null;
}

export function getExistingExternalBadgeRequestMessage(request: ExistingExternalBadgeRequest) {
  if (request.status === 'Approved' || request.badgeIdStatus === 'Issued') {
    return 'This badge request has already been approved and issued.';
  }

  if (request.status === 'Pending Review') {
    return 'Badge request already filed and is pending District Office review.';
  }

  if (request.status === 'Rejected') {
    return 'This badge request already exists and was rejected.';
  }

  return 'A badge request already exists for this learner, enrollment, and badge.';
}

export function getExistingExternalBadgeRequestStatusLabel(request: ExistingExternalBadgeRequest) {
  const status = typeof request.status === 'string' ? request.status.trim() : '';
  const badgeIdStatus = typeof request.badgeIdStatus === 'string' ? request.badgeIdStatus.trim() : '';

  if (status === 'Pending Review') {
    return 'Pending';
  }

  if (status === 'Approved' && badgeIdStatus === 'Issued') {
    return 'Approved / Issued';
  }

  return [status, badgeIdStatus].filter(Boolean).join(' / ') || 'Request filed';
}

export function isFirestorePermissionDenied(error: unknown) {
  return typeof error === 'object' && error !== null &&
    'code' in error && error.code === 'permission-denied';
}
