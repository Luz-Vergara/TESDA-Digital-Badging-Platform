import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { demoAccountGroups } from '../config/demoAccounts';
import { auth, db } from './firebase';

interface FirebaseContextType {
  user: User | null;
  userProfile: any | null;
  loading: boolean;
  isAuthReady: boolean;
  logout: () => Promise<void>;
  offlineError: string | null;
}

const FirebaseContext = createContext<FirebaseContextType>({
  user: null,
  userProfile: null,
  loading: true,
  isAuthReady: false,
  logout: async () => {},
  offlineError: null,
});

export const useFirebase = () => useContext(FirebaseContext);

export function getDemoRoleByEmail(email: string): string {
  const e = email.toLowerCase();
  const username = e.split('@')[0] || '';
  
  if (username.includes('qso')) return 'qso_admin';
  if (username.includes('co') || username.includes('cert') || username.includes('licens') || username.includes('credential')) return 'co_admin';
  if (username.includes('icto')) return 'icto_admin';
  if (username.includes('district') || username.includes('do')) return 'DistrictOffice';
  if (username.includes('training') || username.includes('tc')) return 'TrainingCenter';
  if (username.includes('assessment') || username.includes('ac')) return 'AssessmentCenter';
  if (username.includes('admin') || username.includes('superuser')) return 'Admin';
  if (username.includes('learner') || username.includes('student') || username.includes('holder')) return 'Learner';
  if (username.includes('employer') || username.includes('verify')) return 'Employer';
  
  // Safe defaults
  return 'Learner';
}

