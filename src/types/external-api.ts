export type ExternalDataSourceName =
  | 'supabase'
  | 't2mis-api'
  | 't2mis-database';

export interface ExternalApiMeta {
  source: 'mock-external-system';
  dataSource: ExternalDataSourceName;
  retrievedAt: string;
}

export interface ExternalApiEnvelope<T> {
  data: T;
  meta: ExternalApiMeta;
}

export interface ExternalTrainingCenter {
  id: string;
  externalTrainingCenterId: string;
  code: string;
  name: string;
  status: 'Active' | 'Inactive';
  districtName: string;
  address: { line: string; city: string; province: string };
  contact: { email: string | null; phone: string | null };
}

export interface ExternalQualification {
  id: string;
  externalQualificationId: string;
  code: string;
  title: string;
  pqfLevel: number | null;
  status: 'Active' | 'Inactive';
}

export interface ExternalRegisteredProgram {
  id: string;
  externalProgramId: string;
  trainingCenterId: string;
  registrationCode: string;
  qualification: ExternalQualification;
  deliveryMode: string;
  status: 'Active' | 'Inactive' | 'Expired';
  registeredAt: string;
  validUntil: string | null;
}

export interface ExternalEnrollment {
  id: string;
  externalEnrollmentId: string;
  learnerId: string;
  registeredProgram: ExternalRegisteredProgram;
  enrollmentStatus: string;
  completionStatus: string;
  enrolledAt: string;
  completedAt: string | null;
}

export interface ExternalBadgeEligibility {
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

export interface ExternalLearnerSummary {
  id: string;
  externalLearnerId: string;
  displayName: string;
  email: string | null;
  activeEnrollmentCount: number;
  completedCompetencyCount: number;
  eligibleBadgeCount: number;
  enrollments: ExternalEnrollment[];
  badgeEligibility: ExternalBadgeEligibility[];
}

export interface ExternalCompetencyCompletion {
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
  status: 'Completed' | 'Revoked';
  completedAt: string;
  verifiedBy: string;
}

export interface ExternalIssuedBadge {
  id: string;
  externalIssuedBadgeId: string;
  verificationId: string;
  credentialId: string;
  learnerId: string;
  trainingCenterId: string;
  badgeDefinitionId: string;
  badgeName: string;
  badgeType: string;
  status: 'Active' | 'Expired' | 'Revoked';
  issuedAt: string;
  expiresAt: string | null;
}

export interface ExternalLearnerDetails {
  id: string;
  externalLearnerId: string;
  displayName: string;
  email: string | null;
  enrollments: ExternalEnrollment[];
  competencyCompletions: ExternalCompetencyCompletion[];
  badgeEligibility: ExternalBadgeEligibility[];
  issuedBadges: ExternalIssuedBadge[];
}

export interface ExternalBadgeRequest {
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
  status: 'Pending' | 'Approved' | 'Rejected';
  submittedAt: string;
  reviewedAt: string | null;
  reviewRemarks: string | null;
  items: Array<{
    id: string;
    learnerId: string;
    learnerName: string;
    enrollmentId: string;
    eligibilityStatus: 'Eligible' | 'Not Eligible';
    issuedBadge: ExternalIssuedBadge | null;
  }>;
}

export interface ExternalDashboardSummary {
  trainingCenter: ExternalTrainingCenter;
  registeredPrograms: ExternalRegisteredProgram[];
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

export interface ExternalBadgeVerification {
  verificationId: string;
  credentialId: string;
  status: 'Active' | 'Expired' | 'Revoked';
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
