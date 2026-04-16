import React, { useEffect, useState } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  ArrowRight,
  Calendar,
  Filter,
  Activity,
  Award,
  Building2,
  Users
} from 'lucide-react';
import { collection, query, where, onSnapshot, limit, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/src/lib/firebase';
import { useFirebase } from '@/src/lib/FirebaseProvider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';

export default function DistrictOfficeDashboard() {
  const { userProfile, isAuthReady } = useFirebase();
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    expiring: 0
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthReady) return;

    if (!userProfile?.organizationId) {
      setLoading(false);
      return;
    }

    const districtId = userProfile.organizationId;
    const path = 'issuedBadges';

    // Stats queries
    const qPending = query(collection(db, path), where('districtOfficeId', '==', districtId), where('status', '==', 'Pending Approval'));
    const qApproved = query(collection(db, path), where('districtOfficeId', '==', districtId), where('status', '==', 'Approved'));
    const qRejected = query(collection(db, path), where('districtOfficeId', '==', districtId), where('status', '==', 'Rejected'));
    
    // Recent activity
    const qActivity = query(
      collection(db, 'auditLogs'), 
      orderBy('timestamp', 'desc'),
      limit(5)
    );

    const unsubPending = onSnapshot(qPending, (s) => setStats(prev => ({ ...prev, pending: s.size })));
    const unsubApproved = onSnapshot(qApproved, (s) => setStats(prev => ({ ...prev, approved: s.size })));
    const unsubRejected = onSnapshot(qRejected, (s) => setStats(prev => ({ ...prev, rejected: s.size })));
    
    const unsubActivity = onSnapshot(qActivity, (s) => {
      setRecentActivity(s.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });

    return () => {
      unsubPending();
      unsubApproved();
      unsubRejected();
      unsubActivity();
    };
  }, [userProfile, isAuthReady]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!userProfile?.organizationId) {
    return (
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">District Overview</h1>
            <p className="text-slate-500">Account Pending Configuration</p>
          </div>
        </div>
        
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-12 text-center">
            <AlertTriangle className="h-12 w-12 text-amber-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-amber-900 mb-2">Organization Not Linked</h2>
            <p className="text-amber-800 max-w-md mx-auto">
              Your account is not yet linked to a specific TESDA District Office. 
              Please contact the Central Admin to assign your account to an organization.
            </p>
            <Button 
              className="mt-6 bg-amber-600 hover:bg-amber-700"
              onClick={() => window.location.href = 'mailto:admin@tesda.gov.ph'}
            >
              Contact Central Admin
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">District Overview</h1>
          <p className="text-slate-500">{userProfile?.office || 'TESDA District Office'}</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="gap-2">
            <Calendar className="h-4 w-4" />
            Last 30 Days
          </Button>
          <Button variant="outline" className="gap-2">
            <Filter className="h-4 w-4" />
            Filter
          </Button>
        </div>
      </div>

      {/* Connection Status Diagnostic */}
      <Card className="border-slate-200 bg-slate-50/50">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-medium">Role:</span>
              <Badge variant="outline" className="bg-white">{userProfile?.role}</Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-medium">Organization:</span>
              <span className="font-bold text-slate-700">{userProfile?.office || 'Not Linked'}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-medium">Status:</span>
              {userProfile?.organizationId ? (
                <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none">Active</Badge>
              ) : (
                <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-100 border-none">Unlinked</Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid md:grid-cols-4 gap-6">
        {[
          { label: 'Pending Requests', value: stats.pending, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100', link: '/districtoffice/queue' },
          { label: 'Approved Badges', value: stats.approved, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100', link: '/districtoffice/approved' },
          { label: 'Rejected Requests', value: stats.rejected, icon: XCircle, color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100', link: '/districtoffice/rejected' },
          { label: 'Expiring Soon', value: stats.expiring, icon: AlertTriangle, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100', link: '/districtoffice/renewal' },
        ].map((stat) => (
          <Link key={stat.label} to={stat.link}>
            <Card className={`border ${stat.border} hover:shadow-md transition-all cursor-pointer`}>
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className={`p-2 rounded-lg ${stat.bg} ${stat.color}`}>
                    <stat.icon className="h-5 w-5" />
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-300" />
                </div>
                <p className="text-3xl font-bold text-slate-900">{stat.value}</p>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mt-1">{stat.label}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main Workflow Entry */}
        <Card className="lg:col-span-2 border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-600" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-4">
            <Link to="/districtoffice/queue">
              <div className="p-4 rounded-xl border border-slate-200 hover:border-blue-200 hover:bg-blue-50/30 transition-all group">
                <div className="bg-blue-100 text-blue-600 p-2 rounded-lg w-fit mb-3 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <CheckCircle className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-slate-900">Review Queue</h3>
                <p className="text-xs text-slate-500 mt-1">Review {stats.pending} pending badge issuance requests.</p>
              </div>
            </Link>
            <Link to="/districtoffice/centers">
              <div className="p-4 rounded-xl border border-slate-200 hover:border-purple-200 hover:bg-purple-50/30 transition-all group">
                <div className="bg-purple-100 text-purple-600 p-2 rounded-lg w-fit mb-3 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                  <Building2 className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-slate-900">Monitor Centers</h3>
                <p className="text-xs text-slate-500 mt-1">Track performance of Training & Assessment centers.</p>
              </div>
            </Link>
          </CardContent>
        </Card>

        {/* Recent Activity Feed */}
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg">Recent Activity</CardTitle>
            <CardDescription>Latest actions in your district</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {recentActivity.length > 0 ? (
                recentActivity.map((log, i) => (
                  <div key={log.id} className="flex gap-3">
                    <div className="mt-1">
                      <div className="h-2 w-2 rounded-full bg-blue-500" />
                      {i !== recentActivity.length - 1 && <div className="w-px h-full bg-slate-100 mx-auto my-1" />}
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-slate-900 leading-tight">{log.action}</p>
                      <p className="text-[10px] text-slate-500 flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {log.userName} • {new Date(log.timestamp?.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-slate-400">
                  <Activity className="h-8 w-8 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">No recent activity</p>
                </div>
              )}
            </div>
            <Button variant="ghost" className="w-full mt-6 text-xs text-blue-600 hover:text-blue-700" render={<Link to="/districtoffice/logs" />} nativeButton={false}>
              View All Logs
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
