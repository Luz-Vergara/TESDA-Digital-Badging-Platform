/**
 * Projects approved Firestore integration links into private Supabase API
 * scopes. Run only from a trusted administrator environment:
 *
 *   GOOGLE_APPLICATION_CREDENTIALS=/secure/path/service-account.json
 *   FIRESTORE_DATABASE_ID=optional-named-database-id
 *   SUPABASE_URL=https://PROJECT.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY=...
 *   APPLY=true npm run sync-integration-scopes
 *
 * Without APPLY=true, the script is a read-only dry run.
 */
import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { createClient } from '@supabase/supabase-js';

type Link = { id: string; active: boolean; linkVersion: number; externalTrainingCenterId?: string; firebaseLearnerId?: string };
type Scope = { firebase_uid: string; scope_type: 'training_center_read' | 'learner_read'; external_training_center_id: string | null; external_learner_uli: string | null; firestore_link_id: string; firestore_link_version: number; active: boolean; revoked_at: string | null };

const required = (name: string) => {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required.`);
  return value;
};
const apply = process.env.APPLY === 'true';

async function main() {
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!getApps().length) {
    initializeApp({ credential: serviceAccountJson ? cert(JSON.parse(serviceAccountJson)) : applicationDefault() });
  }
  // Firebase projects may use a named Firestore database rather than
  // "(default)". Omit FIRESTORE_DATABASE_ID only when the default database is
  // the one that owns the integration-link collections.
  const firestoreDatabaseId = process.env.FIRESTORE_DATABASE_ID;
  const firestore = firestoreDatabaseId ? getFirestore(undefined, firestoreDatabaseId) : getFirestore();
  const firebaseAuth = getAuth();
  const supabase = createClient(required('SUPABASE_URL'), required('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false, autoRefreshToken: false } });

  const [centerSnapshot, learnerSnapshot] = await Promise.all([
    firestore.collection('integrationTrainingCenterLinks').get(),
    firestore.collection('integrationLearnerLinks').get(),
  ]);
  const centerLinks: Link[] = centerSnapshot.docs.map((item) => ({ id: `integrationTrainingCenterLinks/${item.id}`, ...item.data() } as Link));
  const learnerLinks: Link[] = learnerSnapshot.docs.map((item) => ({ id: `integrationLearnerLinks/${item.id}`, ...item.data() } as Link));
  const scopes: Scope[] = [];

  for (const link of centerLinks) {
    if (!link.active || !link.externalTrainingCenterId || !link.linkVersion) continue;
    const profiles = await firestore.collection('users').where('organizationId', '==', link.id.split('/')[1]).get();
    profiles.docs.filter((profile) => profile.data().role === 'TrainingCenter').forEach((profile) => scopes.push({
      firebase_uid: profile.id, scope_type: 'training_center_read', external_training_center_id: link.externalTrainingCenterId!, external_learner_uli: null,
      firestore_link_id: link.id, firestore_link_version: link.linkVersion, active: true, revoked_at: null,
    }));
  }
  for (const link of learnerLinks) {
    const learnerUli = link.id.split('/')[1];
    if (!link.active || !link.firebaseLearnerId || !link.linkVersion) continue;
    scopes.push({
      firebase_uid: link.firebaseLearnerId, scope_type: 'learner_read', external_training_center_id: null, external_learner_uli: learnerUli,
      firestore_link_id: link.id, firestore_link_version: link.linkVersion, active: true, revoked_at: null,
    });
  }

  console.log(`${apply ? 'Applying' : 'Dry run:'} ${scopes.length} derived Integration API scopes.`);
  if (!apply) return;

  // The service-role-only RPC performs revocation and upsert in one database
  // transaction. integration.api_scopes stays outside the exposed Data API.
  const linkIds = [...new Set([...centerLinks, ...learnerLinks].map((link) => link.id))];
  const { error: scopeError } = await supabase.rpc('replace_integration_api_scopes', {
    p_link_ids: linkIds,
    p_scopes: scopes,
  });
  if (scopeError) throw new Error(`Unable to project Integration API scopes: ${scopeError.message}`);
  for (const uid of [...new Set(scopes.map((scope) => scope.firebase_uid))]) {
    const user = await firebaseAuth.getUser(uid);
    await firebaseAuth.setCustomUserClaims(uid, { ...(user.customClaims ?? {}), role: 'authenticated' });
  }
  console.log('Scopes provisioned and Firebase third-party-auth claims refreshed. Users must refresh their ID token.');
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
