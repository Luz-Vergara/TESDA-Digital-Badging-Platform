import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import type { Firestore } from 'firebase/firestore';
import {
  findExistingExternalBadgeRequestForTrainingCenter,
  getExistingExternalBadgeRequestMessage,
  getExistingExternalBadgeRequestStatusLabel,
  getExternalBadgeRequestIdentity,
  getExternalBadgeRequestRoute,
  selectExternalBadgeEligibility,
  validateExternalBadgeTemplateMapping,
} from '../src/lib/external-badge-request.ts';
import type { ExternalBadgeEligibility, ExternalLearnerSummary } from '../src/types/external-api.ts';

const log432301: ExternalBadgeEligibility = {
  id: 'ENR-MOCK-TRAINING-0002:BADGE-DEF-WH-LOG432301-PROFICIENT',
  externalBadgeDefinitionId: 'BADGE-DEF-WH-LOG432301-PROFICIENT',
  learnerId: 'LEARNER-DEMO-0002',
  learnerUli: 'DEMO-ULI-0002',
  enrollmentId: 'ENR-MOCK-TRAINING-0002',
  sourceRecordId: 'MOCK-TRAINING-0002',
  trainingCenterId: 'TC-DEMO-001',
  ctprNumber: 'DEMO-CTPR-WH-2026-001',
  firebaseBadgeTemplateId: 'vurWRNY5Wq20Xu3UxS2c',
  badgeType: 'Proficient',
  standardType: 'TR',
  competency: { id: 'COMP-WH-LOG432301', code: 'LOG432301', title: 'Receive stocks/goods' },
  eligible: true,
  requiredCompetencyCount: 1,
  completedCompetencyCount: 1,
  completedCompetencyCodes: ['LOG432301'],
  missingCompetencyCodes: [],
  evaluatedAt: '2026-09-03T00:00:00Z',
};

const log432302: ExternalBadgeEligibility = {
  ...log432301,
  id: 'ENR-MOCK-TRAINING-0002:BADGE-DEF-WH-LOG432302-PROFICIENT',
  externalBadgeDefinitionId: 'BADGE-DEF-WH-LOG432302-PROFICIENT',
  firebaseBadgeTemplateId: 'future-log432302-template',
  competency: { id: 'COMP-WH-LOG432302', code: 'LOG432302', title: 'Inventory stocks/goods' },
  completedCompetencyCodes: ['LOG432302'],
};

const learner = (eligibilities: ExternalBadgeEligibility[]): ExternalLearnerSummary => ({
  id: 'LEARNER-DEMO-0002',
  learnerUli: 'DEMO-ULI-0002',
  displayName: 'Sample Learner 002',
  email: 'learner002@example.invalid',
  activeEnrollmentCount: 1,
  completedCompetencyCount: 1,
  eligibleBadgeCount: eligibilities.filter((item) => item.eligible).length,
  enrollments: [],
  badgeEligibility: eligibilities,
});

assert.equal(log432301.badgeType, 'Proficient');
assert.equal(log432301.competency?.code, 'LOG432301');
assert.equal(log432301.firebaseBadgeTemplateId, 'vurWRNY5Wq20Xu3UxS2c');
assert.equal(log432301.eligible, true);
assert.equal([log432301].some((item) => item.badgeType === 'Skilled' && item.eligible), false);

const exact = selectExternalBadgeEligibility(learner([log432301, log432302]), log432301.enrollmentId, log432302.id);
assert.equal(exact.error, null);
assert.equal(exact.eligibility?.id, log432302.id);

const ambiguous = selectExternalBadgeEligibility(learner([log432301, log432302]), log432301.enrollmentId);
assert.equal(ambiguous.eligibility, null);
assert.match(ambiguous.error || '', /Multiple badges/);

const backwardCompatible = selectExternalBadgeEligibility(learner([log432301]), log432301.enrollmentId);
assert.equal(backwardCompatible.eligibility?.id, log432301.id);

const mappedTemplate = {
  id: 'vurWRNY5Wq20Xu3UxS2c',
  status: 'Active',
  badgeType: 'Proficient',
  standardType: 'TR',
  recognitionScope: 'Competency',
  competencyCode: 'LOG432301',
  competencyTitle: 'Receive stocks/goods',
};
assert.equal(validateExternalBadgeTemplateMapping(log432301, mappedTemplate), null);
assert.match(validateExternalBadgeTemplateMapping(log432301, { ...mappedTemplate, id: 'arbitrary-template' }) || '', /missing or inactive/);

const route = getExternalBadgeRequestRoute('DEMO-ULI-0002', log432301);
assert.match(route, /eligibility=ENR-MOCK-TRAINING-0002%3ABADGE-DEF-WH-LOG432301-PROFICIENT/);

