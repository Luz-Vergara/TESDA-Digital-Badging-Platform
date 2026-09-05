import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  writeBatch,
  type DocumentData,
} from 'firebase/firestore';

const projectId = 'demo-badge-request-retirement-rules';
const adminUid = 'admin-user';
const trainingUid = 'training-center-user';
const districtUid = 'district-office-user';
const learnerUid = 'learner-user';
const linkedLearnerUid = 'IHFaMXNVWhNxxg9AqQP1pdwfpro2';
const trainingCenterId = 'demo-training-center';
const districtOfficeId = 'demo-district-office';
const externalTrainingCenterId = 'TC-DEMO-001';
const learnerUli = 'DEMO-ULI-0002';
const templateId = 'vurWRNY5Wq20Xu3UxS2c';
const enrollmentId = 'ENR-MOCK-TRAINING-0002';
const eligibilityKey = `${externalTrainingCenterId}:${enrollmentId}:${templateId}`;
const requestId = `external-${eligibilityKey}`;
const reasonCode = 'pre_hardening_security_recreation';

const testEnvironment = await initializeTestEnvironment({
  projectId,
  firestore: {
    rules: readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8'),
  },
});

function validRequest(overrides: DocumentData = {}): DocumentData {
  return {
    requestType: 'Individual',
    badgeIdStatus: 'Pending District Approval',
    trainingCenterId,
    trainingCenterName: 'Demo Training Center - Manila',
    districtOfficeId,
    learnerIds: [linkedLearnerUid],
    learnerId: linkedLearnerUid,
    learnerName: 'Sample Learner 002',
    badgeTemplateId: templateId,
    badgeTemplateName: 'Warehousing Services NC II - Receive stocks/goods',
    badgeType: 'Proficient',
    status: 'Pending Review',
    submittedBy: trainingUid,
    externalEligibilityKey: eligibilityKey,
    externalEligibility: {
      externalTrainingCenterId,
      learnerName: 'Sample Learner 002',
      learnerUli,
      externalEnrollmentId: enrollmentId,
      sourceRecordId: 'MOCK-TRAINING-0002',
      ctprNumber: 'DEMO-CTPR-WH-2026-001',
      standardType: 'TR',
      competencyId: 'COMP-WH-LOG432301',
      competencyCode: 'LOG432301',
      competencyTitle: 'Receive stocks/goods',
      requiredCompetencyCount: 1,
      completedCompetencyCount: 1,
      missingCompetencyCodes: [],
      firebaseBadgeTemplateId: templateId,
      mappedBadgeTemplateId: templateId,
      mappedBadgeTemplateName: 'Warehousing Services NC II - Receive stocks/goods',
      mappedBadgeType: 'Proficient',
      evaluatedAt: '2026-09-05T02:41:10.048103+00:00',
      retrievedAt: '2026-09-05T02:41:10.773Z',
    },
    ...overrides,
  };
}

function retirementAudit(
  id: string,
  request: DocumentData,
  actorUid: string,
  overrides: DocumentData = {},
): DocumentData {
  return {
    requestId: id,
    externalEligibilityKey: request.externalEligibilityKey || '',
    trainingCenterId: request.trainingCenterId || '',
    districtOfficeId: request.districtOfficeId || '',
    badgeTemplateId: request.badgeTemplateId || '',
    originalStatus: request.status || '',
    originalBadgeIdStatus: request.badgeIdStatus || '',
    reasonCode,
    retiredByUid: actorUid,
    retiredByRole: 'Admin',
    retiredAt: serverTimestamp(),
    ...overrides,
  };
}

