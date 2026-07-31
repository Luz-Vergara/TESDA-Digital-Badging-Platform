import type {
  BadgeEligibility,
  BadgeVerification,
  CompetencyCompletion,
  Enrollment,
  IssuedBadge,
  Learner,
  Qualification,
  RegisteredProgram,
  TrainingCenter,
} from "../types.ts";

type Row = Record<string, any>;

/**
 * Supabase-specific field mapping.
 *
 * A future T2MIS adapter must provide its own mapper. For example, that mapper
 * may translate `learner_id`, `uli`, or `learner_number` to the standardized
 * `externalLearnerId` without changing API routes or React types.
 */
export const supabaseFieldMapper = {
  trainingCenter(row: Row): TrainingCenter {
    return {
      id: row.id,
      externalTrainingCenterId: row.id,
      code: row.center_code,
      name: row.name,
      status: row.status,
      districtName: row.district_name,
      address: {
        line: row.address_line,
        city: row.city,
        province: row.province,
      },
      contact: {
        email: row.contact_email ?? null,
        phone: row.contact_phone ?? null,
      },
    };
  },

  qualification(row: Row): Qualification {
    return {
      id: row.id,
      externalQualificationId: row.id,
      code: row.qualification_code,
      title: row.title,
      pqfLevel: row.pqf_level ?? null,
      status: row.status,
    };
  },

  registeredProgram(row: Row, qualification: Row): RegisteredProgram {
    return {
      id: row.id,
      externalProgramId: row.id,
      trainingCenterId: row.training_center_id,
      registrationCode: row.registration_code,
      qualification: this.qualification(qualification),
      deliveryMode: row.delivery_mode,
      status: row.status,
      registeredAt: row.registered_at,
      validUntil: row.valid_until ?? null,
    };
  },

  learner(row: Row): Learner {
    return {
      id: row.id,
      externalLearnerId: row.external_learner_id,
      displayName: row.display_name,
      email: row.email ?? null,
    };
  },

  enrollment(row: Row, program: RegisteredProgram): Enrollment {
    return {
      id: row.id,
      externalEnrollmentId: row.id,
      learnerId: row.learner_id,
      registeredProgram: program,
      enrollmentStatus: row.enrollment_status,
      completionStatus: row.completion_status,
      enrolledAt: row.enrolled_at,
      completedAt: row.completed_at ?? null,
    };
  },

  competencyCompletion(row: Row, competency: Row): CompetencyCompletion {
    return {
      id: row.id,
      externalCompletionId: row.id,
      learnerId: row.learner_id,
      enrollmentId: row.enrollment_id,
      competency: {
        id: competency.id,
        externalCompetencyId: competency.id,
        code: competency.competency_code,
        title: competency.title,
      },
      status: row.status,
      completedAt: row.completed_at,
      verifiedBy: row.verified_by,
    };
  },

  badgeEligibility(row: Row, badge: Row): BadgeEligibility {
    return {
      learnerId: row.learner_id,
      enrollmentId: row.enrollment_id,
      badgeDefinition: {
        id: badge.id,
        code: badge.badge_code,
        name: badge.name,
        badgeType: badge.badge_type,
      },
      eligible: row.eligible,
      requiredCompetencyCount: row.required_competency_count,
      completedCompetencyCount: row.completed_competency_count,
      missingCompetencyCodes: row.missing_competency_codes ?? [],
      evaluatedAt: row.evaluated_at,
    };
  },

  issuedBadge(row: Row, badge: Row): IssuedBadge {
    return {
      id: row.id,
      externalIssuedBadgeId: row.id,
      verificationId: row.verification_id,
      credentialId: row.credential_id,
      learnerId: row.learner_id,
      trainingCenterId: row.training_center_id,
      badgeDefinitionId: row.badge_definition_id,
      badgeName: badge.name,
      badgeType: badge.badge_type,
      status: row.status,
      issuedAt: row.issued_at,
      expiresAt: row.expires_at ?? null,
    };
  },

  badgeVerification(
    issued: Row,
    badge: Row,
    learner: Row,
    trainingCenter: Row,
  ): BadgeVerification {
    return {
      verificationId: issued.verification_id,
      credentialId: issued.credential_id,
      status: issued.status,
      badge: {
        id: badge.id,
        code: badge.badge_code,
        name: badge.name,
        badgeType: badge.badge_type,
        description: badge.description,
        criteria: badge.criteria,
      },
      learner: {
        externalLearnerId: learner.external_learner_id,
        displayName: learner.display_name,
      },
      issuer: {
        trainingCenterId: trainingCenter.id,
        name: trainingCenter.name,
      },
      issuedAt: issued.issued_at,
      expiresAt: issued.expires_at ?? null,
    };
  },
};
