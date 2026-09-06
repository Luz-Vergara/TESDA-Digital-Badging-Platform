import assert from 'node:assert/strict';
import {
  projectWarehousingHierarchy,
  WAREHOUSING_PROFICIENT_MAPPINGS,
  WAREHOUSING_SKILLED_TEMPLATE_ID,
} from '../src/lib/warehousing-badge-hierarchy.ts';

const first = WAREHOUSING_PROFICIENT_MAPPINGS[0];

const externalDataFor = (mappings = WAREHOUSING_PROFICIENT_MAPPINGS) => ({
  competencyCompletions: mappings.map((mapping) => ({
    status: 'Completed',
    competency: { code: mapping.code },
  })),
  badgeEligibility: mappings.map((mapping) => ({
    badgeType: 'Proficient',
    eligible: true,
    firebaseBadgeTemplateId: mapping.badgeTemplateId,
    competency: { code: mapping.code },
  })),
});

const statuses = (projection: ReturnType<typeof projectWarehousingHierarchy>) =>
  projection.competencies.map((competency) => competency.status);

// Case 1: no external completion or active credential leaves all six locked.
{
  const projection = projectWarehousingHierarchy({});
  assert.equal(projection.totalProficient, 6);
  assert.equal(projection.achievedProficient, 0);
  assert.deepEqual(statuses(projection), Array(6).fill('Locked'));
}

// Case 2: one completed, eligible external competency is eligible, not issued.
{
  const projection = projectWarehousingHierarchy({ externalTrainingData: externalDataFor([first]) });
  assert.equal(projection.achievedProficient, 0);
  assert.deepEqual(statuses(projection), ['Eligible', 'Locked', 'Locked', 'Locked', 'Locked', 'Locked']);
}

// Case 3: an actionable request takes precedence over external eligibility.
{
  const projection = projectWarehousingHierarchy({
    externalTrainingData: externalDataFor([first]),
    badgeRequests: [{ badgeTemplateId: first.badgeTemplateId, status: 'Pending Review' }],
  });
  assert.equal(projection.achievedProficient, 0);
  assert.equal(projection.competencies[0].status, 'Pending');
}

// Case 4: only an Active credential establishes issued progress.
{
  const projection = projectWarehousingHierarchy({
    issuedBadges: [{ badgeTemplateId: first.badgeTemplateId, badgeType: 'Proficient', status: 'Active' }],
  });
  assert.equal(projection.achievedProficient, 1);
  assert.equal(projection.competencies[0].status, 'Issued');
}

// Case 5: six external completions and eligibilities do not count as issued.
{
  const projection = projectWarehousingHierarchy({ externalTrainingData: externalDataFor() });
  assert.equal(projection.achievedProficient, 0);
  assert.deepEqual(statuses(projection), Array(6).fill('Eligible'));
}

// Case 6: all six exact, Active credentials count once each.
{
  const projection = projectWarehousingHierarchy({
    issuedBadges: WAREHOUSING_PROFICIENT_MAPPINGS.map((mapping) => ({
      badgeTemplateId: mapping.badgeTemplateId,
      badgeType: 'Proficient',
      status: 'Active',
    })),
  });
  assert.equal(projection.achievedProficient, 6);
  assert.deepEqual(statuses(projection), Array(6).fill('Issued'));
}

// Case 7: a revoked credential neither counts nor masks an eligible node.
{
  const projection = projectWarehousingHierarchy({
    issuedBadges: [{ badgeTemplateId: first.badgeTemplateId, badgeType: 'Proficient', status: 'Revoked' }],
    externalTrainingData: externalDataFor([first]),
  });
  assert.equal(projection.achievedProficient, 0);
  assert.equal(projection.competencies[0].status, 'Eligible');
}

// Case 8: an existing Skilled credential is independent of Proficient progress.
{
  const projection = projectWarehousingHierarchy({
    issuedBadges: [{ badgeTemplateId: WAREHOUSING_SKILLED_TEMPLATE_ID, badgeType: 'Skilled', status: 'Active' }],
  });
  assert.equal(projection.skilledStatus, 'Issued');
  assert.equal(projection.achievedProficient, 0);
}

// Case 9: historical generic competency records cannot change the six-node count.
{
  const projection = projectWarehousingHierarchy({
    issuedBadges: [{ badgeTemplateId: 'WH-COMP-001', badgeType: 'Proficient', status: 'Active' }],
    badgeRequests: [{ badgeTemplateId: 'WH-COMP-001', status: 'Pending Review' }],
    externalTrainingData: externalDataFor(),
  });
  assert.equal(projection.totalProficient, 6);
  assert.equal(projection.achievedProficient, 0);
  assert.deepEqual(statuses(projection), Array(6).fill('Eligible'));
}

console.log('PASS: warehousing badge hierarchy projection (9 cases)');
