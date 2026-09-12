export type NotificationSource = 'badgeRequests' | 'issuedBadges' | 'rplApplications';
export interface NotificationScope {
  uid: string;
  role: string;
  organizationId?: string;
  assignedDistrictId?: string;
  office?: string;
  isDemo: boolean;
}
export interface NotificationQuery {
  source: NotificationSource;
  field: string;
  operator: '==' | 'array-contains';
  value: string;
}
export interface LiveNotification {
  id: string;
  title: string;
  message: string;
  time: number;
}

// Only subscribe to records in an explicit participant/organization scope.
// Administrative roles have no invented system-wide event stream.
export function notificationQueries(scope: NotificationScope): NotificationQuery[] {
  const sources: NotificationSource[] = ['badgeRequests', 'issuedBadges', 'rplApplications'];
  if (scope.role === 'Learner') {
    return sources.map(source => ({ source, field: source === 'badgeRequests' ? 'learnerIds' : 'learnerId',
      operator: source === 'badgeRequests' ? 'array-contains' : '==', value: scope.uid }));
  }
  if (scope.role === 'TrainingCenter' && scope.organizationId) {
    return sources.map(source => ({ source, field: 'trainingCenterId', operator: '==', value: scope.organizationId! }));
  }
  if (scope.role === 'DistrictOffice') {
    const districts = [...new Set([scope.organizationId, scope.assignedDistrictId, scope.office].filter((id): id is string => Boolean(id)))];
    return districts.flatMap(value => (['badgeRequests', 'issuedBadges'] as const).map(source => ({
      source, field: 'districtOfficeId', operator: '==' as const, value,
    })));
  }
  return [];
}

export function notificationTime(value: unknown): number {
  if (typeof value === 'object' && value !== null && 'seconds' in value && typeof value.seconds === 'number') {
    const nanos = 'nanoseconds' in value && typeof value.nanoseconds === 'number' ? value.nanoseconds : 0;
    return value.seconds * 1000 + nanos / 1e6;
  }
  const time = value instanceof Date ? value.getTime() : typeof value === 'string' ? Date.parse(value) : 0;
  return Number.isFinite(time) ? time : 0;
}

export function projectNotification(source: NotificationSource, id: string, data: Record<string, unknown>, isDemo: boolean): LiveNotification | null {
  if ((data.isDemo === true) !== isDemo) return null;
  const status = typeof data.status === 'string' ? data.status : '';
  const label = [data.badgeTemplateName, data.badgeName, data.qualificationName].find(value => typeof value === 'string' && value) || id;
  const issued = source === 'issuedBadges';
  if (!issued && !status) return null;
  // Issuance is stable across later badge edits. RPL updates include evidence reviews.
  const time = issued ? notificationTime(data.issueDate ?? data.createdAt) :
    notificationTime(data.updatedAt ?? data.approvedAt ?? data.submittedAt ?? data.createdAt);
  const title = issued ? 'Badge issued' : source === 'badgeRequests' ? 'Badge request status' : 'RPL update';
  return {
    id: encodeURIComponent(JSON.stringify([source, id, issued ? 'issued' : status, time])),
    title, message: issued ? `${label} has been issued.` : `${label}: ${status}.`, time,
  };
}

export function sortNotifications(items: LiveNotification[]): LiveNotification[] {
  return [...new Map(items.map(item => [item.id, item])).values()]
    .sort((a, b) => b.time - a.time || a.id.localeCompare(b.id));
}
