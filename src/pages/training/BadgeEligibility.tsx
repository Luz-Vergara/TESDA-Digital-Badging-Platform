import { Fragment, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, ChevronDown, ChevronRight, Search } from 'lucide-react';
import { db } from '@/src/lib/firebase';
import { useFirebase } from '@/src/lib/FirebaseProvider';
import {
  findExistingExternalBadgeRequestForTrainingCenter,
  getExistingExternalBadgeRequestStatusLabel,
  getExternalBadgeRequestIdentity,
  getExternalBadgeRequestRoute,
  type ExistingExternalBadgeRequest,
} from '@/src/lib/external-badge-request';
import { groupBadgeEligibilityByLearnerEnrollment } from '@/src/lib/training-badge-eligibility-roster';
import { externalApi, ExternalApiError } from '@/src/services/externalApi';
import type { ExternalBadgeEligibility, ExternalLearnerSummary } from '@/src/types/external-api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type ExistingRequestCheck =
  | { state: 'checking' }
  | { state: 'missing' }
  | { state: 'exists'; request: ExistingExternalBadgeRequest }
  | { state: 'error' };

type BadgeStatus =
  | 'Issued'
  | 'Pending'
  | 'Eligible'
  | 'Not yet eligible'
  | 'Checking request'
  | 'QSO mapping unavailable'
  | 'Unable to verify request'
  | 'Request needs review';

function getBadgeStatus(
  eligibility: ExternalBadgeEligibility,
  requestCheck: ExistingRequestCheck | undefined,
): BadgeStatus {
  if (!eligibility.eligible) return 'Not yet eligible';
  if (!eligibility.firebaseBadgeTemplateId) return 'QSO mapping unavailable';
  if (!requestCheck || requestCheck.state === 'checking') return 'Checking request';
  if (requestCheck.state === 'error') return 'Unable to verify request';
  if (requestCheck.state === 'missing') return 'Eligible';

  const requestStatus = getExistingExternalBadgeRequestStatusLabel(requestCheck.request);
  if (requestStatus === 'Approved / Issued') return 'Issued';
  if (requestStatus.startsWith('Pending')) return 'Pending';
  return 'Request needs review';
}

function badgeStatusClassName(status: BadgeStatus): string {
  switch (status) {
    case 'Issued':
      return 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100';
    case 'Pending':
      return 'bg-amber-100 text-amber-800 hover:bg-amber-100';
    case 'Eligible':
      return 'bg-blue-100 text-blue-800 hover:bg-blue-100';
    case 'Not yet eligible':
    case 'Checking request':
      return 'bg-slate-100 text-slate-700 hover:bg-slate-100';
    case 'QSO mapping unavailable':
    case 'Unable to verify request':
    case 'Request needs review':
      return 'bg-rose-100 text-rose-800 hover:bg-rose-100';
  }
}

function getBadgeStatusCounts(
  eligibilities: ExternalBadgeEligibility[],
  requestChecks: Record<string, ExistingRequestCheck>,
): Partial<Record<BadgeStatus, number>> {
  return eligibilities.reduce<Partial<Record<BadgeStatus, number>>>((counts, eligibility) => {
    const status = getBadgeStatus(eligibility, requestChecks[eligibility.id]);
    counts[status] = (counts[status] ?? 0) + 1;
    return counts;
  }, {});
}

