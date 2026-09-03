export type DataSourceName = "supabase" | "t2mis-api" | "t2mis-database";

export interface TrainingCenter {
  id: string;
  externalTrainingCenterId: string;
  code: string;
  name: string;
  status: "Active" | "Inactive";
  districtName: string;
  address: { line: string; city: string; province: string };
  contact: { email: string | null; phone: string | null };
}

export interface Qualification {
  id: string;
  externalQualificationId: string;
  code: string;
  title: string;
  pqfLevel: number | null;
  standardType: "CS" | "MCC" | "TR" | null;
  status: "Active" | "Inactive";
}

export interface RegisteredProgram {
  id: string;
  externalProgramId: string;
  trainingCenterId: string;
  ctprNumber: string;
  qualification: Qualification;
  deliveryMode: string;
  status: "Active" | "Inactive" | "Expired";
  registeredAt: string;
  validUntil: string | null;
}

export interface Enrollment {
  id: string;
  externalEnrollmentId: string;
  sourceRecordId: string;
  learnerId: string;
  registeredProgram: RegisteredProgram;
  enrollmentStatus: string;
  completionStatus: string;
  enrolledAt: string;
  completedAt: string | null;
}

export interface CompetencyCompletion {
  id: string;
  externalCompletionId: string;
  learnerId: string;
  enrollmentId: string;
  competency: { id: string; externalCompetencyId: string; code: string; title: string };
  status: "Completed" | "Revoked";
  completedAt: string;
  verifiedBy: string;
}

/** External eligibility evidence. Firebase owns the linked badge template. */
export interface BadgeEligibility {
  id: string;
  externalBadgeDefinitionId: string;
  learnerId: string;
  learnerUli: string;
  enrollmentId: string;
  sourceRecordId: string;
  trainingCenterId: string;
  ctprNumber: string;
  firebaseBadgeTemplateId: string | null;
  badgeType: "Proficient" | "Expert" | "Skilled" | "Master";
  standardType: "CS" | "MCC" | "TR" | null;
  competency: { id: string; code: string; title: string } | null;
  eligible: boolean;
  requiredCompetencyCount: number;
  completedCompetencyCount: number;
  completedCompetencyCodes: string[];
  missingCompetencyCodes: string[];
  evaluatedAt: string;
}

export interface Learner {
  id: string;
  learnerUli: string;
  displayName: string;
  email: string | null;
}

export interface LearnerSummary extends Learner {
  activeEnrollmentCount: number;
  completedCompetencyCount: number;
  eligibleBadgeCount: number;
  enrollments: Enrollment[];
  badgeEligibility: BadgeEligibility[];
}

export interface LearnerDetails extends Learner {
  enrollments: Enrollment[];
  competencyCompletions: CompetencyCompletion[];
  badgeEligibility: BadgeEligibility[];
}

export interface DashboardSummary {
  trainingCenter: TrainingCenter;
  registeredPrograms: RegisteredProgram[];
  counts: {
    learners: number;
    activeEnrollments: number;
    completedCompetencies: number;
    eligibleLearners: number;
  };
}

export interface ApiMeta {
  source: "mock-external-system";
  dataSource: DataSourceName;
  retrievedAt: string;
}

export interface ApiEnvelope<T> {
  data: T;
  meta: ApiMeta;
}
