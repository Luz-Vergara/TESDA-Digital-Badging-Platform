export interface ExternalBadgeRequestIdentityInput {
  externalTrainingCenterId: string;
  externalEnrollmentId: string;
  badgeTemplateId: string;
}

export interface ExistingExternalBadgeRequest {
  status?: unknown;
  badgeIdStatus?: unknown;
}

export function getExternalBadgeRequestIdentity({
  externalTrainingCenterId,
  externalEnrollmentId,
  badgeTemplateId,
}: ExternalBadgeRequestIdentityInput) {
  const mappingKey = [externalTrainingCenterId, externalEnrollmentId, badgeTemplateId].join(':');
  return { mappingKey, externalRequestId: `external-${mappingKey}` };
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

export function isFirestorePermissionDenied(error: unknown) {
  return typeof error === 'object' && error !== null &&
    'code' in error && error.code === 'permission-denied';
}