export default function BadgeEligibility() {
  const { userProfile } = useFirebase();
  const [learners, setLearners] = useState<ExternalLearnerSummary[]>([]);
  const [term, setTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requestChecks, setRequestChecks] = useState<Record<string, ExistingRequestCheck>>({});
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    void (async () => {
      try {
        setLearners((await externalApi.getMyTrainingCenterLearners()).data);
      } catch (caught) {
        setError(caught instanceof ExternalApiError ? caught.message : 'Unable to load external eligibility.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const allRows = useMemo(() => learners
    .flatMap((learner) => learner.badgeEligibility.map((eligibility) => ({ learner, eligibility }))), [learners]);

  useEffect(() => {
    let cancelled = false;
    const eligibleRows = allRows.filter(({ eligibility }) =>
      eligibility.eligible && Boolean(eligibility.firebaseBadgeTemplateId));

    if (!eligibleRows.length) {
      setRequestChecks({});
      return () => { cancelled = true; };
    }

    const trainingCenterId = userProfile?.organizationId || '';
    if (!trainingCenterId) {
      setRequestChecks(Object.fromEntries(eligibleRows.map(({ eligibility }) => [
        eligibility.id,
        { state: 'error' } satisfies ExistingRequestCheck,
      ])));
      return () => { cancelled = true; };
    }

    setRequestChecks(Object.fromEntries(eligibleRows.map(({ eligibility }) => [
      eligibility.id,
      { state: 'checking' } satisfies ExistingRequestCheck,
    ])));

    void Promise.all(eligibleRows.map(async ({ eligibility }) => {
      const { externalRequestId } = getExternalBadgeRequestIdentity({
        externalTrainingCenterId: eligibility.trainingCenterId,
        externalEnrollmentId: eligibility.enrollmentId,
        badgeTemplateId: eligibility.firebaseBadgeTemplateId!,
      });

      try {
        const request = await findExistingExternalBadgeRequestForTrainingCenter(
          externalRequestId,
          trainingCenterId,
          db,
        );
        return [eligibility.id, request
          ? { state: 'exists', request } satisfies ExistingRequestCheck
          : { state: 'missing' } satisfies ExistingRequestCheck] as const;
      } catch {
        return [eligibility.id, { state: 'error' } satisfies ExistingRequestCheck] as const;
      }
    })).then((checks) => {
      if (!cancelled) setRequestChecks(Object.fromEntries(checks));
    });

    return () => { cancelled = true; };
  }, [allRows, userProfile?.organizationId]);

  const rosterGroups = useMemo(
    () => groupBadgeEligibilityByLearnerEnrollment(learners),
    [learners],
  );

  const rows = useMemo(() => {
    const normalizedTerm = term.trim().toLowerCase();
    if (!normalizedTerm) return rosterGroups;
    return rosterGroups.filter((group) => [
      group.learner.displayName,
      group.learner.learnerUli,
      group.ctprNumber,
      ...group.eligibilities.flatMap((eligibility) => [
        eligibility.competency?.code,
        eligibility.competency?.title,
      ]),
    ].filter(Boolean).join(' ').toLowerCase().includes(normalizedTerm));
  }, [rosterGroups, term]);

  const requestAction = (learner: ExternalLearnerSummary, eligibility: ExternalLearnerSummary['badgeEligibility'][number]) => {
    if (!eligibility.eligible) return <span className="text-xs text-slate-400">Complete requirements</span>;
    if (!eligibility.firebaseBadgeTemplateId) return <span className="text-xs text-amber-700">QSO mapping unavailable</span>;

    const check = requestChecks[eligibility.id];
    if (!check || check.state === 'checking') return <Button size="sm" disabled>Checking request…</Button>;
    if (check.state === 'error') return <span className="text-xs text-rose-700">Unable to verify request status</span>;
    if (check.state === 'exists') return <Link className="text-xs font-semibold text-blue-600" to="/trainingcenter/requests">View request</Link>;

    return <Link to={getExternalBadgeRequestRoute(learner.learnerUli, eligibility)}><Button size="sm"><CheckCircle2 className="mr-1 h-4 w-4" />File request</Button></Link>;
  };

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((current) => {
      const next = new Set(current);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600" /></div>;

  return <div className="space-y-6">
    <div>
      <div className="flex items-center gap-2"><h1 className="text-2xl font-bold">Badge Eligibility</h1><Badge className="border-slate-200 bg-slate-100 text-slate-700">Source: External MIS</Badge></div>
      <p className="mt-1 text-sm text-slate-500">Eligibility is calculated from scoped external enrollment and competency evidence.</p>
    </div>
    {error && <Card className="border-rose-200"><CardContent className="p-4 text-sm text-rose-700">{error}</CardContent></Card>}
    <Card><CardContent className="p-4"><div className="relative max-w-md"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><Input className="pl-9" value={term} onChange={(event) => setTerm(event.target.value)} placeholder="Search learner, ULI, CTPR, or competency..." /></div></CardContent></Card>
    <Card>
      <CardHeader><CardTitle className="text-base">Learner Qualification & Eligibility Roster</CardTitle><CardDescription>Expand a learner to review competency evidence and request actions. Only eligible enrollments can create the immutable Firestore request snapshot.</CardDescription></CardHeader>
      <CardContent className="p-0"><Table><TableHeader><TableRow className="bg-slate-50"><TableHead>Learner / ULI</TableHead><TableHead>CTPR</TableHead><TableHead>Training Progress</TableHead><TableHead>Badge Status</TableHead><TableHead className="w-[180px]">Action</TableHead></TableRow></TableHeader><TableBody>
        {rows.map((group) => <Fragment key={group.id}>
          <TableRow>
            <TableCell><p className="font-semibold">{group.learner.displayName}</p><p className="font-mono text-xs">{group.learner.learnerUli}</p></TableCell>
            <TableCell>{group.ctprNumber}</TableCell>
            <TableCell><span className="font-medium">{group.completedCompetencyCount}/{group.requiredCompetencyCount} Completed</span></TableCell>
            <TableCell><div className="flex flex-wrap gap-1.5">
              {Object.entries(getBadgeStatusCounts(group.eligibilities, requestChecks)).map(([status, count]) => <Badge key={status} className={badgeStatusClassName(status as BadgeStatus)}>{count} {status}</Badge>)}
            </div></TableCell>
            <TableCell><Button type="button" variant="outline" size="sm" onClick={() => toggleGroup(group.id)}>{expandedGroups.has(group.id) ? <ChevronDown className="mr-1 h-4 w-4" /> : <ChevronRight className="mr-1 h-4 w-4" />}{expandedGroups.has(group.id) ? 'Hide competencies' : 'View competencies'}</Button></TableCell>
          </TableRow>
          {expandedGroups.has(group.id) && <TableRow><TableCell colSpan={5} className="bg-muted/30 p-0"><div className="space-y-2 p-4">
            {group.eligibilities.map((eligibility) => {
              const status = getBadgeStatus(eligibility, requestChecks[eligibility.id]);
              return <div key={eligibility.id} className="grid gap-3 rounded-md border bg-background p-3 md:grid-cols-[minmax(0,1fr)_auto_minmax(180px,auto)] md:items-center">
                <div><p className="font-medium">{eligibility.competency?.code ?? 'Competency unavailable'}</p><p className="text-xs text-slate-500">{eligibility.competency?.title ?? 'No competency title supplied'}</p>{eligibility.missingCompetencyCodes.length ? <p className="mt-1 text-xs text-amber-700">Missing: {eligibility.missingCompetencyCodes.join(', ')}</p> : null}</div>
                <Badge className={badgeStatusClassName(status)}>{status}</Badge>
                <div>{requestAction(group.learner, eligibility)}</div>
              </div>;
            })}
          </div></TableCell></TableRow>}
        </Fragment>)}
      </TableBody></Table></CardContent>
    </Card>
  </div>;
}
