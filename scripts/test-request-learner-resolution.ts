import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  getApprovalReadiness,
  resolveRequestLearners,
} from '../src/lib/request-learner-resolution.ts';
import type { BadgeRequest, Learner } from '../src/types/index.ts';

const learner2Uid = 'IHFaMXNVWhNxxg9AqQP1pdwfpro2';
const learner2TemplateId = 'vurWRNY5Wq20Xu3UxS2c';
const learner2Key = `TC-DEMO-001:ENR-MOCK-TRAINING-0002:${learner2TemplateId}`;

const trustedExternalRequest = (): BadgeRequest => ({
  id: `external-${learner2Key}`,
  requestType: 'Individual',
  requestNumber: 'EXT-1788631420044',
  badgeIdStatus: 'Pending District Approval',
  trainingCenterId: 'demo-training-center',
  trainingCenterName: 'Demo Training Center - Manila',
  programOfferingId: 'external:ENR-MOCK-TRAINING-0002',
  learnerIds: [learner2Uid],
  learnerId: learner2Uid,
  learnerName: 'Sample Learner 002',
  learnerEmail: 'learner002@example.invalid',
  badgeTemplateId: learner2TemplateId,
  badgeTemplateName: 'Warehousing Services NC II - Receive stocks/goods',
  badgeType: 'Proficient',
  districtOfficeId: 'demo-district-office',
  status: 'Pending Review',
  submittedBy: 'training-center-user',
  submittedAt: '2026-09-05T18:03:40.556Z',
  createdAt: '2026-09-05T18:03:40.556Z',
  updatedAt: '2026-09-05T18:03:40.556Z',
  externalEligibilityKey: learner2Key,
  externalEligibility: {
    externalBadgeDefinitionId: 'BADGE-DEF-WH-LOG432301-PROFICIENT',
    externalTrainingCenterId: 'TC-DEMO-001',
    trainingCenterName: 'Demo Training Center - Manila',
    learnerName: 'Sample Learner 002',
    learnerEmail: 'learner002@example.invalid',
    learnerUli: 'DEMO-ULI-0002',
    externalEnrollmentId: 'ENR-MOCK-TRAINING-0002',
    sourceRecordId: 'MOCK-TRAINING-0002',
    ctprNumber: 'DEMO-CTPR-WH-2026-001',
    standardType: 'TR',
    competencyId: 'COMP-WH-LOG432301',
    competencyCode: 'LOG432301',
    competencyTitle: 'Receive stocks/goods',
    programTitle: 'Warehousing Services NC II',
    qualificationCode: 'WH-NC-II',
    requiredCompetencyCount: 1,
    completedCompetencyCount: 1,
    completedCompetencyCodes: ['LOG432301'],
    missingCompetencyCodes: [],
    firebaseBadgeTemplateId: learner2TemplateId,
    evaluatedAt: '2026-09-05T18:03:28.254973+00:00',
    retrievedAt: '2026-09-05T18:03:29.255Z',
    mappedBadgeTemplateId: learner2TemplateId,
    mappedBadgeTemplateName: 'Warehousing Services NC II - Receive stocks/goods',
    mappedBadgeType: 'Proficient',
  },
  templateDetails: {
    badgeName: 'Warehousing Services NC II - Receive stocks/goods',
    description: '',
    criteria: '',
    alignment: 'TESDA Training Standard',
    qualificationName: 'Warehousing Services NC II',
    qualificationCode: '',
    badgeType: 'Proficient',
    credentialLevel: 'Unit of Competency',
  },
});

const cloneRequest = () => structuredClone(trustedExternalRequest());

// CASE 1: exact trusted Learner 2 request resolves from its immutable snapshot.
const exact = resolveRequestLearners(cloneRequest(), []);
assert.equal(exact.requestedLearnerCount, 1);
assert.equal(exact.resolvedLearnerCount, 1);
assert.equal(exact.error, null);
assert.deepEqual(exact.learners[0], {
  id: learner2Uid,
  displayName: 'Sample Learner 002',
  email: 'learner002@example.invalid',
  learnerUli: 'DEMO-ULI-0002',
  source: 'external',
});
assert.equal(getApprovalReadiness(1, 1, 1).ready, true);

// CASE 2: missing top-level learner name blocks the entire request.
const missingName = cloneRequest();
delete missingName.learnerName;
assert.match(resolveRequestLearners(missingName, []).error || '', /learner name/i);

// CASE 3: missing external learner ULI blocks the entire request.
const missingUli = cloneRequest();
missingUli.externalEligibility!.learnerUli = '';
assert.match(resolveRequestLearners(missingUli, []).error || '', /ULI/i);

// CASE 4: top-level learnerId must match learnerIds[0].
const mismatchedUid = cloneRequest();
mismatchedUid.learnerId = 'another-firebase-uid';
assert.match(resolveRequestLearners(mismatchedUid, []).error || '', /learner ID/i);

// CASE 5: external snapshot identity must match the request identity.
const mismatchedSnapshot = cloneRequest();
mismatchedSnapshot.externalEligibility!.learnerName = 'Different Learner';
assert.match(resolveRequestLearners(mismatchedSnapshot, []).error || '', /inconsistent/i);

