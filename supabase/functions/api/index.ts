import {
  createExternalDataSourceAdapter,
  getExternalDataSourceName,
} from "./adapters/adapter-factory.ts";
import type { ApiEnvelope } from "./types.ts";

const allowedOrigin = Deno.env.get("ALLOWED_ORIGIN") ?? "*";

const corsHeaders = {
  "Access-Control-Allow-Origin": allowedOrigin,
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
};

function response(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

function success<T>(data: T): Response {
  const body: ApiEnvelope<T> = {
    data,
    meta: {
      source: "mock-external-system",
      dataSource: getExternalDataSourceName(),
      retrievedAt: new Date().toISOString(),
    },
  };
  return response(200, body);
}

function error(status: number, code: string, message: string): Response {
  return response(status, { error: { code, message } });
}

function logicalPath(url: URL): string {
  const segments = url.pathname.split("/").filter(Boolean);
  const apiIndex = segments.lastIndexOf("api");
  const routeSegments = apiIndex >= 0 ? segments.slice(apiIndex + 1) : segments;
  return `/${routeSegments.map(decodeURIComponent).join("/")}`;
}

function isKnownRoute(path: string): boolean {
  return (
    /^\/training-centers\/[^/]+\/dashboard-summary$/.test(path) ||
    /^\/training-centers\/[^/]+\/learners$/.test(path) ||
    /^\/learners\/[^/]+$/.test(path) ||
    /^\/training-centers\/[^/]+\/badge-requests$/.test(path) ||
    /^\/badges\/[^/]+$/.test(path)
  );
}

Deno.serve(async (request) => {
  const path = logicalPath(new URL(request.url));

  if (!isKnownRoute(path)) {
    return error(404, "ROUTE_NOT_FOUND", "The requested API route was not found.");
  }
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (request.method !== "GET") {
    return error(405, "METHOD_NOT_ALLOWED", "Only GET is supported.");
  }

  try {
    const adapter = createExternalDataSourceAdapter();
    let match = path.match(
      /^\/training-centers\/([^/]+)\/dashboard-summary$/,
    );
    if (match) {
      const result = await adapter.getTrainingCenterDashboardSummary(match[1]);
      return result
        ? success(result)
        : error(404, "TRAINING_CENTER_NOT_FOUND", "Training Center not found.");
    }

    match = path.match(/^\/training-centers\/([^/]+)\/learners$/);
    if (match) {
      return success(await adapter.getTrainingCenterLearners(match[1]));
    }

    match = path.match(/^\/learners\/([^/]+)$/);
    if (match) {
      const result = await adapter.getLearnerDetails(match[1]);
      return result
        ? success(result)
        : error(404, "LEARNER_NOT_FOUND", "Learner not found.");
    }

    match = path.match(/^\/training-centers\/([^/]+)\/badge-requests$/);
    if (match) {
      return success(await adapter.getTrainingCenterBadgeRequests(match[1]));
    }

    match = path.match(/^\/badges\/([^/]+)$/);
    if (match) {
      const result = await adapter.getBadgeVerification(match[1]);
      return result
        ? success(result)
        : error(404, "BADGE_NOT_FOUND", "Badge verification record not found.");
    }

    return error(404, "ROUTE_NOT_FOUND", "The requested API route was not found.");
  } catch (caught) {
    console.error("Integration API failure", {
      path,
      message: caught instanceof Error ? caught.message : "Unknown error",
    });
    return error(
      500,
      "EXTERNAL_SOURCE_ERROR",
      "The external information system is temporarily unavailable.",
    );
  }
});
