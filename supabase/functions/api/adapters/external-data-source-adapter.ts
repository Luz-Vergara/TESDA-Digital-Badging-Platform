import type { DashboardSummary, LearnerDetails, LearnerSummary } from "../types.ts";

/**
 * Server-only integration boundary. Adapters own source-specific credentials
 * and fields; callers receive the stable Digital Badging external-record API.
 */
export interface ExternalDataSourceAdapter {
  getTrainingCenterDashboardSummary(trainingCenterId: string): Promise<DashboardSummary | null>;
  getTrainingCenterLearners(trainingCenterId: string): Promise<LearnerSummary[]>;
  getLearnerDetails(learnerUli: string): Promise<LearnerDetails | null>;
  learnerBelongsToTrainingCenter(learnerUli: string, trainingCenterId: string): Promise<boolean>;
}
