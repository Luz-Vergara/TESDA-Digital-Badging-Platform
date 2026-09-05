import {
  doc,
  serverTimestamp,
  writeBatch,
  type DocumentData,
  type Firestore,
} from 'firebase/firestore';

export const BADGE_REQUEST_RETIREMENT_REASON = 'pre_hardening_security_recreation' as const;

export interface PendingExternalBadgeRequest {
  status?: unknown;
  badgeIdStatus?: unknown;
  externalEligibilityKey?: unknown;
  externalEligibility?: unknown;
  trainingCenterId?: unknown;
  districtOfficeId?: unknown;
  badgeTemplateId?: unknown;
}

export function isRetirablePendingExternalRequest(
  requestId: string,
  data: PendingExternalBadgeRequest,
): boolean {
  const eligibilityKey = typeof data.externalEligibilityKey === 'string'
    ? data.externalEligibilityKey
    : '';

  return data.status === 'Pending Review'
    && data.badgeIdStatus === 'Pending District Approval'
    && eligibilityKey.length > 0
    && requestId === `external-${eligibilityKey}`
    && data.externalEligibility !== null
    && typeof data.externalEligibility === 'object'
    && typeof data.trainingCenterId === 'string'
    && data.trainingCenterId.length > 0
    && typeof data.badgeTemplateId === 'string'
    && data.badgeTemplateId.length > 0;
}

interface RetirePendingBadgeRequestOptions {
  firestore: Firestore;
  requestId: string;
  requestData: DocumentData;
  retiredByUid: string;
  retiredByRole: string;
  issuedBadgeCount: number;
}

export async function retirePendingExternalBadgeRequest({
  firestore,
  requestId,
  requestData,
  retiredByUid,
  retiredByRole,
  issuedBadgeCount,
}: RetirePendingBadgeRequestOptions): Promise<void> {
  if (retiredByRole !== 'Admin') {
    throw new Error('Only an authenticated Admin may retire a pending request.');
  }
  if (!isRetirablePendingExternalRequest(requestId, requestData)) {
    throw new Error('This request is not eligible for pre-hardening retirement.');
  }
  if (issuedBadgeCount !== 0) {
    throw new Error('This request already has an issued credential and cannot be retired.');
  }

  const batch = writeBatch(firestore);
  batch.set(doc(firestore, 'badgeRequestRetirements', requestId), {
    requestId,
    externalEligibilityKey: requestData.externalEligibilityKey,
    trainingCenterId: requestData.trainingCenterId,
    districtOfficeId: requestData.districtOfficeId || '',
    badgeTemplateId: requestData.badgeTemplateId,
    originalStatus: requestData.status,
    originalBadgeIdStatus: requestData.badgeIdStatus,
    reasonCode: BADGE_REQUEST_RETIREMENT_REASON,
    retiredByUid,
    retiredByRole: 'Admin',
    retiredAt: serverTimestamp(),
  });
  batch.delete(doc(firestore, 'badgeRequests', requestId));
  await batch.commit();
}
