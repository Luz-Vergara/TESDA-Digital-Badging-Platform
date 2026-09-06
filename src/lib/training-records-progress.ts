import { WAREHOUSING_PROFICIENT_MAPPINGS } from './warehousing-badge-hierarchy.ts';
import type { ExternalLearnerSummary } from '../types/external-api.ts';

const WAREHOUSING_COMPETENCY_CODES = new Set(
  WAREHOUSING_PROFICIENT_MAPPINGS.map((mapping) => mapping.code),
);

export const WAREHOUSING_QUALIFICATION_CODE = 'WH-NC-II';
export const WAREHOUSING_QUALIFICATION_TITLE = 'Warehousing Services NC II';

export function isWarehousingQualification(qualification: { code: string; title: string }) {
  return qualification.code === WAREHOUSING_QUALIFICATION_CODE ||
    qualification.title === WAREHOUSING_QUALIFICATION_TITLE;
}

/**
 * Projects Training Records progress from completed external competency evidence.
 * Badge requests, issued credentials, and legacy generic competency codes are
 * intentionally excluded from this six-competency Warehousing denominator.
 */
export function getWarehousingTrainingRecordProgress(
  learner: ExternalLearnerSummary,
  enrollmentId: string,
) {
  const completedCodes = new Set(
    learner.badgeEligibility
      .filter((eligibility) =>
        eligibility.enrollmentId === enrollmentId && eligibility.badgeType === 'Proficient')
      .flatMap((eligibility) => eligibility.completedCompetencyCodes)
      .filter((code) => WAREHOUSING_COMPETENCY_CODES.has(code)),
  );

  return {
    completedCompetencyCount: completedCodes.size,
    requiredCompetencyCount: WAREHOUSING_PROFICIENT_MAPPINGS.length,
  };
}
