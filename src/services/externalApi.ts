import { auth } from '@/src/lib/firebase';
import type { ExternalApiEnvelope, ExternalDashboardSummary, ExternalLearnerDetails, ExternalLearnerSummary } from '@/src/types/external-api';

interface ExternalApiErrorBody { error?: { code?: string; message?: string }; }
export class ExternalApiError extends Error {
  constructor(message: string, public readonly code: string, public readonly status?: number) { super(message); this.name = 'ExternalApiError'; }
}

function baseUrl(): string {
  const url = ((import.meta as any).env?.VITE_EXTERNAL_API_BASE_URL || '').trim().replace(/\/+$/, '');
  if (!url) throw new ExternalApiError('The external API base URL has not been configured.', 'API_NOT_CONFIGURED');
  return url;
}
async function headers(): Promise<HeadersInit> {
  const user = auth.currentUser;
  if (!user) throw new ExternalApiError('Sign in is required before external training records can be loaded.', 'UNAUTHENTICATED');
  const token = await user.getIdToken();
  const publishableKey = ((import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY || '').trim();
  return { Accept: 'application/json', Authorization: `Bearer ${token}`, ...(publishableKey ? { apikey: publishableKey } : {}) };
}
async function request<T>(path: string): Promise<ExternalApiEnvelope<T>> {
  let response: Response;
  try { response = await fetch(`${baseUrl()}${path}`, { method: 'GET', headers: await headers() }); }
  catch (caught) {
    if (caught instanceof ExternalApiError) throw caught;
    throw new ExternalApiError('The external information system could not be reached.', 'NETWORK_ERROR');
  }
  let body: ExternalApiEnvelope<T> | ExternalApiErrorBody;
  try { body = await response.json(); }
  catch { throw new ExternalApiError('The integration API returned an invalid response.', 'INVALID_RESPONSE', response.status); }
  if (!response.ok) {
    const failure = body as ExternalApiErrorBody;
    throw new ExternalApiError(failure.error?.message || 'The integration API request failed.', failure.error?.code || 'API_ERROR', response.status);
  }
  if (!body || !('data' in body) || !('meta' in body)) throw new ExternalApiError('The integration API response did not match the expected contract.', 'INVALID_RESPONSE', response.status);
  return body as ExternalApiEnvelope<T>;
}

export const externalApi = {
  getMyTrainingCenterDashboardSummary: () => request<ExternalDashboardSummary>('/api/me/training-center/dashboard-summary'),
  getMyTrainingCenterLearners: () => request<ExternalLearnerSummary[]>('/api/me/training-center/learners'),
  getLearnerDetails: (learnerUli: string) => request<ExternalLearnerDetails>(`/api/learners/${encodeURIComponent(learnerUli)}`),
};
