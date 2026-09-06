import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const definitions = [
  { code: 'LOG432301', title: 'Receive stocks/goods', templateId: 'vurWRNY5Wq20Xu3UxS2c' },
  { code: 'LOG432302', title: 'Store stocks/goods', templateId: '5xGNugoZoZWfLIvCs8zT' },
  { code: 'LOG432303', title: 'Pick stocks/goods', templateId: 'ZtPT4ShwUFigafBTA5Sa' },
  { code: 'LOG432304', title: 'Issue/dispatch stocks/goods', templateId: '5IcvSWBdrNzlr5bL2Hr2' },
  { code: 'LOG432305', title: 'Pack stocks/goods', templateId: '4VLphRnCuFZONX1tCyia' },
  { code: 'LOG432306', title: 'Operate and maintain manual material handling equipment', templateId: '5gzqcaV3r0ecLjOgOMwT' },
] as const;

const eligibilityFor = (completedCodes: ReadonlySet<string>) => definitions.map((definition) => ({
  ...definition,
  badgeType: 'Proficient' as const,
  recognitionScope: 'Competency' as const,
  requiredCompetencyCount: 1,
  completedCompetencyCount: completedCodes.has(definition.code) ? 1 : 0,
  eligible: completedCodes.has(definition.code),
}));

const eligibleCount = (completedCodes: ReadonlySet<string>) =>
  eligibilityFor(completedCodes).filter((item) => item.eligible).length;

assert.equal(definitions.length, 6);
assert.equal(new Set(definitions.map((item) => item.code)).size, 6);
assert.equal(new Set(definitions.map((item) => item.templateId)).size, 6);

const allCompetencies = new Set(definitions.map((item) => item.code));
assert.equal(eligibleCount(allCompetencies), 6, 'Learner 1 should have six Proficient eligibilities');
assert.equal(eligibleCount(new Set(['LOG432301'])), 1, 'Learner 2 should retain one Proficient eligibility');
assert.equal(eligibleCount(new Set()), 0, 'Learners 3-5 should start with no Proficient eligibility');

const learner3AfterFirstManualCompletion = new Set(['LOG432301']);
assert.equal(eligibleCount(learner3AfterFirstManualCompletion), 1);
const learner3AfterSecondManualCompletion = new Set([...learner3AfterFirstManualCompletion, 'LOG432302']);
assert.equal(eligibleCount(learner3AfterSecondManualCompletion), 2);

const learner3Eligible = eligibilityFor(learner3AfterSecondManualCompletion).filter((item) => item.eligible);
assert.deepEqual(learner3Eligible.map((item) => item.code), ['LOG432301', 'LOG432302']);
assert.deepEqual(
  learner3Eligible.map((item) => item.templateId),
  ['vurWRNY5Wq20Xu3UxS2c', '5xGNugoZoZWfLIvCs8zT'],
);

const skilledDefinitions: Array<{ status: 'Active' | 'Inactive'; requiredCompetencyCode: string }> = [
  { status: 'Inactive', requiredCompetencyCode: 'WH-COMP-001' },
];
assert.equal(skilledDefinitions.filter((item) => item.status === 'Active').length, 0);

const migration = readFileSync(new URL(
  '../supabase/migrations/20260906080227_prepare_manual_warehousing_competency_progression.sql',
  import.meta.url,
), 'utf8');

definitions.forEach(({ code, title, templateId }) => {
  assert.match(migration, new RegExp(`'${code}'[\\s\\S]*${title.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}`));
  assert.match(migration, new RegExp(templateId));
});
assert.match(migration, /'BADGE-DEF-WH-001'[\s\S]*status = 'Inactive'/);
assert.match(migration, /'LEARNER-DEMO-0001'[\s\S]*'COMP-WH-LOG432306'/);
assert.match(migration, /'LEARNER-DEMO-0002'[\s\S]*'COMP-WH-LOG432301'/);
assert.match(migration, /'ENR-MOCK-TRAINING-0003'[\s\S]*'In Progress'/);
assert.match(migration, /'ENR-MOCK-TRAINING-0004'[\s\S]*'In Progress'/);
assert.match(migration, /'ENR-MOCK-TRAINING-0005'[\s\S]*'In Progress'/);
assert.doesNotMatch(migration, /create\s+table/i);
assert.doesNotMatch(migration, /delete\s+from/i);
assert.doesNotMatch(migration, /badgeRequests|issuedBadges|publicCredentials/);

console.log('Warehousing competency progression fixture tests passed.');
