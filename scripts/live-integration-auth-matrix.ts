import { readFileSync } from "node:fs";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { createClient } from "@supabase/supabase-js";

type Subject = { email: string; uid: string; token: string };
type CaseResult = { label: string; expected: number | number[]; actual: number; passed: boolean };
type Invocation = { status: number; code: string; message: string };

const required = (name: string): string => {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
};

const supabaseUrl = required("SUPABASE_URL").replace(/\/$/, "");
const serviceRoleKey = required("SUPABASE_SERVICE_ROLE_KEY");
const firebaseConfig = JSON.parse(readFileSync("firebase-applet-config.json", "utf8")) as {
  apiKey: string;
  projectId: string;
};
const firebaseApp = getApps()[0] ?? initializeApp({
  credential: cert(required("GOOGLE_APPLICATION_CREDENTIALS")),
  projectId: firebaseConfig.projectId,
});
const firebaseAuth = getAuth(firebaseApp);
const firestore = getFirestore(firebaseApp, required("FIRESTORE_DATABASE_ID"));
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function firebaseSubject(email: string, transientClaims?: Record<string, unknown>): Promise<Subject> {
  const user = await firebaseAuth.getUserByEmail(email);
  const customToken = await firebaseAuth.createCustomToken(user.uid, transientClaims);
  const exchange = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${encodeURIComponent(firebaseConfig.apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: customToken, returnSecureToken: true }),
    },
  );
  if (!exchange.ok) throw new Error(`Firebase custom-token exchange failed for ${email}: HTTP ${exchange.status}`);
  const body = await exchange.json() as { idToken?: string };
  if (!body.idToken) throw new Error(`Firebase custom-token exchange returned no ID token for ${email}`);
  return { email, uid: user.uid, token: body.idToken };
}

async function invoke(subject: Subject, path: string): Promise<Invocation> {
  return invokeToken(subject.token, path);
}

async function invokeToken(token: string | null, path: string): Promise<Invocation> {
  const result = await fetch(`${supabaseUrl}/functions/v1/api${path}`, {
    headers: {
      ...(token === null ? {} : { Authorization: `Bearer ${token}` }),
      apikey: serviceRoleKey,
    },
  });
  let code = "";
  let message = "";
  try {
    const body = await result.json() as { code?: unknown; message?: unknown; error?: { code?: unknown; message?: unknown } };
    code = String(body.code ?? body.error?.code ?? "");
    message = String(body.message ?? body.error?.message ?? "");
  } catch {
    // A non-JSON body has no safe structured diagnostic to report.
  }
  return { status: result.status, code, message };
}

async function runCase(results: CaseResult[], label: string, subject: Subject, path: string, expected: number | number[]) {
  const invocation = await invoke(subject, path);
  const passed = Array.isArray(expected) ? expected.includes(invocation.status) : invocation.status === expected;
  results.push({ label, expected, actual: invocation.status, passed });
  console.log(`${passed ? "PASS" : "FAIL"} | ${label} | expected=${Array.isArray(expected) ? expected.join("/") : expected} actual=${invocation.status}`);
}

async function activeScopes(uid: string) {
  const { data, error } = await supabase.rpc("get_active_integration_api_scopes", { target_firebase_uid: uid });
  if (error) throw new Error(`Active scope lookup failed: ${error.code ?? "UNKNOWN"}`);
  return data ?? [];
}

