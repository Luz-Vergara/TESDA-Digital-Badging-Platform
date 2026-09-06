export type LearnerBadgeStatus = 'Locked' | 'Eligible' | 'Pending' | 'Issued';

type BadgeRecord = {
  badgeTemplateId?: unknown;
  badgeType?: unknown;
  status?: unknown;
  badgeIdStatus?: unknown;
};

type ExternalTrainingData = {
  competencyCompletions?: Array<{
    status?: unknown;
    competency?: { code?: unknown } | null;
  }>;
  badgeEligibility?: Array<{
    badgeType?: unknown;
    eligible?: unknown;
    firebaseBadgeTemplateId?: unknown;
    competency?: { code?: unknown } | null;
  }>;
};

export type WarehousingCompetencyMapping = {
  code: string;
  title: string;
  badgeTemplateId: string;
};

export const WAREHOUSING_STANDARD_ID = 'tr-warehousing-services-nc-ii';
export const WAREHOUSING_SKILLED_TEMPLATE_ID = '4dS0yBzITSYyrztSel2M';
export const WAREHOUSING_PROFICIENT_MAPPINGS: readonly WarehousingCompetencyMapping[] = [
  { code: 'LOG432301', title: 'Receive stocks/goods', badgeTemplateId: 'vurWRNY5Wq20Xu3UxS2c' },
  { code: 'LOG432302', title: 'Store stocks/goods', badgeTemplateId: '5xGNugoZoZWfLIvCs8zT' },
  { code: 'LOG432303', title: 'Pick stocks/goods', badgeTemplateId: 'ZtPT4ShwUFigafBTA5Sa' },
  { code: 'LOG432304', title: 'Issue/dispatch stocks/goods', badgeTemplateId: '5IcvSWBdrNzlr5bL2Hr2' },
  { code: 'LOG432305', title: 'Pack stocks/goods', badgeTemplateId: '4VLphRnCuFZONX1tCyia' },
  { code: 'LOG432306', title: 'Operate and maintain manual material handling equipment', badgeTemplateId: '5gzqcaV3r0ecLjOgOMwT' },
];

const text = (value: unknown) => String(value ?? '').trim();
const hasExactTemplate = (record: BadgeRecord, badgeTemplateId: string) => text(record.badgeTemplateId) === badgeTemplateId;
const isActiveCredential = (record: BadgeRecord, badgeTemplateId: string) =>
  hasExactTemplate(record, badgeTemplateId) && text(record.status) === 'Active';

const isPendingDistrictRequest = (record: BadgeRecord, badgeTemplateId: string) => {
  if (!hasExactTemplate(record, badgeTemplateId)) return false;

  const status = text(record.status);
  if (['Approved', 'Rejected', 'Issued', 'Revoked'].includes(status) || text(record.badgeIdStatus) === 'Issued') return false;

  return ['Pending Review', 'Pending Approval', 'Pending District Approval'].includes(status) ||
    text(record.badgeIdStatus) === 'Pending District Approval';
};

const hasCompletedExternalCompetency = (data: ExternalTrainingData | null | undefined, competencyCode: string) =>
  data?.competencyCompletions?.some((completion) =>
    text(completion.status) === 'Completed' && text(completion.competency?.code) === competencyCode,
  ) ?? false;

const hasEligibleExternalBadge = (data: ExternalTrainingData | null | undefined, mapping: WarehousingCompetencyMapping) =>
  data?.badgeEligibility?.some((eligibility) =>
    eligibility.eligible === true &&
    text(eligibility.badgeType) === 'Proficient' &&
    text(eligibility.firebaseBadgeTemplateId) === mapping.badgeTemplateId &&
    text(eligibility.competency?.code) === mapping.code,
  ) ?? false;

export type WarehousingHierarchyProjection = {
  totalProficient: 6;
  achievedProficient: number;
  skilledStatus: 'Locked' | 'Issued';
  competencies: Array<WarehousingCompetencyMapping & { status: LearnerBadgeStatus }>;
};

/**
 * Projects the canonical Warehousing Services NC II hierarchy from the
 * signed-in learner's records. The mapping IDs are the authority: titles,
 * approved requests, generic historical competencies, and eligibility counts
 * cannot change the six-node structure or issued progress.
 */
export function projectWarehousingHierarchy({
  issuedBadges = [],
  badgeRequests = [],
  externalTrainingData = null,
}: {
  issuedBadges?: BadgeRecord[];
  badgeRequests?: BadgeRecord[];
  externalTrainingData?: ExternalTrainingData | null;
}): WarehousingHierarchyProjection {
  const competencies = WAREHOUSING_PROFICIENT_MAPPINGS.map((mapping) => {
    const issued = issuedBadges.some((badge) => isActiveCredential(badge, mapping.badgeTemplateId));
    const pending = badgeRequests.some((request) => isPendingDistrictRequest(request, mapping.badgeTemplateId));
    const eligible = hasCompletedExternalCompetency(externalTrainingData, mapping.code) &&
      hasEligibleExternalBadge(externalTrainingData, mapping);

    return {
      ...mapping,
      status: issued ? 'Issued' : pending ? 'Pending' : eligible ? 'Eligible' : 'Locked',
    } as WarehousingCompetencyMapping & { status: LearnerBadgeStatus };
  });

  return {
    totalProficient: 6,
    achievedProficient: competencies.filter((competency) => competency.status === 'Issued').length,
    skilledStatus: issuedBadges.some((badge) => isActiveCredential(badge, WAREHOUSING_SKILLED_TEMPLATE_ID)) ? 'Issued' : 'Locked',
    competencies,
  };
}
