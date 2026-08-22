import { useEffect, useState, type ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { AlertCircle, Award, Building2, Calendar, CheckCircle2, Clock3, Search, ShieldCheck, XCircle } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/src/lib/firebase';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import Navbar from '@/src/components/layout/Navbar';
import { getBadgeColor } from '@/src/lib/badge-utils';
import type { PublicCredential } from '@/src/types';

const verificationIdPattern = /^[A-Za-z0-9_-]{1,128}$/;

const formatDate = (value: any) => {
  if (!value) return 'Not recorded';
  const date = value?.toDate?.() ?? (value?.seconds ? new Date(value.seconds * 1000) : new Date(value));
  return Number.isNaN(date.getTime()) ? 'Not recorded' : date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
};

const effectiveStatus = (credential: PublicCredential) => {
  if (credential.credentialStatus !== 'Active') return credential.credentialStatus;
  const expiryDate = credential.expiryDate?.toDate?.() ?? (credential.expiryDate?.seconds ? new Date(credential.expiryDate.seconds * 1000) : new Date(credential.expiryDate));
  return !Number.isNaN(expiryDate.getTime()) && expiryDate < new Date() ? 'Expired' : 'Active';
};

const statusPresentation = (status: ReturnType<typeof effectiveStatus>) => {
  if (status === 'Active') return { label: 'Active & Verified', className: 'border-emerald-200 bg-emerald-50 text-emerald-800', Icon: CheckCircle2 };
  if (status === 'Expired') return { label: 'Credential Expired', className: 'border-amber-200 bg-amber-50 text-amber-800', Icon: Clock3 };
  if (status === 'Suspended') return { label: 'Credential Suspended', className: 'border-rose-200 bg-rose-50 text-rose-800', Icon: AlertCircle };
  return { label: 'Credential Revoked', className: 'border-rose-200 bg-rose-50 text-rose-800', Icon: XCircle };
};

export default function Verification() {
  const { verificationId: urlVerificationId } = useParams();
  const [searchId, setSearchId] = useState('');
  const [credential, setCredential] = useState<PublicCredential | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState('');

  const verify = async (identifier: string) => {
    const verificationId = identifier.trim().toUpperCase();
    setCredential(null);
    setError('');

    if (!verificationIdPattern.test(verificationId)) {
      setError('Credential Not Found');
      return;
    }

    setIsSearching(true);
    try {
      // One direct read of the safe public projection. Never query private collections.
      const snapshot = await getDoc(doc(db, 'publicCredentials', verificationId));
      if (!snapshot.exists()) {
        setError('Credential Not Found');
        return;
      }
      setCredential(snapshot.data() as PublicCredential);
    } catch (lookupError) {
      console.error('Public credential verification failed:', lookupError);
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

  const status = credential ? effectiveStatus(credential) : null;
  const presentation = status ? statusPresentation(status) : null;

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <div className="mb-7 text-center">
          <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-700"><ShieldCheck className="h-6 w-6" /></div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Credential verification</h1>
          <p className="mt-2 text-slate-600">Verify a TESDA digital credential using its unique Verification ID.</p>
        </div>

        <Card className="mb-6">
          <CardHeader className="pb-3"><CardTitle className="text-lg">Verify credential</CardTitle><CardDescription>Only an exact Verification ID is used; Badge IDs and personal records are never searched.</CardDescription></CardHeader>
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row">
            <div className="relative flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><Input className="pl-9 font-mono" value={searchId} onChange={(event) => setSearchId(event.target.value)} placeholder="Verification ID" onKeyDown={(event) => { if (event.key === 'Enter') void verify(searchId); }} /></div>
            <Button onClick={() => void verify(searchId)} disabled={isSearching}>{isSearching ? 'Verifying…' : 'Verify credential'}</Button>
          </CardContent>
        </Card>

        {error && <Card className="border-amber-200 bg-amber-50"><CardContent className="flex items-center gap-3 p-5 text-amber-900"><AlertCircle className="h-5 w-5" /><div><p className="font-semibold">{error}</p><p className="text-sm">Check the credential reference and try again.</p></div></CardContent></Card>}

        {credential && status && presentation && (
          <Card className="overflow-hidden">
            <CardHeader className="border-b bg-white">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                <div className="flex gap-3"><div className={`flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg ${getBadgeColor(credential.badgeType)}`}>{credential.badgeArtworkUrl ? <img src={credential.badgeArtworkUrl} alt="Credential artwork" className="h-full w-full object-cover" referrerPolicy="no-referrer" /> : <Award className="h-6 w-6" />}</div><div><CardTitle>{credential.badgeName}</CardTitle><CardDescription className="mt-1">Official public credential record</CardDescription></div></div>
                <Badge className={`w-fit border ${presentation.className}`}><presentation.Icon className="mr-1.5 h-4 w-4" />{presentation.label}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 p-6">
              <div className="flex flex-wrap gap-2"><Badge variant="secondary">{credential.badgeType}</Badge><Badge variant="outline">{credential.standardType}</Badge><Badge variant="outline">{credential.standardCode || 'Standard code not recorded'}</Badge></div>
              <section className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
                <Detail label="Standard" value={credential.standardTitle} />
                <Detail label="Standard code" value={credential.standardCode || 'Not recorded'} />
                {credential.competencyTitle && <Detail label="Competency" value={credential.competencyTitle} />}
                {credential.competencyCode && <Detail label="Competency code" value={credential.competencyCode} />}
                <Detail label="Credential holder" value={credential.holderDisplayName} />
                <Detail icon={<Building2 className="h-4 w-4" />} label="Training provider" value={credential.trainingProviderDisplayName} />
                <Detail label="Badge ID" value={credential.badgeId} mono />
                <Detail label="Verification ID" value={credential.verificationId} mono />
                <Detail icon={<Calendar className="h-4 w-4" />} label="Issue date" value={formatDate(credential.issueDate)} />
                <Detail icon={<Calendar className="h-4 w-4" />} label="Expiry date" value={formatDate(credential.expiryDate)} />
              </section>
              <p className="border-t pt-4 text-xs text-slate-500">This page displays a limited public credential projection. Learner accounts, requests, evidence, enrollment, and integration data remain private.</p>
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
