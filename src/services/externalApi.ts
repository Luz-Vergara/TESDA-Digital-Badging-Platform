import type {
  ExternalApiEnvelope,
  ExternalBadgeRequest,
  ExternalBadgeVerification,
  ExternalDashboardSummary,
  ExternalLearnerDetails,
  ExternalLearnerSummary,
} from '@/src/types/external-api';

interface ExternalApiErrorBody {
  error?: {
    code?: string;
    message?: string;
  };
}

export class ExternalApiError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'ExternalApiError';
  }
}

function getBaseUrl(): string {
  const baseUrl = ((import.meta as any).env?.VITE_EXTERNAL_API_BASE_URL || '')
    .trim()
    .replace(/\/+$/, '');
  if (!baseUrl) {
    throw new ExternalApiError(
      'The external API base URL has not been configured.',
      'API_NOT_CONFIGURED',
    );
  }
  return baseUrl;
}

async function request<T>(path: string): Promise<ExternalApiEnvelope<T>> {
  let response: Response;
  try {
    response = await fetch(`${getBaseUrl()}${path}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
  } catch {
    throw new ExternalApiError(
      'The mock external information system could not be reached.',
      'NETWORK_ERROR',
    );
  }

  let body: ExternalApiEnvelope<T> | ExternalApiErrorBody;
  try {
    body = await response.json();
  } catch {
    throw new ExternalApiError(
      'The integration API returned an invalid response.',
      'INVALID_RESPONSE',
      response.status,
    );
  }

  if (!response.ok) {
    const failure = body as ExternalApiErrorBody;
    throw new ExternalApiError(
      failure.error?.message || 'The integration API request failed.',
      failure.error?.code || 'API_ERROR',
      response.status,
    );
  }

  if (!body || !('data' in body) || !('meta' in body)) {
    throw new ExternalApiError(
      'The integration API response did not match the expected contract.',
      'INVALID_RESPONSE',
      response.status,
    );
  }
  return body as ExternalApiEnvelope<T>;
}

const segment = (value: string) => encodeURIComponent(value);

export const externalApi = {
  getTrainingCenterDashboardSummary(trainingCenterId: string) {
    return request<ExternalDashboardSummary>(
      `/api/training-centers/${segment(trainingCenterId)}/dashboard-summary`,
    );
  },

  getTrainingCenterLearners(trainingCenterId: string) {
    return request<ExternalLearnerSummary[]>(
      `/api/training-centers/${segment(trainingCenterId)}/learners`,
    );
  },

  getLearnerDetails(learnerId: string) {
    return request<ExternalLearnerDetails>(
      `/api/learners/${segment(learnerId)}`,
    );
  },

  getTrainingCenterBadgeRequests(trainingCenterId: string) {
    return request<ExternalBadgeRequest[]>(
      `/api/training-centers/${segment(trainingCenterId)}/badge-requests`,
    );
  },

  getBadgeVerification(verificationId: string) {
    return request<ExternalBadgeVerification>(
      `/api/badges/${segment(verificationId)}`,
    );
  },
};
