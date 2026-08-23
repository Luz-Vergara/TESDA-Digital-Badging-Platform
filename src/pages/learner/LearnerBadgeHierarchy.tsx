import { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, CheckCircle2, Lock, Clock3, Award } from 'lucide-react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/src/lib/firebase';
import { useFirebase } from '@/src/lib/FirebaseProvider';
import { demoStandards } from '@/src/data/demoStandards';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BadgeRenderer } from '@/src/components/badges/BadgeRenderer';
import { DEFAULT_BADGE_DESIGNS, mergeBadgeDesigns, resolveBadgeDesign } from '@/src/lib/badge-designs';
import type { BadgeDesign, BadgeTemplate, BadgeType } from '@/src/types';

type LearnerBadgeStatus = 'Locked' | 'Eligible' | 'Pending' | 'Issued';

const statusStyle: Record<LearnerBadgeStatus, string> = {
  Locked: 'border-slate-200 bg-slate-50 text-slate-600',
  Eligible: 'border-blue-200 bg-blue-50 text-blue-800',
  Pending: 'border-amber-200 bg-amber-50 text-amber-800',
  Issued: 'border-emerald-200 bg-emerald-50 text-emerald-800',
};

const normalise = (value: unknown) => String(value ?? '').trim().toLowerCase();

const formatDate = (value: any) => {
  if (!value) return 'Not issued';
  const date = value?.toDate?.() ?? (value?.seconds ? new Date(value.seconds * 1000) : new Date(value));
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString();
};

const recordMatchesStandard = (record: any, standard: (typeof demoStandards)[number]) => {
  const metadata = record.metadata ?? {};
  if (record.standardId === standard.id || metadata.standardId === standard.id) return true;

  const titles = [
    record.standardTitle,
    metadata.standardTitle,
    record.programTitle,
    record.qualificationName,
    record.externalEligibility?.programTitle,
    metadata.externalEligibility?.programTitle,
  ];
  const codes = [record.standardCode, metadata.standardCode, record.qualificationCode, record.externalEligibility?.qualificationCode];

  return titles.some((title) => normalise(title) === normalise(standard.title)) ||
    Boolean(standard.code && codes.some((code) => normalise(code) === normalise(standard.code)));
};

const recordMatchesCompetency = (record: any, competency: { code?: string; title: string }) => {
  const metadata = record.metadata ?? {};
  if (competency.code && [record.ucCode, record.competencyCode, metadata.competencyCode].some((code) => normalise(code) === normalise(competency.code))) {
    return true;
  }

  return [record.ucTitle, record.competencyTitle, metadata.competencyTitle].some(
    (title) => normalise(title) === normalise(competency.title),
  );
};

const issuedFor = (badges: any[], standard: (typeof demoStandards)[number], type: BadgeType, competency?: { code?: string; title: string }) =>
  badges.some((badge) =>
    badge.badgeType === type &&
    badge.status !== 'Revoked' &&
    recordMatchesStandard(badge, standard) &&
    (!competency || recordMatchesCompetency(badge, competency)),
  );

const issuedBadgeFor = (badges: any[], standard: (typeof demoStandards)[number], type: BadgeType, competency?: { code?: string; title: string }) =>
  badges.find((badge) =>
    badge.badgeType === type &&
    badge.status !== 'Revoked' &&
    recordMatchesStandard(badge, standard) &&
    (!competency || recordMatchesCompetency(badge, competency)),
  );

const templateMatchesStandard = (template: BadgeTemplate, standard: (typeof demoStandards)[number]) =>
  template.standardId === standard.id ||
  normalise(template.qualificationName) === normalise(standard.title) ||
  Boolean(standard.code && normalise(template.qualificationCode) === normalise(standard.code));

const mappedTemplateFor = (
  templates: BadgeTemplate[],
  standard: (typeof demoStandards)[number],
  type: BadgeType,
  competency?: { code?: string; title: string },
) => templates.find((template) => {
  if (!['Active', 'Approved'].includes(template.status) || template.badgeType !== type || !templateMatchesStandard(template, standard)) {
    return false;
  }

  if (!competency) return template.recognitionScope === 'CompleteStandard';
  if (template.recognitionScope !== 'Competency') return false;

  return Boolean(
    (competency.code && normalise(template.competencyCode) === normalise(competency.code)) ||
    normalise(template.competencyTitle) === normalise(competency.title),
  );
});

