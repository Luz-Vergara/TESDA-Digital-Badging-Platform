import React, { useEffect, useState } from 'react';
import { 
  Lock, 
  CheckCircle, 
  Server, 
  Globe, 
  Terminal, 
  Settings2,
  ShieldCheck,
  Zap,
  Activity,
  ArrowRight,
  Database
} from 'lucide-react';
import { collection, query, onSnapshot, limit, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/src/lib/firebase';
import { useFirebase } from '@/src/lib/FirebaseProvider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

export default function ICTODashboard() {
  const { isAuthReady } = useFirebase();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthReady) return;
    setLoading(false);
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
        <h1 className="text-3xl font-bold text-slate-900">ICTO Module</h1>
        <p className="text-slate-500">Information and Communications Technology Office - Technical Administration</p>
      </div>

      {/* System Health Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'System Uptime', value: '99.98%', icon: Activity, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Verification API', value: 'Operational', icon: CheckCircle, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Security Status', value: 'Hardened', icon: ShieldCheck, color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'Integrations', value: '3 Active', icon: Globe, color: 'text-amber-600', bg: 'bg-amber-50' },
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
              <Zap className="h-5 w-5 text-blue-600" />
              Technical Control Panel
            </CardTitle>
            <CardDescription>Manage authentication, verification infrastructure, and security settings.</CardDescription>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-4">
            <Link to="/icto/auth" className="block">
              <div className="p-4 rounded-xl border border-slate-200 hover:border-slate-400 hover:bg-slate-50/50 transition-all group font-mono">
                <Lock className="h-8 w-8 text-slate-700 mb-3" />
                <h3 className="font-bold text-slate-900 flex items-center justify-between">
                  AUTH_MGR
                  <ArrowRight className="h-4 w-4 text-slate-400" />
                </h3>
                <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-tighter">Access Control & Role Protocols</p>
              </div>
            </Link>
            <Link to="/icto/verification" className="block">
              <div className="p-4 rounded-xl border border-slate-200 hover:border-blue-200 hover:bg-blue-50/30 transition-all group">
                <CheckCircle className="h-8 w-8 text-blue-600 mb-3" />
                <h3 className="font-bold text-slate-900 flex items-center justify-between">
                  Verification API
                  <ArrowRight className="h-4 w-4 text-blue-400" />
                </h3>
                <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-tighter">Public Metadata Infrastructure</p>
              </div>
            </Link>
            <Link to="/icto/security" className="block">
              <div className="p-4 rounded-xl border border-slate-200 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all group">
                <Server className="h-8 w-8 text-indigo-600 mb-3" />
                <h3 className="font-bold text-slate-900 flex items-center justify-between">
                  Security & Encryption
                  <ArrowRight className="h-4 w-4 text-indigo-400" />
                </h3>
                <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-tighter">AES-256 Storage & Shielding</p>
              </div>
            </Link>
            <Link to="/icto/integrations" className="block">
              <div className="p-4 rounded-xl border border-slate-200 hover:border-emerald-200 hover:bg-emerald-50/30 transition-all group">
                <Globe className="h-8 w-8 text-emerald-600 mb-3" />
                <h3 className="font-bold text-slate-900 flex items-center justify-between">
                  External Integrations
                  <ArrowRight className="h-4 w-4 text-emerald-400" />
                </h3>
                <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-tighter">TESDABest & LRN API Hub</p>
              </div>
            </Link>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg">System Output / Logs</CardTitle>
          </CardHeader>
          <CardContent className="font-mono text-[10px] bg-slate-900 text-slate-300 p-4 rounded-lg overflow-hidden relative group">
            <div className="absolute top-2 right-2 flex gap-1 opacity-50">
              <div className="h-2 w-2 rounded-full bg-rose-500"></div>
              <div className="h-2 w-2 rounded-full bg-amber-500"></div>
              <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
            </div>
            <div className="space-y-1">
              <p className="text-emerald-400">[info] Initializing Verification Cluster...</p>
              <p>[info] Connected to Firestore Primary</p>
              <p>[info] SSL Handshake Successful (204ms)</p>
              <p className="text-blue-400">[debug] API Call: /v1/badges/verify/5x992</p>
              <p className="text-amber-400">[warn] High latency detected in Region: ASI-EAST1</p>
              <p>[info] Metadata Standards Synced with QSO</p>
              <p className="text-emerald-400">[success] System Audit Passed</p>
            </div>
            <Link to="/icto/logs">
              <Button variant="ghost" className="w-full mt-4 text-[10px] text-slate-400 hover:text-white hover:bg-slate-800 h-6">
                Tail Real-time Logs
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
