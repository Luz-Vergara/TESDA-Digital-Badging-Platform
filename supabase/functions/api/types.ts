export type DataSourceName = "supabase" | "t2mis-api" | "t2mis-database";

export interface TrainingCenter {
  id: string;
  externalTrainingCenterId: string;
  code: string;
  name: string;
  status: "Active" | "Inactive";
  districtName: string;
  address: {
    line: string;
    city: string;
    province: string;
  };
  contact: {
    email: string | null;
    phone: string | null;
  };
}

export interface Qualification {
  id: string;
  externalQualificationId: string;
  code: string;
  title: string;
  pqfLevel: number | null;
  status: "Active" | "Inactive";
}

export interface RegisteredProgram {
  id: string;
  externalProgramId: string;
  trainingCenterId: string;
  registrationCode: string;
  qualification: Qualification;
  deliveryMode: string;
  status: "Active" | "Inactive" | "Expired";
  registeredAt: string;
  validUntil: string | null;
}

export interface Enrollment {
  id: string;
  externalEnrollmentId: string;
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
  competency: {
    id: string;
    externalCompetencyId: string;
    code: string;
    title: string;
  };
  status: "Completed" | "Revoked";
  completedAt: string;
  verifiedBy: string;
}

export interface BadgeEligibility {
  learnerId: string;
  enrollmentId: string;
  badgeDefinition: {
    id: string;
    code: string;
    name: string;
    badgeType: string;
  };
  eligible: boolean;
  requiredCompetencyCount: number;
  completedCompetencyCount: number;
  missingCompetencyCodes: string[];
  evaluatedAt: string;
}

export interface Learner {
  id: string;
  externalLearnerId: string;
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

export interface IssuedBadge {
  id: string;
  externalIssuedBadgeId: string;
  verificationId: string;
  credentialId: string;
  learnerId: string;
  trainingCenterId: string;
  badgeDefinitionId: string;
  badgeName: string;
  badgeType: string;
  status: "Active" | "Expired" | "Revoked";
  issuedAt: string;
  expiresAt: string | null;
}

export interface LearnerDetails extends Learner {
  enrollments: Enrollment[];
  competencyCompletions: CompetencyCompletion[];
  badgeEligibility: BadgeEligibility[];
  issuedBadges: IssuedBadge[];
}

export interface BadgeRequestItem {
  id: string;
  learnerId: string;
  learnerName: string;
  enrollmentId: string;
  eligibilityStatus: "Eligible" | "Not Eligible";
  issuedBadge: IssuedBadge | null;
}

export interface BadgeRequest {
  id: string;
  externalBadgeRequestId: string;
  requestNumber: string;
  trainingCenterId: string;
  badgeDefinition: {
    id: string;
    code: string;
    name: string;
    badgeType: string;
  };
  status: "Pending" | "Approved" | "Rejected";
  submittedAt: string;
  reviewedAt: string | null;
  reviewRemarks: string | null;
  items: BadgeRequestItem[];
}

export interface DashboardSummary {
  trainingCenter: TrainingCenter;
  registeredPrograms: RegisteredProgram[];
  counts: {
    learners: number;
    activeEnrollments: number;
    completedCompetencies: number;
    eligibleLearners: number;
    pendingBadgeRequests: number;
    approvedBadgeRequests: number;
    issuedBadges: number;
  };
}

export interface BadgeVerification {
  verificationId: string;
  credentialId: string;
  status: "Active" | "Expired" | "Revoked";
  badge: {
    id: string;
    code: string;
    name: string;
    badgeType: string;
    description: string;
    criteria: string;
  };
  learner: {
    externalLearnerId: string;
    displayName: string;
  };
  issuer: {
    trainingCenterId: string;
    name: string;
  };
  issuedAt: string;
  expiresAt: string | null;
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
