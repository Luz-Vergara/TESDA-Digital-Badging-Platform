import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Search } from 'lucide-react';
import { db } from '@/src/lib/firebase';
import { useFirebase } from '@/src/lib/FirebaseProvider';
import {
  findExistingExternalBadgeRequestForTrainingCenter,
  getExistingExternalBadgeRequestMessage,
  getExistingExternalBadgeRequestStatusLabel,
  getExternalBadgeRequestIdentity,
  getExternalBadgeRequestRoute,
  type ExistingExternalBadgeRequest,
} from '@/src/lib/external-badge-request';
import { externalApi, ExternalApiError } from '@/src/services/externalApi';
import type { ExternalLearnerSummary } from '@/src/types/external-api';
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

export default function BadgeEligibility() {
  const { userProfile } = useFirebase();
  const [learners, setLearners] = useState<ExternalLearnerSummary[]>([]);
  const [term, setTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requestChecks, setRequestChecks] = useState<Record<string, ExistingRequestCheck>>({});

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
      if (!cancelled) {
        setRequestChecks(Object.fromEntries(checks));
      }
    });

    return () => { cancelled = true; };
  }, [allRows, userProfile?.organizationId]);

  const rows = useMemo(() => allRows
    .filter(({ learner, eligibility }) =>
      `${learner.displayName} ${learner.learnerUli} ${eligibility.ctprNumber}`
        .toLowerCase()
        .includes(term.toLowerCase())), [allRows, term]);

  const requestAction = (learner: ExternalLearnerSummary, eligibility: ExternalLearnerSummary['badgeEligibility'][number]) => {
    if (!eligibility.eligible) {
      return <span className="text-xs text-slate-400">Complete requirements</span>;
    }

    if (!eligibility.firebaseBadgeTemplateId) {
      return <span className="text-xs text-amber-700">QSO mapping unavailable</span>;
    }

    const check = requestChecks[eligibility.id];
    if (!check || check.state === 'checking') {
      return <Button size="sm" disabled>Checking request…</Button>;
    }

    if (check.state === 'error') {
      return <span className="text-xs text-rose-700">Unable to verify request status</span>;
    }

    if (check.state === 'exists') {
      return <div className="space-y-1"><Badge className="bg-slate-100 text-slate-700 hover:bg-slate-100">{getExistingExternalBadgeRequestStatusLabel(check.request)}</Badge><p className="max-w-52 text-xs text-slate-500">{getExistingExternalBadgeRequestMessage(check.request)}</p><Link className="text-xs font-semibold text-blue-600" to="/trainingcenter/requests">View requests</Link></div>;
    }

    return <Link to={getExternalBadgeRequestRoute(learner.learnerUli, eligibility)}><Button size="sm"><CheckCircle2 className="mr-1 h-4 w-4" />File request</Button></Link>;
  };

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600" /></div>;
  }

  return <div className="space-y-6">
    <div>
      <div className="flex items-center gap-2"><h1 className="text-2xl font-bold">Badge Eligibility</h1><Badge className="border-slate-200 bg-slate-100 text-slate-700">Source: External MIS</Badge></div>
      <p className="mt-1 text-sm text-slate-500">Eligibility is calculated from scoped external enrollment and competency evidence.</p>
    </div>
    {error && <Card className="border-rose-200"><CardContent className="p-4 text-sm text-rose-700">{error}</CardContent></Card>}
    <Card><CardContent className="p-4"><div className="relative max-w-md"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><Input className="pl-9" value={term} onChange={(event) => setTerm(event.target.value)} placeholder="Search learner, ULI, or CTPR..." /></div></CardContent></Card>
    <Card>
      <CardHeader><CardTitle className="text-base">Learner Qualification & Eligibility Roster</CardTitle><CardDescription>Only eligible enrollments can create the immutable Firestore request snapshot.</CardDescription></CardHeader>
      <CardContent className="p-0"><Table><TableHeader><TableRow className="bg-slate-50"><TableHead>Learner / ULI</TableHead><TableHead>CTPR</TableHead><TableHead>Competencies</TableHead><TableHead>Result</TableHead><TableHead /></TableRow></TableHeader><TableBody>
        {rows.map(({ learner, eligibility }) => <TableRow key={eligibility.id}>
          <TableCell><p className="font-semibold">{learner.displayName}</p><p className="font-mono text-xs">{learner.learnerUli}</p></TableCell>
          <TableCell>{eligibility.ctprNumber}</TableCell>
          <TableCell>{eligibility.completedCompetencyCount}/{eligibility.requiredCompetencyCount}{eligibility.competency ? <p className="text-xs text-slate-500">{eligibility.competency.code} — {eligibility.competency.title}</p> : null}{eligibility.missingCompetencyCodes.length ? <p className="text-xs text-amber-700">Missing: {eligibility.missingCompetencyCodes.join(', ')}</p> : null}</TableCell>
          <TableCell><Badge className={eligibility.eligible ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}>{eligibility.eligible ? 'Eligible' : 'Not yet eligible'}</Badge></TableCell>
          <TableCell>{requestAction(learner, eligibility)}</TableCell>
        </TableRow>)}
      </TableBody></Table></CardContent>
    </Card>
  </div>;
}
