import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Award, BookOpenCheck, CheckCircle, Database, FileText, RefreshCw, Send, Users } from 'lucide-react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/src/lib/firebase';
import { getExternalBadgeRequestIdentity, getExternalBadgeRequestRoute } from '@/src/lib/external-badge-request';
import { externalApi, ExternalApiError } from '@/src/services/externalApi';
import type { ExternalBadgeEligibility, ExternalDashboardSummary, ExternalLearnerDetails, ExternalLearnerSummary, ExternalRegisteredProgram } from '@/src/types/external-api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface Props {
  firebaseTrainingCenterId: string;
  firebaseTrainingCenterName: string;
  firebaseUserId: string;
  districtOfficeId?: string;
  initialView?: ExternalTrainingView;
}

export type ExternalTrainingView = 'programs' | 'learners' | 'eligibility' | 'requests' | 'issued';
type FirebaseRecord = Record<string, unknown> & { id: string };

const messageFor = (error: unknown) => error instanceof ExternalApiError ? error.message : 'The external training records could not be loaded.';
const date = (value?: string | null) => value ? new Date(value).toLocaleDateString() : '—';
const statusClass = (status: string) => /active|completed|eligible|approved|issued/i.test(status)
  ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100'
  : /expired|rejected|revoked|inactive/i.test(status)
    ? 'bg-rose-100 text-rose-800 hover:bg-rose-100'
    : 'bg-amber-100 text-amber-800 hover:bg-amber-100';

