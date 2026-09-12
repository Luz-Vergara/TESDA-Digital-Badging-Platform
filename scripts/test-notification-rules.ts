import { readFileSync } from 'node:fs';
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { collection, doc, getDocs, query, serverTimestamp, setDoc, where, deleteDoc } from 'firebase/firestore';

if (!process.env.FIRESTORE_EMULATOR_HOST) throw new Error('Set FIRESTORE_EMULATOR_HOST to a local Firestore emulator. This test never uses production.');
const env = await initializeTestEnvironment({ projectId: 'demo-notification-rules', firestore: {
  rules: readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8'),
} });
try {
  const owner = env.authenticatedContext('owner', { email: 'owner@example.com' }).firestore();
  const other = env.authenticatedContext('other', { email: 'other@example.com' }).firestore();
  const demo = env.authenticatedContext('demo', { email: 'learner@demo.com' }).firestore();
  const anonymous = env.unauthenticatedContext().firestore();
  const path = 'users/owner/notificationReads/event-1';
  const receipt = () => ({ isDemo: false, readAt: serverTimestamp() });
  await assertSucceeds(setDoc(doc(owner, path), receipt()));
  await assertSucceeds(setDoc(doc(owner, path), receipt()));
  await assertSucceeds(getDocs(query(collection(owner, 'users/owner/notificationReads'), where('isDemo', '==', false))));
  await assertFails(setDoc(doc(other, path), receipt()));
  await assertFails(getDocs(query(collection(other, 'users/owner/notificationReads'), where('isDemo', '==', false))));
  await assertFails(setDoc(doc(anonymous, path), receipt()));
  await assertFails(setDoc(doc(owner, path), { ...receipt(), message: 'Spoofed notification' }));
  await assertFails(setDoc(doc(owner, path), { isDemo: true, readAt: serverTimestamp() }));
  await assertFails(setDoc(doc(owner, path), { isDemo: false, readAt: 'fake' }));
  await assertFails(deleteDoc(doc(owner, path)));
  await assertSucceeds(setDoc(doc(demo, 'users/demo/notificationReads/event-1'), { isDemo: true, readAt: serverTimestamp() }));
  await assertFails(setDoc(doc(demo, 'users/demo/notificationReads/event-2'), receipt()));
  await env.withSecurityRulesDisabled(async context => {
    await setDoc(doc(context.firestore(), 'users/demo/notificationReads/production'), { isDemo: false, readAt: new Date() });
  });
  await assertFails(setDoc(doc(demo, 'users/demo/notificationReads/production'), { isDemo: true, readAt: serverTimestamp() }));
  console.log('Notification receipt authorization tests passed.');
} finally { await env.cleanup(); }