const resolveNodeArtwork = (issuedBadge: any, template: BadgeTemplate | undefined, badgeDesigns: BadgeDesign[]) => {
  const issuedArtworkUrl = issuedBadge?.badgeArtworkUrl || badgeDesigns.find((design) => design.id === issuedBadge?.badgeDesignId)?.artworkUrl;
  const mappedArtwork = resolveBadgeDesign(template, badgeDesigns);
  return {
    artworkUrl: issuedArtworkUrl || mappedArtwork.artworkUrl,
    isConfigured: Boolean(issuedArtworkUrl || mappedArtwork.isConfigured),
  };
};

const pendingFor = (requests: any[], standard: (typeof demoStandards)[number], type: BadgeType, competency?: { code?: string; title: string }) =>
  requests.some((request) =>
    request.badgeType === type &&
    ['Pending Review', 'Pending Approval'].includes(request.status) &&
    recordMatchesStandard(request, standard) &&
    (!competency || recordMatchesCompetency(request, competency)),
  );

const completedFor = (completions: any[], competency: { code?: string; title: string }) =>
  completions.some((completion) =>
    ['Completed', 'For Badge Request', 'Badge Requested'].includes(completion.completionStatus) &&
    recordMatchesCompetency(completion, competency),
  );

const StatusBadge = ({ status }: { status: LearnerBadgeStatus }) => {
  const Icon = status === 'Issued' ? CheckCircle2 : status === 'Pending' ? Clock3 : status === 'Eligible' ? Award : Lock;
  return <Badge className={statusStyle[status]}><Icon className="mr-1 h-3.5 w-3.5" />{status}</Badge>;
};

