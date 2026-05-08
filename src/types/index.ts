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

export interface BadgeRequest {
  id: string;
  learnerId: string;
  learnerName: string;
  learnerEmail?: string;
  badgeId?: string;
  badgeName?: string;
  programName?: string;
  issuerId?: string;
  issuerName?: string;
  issuerType?: string;
  assessmentRecordId: string;
  badgeType: 'Skilled Badge' | 'Master Badge';
  qualification: string;
  competency?: string;
  pathway: string;
  evidenceUrl: string;
  remarks: string;
  status: BadgeStatus | 'Approved' | 'Rejected';
  sourceAssessmentCenterId: string;
  districtOfficeId: string;
  routingTier?: 'DistrictOffice' | 'CertificationOffice';
  targetApproverId?: string;
  submittedBy: string;
  submittedAt: any;
  rejectionRemarks?: string;
  approvedBy?: string;
  approvedAt?: any;
}
