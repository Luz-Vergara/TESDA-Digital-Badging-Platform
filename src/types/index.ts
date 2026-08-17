/** Badge types available when creating or updating frontend records. */
export type BadgeType = 'Proficient' | 'Skilled';

/** Standards are classified independently from badge type. */
export type StandardType = 'CS' | 'MCC' | 'TR';

/**
 * Values written by earlier versions of the application. Keep this separate
 * from BadgeType so legacy Firestore documents can be displayed safely without
 * making Expert or Master selectable in current UI flows.
 */
export type LegacyBadgeType = 'Expert' | 'Master';
export type PersistedBadgeType = BadgeType | LegacyBadgeType;
export type BadgeStatus = 
  | 'Active' 
  | 'Expired' 
  | 'Revoked' 
  | 'Pending Approval'
  | 'Submitted to CO'
  | 'Under CO Review'
  | 'Approved for Badge ID Generation'
  | 'Badge ID Generated'
  | 'Forwarded to District Office'
  | 'Published to Learner Wallet'
  | 'Returned by CO'
  | 'Returned by District Office';

export interface BadgeMetadata {
  id: string;
  programName: string;
  badgeType: PersistedBadgeType;
  description: string;
  issuer: string;
  badgeHolder: string;
  criteria: string;
  issuanceDate: string;
  verificationId: string;
  validity: string;
  alignment: string;
  tags: string[];
  standards: string[];
  evidenceUrl?: string;
  status: BadgeStatus;
  termsOfUse: string;
  hierarchyLevel: number;
  badgeId?: string; // ID of the template it originated from
  pathway?: string; // Added to distinguish RPL vs Standard
  qualificationName?: string;
  qualificationCode?: string;
  badgeName?: string;
  template?: BadgeTemplate;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'Learner' | 'Admin' | 'TrainingCenter' | 'AssessmentCenter' | 'DistrictOffice' | 'Employer' | 'qso_admin' | 'co_admin' | 'icto_admin';
  office?: string;
  assignedDistrictId?: string;
}

export interface Learner {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  contactNumber: string;
  qualification: string;
  enrollmentDate: string;
  trainingCenterId: string;
  trainingCenterName: string;
  status: 'Applied' | 'Enrolled' | 'Completed' | 'Dropped';
  badgeStatus?: 'Active' | 'Pending' | 'None';
  createdAt: any;
}

export interface Organization {
  id: string;
  name: string;
  type: 'DistrictOffice' | 'TrainingCenter' | 'AssessmentCenter';
  email: string;
  location: string;
  assignedDistrictId?: string; // For Training/Assessment Centers
  status: 'Active' | 'Inactive';
  createdAt: any;
  submissionCount?: number;
  approvalRate?: number;
}

export interface FieldPosition {
  x: number;
  y: number;
  fontSize?: string;
  color?: string;
  enabled?: boolean;
}

export interface BadgeTemplate {
  id: string;
  /** Optional reference to the temporary QSO demo standard selected at authoring time. */
  standardId?: string;
  badgeName: string;
  qualificationName: string;
  qualificationCode: string;
  badgeType: BadgeType;
  /** Optional so templates created before Phase 1 remain readable. */
  standardType?: StandardType;
  credentialLevel: 'Unit of Competency' | 'Full Qualification / Certificate of Training' | 'Certificate of Competency' | 'National Certificate';
  relatedCompetency: string;
  description: string;
  criteria: string;
  validityMonths: number;
  alignment: string;
  tags: string[];
  issuableBy: ('TrainingCenter' | 'AssessmentCenter' | 'CertificationOffice')[];
  requiresApproval: boolean;
  displayOrder: number;
  hierarchyVisible: boolean;
  status: 'Approved' | 'Draft' | 'Archived' | 'Active';
  imageUrl?: string;
  badgeIdPrefix?: string;
  issuingSeries?: string;
  templateConfig?: {
    fitMode?: 'cover' | 'contain' | 'fill';
    name?: FieldPosition;
    date?: FieldPosition;
    validUntil?: FieldPosition;
    id?: FieldPosition;
    level?: FieldPosition;
    qualificationTitle?: FieldPosition;
    qualificationCode?: FieldPosition;
    qr?: {
      x: number;
      y: number;
      size?: number;
      enabled?: boolean;
    };
  };
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
  timestamp: any;
  ipAddress?: string;
}

export interface BadgeIssuanceRequest {
  id: string;
  learnerId: string;
  learnerName: string;
  learnerEmail: string;
  badgeId: string;
  badgeName: string;
  badgeType: BadgeType;
  programName: string;
  issuerId: string;
  issuerName: string;
  issuerType: 'TrainingCenter' | 'AssessmentCenter';
  submittedBy: string;
  submittedByName: string;
  submittedAt: any;
  districtOfficeId: string;
  status: BadgeStatus | 'Pending' | 'Approved' | 'Rejected';
  rejectionComment?: string;
  approvedBy?: string;
  approvedAt?: any;
  criteria?: string;
  evidenceUrl?: string;
  remarks?: string;
  expiryDate?: any;
  pathway?: string;
  qualificationName?: string;
}