export default function LearnerBadgeHierarchy() {
  const { user, isAuthReady } = useFirebase();
  const [issuedBadges, setIssuedBadges] = useState<any[]>([]);
  const [emailIssuedBadges, setEmailIssuedBadges] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [completions, setCompletions] = useState<any[]>([]);
  const [templates, setTemplates] = useState<BadgeTemplate[]>([]);
  const [badgeDesigns, setBadgeDesigns] = useState<BadgeDesign[]>(DEFAULT_BADGE_DESIGNS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthReady) return;
    if (!user) {
      setIssuedBadges([]);
      setEmailIssuedBadges([]);
      setRequests([]);
      setCompletions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const ready = new Set<string>();
    const expected = user.email ? 4 : 3;
    const markReady = (source: string) => {
      ready.add(source);
      if (ready.size === expected) setLoading(false);
    };
    const asRecords = (snapshot: any) => snapshot.docs.map((item: any) => ({ id: item.id, ...item.data() }));

    const unsubscribeIssued = onSnapshot(
      query(collection(db, 'issuedBadges'), where('learnerId', '==', user.uid)),
      (snapshot) => { setIssuedBadges(asRecords(snapshot)); markReady('issued'); },
      () => { setIssuedBadges([]); markReady('issued'); },
    );
    const unsubscribeRequests = onSnapshot(
      query(collection(db, 'badgeRequests'), where('learnerId', '==', user.uid)),
      (snapshot) => { setRequests(asRecords(snapshot)); markReady('requests'); },
      () => { setRequests([]); markReady('requests'); },
    );
    const unsubscribeCompletions = onSnapshot(
      query(collection(db, 'ucCompletions'), where('learnerId', '==', user.uid)),
      (snapshot) => { setCompletions(asRecords(snapshot)); markReady('completions'); },
      () => { setCompletions([]); markReady('completions'); },
    );
    const unsubscribeEmailIssued = user.email
      ? onSnapshot(
          query(collection(db, 'issuedBadges'), where('learnerEmail', '==', user.email)),
          (snapshot) => { setEmailIssuedBadges(asRecords(snapshot)); markReady('email-issued'); },
          () => { setEmailIssuedBadges([]); markReady('email-issued'); },
        )
      : () => undefined;

    return () => {
      unsubscribeIssued();
      unsubscribeRequests();
      unsubscribeCompletions();
      unsubscribeEmailIssued();
    };
  }, [isAuthReady, user]);

  useEffect(() => {
    if (!isAuthReady || !user) {
      setTemplates([]);
      setBadgeDesigns(DEFAULT_BADGE_DESIGNS);
      return;
    }

    const unsubscribeTemplates = onSnapshot(
      collection(db, 'badgeTemplates'),
      (snapshot) => setTemplates(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as BadgeTemplate)),
      () => setTemplates([]),
    );
    const unsubscribeDesigns = onSnapshot(
      collection(db, 'badgeDesigns'),
      (snapshot) => {
        const remoteDesigns = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as BadgeDesign);
        setBadgeDesigns(mergeBadgeDesigns(remoteDesigns));
      },
      () => setBadgeDesigns(DEFAULT_BADGE_DESIGNS),
    );

    return () => {
      unsubscribeTemplates();
      unsubscribeDesigns();
    };
  }, [isAuthReady, user]);

  const learnerIssuedBadges = useMemo(() => {
    const unique = new Map<string, any>();
    [...issuedBadges, ...emailIssuedBadges].forEach((badge) => unique.set(badge.id, badge));
    return [...unique.values()];
  }, [emailIssuedBadges, issuedBadges]);

  if (!isAuthReady || loading) return <div className="p-8 text-sm text-slate-500">Loading your badge hierarchy…</div>;
  if (!user) return <div className="p-8 text-sm text-slate-500">Sign in to view your badge hierarchy.</div>;

  return (
    <div className="space-y-6 p-6 md:p-8">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wider text-blue-700">Learner progress</p>
        <h1 className="mt-1 text-3xl font-bold text-slate-900">Badge hierarchy</h1>
        <p className="mt-2 text-sm text-slate-600">Your issued credentials, pending requests, and completed competencies determine each badge status.</p>
      </div>

      <div className="grid gap-3 text-sm sm:grid-cols-4">
        {(['Locked', 'Eligible', 'Pending', 'Issued'] as LearnerBadgeStatus[]).map((status) => (
          <div key={status} className={`flex items-center justify-center rounded-md border px-3 py-2 ${statusStyle[status]}`}><StatusBadge status={status} /></div>
        ))}
      </div>

      <div className="space-y-6">
        {demoStandards.map((standard) => {
          const competencyProgress = standard.competencies.filter((competency) => completedFor(completions, competency)).length;
          const allCompetenciesComplete = standard.competencies.length > 0 && competencyProgress === standard.competencies.length;
          const competencyNodes = standard.competencies.map((competency) => {
            const issuedBadge = issuedBadgeFor(learnerIssuedBadges, standard, 'Proficient', competency);
            const template = mappedTemplateFor(templates, standard, 'Proficient', competency);
            const status: LearnerBadgeStatus = issuedFor(learnerIssuedBadges, standard, 'Proficient', competency)
              ? 'Issued'
              : pendingFor(requests, standard, 'Proficient', competency)
                ? 'Pending'
                : completedFor(completions, competency)
                  ? 'Eligible'
                  : 'Locked';
            return { competency, status, issuedBadge, template };
          });
          const completionType = standard.completionBadgeType;
          const completionIssuedBadge = issuedBadgeFor(learnerIssuedBadges, standard, completionType);
          const completionTemplate = mappedTemplateFor(templates, standard, completionType);
          const completionStatus: LearnerBadgeStatus = issuedFor(learnerIssuedBadges, standard, completionType)
            ? 'Issued'
            : pendingFor(requests, standard, completionType)
              ? 'Pending'
              : allCompetenciesComplete
                ? 'Eligible'
                : 'Locked';

          return (
            <Card key={standard.id}>
              <CardHeader className="border-b bg-slate-50/70">
                <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                  <div>
                    <div className="flex flex-wrap gap-2"><Badge variant="outline">{standard.type}</Badge>{standard.code && <Badge variant="outline">{standard.code}</Badge>}</div>
                    <CardTitle className="mt-3 text-xl">{standard.title}</CardTitle>
                    <CardDescription className="mt-2">
                      {standard.competencies.length > 0
                        ? `${competencyProgress} / ${standard.competencies.length} competencies completed`
                        : `Complete ${standard.type} achievement`}
                    </CardDescription>
                  </div>
                  <StatusBadge status={completionStatus} />
                </div>
              </CardHeader>
              <CardContent className="pt-5">
                {competencyNodes.length > 0 && (
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {competencyNodes.map(({ competency, status, issuedBadge, template }) => {
                      const artwork = resolveNodeArtwork(issuedBadge, template, badgeDesigns);
                      return (
                      <div key={`${standard.id}-${competency.code ?? competency.title}`} className={`rounded-lg border p-4 ${statusStyle[status]}`}>
                        <div className="flex items-start justify-between gap-2"><span className="text-xs font-semibold uppercase tracking-wider">Proficient</span><StatusBadge status={status} /></div>
                        <div className="mt-3 flex justify-center">
                          {artwork.isConfigured ? (
                            <BadgeRenderer
                              scale={0.24}
                              allowEnlarge={false}
                              data={{
                                id: issuedBadge?.id || template?.id || `${standard.id}-${competency.code ?? competency.title}`,
                                name: issuedBadge?.badgeName || template?.badgeName || `${standard.title} Proficient`,
                                learnerName: issuedBadge?.learnerName || user.displayName || 'Learner Name',
                                trainingProvider: issuedBadge?.trainingCenterName || 'Training Center',
                                issueDate: formatDate(issuedBadge?.issueDate),
                                validUntil: formatDate(issuedBadge?.expiryDate),
                                verificationId: issuedBadge?.verificationId || 'PENDING',
                                badgeId: issuedBadge?.badgeId || template?.id,
                                imageUrl: artwork.artworkUrl,
                                level: 'Proficient',
                                qualificationTitle: standard.title,
                                qualificationCode: standard.code || '',
                                competencyTitle: competency.title,
                                competencyCode: competency.code || '',
                                templateConfig: template?.templateConfig,
                              }}
                            />
                          ) : <p className="text-center text-xs text-slate-500">Badge artwork not configured</p>}
                        </div>
                        {competency.code && <p className="mt-3 font-mono text-xs">{competency.code}</p>}
                        <p className="mt-1 text-sm font-medium">{competency.title}</p>
                      </div>
                    )})}
                  </div>
                )}

                {competencyNodes.length > 0 && <div className="my-5 flex items-center gap-2 text-sm font-medium text-slate-500"><ArrowUpRight className="h-4 w-4" /> Completed competency badges lead to the complete-standard badge.</div>}
                <div className={`rounded-lg border p-5 ${statusStyle[completionStatus]}`}>
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider">Complete standard</p>
                      <p className="mt-1 text-lg font-bold">{completionType}</p>
                      <div className="mt-3 flex justify-center sm:justify-start">
                        {(() => {
                          const artwork = resolveNodeArtwork(completionIssuedBadge, completionTemplate, badgeDesigns);
                          return artwork.isConfigured ? (
                            <BadgeRenderer
                              scale={0.28}
                              allowEnlarge={false}
                              data={{
                                id: completionIssuedBadge?.id || completionTemplate?.id || `${standard.id}-complete`,
                                name: completionIssuedBadge?.badgeName || completionTemplate?.badgeName || `${standard.title} ${completionType}`,
                                learnerName: completionIssuedBadge?.learnerName || user.displayName || 'Learner Name',
                                trainingProvider: completionIssuedBadge?.trainingCenterName || 'Training Center',
                                issueDate: formatDate(completionIssuedBadge?.issueDate),
                                validUntil: formatDate(completionIssuedBadge?.expiryDate),
                                verificationId: completionIssuedBadge?.verificationId || 'PENDING',
                                badgeId: completionIssuedBadge?.badgeId || completionTemplate?.id,
                                imageUrl: artwork.artworkUrl,
                                level: completionType,
                                qualificationTitle: standard.title,
                                qualificationCode: standard.code || '',
                                templateConfig: completionTemplate?.templateConfig,
                              }}
                            />
                          ) : <p className="text-xs text-slate-500">Badge artwork not configured</p>;
                        })()}
                      </div>
                    </div>
                    <StatusBadge status={completionStatus} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