function EligibilityBadge({ item }: { item: ExternalBadgeEligibility }) {
  return <Badge className={item.eligible ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100' : 'bg-amber-100 text-amber-800 hover:bg-amber-100'}>
    {item.eligible ? 'Eligible' : 'Not yet eligible'}
  </Badge>;
}

export default function ExternalTrainingDashboard({ firebaseTrainingCenterId, initialView = 'programs' }: Props) {
  const [summary, setSummary] = useState<ExternalDashboardSummary | null>(null);
  const [learners, setLearners] = useState<ExternalLearnerSummary[]>([]);
  const [requests, setRequests] = useState<FirebaseRecord[]>([]);
  const [issuedBadges, setIssuedBadges] = useState<FirebaseRecord[]>([]);
  const [activeView, setActiveView] = useState<ExternalTrainingView>(initialView);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLearner, setSelectedLearner] = useState<ExternalLearnerDetails | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [dashboard, learnerResult] = await Promise.all([
        externalApi.getMyTrainingCenterDashboardSummary(),
        externalApi.getMyTrainingCenterLearners(),
      ]);
      setSummary(dashboard.data);
      setLearners(Array.isArray(learnerResult.data) ? learnerResult.data : []);
    } catch (caught) { setError(messageFor(caught)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { setActiveView(initialView); }, [initialView]);

  // Firestore remains the source of truth for workflow state; these listeners
  // deliberately do not use the external service for requests or issued badges.
  useEffect(() => {
    if (!firebaseTrainingCenterId) return;
    const requestQuery = query(collection(db, 'badgeRequests'), where('trainingCenterId', '==', firebaseTrainingCenterId));
    const issuedQuery = query(collection(db, 'issuedBadges'), where('trainingCenterId', '==', firebaseTrainingCenterId));
    const unsubscribeRequests = onSnapshot(requestQuery, (snapshot) => setRequests(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))));
    const unsubscribeIssued = onSnapshot(issuedQuery, (snapshot) => setIssuedBadges(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))));
    return () => { unsubscribeRequests(); unsubscribeIssued(); };
  }, [firebaseTrainingCenterId]);

  const allEligibility = useMemo(() => learners.flatMap((learner) => learner.badgeEligibility.map((eligibility) => ({ learner, eligibility }))), [learners]);
  const requestExists = useCallback((eligibility: ExternalBadgeEligibility, templateId?: string) => {
    const key = templateId ? getExternalBadgeRequestIdentity({
      externalTrainingCenterId: eligibility.trainingCenterId,
      externalEnrollmentId: eligibility.enrollmentId,
      badgeTemplateId: templateId,
    }).mappingKey : null;
    return key ? requests.some((request) => request.externalEligibilityKey === key) : false;
  }, [requests]);

  const openLearner = async (learnerUli: string) => {
    setDetailLoading(true); setSelectedLearner(null); setError(null);
    try { setSelectedLearner((await externalApi.getLearnerDetails(learnerUli)).data); }
    catch (caught) { setError(messageFor(caught)); }
    finally { setDetailLoading(false); }
  };

  const requestButton = (learner: ExternalLearnerSummary, eligibility: ExternalBadgeEligibility) => {
    const templateId = eligibility.firebaseBadgeTemplateId || undefined;
    const alreadyFiled = requestExists(eligibility, templateId);
    if (!templateId) return <span className="text-sm text-amber-700">QSO mapping required</span>;
    if (alreadyFiled) return <Button size="sm" disabled><Send className="mr-1 h-3.5 w-3.5" />Request filed</Button>;
    return <Link to={getExternalBadgeRequestRoute(learner.learnerUli, eligibility)}>
      <Button size="sm"><Send className="mr-1 h-3.5 w-3.5" />File request</Button>
    </Link>;
  };

  const programRows = (program: ExternalRegisteredProgram) => <TableRow key={program.id}>
    <TableCell className="font-mono text-xs">{program.ctprNumber}</TableCell>
    <TableCell><p className="font-medium">{program.qualification.title}</p><p className="text-xs text-slate-500">{program.qualification.code}{program.qualification.pqfLevel ? ` · PQF ${program.qualification.pqfLevel}` : ''}</p></TableCell>
    <TableCell>{summary?.trainingCenter.name}</TableCell>
    <TableCell><Badge className={statusClass(program.status)}>{program.status}</Badge></TableCell>
    <TableCell className="text-xs"><p>Program: <span className="font-mono">{program.externalProgramId}</span></p><p>Center: <span className="font-mono">{program.trainingCenterId}</span></p></TableCell>
  </TableRow>;

  if (loading) return <Card className="border-violet-200"><CardContent className="p-8 text-center text-slate-500">Loading external training records…</CardContent></Card>;
  if (error && !summary) return <Card className="border-rose-200"><CardContent className="p-6 text-rose-700 space-y-3"><p>{error}</p><Button variant="outline" onClick={() => void load()}><RefreshCw className="h-4 w-4 mr-2" />Retry</Button></CardContent></Card>;
  if (!summary) return null;

  const views: { id: ExternalTrainingView; label: string; icon: typeof Database }[] = [
    { id: 'programs', label: 'Registered Programs / CTPR', icon: Database }, { id: 'learners', label: 'Learners & Training Records', icon: Users },
    { id: 'eligibility', label: 'Badge Eligibility', icon: CheckCircle }, { id: 'requests', label: 'Badge Requests', icon: FileText }, { id: 'issued', label: 'Issued Badges', icon: Award },
  ];

  return <Card className="border-violet-200">
    <CardHeader className="flex flex-row items-start justify-between gap-4">
      <div><CardTitle className="flex items-center gap-2"><Database className="h-5 w-5 text-violet-600" />External training records</CardTitle><CardDescription>{summary.trainingCenter.name} · authenticated Integration API evidence</CardDescription></div>
      <Badge className="bg-violet-100 text-violet-800 border-violet-200 hover:bg-violet-100">External evidence</Badge>
    </CardHeader>
    <CardContent className="space-y-5">
      {error && <p role="alert" className="rounded border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[["Learners", summary.counts.learners, Users], ["Eligible", summary.counts.eligibleLearners, CheckCircle], ["Programs", summary.registeredPrograms.length, Database], ["Completed competencies", summary.counts.completedCompetencies, BookOpenCheck]].map(([label, value, Icon]: any) => <div key={label} className="rounded border border-slate-200 p-3"><Icon className="h-4 w-4 text-violet-600 mb-2" /><p className="font-bold">{value}</p><p className="text-xs text-slate-500">{label}</p></div>)}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2"><div className="flex flex-wrap gap-2" role="tablist" aria-label="External training views">
        {views.map(({ id, label, icon: Icon }) => <Button key={id} size="sm" variant={activeView === id ? 'default' : 'outline'} onClick={() => setActiveView(id)} role="tab" aria-selected={activeView === id}><Icon className="mr-1 h-3.5 w-3.5" />{label}</Button>)}
      </div><Button variant="outline" size="sm" onClick={() => void load()}><RefreshCw className="h-4 w-4 mr-2" />Refresh external evidence</Button></div>

      {activeView === 'programs' && <section aria-label="Registered Programs and CTPR" className="space-y-3"><div><h3 className="font-semibold">Registered Programs / CTPR</h3><p className="text-sm text-slate-500">Current registrations returned for this Training Center by the Integration API.</p></div><Table><TableHeader><TableRow><TableHead>CTPR number</TableHead><TableHead>Qualification</TableHead><TableHead>Training Center</TableHead><TableHead>Registration status</TableHead><TableHead>External identifiers</TableHead></TableRow></TableHeader><TableBody>{summary.registeredPrograms.length ? summary.registeredPrograms.map(programRows) : <TableRow><TableCell colSpan={5} className="h-24 text-center text-slate-500">No registered programs were returned.</TableCell></TableRow>}</TableBody></Table></section>}

      {activeView === 'learners' && <section aria-label="Learners and Training Records" className="space-y-3"><div><h3 className="font-semibold">Learners & Training Records</h3><p className="text-sm text-slate-500">Open a learner to inspect protected enrollment and competency-completion evidence.</p></div><Table><TableHeader><TableRow><TableHead>Learner / ULI</TableHead><TableHead>Enrollment</TableHead><TableHead>Qualification / CTPR</TableHead><TableHead>Completion</TableHead><TableHead>Competency progress</TableHead><TableHead>Eligibility</TableHead><TableHead /></TableRow></TableHeader><TableBody>{learners.flatMap((learner) => learner.enrollments.map((enrollment) => { const eligibility = learner.badgeEligibility.find((item) => item.enrollmentId === enrollment.id); return <TableRow key={enrollment.id}><TableCell><p className="font-medium">{learner.displayName}</p><p className="font-mono text-xs text-slate-500">{learner.learnerUli}</p></TableCell><TableCell><p>{enrollment.enrollmentStatus}</p><p className="text-xs text-slate-500">ID: {enrollment.externalEnrollmentId}</p></TableCell><TableCell><p>{enrollment.registeredProgram.qualification.title}</p><p className="font-mono text-xs text-slate-500">{enrollment.registeredProgram.ctprNumber}</p></TableCell><TableCell><Badge className={statusClass(enrollment.completionStatus)}>{enrollment.completionStatus}</Badge></TableCell><TableCell>{eligibility ? <span>{eligibility.completedCompetencyCount}/{eligibility.requiredCompetencyCount} completed</span> : 'No badge evidence'}</TableCell><TableCell>{eligibility ? <EligibilityBadge item={eligibility} /> : '—'}</TableCell><TableCell className="text-right"><Button variant="outline" size="sm" onClick={() => void openLearner(learner.learnerUli)}>View record</Button></TableCell></TableRow>; }))}</TableBody></Table></section>}

      {activeView === 'eligibility' && <section aria-label="Badge Eligibility" className="space-y-3"><div><h3 className="font-semibold">Badge Eligibility</h3><p className="text-sm text-slate-500">Eligibility is evaluated from the external enrollment and competency record. Requests save this evidence as an immutable Firestore snapshot.</p></div><Table><TableHeader><TableRow><TableHead>Learner / ULI</TableHead><TableHead>External enrollment evidence</TableHead><TableHead>Competency evidence</TableHead><TableHead>Eligibility</TableHead><TableHead>File Badge Request</TableHead></TableRow></TableHeader><TableBody>{allEligibility.map(({ learner, eligibility }) => <TableRow key={eligibility.id}><TableCell><p className="font-medium">{learner.displayName}</p><p className="font-mono text-xs text-slate-500">{learner.learnerUli}</p></TableCell><TableCell><p>CTPR: {eligibility.ctprNumber}</p><p className="text-xs text-slate-500">Enrollment: {eligibility.enrollmentId}</p></TableCell><TableCell><p>{eligibility.completedCompetencyCount}/{eligibility.requiredCompetencyCount} required competencies completed</p>{eligibility.missingCompetencyCodes.length > 0 && <p className="text-xs text-amber-700">Missing: {eligibility.missingCompetencyCodes.join(', ')}</p>}</TableCell><TableCell><EligibilityBadge item={eligibility} /></TableCell><TableCell>{eligibility.eligible ? requestButton(learner, eligibility) : <span className="text-sm text-slate-500">Complete missing competencies first</span>}</TableCell></TableRow>)}</TableBody></Table></section>}

      {activeView === 'requests' && <section aria-label="Badge Requests" className="space-y-3"><div><h3 className="font-semibold">Badge Requests</h3><p className="text-sm text-slate-500">Firestore workflow records, including the immutable external eligibility snapshot.</p></div><Table><TableHeader><TableRow><TableHead>Request</TableHead><TableHead>Learner / CTPR</TableHead><TableHead>Badge</TableHead><TableHead>Status</TableHead><TableHead>Evidence snapshot</TableHead></TableRow></TableHeader><TableBody>{requests.length ? requests.map((request) => { const evidence = request.externalEligibility as Record<string, unknown> | undefined; return <TableRow key={request.id}><TableCell><p className="font-mono text-xs">{String(request.requestNumber || request.id)}</p><p className="text-xs text-slate-500">{String(request.requestType || 'Individual')}</p></TableCell><TableCell><p>{evidence ? String(evidence.learnerUli || '—') : 'Platform request'}</p><p className="text-xs text-slate-500">{evidence ? String(evidence.ctprNumber || '—') : '—'}</p></TableCell><TableCell>{String(request.badgeTemplateName || request.programTitle || '—')}</TableCell><TableCell><Badge className={statusClass(String(request.status || 'Pending'))}>{String(request.status || 'Pending')}</Badge></TableCell><TableCell className="text-xs">{evidence ? `${String(evidence.completedCompetencyCount || 0)}/${String(evidence.requiredCompetencyCount || 0)} competency snapshot` : 'Not external'}</TableCell></TableRow>; }) : <TableRow><TableCell colSpan={5} className="h-24 text-center text-slate-500">No badge requests have been filed for this Training Center.</TableCell></TableRow>}</TableBody></Table></section>}

      {activeView === 'issued' && <section aria-label="Issued Badges" className="space-y-3"><div><h3 className="font-semibold">Issued Badges</h3><p className="text-sm text-slate-500">Firestore-issued credentials are available to the learner wallet and public verification flow.</p></div><Table><TableHeader><TableRow><TableHead>Badge ID</TableHead><TableHead>Learner</TableHead><TableHead>Badge</TableHead><TableHead>Status</TableHead><TableHead>Verification</TableHead></TableRow></TableHeader><TableBody>{issuedBadges.length ? issuedBadges.map((badge) => <TableRow key={badge.id}><TableCell className="font-mono text-xs">{String(badge.badgeId || badge.id)}</TableCell><TableCell>{String(badge.learnerName || badge.learnerId || '—')}</TableCell><TableCell>{String(badge.badgeName || badge.badgeTemplateName || '—')}</TableCell><TableCell><Badge className={statusClass(String(badge.status || 'Issued'))}>{String(badge.status || 'Issued')}</Badge></TableCell><TableCell className="font-mono text-xs">{String(badge.verificationId || 'Pending')}</TableCell></TableRow>) : <TableRow><TableCell colSpan={5} className="h-24 text-center text-slate-500">No badges have been issued for this Training Center yet.</TableCell></TableRow>}</TableBody></Table></section>}
    </CardContent>

    <Dialog open={detailLoading || !!selectedLearner} onOpenChange={(open) => { if (!open) { setSelectedLearner(null); setDetailLoading(false); } }}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto"><DialogHeader><DialogTitle>{selectedLearner ? `${selectedLearner.displayName} — learner enrollment details` : 'Loading learner record…'}</DialogTitle><DialogDescription>{selectedLearner?.learnerUli || 'Protected external training record'}</DialogDescription></DialogHeader>
        {detailLoading && <p className="py-8 text-center text-slate-500">Loading protected learner record…</p>}
        {selectedLearner && <div className="space-y-6"><section><h4 className="mb-2 font-semibold">Enrollments</h4><Table><TableHeader><TableRow><TableHead>Enrollment</TableHead><TableHead>Qualification / CTPR</TableHead><TableHead>Status</TableHead><TableHead>Dates</TableHead></TableRow></TableHeader><TableBody>{selectedLearner.enrollments.map((enrollment) => <TableRow key={enrollment.id}><TableCell className="font-mono text-xs">{enrollment.externalEnrollmentId}</TableCell><TableCell><p>{enrollment.registeredProgram.qualification.title}</p><p className="font-mono text-xs text-slate-500">{enrollment.registeredProgram.ctprNumber}</p></TableCell><TableCell><Badge className={statusClass(enrollment.completionStatus)}>{enrollment.completionStatus}</Badge></TableCell><TableCell className="text-xs">Enrolled {date(enrollment.enrolledAt)}{enrollment.completedAt ? ` · Completed ${date(enrollment.completedAt)}` : ''}</TableCell></TableRow>)}</TableBody></Table></section><section><h4 className="mb-2 font-semibold">Completed competencies</h4>{selectedLearner.competencyCompletions.length ? <Table><TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Competency</TableHead><TableHead>Completed</TableHead><TableHead>Verified by</TableHead></TableRow></TableHeader><TableBody>{selectedLearner.competencyCompletions.map((completion) => <TableRow key={completion.id}><TableCell className="font-mono text-xs">{completion.competency.code}</TableCell><TableCell>{completion.competency.title}</TableCell><TableCell>{date(completion.completedAt)}</TableCell><TableCell>{completion.verifiedBy}</TableCell></TableRow>)}</TableBody></Table> : <p className="text-sm text-slate-500">No completed competencies were returned.</p>}</section><section><h4 className="mb-2 font-semibold">Missing competency evidence</h4>{selectedLearner.badgeEligibility.some((item) => item.missingCompetencyCodes.length) ? <div className="space-y-2">{selectedLearner.badgeEligibility.filter((item) => item.missingCompetencyCodes.length).map((item) => <p key={item.id} className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">CTPR {item.ctprNumber}: {item.missingCompetencyCodes.join(', ')}</p>)}</div> : <p className="rounded border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">All competencies required by the external eligibility definition are complete.</p>}</section></div>}
      </DialogContent>
    </Dialog>
  </Card>;
}