export interface ProgramOffering {
  id: string;
  trainingCenterId: string;
  trainingCenterName: string;
  programTitle: string;
  programType: 'Unit of Competency' | 'Cluster of Competencies' | 'Full Qualification' | 'Micro-Credential';
  qualificationName: string;
  qualificationCode: string;
  badgeTemplateId: string;
  badgeType: BadgeType;
  deliveryMode: 'Institution-Based' | 'Enterprise-Based' | 'Online' | 'Blended';
  status: 'Draft' | 'Active' | 'Inactive' | 'Archived';
  createdAt: any;
  updatedAt: any;
}

export interface ProgramBatch {
  id: string;
  programOfferingId: string;
  trainingCenterId: string;
  badgeTemplateId: string; // Added to carry through
  batchName: string;
  startDate: string;
  endDate: string;
  trainerName: string;
  maxSlots: number;
  status: 'Open' | 'Ongoing' | 'Completed' | 'Cancelled';
  createdAt: any;
  updatedAt: any;
}

export interface Enrollment {
  id: string;
  learnerId: string;
  learnerName: string;
  learnerEmail: string;
  trainingCenterId: string;
  programOfferingId: string;
  programBatchId: string;
  badgeTemplateId: string; // Added to carry through
  enrollmentStatus: 'Applied' | 'Accepted' | 'Enrolled' | 'Completed' | 'Dropped' | 'Withdrawn';
  completionStatus: 'Not Started' | 'In Progress' | 'Completed' | 'For Assessment';
  badgeRequestStatus?: 'Not Requested' | 'Pending Review' | 'Approved' | 'Rejected';
  dateApplied: any;
  dateEnrolled?: any;
  dateCompleted?: any;
  createdAt: any;
  updatedAt: any;
}

export interface UCCompletion {
  id: string;
  enrollmentId: string;
  learnerId: string;
  trainingCenterId: string;
  programOfferingId: string;
  programBatchId: string;
  badgeTemplateId: string; // Added to carry through
  ucTitle: string;
  ucCode: string;
  completionStatus: 'In Progress' | 'Completed' | 'For Badge Request' | 'Badge Requested';
  evidenceUrl?: string;
  remarks?: string;
  completedAt: any;
  verifiedBy: string;
  createdAt: any;
  updatedAt: any;
}

export interface BadgeRequest {
  id: string;
  requestType?: 'Individual' | 'Batch' | 'UC';
  requestNumber?: string;
  badgeIdStatus?: "Pending District Approval" | "Issued";
  issuedBadgeSummary?: Array<{
    learnerId: string;
    learnerName: string;
    learnerEmail?: string;
    badgeId: string;
    verificationId: string;
    issuedBadgeId: string;
  }>;
  trainingCenterId?: string;
  trainingCenterName?: string;
  programOfferingId?: string;
  programBatchId?: string;
  ucCompletionId?: string;
  learnerIds: string[]; // Supports batch requests
  badgeTemplateId: string;
  badgeType: BadgeType;
  districtOfficeId: string;
  issuancePath?: 'Standard Training-Based' | 'RPL';
  sourceAssessmentCenterId?: string;
  evidenceUrl?: string;
  remarks?: string;
  status: 'Pending Review' | 'Approved' | 'Rejected' | BadgeStatus;
  submittedBy: string;
  submittedAt: any;
  reviewedBy?: string;
  reviewedAt?: any;
  reviewRemarks?: string;
  createdAt: any;
  updatedAt: any;
  // Template details for IssuedBadge copy
  templateDetails?: {
    badgeName: string;
    description: string;
    criteria: string;
    alignment: string;
    qualificationName: string;
    qualificationCode: string;
    badgeType: BadgeType;
    credentialLevel: string;
  };
  // Fallback fields for compatibility with older components
  learnerId?: string;
  learnerName?: string;
  learnerEmail?: string;
  badgeTemplateName?: string;
  programTitle?: string;
  qualificationName?: string;
  qualificationCode?: string;
  badgeId?: string;
  badgeName?: string;
  programName?: string;
  issuerId?: string;
  issuerName?: string;
  issuerType?: string;
  assessmentRecordId?: string;
  qualification?: string;
  competency?: string;
  pathway?: string;
  rejectionRemarks?: string;
  approvedBy?: string;
    approvedAt?: any;
    externalEligibilityKey?: string;
    externalEligibility?: {
      externalTrainingCenterId: string;
      trainingCenterName?: string;
      learnerName: string;
      learnerEmail?: string;
      learnerUli: string;
      externalEnrollmentId: string;
      sourceRecordId: string;
      ctprNumber: string;
      programTitle?: string;
      qualificationCode?: string;
      requiredCompetencyCount: number;
      completedCompetencyCount: number;
      missingCompetencyCodes: string[];
      evaluatedAt: string;
      retrievedAt: string;
      mappedBadgeTemplateId: string;
      mappedBadgeTemplateName: string;
      mappedBadgeType: BadgeType;
    };
  }