async function seedBase() {
  await testEnvironment.withSecurityRulesDisabled(async (context) => {
    const firestore = context.firestore();
    await Promise.all([
      setDoc(doc(firestore, 'users', adminUid), {
        role: 'Admin',
        email: 'admin@example.invalid',
      }),
      setDoc(doc(firestore, 'users', trainingUid), {
        role: 'TrainingCenter',
        organizationId: trainingCenterId,
        assignedDistrictId: districtOfficeId,
        email: 'training@example.invalid',
      }),
      setDoc(doc(firestore, 'users', districtUid), {
        role: 'DistrictOffice',
        organizationId: districtOfficeId,
        email: 'district@example.invalid',
      }),
      setDoc(doc(firestore, 'users', learnerUid), {
        role: 'Learner',
        email: 'learner@example.invalid',
      }),
      setDoc(doc(firestore, 'integrationLearnerLinks', learnerUli), {
        firebaseLearnerId: linkedLearnerUid,
        firebaseTrainingCenterId: trainingCenterId,
        learnerUli,
        active: true,
      }),
      setDoc(doc(firestore, 'integrationTrainingCenterLinks', trainingCenterId), {
        firebaseOrganizationId: trainingCenterId,
        externalTrainingCenterId,
        active: true,
      }),
      setDoc(doc(firestore, 'badgeTemplates', templateId), {
        badgeName: 'Warehousing Services NC II - Receive stocks/goods',
        badgeType: 'Proficient',
        status: 'Active',
        standardType: 'TR',
        recognitionScope: 'Competency',
        competencyCode: 'LOG432301',
        competencyTitle: 'Receive stocks/goods',
      }),
    ]);
  });
}

async function reset(requests: Array<{ id: string; data: DocumentData }> = [
  { id: requestId, data: validRequest() },
]) {
  await testEnvironment.clearFirestore();
  await seedBase();
  await testEnvironment.withSecurityRulesDisabled(async (context) => {
    await Promise.all(requests.map(({ id, data }) => (
      setDoc(doc(context.firestore(), 'badgeRequests', id), data)
    )));
  });
}

function contextFor(uid?: string) {
  if (!uid) return testEnvironment.unauthenticatedContext().firestore();
  const emailByUid: Record<string, string> = {
    [adminUid]: 'admin@example.invalid',
    [trainingUid]: 'training@example.invalid',
    [districtUid]: 'district@example.invalid',
    [learnerUid]: 'learner@example.invalid',
  };
  return testEnvironment.authenticatedContext(uid, { email: emailByUid[uid] }).firestore();
}

function retirementBatch(
  actorUid: string | undefined,
  id: string,
  request: DocumentData,
  auditOverrides: DocumentData = {},
  additionalRequestIds: string[] = [],
) {
  const firestore = contextFor(actorUid);
  const batch = writeBatch(firestore);
  batch.set(
    doc(firestore, 'badgeRequestRetirements', id),
    retirementAudit(id, request, actorUid || '', auditOverrides),
  );
  batch.delete(doc(firestore, 'badgeRequests', id));
  additionalRequestIds.forEach((additionalId) => {
    batch.delete(doc(firestore, 'badgeRequests', additionalId));
  });
  return batch.commit();
}

async function assertDenied(label: string, action: () => Promise<unknown>) {
  await assertFails(action());
  console.log(`PASS: ${label}`);
}

