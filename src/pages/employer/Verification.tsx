import { useEffect, useState, type ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { AlertCircle, Award, Building2, Calendar, CheckCircle2, Clock3, Search, ShieldCheck, User, XCircle } from 'lucide-react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/src/lib/firebase';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import Navbar from '@/src/components/layout/Navbar';
import type { StandardType } from '@/src/types';

const formatDate = (value: any) => {
  if (!value) return 'Not recorded';
  const date = value?.toDate?.() ?? (value?.seconds ? new Date(value.seconds * 1000) : new Date(value));
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
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

const statusPresentation = (status: string) => {
  if (status === 'Active') return { label: 'Active', className: 'border-emerald-200 bg-emerald-50 text-emerald-800', Icon: CheckCircle2 };
  if (status === 'Expired') return { label: 'Expired', className: 'border-amber-200 bg-amber-50 text-amber-800', Icon: Clock3 };
  return { label: 'Revoked', className: 'border-rose-200 bg-rose-50 text-rose-800', Icon: XCircle };
};

const lookupIssuedBadge = async (identifier: string) => {
  const value = identifier.trim();
  if (!value) return null;

  const lookupValues = [...new Set([value, value.toUpperCase()])];
  const searches = lookupValues.flatMap((lookupValue) => [
    getDocs(query(collection(db, 'issuedBadges'), where('verificationId', '==', lookupValue))),
    getDocs(query(collection(db, 'issuedBadges'), where('badgeId', '==', lookupValue))),
  ]);
  const snapshots = await Promise.all(searches);
  const document = snapshots.flatMap((snapshot) => snapshot.docs)[0];

  return document ? { id: document.id, ...document.data() } : null;
};

export default function Verification() {
  const { verificationId: urlVerificationId } = useParams();
  const [searchId, setSearchId] = useState('');
  const [result, setResult] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState('');

  const verify = async (identifier: string) => {
    const value = identifier.trim();
    if (!value) {
      setResult(null);
      setError('Enter a Verification ID or Badge ID.');
      return;
    }

    setIsSearching(true);
    setError('');
    setResult(null);
    try {
      const credential = await lookupIssuedBadge(value);
      if (!credential) {
        setError('Credential Not Found');
        return;
      }
      setResult(credential);
    } catch (lookupError) {
      console.error('Issued credential verification failed:', lookupError);
      setError('Credential Not Found');
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    if (!urlVerificationId) return;
    setSearchId(urlVerificationId);
    void verify(urlVerificationId);
  }, [urlVerificationId]);

  const status = result ? getCredentialStatus(result) : null;
  const presentation = status ? statusPresentation(status) : null;
  const standardType = result ? getStandardType(result) : undefined;
  const standardTitle = result?.standardTitle ?? result?.metadata?.standardTitle ?? result?.qualificationName ?? result?.programTitle;
  const standardCode = result?.standardCode ?? result?.metadata?.standardCode ?? result?.qualificationCode;
  const competencyCode = result?.competencyCode ?? result?.metadata?.competencyCode ?? result?.ucCode;
  const competencyTitle = result?.competencyTitle ?? result?.metadata?.competencyTitle ?? result?.ucTitle;

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <div className="mb-7 text-center">
          <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-700"><ShieldCheck className="h-6 w-6" /></div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Credential verification</h1>
          <p className="mt-2 text-slate-600">Verify an issued TESDA digital badge using its Verification ID or Badge ID.</p>
        </div>

        <Card className="mb-6">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row">
            <div className="relative flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><Input className="pl-9" value={searchId} onChange={(event) => setSearchId(event.target.value)} placeholder="Verification ID or Badge ID" onKeyDown={(event) => { if (event.key === 'Enter') void verify(searchId); }} /></div>
            <Button onClick={() => void verify(searchId)} disabled={isSearching}>{isSearching ? 'Verifying…' : 'Verify credential'}</Button>
          </CardContent>
        </Card>

        {error && (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="flex items-center gap-3 p-5 text-amber-900"><AlertCircle className="h-5 w-5" /><div><p className="font-semibold">{error}</p><p className="text-sm">Check the credential reference and try again.</p></div></CardContent>
          </Card>
        )}

        {result && presentation && (
          <Card className="overflow-hidden">
            <CardHeader className="border-b bg-white">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                <div className="flex gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-700"><Award className="h-6 w-6" /></div><div><CardTitle>{result.badgeName || standardTitle || 'Issued credential'}</CardTitle><CardDescription className="mt-1">Official issued credential record</CardDescription></div></div>
                <Badge className={`w-fit border ${presentation.className}`}><presentation.Icon className="mr-1.5 h-4 w-4" />{presentation.label}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 p-6">
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{result.badgeType === 'Skilled' ? 'Skilled' : 'Proficient'}</Badge>
                {standardType && <Badge variant="outline">{standardType}</Badge>}
                {standardCode && <Badge variant="outline">{standardCode}</Badge>}
              </div>

              <section className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
                <Detail label="Standard" value={standardTitle || 'Not recorded'} />
                <Detail label="Standard code" value={standardCode || 'Not recorded'} />
                {competencyTitle && <Detail label="Competency" value={competencyTitle} />}
                {competencyCode && <Detail label="Competency code" value={competencyCode} />}
                <Detail icon={<User className="h-4 w-4" />} label="Learner" value={result.learnerName || 'Not recorded'} />
                <Detail icon={<Building2 className="h-4 w-4" />} label="Training provider" value={result.trainingCenterName || result.trainingProviderName || 'Not recorded'} />
                <Detail label="Badge ID" value={result.badgeId || 'Not recorded'} mono />
                <Detail label="Verification ID" value={result.verificationId || 'Not recorded'} mono />
                <Detail icon={<Calendar className="h-4 w-4" />} label="Issue date" value={formatDate(result.issueDate)} />
                <Detail icon={<Calendar className="h-4 w-4" />} label="Expiry date" value={formatDate(result.expiryDate)} />
              </section>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}

function Detail({ icon, label, value, mono = false }: { icon?: ReactNode; label: string; value: string; mono?: boolean }) {
  return <div><dt className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">{icon}{label}</dt><dd className={`mt-1 break-words text-sm text-slate-900 ${mono ? 'font-mono text-xs' : 'font-medium'}`}>{value}</dd></div>;
}
