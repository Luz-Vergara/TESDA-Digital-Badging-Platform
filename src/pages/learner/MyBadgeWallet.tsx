import { useEffect, useMemo, useState } from 'react';
import { Award, Calendar, ExternalLink, Search, ShieldCheck } from 'lucide-react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { db } from '@/src/lib/firebase';
import { useFirebase } from '@/src/lib/FirebaseProvider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { BadgeRenderer } from '@/src/components/badges/BadgeRenderer';
import type { BadgeDesign, BadgeTemplate, BadgeType, StandardType } from '@/src/types';
import { DEFAULT_BADGE_DESIGNS, resolveBadgeDesign } from '@/src/lib/badge-designs';

type WalletFilter = 'All' | BadgeType;

const formatDate = (value: any) => {
  if (!value) return 'Not recorded';

  const date = value?.toDate?.() ?? (value?.seconds ? new Date(value.seconds * 1000) : new Date(value));
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString();
};

const getStandardType = (badge: any): StandardType | undefined => {
  const value = badge.standardType ?? badge.metadata?.standardType ?? badge.templateDetails?.standardType;
  return value === 'CS' || value === 'MCC' || value === 'TR' ? value : undefined;
};

const getCredentialStatus = (badge: any) => {
  if (badge.status === 'Revoked') return 'Revoked';
  if (badge.status === 'Expired') return 'Expired';

  const expiryDate = badge.expiryDate?.toDate?.() ?? (badge.expiryDate ? new Date(badge.expiryDate) : null);
  return expiryDate && !Number.isNaN(expiryDate.getTime()) && expiryDate < new Date() ? 'Expired' : 'Active';
};

const statusClass = (status: string) => {
  if (status === 'Active') return 'bg-emerald-100 text-emerald-800';
  if (status === 'Expired') return 'bg-amber-100 text-amber-800';
  return 'bg-rose-100 text-rose-800';
};

