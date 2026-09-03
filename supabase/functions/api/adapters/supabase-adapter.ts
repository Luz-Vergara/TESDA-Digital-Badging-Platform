import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2.111.0";
import type { ExternalDataSourceAdapter } from "./external-data-source-adapter.ts";
import { supabaseFieldMapper as map } from "../mappers/supabase-field-mapper.ts";
import type { BadgeEligibility, DashboardSummary, Enrollment, LearnerDetails, LearnerSummary, RegisteredProgram } from "../types.ts";

type Row = Record<string, any>;
const unique = (values: Array<string | null | undefined>) => [...new Set(values.filter((value): value is string => Boolean(value)))];
const byId = (rows: Row[]) => new Map(rows.map((row) => [row.id as string, row]));

/** Service-role adapter. Authorization is enforced in the Edge Function before it is created. */
export class SupabaseExternalDataSourceAdapter implements ExternalDataSourceAdapter {
  private readonly client: SupabaseClient;

  constructor(url: string, serviceRoleKey: string) {
    this.client = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  }

  private async rows(table: string, configure?: (query: any) => any): Promise<Row[]> {
    let query: any = this.client.from(table).select("*");
    if (configure) query = configure(query);
    const { data, error } = await query;
    if (error) throw new Error(`External source query failed: ${table}`);
    return (data ?? []) as Row[];
  }

  private async one(table: string, column: string, value: string): Promise<Row | null> {
    const { data, error } = await this.client.from(table).select("*").eq(column, value).maybeSingle();
    if (error) throw new Error(`External source query failed: ${table}`);
    return data as Row | null;
  }

  private async programs(trainingCenterId: string): Promise<RegisteredProgram[]> {
    const rows = await this.rows("registered_programs", (query) => query.eq("training_center_id", trainingCenterId).order("ctpr_number"));
    if (!rows.length) return [];
    const qualifications = byId(await this.rows("qualifications", (query) => query.in("id", unique(rows.map((row) => row.qualification_id)))));
    return rows.flatMap((row) => {
      const qualification = qualifications.get(row.qualification_id);
      return qualification ? [map.registeredProgram(row, qualification)] : [];
    });
  }

  private async enrollments(programs: RegisteredProgram[], learnerId?: string): Promise<Enrollment[]> {
    if (!programs.length) return [];
    const rows = await this.rows("enrollments", (query) => query.in("registered_program_id", programs.map((program) => program.id)).order("enrolled_at"));
    const programById = new Map(programs.map((program) => [program.id, program]));
    return rows.filter((row) => !learnerId || row.learner_id === learnerId).flatMap((row) => {
      const program = programById.get(row.registered_program_id);
      return program ? [map.enrollment(row, program)] : [];
    });
  }

  private async eligibility(learners: Row[], enrollments: Enrollment[]): Promise<BadgeEligibility[]> {
    if (!learners.length || !enrollments.length) return [];
    const raw = await this.rows("learner_badge_eligibility", (query) => query.in("learner_id", learners.map((learner) => learner.id)));
    const definitions = byId(await this.rows("badge_definitions", (query) => query.in("id", unique(raw.map((row) => row.badge_definition_id)))));
    const learnerById = new Map(learners.map((learner) => [learner.id, map.learner(learner)]));
    const enrollmentById = new Map(enrollments.map((enrollment) => [enrollment.id, enrollment]));
    return raw.flatMap((row) => {
      const learner = learnerById.get(row.learner_id);
      const enrollment = enrollmentById.get(row.enrollment_id);
      const definition = definitions.get(row.badge_definition_id);
      return learner && enrollment && definition ? [map.badgeEligibility({ ...row, firebase_badge_template_id: definition.firebase_badge_template_id }, learner, enrollment)] : [];
    });
  }