async function seedDemoTemplatesAndData() {
  // Gracefully clean up accidental collateral deletes from deletedDemoItems so non-offending items can recover
  const accidentalIds = [
    'demo-template-css-proficient',
    'demo-offering-css-proficient',
    'demo-batch-css-proficient-1',
    'demo-template-skilled-1',
    'demo-template-skilled-2',
    'demo-template-master-2',
    'demo-template-2',
    'demo-offering-cloud',
    'demo-offering-web'
  ];
  for (const aid of accidentalIds) {
    try {
      await deleteDoc(doc(db, 'deletedDemoItems', aid));
    } catch (err) {
      console.warn("Could not clear sentinel from deletedDemoItems:", aid, err);
    }
  }

  const deletedSnap = await getDocs(collection(db, 'deletedDemoItems'));
  const deletedIds = new Set(deletedSnap.docs.map(doc => doc.id));

  const demoTemplates = [
    {
      id: 'demo-template-1',
      badgeName: 'Computer Systems Servicing NC II',
      qualificationName: 'Computer Systems Servicing NC II',
      qualificationCode: 'CSS-NCII-2026',
      badgeType: 'Master',
      credentialLevel: 'National Certificate',
      relatedCompetency: 'Install networks, server setup, repair systems',
      description: 'Demonstrates mastery in computer systems servicing',
      criteria: 'Successful completion of national assessment',
      validityMonths: 60,
      alignment: 'PQF Level 3',
      tags: ['IT', 'Hardware', 'Networking'],
      issuableBy: ['TrainingCenter'],
      requiresApproval: true,
      displayOrder: 1,
      hierarchyVisible: true,
      status: 'Approved',
      isDemo: true
    },
    {
      id: 'demo-template-2',
      badgeName: 'Cloud Computing Fundamentals',
      qualificationName: 'Cloud Computing Fundamentals',
      qualificationCode: 'CCF-2026',
      badgeType: 'Expert',
      credentialLevel: 'Full Qualification / Certificate of Training',
      relatedCompetency: 'Deploy cloud infrastructure and serverless systems',
      description: 'Awarded for completing the cloud training course',
      criteria: 'Passed final assessment exam',
      validityMonths: 36,
      alignment: 'Institutional Standard',
      tags: ['Cloud', 'AWS', 'Azure'],
      issuableBy: ['TrainingCenter'],
      requiresApproval: true,
      displayOrder: 2,
      hierarchyVisible: true,
      status: 'Approved',
      isDemo: true
    },
    {
      id: 'demo-template-skilled-1',
      badgeName: 'Web Development - Front-end Development CoC',
      qualificationName: 'Web Development NC III',
      qualificationCode: 'WD-NCIII-2026',
      badgeType: 'Skilled',
      credentialLevel: 'Certificate of Competency',
      relatedCompetency: 'Develop interactive responsive interfaces',
      description: 'Demonstrates skilled competency in client-side programming, HTML5/CSS3, and responsive frameworks',
      criteria: 'Successful completion of front-end portfolio verification and audit',
      validityMonths: 36,
      alignment: 'PQF Level 4',
      tags: ['Web', 'Front-end', 'HTML'],
      issuableBy: ['TrainingCenter'],
      requiresApproval: true,
      displayOrder: 3,
      hierarchyVisible: true,
      status: 'Approved',
      isDemo: true
    },
    {
      id: 'demo-template-skilled-2',
      badgeName: 'Vector Graphics Creation CoC',
      qualificationName: 'Visual Graphic Design NC III',
      qualificationCode: 'VGD-NCIII-2026',
      badgeType: 'Skilled',
      credentialLevel: 'Certificate of Competency',
      relatedCompetency: 'Create vector media for branding and distribution',
      description: 'Demonstrates skilled competency in vector illustration, illustration assets, and branding graphics',
      criteria: 'Successful completion of vector design competency audit',
      validityMonths: 36,
      alignment: 'PQF Level 4',
      tags: ['Design', 'Vector', 'Branding'],
      issuableBy: ['TrainingCenter'],
      requiresApproval: true,
      displayOrder: 3,
      hierarchyVisible: true,
      status: 'Approved',
      isDemo: true
    },
    {
      id: 'demo-template-master-2',
      badgeName: 'Web Development NC III',
      qualificationName: 'Web Development NC III',
      qualificationCode: 'WD-NCIII-2026',
      badgeType: 'Master',
      credentialLevel: 'National Certificate',
      relatedCompetency: 'End-to-end full-stack web architectures, deployment, database management',
      description: 'Demonstrates end-to-end mastery in full-stack web application development and system architectures',
      criteria: 'Completion of high-performance full-stack web qualification standard assessment',
      validityMonths: 60,
      alignment: 'PQF Level 5',
      tags: ['Web', 'Full-stack', 'Systems'],
      issuableBy: ['TrainingCenter'],
      requiresApproval: true,
      displayOrder: 4,
      hierarchyVisible: true,
      status: 'Approved',
      isDemo: true
    },
    {
      id: 'demo-template-css-proficient',
      badgeName: 'Computer Systems Servicing - Install and Configure Computer Systems',
      qualificationName: 'Computer Systems Servicing NC II',
      qualificationCode: 'CSS-NCII-2026-UC1',
      badgeType: 'Proficient',
      credentialLevel: 'Unit of Competency',
      relatedCompetency: 'Install and Configure Computer Systems',
      description: 'Demonstrates professional proficiency in installing and configuring computer systems, setting up basic configurations, and initial system boot tests.',
      criteria: 'Successful completion of unit assessment and institutional evaluation',
      validityMonths: 36,
      alignment: 'PQF Level 3 - Unit 1',
      tags: ['IT', 'Hardware', 'Setup'],
      issuableBy: ['TrainingCenter'],
      requiresApproval: true,
      displayOrder: 5,
      hierarchyVisible: true,
      status: 'Approved',
      isDemo: true
    }
  ];

  for (const tmpl of demoTemplates) {
    if (deletedIds.has(tmpl.id)) {
      continue;
    }
    const docRef = doc(db, 'badgeTemplates', tmpl.id);
    const tmplDoc = await getDoc(docRef);
    if (!tmplDoc.exists()) {
      await setDoc(docRef, { 
        ...tmpl, 
        createdAt: serverTimestamp(), 
        updatedAt: serverTimestamp() 
      });
    }
  }

  // Ensure standard demo organizations exist
  const demoOrgs = [
    {
      id: 'demo-training-center',
      name: 'Demo Training Center - Manila',
      type: 'TrainingCenter',
      email: 'training@demo.com',
      location: 'Manila, Philippines',
      assignedDistrictId: 'demo-district-office',
      status: 'Active',
      isDemo: true,
    },
    {
      id: 'demo-training-center-1',
      name: 'Demo Training Center 1',
      type: 'TrainingCenter',
      email: 'training1@demo.com',
      location: 'Cebu, Philippines',
      assignedDistrictId: 'demo-district-office',
      status: 'Active',
      isDemo: true,
    },
    {
      id: 'demo-training-center-2',
      name: 'Demo Training Center 2',
      type: 'TrainingCenter',
      email: 'training2@demo.com',
      location: 'Davao, Philippines',
      assignedDistrictId: 'demo-district-office',
      status: 'Active',
      isDemo: true,
    },
    {
      id: 'demo-district-office',
      name: 'Demo District Office - National Capital Region',
      type: 'DistrictOffice',
      email: 'district@demo.com',
      location: 'Manila, Philippines',
      status: 'Active',
      isDemo: true,
    }
  ];

  for (const org of demoOrgs) {
    const orgRef = doc(db, 'organizations', org.id);
    const orgDoc = await getDoc(orgRef);
    if (!orgDoc.exists()) {
      await setDoc(orgRef, {
        ...org,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } else {
      // Always update email and name for standard demo centers to ensure correct setup
      await updateDoc(orgRef, {
        email: org.email,
        name: org.name,
        updatedAt: serverTimestamp()
      });
    }
  }

  // Ensure standard demo offerings exist
  const demoOfferings = [
    {
      id: 'demo-offering-cloud',
      programTitle: 'Cloud Computing Fundamentals',
      programType: 'Full Qualification',
      qualificationName: 'Cloud Computing Fundamentals',
      qualificationCode: 'CCF-2026',
      badgeTemplateId: 'demo-template-2',
      badgeTemplateName: 'Cloud Computing Fundamentals',
      badgeType: 'Expert',
      deliveryMode: 'Blended',
      status: 'Active',
      trainingCenterId: 'demo-training-center-1',
      trainingCenterName: 'Demo Training Center 1',
      isDemo: true,
    },
    {
      id: 'demo-offering-css',
      programTitle: 'Computer Systems Servicing NC II',
      programType: 'Full Qualification',
      qualificationName: 'Computer Systems Servicing NC II',
      qualificationCode: 'CSS-NCII-2026',
      badgeTemplateId: 'demo-template-1',
      badgeTemplateName: 'Computer Systems Servicing NC II',
      badgeType: 'Master',
      deliveryMode: 'On-site',
      status: 'Active',
      trainingCenterId: 'demo-training-center',
      trainingCenterName: 'Demo Training Center - Manila',
      isDemo: true,
    },
    {
      id: 'demo-offering-web',
      programTitle: 'Web Development NC III',
      programType: 'Full Qualification',
      qualificationName: 'Web Development NC III',
      qualificationCode: 'WD-NCIII-2026',
      badgeTemplateId: 'demo-template-master-2',
      badgeTemplateName: 'Web Development NC III',
      badgeType: 'Master',
      deliveryMode: 'Online',
      status: 'Active',
      trainingCenterId: 'demo-training-center-2',
      trainingCenterName: 'Demo Training Center 2',
      isDemo: true,
    },
    {
      id: 'demo-offering-css-proficient',
      programTitle: 'Computer Systems Servicing - Install and Configure Computer Systems',
      programType: 'Unit of Competency',
      qualificationName: 'Computer Systems Servicing NC II',
      qualificationCode: 'CSS-NCII-2026-UC1',
      badgeTemplateId: 'demo-template-css-proficient',
      badgeTemplateName: 'Computer Systems Servicing - Install and Configure Computer Systems',
      badgeType: 'Proficient',
      deliveryMode: 'Blended',
      status: 'Active',
      trainingCenterId: 'demo-training-center',
      trainingCenterName: 'Demo Training Center - Manila',
      isDemo: true,
    }
  ];

  for (const offering of demoOfferings) {
    if (deletedIds.has(offering.id) || deletedIds.has(offering.badgeTemplateId)) {
      continue;
    }
    const offeringRef = doc(db, 'programOfferings', offering.id);
    const offeringDoc = await getDoc(offeringRef);
    if (!offeringDoc.exists()) {
      await setDoc(offeringRef, {
        ...offering,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } else {
      // Ensure we align the correct trainingCenterId / trainingCenterName
      await updateDoc(offeringRef, {
        trainingCenterId: offering.trainingCenterId,
        trainingCenterName: offering.trainingCenterName,
        updatedAt: serverTimestamp()
      });
    }
  }

  // Ensure standard demo batches exist
  const demoBatches = [
    {
      id: 'demo-batch-cloud-1',
      programOfferingId: 'demo-offering-cloud',
      batchName: 'Cloud Computing - Batch 1',
      startDate: '2026-06-01',
      endDate: '2026-07-31',
      trainerName: 'Engr. Juan Dela Cruz',
      maxSlots: 25,
      status: 'Open',
      badgeTemplateId: 'demo-template-2',
      trainingCenterId: 'demo-training-center-1',
      isDemo: true,
    },
    {
      id: 'demo-batch-css-1',
      programOfferingId: 'demo-offering-css',
      batchName: 'CSS NC II - Batch A',
      startDate: '2026-05-01',
      endDate: '2026-06-30',
      trainerName: 'Mrs. Maria Santos',
      maxSlots: 20,
      status: 'Ongoing',
      badgeTemplateId: 'demo-template-1',
      trainingCenterId: 'demo-training-center',
      isDemo: true,
    },
    {
      id: 'demo-batch-css-proficient-1',
      programOfferingId: 'demo-offering-css-proficient',
      batchName: 'CSS Proficient - Batch A',
      startDate: '2026-05-15',
      endDate: '2026-06-30',
      trainerName: 'Mrs. Maria Santos',
      maxSlots: 15,
      status: 'Ongoing',
      badgeTemplateId: 'demo-template-css-proficient',
      trainingCenterId: 'demo-training-center',
      isDemo: true,
    }
  ];

  for (const batch of demoBatches) {
    if (deletedIds.has(batch.id) || deletedIds.has(batch.badgeTemplateId) || deletedIds.has(batch.programOfferingId)) {
      continue;
    }
    const batchRef = doc(db, 'programBatches', batch.id);
    const batchDoc = await getDoc(batchRef);
    if (!batchDoc.exists()) {
      await setDoc(batchRef, {
        ...batch,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } else {
      await updateDoc(batchRef, {
        trainingCenterId: batch.trainingCenterId,
        updatedAt: serverTimestamp()
      });
    }
  }

  // Ensure standard demo badge request exists for District Office flow testing
  if (!deletedIds.has('demo-template-1') && !deletedIds.has('demo-offering-css')) {
    const reqRef = doc(db, 'badgeRequests', 'demo-request-1');
    const reqDoc = await getDoc(reqRef);
    if (!reqDoc.exists()) {
      await setDoc(reqRef, {
        id: 'demo-request-1',
        requestType: 'Batch',
        trainingCenterId: 'demo-training-center',
        trainingCenterName: 'Demo Training Center - Manila',
        programOfferingId: 'demo-offering-css',
        programTitle: 'Computer Systems Servicing NC II',
        learnerIds: ['demo-learner2-uid-placeholder'],
        learnerNames: ['Maria Santos (Demo)'],
        badgeTemplateId: 'demo-template-1',
        badgeTemplateName: 'Computer Systems Servicing NC II',
        badgeType: 'Master',
        districtOfficeId: 'demo-district-office',
        districtOfficeName: 'Demo District Office - National Capital Region',
        status: 'Pending Review',
        isDemo: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }
  }

  return deletedIds;
}

async function seedLearnerWorkflowData(uid: string, email: string, name: string, deletedIds: Set<string>) {
  try {
    const isLearner1 = email.toLowerCase().includes('learner@demo.com') || email.toLowerCase() === 'learner@demo.com';
    const isLearner2 = email.toLowerCase().includes('learner2@demo.com') || email.toLowerCase() === 'learner2@demo.com';
    const isLearner3 = email.toLowerCase().includes('learner3@demo.com') || email.toLowerCase() === 'learner3@demo.com';
    const isLearner4 = email.toLowerCase().includes('learner4@demo.com') || email.toLowerCase() === 'learner4@demo.com';
    const isLearner5 = email.toLowerCase().includes('learner5@demo.com') || email.toLowerCase() === 'learner5@demo.com';

    if (!isLearner1 && !isLearner2 && !isLearner3 && !isLearner4 && !isLearner5) return;

    // 1. Ensure Learner profile exists in learners collection
    const learnerDocRef = doc(db, 'learners', uid);
    const learnerSnap = await getDoc(learnerDocRef);
    let shouldWriteLearnerProfile = !learnerSnap.exists();
    if (learnerSnap.exists()) {
      const data = learnerSnap.data();
      const currentLastName = data?.lastName || '';
      const currentFirstName = data?.firstName || '';
      if (isLearner3 && (currentLastName.includes('Jose') || currentLastName.includes('Rizal') || currentFirstName.includes('Jose') || currentFirstName.includes('Rizal'))) {
        shouldWriteLearnerProfile = true;
      }
    }

    if (shouldWriteLearnerProfile) {
      const nameParts = name.split(' ');
      const firstName = nameParts[0] || 'Demo';
      const lastName = nameParts.slice(1).join(' ') || 'Learner';

      let qualification = 'Computer Systems Servicing NC II';
      let status = 'Enrolled';

      if (deletedIds.has('demo-template-1') || deletedIds.has('demo-offering-css')) {
        if (!deletedIds.has('demo-template-2') && !deletedIds.has('demo-offering-cloud')) {
          qualification = 'Cloud Computing Fundamentals';
        } else if (!deletedIds.has('demo-template-master-2')) {
          qualification = 'Web Development NC III';
        } else {
          qualification = '';
          status = 'Applied';
        }
      }

      if (isLearner1) {
        qualification = (deletedIds.has('demo-template-2') || deletedIds.has('demo-offering-cloud')) ? 'Web Development NC III' : 'Cloud Computing Fundamentals';
        status = 'Applied';
      } else if (isLearner4) {
        qualification = (deletedIds.has('demo-template-2') || deletedIds.has('demo-offering-cloud')) ? 'Web Development NC III' : 'Cloud Computing Fundamentals';
        status = 'Completed';
      }

      await setDoc(learnerDocRef, {
        id: uid,
        firstName,
        lastName,
        email,
        contactNumber: '09170000000',
        qualification,
        trainingCenterId: isLearner1 || isLearner4 || isLearner5 ? 'demo-training-center-1' : 'demo-training-center',
        trainingCenterName: isLearner1 || isLearner4 || isLearner5 ? 'Demo Training Center 1' : 'Demo Training Center - Manila',
        organizationId: isLearner1 || isLearner4 || isLearner5 ? 'demo-training-center-1' : 'demo-training-center',
        organizationName: isLearner1 || isLearner4 || isLearner5 ? 'Demo Training Center 1' : 'Demo Training Center - Manila',
        districtOfficeId: 'demo-district-office',
        districtOfficeName: 'Demo District Office - National Capital Region',
        status,
        isDemo: true,
        createdAt: learnerSnap.exists() ? (learnerSnap.data()?.createdAt || serverTimestamp()) : serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }

    if (isLearner1) {
      if (!deletedIds.has('demo-template-2') && !deletedIds.has('demo-offering-cloud')) {
        // Seed first enrollment for learner@demo.com
        const enrDocRef1 = doc(db, 'enrollments', `demo-enr-learner1-cloud-${uid}`);
        const enrSnap1 = await getDoc(enrDocRef1);
        if (!enrSnap1.exists()) {
          await setDoc(enrDocRef1, {
            id: `demo-enr-learner1-cloud-${uid}`,
            learnerId: uid,
            learnerName: name,
            learnerEmail: email,
            trainingCenterId: 'demo-training-center-1',
            trainingCenterName: 'Demo Training Center 1',
            organizationId: 'demo-training-center-1',
            organizationName: 'Demo Training Center 1',
            programOfferingId: 'demo-offering-cloud',
            badgeTemplateId: 'demo-template-2',
            badgeType: 'Expert',
            programTitle: 'Cloud Computing Fundamentals',
            programBatchId: 'demo-batch-cloud-1',
            districtOfficeId: 'demo-district-office',
            districtOfficeName: 'Demo District Office - National Capital Region',
            enrollmentStatus: 'Enrolled',
            completionStatus: 'In Progress',
            dateApplied: serverTimestamp(),
            isDemo: true,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        }
      }

      if (!deletedIds.has('demo-template-1') && !deletedIds.has('demo-offering-css')) {
        // Seed second enrollment for learner@demo.com (Applied status)
        const enrDocRef2 = doc(db, 'enrollments', `demo-enr-learner1-css-${uid}`);
        const enrSnap2 = await getDoc(enrDocRef2);
        if (!enrSnap2.exists()) {
          await setDoc(enrDocRef2, {
            id: `demo-enr-learner1-css-${uid}`,
            learnerId: uid,
            learnerName: name,
            learnerEmail: email,
            trainingCenterId: 'demo-training-center',
            trainingCenterName: 'Demo Training Center - Manila',
            organizationId: 'demo-training-center',
            organizationName: 'Demo Training Center - Manila',
            programOfferingId: 'demo-offering-css',
            badgeTemplateId: 'demo-template-1',
            badgeType: 'Master',
            programTitle: 'Computer Systems Servicing NC II',
            programBatchId: 'demo-batch-css-1',
            districtOfficeId: 'demo-district-office',
            districtOfficeName: 'Demo District Office - National Capital Region',
            enrollmentStatus: 'Applied',
            completionStatus: 'Not Started',
            dateApplied: serverTimestamp(),
            isDemo: true,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        }
      }
    }

    if (isLearner2) {
      if (!deletedIds.has('demo-template-1') && !deletedIds.has('demo-offering-css')) {
        // Seed enrollment for learner2@demo.com
        const enrDocRef3 = doc(db, 'enrollments', `demo-enr-learner2-css-${uid}`);
        const enrSnap3 = await getDoc(enrDocRef3);
        if (!enrSnap3.exists()) {
          await setDoc(enrDocRef3, {
            id: `demo-enr-learner2-css-${uid}`,
            learnerId: uid,
            learnerName: name,
            learnerEmail: email,
            trainingCenterId: 'demo-training-center',
            trainingCenterName: 'Demo Training Center - Manila',
            organizationId: 'demo-training-center',
            organizationName: 'Demo Training Center - Manila',
            programOfferingId: 'demo-offering-css',
            badgeTemplateId: 'demo-template-1',
            badgeType: 'Master',
            programTitle: 'Computer Systems Servicing NC II',
            programBatchId: 'demo-batch-css-1',
            districtOfficeId: 'demo-district-office',
            districtOfficeName: 'Demo District Office - National Capital Region',
            enrollmentStatus: 'Enrolled',
            completionStatus: 'Completed',
            dateApplied: serverTimestamp(),
            isDemo: true,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        }
      }
    }

    if (isLearner3) {
      if (!deletedIds.has('demo-template-1') && !deletedIds.has('demo-offering-css')) {
        // Seed enrollment for learner3@demo.com
        const enrDocRef4 = doc(db, 'enrollments', `demo-enr-learner3-css-${uid}`);
        const enrSnap4 = await getDoc(enrDocRef4);
        let shouldWriteEnr4 = !enrSnap4.exists();
        if (enrSnap4.exists()) {
          const enrData = enrSnap4.data();
          if (enrData?.learnerName?.includes('Jose') || enrData?.learnerName?.includes('Rizal')) {
            shouldWriteEnr4 = true;
          }
        }
        if (shouldWriteEnr4) {
          await setDoc(enrDocRef4, {
            id: `demo-enr-learner3-css-${uid}`,
            learnerId: uid,
            learnerName: name,
            learnerEmail: email,
            trainingCenterId: 'demo-training-center',
            trainingCenterName: 'Demo Training Center - Manila',
            organizationId: 'demo-training-center',
            organizationName: 'Demo Training Center - Manila',
            programOfferingId: 'demo-offering-css',
            badgeTemplateId: 'demo-template-1',
            badgeType: 'Master',
            programTitle: 'Computer Systems Servicing NC II',
            programBatchId: 'demo-batch-css-1',
            districtOfficeId: 'demo-district-office',
            districtOfficeName: 'Demo District Office - National Capital Region',
            enrollmentStatus: 'Enrolled',
            completionStatus: 'In Progress',
            dateApplied: enrSnap4.exists() ? (enrSnap4.data()?.dateApplied || serverTimestamp()) : serverTimestamp(),
            isDemo: true,
            createdAt: enrSnap4.exists() ? (enrSnap4.data()?.createdAt || serverTimestamp()) : serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        }
      }
    }

    if (isLearner4) {
      if (!deletedIds.has('demo-template-2') && !deletedIds.has('demo-offering-cloud')) {
        // Seed enrollment for learner4@demo.com
        const enrDocRef5 = doc(db, 'enrollments', `demo-enr-learner4-cloud-${uid}`);
        const enrSnap5 = await getDoc(enrDocRef5);
        if (!enrSnap5.exists()) {
          await setDoc(enrDocRef5, {
            id: `demo-enr-learner4-cloud-${uid}`,
            learnerId: uid,
            learnerName: name,
            learnerEmail: email,
            trainingCenterId: 'demo-training-center-1',
            trainingCenterName: 'Demo Training Center 1',
            organizationId: 'demo-training-center-1',
            organizationName: 'Demo Training Center 1',
            programOfferingId: 'demo-offering-cloud',
            badgeTemplateId: 'demo-template-2',
            badgeType: 'Expert',
            programTitle: 'Cloud Computing Fundamentals',
            programBatchId: 'demo-batch-cloud-1',
            districtOfficeId: 'demo-district-office',
            districtOfficeName: 'Demo District Office - National Capital Region',
            enrollmentStatus: 'Enrolled',
            completionStatus: 'Completed',
            dateApplied: serverTimestamp(),
            isDemo: true,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        }
      }
    }

    if (isLearner5) {
      if (!deletedIds.has('demo-template-2') && !deletedIds.has('demo-offering-cloud')) {
        // Seed both enrollments for learner5@demo.com
        const enrDocRef6 = doc(db, 'enrollments', `demo-enr-learner5-cloud-${uid}`);
        const enrSnap6 = await getDoc(enrDocRef6);
        if (!enrSnap6.exists()) {
          await setDoc(enrDocRef6, {
            id: `demo-enr-learner5-cloud-${uid}`,
            learnerId: uid,
            learnerName: name,
            learnerEmail: email,
            trainingCenterId: 'demo-training-center-1',
            trainingCenterName: 'Demo Training Center 1',
            organizationId: 'demo-training-center-1',
            organizationName: 'Demo Training Center 1',
            programOfferingId: 'demo-offering-cloud',
            badgeTemplateId: 'demo-template-2',
            badgeType: 'Expert',
            programTitle: 'Cloud Computing Fundamentals',
            programBatchId: 'demo-batch-cloud-1',
            districtOfficeId: 'demo-district-office',
            districtOfficeName: 'Demo District Office - National Capital Region',
            enrollmentStatus: 'Enrolled',
            completionStatus: 'In Progress',
            dateApplied: serverTimestamp(),
            isDemo: true,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        }
      }

      if (!deletedIds.has('demo-template-1') && !deletedIds.has('demo-offering-css')) {
        const enrDocRef7 = doc(db, 'enrollments', `demo-enr-learner5-css-${uid}`);
        const enrSnap7 = await getDoc(enrDocRef7);
        if (!enrSnap7.exists()) {
          await setDoc(enrDocRef7, {
            id: `demo-enr-learner5-css-${uid}`,
            learnerId: uid,
            learnerName: name,
            learnerEmail: email,
            trainingCenterId: 'demo-training-center',
            trainingCenterName: 'Demo Training Center - Manila',
            organizationId: 'demo-training-center',
            organizationName: 'Demo Training Center - Manila',
            programOfferingId: 'demo-offering-css',
            badgeTemplateId: 'demo-template-1',
            badgeType: 'Master',
            programTitle: 'Computer Systems Servicing NC II',
            programBatchId: 'demo-batch-css-1',
            districtOfficeId: 'demo-district-office',
            districtOfficeName: 'Demo District Office - National Capital Region',
            enrollmentStatus: 'Applied',
            completionStatus: 'Not Started',
            dateApplied: serverTimestamp(),
            isDemo: true,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        }
      }
    }

    // ---- PRE-SEED OFFICIAL READY-MADE ACTIVE DIGITALLY REGISTERED BADGES FOR FLUID TESTING & QR VERIFICATION ON PUBLIC DEPLOYMENTS (Vercel) ----
    const activeBadgeRef = doc(db, 'issuedBadges', `demo-issued-${uid}-primary`);
    if (isLearner3) {
      try {
        await deleteDoc(activeBadgeRef);
      } catch (e) {
        console.error("Cleanup error for Kiko Binetez:", e);
      }
    }
    const activeBadgeSnap = await getDoc(activeBadgeRef);
    if (!isLearner3 && !activeBadgeSnap.exists()) {
      let templId = 'demo-template-1';
      let badgeName = 'Computer Systems Servicing NC II';
      let badgeType = 'Master';
      let qCode = 'CSS-NCII-2026';
      let deliveryMode = 'Face-to-Face';
      let tcId = 'demo-training-center';
      let tcName = 'Demo Training Center - Manila';
      let desc = 'Holds formal qualifications under national competency standard guidelines on hardware and networking configurations.';

      if (isLearner1 || isLearner4) {
        templId = 'demo-template-2';
        badgeName = 'Cloud Computing Fundamentals';
        badgeType = 'Expert';
        qCode = 'CCF-NC-2026';
        deliveryMode = 'Online';
        tcId = 'demo-training-center-1';
        tcName = 'Demo Training Center 1';
        desc = 'Maintains competency qualifications standard in cloud configurations, server setup, and cloud security compliance.';
      }

      if (!deletedIds.has(templId)) {
        const verificationId = `V-${uid.slice(0, 6).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
        const badgeId = `TESDA-${qCode.split('-')[0]}-N${badgeType === 'Master' ? '3' : '2'}-${Math.floor(10000 + Math.random() * 90000)}`;
        const verificationUrl = `${window.location.origin}/#/verify/${verificationId}`;
        
        await setDoc(activeBadgeRef, {
          id: `demo-issued-${uid}-primary`,
          badgeId,
          verificationId,
          badgeTemplateId: templId,
          badgeTemplateName: badgeName,
          badgeRequestId: `demo-request-pre-${uid}`,
          programOfferingId: templId === 'demo-template-1' ? 'demo-offering-css' : 'demo-offering-cloud',
          programBatchId: templId === 'demo-template-1' ? 'demo-batch-css-1' : 'demo-batch-cloud-1',
          programTitle: badgeName,
          badgeType,
          learnerId: uid,
          learnerName: name,
          learnerEmail: email,
          trainingCenterId: tcId,
          trainingCenterName: tcName,
          districtOfficeId: 'demo-district-office',
          districtOfficeName: 'Demo District Office - National Capital Region',
          issueDate: serverTimestamp(),
          dateIssued: serverTimestamp(),
          validUntil: new Date(Date.now() + 36 * 30 * 24 * 60 * 60 * 1000),
          expiryDate: new Date(Date.now() + 36 * 30 * 24 * 60 * 60 * 1000),
          status: 'Active',
          publishedToLearner: true,
          evidenceUrl: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97',
          qualificationName: badgeName,
          qualificationCode: qCode,
          credentialLevel: 'Full Qualification',
          criteria: 'Successful completion of national competency assessment program including comprehensive practical demonstration.',
          alignment: 'PQF Level 3/4 Standard',
          description: desc,
          verificationUrl,
          qrPayload: verificationUrl,
          isDemo: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });

        // Also update learner state to Active/Completed
        const learnerProfileRef = doc(db, 'learners', uid);
        await updateDoc(learnerProfileRef, {
          badgeStatus: 'Active',
          status: 'Completed',
          qualification: badgeName,
          updatedAt: serverTimestamp()
        }).catch(() => {});
      }
    }

    // Pre-seed secondary badge for Maria Santos (Learner 2) to showcase multi-badges wallet
    if (isLearner2 && !deletedIds.has('demo-template-css-proficient')) {
      const secBadgeRef = doc(db, 'issuedBadges', `demo-issued-${uid}-secondary`);
      const secBadgeSnap = await getDoc(secBadgeRef);
      if (!secBadgeSnap.exists()) {
        const verificationId = `V-CSS-${uid.slice(0, 4).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
        const badgeId = `TESDA-CSS-N1-${Math.floor(10000 + Math.random() * 90000)}`;
        const verificationUrl = `${window.location.origin}/#/verify/${verificationId}`;

        await setDoc(secBadgeRef, {
          id: `demo-issued-${uid}-secondary`,
          badgeId,
          verificationId,
          badgeTemplateId: 'demo-template-css-proficient',
          badgeTemplateName: 'Computer Systems Servicing - Install and Configure Computer Systems',
          badgeRequestId: `demo-request-sec-${uid}`,
          programOfferingId: 'demo-offering-css-proficient',
          programBatchId: 'demo-batch-css-proficient-1',
          programTitle: 'Computer Systems Servicing - Install and Configure Computer Systems',
          badgeType: 'Proficient',
          learnerId: uid,
          learnerName: name,
          learnerEmail: email,
          trainingCenterId: 'demo-training-center',
          trainingCenterName: 'Demo Training Center - Manila',
          districtOfficeId: 'demo-district-office',
          districtOfficeName: 'Demo District Office - National Capital Region',
          issueDate: serverTimestamp(),
          dateIssued: serverTimestamp(),
          validUntil: new Date(Date.now() + 36 * 30 * 24 * 60 * 60 * 1000),
          expiryDate: new Date(Date.now() + 36 * 30 * 24 * 60 * 60 * 1000),
          status: 'Active',
          publishedToLearner: true,
          evidenceUrl: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0',
          qualificationName: 'Computer Systems Servicing NC II',
          qualificationCode: 'CSS-NCII-2026-UC1',
          credentialLevel: 'Unit of Competency',
          criteria: 'Proven proficiency in installing system software, booting standard partitions, configuration setups, and running diagnostics.',
          alignment: 'PQF Level 3 - Unit 1',
          description: 'Demonstrates professional proficiency in installing and configuring computer systems under TESDA CSS unit guidelines.',
          verificationUrl,
          qrPayload: verificationUrl,
          isDemo: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
    }
  } catch (error) {
    console.error("Error seeding learner-specific workflow data:", error);
  }
}

export const FirebaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [offlineError, setOfflineError] = useState<string | null>(null);

  // Connection probe on load
  useEffect(() => {
    async function probeConnection() {
      try {
        await getDoc(doc(db, 'system-metadata', 'probe'));
      } catch (err: any) {
        if (err instanceof Error && (err.message.includes('offline') || err.message.includes('client is offline'))) {
          setOfflineError("Firestore client is offline.");
        }
      }
    }
    probeConnection();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      try {
        setUser(currentUser);
        
        if (currentUser) {
          const isDemo = currentUser.providerData.some(p => p.providerId === 'password') || 
                         currentUser.email?.toLowerCase().includes('demo') ||
                         localStorage.getItem('is_demo_user') === 'true';

          if (isDemo) {
            localStorage.setItem('is_demo_user', 'true');
            
            // Force profile mapping & creation/sync
            const userDocRef = doc(db, 'users', currentUser.uid);
            const userDoc = await getDoc(userDocRef);
            
            const role = getDemoRoleByEmail(currentUser.email || '');
            let organizationId = '';
            let assignedDistrictId = '';
            
            if (role === 'TrainingCenter') {
              const emailLower = currentUser.email?.toLowerCase() || '';
              if (emailLower === 'training1@demo.com') {
                organizationId = 'demo-training-center-1';
              } else if (emailLower === 'training2@demo.com') {
                organizationId = 'demo-training-center-2';
              } else {
                organizationId = 'demo-training-center';
              }
              assignedDistrictId = 'demo-district-office';
            } else if (role === 'AssessmentCenter') {
              organizationId = 'demo-assessment-center';
              assignedDistrictId = 'demo-district-office';
            } else if (role === 'DistrictOffice') {
              organizationId = 'demo-district-office';
              assignedDistrictId = 'demo-district-office';
            }

            // Force setup of demo organization if active
            if (organizationId) {
              const orgDocRef = doc(db, 'organizations', organizationId);
              const orgDoc = await getDoc(orgDocRef);
              if (!orgDoc.exists()) {
                await setDoc(orgDocRef, {
                  id: organizationId,
                  name: organizationId === 'demo-training-center-1' ? 'Demo Training Center 1' :
                        organizationId === 'demo-training-center-2' ? 'Demo Training Center 2' :
                        role === 'TrainingCenter' ? 'Demo Training Center - Manila' :
                        role === 'AssessmentCenter' ? 'Demo Assessment Center - Manila' :
                        'Demo District Office - National Capital Region',
                  type: role === 'DistrictOffice' ? 'DistrictOffice' : role,
                  email: currentUser.email,
                  location: 'Manila, Philippines',
                  assignedDistrictId: assignedDistrictId || null,
                  status: 'Active',
                  isDemo: true,
                  createdAt: serverTimestamp(),
                  updatedAt: serverTimestamp()
                });
              }
            }

            // Make sure demo district office exists to prevent empty drop downs
            if (assignedDistrictId) {
              const distDocRef = doc(db, 'organizations', assignedDistrictId);
              const distDoc = await getDoc(distDocRef);
              if (!distDoc.exists()) {
                await setDoc(distDocRef, {
                  id: assignedDistrictId,
                  name: 'Demo District Office - National Capital Region',
                  type: 'DistrictOffice',
                  email: 'district@demo.com',
                  location: 'Manila, Philippines',
                  status: 'Active',
                  isDemo: true,
                  createdAt: serverTimestamp(),
                  updatedAt: serverTimestamp()
                });
              }
            }

            let office = '';
            if (role === 'TrainingCenter') {
              if (organizationId === 'demo-training-center-1') {
                office = 'Demo Training Center 1';
              } else if (organizationId === 'demo-training-center-2') {
                office = 'Demo Training Center 2';
              } else {
                office = 'Demo Training Center - Manila';
              }
            } else if (role === 'AssessmentCenter') {
              office = 'Demo Assessment Center - Manila';
            } else if (role === 'DistrictOffice') {
              office = 'Demo District Office - National Capital Region';
            } else if (role === 'qso_admin') {
              office = 'Central QSO';
            } else if (role === 'co_admin') {
              office = 'Certification Office';
            } else if (role === 'icto_admin') {
              office = 'ICTO Central';
            } else if (role === 'Admin') {
              office = 'TESDA Main';
            }

            let profile = userDoc.exists() ? userDoc.data() : null;
            let currentProfileName = profile?.name || '';
            const isLearner3Account = currentUser.email?.toLowerCase() === 'learner3@demo.com';

            if (isLearner3Account && (!currentProfileName || currentProfileName.includes('Jose') || currentProfileName.includes('Rizal'))) {
              currentProfileName = "Demo Learner 3 (Kiko Binetez)";
            }

            const demoProfile = {
              uid: currentUser.uid,
              // Respect existing name if present, otherwise map from demo accounts or fallback
              name: currentProfileName || profile?.name || currentUser.displayName || demoAccountGroups.flatMap(g => g.accounts).find(acc => acc.email.toLowerCase() === currentUser.email?.toLowerCase())?.label || `Demo ${role === 'co_admin' ? 'Certification Officer' : role === 'qso_admin' ? 'QSO Admin' : role === 'icto_admin' ? 'ICTO Admin' : role.replace(/([A-Z])/g, ' $1').trim()}`,
              email: currentUser.email,
              role: role,
              office: office || null,
              status: 'Active',
              isDemo: true,
              organizationId: organizationId || null,
              assignedDistrictId: assignedDistrictId || null,
              createdAt: profile?.createdAt || serverTimestamp(),
              updatedAt: serverTimestamp()
            };

            await setDoc(userDocRef, demoProfile);
            setUserProfile(demoProfile);

            // Seed standard demo templates so UI functions perfectly
            try {
              const deletedIds = await seedDemoTemplatesAndData();
              if (role === 'Learner') {
                await seedLearnerWorkflowData(currentUser.uid, currentUser.email || '', demoProfile.name, deletedIds);
              }
            } catch (e) {
              console.error("Error seeding demo templates:", e);
            }
          } else {
            localStorage.setItem('is_demo_user', 'false');
            
            // Regular real user authentication profile lookup
            const userDocRef = doc(db, 'users', currentUser.uid);
            const userDoc = await getDoc(userDocRef);
            
            let profile = userDoc.exists() ? userDoc.data() : null;

            const usersRef = collection(db, 'users');
            const q = query(usersRef, where('email', '==', currentUser.email));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
              const adminDoc = querySnapshot.docs.find(d => d.id !== currentUser.uid) || querySnapshot.docs[0];
              const adminData = adminDoc.data();

              if (adminDoc.id !== currentUser.uid || !profile || (profile.role === 'Learner' && adminData.role !== 'Learner')) {
                profile = {
                  ...(profile || {}),
                  ...adminData,
                  uid: currentUser.uid,
                  updatedAt: serverTimestamp()
                };
                await setDoc(userDocRef, profile);
              }
            }

            if (profile) {
              const isCenter = profile.role === 'TrainingCenter';
              if (isCenter && profile.organizationId) {
                try {
                  const orgDoc = await getDoc(doc(db, 'organizations', profile.organizationId));
                  if (orgDoc.exists()) {
                    const orgData = orgDoc.data();
                    if (orgData.assignedDistrictId && profile.assignedDistrictId !== orgData.assignedDistrictId) {
                      profile.assignedDistrictId = orgData.assignedDistrictId;
                      await updateDoc(userDocRef, { assignedDistrictId: orgData.assignedDistrictId });
                    }
                  }
                } catch (e) {
                  console.error("Error syncing district ID:", e);
                }
              }
              setUserProfile(profile);
            } else {
              const newProfile = {
                uid: currentUser.uid,
                name: currentUser.displayName || 'New Learner',
                email: currentUser.email,
                role: 'Learner',
                createdAt: serverTimestamp(),
              };
              await setDoc(userDocRef, newProfile);
              setUserProfile(newProfile);
            }
          }
        } else {
          localStorage.setItem('is_demo_user', 'false');
          setUserProfile(null);
        }
      } catch (err: any) {
        console.error("Error loading user authenticated session:", err);
        const errMsg = err?.message || String(err);
        if (errMsg.includes('offline') || errMsg.includes('client is offline')) {
          setOfflineError("Firestore client is offline.");
        }
      } finally {
        setLoading(false);
        setIsAuthReady(true);
      }
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    try {
      localStorage.setItem('is_demo_user', 'false');
      await auth.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <FirebaseContext.Provider value={{ user, userProfile, loading, isAuthReady, logout, offlineError }}>
      {children}
    </FirebaseContext.Provider>
  );
};
