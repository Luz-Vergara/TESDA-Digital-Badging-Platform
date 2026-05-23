export type BadgeType = 'Proficient' | 'Expert' | 'Skilled' | 'Master';
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
  badgeType: BadgeType;
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
  hierarchyLevel: number; // 1: Proficient, 2: Expert, 3: Skilled, 4: Master
  badgeId?: string; // ID of the template it originated from
  pathway?: string; // Added to distinguish RPL vs Standard
  qualificationName?: string;
  qualificationCode?: string;
  badgeName?: string;
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
  status: 'Enrolled' | 'Completed' | 'Dropped';
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
  badgeName: string;
  qualificationName: string;
  qualificationCode: string;
  badgeType: 'Proficient' | 'Expert' | 'Skilled' | 'Master';
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
  trainingCenterId?: string;
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
}

export interface NewIssuedBadge {
  id: string;
  badgeId: string; // ID of the template it originated from
  learnerId: string;
  learnerName: string;
  learnerEmail: string;
  badgeTemplateId: string;
  badgeRequestId: string;
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
}

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

