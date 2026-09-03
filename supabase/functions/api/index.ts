import { createClient } from "@supabase/supabase-js";
import {
  createExternalDataSourceAdapter,
  getExternalDataSourceName,
  getSupabaseServerConfiguration,
  getSupabaseUserConfiguration,
} from "./adapters/adapter-factory.ts";
import type { ApiEnvelope } from "./types.ts";

type ApiScope = {
  firebase_uid: string;
  scope_type: "training_center_read" | "learner_read";
  external_training_center_id: string | null;
  external_learner_uli: string | null;
};

const configuredAllowedOrigins = (Deno.env.get("ALLOWED_ORIGIN") ?? "").split(",").map((origin) => origin.trim()).filter(Boolean);
// Keep the server-configured production/staging allow-list intact while
// permitting the local frontend used for prototype testing.
const allowedOrigins = [...new Set([...configuredAllowedOrigins, "http://localhost:3001"])];

function corsHeaders(request: Request): HeadersInit {
  const origin = request.headers.get("origin");
  const allowOrigin = origin && allowedOrigins.includes(origin) ? origin : null;
  return {
    ...(allowOrigin ? { "Access-Control-Allow-Origin": allowOrigin } : {}),
    "Access-Control-Allow-Headers": "authorization, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Content-Type": "application/json; charset=utf-8",
    Vary: "Origin",
  };
}

function response(request: Request, status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders(request) });
}
function error(request: Request, status: number, code: string, message: string): Response {
  return response(request, status, { error: { code, message } });
}
function success<T>(request: Request, data: T): Response {
  const body: ApiEnvelope<T> = { data, meta: { source: "mock-external-system", dataSource: getExternalDataSourceName(), retrievedAt: new Date().toISOString() } };
  return response(request, 200, body);
}
function logicalPath(url: URL): string {
  const segments = url.pathname.split("/").filter(Boolean);
  const apiIndex = segments.lastIndexOf("api");
  return `/${(apiIndex >= 0 ? segments.slice(apiIndex + 1) : segments).map(decodeURIComponent).join("/")}`;
}
function known(path: string): boolean {
  return path === "/me/training-center/dashboard-summary" || path === "/me/training-center/learners" || /^\/learners\/[^/]+$/.test(path);
}

function bearerToken(request: Request): string | null {
  const authorization = request.headers.get("authorization") ?? "";
  const match = authorization.match(/^Bearer\s+([^\s]+)$/i);
  return match?.[1] ?? null;
}

async function authenticatedFirebaseSubject(token: string): Promise<string | null> {
  try {
    const { url, publishableKey } = getSupabaseUserConfiguration();
    const userClient = createClient(url, publishableKey, {
      accessToken: async () => token,
      auth: { persistSession: false, autoRefreshToken: false },
    });
    // This Data API call validates the Firebase signature, expiry, issuer,
    // audience, and authenticated role through the configured third-party Auth
    // integration. Only its returned subject is trusted for authorization.
    const { data, error: authenticationError } = await userClient.rpc("get_authenticated_firebase_subject");
    if (authenticationError || typeof data !== "string" || !data.trim()) return null;
    return data;
  } catch {
    return null;
  }
}

async function activeScopes(firebaseUid: string): Promise<ApiScope[]> {
  // The scope table remains in the unexposed integration schema. This
  // service-role-only SECURITY INVOKER RPC is the narrow server-side bridge.
  const { url, serviceRoleKey } = getSupabaseServerConfiguration();
  const scopeClient = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error: scopeError } = await scopeClient
    .rpc("get_active_integration_api_scopes", { target_firebase_uid: firebaseUid });
  if (scopeError) throw new Error("Integration API scope lookup failed");
  return (data ?? []) as ApiScope[];
}

function oneTrainingCenterScope(scopes: ApiScope[]): string | null {
  const centers = [...new Set(scopes.filter((scope) => scope.scope_type === "training_center_read" && scope.external_training_center_id).map((scope) => scope.external_training_center_id as string))];
  return centers.length === 1 ? centers[0] : null;
}

Deno.serve(async (request) => {
  const path = logicalPath(new URL(request.url));
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(request) });

  const token = bearerToken(request);
  if (!token) return error(request, 401, "UNAUTHENTICATED", "A valid Firebase authentication token is required.");
  const firebaseUid = await authenticatedFirebaseSubject(token);
  if (!firebaseUid) return error(request, 401, "UNAUTHENTICATED", "A valid Firebase authentication token is required.");

  if (!known(path)) return error(request, 404, "ROUTE_NOT_FOUND", "The requested API route was not found.");
  if (request.method !== "GET") return error(request, 405, "METHOD_NOT_ALLOWED", "Only GET is supported.");

  try {
    const scopes = await activeScopes(firebaseUid);
    const centerId = oneTrainingCenterScope(scopes);

    if (path === "/me/training-center/dashboard-summary" || path === "/me/training-center/learners") {
      if (!centerId) return error(request, 403, "SCOPE_DENIED", "No unambiguous Training Center data scope is active for this Firebase identity.");
      const adapter = createExternalDataSourceAdapter();
      const data = path.endsWith("dashboard-summary")
        ? await adapter.getTrainingCenterDashboardSummary(centerId)
        : await adapter.getTrainingCenterLearners(centerId);
      return data ? success(request, data) : error(request, 404, "TRAINING_CENTER_NOT_FOUND", "The mapped Training Center was not found in the external system.");
    }

    const learnerUli = path.match(/^\/learners\/([^/]+)$/)?.[1] ?? "";
    const hasLearnerScope = scopes.some((scope) => scope.scope_type === "learner_read" && scope.external_learner_uli === learnerUli);
    if (!hasLearnerScope && !centerId) return error(request, 403, "SCOPE_DENIED", "This Firebase identity is not authorized to view that learner record.");
    const adapter = createExternalDataSourceAdapter();
    const hasCenterScope = centerId ? await adapter.learnerBelongsToTrainingCenter(learnerUli, centerId) : false;
    if (!hasLearnerScope && !hasCenterScope) return error(request, 403, "SCOPE_DENIED", "This Firebase identity is not authorized to view that learner record.");
    const learner = await adapter.getLearnerDetails(learnerUli);
    return learner ? success(request, learner) : error(request, 404, "LEARNER_NOT_FOUND", "Learner not found.");
  } catch (caught) {
    console.error("Integration API failure", { path, message: caught instanceof Error ? caught.message : "Unknown error" });
    return error(request, 500, "EXTERNAL_SOURCE_ERROR", "The external information system is temporarily unavailable.");
  }
});
