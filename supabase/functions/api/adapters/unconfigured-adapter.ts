import type { ExternalDataSourceAdapter } from "./external-data-source-adapter.ts";
import type {
  DashboardSummary,
  LearnerDetails,
  LearnerSummary,
} from "../types.ts";

/**
 * Documented extension point for a future authorized T2MIS integration.
 *
 * Deliberately contains no T2MIS URL, schema, credentials, field assumptions,
 * authentication logic, or connectivity. Replace it only after an approved
 * source contract is available.
 */
export class UnconfiguredExternalAdapter implements ExternalDataSourceAdapter {
  constructor(private readonly adapterName: "t2mis-api" | "t2mis-database") {}

  private unavailable(): never {
    throw new Error(`${this.adapterName} adapter is not configured`);
  }

  getTrainingCenterDashboardSummary(
    _trainingCenterId: string,
  ): Promise<DashboardSummary | null> {
    return this.unavailable();
  }

  getTrainingCenterLearners(
    _trainingCenterId: string,
  ): Promise<LearnerSummary[]> {
    return this.unavailable();
  }

  getLearnerDetails(_learnerUli: string): Promise<LearnerDetails | null> {
    return this.unavailable();
  }

  learnerBelongsToTrainingCenter(
    _learnerUli: string,
    _trainingCenterId: string,
  ): Promise<boolean> {
    return this.unavailable();
  }
}
