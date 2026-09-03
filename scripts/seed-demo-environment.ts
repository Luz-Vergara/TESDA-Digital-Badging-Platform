import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  setDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut
} from 'firebase/auth';
import * as fs from 'fs';
import * as path from 'path';

import { demoAccountGroups } from '../src/config/demoAccounts.js';

async function seedDemoEnvironment() {
  console.log('=== Digital Badging Demo Environment Seeder ===');

  // Load config
  const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
  if (!fs.existsSync(configPath)) {
    console.error('Error: firebase-applet-config.json not found in root directory.');
    process.exit(1);
  }

  const rawConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const firebaseConfig = {
    apiKey: rawConfig.apiKey,
    authDomain: rawConfig.authDomain,
    projectId: rawConfig.projectId,
    storageBucket: rawConfig.storageBucket,
    messagingSenderId: rawConfig.messagingSenderId,
    appId: rawConfig.appId,
    measurementId: rawConfig.measurementId
  };

  const projectId = rawConfig.projectId;
  const databaseId = rawConfig.firestoreDatabaseId || '(default)';

  console.log(`Target Firebase Project:  ${projectId}`);
  console.log(`Target Firestore Database: ${databaseId}`);
  console.log('');

  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app, databaseId);
  const auth = getAuth(app);

  const candidatePasswords = [
    process.env.DEMO_PASSWORD,
    'demo123456',
    '123456',
    'password123',
    'demo123',
    'password',
    'tesda123'
  ].filter(Boolean) as string[];

  // 1. Resolve Demo Auth UIDs
  console.log('--- Step 1: Resolving & Ensuring Demo Firebase Auth Accounts ---');
  const allAccounts = demoAccountGroups.flatMap(group =>
    group.accounts.map(acc => ({ ...acc, role: group.role }))
  );

  const resolvedUsers = new Map<string, { uid: string; email: string; label: string; role: string; passwordUsed?: string }>();

  for (const acc of allAccounts) {
    const emailLower = acc.email.toLowerCase();
    let resolvedUid: string | null = null;
    let validPassword = candidatePasswords[0];

    // Try signing in with candidate passwords
    for (const pwd of candidatePasswords) {
      try {
        const userCred = await signInWithEmailAndPassword(auth, acc.email, pwd);
        resolvedUid = userCred.user.uid;
        validPassword = pwd;
        await signOut(auth);
        break;
      } catch (err: any) {
        // Try next password
      }
    }

    // If account doesn't exist yet, attempt administrative creation
    if (!resolvedUid) {
      for (const pwd of candidatePasswords) {
        try {
          const userCred = await createUserWithEmailAndPassword(auth, acc.email, pwd);
          resolvedUid = userCred.user.uid;
          validPassword = pwd;
          await signOut(auth);
          console.log(`  [CREATED AUTH USER] ${acc.email} created in Firebase Auth.`);
          break;
        } catch (err: any) {
          if (err.code === 'auth/email-already-in-use') {
            // Account exists with a non-matching password
            break;
          }
        }
      }
    }

    // Fallback: check if user profile exists in Firestore
    if (!resolvedUid) {
      try {
        // Sign in with any known working demo account to perform Firestore query
        const workingAccount = Array.from(resolvedUsers.values())[0];
        if (workingAccount) {
          await signInWithEmailAndPassword(auth, workingAccount.email, workingAccount.passwordUsed || 'demo123456');
          const usersRef = collection(db, 'users');
          const q = query(usersRef, where('email', '==', acc.email));
          const snap = await getDocs(q);
          if (!snap.empty) {
            resolvedUid = snap.docs[0].id;
          }
          await signOut(auth);
        }
      } catch (e) {
        // Ignore fallback error
      }
    }

    if (resolvedUid) {
      resolvedUsers.set(emailLower, {
        uid: resolvedUid,
        email: acc.email,
        label: acc.label,
        role: acc.role,
        passwordUsed: validPassword
      });
      console.log(`  [RESOLVED] ${acc.email} => UID: ${resolvedUid} (${acc.role})`);
    } else {
      console.warn(`  [MISSING] Account ${acc.email} could not be authenticated or created.`);
    }
  }

  console.log(`\nSuccessfully resolved ${resolvedUsers.size} of ${allAccounts.length} demo accounts.\n`);

  if (resolvedUsers.size === 0) {
    console.error('Fatal: No demo accounts could be resolved or authenticated.');
    process.exit(1);
  }

  // Pick an active demo user to authenticate all subsequent Firestore writes
  const primaryDemoUser = Array.from(resolvedUsers.values())[0];
  console.log(`Authenticating Firestore write session as demo user: ${primaryDemoUser.email}...`);
  await signInWithEmailAndPassword(auth, primaryDemoUser.email, primaryDemoUser.passwordUsed || 'demo123456');

  // 2. Seed /users/{uid} profiles
  console.log('\n--- Step 2: Seeding User Profiles (/users/{uid}) ---');
  for (const [emailLower, acc] of resolvedUsers.entries()) {
    let office = '';
    let organizationId: string | null = null;
    let assignedDistrictId: string | null = null;

    if (acc.role === 'TrainingCenter') {
      if (emailLower === 'training1@demo.com') {
        organizationId = 'demo-training-center-1';
        office = 'Demo Training Center 1';
      } else if (emailLower === 'training2@demo.com') {
        organizationId = 'demo-training-center-2';
        office = 'Demo Training Center 2';
      } else {
        organizationId = 'demo-training-center';
        office = 'Demo Training Center - Manila';
      }
      assignedDistrictId = 'demo-district-office';
    } else if (acc.role === 'AssessmentCenter') {
      organizationId = 'demo-assessment-center';
      assignedDistrictId = 'demo-district-office';
      office = 'Demo Assessment Center - Manila';
    } else if (acc.role === 'DistrictOffice') {
      organizationId = 'demo-district-office';
      assignedDistrictId = 'demo-district-office';
      office = 'Demo District Office - National Capital Region';
    } else if (acc.role === 'qso_admin') {
      office = 'Central QSO';
    } else if (acc.role === 'icto_admin') {
      office = 'ICTO Central';
    } else if (acc.role === 'Admin') {
      office = 'TESDA Main';
    }

    let profileName = acc.label;
    if (emailLower === 'learner@demo.com') profileName = 'Juan Dela Cruz';
    if (emailLower === 'learner2@demo.com') profileName = 'Maria Santos';
    if (emailLower === 'learner3@demo.com') profileName = 'Demo Learner 3 (Kiko Binetez)';
    if (emailLower === 'learner4@demo.com') profileName = 'Andres Bonifacio';
    if (emailLower === 'learner5@demo.com') profileName = 'Emilio Aguinaldo';

    // Sign in as this specific user to meet owner create rule if needed
    try {
      await signOut(auth);
      await signInWithEmailAndPassword(auth, acc.email, acc.passwordUsed || 'demo123456');
    } catch (e) {
      // Re-authenticate as primary demo user if individual switch fails
      await signInWithEmailAndPassword(auth, primaryDemoUser.email, primaryDemoUser.passwordUsed || 'demo123456');
    }

    const userRef = doc(db, 'users', acc.uid);
    const existingSnap = await getDoc(userRef);

    const profileData = {
      uid: acc.uid,
      name: profileName,
      email: acc.email,
      role: acc.role,
      office: office || null,
      status: 'Active',
      isDemo: true,
      organizationId,
      assignedDistrictId,
      createdAt: existingSnap.exists() ? (existingSnap.data()?.createdAt || serverTimestamp()) : serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    await setDoc(userRef, profileData, { merge: true });
    console.log(`  [USER PROFILE] ${acc.email} (${acc.uid}) updated.`);
  }

  // Re-authenticate as primary demo user for global seeding
  await signOut(auth);
  await signInWithEmailAndPassword(auth, primaryDemoUser.email, primaryDemoUser.passwordUsed || 'demo123456');

  // 3. Seed Global Organizations
  console.log('\n--- Step 3: Seeding Global Organizations ---');
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
    const snap = await getDoc(orgRef);
    await setDoc(orgRef, {
      ...org,
      createdAt: snap.exists() ? (snap.data()?.createdAt || serverTimestamp()) : serverTimestamp(),
      updatedAt: serverTimestamp()
    }, { merge: true });
    console.log(`  [ORGANIZATION] ${org.id} (${org.name}) seeded.`);
  }

  // 4. Seed Global Badge Templates
  console.log('\n--- Step 4: Seeding Global Badge Templates ---');
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
    const tmplRef = doc(db, 'badgeTemplates', tmpl.id);
    const snap = await getDoc(tmplRef);
    await setDoc(tmplRef, {
      ...tmpl,
      createdAt: snap.exists() ? (snap.data()?.createdAt || serverTimestamp()) : serverTimestamp(),
      updatedAt: serverTimestamp()
    }, { merge: true });
    console.log(`  [BADGE TEMPLATE] ${tmpl.id} (${tmpl.badgeName}) seeded.`);
  }

  // 5. Seed Global Program Offerings
  console.log('\n--- Step 5: Seeding Global Program Offerings ---');
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
    const offRef = doc(db, 'programOfferings', offering.id);
    const snap = await getDoc(offRef);
    await setDoc(offRef, {
      ...offering,
      createdAt: snap.exists() ? (snap.data()?.createdAt || serverTimestamp()) : serverTimestamp(),
      updatedAt: serverTimestamp()
    }, { merge: true });
    console.log(`  [PROGRAM OFFERING] ${offering.id} (${offering.programTitle}) seeded.`);
  }

  // 6. Seed Global Program Batches
  console.log('\n--- Step 6: Seeding Global Program Batches ---');
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
    const batchRef = doc(db, 'programBatches', batch.id);
    const snap = await getDoc(batchRef);
    await setDoc(batchRef, {
      ...batch,
      createdAt: snap.exists() ? (snap.data()?.createdAt || serverTimestamp()) : serverTimestamp(),
      updatedAt: serverTimestamp()
    }, { merge: true });
    console.log(`  [PROGRAM BATCH] ${batch.id} (${batch.batchName}) seeded.`);
  }

  // 7. Seed Global Badge Requests
  console.log('\n--- Step 7: Seeding Global Badge Requests ---');
  const reqRef = doc(db, 'badgeRequests', 'demo-request-1');
  const reqSnap = await getDoc(reqRef);
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
    createdAt: reqSnap.exists() ? (reqSnap.data()?.createdAt || serverTimestamp()) : serverTimestamp(),
    updatedAt: serverTimestamp()
  }, { merge: true });
  console.log('  [BADGE REQUEST] demo-request-1 seeded.');

  // 8. Seed Learner-Specific Workflow Data
  console.log('\n--- Step 8: Seeding Learner-Specific Workflow Data ---');
  const learnerAccountConfigs = [
    { email: 'learner@demo.com', name: 'Juan Dela Cruz', is1: true },
    { email: 'learner2@demo.com', name: 'Maria Santos', is2: true },
    { email: 'learner3@demo.com', name: 'Demo Learner 3 (Kiko Binetez)', is3: true },
    { email: 'learner4@demo.com', name: 'Andres Bonifacio', is4: true },
    { email: 'learner5@demo.com', name: 'Emilio Aguinaldo', is5: true }
  ];

  for (const lCfg of learnerAccountConfigs) {
    const userRes = resolvedUsers.get(lCfg.email.toLowerCase());
    if (!userRes) {
      console.warn(`  [SKIP WORKFLOW] ${lCfg.email} was not resolved in Auth/Firestore.`);
      continue;
    }

    const uid = userRes.uid;
    const email = lCfg.email;
    const name = lCfg.name;

    // A. Learner profile record (/learners/{uid})
    const nameParts = name.split(' ');
    const firstName = nameParts[0] || 'Demo';
    const lastName = nameParts.slice(1).join(' ') || 'Learner';

    let qualification = 'Computer Systems Servicing NC II';
    let status = 'Enrolled';
    if (lCfg.is1) {
      qualification = 'Cloud Computing Fundamentals';
      status = 'Applied';
    } else if (lCfg.is4) {
      qualification = 'Cloud Computing Fundamentals';
      status = 'Completed';
    }

    const tcId = (lCfg.is1 || lCfg.is4 || lCfg.is5) ? 'demo-training-center-1' : 'demo-training-center';
    const tcName = (lCfg.is1 || lCfg.is4 || lCfg.is5) ? 'Demo Training Center 1' : 'Demo Training Center - Manila';

    const learnerDocRef = doc(db, 'learners', uid);
    const learnerSnap = await getDoc(learnerDocRef);

    await setDoc(learnerDocRef, {
      id: uid,
      firstName,
      lastName,
      email,
      contactNumber: '09170000000',
      qualification,
      trainingCenterId: tcId,
      trainingCenterName: tcName,
      organizationId: tcId,
      organizationName: tcName,
      districtOfficeId: 'demo-district-office',
      districtOfficeName: 'Demo District Office - National Capital Region',
      status,
      isDemo: true,
      createdAt: learnerSnap.exists() ? (learnerSnap.data()?.createdAt || serverTimestamp()) : serverTimestamp(),
      updatedAt: serverTimestamp()
    }, { merge: true });
    console.log(`  [LEARNER REC] /learners/${uid} (${email}) seeded.`);

    // B. Enrollments
    if (lCfg.is1) {
      const enrRef1 = doc(db, 'enrollments', `demo-enr-learner1-cloud-${uid}`);
      const snap1 = await getDoc(enrRef1);
      await setDoc(enrRef1, {
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
        dateApplied: snap1.exists() ? (snap1.data()?.dateApplied || serverTimestamp()) : serverTimestamp(),
        isDemo: true,
        createdAt: snap1.exists() ? (snap1.data()?.createdAt || serverTimestamp()) : serverTimestamp(),
        updatedAt: serverTimestamp()
      }, { merge: true });

      const enrRef2 = doc(db, 'enrollments', `demo-enr-learner1-css-${uid}`);
      const snap2 = await getDoc(enrRef2);
      await setDoc(enrRef2, {
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
        dateApplied: snap2.exists() ? (snap2.data()?.dateApplied || serverTimestamp()) : serverTimestamp(),
        isDemo: true,
        createdAt: snap2.exists() ? (snap2.data()?.createdAt || serverTimestamp()) : serverTimestamp(),
        updatedAt: serverTimestamp()
      }, { merge: true });
    }

    if (lCfg.is2) {
      const enrRef3 = doc(db, 'enrollments', `demo-enr-learner2-css-${uid}`);
      const snap3 = await getDoc(enrRef3);
      await setDoc(enrRef3, {
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
        dateApplied: snap3.exists() ? (snap3.data()?.dateApplied || serverTimestamp()) : serverTimestamp(),
        isDemo: true,
        createdAt: snap3.exists() ? (snap3.data()?.createdAt || serverTimestamp()) : serverTimestamp(),
        updatedAt: serverTimestamp()
      }, { merge: true });
    }

    if (lCfg.is3) {
      const enrRef4 = doc(db, 'enrollments', `demo-enr-learner3-css-${uid}`);
      const snap4 = await getDoc(enrRef4);
      await setDoc(enrRef4, {
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
        dateApplied: snap4.exists() ? (snap4.data()?.dateApplied || serverTimestamp()) : serverTimestamp(),
        isDemo: true,
        createdAt: snap4.exists() ? (snap4.data()?.createdAt || serverTimestamp()) : serverTimestamp(),
        updatedAt: serverTimestamp()
      }, { merge: true });
    }

    if (lCfg.is4) {
      const enrRef5 = doc(db, 'enrollments', `demo-enr-learner4-cloud-${uid}`);
      const snap5 = await getDoc(enrRef5);
      await setDoc(enrRef5, {
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
        dateApplied: snap5.exists() ? (snap5.data()?.dateApplied || serverTimestamp()) : serverTimestamp(),
        isDemo: true,
        createdAt: snap5.exists() ? (snap5.data()?.createdAt || serverTimestamp()) : serverTimestamp(),
        updatedAt: serverTimestamp()
      }, { merge: true });
    }

    if (lCfg.is5) {
      const enrRef6 = doc(db, 'enrollments', `demo-enr-learner5-cloud-${uid}`);
      const snap6 = await getDoc(enrRef6);
      await setDoc(enrRef6, {
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
        dateApplied: snap6.exists() ? (snap6.data()?.dateApplied || serverTimestamp()) : serverTimestamp(),
        isDemo: true,
        createdAt: snap6.exists() ? (snap6.data()?.createdAt || serverTimestamp()) : serverTimestamp(),
        updatedAt: serverTimestamp()
      }, { merge: true });

      const enrRef7 = doc(db, 'enrollments', `demo-enr-learner5-css-${uid}`);
      const snap7 = await getDoc(enrRef7);
      await setDoc(enrRef7, {
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
        dateApplied: snap7.exists() ? (snap7.data()?.dateApplied || serverTimestamp()) : serverTimestamp(),
        isDemo: true,
        createdAt: snap7.exists() ? (snap7.data()?.createdAt || serverTimestamp()) : serverTimestamp(),
        updatedAt: serverTimestamp()
      }, { merge: true });
    }

    // C. Issued Badges
    if (!lCfg.is3) {
      let templId = 'demo-template-1';
      let badgeName = 'Computer Systems Servicing NC II';
      let badgeType = 'Master';
      let qCode = 'CSS-NCII-2026';
      let tcIdIssued = 'demo-training-center';
      let tcNameIssued = 'Demo Training Center - Manila';
      let desc = 'Holds formal qualifications under national competency standard guidelines on hardware and networking configurations.';

      if (lCfg.is1 || lCfg.is4) {
        templId = 'demo-template-2';
        badgeName = 'Cloud Computing Fundamentals';
        badgeType = 'Expert';
        qCode = 'CCF-NC-2026';
        tcIdIssued = 'demo-training-center-1';
        tcNameIssued = 'Demo Training Center 1';
        desc = 'Maintains competency qualifications standard in cloud configurations, server setup, and cloud security compliance.';
      }

      const activeBadgeRef = doc(db, 'issuedBadges', `demo-issued-${uid}-primary`);
      const snapB = await getDoc(activeBadgeRef);

      const verificationId = `V-${uid.slice(0, 6).toUpperCase()}-2026`;
      const badgeId = `TESDA-${qCode.split('-')[0]}-N${badgeType === 'Master' ? '3' : '2'}-88888`;
      const verificationUrl = `https://tesda-digital-badge.gov.ph/#/verify/${verificationId}`;

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
        trainingCenterId: tcIdIssued,
        trainingCenterName: tcNameIssued,
        districtOfficeId: 'demo-district-office',
        districtOfficeName: 'Demo District Office - National Capital Region',
        issueDate: snapB.exists() ? (snapB.data()?.issueDate || serverTimestamp()) : serverTimestamp(),
        dateIssued: snapB.exists() ? (snapB.data()?.dateIssued || serverTimestamp()) : serverTimestamp(),
        validUntil: Timestamp.fromDate(new Date(Date.now() + 36 * 30 * 24 * 60 * 60 * 1000)),
        expiryDate: Timestamp.fromDate(new Date(Date.now() + 36 * 30 * 24 * 60 * 60 * 1000)),
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
        createdAt: snapB.exists() ? (snapB.data()?.createdAt || serverTimestamp()) : serverTimestamp(),
        updatedAt: serverTimestamp()
      }, { merge: true });

      // Also update learner doc status
      await setDoc(learnerDocRef, {
        badgeStatus: 'Active',
        status: 'Completed',
        qualification: badgeName,
        updatedAt: serverTimestamp()
      }, { merge: true });
    }

    if (lCfg.is2) {
      const secBadgeRef = doc(db, 'issuedBadges', `demo-issued-${uid}-secondary`);
      const snapSec = await getDoc(secBadgeRef);

      const verificationId = `V-CSS-${uid.slice(0, 4).toUpperCase()}-9999`;
      const badgeId = `TESDA-CSS-N1-77777`;
      const verificationUrl = `https://tesda-digital-badge.gov.ph/#/verify/${verificationId}`;

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
        issueDate: snapSec.exists() ? (snapSec.data()?.issueDate || serverTimestamp()) : serverTimestamp(),
        dateIssued: snapSec.exists() ? (snapSec.data()?.dateIssued || serverTimestamp()) : serverTimestamp(),
        validUntil: Timestamp.fromDate(new Date(Date.now() + 36 * 30 * 24 * 60 * 60 * 1000)),
        expiryDate: Timestamp.fromDate(new Date(Date.now() + 36 * 30 * 24 * 60 * 60 * 1000)),
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
        createdAt: snapSec.exists() ? (snapSec.data()?.createdAt || serverTimestamp()) : serverTimestamp(),
        updatedAt: serverTimestamp()
      }, { merge: true });
    }
  }

  await signOut(auth);
  console.log('\n=== Demo Environment Provisioning Complete! ===');
}

seedDemoEnvironment().catch(err => {
  console.error('Fatal seeding error:', err);
  process.exit(1);
});