try {
  await reset();
  await assertSucceeds(retirementBatch(adminUid, requestId, validRequest()));
  const adminFirestore = contextFor(adminUid);
  const [deletedRequest, auditReceipt] = await Promise.all([
    getDoc(doc(adminFirestore, 'badgeRequests', requestId)),
    getDoc(doc(adminFirestore, 'badgeRequestRetirements', requestId)),
  ]);
  assert.equal(deletedRequest.exists(), false);
  assert.equal(auditReceipt.exists(), true);
  assert.equal(auditReceipt.data()?.requestId, requestId);
  assert.equal(auditReceipt.data()?.reasonCode, reasonCode);
  console.log('PASS: exact Learner 2 Admin retirement batch is atomic');

  await reset();
  await assertDenied('Admin delete without audit', () => (
    deleteDoc(doc(contextFor(adminUid), 'badgeRequests', requestId))
  ));

  await reset();
  await assertDenied('Admin audit without request delete', async () => {
    const firestore = contextFor(adminUid);
    return setDoc(
      doc(firestore, 'badgeRequestRetirements', requestId),
      retirementAudit(requestId, validRequest(), adminUid),
    );
  });

  for (const [label, uid] of [
    ['Training Center retirement', trainingUid],
    ['District Office retirement', districtUid],
    ['Learner retirement', learnerUid],
  ] as const) {
    await reset();
    await assertDenied(label, () => retirementBatch(uid, requestId, validRequest()));
  }

  await reset();
  await assertDenied('anonymous retirement', () => retirementBatch(undefined, requestId, validRequest()));

  const approved = validRequest({ status: 'Approved' });
  await reset([{ id: requestId, data: approved }]);
  await assertDenied('Approved request retirement', () => retirementBatch(adminUid, requestId, approved));

  const rejected = validRequest({ status: 'Rejected' });
  await reset([{ id: requestId, data: rejected }]);
  await assertDenied('Rejected request retirement', () => retirementBatch(adminUid, requestId, rejected));

  const issued = validRequest({ status: 'Approved', badgeIdStatus: 'Issued' });
  await reset([{ id: requestId, data: issued }]);
  await assertDenied('Issued request retirement', () => retirementBatch(adminUid, requestId, issued));

  const pendingWithIssuedStatus = validRequest({ badgeIdStatus: 'Issued' });
  await reset([{ id: requestId, data: pendingWithIssuedStatus }]);
  await assertDenied('Pending request with Issued badge status', () => (
    retirementBatch(adminUid, requestId, pendingWithIssuedStatus)
  ));

  const mismatchCases: Array<[string, DocumentData]> = [
    ['audit requestId mismatch', { requestId: 'external-different-request' }],
    ['audit badgeTemplateId mismatch', { badgeTemplateId: 'different-template' }],
    ['audit trainingCenterId mismatch', { trainingCenterId: 'different-training-center' }],
    ['audit districtOfficeId mismatch', { districtOfficeId: 'different-district' }],
    ['audit original status mismatch', { originalStatus: 'Approved' }],
    ['audit original badge status mismatch', { originalBadgeIdStatus: 'Issued' }],
    ['audit retiredByUid mismatch', { retiredByUid: 'different-admin' }],
    ['audit retiredByRole mismatch', { retiredByRole: 'DistrictOffice' }],
    ['audit retiredAt is not the server request time', { retiredAt: new Date('2026-09-05T00:00:00.000Z') }],
    ['audit reasonCode mismatch', { reasonCode: 'other_reason' }],
    ['audit externalEligibilityKey mismatch', { externalEligibilityKey: 'different:key' }],
    ['audit contains an unexpected field', { learnerName: 'must not be copied' }],
  ];
  for (const [label, overrides] of mismatchCases) {
    await reset();
    await assertDenied(label, () => retirementBatch(adminUid, requestId, validRequest(), overrides));
  }

  const secondEnrollment = 'ENR-MOCK-TRAINING-0003';
  const secondKey = `${externalTrainingCenterId}:${secondEnrollment}:${templateId}`;
  const secondRequestId = `external-${secondKey}`;
  const secondRequest = validRequest({
    externalEligibilityKey: secondKey,
    externalEligibility: {
      ...validRequest().externalEligibility,
      externalEnrollmentId: secondEnrollment,
    },
  });
  await reset([
    { id: requestId, data: validRequest() },
    { id: secondRequestId, data: secondRequest },
  ]);
  await assertDenied('delete two requests with one audit', () => (
    retirementBatch(adminUid, requestId, validRequest(), {}, [secondRequestId])
  ));

  await reset();
  await testEnvironment.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), 'badgeRequestRetirements', requestId), {
      ...retirementAudit(requestId, validRequest(), adminUid),
      retiredAt: new Date('2026-09-05T00:00:00.000Z'),
    });
  });
  await assertDenied('pre-existing audit cannot authorize a later delete', () => (
    deleteDoc(doc(contextFor(adminUid), 'badgeRequests', requestId))
  ));

  const internalRequest = {
    requestType: 'Batch',
    trainingCenterId,
    districtOfficeId,
    learnerIds: [linkedLearnerUid],
    badgeTemplateId: templateId,
    badgeType: 'Proficient',
    status: 'Pending Review',
    badgeIdStatus: 'Pending District Approval',
  };
  await reset([{ id: 'internal-request', data: internalRequest }]);
  await assertDenied('non-external request retirement', () => (
    retirementBatch(adminUid, 'internal-request', internalRequest)
  ));

  const learner1HistoricalRequest = {
    ...internalRequest,
    status: 'Approved',
    badgeIdStatus: 'Issued',
    badgeId: 'TESDA-2026-DEMODISTRICTOFF-WH-NC-II-SKILLED-000001',
    learnerName: 'Sample Learner 001',
    badgeType: 'Skilled',
  };
  await reset([{ id: 'historical-learner-1-request', data: learner1HistoricalRequest }]);
  await assertDenied('Learner 1 historical Approved / Issued request retirement', () => (
    retirementBatch(adminUid, 'historical-learner-1-request', learner1HistoricalRequest)
  ));
} finally {
  await testEnvironment.cleanup();
}
