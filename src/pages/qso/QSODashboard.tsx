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
    totalIssuedBadges: 0,
    hierarchiesDefined: 4,
    recentUpdate: '',
    issuedAnalytics: [] as any[]
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthReady) return;

    // Fetch Templates
    const unsubTemplates = onSnapshot(collection(db, 'badgeTemplates'), (snap) => {
      const templates = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const latestUpdate = templates.sort((a: any, b: any) => 
        (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0)
      )[0] as any;
      const latestUpdateName = latestUpdate?.badgeName || latestUpdate?.name || 'None';
      
      setStats(prev => ({ 
        ...prev, 
        totalTemplates: snap.size,
        recentUpdate: latestUpdateName
      }));
    });

    // Fetch Issued Badges (for Analytics)
    const unsubIssued = onSnapshot(collection(db, 'issuedBadges'), (snap) => {
      const badges = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      // Calculate Analytics (Prototype logic)
      const analyticsMap: any = {};
      badges.forEach((b: any) => {
        const tId = b.badgeTemplateId || b.templateId || 'Unknown';
        if (!analyticsMap[tId]) {
          analyticsMap[tId] = { templateName: b.templateName || tId, count: 0, statuses: new Set() };
        }
        analyticsMap[tId].count++;
        analyticsMap[tId].statuses.add(b.status || 'Pending');
      });

      const analytics = Object.entries(analyticsMap).map(([id, data]: any) => ({
        id,
        name: data.templateName,
        count: data.count,
        status: Array.from(data.statuses).join(', ')
      }));

      setStats(prev => ({ ...prev, totalIssuedBadges: snap.size, issuedAnalytics: analytics }));
      setLoading(false);
    });

    return () => {
      unsubTemplates();
      unsubIssued();
    };
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
          { label: 'Hierarchies Defined', value: stats.hierarchiesDefined, icon: Layers, color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'Issued Badges', value: stats.totalIssuedBadges, icon: BadgeCheck, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Recent Update', value: stats.recentUpdate, icon: FileText, color: 'text-amber-600', bg: 'bg-amber-50' },
        ].map((stat) => (
          <Card key={stat.label} className="border-slate-200 shadow-sm">
            <CardContent className="p-6">
              <div className={`p-2 rounded-lg ${stat.bg} ${stat.color} w-fit mb-4`}>
                <stat.icon className="h-5 w-5" />
              </div>
              <p className="text-xl font-bold text-slate-900 truncate" title={stat.value as string}>{stat.value}</p>
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
            <Link to="/qso/templates" className="block">
              <div className="p-4 rounded-xl border border-slate-200 hover:border-blue-200 hover:bg-blue-50/30 transition-all group">
                <Award className="h-8 w-8 text-blue-600 mb-3" />
                <h3 className="font-bold text-slate-900 flex items-center justify-between">
                  Badge Templates
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
                <p className="text-xs text-slate-500 mt-1 text-pretty">Configure Proficient and Skilled badge types across qualifications.</p>
              </div>
            </Link>
          </CardContent>
        </Card>

        <Card className="border-slate-200 lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-lg">Issued Badge Analytics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.issuedAnalytics.map((item: any) => (
                <div key={item.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:bg-slate-50">
                  <div>
                    <p className="font-bold text-sm text-slate-900">{item.name}</p>
                    <p className="text-xs text-slate-500">Status: {item.status}</p>
                  </div>
                  <Badge variant="secondary" className="px-3 py-1 text-xs">{item.count} Issued</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-lg">Recent Activity Logs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { text: 'Updated Skilled badge standards for ICT', time: '2h ago' },
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
