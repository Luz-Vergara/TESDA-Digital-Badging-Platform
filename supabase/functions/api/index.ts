import {
  createExternalDataSourceAdapter,
  getExternalDataSourceName,
} from "./adapters/adapter-factory.ts";
import type { ApiEnvelope } from "./types.ts";

const allowedOrigins = (Deno.env.get("ALLOWED_ORIGIN") ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

function corsHeaders(request: Request): HeadersInit {
  const requestOrigin = request.headers.get("Origin");
  const allowOrigin = requestOrigin && allowedOrigins.includes(requestOrigin)
    ? requestOrigin
    : null;

  return {
    ...(allowOrigin ? { "Access-Control-Allow-Origin": allowOrigin } : {}),
    "Access-Control-Allow-Headers": "content-type",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Content-Type": "application/json; charset=utf-8",
    Vary: "Origin",
  };
}

function response(request: Request, status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders(request),
  });
}

function success<T>(request: Request, data: T): Response {
  const body: ApiEnvelope<T> = {
    data,
    meta: {
      source: "mock-external-system",
      dataSource: getExternalDataSourceName(),
      retrievedAt: new Date().toISOString(),
    },
  };
  return response(request, 200, body);
}

function error(
  request: Request,
  status: number,
  code: string,
  message: string,
): Response {
  return response(request, status, { error: { code, message } });
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
    return error(
      request,
      404,
      "ROUTE_NOT_FOUND",
      "The requested API route was not found.",
    );
  }
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(request) });
  }
  if (request.method !== "GET") {
    return error(request, 405, "METHOD_NOT_ALLOWED", "Only GET is supported.");
  }

  try {
    const adapter = createExternalDataSourceAdapter();
    let match = path.match(
      /^\/training-centers\/([^/]+)\/dashboard-summary$/,
    );
    if (match) {
      const result = await adapter.getTrainingCenterDashboardSummary(match[1]);
      return result
        ? success(request, result)
        : error(
          request,
          404,
          "TRAINING_CENTER_NOT_FOUND",
          "Training Center not found.",
        );
    }

    match = path.match(/^\/training-centers\/([^/]+)\/learners$/);
    if (match) {
      return success(
        request,
        await adapter.getTrainingCenterLearners(match[1]),
      );
    }

    match = path.match(/^\/learners\/([^/]+)$/);
    if (match) {
      const result = await adapter.getLearnerDetails(match[1]);
      return result
        ? success(request, result)
        : error(request, 404, "LEARNER_NOT_FOUND", "Learner not found.");
    }

    match = path.match(/^\/training-centers\/([^/]+)\/badge-requests$/);
    if (match) {
      return success(
        request,
        await adapter.getTrainingCenterBadgeRequests(match[1]),
      );
    }

    match = path.match(/^\/badges\/([^/]+)$/);
    if (match) {
      const result = await adapter.getBadgeVerification(match[1]);
      return result
        ? success(request, result)
        : error(request, 404, "BADGE_NOT_FOUND", "Badge verification record not found.");
    }

    return error(
      request,
      404,
      "ROUTE_NOT_FOUND",
      "The requested API route was not found.",
    );
  } catch (caught) {
    console.error("Integration API failure", {
      path,
      message: caught instanceof Error ? caught.message : "Unknown error",
    });
    return error(
      request,
      500,
      "EXTERNAL_SOURCE_ERROR",
      "The external information system is temporarily unavailable.",
    );
  }
});
