export type BadgeType = 'Proficient' | 'Expert' | 'Skilled' | 'Master';
export type BadgeStatus = 'Active' | 'Expired' | 'Revoked' | 'Pending Approval';

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
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'Learner' | 'Admin' | 'TrainingCenter' | 'AssessmentCenter' | 'DistrictOffice' | 'Employer';
  office?: string;
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
  programName: string;
  badgeType: 'Proficient' | 'Expert' | 'Skilled' | 'Master';
  description: string;
  criteria: string;
  validityMonths: number;
  alignment: string;
  tags: string[];
  issuableBy: ('TrainingCenter' | 'AssessmentCenter')[];
  requiresApproval: boolean;
  status: 'Active' | 'Draft' | 'Archived';
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
  status: 'Pending' | 'Approved' | 'Rejected' | 'Pending Approval';
  rejectionComment?: string;
  approvedBy?: string;
  approvedAt?: any;
  criteria?: string;
  evidenceUrl?: string;
  remarks?: string;
  expiryDate?: any;
}
