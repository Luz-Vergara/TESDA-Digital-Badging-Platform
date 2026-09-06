import assert from 'node:assert/strict';
import { getWarehousingTrainingRecordProgress } from '../src/lib/training-records-progress.ts';
import type { ExternalBadgeEligibility, ExternalLearnerSummary } from '../src/types/external-api.ts';

const codes = ['LOG432301', 'LOG432302', 'LOG432303', 'LOG432304', 'LOG432305', 'LOG432306'];

const learnerFor = (completedCodes: string[]): ExternalLearnerSummary => ({
  id: 'LEARNER-DEMO',
  learnerUli: 'DEMO-ULI',
  displayName: 'Demo Learner',
  email: null,
  activeEnrollmentCount: 1,
  completedCompetencyCount: completedCodes.length,
  eligibleBadgeCount: 0,
  enrollments: [],
  badgeEligibility: codes.map((code): ExternalBadgeEligibility => ({
    id: `ENR-DEMO:${code}`,
    externalBadgeDefinitionId: `BADGE-DEF-${code}`,
    learnerId: 'LEARNER-DEMO',
    learnerUli: 'DEMO-ULI',
    enrollmentId: 'ENR-DEMO',
    sourceRecordId: 'SOURCE-DEMO',
    trainingCenterId: 'TC-DEMO',
    ctprNumber: 'CTPR-DEMO',
    firebaseBadgeTemplateId: `TEMPLATE-${code}`,
    badgeType: 'Proficient',
    standardType: 'TR',
    competency: { id: `COMP-${code}`, code, title: code },
    eligible: completedCodes.includes(code),
    requiredCompetencyCount: 1,
    completedCompetencyCount: completedCodes.includes(code) ? 1 : 0,
    completedCompetencyCodes: completedCodes,
    missingCompetencyCodes: [],
    evaluatedAt: '2026-09-07T00:00:00.000Z',
  })),
});

assert.deepEqual(getWarehousingTrainingRecordProgress(learnerFor(codes), 'ENR-DEMO'), {
  completedCompetencyCount: 6,
  requiredCompetencyCount: 6,
});
assert.deepEqual(getWarehousingTrainingRecordProgress(learnerFor(['LOG432301']), 'ENR-DEMO'), {
  completedCompetencyCount: 1,
  requiredCompetencyCount: 6,
});
assert.deepEqual(getWarehousingTrainingRecordProgress(learnerFor(['WH-COMP-001']), 'ENR-DEMO'), {
  completedCompetencyCount: 0,
  requiredCompetencyCount: 6,
}, 'legacy generic completion must not count');

console.log('PASS: Training Records Warehousing competency progress');
