import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

if (process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8187' || process.env.FIREBASE_AUTH_EMULATOR_HOST !== '127.0.0.1:9197') {
  throw new Error('Local emulators on ports 8187/9197 are required; production access is forbidden.');
}
initializeApp({ projectId: 'demo-notification-smoke' });
const db = getFirestore();
const mode = process.argv[2] || 'seed';
const request = db.doc('badgeRequests/smoke-request');
if (mode === 'seed') {
  for (const [uid, email, role, organizationId] of [
    ['smoke-learner', 'learner@demo.com', 'Learner', ''],
    ['smoke-training', 'training@demo.com', 'TrainingCenter', 'smoke-center'],
    ['smoke-district', 'district@demo.com', 'DistrictOffice', 'smoke-district'],
  ]) {
    try { await getAuth().createUser({ uid, email, password: 'LocalSmoke123!' }); }
    catch (error) { if ((error as { code?: string }).code !== 'auth/uid-already-exists') throw error; }
    await db.doc(`users/${uid}`).set({ email, role, organizationId, office: organizationId,
      name: role + ' smoke', isDemo: true });
  }
  await db.doc('organizations/smoke-center').set({ name: 'Smoke Center', type: 'TrainingCenter', status: 'Active', assignedDistrictId: 'smoke-district', isDemo: true });
  await db.doc('organizations/smoke-district').set({ name: 'smoke-district', type: 'DistrictOffice', isDemo: true });
  const shared = { learnerId: 'smoke-learner', learnerIds: ['smoke-learner'], trainingCenterId: 'smoke-center',
    districtOfficeId: 'smoke-district', isDemo: true, createdAt: Timestamp.fromMillis(100000), updatedAt: Timestamp.fromMillis(100000) };
  await request.set({ ...shared, status: 'Pending Review', badgeTemplateName: 'Historical request', submittedAt: shared.createdAt });
  await db.doc('issuedBadges/smoke-badge').set({ ...shared, badgeTemplateName: 'Historical badge', status: 'Active', issueDate: shared.createdAt });
  await db.doc('rplApplications/smoke-rpl').set({ ...shared, qualificationName: 'Historical RPL', status: 'Submitted' });
  await db.doc('badgeRequests/production-hidden').set({ ...shared, isDemo: false, status: 'Pending Review', badgeTemplateName: 'PRODUCTION MUST NOT SHOW' });
} else if (mode === 'metadata') {
  await request.update({ remarks: 'Unrelated edit', updatedAt: Timestamp.now() });
} else if (mode === 'status') {
  await request.update({ status: process.argv[3] || 'Approved', updatedAt: Timestamp.now() });
} else if (mode === 'new') {
  await db.doc('issuedBadges/smoke-new-' + Date.now()).set({ learnerId: 'smoke-learner', trainingCenterId: 'smoke-center',
    districtOfficeId: 'smoke-district', isDemo: true, badgeTemplateName: 'New smoke badge', status: 'Active', issueDate: Timestamp.now() });
} else if (mode === 'rpl') {
  await db.doc('rplApplications/smoke-rpl').update({ status: 'Needs Additional Evidence', updatedAt: Timestamp.now() });
} else { throw new Error('Unknown fixture operation'); }
console.log('Local notification smoke fixtures: ' + mode);
