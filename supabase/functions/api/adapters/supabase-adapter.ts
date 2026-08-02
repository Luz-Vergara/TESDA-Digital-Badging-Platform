import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import type { ExternalDataSourceAdapter } from "./external-data-source-adapter.ts";
import { supabaseFieldMapper as map } from "../mappers/supabase-field-mapper.ts";
import type {
  BadgeEligibility,
  BadgeRequest,
  BadgeRequestItem,
  BadgeVerification,
  DashboardSummary,
  Enrollment,
  IssuedBadge,
  LearnerDetails,
  LearnerSummary,
  RegisteredProgram,
} from "../types.ts";

type Row = Record<string, any>;

function unique(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

function indexById(rows: Row[]): Map<string, Row> {
  return new Map(rows.map((row) => [row.id, row]));
}

export class SupabaseExternalDataSourceAdapter
  implements ExternalDataSourceAdapter {
  private readonly client: SupabaseClient;

  constructor(url: string, serviceRoleKey: string) {
    this.client = createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  private async rows(
    table: string,
    configure?: (query: any) => any,
  ): Promise<Row[]> {
    let query: any = this.client.from(table).select("*");
    if (configure) query = configure(query);
    const { data, error } = await query;
    if (error) throw new Error(`External source query failed: ${table}`);
    return (data ?? []) as Row[];
  }

  private async one(
    table: string,
    column: string,
    value: string,
  ): Promise<Row | null> {
    const { data, error } = await this.client
      .from(table)
      .select("*")
      .eq(column, value)
      .maybeSingle();
    if (error) throw new Error(`External source query failed: ${table}`);
    return data as Row | null;
  }

  private async getPrograms(
    trainingCenterId: string,
  ): Promise<RegisteredProgram[]> {
    const programRows = await this.rows(
      "registered_programs",
      (query) =>
        query
          .eq("training_center_id", trainingCenterId)
          .order("ctpr_number"),
    );
    if (programRows.length === 0) return [];

    const qualificationRows = await this.rows(
      "qualifications",
      (query) =>
        query.in(
          "id",
          unique(programRows.map((row) => row.qualification_id)),
        ),
    );
    const qualifications = indexById(qualificationRows);

    return programRows.flatMap((row) => {
      const qualification = qualifications.get(row.qualification_id);
      return qualification ? [map.registeredProgram(row, qualification)] : [];
    });
  }

  private async getEnrollments(
    programRows: RegisteredProgram[],
    learnerId?: string,
  ): Promise<Enrollment[]> {
    if (programRows.length === 0) return [];

    let enrollmentRows = await this.rows(
      "enrollments",
      (query) =>
        query
          .in("registered_program_id", programRows.map((row) => row.id))
          .order("enrolled_at"),
    );
    if (learnerId) {
      enrollmentRows = enrollmentRows.filter(
        (row) => row.learner_id === learnerId,
      );
    }
    const programs = new Map(programRows.map((program) => [program.id, program]));

    return enrollmentRows.flatMap((row) => {
      const program = programs.get(row.registered_program_id);
      return program ? [map.enrollment(row, program)] : [];
    });
  }

  private async getEligibility(
    learnerIds: string[],
  ): Promise<BadgeEligibility[]> {
    if (learnerIds.length === 0) return [];

    const eligibilityRows = await this.rows(
      "learner_badge_eligibility",
      (query) => query.in("learner_id", learnerIds),
    );
    const badgeRows = await this.rows(
      "badge_definitions",
      (query) =>
        query.in(
          "id",
          unique(eligibilityRows.map((row) => row.badge_definition_id)),
        ),
    );
    const badges = indexById(badgeRows);

    return eligibilityRows.flatMap((row) => {
      const badge = badges.get(row.badge_definition_id);
      return badge ? [map.badgeEligibility(row, badge)] : [];
    });
  }

  private async getIssuedBadges(
    learnerIds: string[],
  ): Promise<IssuedBadge[]> {
    if (learnerIds.length === 0) return [];

    const issuedRows = await this.rows(
      "issued_badges",
      (query) => query.in("learner_id", learnerIds).order("issued_at"),
    );
    const badgeRows = await this.rows(
      "badge_definitions",
      (query) =>
        query.in(
          "id",
          unique(issuedRows.map((row) => row.badge_definition_id)),
        ),
    );
    const badges = indexById(badgeRows);

    return issuedRows.flatMap((row) => {
      const badge = badges.get(row.badge_definition_id);
      return badge ? [map.issuedBadge(row, badge)] : [];
    });
  }

  async getTrainingCenterDashboardSummary(
    trainingCenterId: string,
  ): Promise<DashboardSummary | null> {
    const centerRow = await this.one("training_centers", "id", trainingCenterId);
    if (!centerRow) return null;

    const programs = await this.getPrograms(trainingCenterId);
    const enrollments = await this.getEnrollments(programs);
    const learnerIds = unique(enrollments.map((row) => row.learnerId));
    const enrollmentIds = enrollments.map((row) => row.id);

    const [completionRows, eligibility, requestRows, issuedRows] =
      await Promise.all([
        enrollmentIds.length
          ? this.rows(
              "learner_competency_completions",
              (query) =>
                query
                  .in("enrollment_id", enrollmentIds)
                  .eq("status", "Completed"),
            )
          : Promise.resolve([]),
        this.getEligibility(learnerIds),
        this.rows(
          "badge_requests",
          (query) => query.eq("training_center_id", trainingCenterId),
        ),
        this.rows(
          "issued_badges",
          (query) => query.eq("training_center_id", trainingCenterId),
        ),
      ]);

    return {
      trainingCenter: map.trainingCenter(centerRow),
      registeredPrograms: programs,
      counts: {
        learners: learnerIds.length,
        activeEnrollments: enrollments.filter(
          (row) => row.enrollmentStatus === "Enrolled",
        ).length,
        completedCompetencies: completionRows.length,
        eligibleLearners: new Set(
          eligibility.filter((row) => row.eligible).map((row) => row.learnerId),
        ).size,
        pendingBadgeRequests: requestRows.filter(
          (row) => row.status === "Pending",
        ).length,
        approvedBadgeRequests: requestRows.filter(
          (row) => row.status === "Approved",
        ).length,
        issuedBadges: issuedRows.filter((row) => row.status === "Active").length,
      },
    };
  }

  async getTrainingCenterLearners(
    trainingCenterId: string,
  ): Promise<LearnerSummary[]> {
    const programs = await this.getPrograms(trainingCenterId);
    const enrollments = await this.getEnrollments(programs);
    const learnerIds = unique(enrollments.map((row) => row.learnerId));
    if (learnerIds.length === 0) return [];

    const [learnerRows, completionRows, eligibility] = await Promise.all([
      this.rows("learners", (query) => query.in("id", learnerIds)),
      this.rows(
        "learner_competency_completions",
        (query) =>
          query.in("learner_id", learnerIds).eq("status", "Completed"),
      ),
      this.getEligibility(learnerIds),
    ]);

    return learnerRows
      .map((learnerRow) => {
        const learner = map.learner(learnerRow);
        const learnerEnrollments = enrollments.filter(
          (row) => row.learnerId === learner.id,
        );
        const learnerEligibility = eligibility.filter(
          (row) => row.learnerId === learner.id,
        );
        return {
          ...learner,
          activeEnrollmentCount: learnerEnrollments.filter(
            (row) => row.enrollmentStatus === "Enrolled",
          ).length,
          completedCompetencyCount: completionRows.filter(
            (row) => row.learner_id === learner.id,
          ).length,
          eligibleBadgeCount: learnerEligibility.filter((row) => row.eligible)
            .length,
          enrollments: learnerEnrollments,
          badgeEligibility: learnerEligibility,
        };
      })
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
  }

  async getLearnerDetails(learnerId: string): Promise<LearnerDetails | null> {
    const learnerRow = await this.one("learners", "id", learnerId);
    if (!learnerRow) return null;

    const enrollmentRows = await this.rows(
      "enrollments",
      (query) => query.eq("learner_id", learnerId),
    );
    const programIds = unique(
      enrollmentRows.map((row) => row.registered_program_id),
    );
    const rawPrograms = programIds.length
      ? await this.rows(
          "registered_programs",
          (query) => query.in("id", programIds),
        )
      : [];
    const qualificationRows = rawPrograms.length
      ? await this.rows(
          "qualifications",
          (query) =>
            query.in(
              "id",
              unique(rawPrograms.map((row) => row.qualification_id)),
            ),
        )
      : [];
    const qualifications = indexById(qualificationRows);
    const programs = rawPrograms.flatMap((row) => {
      const qualification = qualifications.get(row.qualification_id);
      return qualification ? [map.registeredProgram(row, qualification)] : [];
    });
    const programMap = new Map(programs.map((program) => [program.id, program]));
    const enrollments = enrollmentRows.flatMap((row) => {
      const program = programMap.get(row.registered_program_id);
      return program ? [map.enrollment(row, program)] : [];
    });

    const [completionRows, eligibility, issuedBadges] = await Promise.all([
      this.rows(
        "learner_competency_completions",
        (query) => query.eq("learner_id", learnerId).order("completed_at"),
      ),
      this.getEligibility([learnerId]),
      this.getIssuedBadges([learnerId]),
    ]);
    const competencyRows = completionRows.length
      ? await this.rows(
          "competencies",
          (query) =>
            query.in(
              "id",
              unique(completionRows.map((row) => row.competency_id)),
            ),
        )
      : [];
    const competencies = indexById(competencyRows);

    return {
      ...map.learner(learnerRow),
      enrollments,
      competencyCompletions: completionRows.flatMap((row) => {
        const competency = competencies.get(row.competency_id);
        return competency ? [map.competencyCompletion(row, competency)] : [];
      }),
      badgeEligibility: eligibility,
      issuedBadges,
    };
  }

  async getTrainingCenterBadgeRequests(
    trainingCenterId: string,
  ): Promise<BadgeRequest[]> {
    const requestRows = await this.rows(
      "badge_requests",
      (query) =>
        query
          .eq("training_center_id", trainingCenterId)
          .order("submitted_at", { ascending: false }),
    );
    if (requestRows.length === 0) return [];

    const requestIds = requestRows.map((row) => row.id);
    const itemRows = await this.rows(
      "badge_request_items",
      (query) => query.in("badge_request_id", requestIds),
    );
    const [learnerRows, badgeRows, issuedRows] = await Promise.all([
      this.rows(
        "learners",
        (query) =>
          query.in("id", unique(itemRows.map((row) => row.learner_id))),
      ),
      this.rows(
        "badge_definitions",
        (query) =>
          query.in(
            "id",
            unique(requestRows.map((row) => row.badge_definition_id)),
          ),
      ),
      itemRows.length
        ? this.rows(
            "issued_badges",
            (query) =>
              query.in(
                "badge_request_item_id",
                itemRows.map((row) => row.id),
              ),
          )
        : Promise.resolve([]),
    ]);
    const learners = indexById(learnerRows);
    const badges = indexById(badgeRows);
    const issuedByItem = new Map(
      issuedRows.map((row) => [row.badge_request_item_id, row]),
    );

    return requestRows.flatMap((requestRow) => {
      const badge = badges.get(requestRow.badge_definition_id);
      if (!badge) return [];
      const items: BadgeRequestItem[] = itemRows
        .filter((row) => row.badge_request_id === requestRow.id)
        .flatMap((itemRow) => {
          const learner = learners.get(itemRow.learner_id);
          if (!learner) return [];
          const issuedRow = issuedByItem.get(itemRow.id);
          return [{
            id: itemRow.id,
            learnerId: learner.id,
            learnerName: learner.display_name,
            enrollmentId: itemRow.enrollment_id,
            eligibilityStatus: itemRow.eligibility_status,
            issuedBadge: issuedRow ? map.issuedBadge(issuedRow, badge) : null,
          }];
        });

      return [{
        id: requestRow.id,
        externalBadgeRequestId: requestRow.id,
        requestNumber: requestRow.request_number,
        trainingCenterId: requestRow.training_center_id,
        badgeDefinition: {
          id: badge.id,
          code: badge.badge_code,
          name: badge.name,
          badgeType: badge.badge_type,
        },
        status: requestRow.status,
        submittedAt: requestRow.submitted_at,
        reviewedAt: requestRow.reviewed_at ?? null,
        reviewRemarks: requestRow.review_remarks ?? null,
        items,
      }];
    });
  }

  async getBadgeVerification(
    verificationId: string,
  ): Promise<BadgeVerification | null> {
    const issued = await this.one(
      "issued_badges",
      "verification_id",
      verificationId,
    );
    if (!issued) return null;

    const [badge, learner, center] = await Promise.all([
      this.one("badge_definitions", "id", issued.badge_definition_id),
      this.one("learners", "id", issued.learner_id),
      this.one("training_centers", "id", issued.training_center_id),
    ]);
    if (!badge || !learner || !center) return null;

    return map.badgeVerification(issued, badge, learner, center);
  }
}