async function main() {
  const centerSpecs = [
    { email: "training@demo.com", center: "TC-DEMO-001", ownUli: "DEMO-ULI-0001", foreignUlis: ["DEMO-ULI-0006", "DEMO-ULI-0009"] },
    { email: "training1@demo.com", center: "TC-DEMO-002", ownUli: "DEMO-ULI-0006", foreignUlis: ["DEMO-ULI-0001", "DEMO-ULI-0009"] },
    { email: "training2@demo.com", center: "TC-DEMO-003", ownUli: "DEMO-ULI-0009", foreignUlis: ["DEMO-ULI-0001", "DEMO-ULI-0006"] },
  ];
  const learnerSpecs = [
    { email: "learner@demo.com", uli: "DEMO-ULI-0001", foreignUli: "DEMO-ULI-0002" },
    { email: "learner2@demo.com", uli: "DEMO-ULI-0002", foreignUli: "DEMO-ULI-0003" },
    { email: "learner3@demo.com", uli: "DEMO-ULI-0003", foreignUli: "DEMO-ULI-0004" },
    { email: "learner4@demo.com", uli: "DEMO-ULI-0004", foreignUli: "DEMO-ULI-0005" },
    { email: "learner5@demo.com", uli: "DEMO-ULI-0005", foreignUli: "DEMO-ULI-0001" },
  ];

  const centers = await Promise.all(centerSpecs.map(async (spec) => ({ ...spec, subject: await firebaseSubject(spec.email) })));
  const learners = await Promise.all(learnerSpecs.map(async (spec) => ({ ...spec, subject: await firebaseSubject(spec.email) })));
  // A transient authenticated role ensures this valid unmapped user reaches
  // the private scope layer. It does not alter persistent Firebase claims.
  const unmapped = await firebaseSubject("qso@demo.com", { role: "authenticated" });

  if (process.env.AUTH_PROBE_ONLY === "true") {
    const path = "/me/training-center/dashboard-summary";
    const valid = await invoke(centers[0].subject, path);
    const missing = await invokeToken(null, path);
    const malformed = await invokeToken("not-a-jwt", path);
    const segments = centers[0].subject.token.split(".");
    const signatureIndex = Math.floor(segments[2].length / 2);
    const signatureCharacter = segments[2][signatureIndex];
    segments[2] = `${segments[2].slice(0, signatureIndex)}${signatureCharacter === "a" ? "b" : "a"}${segments[2].slice(signatureIndex + 1)}`;
    const tampered = await invokeToken(segments.join("."), path);
    console.log(`AUTH_PROBE | valid_status=${valid.status} valid_code=${valid.code || "none"}`);
    console.log(`AUTH_PROBE | missing_status=${missing.status} missing_code=${missing.code || "none"}`);
    console.log(`AUTH_PROBE | malformed_status=${malformed.status} malformed_code=${malformed.code || "none"}`);
    console.log(`AUTH_PROBE | tampered_status=${tampered.status} tampered_code=${tampered.code || "none"}`);
    return;
  }

  let activeCount = 0;
  for (const item of [...centers, ...learners]) {
    const scopes = await activeScopes(item.subject.uid);
    activeCount += scopes.length;
    const expectedMapping = "center" in item
      ? scopes.some((scope: Record<string, unknown>) => scope.scope_type === "training_center_read" && scope.external_training_center_id === item.center)
      : scopes.some((scope: Record<string, unknown>) => scope.scope_type === "learner_read" && scope.external_learner_uli === item.uli);
    if (!expectedMapping) throw new Error(`Active scope mapping mismatch for ${item.email}`);
  }
  console.log(`VERIFY | active_scope_count=${activeCount} expected=8`);

  const results: CaseResult[] = [];
  for (const item of centers) {
    await runCase(results, `${item.center} own dashboard`, item.subject, "/me/training-center/dashboard-summary", 200);
    await runCase(results, `${item.center} own learner`, item.subject, `/learners/${item.ownUli}`, 200);
    for (const foreignUli of item.foreignUlis) {
      await runCase(results, `${item.center} foreign tenant ${foreignUli}`, item.subject, `/learners/${foreignUli}`, 403);
    }
  }
  for (const item of learners) {
    await runCase(results, `${item.uli} own learner`, item.subject, `/learners/${item.uli}`, 200);
    await runCase(results, `${item.uli} cross-learner ${item.foreignUli}`, item.subject, `/learners/${item.foreignUli}`, 403);
  }
  await runCase(results, "learner accessing Training Center route", learners[0].subject, "/me/training-center/dashboard-summary", 403);
  await runCase(results, "valid Firebase token with no approved integration scope", unmapped, "/me/training-center/dashboard-summary", [401, 403]);

  const revokedLearner = learners[4];
  const firestoreLinkId = `integrationLearnerLinks/${revokedLearner.uli}`;
  const linkSnapshot = await firestore.doc(firestoreLinkId).get();
  const linkVersion = linkSnapshot.data()?.linkVersion;
  if (!linkSnapshot.exists || typeof linkVersion !== "number") throw new Error("Learner scope link cannot be safely revoked/restored");
  const restoreScope = {
    firebase_uid: revokedLearner.subject.uid,
    scope_type: "learner_read",
    external_training_center_id: null,
    external_learner_uli: revokedLearner.uli,
    firestore_link_id: firestoreLinkId,
    firestore_link_version: linkVersion,
    active: true,
    revoked_at: null,
  };
  try {
    const { error: revokeError } = await supabase.rpc("replace_integration_api_scopes", {
      p_link_ids: [firestoreLinkId],
      p_scopes: [],
    });
    if (revokeError) throw new Error(`Scope revocation failed: ${revokeError.code ?? "UNKNOWN"}`);
    await runCase(results, "revoked learner scope", revokedLearner.subject, `/learners/${revokedLearner.uli}`, 403);
  } finally {
    const { error: restoreError } = await supabase.rpc("replace_integration_api_scopes", {
      p_link_ids: [firestoreLinkId],
      p_scopes: [restoreScope],
    });
    if (restoreError) throw new Error(`Scope restoration failed: ${restoreError.code ?? "UNKNOWN"}`);
  }
  await runCase(results, "restored learner scope", revokedLearner.subject, `/learners/${revokedLearner.uli}`, 200);

  const restoredCount = (await Promise.all([...centers, ...learners].map((item) => activeScopes(item.subject.uid))))
    .reduce((count, scopes) => count + scopes.length, 0);
  console.log(`VERIFY | restored_active_scope_count=${restoredCount} expected=8`);
  const passed = results.filter((result) => result.passed).length;
  console.log(`SUMMARY | passed=${passed} total=${results.length} active_scopes=${restoredCount}`);
  if (activeCount !== 8 || restoredCount !== 8 || passed !== results.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error(`TEST_ABORTED | ${error instanceof Error ? error.message : "Unknown error"}`);
  process.exitCode = 1;
});
