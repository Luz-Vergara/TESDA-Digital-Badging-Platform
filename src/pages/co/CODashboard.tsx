import React, { useEffect, useState } from 'react';
import { 
  ShieldCheck, 
  ClipboardCheck, 
  ShieldAlert, 
  Activity, 
  RefreshCw,
  Clock,
  ArrowRight,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { collection, query, onSnapshot, limit, orderBy, where } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/src/lib/firebase';
import { useFirebase } from '@/src/lib/FirebaseProvider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

export default function CODashboard() {
  const { isAuthReady } = useFirebase();
  const [stats, setStats] = useState({
    activeCertifications: 0,
    renewalRequests: 0,
    revocations: 0,
    oversightCount: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthReady) return;

    const unsubBadges = onSnapshot(collection(db, 'issuedBadges'), (snap) => {
      const data = snap.docs.map(doc => doc.data());
      setStats(prev => ({ 
        ...prev, 
        activeCertifications: data.filter(d => d.status === 'Active').length,
        revocations: data.filter(d => d.status === 'Revoked').length,
        renewalRequests: 12, // Placeholder
        oversightCount: data.filter(d => d.badgeType === 'Skilled' || d.badgeType === 'Master').length
      }));
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'issuedBadges');
    });

    return () => unsubBadges();
  }, [isAuthReady]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">CO Module</h1>
        <p className="text-slate-500">Certification Office - Badge Validity & Renewal Oversight</p>
      </div>

      {/* Metrics Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Active Certifications', value: stats.activeCertifications, icon: ShieldCheck, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Renewal Requests', value: stats.renewalRequests, icon: RefreshCw, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Revoked/Suspended', value: stats.revocations, icon: ShieldAlert, color: 'text-rose-600', bg: 'bg-rose-50' },
          { label: 'Skilled/Master Pool', value: stats.oversightCount, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
        ].map((stat) => (
          <Card key={stat.label} className="border-slate-200 shadow-sm">
            <CardContent className="p-6">
              <div className={`p-2 rounded-lg ${stat.bg} ${stat.color} w-fit mb-4`}>
                <stat.icon className="h-5 w-5" />
              </div>
              <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mt-1">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-600" />
              Certification Workflow
            </CardTitle>
            <CardDescription>Manage badge validity, renewal policies, and enforcement.</CardDescription>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-4">
            <Link to="/co/oversight" className="block">
              <div className="p-4 rounded-xl border border-slate-200 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all group">
                <ShieldCheck className="h-8 w-8 text-indigo-600 mb-3" />
                <h3 className="font-bold text-slate-900 flex items-center justify-between">
                  Skilled & Master Oversight
                  <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                </h3>
                <p className="text-xs text-slate-500 mt-1 text-pretty">Monitor issuance rules for high-level technical badges.</p>
              </div>
            </Link>
            <Link to="/co/renewal" className="block">
              <div className="p-4 rounded-xl border border-slate-200 hover:border-emerald-200 hover:bg-emerald-50/30 transition-all group">
                <ClipboardCheck className="h-8 w-8 text-emerald-600 mb-3" />
                <h3 className="font-bold text-slate-900 flex items-center justify-between">
                  Validity & Renewal Rules
                  <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                </h3>
                <p className="text-xs text-slate-500 mt-1 text-pretty">Configure expiry periods and automated renewal logic.</p>
              </div>
            </Link>
            <Link to="/co/revocation" className="block">
              <div className="p-4 rounded-xl border border-slate-200 hover:border-rose-200 hover:bg-rose-50/30 transition-all group">
                <ShieldAlert className="h-8 w-8 text-rose-600 mb-3" />
                <h3 className="font-bold text-slate-900 flex items-center justify-between">
                  Revocation / Suspension
                  <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                </h3>
                <p className="text-xs text-slate-500 mt-1 text-pretty">Manage policy enforcement and badge cancellation protocols.</p>
              </div>
            </Link>
            <Link to="/co/monitoring" className="block">
              <div className="p-4 rounded-xl border border-slate-200 hover:border-amber-200 hover:bg-amber-50/30 transition-all group">
                <TrendingUp className="h-8 w-8 text-amber-600 mb-3" />
                <h3 className="font-bold text-slate-900 flex items-center justify-between">
                  Status Monitoring
                  <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                </h3>
                <p className="text-xs text-slate-500 mt-1 text-pretty">Real-time oversight of all certification-related badge statuses.</p>
              </div>
            </Link>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg">Critical Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-3 bg-rose-50 border border-rose-100 rounded-lg flex gap-3">
                <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-rose-900 uppercase">Suspension Required</p>
                  <p className="text-xs text-rose-700 leading-tight mt-1">High failure rate detected at Center #442. Manual audit suggested.</p>
                </div>
              </div>
              <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg flex gap-3">
                <Clock className="h-5 w-5 text-amber-600 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-amber-900 uppercase">Renewal Pulse</p>
                  <p className="text-xs text-amber-700 leading-tight mt-1">128 Skilled Badges expiring in the next 15 days.</p>
                </div>
              </div>
            </div>
            <Button className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-xs">
              Go to Overseer Queue
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
