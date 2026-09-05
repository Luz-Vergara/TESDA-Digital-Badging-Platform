import { useState } from 'react';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  where,
  type DocumentData,
} from 'firebase/firestore';
import { AlertTriangle, Search, ShieldCheck, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  isRetirablePendingExternalRequest,
  retirePendingExternalBadgeRequest,
} from '@/src/lib/badge-request-retirement';
import { db } from '@/src/lib/firebase';
import { useFirebase } from '@/src/lib/FirebaseProvider';

interface RetirementCandidate {
  id: string;
  data: DocumentData;
  issuedBadgeCount: number;
}

function SummaryField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="break-words text-sm font-medium text-slate-900">{value || '—'}</dd>
    </div>
  );
}

export default function BadgeRequestRetirement() {
  const { user, userProfile } = useFirebase();
  const [requestId, setRequestId] = useState('');
  const [candidate, setCandidate] = useState<RetirementCandidate | null>(null);
  const [confirmation, setConfirmation] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadRequest = async () => {
    const exactRequestId = requestId.trim();
    setError('');
    setNotice('');
    setCandidate(null);

    if (!exactRequestId || exactRequestId.includes('/')) {
      setError('Enter one exact badge request document ID.');
      return;
    }
    if (userProfile?.role !== 'Admin') {
      setError('Only an authenticated Admin may inspect retirement candidates.');
      return;
    }

    setLoading(true);
    try {
      const [requestSnapshot, issuedSnapshot] = await Promise.all([
        getDoc(doc(db, 'badgeRequests', exactRequestId)),
        getDocs(query(
          collection(db, 'issuedBadges'),
          where('badgeRequestId', '==', exactRequestId),
          limit(1),
        )),
      ]);

      if (!requestSnapshot.exists()) {
        setError('No badge request exists with that exact document ID.');
        return;
      }

      setCandidate({
        id: requestSnapshot.id,
        data: requestSnapshot.data(),
        issuedBadgeCount: issuedSnapshot.size,
      });
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to inspect the request.');
    } finally {
      setLoading(false);
    }
  };

  const retireRequest = async () => {
    if (!candidate || !user || userProfile?.role !== 'Admin' || confirmation !== 'RETIRE') {
      return;
    }

    setSubmitting(true);
    setError('');
    setNotice('');
    try {
      await retirePendingExternalBadgeRequest({
        firestore: db,
        requestId: candidate.id,
        requestData: candidate.data,
        retiredByUid: user.uid,
        retiredByRole: userProfile.role,
        issuedBadgeCount: candidate.issuedBadgeCount,
      });
      setDialogOpen(false);
      setConfirmation('');
      setCandidate(null);
      setRequestId('');
      setNotice('The pending request was retired and its immutable audit receipt was created atomically.');
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to retire the request.');
    } finally {
      setSubmitting(false);
    }
  };

  const eligibility = candidate
    ? isRetirablePendingExternalRequest(candidate.id, candidate.data)
    : false;
  const hasNoIssuedCredential = candidate?.issuedBadgeCount === 0;
  const canRetire = eligibility && hasNoIssuedCredential;
  const evidence = candidate?.data.externalEligibility as Record<string, unknown> | undefined;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Pending Request Retirement</h1>
        <p className="mt-1 max-w-3xl text-slate-500">
          Retire one pre-issuance external request with an immutable, same-batch administrative audit receipt.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-blue-600" />
            Inspect exact request
          </CardTitle>
          <CardDescription>
            Enter the complete Firestore document ID. Partial matching and bulk selection are intentionally unavailable.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="flex-1 space-y-2">
              <label htmlFor="retirement-request-id" className="text-sm font-medium text-slate-700">
                Badge request document ID
              </label>
              <Input
                id="retirement-request-id"
                value={requestId}
                onChange={(event) => setRequestId(event.target.value)}
                placeholder="external-..."
                autoComplete="off"
              />
            </div>
            <Button className="self-end gap-2" onClick={loadRequest} disabled={loading}>
              <Search className="h-4 w-4" />
              {loading ? 'Inspecting…' : 'Inspect Request'}
            </Button>
          </div>

          {error ? <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p> : null}
          {notice ? <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</p> : null}
        </CardContent>
      </Card>

      {candidate ? (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle>Read-only retirement summary</CardTitle>
                <CardDescription className="mt-1 break-all font-mono">{candidate.id}</CardDescription>
              </div>
              <Badge className={canRetire ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}>
                {canRetire ? 'Eligible for retirement' : 'Retirement blocked'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <dl className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              <SummaryField label="Status" value={String(candidate.data.status || '')} />
              <SummaryField label="Badge ID status" value={String(candidate.data.badgeIdStatus || '')} />
              <SummaryField label="External request" value={candidate.data.externalEligibility ? 'Yes' : 'No'} />
              <SummaryField label="Issued credential" value={hasNoIssuedCredential ? 'None' : 'Present — retirement blocked'} />
              <SummaryField label="Training Center" value={String(candidate.data.trainingCenterId || '')} />
              <SummaryField label="District Office" value={String(candidate.data.districtOfficeId || '')} />
              <SummaryField label="Learner ULI" value={String(evidence?.learnerUli || '')} />
              <SummaryField label="External Training Center" value={String(evidence?.externalTrainingCenterId || '')} />
              <SummaryField label="External enrollment" value={String(evidence?.externalEnrollmentId || '')} />
              <SummaryField label="Badge template" value={String(candidate.data.badgeTemplateId || '')} />
              <SummaryField label="Badge type" value={String(candidate.data.badgeType || '')} />
              <SummaryField label="Competency" value={String(evidence?.competencyCode || '')} />
            </dl>

            {!canRetire ? (
              <div className="flex gap-3 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                <p>
                  Only an external request in Pending Review / Pending District Approval with no issued credential can be retired.
                </p>
              </div>
            ) : null}

            <Button
              variant="destructive"
              className="gap-2"
              disabled={!canRetire}
              onClick={() => setDialogOpen(true)}
            >
              <Trash2 className="h-4 w-4" />
              Retire Pending Request
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <Dialog open={dialogOpen} onOpenChange={(open) => {
        setDialogOpen(open);
        if (!open) setConfirmation('');
      }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Confirm pending request retirement</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              This pending request was created before the current identity-validation rules. Retiring it allows the Training Center to submit a new request under the current security rules.
            </p>
            <p className="break-all rounded-lg bg-slate-100 p-3 font-mono text-xs text-slate-700">
              {candidate?.id}
            </p>
            <div className="space-y-2">
              <label htmlFor="retirement-confirmation" className="text-sm font-medium text-slate-700">
                Type RETIRE to confirm
              </label>
              <Input
                id="retirement-confirmation"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                autoComplete="off"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={retireRequest}
              disabled={confirmation !== 'RETIRE' || submitting}
            >
              {submitting ? 'Retiring…' : 'Retire Pending Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