export default function MyBadgeWallet() {
  const { user, isAuthReady } = useFirebase();
  const [uidBadges, setUidBadges] = useState<any[]>([]);
  const [emailBadges, setEmailBadges] = useState<any[]>([]);
  const [templates, setTemplates] = useState<BadgeTemplate[]>([]);
  const [badgeDesigns, setBadgeDesigns] = useState<BadgeDesign[]>(DEFAULT_BADGE_DESIGNS);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<WalletFilter>('All');

  useEffect(() => {
    if (!isAuthReady) return;
    if (!user) {
      setUidBadges([]);
      setEmailBadges([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    let uidReady = false;
    let emailReady = !user.email;
    const finishLoading = () => {
      if (uidReady && emailReady) setLoading(false);
    };

    const unsubscribeByUid = onSnapshot(
      query(collection(db, 'issuedBadges'), where('learnerId', '==', user.uid)),
      (snapshot) => {
        setUidBadges(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
        uidReady = true;
        finishLoading();
      },
      () => {
        setUidBadges([]);
        uidReady = true;
        finishLoading();
      },
    );

    const unsubscribeByEmail = user.email
      ? onSnapshot(
          query(collection(db, 'issuedBadges'), where('learnerEmail', '==', user.email)),
          (snapshot) => {
            setEmailBadges(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
            emailReady = true;
            finishLoading();
          },
          () => {
            setEmailBadges([]);
            emailReady = true;
            finishLoading();
          },
        )
      : () => undefined;

    return () => {
      unsubscribeByUid();
      unsubscribeByEmail();
    };
  }, [isAuthReady, user]);

  useEffect(() => {
    if (!isAuthReady) return;
    const unsubscribeTemplates = onSnapshot(collection(db, 'badgeTemplates'), (snapshot) => {
      setTemplates(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as BadgeTemplate));
    });
    const unsubscribeDesigns = onSnapshot(collection(db, 'badgeDesigns'), (snapshot) => {
      const remote = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as BadgeDesign);
      setBadgeDesigns([...DEFAULT_BADGE_DESIGNS, ...remote.filter((item) => !DEFAULT_BADGE_DESIGNS.some((base) => base.id === item.id))]);
    });
    return () => { unsubscribeTemplates(); unsubscribeDesigns(); };
  }, [isAuthReady]);

  const badges = useMemo(() => {
    const uniqueBadges = new Map<string, any>();
    [...uidBadges, ...emailBadges].forEach((badge) => uniqueBadges.set(badge.id, badge));

    return [...uniqueBadges.values()]
      .filter((badge) => filterType === 'All' || badge.badgeType === filterType)
      .filter((badge) => {
        const queryText = searchQuery.trim().toLowerCase();
        if (!queryText) return true;

        return [
          badge.badgeName,
          badge.programTitle,
          badge.qualificationName,
          badge.badgeId,
          badge.verificationId,
          getStandardType(badge),
        ].some((value) => String(value ?? '').toLowerCase().includes(queryText));
      })
      .sort((a, b) => {
        const aDate = a.issueDate?.toDate?.() ?? new Date(a.issueDate ?? 0);
        const bDate = b.issueDate?.toDate?.() ?? new Date(b.issueDate ?? 0);
        return bDate.getTime() - aDate.getTime();
      });
  }, [emailBadges, filterType, searchQuery, uidBadges]);

  if (!isAuthReady || loading) {
    return <div className="p-8 text-sm text-slate-500">Loading your issued credentials…</div>;
  }

  if (!user) {
    return <div className="p-8 text-sm text-slate-500">Sign in to view your credential wallet.</div>;
  }

  return (
    <div className="space-y-6 p-6 md:p-8">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-blue-700">Learner wallet</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-900">My credentials</h1>
          <p className="mt-2 text-sm text-slate-600">Credentials in this wallet are issued records from the official registry.</p>
        </div>
        <Button asChild variant="outline">
          <Link to="/learner/hierarchy">View badge hierarchy</Link>
        </Button>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <Input
              className="pl-9"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search badge, standard, Badge ID, or verification ID"
            />
          </div>
          <div className="flex gap-2" role="group" aria-label="Filter badge type">
            {(['All', 'Proficient', 'Skilled'] as WalletFilter[]).map((type) => (
              <Button
                key={type}
                size="sm"
                variant={filterType === type ? 'default' : 'outline'}
                onClick={() => setFilterType(type)}
              >
                {type}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {badges.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-14 text-center">
            <Award className="mx-auto mb-3 h-10 w-10 text-slate-300" />
            <h2 className="font-semibold text-slate-800">No issued credentials found</h2>
            <p className="mt-1 text-sm text-slate-500">Issued credentials will appear here once they are published to your learner record.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {badges.map((badge) => {
            const standardType = getStandardType(badge);
            const status = getCredentialStatus(badge);
            const standardTitle = badge.standardTitle ?? badge.metadata?.standardTitle ?? badge.qualificationName ?? badge.programTitle;
            const standardCode = badge.standardCode ?? badge.metadata?.standardCode ?? badge.qualificationCode;
            const verificationUrl = badge.verificationUrl || `${window.location.origin}/#/verify/${badge.verificationId}`;
            const template = templates.find((item) => item.id === badge.badgeTemplateId);
            const artwork = resolveBadgeDesign(template, badgeDesigns);

            return (
              <Card key={badge.id} className="overflow-hidden">
                <CardHeader className="border-b bg-slate-50/70">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-lg">{badge.badgeName || standardTitle || 'Issued credential'}</CardTitle>
                      <CardDescription className="mt-1">{standardTitle || 'Standard not recorded'}</CardDescription>
                    </div>
                    <Badge className={statusClass(status)}>{status}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 pt-5">
                  <div className="flex justify-center">
                    <BadgeRenderer
                      scale={0.38}
                      data={{
                        id: badge.id,
                        name: badge.badgeName || standardTitle || 'Issued credential',
                        learnerName: badge.learnerName || user.displayName || 'Learner Name',
                        trainingProvider: badge.trainingCenterName || 'Training Center',
                        issueDate: formatDate(badge.issueDate),
                        validUntil: formatDate(badge.expiryDate),
                        verificationId: badge.verificationId || 'PENDING',
                        badgeId: badge.badgeId || badge.id,
                        imageUrl: artwork.artworkUrl,
                        level: badge.badgeType || template?.badgeType || 'Proficient',
                        qualificationTitle: standardTitle || 'Standard not recorded',
                        qualificationCode: standardCode || '',
                        competencyTitle: badge.competencyTitle || badge.metadata?.competencyTitle || template?.competencyTitle || template?.relatedCompetency || '',
                        competencyCode: badge.competencyCode || badge.metadata?.competencyCode || template?.competencyCode || '',
                        templateConfig: template?.templateConfig,
                      }}
                    />
                  </div>
                  {!artwork.isConfigured && <p className="text-center text-xs text-slate-500">Badge artwork not configured</p>}
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">{badge.badgeType === 'Skilled' ? 'Skilled' : 'Proficient'}</Badge>
                    {standardType && <Badge variant="outline">{standardType}</Badge>}
                    {standardCode && <Badge variant="outline">{standardCode}</Badge>}
                  </div>
                  <dl className="grid gap-3 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-slate-500">Badge ID</dt>
                      <dd className="font-mono text-xs font-medium text-slate-800">{badge.badgeId || 'Not recorded'}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Verification ID</dt>
                      <dd className="font-mono text-xs font-medium text-slate-800">{badge.verificationId || 'Not recorded'}</dd>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-slate-400" />
                      <div><dt className="text-slate-500">Issued</dt><dd>{formatDate(badge.issueDate)}</dd></div>
                    </div>
                    <div>
                      <dt className="text-slate-500">Expiry</dt>
                      <dd>{formatDate(badge.expiryDate)}</dd>
                    </div>
                  </dl>
                  <Button asChild className="w-full" variant="outline" disabled={!badge.verificationId}>
                    <a href={verificationUrl} target="_blank" rel="noreferrer">
                      <ShieldCheck className="mr-2 h-4 w-4" /> Verify credential <ExternalLink className="ml-2 h-3.5 w-3.5" />
                    </a>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
