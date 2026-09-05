import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const projectId = 'demo-digital-badging-rules';
const trainingUserId = 'training-center-user';
const districtUserId = 'district-office-user';
const trainingCenterId = 'demo-training-center';
const districtOfficeId = 'demo-district-office';
const externalTrainingCenterId = 'TC-DEMO-001';
const learnerUli = 'DEMO-ULI-0002';
const learnerUid = 'IHFaMXNVWhNxxg9AqQP1pdwfpro2';
const enrollmentId = 'ENR-MOCK-TRAINING-0002';
const templateId = 'vurWRNY5Wq20Xu3UxS2c';
const mappingKey = `${externalTrainingCenterId}:${enrollmentId}:${templateId}`;
const requestId = `external-${mappingKey}`;

const testEnvironment = await initializeTestEnvironment({
  projectId,
  firestore: {
    rules: readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8'),
  },
});

const trustedTemplate = {
  badgeName: 'Warehousing Services NC II - Receive stocks/goods',
  badgeType: 'Proficient',
  status: 'Active',
  standardType: 'TR',
  recognitionScope: 'Competency',
  competencyCode: 'LOG432301',
  competencyTitle: 'Receive stocks/goods',
};

const validRequest = () => ({
  requestType: 'Individual',
  requestNumber: 'EXT-SECURITY-TEST',
  badgeIdStatus: 'Pending District Approval',
  trainingCenterId,
  trainingCenterName: 'Demo Training Center - Manila',
  programOfferingId: `external:${enrollmentId}`,
  learnerIds: [learnerUid],
  learnerId: learnerUid,
  learnerName: 'Sample Learner 002',
  badgeTemplateId: templateId,
  badgeTemplateName: trustedTemplate.badgeName,
  badgeType: trustedTemplate.badgeType,
  programTitle: 'Warehousing Services NC II',
  qualificationName: 'Warehousing Services NC II',
  qualificationCode: 'WH-NC-II',
  districtOfficeId,
  status: 'Pending Review',
  submittedBy: trainingUserId,
  externalEligibilityKey: mappingKey,
  externalEligibility: {
    externalBadgeDefinitionId: 'BADGE-DEF-WH-LOG432301-PROFICIENT',
    externalTrainingCenterId,
    trainingCenterName: 'Demo Training Center - Manila',
    learnerName: 'Sample Learner 002',
    learnerUli,
    externalEnrollmentId: enrollmentId,
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
    firebaseBadgeTemplateId: templateId,
    evaluatedAt: '2026-09-05T02:41:10.048103+00:00',
    retrievedAt: '2026-09-05T02:41:10.773Z',
    mappedBadgeTemplateId: templateId,
    mappedBadgeTemplateName: trustedTemplate.badgeName,
    mappedBadgeType: 'Proficient',
  },
  templateDetails: {
    badgeName: trustedTemplate.badgeName,
    description: 'External competency badge for LOG432301.',
    criteria: 'External evidence confirms competency completion.',
    alignment: 'TESDA Warehousing Services NC II',
    qualificationName: 'Warehousing Services NC II',
    qualificationCode: 'WH-NC-II',
    badgeType: 'Proficient',
    credentialLevel: 'Unit of Competency',
  },
  submittedAt: new Date('2026-09-05T02:41:10.773Z'),
  createdAt: new Date('2026-09-05T02:41:10.773Z'),
  updatedAt: new Date('2026-09-05T02:41:10.773Z'),
});

type RequestData = ReturnType<typeof validRequest>;
type RequestMutation = (request: RequestData) => RequestData;

async function seedTrustedDocuments(options: {
  includeLearnerLink?: boolean;
  learnerLinkTrainingCenterId?: string;
} = {}) {
  await testEnvironment.withSecurityRulesDisabled(async (context) => {
    const firestore = context.firestore();
    await setDoc(doc(firestore, 'users', trainingUserId), {
      name: 'Training Center User',
      email: 'training-center@example.invalid',
      role: 'TrainingCenter',
      organizationId: trainingCenterId,
      assignedDistrictId: districtOfficeId,
    });
    await setDoc(doc(firestore, 'users', districtUserId), {
      name: 'District Office User',
      email: 'district-office@example.invalid',
      role: 'DistrictOffice',
      organizationId: districtOfficeId,
      assignedDistrictId: districtOfficeId,
    });
    await setDoc(doc(firestore, 'integrationTrainingCenterLinks', trainingCenterId), {
      externalTrainingCenterId,
      active: true,
      linkVersion: 1,
    });
    if (options.includeLearnerLink !== false) {
      await setDoc(doc(firestore, 'integrationLearnerLinks', learnerUli), {
        firebaseLearnerId: learnerUid,
        firebaseTrainingCenterId: options.learnerLinkTrainingCenterId || trainingCenterId,
        active: true,
        linkVersion: 1,
      });
    }
    await setDoc(doc(firestore, 'integrationLearnerLinks', 'DEMO-ULI-0003'), {
      firebaseLearnerId: 'different-learner-uid',
      firebaseTrainingCenterId: trainingCenterId,
      active: true,
      linkVersion: 1,
    });
    await setDoc(doc(firestore, 'badgeTemplates', templateId), trustedTemplate);
  });
}

