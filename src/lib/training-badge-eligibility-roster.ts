import type { ExternalBadgeEligibility, ExternalLearnerSummary } from '@/src/types/external-api';

export type EligibilityRosterGroup = {
  id: string;
  learner: ExternalLearnerSummary;
  enrollmentId: string;
  ctprNumber: string;
  eligibilities: ExternalBadgeEligibility[];
  completedCompetencyCount: number;
  requiredCompetencyCount: number;
};

const groupIdFor = (learnerUli: string, enrollmentId: string) => `${learnerUli}:${enrollmentId}`;

/**
 * Groups external eligibility evidence by learner and enrollment while keeping
 * each original eligibility object intact for exact request/template matching.
 */
export function groupBadgeEligibilityByLearnerEnrollment(
  learners: ExternalLearnerSummary[],
): EligibilityRosterGroup[] {
  const groups = new Map<string, EligibilityRosterGroup>();

  learners.forEach((learner) => {
    learner.badgeEligibility.forEach((eligibility) => {
      const id = groupIdFor(learner.learnerUli, eligibility.enrollmentId);
      const group = groups.get(id) ?? {
        id,
        learner,
        enrollmentId: eligibility.enrollmentId,
        ctprNumber: eligibility.ctprNumber,
        eligibilities: [],
        completedCompetencyCount: 0,
        requiredCompetencyCount: 0,
      };
      group.eligibilities.push(eligibility);
      groups.set(id, group);
    });
  });

  return [...groups.values()].map((group) => {
    const competencyCodes = new Set(group.eligibilities
      .map((eligibility) => eligibility.competency?.code)
      .filter((code): code is string => Boolean(code)));
    const completedCodes = new Set(group.eligibilities
      .flatMap((eligibility) => eligibility.completedCompetencyCodes)
      .filter((code) => competencyCodes.has(code)));

    return {
      ...group,
      completedCompetencyCount: completedCodes.size,
      requiredCompetencyCount: competencyCodes.size,
    };
  });
}
