import type {
  BadgeEligibility,
  CompetencyCompletion,
  Enrollment,
  Learner,
  Qualification,
  RegisteredProgram,
  TrainingCenter,
} from "../types.ts";

type Row = Record<string, unknown>;
const text = (value: unknown) => typeof value === "string" ? value : "";

export const supabaseFieldMapper = {
  trainingCenter(row: Row): TrainingCenter {
    return {
      id: text(row.id), externalTrainingCenterId: text(row.id), code: text(row.center_code),
      name: text(row.name), status: text(row.status) as TrainingCenter["status"], districtName: text(row.district_name),
      address: { line: text(row.address_line), city: text(row.city), province: text(row.province) },
      contact: { email: typeof row.contact_email === "string" ? row.contact_email : null, phone: typeof row.contact_phone === "string" ? row.contact_phone : null },
    };
  },
  qualification(row: Row): Qualification {
    return {
      id: text(row.id), externalQualificationId: text(row.id), code: text(row.qualification_code), title: text(row.title),
      pqfLevel: typeof row.pqf_level === "number" ? row.pqf_level : null,
      status: text(row.status) as Qualification["status"],
    };
  },
  registeredProgram(row: Row, qualification: Row): RegisteredProgram {
    return {
      id: text(row.id), externalProgramId: text(row.id), trainingCenterId: text(row.training_center_id),
      ctprNumber: text(row.ctpr_number), qualification: this.qualification(qualification), deliveryMode: text(row.delivery_mode),
      status: text(row.status) as RegisteredProgram["status"], registeredAt: text(row.registered_at),
      validUntil: typeof row.valid_until === "string" ? row.valid_until : null,
    };
  },
  learner(row: Row): Learner {
    return {
      id: text(row.id), learnerUli: text(row.learner_uli || row.external_learner_id), displayName: text(row.display_name),
      email: typeof row.email === "string" ? row.email : null,
    };
  },
  enrollment(row: Row, program: RegisteredProgram): Enrollment {
    return {
      id: text(row.id), externalEnrollmentId: text(row.id), sourceRecordId: text(row.source_record_id || row.id),
      learnerId: text(row.learner_id), registeredProgram: program, enrollmentStatus: text(row.enrollment_status),
      completionStatus: text(row.completion_status), enrolledAt: text(row.enrolled_at),
      completedAt: typeof row.completed_at === "string" ? row.completed_at : null,
    };
  },
  competencyCompletion(row: Row, competency: Row): CompetencyCompletion {
    return {
      id: text(row.id), externalCompletionId: text(row.id), learnerId: text(row.learner_id), enrollmentId: text(row.enrollment_id),
      competency: { id: text(competency.id), externalCompetencyId: text(competency.id), code: text(competency.competency_code), title: text(competency.title) },
      status: text(row.status) as CompetencyCompletion["status"], completedAt: text(row.completed_at), verifiedBy: text(row.verified_by),
    };
  },
  badgeEligibility(row: Row, learner: Learner, enrollment: Enrollment): BadgeEligibility {
    return {
      id: `${enrollment.id}:${text(row.badge_definition_id)}`,
      learnerId: learner.id, learnerUli: learner.learnerUli, enrollmentId: enrollment.id,
      sourceRecordId: enrollment.sourceRecordId, trainingCenterId: enrollment.registeredProgram.trainingCenterId,
      ctprNumber: enrollment.registeredProgram.ctprNumber,
      firebaseBadgeTemplateId: typeof row.firebase_badge_template_id === "string" && row.firebase_badge_template_id ? row.firebase_badge_template_id : null,
      eligible: row.eligible === true, requiredCompetencyCount: Number(row.required_competency_count || 0),
      completedCompetencyCount: Number(row.completed_competency_count || 0),
      missingCompetencyCodes: Array.isArray(row.missing_competency_codes) ? row.missing_competency_codes.filter((value): value is string => typeof value === "string") : [],
      evaluatedAt: text(row.evaluated_at),
    };
  },
};