  async getTrainingCenterDashboardSummary(trainingCenterId: string): Promise<DashboardSummary | null> {
    const center = await this.one("training_centers", "id", trainingCenterId);
    if (!center) return null;
    const registeredPrograms = await this.programs(trainingCenterId);
    const allEnrollments = await this.enrollments(registeredPrograms);
    const learnerRows = allEnrollments.length ? await this.rows("learners", (query) => query.in("id", unique(allEnrollments.map((item) => item.learnerId)))) : [];
    const eligibility = await this.eligibility(learnerRows, allEnrollments);
    const enrollmentIds = allEnrollments.map((item) => item.id);
    const completions = enrollmentIds.length ? await this.rows("learner_competency_completions", (query) => query.in("enrollment_id", enrollmentIds).eq("status", "Completed")) : [];
    return {
      trainingCenter: map.trainingCenter(center), registeredPrograms,
      counts: {
        learners: learnerRows.length,
        activeEnrollments: allEnrollments.filter((item) => item.enrollmentStatus === "Enrolled").length,
        completedCompetencies: completions.length,
        eligibleLearners: new Set(eligibility.filter((item) => item.eligible).map((item) => item.learnerId)).size,
      },
    };
  }

  async getTrainingCenterLearners(trainingCenterId: string): Promise<LearnerSummary[]> {
    const programs = await this.programs(trainingCenterId);
    const allEnrollments = await this.enrollments(programs);
    const rows = allEnrollments.length ? await this.rows("learners", (query) => query.in("id", unique(allEnrollments.map((item) => item.learnerId)))) : [];
    const [allEligibility, completions] = await Promise.all([
      this.eligibility(rows, allEnrollments),
      rows.length ? this.rows("learner_competency_completions", (query) => query.in("learner_id", rows.map((row) => row.id)).eq("status", "Completed")) : Promise.resolve([]),
    ]);
    return rows.map((row) => {
      const learner = map.learner(row);
      const enrollments = allEnrollments.filter((item) => item.learnerId === learner.id);
      const badgeEligibility = allEligibility.filter((item) => item.learnerId === learner.id);
      return {
        ...learner, enrollments, badgeEligibility,
        activeEnrollmentCount: enrollments.filter((item) => item.enrollmentStatus === "Enrolled").length,
        completedCompetencyCount: completions.filter((item) => item.learner_id === learner.id).length,
        eligibleBadgeCount: badgeEligibility.filter((item) => item.eligible).length,
      };
    }).sort((a, b) => a.displayName.localeCompare(b.displayName));
  }

  async learnerBelongsToTrainingCenter(learnerUli: string, trainingCenterId: string): Promise<boolean> {
    const learner = await this.one("learners", "learner_uli", learnerUli);
    if (!learner) return false;
    const programs = await this.programs(trainingCenterId);
    const rows = programs.length ? await this.rows("enrollments", (query) => query.eq("learner_id", learner.id).in("registered_program_id", programs.map((program) => program.id))) : [];
    return rows.length > 0;
  }

  async getLearnerDetails(learnerUli: string): Promise<LearnerDetails | null> {
    const learnerRow = await this.one("learners", "learner_uli", learnerUli);
    if (!learnerRow) return null;
    const enrollmentRows = await this.rows("enrollments", (query) => query.eq("learner_id", learnerRow.id));
    const rawPrograms = enrollmentRows.length ? await this.rows("registered_programs", (query) => query.in("id", unique(enrollmentRows.map((row) => row.registered_program_id)))) : [];
    const qualifications = rawPrograms.length ? byId(await this.rows("qualifications", (query) => query.in("id", unique(rawPrograms.map((row) => row.qualification_id))))) : new Map<string, Row>();
    const programs = rawPrograms.flatMap((row) => {
      const qualification = qualifications.get(row.qualification_id);
      return qualification ? [map.registeredProgram(row, qualification)] : [];
    });
    const programById = new Map(programs.map((program) => [program.id, program]));
    const enrollments = enrollmentRows.flatMap((row) => {
      const program = programById.get(row.registered_program_id);
      return program ? [map.enrollment(row, program)] : [];
    });
    const [completionRows, eligibility] = await Promise.all([
      this.rows("learner_competency_completions", (query) => query.eq("learner_id", learnerRow.id).order("completed_at")),
      this.eligibility([learnerRow], enrollments),
    ]);
    const competencies = completionRows.length ? byId(await this.rows("competencies", (query) => query.in("id", unique(completionRows.map((row) => row.competency_id))))) : new Map<string, Row>();
    return {
      ...map.learner(learnerRow), enrollments, badgeEligibility: eligibility,
      competencyCompletions: completionRows.flatMap((row) => {
        const competency = competencies.get(row.competency_id);
        return competency ? [map.competencyCompletion(row, competency)] : [];
      }),
    };
  }
}