async function reset(options?: Parameters<typeof seedTrustedDocuments>[0]) {
  await testEnvironment.clearFirestore();
  await seedTrustedDocuments(options);
}

async function createAsTrainingCenter(id: string, data: RequestData) {
  const firestore = testEnvironment.authenticatedContext(trainingUserId, {
    email: 'training-center@example.invalid',
  }).firestore();
  return setDoc(doc(firestore, 'badgeRequests', id), data);
}

async function assertDenied(
  label: string,
  mutate: RequestMutation,
  options?: Parameters<typeof seedTrustedDocuments>[0],
) {
  await reset(options);
  const request = mutate(validRequest());
  const id = `external-${request.externalEligibilityKey}`;
  await assertFails(createAsTrainingCenter(id, request));
  console.log(`PASS: ${label}`);
}

try {
  await reset();
  await assertSucceeds(createAsTrainingCenter(requestId, validRequest()));
  console.log('PASS: valid Learner 2-style request');

  await assertDenied('correct ULI with wrong Firebase UID', (request) => ({
    ...request,
    learnerIds: ['wrong-firebase-uid'],
    learnerId: 'wrong-firebase-uid',
  }));

  await assertDenied('correct Firebase UID with another learner ULI', (request) => ({
    ...request,
    externalEligibility: { ...request.externalEligibility, learnerUli: 'DEMO-ULI-0003' },
  }));

  await assertDenied('wrong internal Training Center', (request) => ({
    ...request,
    trainingCenterId: 'other-training-center',
  }));

  await assertDenied('forged external Training Center', (request) => {
    const forgedCenter = 'TC-FORGED-001';
    return {
      ...request,
      externalEligibilityKey: `${forgedCenter}:${enrollmentId}:${templateId}`,
      externalEligibility: {
        ...request.externalEligibility,
        externalTrainingCenterId: forgedCenter,
      },
    };
  });

  await assertDenied('arbitrary badge template', (request) => {
    const arbitraryTemplate = 'arbitrary-template';
    return {
      ...request,
      badgeTemplateId: arbitraryTemplate,
      externalEligibilityKey: `${externalTrainingCenterId}:${enrollmentId}:${arbitraryTemplate}`,
      externalEligibility: {
        ...request.externalEligibility,
        firebaseBadgeTemplateId: arbitraryTemplate,
        mappedBadgeTemplateId: arbitraryTemplate,
      },
    };
  });

  await assertDenied('forged badge type', (request) => ({
    ...request,
    badgeType: 'Skilled',
    externalEligibility: { ...request.externalEligibility, mappedBadgeType: 'Skilled' },
  }));

  await assertDenied('wrong competency', (request) => ({
    ...request,
    externalEligibility: {
      ...request.externalEligibility,
      competencyCode: 'LOG432302',
      competencyTitle: 'Store stocks/goods',
    },
  }));

  await assertDenied('template snapshot mismatch', (request) => ({
    ...request,
    externalEligibility: {
      ...request.externalEligibility,
      firebaseBadgeTemplateId: 'different-template',
    },
  }));

  await assertDenied('eligibility key mismatch', (request) => ({
    ...request,
    externalEligibilityKey: `${externalTrainingCenterId}:WRONG-ENROLLMENT:${templateId}`,
  }));

  await reset();
  await assertFails(createAsTrainingCenter('external-wrong-document-id', validRequest()));
  console.log('PASS: request document ID mismatch');

  await assertDenied('zero learners', (request) => ({
    ...request,
    learnerIds: [],
    learnerId: '',
  }));

  await assertDenied('multiple learners for Individual request', (request) => ({
    ...request,
    learnerIds: [learnerUid, 'different-learner-uid'],
  }));

  await assertDenied('pre-approved request creation', (request) => ({
    ...request,
    status: 'Approved',
    badgeIdStatus: 'Issued',
  }));

  await assertDenied('missing learner link', (request) => request, {
    includeLearnerLink: false,
  });

  await assertDenied('learner link owned by another Training Center', (request) => request, {
    learnerLinkTrainingCenterId: 'other-training-center',
  });

  await reset();
  const internalRequest = {
    requestType: 'Batch',
    trainingCenterId,
    learnerIds: [learnerUid],
    badgeTemplateId: templateId,
    badgeType: 'Proficient',
    districtOfficeId,
    status: 'Pending Review',
    submittedBy: trainingUserId,
    submittedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  await assertSucceeds(createAsTrainingCenter('legacy-internal-request', internalRequest as RequestData));
  console.log('PASS: legacy internal Batch request creation');

  await testEnvironment.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), 'badgeRequests', 'historical-approved-request'), {
      ...validRequest(),
      status: 'Approved',
      badgeIdStatus: 'Issued',
    });
  });
  const districtFirestore = testEnvironment.authenticatedContext(districtUserId, {
    email: 'district-office@example.invalid',
  }).firestore();
  const historicalRequest = await assertSucceeds(
    getDoc(doc(districtFirestore, 'badgeRequests', 'historical-approved-request')),
  );
  assert.equal(historicalRequest.exists(), true);
  console.log('PASS: District read of historical request');
} finally {
  await testEnvironment.cleanup();
}
