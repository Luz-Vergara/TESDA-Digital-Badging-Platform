import assert from 'node:assert/strict';
import { groupBadgeEligibilityByLearnerEnrollment } from '../src/lib/training-badge-eligibility-roster.ts';
import type { ExternalBadgeEligibility, ExternalLearnerSummary } from '../src/types/external-api.ts';

const competencies = [
  ['LOG432301', 'vurWRNY5Wq20Xu3UxS2c'],
  ['LOG432302', '5xGNugoZoZWfLIvCs8zT'],
  ['LOG432303', 'ZtPT4ShwUFigafBTA5Sa'],
  ['LOG432304', '5IcvSWBdrNzlr5bL2Hr2'],
  ['LOG432305', '4VLphRnCuFZONX1tCyia'],
  ['LOG432306', '5gzqcaV3r0ecLjOgOMwT'],
] as const;

const eligibilityFor = (learnerUli: string, enrollmentId: string, completedCodes: readonly string[]): ExternalBadgeEligibility[] =>
  competencies.map(([code, firebaseBadgeTemplateId]) => ({
    id: `${enrollmentId}:${code}`,
    externalBadgeDefinitionId: `BADGE-DEF-${code}`,
    learnerId: `LEARNER-${learnerUli}`,
    learnerUli,
    enrollmentId,
    sourceRecordId: `SOURCE-${enrollmentId}`,
    trainingCenterId: 'TC-DEMO-001',
    ctprNumber: 'CTPR-DEMO-001',
    firebaseBadgeTemplateId,
    badgeType: 'Proficient',
    standardType: 'CS',
    competency: { id: `COMP-${code}`, code, title: code },
    eligible: completedCodes.includes(code),
    requiredCompetencyCount: 1,
    completedCompetencyCount: completedCodes.includes(code) ? 1 : 0,
    completedCompetencyCodes: [...completedCodes],
    missingCompetencyCodes: competencies.map(([candidate]) => candidate).filter((candidate) => !completedCodes.includes(candidate)),
    evaluatedAt: '2026-09-06T00:00:00.000Z',
  }));

const learnerFor = (id: string, uli: string, enrollmentId: string, completedCodes: readonly string[]): ExternalLearnerSummary => ({
  id,
  learnerUli: uli,
  displayName: `Learner ${id}`,
  email: null,
  activeEnrollmentCount: 1,
  completedCompetencyCount: completedCodes.length,
  eligibleBadgeCount: completedCodes.length,
  enrollments: [],
  badgeEligibility: eligibilityFor(uli, enrollmentId, completedCodes),
});

const learner1 = learnerFor('1', 'DEMO-ULI-0001', 'ENR-MOCK-TRAINING-0001', competencies.map(([code]) => code));
const learner2 = learnerFor('2', 'DEMO-ULI-0002', 'ENR-MOCK-TRAINING-0002', ['LOG432301']);
const groups = groupBadgeEligibilityByLearnerEnrollment([learner1, learner2]);

assert.equal(groups.length, 2, 'one top-level roster row is created for each learner enrollment');
assert.deepEqual(groups.map((group) => group.eligibilities.length), [6, 6], 'each roster row retains six competency children');
assert.deepEqual(groups.map((group) => [group.completedCompetencyCount, group.requiredCompetencyCount]), [[6, 6], [1, 6]]);
assert.deepEqual(
  groups[1].eligibilities.map((eligibility) => [eligibility.competency?.code, eligibility.firebaseBadgeTemplateId]),
  competencies,
  'grouping retains each original competency/template mapping',
);

console.log('PASS: compact training badge eligibility roster grouping');
