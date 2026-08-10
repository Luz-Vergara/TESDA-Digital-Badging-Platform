import React, { useEffect, useState } from 'react';
import {
  Award,
  Users,
  CheckCircle,
  Clock,
  Plus,
  ArrowRight,
  Activity,
  Building2,
  Info,
  Layers,
  FileText,
  Globe,
  Database,
  ArrowRightLeft,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  BadgeCheck
} from 'lucide-react';
import { collection, query, where, onSnapshot, limit, orderBy, doc, getDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/src/lib/firebase';
import { useFirebase } from '@/src/lib/FirebaseProvider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import ExternalTrainingDashboard from '@/src/components/training/ExternalTrainingDashboard';
import { isExternalApiDemoEnabled } from '@/src/config/environment';

export default function TrainingDashboard() {
  const { user, userProfile, isAuthReady } = useFirebase();
  const [issuedBadges, setIssuedBadges] = useState<any[]>([]);
  const [badgeRequests, setBadgeRequests] = useState<any[]>([]);
  const [learners, setLearners] = useState<any[]>([]);
  const [districtOffice, setDistrictOffice] = useState<any>(null);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [externalLink, setExternalLink] = useState<any | null>(null);

  useEffect(() => {
    if (!isAuthReady || !user) return;

    const tcId = userProfile?.organizationId || user.uid;

    // 1. Issued Badges
    const badgesQuery = query(
      collection(db, 'issuedBadges'),
      where('trainingCenterId', '==', tcId)
    );
    const unsubscribeBadges = onSnapshot(badgesQuery, (snapshot) => {
      setIssuedBadges(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'issuedBadges');
    });

    // 2. Badge Requests
    const reqQuery = query(
      collection(db, 'badgeRequests'),
      where('trainingCenterId', '==', tcId)
    );
    const unsubscribeRequests = onSnapshot(reqQuery, (snapshot) => {
      setBadgeRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'badgeRequests');
    });

    // 3. Learners from External MIS (represented via demo dataset)
    const learnersQuery = query(
      collection(db, 'learners'),
      where('trainingCenterId', '==', tcId)
    );
    const unsubscribeLearners = onSnapshot(learnersQuery, (snapshot) => {
      setLearners(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'learners');
      setLoading(false);
    });

    // 4. District Office Details
    if (userProfile?.assignedDistrictId) {
      getDoc(doc(db, 'organizations', userProfile.assignedDistrictId))
        .then(docSnap => {
          if (docSnap.exists()) {
            setDistrictOffice(docSnap.data());
          }
        })
        .catch(error => {
          handleFirestoreError(error, OperationType.GET, `organizations/${userProfile.assignedDistrictId}`);
        });
    }

    if (isExternalApiDemoEnabled) {
      getDoc(doc(db, 'integrationTrainingCenterLinks', tcId))
        .then((link) => setExternalLink(link.exists() ? link.data() : null))
        .catch((error) => handleFirestoreError(error, OperationType.GET, `integrationTrainingCenterLinks/${tcId}`));
    } else {
      setExternalLink(null);
    }

    // 5. Audit Logs
    const activityQuery = query(
      collection(db, 'auditLogs'),
      where('userId', '==', user.uid)
    );
    const unsubscribeActivity = onSnapshot(activityQuery, (snapshot) => {
      const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a: any, b: any) => ((b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0)))
        .slice(0, 5);
      setRecentActivity(logs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'auditLogs');
    });

    return () => {
      unsubscribeBadges();
      unsubscribeRequests();
      unsubscribeLearners();
      unsubscribeActivity();
    };
  }, [user, isAuthReady, userProfile]);

  const activeEnrollments = learners.filter(l => l.status === 'Enrolled' || l.status === 'In Progress').length;
  const completedLearners = learners.filter(l => l.status === 'Completed' || l.status === 'Graduate').length;
  const eligibleLearners = learners.length; // All completed/enrolled learners evaluated in External MIS
  const pendingRequests = badgeRequests.filter(r => r.status === 'Pending' || r.status === 'Submitted').length;
  const approvedRequests = badgeRequests.filter(r => r.status === 'Approved').length;
  const issuedBadgesCount = issuedBadges.length;

  const stats = [
    { label: 'Total Learners (External MIS)', value: learners.length, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Active Enrollments', value: activeEnrollments, icon: Activity, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Completed Trainees', value: completedLearners, icon: CheckCircle2, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Badge-Eligible', value: eligibleLearners, icon: CheckCircle, color: 'text-emerald-700', bg: 'bg-emerald-100' },
    { label: 'Pending Requests', value: pendingRequests, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Approved Requests', value: approvedRequests, icon: Award, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Issued Badges', value: issuedBadgesCount, icon: BadgeCheck, color: 'text-blue-700', bg: 'bg-blue-100' },
  ];

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold text-slate-900">Training Center Dashboard</h1>
            <Badge className="bg-slate-100 text-slate-700 font-mono text-[10px] border-slate-200">
              API-Ready Frontend
            </Badge>
          </div>
          <p className="text-slate-500 text-sm mt-0.5">
            {userProfile?.office || 'Authorized Training Provider'} • Digital Badging Processing & MIS Integration
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link to="/trainingcenter/eligibility">
            <Button variant="outline" className="gap-2 border-slate-200">
              <CheckCircle className="h-4 w-4 text-emerald-600" />
              Check Eligibility
            </Button>
          </Link>
          <Link to="/trainingcenter/file-request">
            <Button className="bg-blue-600 hover:bg-blue-700 gap-2">
              <Plus className="h-4 w-4" />
              File Badge Request
            </Button>
          </Link>
        </div>
      </div>

      {/* Integration Diagnostic Banner */}
      <Card className="border-slate-200 bg-slate-50/60">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-4 text-sm">
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-medium text-xs">External System:</span>
                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                  T2MIS API (Connected)
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-medium text-xs">Assigned District Office:</span>
                <span className="font-bold text-slate-800 text-xs">
                  {districtOffice?.name || 'TESDA District Office'}
                </span>
              </div>
            </div>
            <Link to="/trainingcenter/integration" className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1">
              View Integration Status <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </CardContent>
      </Card>

      {isExternalApiDemoEnabled && (
        externalLink?.active !== false && externalLink ? (
          <ExternalTrainingDashboard
            firebaseTrainingCenterId={userProfile?.organizationId || user?.uid || ''}
            firebaseTrainingCenterName={userProfile?.office || userProfile?.name || 'Training Center'}
            firebaseUserId={user?.uid || ''}
            districtOfficeId={userProfile?.assignedDistrictId}
          />
        ) : (
          <Card className="border-amber-200 bg-amber-50/40">
            <CardContent className="p-4 text-sm text-amber-800">
              External records are enabled, but this Training Center does not have an approved platform integration link.
            </CardContent>
          </Card>
        )
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-slate-200">
            <CardContent className="p-3">
              <div className={`p-1.5 rounded-lg ${stat.bg} ${stat.color} w-fit mb-2`}>
                <stat.icon className="h-3.5 w-3.5" />
              </div>
              <p className="text-xl font-bold text-slate-900">{stat.value}</p>
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-tight mt-0.5 leading-tight">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Architecture Separation Notice */}
      <Card className="border-blue-200 bg-blue-50/30">
        <CardContent className="p-5 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="flex gap-3">
            <div className="p-3 bg-blue-100 text-blue-700 rounded-xl shrink-0">
              <ArrowRightLeft className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">System Responsibility Boundary</h3>
              <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                Learner registrations, enrollments, and official competency completion records originate from the <span className="font-bold text-slate-800">External MIS (T2MIS)</span>. This portal handles <span className="font-bold text-blue-700">Digital Badge Eligibility, Request Filing, and District Office Approvals</span>.
              </p>
            </div>
          </div>
          <Link to="/trainingcenter/integration" className="shrink-0">
            <Button variant="outline" size="sm" className="bg-white border-blue-200 text-blue-700 hover:bg-blue-50 text-xs">
              View Architecture
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* Main Content Layout */}
      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Recent Badge Requests / Submissions */}
          <Card className="border-slate-200">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-lg">Recent Badge Requests</CardTitle>
                <CardDescription>Status of recent digital credential submissions routed to District Office</CardDescription>
              </div>
              <Link to="/trainingcenter/requests">
                <Button variant="ghost" size="sm" className="text-blue-600 text-xs font-bold">
                  View All Requests
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {badgeRequests.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead>Request #</TableHead>
                      <TableHead>Learner / Qualification</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {badgeRequests.slice(0, 5).map((req) => (
                      <TableRow key={req.id}>
                        <TableCell className="font-mono text-xs font-bold text-blue-600">
                          #{req.requestNumber || req.id.slice(0, 8)}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-bold text-slate-900 text-xs">{req.learnerName || 'Learner'}</p>
                            <p className="text-[10px] text-slate-500">{req.programName || req.badgeTitle}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={
                            req.status === 'Approved' ? 'bg-emerald-100 text-emerald-800' :
                            req.status === 'Pending' ? 'bg-amber-100 text-amber-800' :
                            req.status === 'Rejected' ? 'bg-rose-100 text-rose-800' :
                            'bg-slate-100 text-slate-800'
                          }>
                            {req.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Link to="/trainingcenter/requests">
                            <Button variant="ghost" size="sm" className="h-7 text-xs text-blue-600">
                              View
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="p-8 text-center text-slate-500 text-xs">
                  No badge requests filed yet. Use <span className="font-bold text-slate-800">Badge Eligibility</span> to file requests for eligible trainees.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Assigned District Office */}
          <Card className="border-slate-200">
            <CardHeader className="py-3 bg-slate-50 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-slate-600" />
                <CardTitle className="text-sm font-bold text-slate-800">Assigned District Office Jurisdiction</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <div className="flex justify-between items-center text-sm">
                <div>
                  <p className="font-bold text-slate-900">{districtOffice?.name || 'TESDA District Office'}</p>
                  <p className="text-xs text-slate-500">{districtOffice?.location || 'Regional Oversight & Endorsements'}</p>
                </div>
                <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                  Assigned Oversight
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Actions & Links */}
        <div className="space-y-6">
          <Card className="border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 text-sm">
              <Link to="/trainingcenter/eligibility">
                <Button variant="outline" className="w-full justify-start gap-2 h-10 text-xs font-semibold">
                  <CheckCircle className="h-4 w-4 text-emerald-600" />
                  Check Badge Eligibility
                </Button>
              </Link>
              <Link to="/trainingcenter/file-request">
                <Button variant="outline" className="w-full justify-start gap-2 h-10 text-xs font-semibold">
                  <Plus className="h-4 w-4 text-blue-600" />
                  File Badge Request
                </Button>
              </Link>
              <Link to="/trainingcenter/learners">
                <Button variant="outline" className="w-full justify-start gap-2 h-10 text-xs font-semibold">
                  <Users className="h-4 w-4 text-indigo-600" />
                  Learners & Training Records
                </Button>
              </Link>
              <Link to="/trainingcenter/programs">
                <Button variant="outline" className="w-full justify-start gap-2 h-10 text-xs font-semibold">
                  <Layers className="h-4 w-4 text-purple-600" />
                  Registered Programs (CTPR)
                </Button>
              </Link>
              <Link to="/trainingcenter/issued">
                <Button variant="outline" className="w-full justify-start gap-2 h-10 text-xs font-semibold">
                  <BadgeCheck className="h-4 w-4 text-blue-600" />
                  Issued Credentials Repository
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Audit Logs */}
          <Card className="border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold">System Activity Log</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 text-xs">
                {recentActivity.length > 0 ? (
                  recentActivity.map((log) => (
                    <div key={log.id} className="flex gap-2.5 items-start">
                      <div className="h-2 w-2 rounded-full bg-blue-500 mt-1 shrink-0" />
                      <div>
                        <p className="font-medium text-slate-800 leading-snug">{log.action}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {log.timestamp?.seconds ? new Date(log.timestamp.seconds * 1000).toLocaleString() : 'Recent'}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-400 text-center py-4">No recent activity logs.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