const firstIdentity = getExternalBadgeRequestIdentity({
  externalTrainingCenterId: 'TC-DEMO-001',
  externalEnrollmentId: 'ENR-MOCK-TRAINING-0002',
  badgeTemplateId: log432301.firebaseBadgeTemplateId!,
});
const secondIdentity = getExternalBadgeRequestIdentity({
  externalTrainingCenterId: 'TC-DEMO-001',
  externalEnrollmentId: 'ENR-MOCK-TRAINING-0002',
  badgeTemplateId: log432302.firebaseBadgeTemplateId!,
});
assert.equal(
  firstIdentity.externalRequestId,
  'external-TC-DEMO-001:ENR-MOCK-TRAINING-0002:vurWRNY5Wq20Xu3UxS2c',
);
assert.notEqual(firstIdentity.externalRequestId, secondIdentity.externalRequestId);

const ownedRequest = await findExistingExternalBadgeRequestForTrainingCenter(
  firstIdentity.externalRequestId,
  'demo-training-center',
  {} as Firestore,
  async (_firestore, requestId, trainingCenterId) => {
    assert.equal(requestId, firstIdentity.externalRequestId);
    assert.equal(trainingCenterId, 'demo-training-center');
    return [{
      id: requestId,
      trainingCenterId,
      status: 'Approved',
      badgeIdStatus: 'Issued',
    }];
  },
);
assert.equal(ownedRequest?.status, 'Approved');
assert.equal(ownedRequest?.badgeIdStatus, 'Issued');
assert.equal(
  getExistingExternalBadgeRequestMessage(ownedRequest!),
  'This badge request has already been approved and issued.',
);
assert.equal(getExistingExternalBadgeRequestStatusLabel(ownedRequest!), 'Approved / Issued');
assert.equal(getExistingExternalBadgeRequestStatusLabel({ status: 'Pending Review' }), 'Pending');
assert.equal(getExistingExternalBadgeRequestStatusLabel({ status: 'Rejected' }), 'Rejected');
assert.equal(
  getExistingExternalBadgeRequestStatusLabel({ status: 'Approved', badgeIdStatus: 'Issuance processing' }),
  'Approved / Issuance processing',
);

const missingRequest = await findExistingExternalBadgeRequestForTrainingCenter(
  firstIdentity.externalRequestId,
  'demo-training-center',
  {} as Firestore,
  async () => [],
);
assert.equal(missingRequest, null);

let missingOrganizationQueryRan = false;
await assert.rejects(
  findExistingExternalBadgeRequestForTrainingCenter(
    firstIdentity.externalRequestId,
    '',
    {} as Firestore,
    async () => {
      missingOrganizationQueryRan = true;
      return [];
    },
  ),
  /organization ID is required/,
);
assert.equal(missingOrganizationQueryRan, false);

const crossTrainingCenterRequest = await findExistingExternalBadgeRequestForTrainingCenter(
  firstIdentity.externalRequestId,
  'demo-training-center',
  {} as Firestore,
  async (_firestore, requestId) => [{
    id: requestId,
    trainingCenterId: 'another-training-center',
    status: 'Approved',
    badgeIdStatus: 'Issued',
  }],
);
assert.equal(crossTrainingCenterRequest, null);

const migration = readFileSync(new URL(
  '../supabase/migrations/20260903070027_prepare_log432301_proficient_pilot.sql',
  import.meta.url,
), 'utf8');
assert.match(migration, /'LOG432301'[\s\S]*'Receive stocks\/goods'/);
assert.match(migration, /'BADGE-DEF-WH-LOG432301-PROFICIENT'[\s\S]*'vurWRNY5Wq20Xu3UxS2c'/);
assert.match(migration, /'LEARNER-DEMO-0002'[\s\S]*'ENR-MOCK-TRAINING-0002'[\s\S]*'COMP-WH-LOG432301'/);
assert.match(migration, /set status = 'Inactive'[\s\S]*where id = 'BADGE-DEF-WH-001'/);
assert.doesNotMatch(migration, /delete\s+from\s+public\.badge_definitions/i);
assert.equal((migration.match(/insert into public\.learner_competency_completions/g) || []).length, 1);

const requestHelperSource = readFileSync(new URL(
  '../src/lib/external-badge-request.ts',
  import.meta.url,
), 'utf8');
assert.match(requestHelperSource, /where\('trainingCenterId', '==', trainingCenterId\)/);
assert.match(requestHelperSource, /where\('externalEligibilityKey', '==', externalEligibilityKey\)/);
assert.doesNotMatch(requestHelperSource, /where\(documentId\(\)/);

const eligibilityPageSource = readFileSync(new URL(
  '../src/pages/training/BadgeEligibility.tsx',
  import.meta.url,
), 'utf8');
assert.match(eligibilityPageSource, /findExistingExternalBadgeRequestForTrainingCenter/);
assert.match(eligibilityPageSource, /getExistingExternalBadgeRequestStatusLabel/);
assert.match(eligibilityPageSource, /state: 'missing'/);

const issuedBadgesPageSource = readFileSync(new URL(
  '../src/pages/training/IssuedBadges.tsx',
  import.meta.url,
), 'utf8');
assert.match(issuedBadgesPageSource, /badgeTemplateName/);
assert.match(issuedBadgesPageSource, /competencyCode/);
assert.match(issuedBadgesPageSource, /qualificationName/);

console.log('External badge request fixture tests passed.');
