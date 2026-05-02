import React, { useEffect, useState } from 'react';
import { 
  Award, 
  Layers, 
  BadgeCheck, 
  FileCode, 
  FileText,
  Activity,
  Plus,
  ArrowRight,
  ClipboardList
} from 'lucide-react';
import { collection, query, onSnapshot, limit, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/src/lib/firebase';
import { useFirebase } from '@/src/lib/FirebaseProvider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

export default function QSODashboard() {
  const { isAuthReady } = useFirebase();
  const [stats, setStats] = useState({
    totalTemplates: 0,
    activeStandards: 0,
    pendingValidations: 0,
    alignmentScore: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthReady) return;

    const unsubTemplates = onSnapshot(collection(db, 'badgeTemplates'), (snap) => {
      setStats(prev => ({ 
        ...prev, 
        totalTemplates: snap.size,
        activeStandards: snap.docs.filter(d => d.data().status === 'Approved').length,
        alignmentScore: 94
      }));
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'badgeTemplates');
    });

    return () => unsubTemplates();
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
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">QSO Module</h1>
          <p className="text-slate-500">Qualifications and Standards Office Administration</p>
        </div>
        <Link to="/qso/templates">
          <Button className="bg-blue-600 hover:bg-blue-700 gap-2">
            <Plus className="h-4 w-4" />
            New Badge Template
          </Button>
        </Link>
      </div>

      {/* Metrics Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Badge Templates', value: stats.totalTemplates, icon: Award, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Active Standards', value: stats.activeStandards, icon: FileCode, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Hierarchies Defined', value: 4, icon: Layers, color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'Alignment Score', value: `${stats.alignmentScore}%`, icon: BadgeCheck, color: 'text-amber-600', bg: 'bg-amber-50' },
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
              Standardization Tasks
            </CardTitle>
            <CardDescription>Manage qualification alignments and template validation.</CardDescription>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-4">
            <Link to="/qso/metadata" className="block">
              <div className="p-4 rounded-xl border border-slate-200 hover:border-blue-200 hover:bg-blue-50/30 transition-all group">
                <FileCode className="h-8 w-8 text-blue-600 mb-3" />
                <h3 className="font-bold text-slate-900 flex items-center justify-between">
                  Metadata Standards
                  <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                </h3>
                <p className="text-xs text-slate-500 mt-1 text-pretty">Define properties and structure for all digital badges.</p>
              </div>
            </Link>
            <Link to="/qso/hierarchy" className="block">
              <div className="p-4 rounded-xl border border-slate-200 hover:border-purple-200 hover:bg-purple-50/30 transition-all group">
                <Layers className="h-8 w-8 text-purple-600 mb-3" />
                <h3 className="font-bold text-slate-900 flex items-center justify-between">
                  Badge Hierarchy
                  <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                </h3>
                <p className="text-xs text-slate-500 mt-1 text-pretty">Configure levels from Proficient to Master across qualifications.</p>
              </div>
            </Link>
            <Link to="/qso/alignment" className="block">
              <div className="p-4 rounded-xl border border-slate-200 hover:border-emerald-200 hover:bg-emerald-50/30 transition-all group">
                <BadgeCheck className="h-8 w-8 text-emerald-600 mb-3" />
                <h3 className="font-bold text-slate-900 flex items-center justify-between">
                  Qualification Alignment
                  <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                </h3>
                <p className="text-xs text-slate-500 mt-1 text-pretty">Map badges to training regulations and standards.</p>
              </div>
            </Link>
            <Link to="/qso/conventions" className="block">
              <div className="p-4 rounded-xl border border-slate-200 hover:border-amber-200 hover:bg-amber-50/30 transition-all group">
                <FileText className="h-8 w-8 text-amber-600 mb-3" />
                <h3 className="font-bold text-slate-900 flex items-center justify-between">
                  Naming Conventions
                  <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                </h3>
                <p className="text-xs text-slate-500 mt-1 text-pretty">Enforce consistent badge naming for all offices.</p>
              </div>
            </Link>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg">Recent Standards Logs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { text: 'Updated Master Hierarchy for ICT', time: '2h ago' },
              { text: 'Revised Proficient Badge Metadata', time: '5h ago' },
              { text: 'New Alignment: Solar Panel Tech', time: '1d ago' },
              { text: 'Archived legacy Skilled template', time: '2d ago' },
            ].map((item, i) => (
              <div key={i} className="flex gap-3 text-sm">
                <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" />
                <div>
                  <p className="text-slate-700 font-medium">{item.text}</p>
                  <p className="text-[10px] text-slate-400">{item.time}</p>
                </div>
              </div>
            ))}
            <Button variant="ghost" className="w-full text-xs text-blue-600 hover:bg-blue-50 mt-4">
              View Activity Trail
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
