import type {
  BadgeRequest,
  BadgeVerification,
  DashboardSummary,
  LearnerDetails,
  LearnerSummary,
} from "../types.ts";

/**
 * Stable integration boundary for external TESDA information systems.
 *
 * Source adapters own authentication, source queries, and source-specific field
 * names. They must return only the standardized Digital Badging API contracts.
 * React never selects or imports an adapter.
 */
export interface ExternalDataSourceAdapter {
  getTrainingCenterDashboardSummary(
    trainingCenterId: string,
  ): Promise<DashboardSummary | null>;

  getTrainingCenterLearners(
    trainingCenterId: string,
  ): Promise<LearnerSummary[]>;

  getLearnerDetails(learnerId: string): Promise<LearnerDetails | null>;

  getTrainingCenterBadgeRequests(
    trainingCenterId: string,
  ): Promise<BadgeRequest[]>;

  getBadgeVerification(
    verificationId: string,
  ): Promise<BadgeVerification | null>;
}
