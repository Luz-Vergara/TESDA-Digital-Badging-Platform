import React, { useEffect, useState } from 'react';
import { 
  Award, 
  Users, 
  CheckCircle, 
  Clock, 
  Plus,
  Search,
  Filter,
  ArrowRight,
  UserPlus,
  XCircle,
  Activity,
  Building2,
  Info,
  FileText,
  History as HistoryIcon
} from 'lucide-react';
import { collection, query, where, onSnapshot, limit, orderBy, doc, getDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/src/lib/firebase';
import { useFirebase } from '@/src/lib/FirebaseProvider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

export default function TrainingDashboard() {
  const { user, userProfile, isAuthReady } = useFirebase();
  const [issuedBadges, setIssuedBadges] = useState<any[]>([]);
  const [learners, setLearners] = useState<any[]>([]);
  const [districtOffice, setDistrictOffice] = useState<any>(null);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthReady || !user) return;

    const badgesPath = 'issuedBadges';
    const badgesQuery = query(
      collection(db, badgesPath),
      where('issuerId', '==', user.uid)
    );

    const unsubscribeBadges = onSnapshot(badgesQuery, (snapshot) => {
      const badges = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setIssuedBadges(badges);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, badgesPath);
    });

    const learnersPath = 'learners';
    const learnersQuery = query(
      collection(db, learnersPath),
      where('trainingCenterId', '==', user.uid)
    );

    const unsubscribeLearners = onSnapshot(learnersQuery, (snapshot) => {
      const learnerData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setLearners(learnerData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, learnersPath);
    });

    // Fetch District Office Info
    if (userProfile?.assignedDistrictId) {
      getDoc(doc(db, 'organizations', userProfile.assignedDistrictId)).then(docSnap => {
        if (docSnap.exists()) {
          setDistrictOffice(docSnap.data());
        }
      });
    }

    // Recent Activity
    const activityQuery = query(
      collection(db, 'auditLogs'),
      where('userId', '==', user.uid),
      orderBy('timestamp', 'desc'),
      limit(5)
    );
    const unsubscribeActivity = onSnapshot(activityQuery, (snapshot) => {
      setRecentActivity(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubscribeBadges();
      unsubscribeLearners();
      unsubscribeActivity();
    };
  }, [user, isAuthReady, userProfile]);

  const stats = [
    { label: 'Total Learners', value: learners.length, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Active Trainees', value: learners.filter(l => l.status === 'Enrolled').length, icon: Activity, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Submitted Requests', value: issuedBadges.length, icon: Award, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Approved Badges', value: issuedBadges.filter(b => b.status === 'Approved').length, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Rejected Requests', value: issuedBadges.filter(b => b.status === 'Rejected').length, icon: XCircle, color: 'text-rose-600', bg: 'bg-rose-50' },
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Training Center Dashboard</h1>
          <p className="text-slate-500">{userProfile?.office || 'Authorized Training Provider'}</p>
        </div>
        <div className="flex gap-3">
          <Link to="/trainingcenter/learners">
            <Button variant="outline" className="gap-2">
              <UserPlus className="h-4 w-4" />
              Add New Learner
            </Button>
          </Link>
          <Link to="/trainingcenter/requests">
            <Button className="bg-blue-600 hover:bg-blue-700 gap-2">
              <Plus className="h-4 w-4" />
              Submit Badge Request
            </Button>
          </Link>
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
              <span className="text-slate-500 font-medium">District Link:</span>
              {userProfile?.assignedDistrictId ? (
                <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none">Connected</Badge>
              ) : (
                <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-100 border-none">Missing Link</Badge>
              )}
            </div>
            {!userProfile?.assignedDistrictId && (
              <p className="text-xs text-rose-600 font-medium animate-pulse">
                ⚠️ Central Admin must link your Training Center to a District Office.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-slate-200">
            <CardContent className="p-4">
              <div className={`p-2 rounded-lg ${stat.bg} ${stat.color} w-fit mb-3`}>
                <stat.icon className="h-4 w-4" />
              </div>
              <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-1">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Recent Submissions */}
          <Card className="border-slate-200">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Recent Submissions</CardTitle>
                <CardDescription>Track the status of your latest badge requests</CardDescription>
              </div>
              <Button variant="ghost" size="sm" className="text-blue-600" render={<Link to="/trainingcenter/submissions" />} nativeButton={false}>
                View All
              </Button>
            </CardHeader>
            <CardContent>
              {issuedBadges.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Learner</TableHead>
                      <TableHead>Badge</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {issuedBadges.slice(0, 5).map((badge) => (
                      <TableRow key={badge.id}>
                        <TableCell className="font-medium">{badge.learnerName}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-slate-700">{badge.badgeName}</span>
                            <span className="text-[10px] text-slate-500 uppercase">{badge.badgeType}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={
                            badge.status === 'Approved' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' :
                            badge.status === 'Pending' || badge.status === 'Pending Approval' ? 'bg-amber-100 text-amber-700 hover:bg-amber-100' :
                            'bg-rose-100 text-rose-700 hover:bg-rose-100'
                          }>
                            {badge.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" className="h-8 text-blue-600">
                            Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="p-12 text-center text-slate-500">
                  No submissions yet.
                </div>
              )}
            </CardContent>
          </Card>

          {/* District Office Info */}
          <Card className="border-blue-100 bg-blue-50/30">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
                  <Building2 className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-slate-900">Assigned District Office</h3>
                  <p className="text-sm text-slate-600 mt-1">
                    All badge requests from this center are reviewed and approved by:
                  </p>
                  <div className="mt-4 p-3 bg-white rounded-lg border border-blue-100 flex justify-between items-center">
                    <div>
                      <p className="font-bold text-blue-900">{districtOffice?.name || 'TESDA District Office'}</p>
                      <p className="text-xs text-slate-500">{districtOffice?.location || 'Regional Oversight'}</p>
                    </div>
                    <Info className="h-5 w-5 text-blue-400" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-8">
          {/* Recent Activity */}
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="text-lg">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {recentActivity.length > 0 ? (
                  recentActivity.map((log) => (
                    <div key={log.id} className="flex gap-3">
                      <div className="mt-1">
                        <div className="h-2 w-2 rounded-full bg-blue-500" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-slate-900 leading-tight">{log.action}</p>
                        <p className="text-[10px] text-slate-500">
                          {new Date(log.timestamp?.seconds * 1000).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-slate-400">
                    <p className="text-sm">No recent activity</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick Links */}
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="text-lg">Quick Links</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              <Button variant="outline" className="justify-start gap-2" render={<Link to="/trainingcenter/learners" />} nativeButton={false}>
                <Users className="h-4 w-4" />
                Learner Directory
              </Button>
              <Button variant="outline" className="justify-start gap-2" render={<Link to="/trainingcenter/records" />} nativeButton={false}>
                <FileText className="h-4 w-4" />
                Training Progress
              </Button>
              <Button variant="outline" className="justify-start gap-2" render={<Link to="/trainingcenter/submissions" />} nativeButton={false}>
                <HistoryIcon className="h-4 w-4" />
                Submission History
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
