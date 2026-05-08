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
  Users,
  ClipboardCheck,
  TrendingUp,
  History,
  Bell,
  ExternalLink,
  Plus
} from 'lucide-react';
import { collection, query, where, onSnapshot, limit, orderBy, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/src/lib/firebase';
import { useFirebase } from '@/src/lib/FirebaseProvider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link, useNavigate } from 'react-router-dom';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function DistrictOfficeDashboard() {
  const { userProfile, isAuthReady } = useFirebase();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    pending: 0,
    trainingCenters: 0,
    assessmentCenters: 0,
    approved: 0,
    rejected: 0,
    expiring: 0
  });
  const [recentRequests, setRecentRequests] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthReady || !userProfile?.organizationId) return;

    const fetchDistrictData = async () => {
      const districtId = userProfile.organizationId;
      let districtName = "";

      // Get district name for fallback queries
      try {
        const ddoc = await getDoc(doc(db, 'organizations', districtId));
        if (ddoc.exists()) {
          districtName = ddoc.data().name;
        }
      } catch (err) {
        console.error("Error fetching district name:", err);
      }

      const districtIdentifiers = [districtId];
      if (districtName && districtName !== districtId) {
        districtIdentifiers.push(districtName);
      }

      // Requests stats
      const qRequests = query(
        collection(db, 'issuedBadges'),
        where('districtOfficeId', 'in', districtIdentifiers)
      );

      // Monitoring stats (Centers)
      const qCenters = query(
        collection(db, 'organizations'),
        where('assignedDistrictId', 'in', districtIdentifiers)
      );

      // Recent requests for table
      const qRecent = query(
        collection(db, 'issuedBadges'),
        where('districtOfficeId', 'in', districtIdentifiers),
        orderBy('submittedAt', 'desc'),
        limit(5)
      );

    const unsubRequests = onSnapshot(qRequests, (snapshot) => {
      const docs = snapshot.docs.map(doc => doc.data());
      setStats(prev => ({
        ...prev,
        pending: docs.filter(d => d.status === 'Pending Approval' || d.status === 'Pending District Approval').length,
        approved: docs.filter(d => d.status === 'Approved' || d.status === 'Published').length,
        rejected: docs.filter(d => d.status === 'Rejected').length,
        expiring: docs.filter(d => d.status === 'Expiring').length // Assuming such status exists or would be calculated
      }));
    });

    const unsubCenters = onSnapshot(qCenters, (snapshot) => {
      const docs = snapshot.docs.map(doc => doc.data());
      setStats(prev => ({
        ...prev,
        trainingCenters: docs.filter(d => d.type === 'TrainingCenter').length,
        assessmentCenters: docs.filter(d => d.type === 'AssessmentCenter').length
      }));
    });

    const unsubRecent = onSnapshot(qRecent, (snapshot) => {
      setRecentRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });

    // Mock notifications for now, but linked to actions
    setNotifications([
      { id: 1, title: 'New badge request submitted', center: 'Manila Training Center', time: '10m ago', type: 'info' },
      { id: 2, title: 'Request approved', learner: 'John Doe', time: '1h ago', type: 'success' },
      { id: 3, title: 'Badge expiring soon', learner: 'Maria Santos', time: '2h ago', type: 'warning' },
    ]);

    return () => {
        unsubRequests();
        unsubCenters();
        unsubRecent();
      };
    };

    fetchDistrictData();
  }, [userProfile, isAuthReady]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const statCards = [
    { label: 'Pending Requests', value: stats.pending, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', link: '/districtoffice/queue' },
    { label: 'Training Centers', value: stats.trainingCenters, icon: Building2, color: 'text-blue-600', bg: 'bg-blue-50', link: '/districtoffice/training-centers' },
    { label: 'Assessment Centers', value: stats.assessmentCenters, icon: ClipboardCheck, color: 'text-indigo-600', bg: 'bg-indigo-50', link: '/districtoffice/assessment-centers' },
    { label: 'Approved Requests', value: stats.approved, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50', link: '/districtoffice/status' },
    { label: 'Rejected Requests', value: stats.rejected, icon: XCircle, color: 'text-rose-600', bg: 'bg-rose-50', link: '/districtoffice/status' },
    { label: 'Expiring Badges', value: stats.expiring, icon: AlertTriangle, color: 'text-orange-600', bg: 'bg-orange-50', link: '/districtoffice/renewal' },
  ];

  return (
    <div className="space-y-8">
      {/* Top Profile Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">District Dashboard</h1>
          <p className="text-slate-500">Monitoring and oversight for {userProfile?.office || 'District Office'}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="px-4 py-2 bg-white rounded-lg border border-slate-200 shadow-sm flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400 leading-none mb-1">System Status</p>
              <p className="text-xs font-bold text-slate-700 leading-none">Active • District Office</p>
            </div>
          </div>
          <Button variant="outline" className="gap-2">
            <Calendar className="h-4 w-4" />
            Last 30 Days
          </Button>
        </div>
      </div>

      {/* Info Panel */}
      <Card className="border-none shadow-sm bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
        <CardContent className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                <Building2 className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-blue-100 text-xs font-medium uppercase tracking-wider">Assigned District</p>
                <h2 className="text-xl font-bold">{userProfile?.office}</h2>
              </div>
            </div>
            <div className="flex gap-8">
              <div className="text-center">
                <p className="text-blue-100 text-xs font-medium uppercase tracking-wider">Total Centers</p>
                <p className="text-2xl font-bold">{stats.trainingCenters + stats.assessmentCenters}</p>
              </div>
              <div className="text-center">
                <p className="text-blue-100 text-xs font-medium uppercase tracking-wider">Regional Division</p>
                <p className="text-2xl font-bold">{userProfile?.location || 'NCR'}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map((stat) => (
          <Link key={stat.label} to={stat.link}>
            <Card className="hover:shadow-md transition-all h-full border-slate-200 group">
              <CardContent className="p-4 flex flex-col justify-between h-full">
                <div className={`p-2 rounded-lg w-fit ${stat.bg} ${stat.color} mb-3 group-hover:scale-110 transition-transform`}>
                  <stat.icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left Column (2/3) */}
        <div className="lg:col-span-2 space-y-8">
          {/* Quick Actions */}
          <section>
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Quick Actions</h3>
            <div className="grid sm:grid-cols-3 gap-4">
              <Button 
                variant="outline" 
                className="h-24 flex-col gap-2 hover:bg-blue-50 hover:border-blue-200 transition-all border-slate-200"
                onClick={() => navigate('/districtoffice/queue')}
              >
                <ClipboardCheck className="h-6 w-6 text-blue-600" />
                <span>Approval Queue</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-24 flex-col gap-2 hover:bg-indigo-50 hover:border-indigo-200 transition-all border-slate-200"
                onClick={() => navigate('/districtoffice/status')}
              >
                <TrendingUp className="h-6 w-6 text-indigo-600" />
                <span>Request Status</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-24 flex-col gap-2 hover:bg-emerald-50 hover:border-emerald-200 transition-all border-slate-200"
                onClick={() => navigate('/districtoffice/training-centers')}
              >
                <Users className="h-6 w-6 text-emerald-600" />
                <span>Training Centers</span>
              </Button>
            </div>
          </section>

          {/* Recent Requests Table */}
          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 bg-slate-50/50">
              <div>
                <CardTitle className="text-lg">Recent Badge Requests</CardTitle>
                <CardDescription>Latest submissions awaiting your review or recently processed.</CardDescription>
              </div>
              <Link to="/districtoffice/status">
                <Button variant="ghost" size="sm" className="text-blue-600 font-bold">
                  View All
                  <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/50">
                    <TableHead className="font-bold text-slate-700">Learner</TableHead>
                    <TableHead className="font-bold text-slate-700">Badge Type</TableHead>
                    <TableHead className="font-bold text-slate-700 text-center">Center</TableHead>
                    <TableHead className="font-bold text-slate-700 text-center">Date Submitted</TableHead>
                    <TableHead className="font-bold text-slate-700">Status</TableHead>
                    <TableHead className="text-right font-bold text-slate-700">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentRequests.length > 0 ? recentRequests.map(req => (
                    <TableRow key={req.id} className="hover:bg-slate-50 transition-colors">
                      <TableCell>
                        <p className="font-bold text-slate-900">{req.learnerName}</p>
                        <p className="text-[10px] font-mono text-slate-400">{req.id.substring(0, 8)}</p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-medium">{req.badgeType}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center">
                          <p className="text-sm font-medium">{req.issuerName || req.trainingCenterName || req.assessmentCenterName}</p>
                          <Badge variant="secondary" className="text-[8px] h-4 mt-1">{req.issuerType || req.sourceType || 'Center'}</Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-center text-xs text-slate-500">
                        {req.submittedAt?.toDate ? req.submittedAt.toDate().toLocaleDateString() : 'N/A'}
                      </TableCell>
                      <TableCell>
                        <Badge className={
                          req.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' : 
                          req.status === 'Pending Approval' ? 'bg-amber-100 text-amber-700' :
                          'bg-slate-100 text-slate-700'
                        } variant="outline">
                          {req.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => navigate('/districtoffice/queue')}>
                          Review
                        </Button>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-slate-500 italic">No recent requests.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Right Column (1/3) */}
        <div className="space-y-8">
          {/* Notifications Panel */}
          <Card className="border-slate-200 shadow-sm h-fit">
            <CardHeader className="border-b border-slate-100 pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Bell className="h-5 w-5 text-blue-600" />
                Notifications
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100">
                {notifications.map(note => (
                  <div key={note.id} className="p-4 hover:bg-slate-50 transition-colors cursor-default">
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="text-sm font-bold text-slate-900">{note.title}</h4>
                      <span className="text-[10px] text-slate-400">{note.time}</span>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      {note.center || note.learner} action recorded.
                    </p>
                  </div>
                ))}
              </div>
              <Button variant="ghost" className="w-full text-xs text-blue-600 font-bold py-3 hover:bg-blue-50" onClick={() => navigate('/districtoffice/notifications')}>
                View All Notifications
              </Button>
            </CardContent>
          </Card>

          {/* Center Summary Breakdown */}
          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Activity className="h-4 w-4 text-emerald-600" />
                Center Distribution
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg border border-blue-100 bg-blue-50/30">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Users className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">Training Centers</p>
                    <p className="text-[10px] text-slate-500">Active and Registered</p>
                  </div>
                </div>
                <p className="text-xl font-bold text-blue-700">{stats.trainingCenters}</p>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border border-indigo-100 bg-indigo-50/30">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-100 rounded-lg">
                    <ClipboardCheck className="h-4 w-4 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">Assessment Centers</p>
                    <p className="text-[10px] text-slate-500">Accredited Centers</p>
                  </div>
                </div>
                <p className="text-xl font-bold text-indigo-700">{stats.assessmentCenters}</p>
              </div>
              <Button 
                variant="secondary" 
                className="w-full text-xs font-bold gap-2"
                onClick={() => navigate('/districtoffice/training-centers')}
              >
                Expand Monitor <ExternalLink className="h-3 w-3" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