// CASE 6: zero requested learners is never approval-ready.
const zeroRequested = cloneRequest();
zeroRequested.learnerIds = [];
const zeroResolution = resolveRequestLearners(zeroRequested, []);
assert.equal(zeroResolution.resolvedLearnerCount, 0);
assert.equal(getApprovalReadiness(0, 0, 0).ready, false);

// CASE 7: partial internal resolution blocks the entire approval.
const internalRequest = {
  ...cloneRequest(),
  id: 'internal-three-learners',
  requestType: 'Batch',
  learnerIds: ['internal-1', 'internal-2', 'internal-3'],
  learnerId: undefined,
  externalEligibilityKey: undefined,
  externalEligibility: undefined,
} as BadgeRequest;
const internalLearners = [
  { id: 'internal-1', firstName: 'Internal', lastName: 'One', email: 'one@example.invalid' },
  { id: 'internal-2', firstName: 'Internal', lastName: 'Two', email: 'two@example.invalid' },
] as Learner[];
const partial = resolveRequestLearners(internalRequest, internalLearners);
assert.equal(partial.requestedLearnerCount, 3);
assert.equal(partial.resolvedLearnerCount, 2);
assert.match(partial.error || '', /resolved 2 of 3/i);
assert.equal(getApprovalReadiness(3, 2, 2).ready, false);

// CASE 8: even complete resolution cannot proceed with zero planned credentials.
const zeroPlanned = getApprovalReadiness(1, 1, 0);
assert.equal(zeroPlanned.ready, false);
assert.match(zeroPlanned.error || '', /planned credential count is 0/i);

// CASE 9: existing internal learner-document behavior remains supported.
const oneInternal = {
  ...internalRequest,
  id: 'internal-one-learner',
  requestType: 'Individual',
  learnerIds: ['internal-1'],
} as BadgeRequest;
const internal = resolveRequestLearners(oneInternal, internalLearners);
assert.equal(internal.resolvedLearnerCount, 1);
assert.equal(internal.learners[0].source, 'internal');
assert.equal(internal.learners[0].displayName, 'Internal One');
assert.equal(getApprovalReadiness(1, 1, 1).ready, true);

// CASE 10: the historical Learner 1 complete-standard request remains reviewable.
const learner1TemplateId = '4dS0yBzITSYyrztSel2M';
const learner1Key = `TC-DEMO-001:ENR-MOCK-TRAINING-0001:${learner1TemplateId}`;
const learner1 = {
  ...cloneRequest(),
  id: `external-${learner1Key}`,
  status: 'Approved',
  badgeIdStatus: 'Issued',
  learnerIds: ['xdKWr0HYE8fY41Lyo3gtD9VKZwD2'],
  learnerId: 'xdKWr0HYE8fY41Lyo3gtD9VKZwD2',
  learnerName: 'Sample Learner 001',
  learnerEmail: 'learner001@example.invalid',
  badgeTemplateId: learner1TemplateId,
  badgeTemplateName: 'Warehousing Services NC II - Complete Standard',
  badgeType: 'Skilled',
  programOfferingId: 'external:ENR-MOCK-TRAINING-0001',
  externalEligibilityKey: learner1Key,
  externalEligibility: {
    externalTrainingCenterId: 'TC-DEMO-001',
    learnerName: 'Sample Learner 001',
    learnerEmail: 'learner001@example.invalid',
    learnerUli: 'DEMO-ULI-0001',
    externalEnrollmentId: 'ENR-MOCK-TRAINING-0001',
    sourceRecordId: 'MOCK-TRAINING-0001',
    ctprNumber: 'DEMO-CTPR-WH-2026-001',
    requiredCompetencyCount: 1,
    completedCompetencyCount: 1,
    missingCompetencyCodes: [],
    evaluatedAt: '2026-08-24T08:37:53.62637+00:00',
    retrievedAt: '2026-08-24T08:37:53.804Z',
    mappedBadgeTemplateId: learner1TemplateId,
    mappedBadgeTemplateName: 'Warehousing Services NC II - Complete Standard',
    mappedBadgeType: 'Skilled',
  },
  templateDetails: {
    ...cloneRequest().templateDetails!,
    badgeName: 'Warehousing Services NC II - Complete Standard',
    badgeType: 'Skilled',
  },
} as BadgeRequest;
const historical = resolveRequestLearners(learner1, []);
assert.equal(historical.resolvedLearnerCount, 1);
assert.equal(historical.learners[0].displayName, 'Sample Learner 001');
assert.equal(historical.error, null);

const modalSource = readFileSync(new URL(
  '../src/components/districtoffice/RequestDetailsModal.tsx',
  import.meta.url,
), 'utf8');
assert.match(modalSource, /if \(!request\.externalEligibility\)[\s\S]*getDoc\(doc\(db, 'learners', id\)\)/);
assert.match(modalSource, /if \(learner\.source === 'internal'\)[\s\S]*batch\.update\(learnerRef/);
assert.match(modalSource, /details: `Issued \$\{plannedCredentialCount\} badges/);
assert.ok(
  modalSource.indexOf('if (isResolvingLearners || learnerResolution.error || !approvalReadiness.ready)') <
  modalSource.indexOf('const batch = writeBatch(db)'),
  'approval readiness must be checked before the issuance batch is created',
);
assert.ok(
  modalSource.indexOf('const batch = writeBatch(db)') < modalSource.indexOf('generateOfficialBadgeId('),
  'the guarded approval path must precede counter allocation',
);

console.log('Request learner resolution tests passed.');
