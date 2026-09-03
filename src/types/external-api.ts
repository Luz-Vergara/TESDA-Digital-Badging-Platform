export type ExternalDataSourceName = 'supabase' | 't2mis-api' | 't2mis-database';
export interface ExternalApiMeta { source: 'mock-external-system'; dataSource: ExternalDataSourceName; retrievedAt: string; }
export interface ExternalApiEnvelope<T> { data: T; meta: ExternalApiMeta; }

export interface ExternalTrainingCenter {
  id: string; externalTrainingCenterId: string; code: string; name: string; status: 'Active' | 'Inactive'; districtName: string;
  address: { line: string; city: string; province: string }; contact: { email: string | null; phone: string | null };
}
export type ExternalStandardType = 'CS' | 'MCC' | 'TR';
export type ExternalBadgeType = 'Proficient' | 'Expert' | 'Skilled' | 'Master';
export interface ExternalQualification { id: string; externalQualificationId: string; code: string; title: string; pqfLevel: number | null; standardType: ExternalStandardType | null; status: 'Active' | 'Inactive'; }
export interface ExternalRegisteredProgram {
  id: string; externalProgramId: string; trainingCenterId: string; ctprNumber: string; qualification: ExternalQualification;
  deliveryMode: string; status: 'Active' | 'Inactive' | 'Expired'; registeredAt: string; validUntil: string | null;
}
export interface ExternalEnrollment {
  id: string; externalEnrollmentId: string; sourceRecordId: string; learnerId: string; registeredProgram: ExternalRegisteredProgram;
  enrollmentStatus: string; completionStatus: string; enrolledAt: string; completedAt: string | null;
}
export interface ExternalBadgeEligibility {
  id: string; externalBadgeDefinitionId: string; learnerId: string; learnerUli: string; enrollmentId: string; sourceRecordId: string; trainingCenterId: string; ctprNumber: string;
  firebaseBadgeTemplateId: string | null; badgeType: ExternalBadgeType; standardType: ExternalStandardType | null;
  competency: { id: string; code: string; title: string } | null;
  eligible: boolean; requiredCompetencyCount: number; completedCompetencyCount: number; completedCompetencyCodes: string[];
  missingCompetencyCodes: string[]; evaluatedAt: string;
}
export interface ExternalLearnerSummary {
  id: string; learnerUli: string; displayName: string; email: string | null; activeEnrollmentCount: number; completedCompetencyCount: number;
  eligibleBadgeCount: number; enrollments: ExternalEnrollment[]; badgeEligibility: ExternalBadgeEligibility[];
}
export interface ExternalCompetencyCompletion {
  id: string; externalCompletionId: string; learnerId: string; enrollmentId: string;
  competency: { id: string; externalCompetencyId: string; code: string; title: string };
  status: 'Completed' | 'Revoked'; completedAt: string; verifiedBy: string;
}
export interface ExternalLearnerDetails {
  id: string; learnerUli: string; displayName: string; email: string | null;
  enrollments: ExternalEnrollment[];
  competencyCompletions: ExternalCompetencyCompletion[];
  badgeEligibility: ExternalBadgeEligibility[];
}
export interface ExternalDashboardSummary {
  trainingCenter: ExternalTrainingCenter; registeredPrograms: ExternalRegisteredProgram[];
  counts: { learners: number; activeEnrollments: number; completedCompetencies: number; eligibleLearners: number; };
}