export interface NewIssuedBadge {
  id: string;
  badgeId: string; // The generated professional Badge ID of the issued badge
  learnerId: string;
  learnerName: string;
  learnerEmail: string;
  badgeTemplateId: string;
  badgeRequestId: string;
  requestNumber?: string;
  trainingCenterId: string;
  trainingCenterName?: string;
  districtOfficeId: string;
  verificationId: string;
  badgeType: BadgeType;
  programTitle: string;
  qualificationName: string;
  qualificationCode?: string; // Added
  credentialLevel?: string; // Added
  criteria?: string; // Added
  alignment?: string; // Added
  description?: string; // Added
  ucTitle?: string;
  issueDate: any;
  expiryDate?: any;
  status: 'Active' | 'Expired' | 'Revoked';
  publishedToLearner?: boolean; // Added
  evidenceUrl?: string;
  metadata?: any;
  createdAt: any;
  updatedAt: any;
  verificationUrl?: string;
  qrPayload?: string;
}

export type IssuedBadge = NewIssuedBadge;

export interface AssessmentRecord {
  id: string;
  learnerId: string;
  learnerName: string;
  qualification: string;
  assessmentDate: string;
  pathway: 'National Competency Assessment' | 'Recognition of Prior Learning (RPL)';
  result: 'Passed / Competent' | 'Not Yet Competent' | 'Pending Review';
  assessorName: string;
  evidenceRef: string;
  remarks: string;
  organizationId: string;
  districtOfficeId: string;
  rplData?: {
    applicationNumber: string;
    yearsExperience: number;
    workExperienceSummary: string;
    portfolioUrl: string;
    evidenceType: string;
    competencyMapping: string;
    evaluationNotes: string;
  };
  createdAt: any;
}


export type RPLStatus =
  | 'For Training Center Assignment'
  | 'Submitted'
  | 'For Evidence Review'
  | 'For Competency Mapping'
  | 'For Gap Training'
  | 'Ready for Assessment Endorsement'
  | 'Endorsed to Assessment Center'
  | 'Eligible for Assessment'
  | 'Returned to TC'
  | 'Additional Documents Requested'
  | 'Not Eligible'
  | 'Assessment Completed'
  | 'Approved'
  | 'Scheduled for Assessment'
  | 'For Assessment';

export interface RPLEvidence {
  id: string;
  title: string;
  url: string;
  description: string;
  status: 'Pending' | 'Accepted' | 'Needs More Evidence' | 'Rejected';
  remarks?: string;
}

export interface RPLCompetencyReview {
  id: string;
  competencyName: string;
  competencyCode: string;
  evidenceIds: string[]; // references RPLEvidence items mapped to this competency
  status: 'Pending' | 'Credited through RPL' | 'For Gap Training' | 'For Demonstration' | 'Needs Additional Evidence' | 'Not Credited';
  remarks?: string;
}

export interface RPLApplication {
  id: string;
  learnerId: string;
  learnerName: string;
  learnerEmail: string;
  trainingCenterId: string;
  trainingCenterName: string;
  assessmentCenterId?: string;
  assessmentCenterName?: string;
  districtOfficeId?: string;
  qualificationId?: string;
  qualificationName: string;
  qualificationCode: string;
  targetCredential: 'Certificate of Competency' | 'National Certificate';
  applicationType: 'Enrolled Learner' | 'Walk-in RPL';
  status: RPLStatus;
  workExperienceSummary: string;
  yearsExperience: number;
  evidence: RPLEvidence[];
  competencyReviews: RPLCompetencyReview[];
  gapTrainingRequired: boolean;
  gapTrainingStatus: 'None' | 'In Progress' | 'Completed';
  endorsedToAssessmentCenter: boolean;
  endorsedAt?: any;
  createdAt: any;
  updatedAt: any;
  
  // Assessment Center Evaluation fields
  eligibilityChecklist?: {
    endorsedByTC: boolean;
    evidenceReviewed: boolean;
    creditedListed: boolean;
    remainingCompetenciesIdentified: boolean;
    gapTrainingStatusChecked: boolean;
    targetCredentialVerified: boolean;
    documentsComplete: boolean;
    eligibleForAssessment: boolean;
  };
  eligibilityStatus?: 'Approve for Assessment Schedule' | 'Return to Training Center' | 'Request Additional Documents' | 'Not Eligible';
  eligibilityRemarks?: string;

  // Assessment Center Batch & Schedule Assignment fields
  assessmentBatchId?: string;
  assessmentBatchName?: string;
  assessmentDate?: string;
  assessmentStartTime?: string;
  assessmentEndTime?: string;
  assessmentVenue?: string;
  assessorName?: string;
  assessmentScheduleStatus?: 'Scheduled' | 'For Assessment' | 'Completed' | string;
  assessmentRemarks?: string;
}
