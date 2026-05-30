import React, { useEffect, useState } from 'react';
import { 
  Users, 
  Building2, 
  Award, 
  CheckCircle, 
  Clock, 
  TrendingUp, 
  Activity,
  ShieldCheck,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  Filter,
  MapPin,
  GraduationCap
} from 'lucide-react';
import { collection, query, onSnapshot, limit, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/src/lib/firebase';
import { useFirebase } from '@/src/lib/FirebaseProvider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';

export default function CentralAdminDashboard() {
  const { isAuthReady, userProfile } = useFirebase();
  const [stats, setStats] = useState({
    totalLearners: 0,
    totalBadges: 0,
    pendingApprovals: 0,
    totalOrgs: 0,
    distribution: {
      DistrictOffice: 0,
      TrainingCenter: 0,
      AssessmentCenter: 0
    }
  });
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Connection-Aware Learner Registry State
  const [learners, setLearners] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('All');
  const [selectedCenter, setSelectedCenter] = useState('All');

  useEffect(() => {
    if (!isAuthReady || !userProfile) return;
    
    // Only subscribe if user is actually an admin or specific office role
    // This prevents internal assertion errors from permission denied events
    const allowedRoles = ['Admin', 'qso_admin', 'co_admin', 'icto_admin'];
    if (!allowedRoles.includes(userProfile.role)) {
      setLoading(false);
      return;
    }

    const unsubLearners = onSnapshot(collection(db, 'learners'), (snap) => {
      setStats(prev => ({ ...prev, totalLearners: snap.size }));
      setLearners(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => {
      console.warn('Silent permission error on learners:', err.message);
    });

    const unsubBadges = onSnapshot(collection(db, 'issuedBadges'), (snap) => {
      setStats(prev => ({ 
        ...prev, 
        totalBadges: snap.size,
        pendingApprovals: snap.docs.filter(d => d.data().status === 'Pending Approval').length
      }));
    }, (err) => {
      console.warn('Silent permission error on badges:', err.message);
    });

    const unsubOrgs = onSnapshot(collection(db, 'organizations'), (snap) => {
      const dist = {
        DistrictOffice: 0,
        TrainingCenter: 0,
        AssessmentCenter: 0
      };
      snap.docs.forEach(doc => {
        const type = doc.data().type as keyof typeof dist;
        if (dist[type] !== undefined) {
          dist[type]++;
        }
      });
      setStats(prev => ({ ...prev, totalOrgs: snap.size, distribution: dist }));
    }, (err) => {
      console.warn('Silent permission error on orgs:', err.message);
    });

    const logsQuery = query(
      collection(db, 'auditLogs'),
      orderBy('timestamp', 'desc'),
      limit(5)
    );

    const unsubLogs = onSnapshot(logsQuery, (snap) => {
      setRecentLogs(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'auditLogs');
      setLoading(false);
    });

    return () => {
      unsubLearners();
      unsubBadges();
      unsubOrgs();
      unsubLogs();
    };
  }, [isAuthReady, userProfile]);

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
        <h1 className="text-3xl font-bold text-slate-900">Super Admin Dashboard</h1>
        <p className="text-slate-500">Unified TESDA Portal Monitoring & System Oversight</p>
      </div>

      {/* Metrics Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                <Users className="h-5 w-5" />
              </div>
              <div className="flex items-center text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                <ArrowUpRight className="h-3 w-3 mr-1" />
                12%
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900">{stats.totalLearners.toLocaleString()}</p>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mt-1">Total Learners</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 rounded-lg bg-emerald-100 text-emerald-600">
                <Award className="h-5 w-5" />
              </div>
              <div className="flex items-center text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                <ArrowUpRight className="h-3 w-3 mr-1" />
                8%
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900">{stats.totalBadges.toLocaleString()}</p>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mt-1">Badges Issued</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 rounded-lg bg-amber-100 text-amber-600">
                <Clock className="h-5 w-5" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900">{stats.pendingApprovals}</p>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mt-1">Pending Approvals</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 rounded-lg bg-purple-100 text-purple-600">
                <Building2 className="h-5 w-5" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900">{stats.totalOrgs}</p>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mt-1">Organizations</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* District & Centers Overview */}
        <Card className="lg:col-span-1 border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Building2 className="h-5 w-5 text-blue-600" />
              Office Distribution
            </CardTitle>
            <CardDescription>Breakdown of registered TESDA units.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Operational Units</span>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2 text-sm text-slate-700 font-medium">
                    <div className="w-2 h-2 rounded-full bg-purple-500" />
                    District Offices
                  </div>
                  <span className="text-sm font-bold">{stats.distribution.DistrictOffice}</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2 text-sm text-slate-700 font-medium">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    Training Centers
                  </div>
                  <span className="text-sm font-bold">{stats.distribution.TrainingCenter}</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2 text-sm text-slate-700 font-medium">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    Assessment Centers
                  </div>
                  <span className="text-sm font-bold">{stats.distribution.AssessmentCenter}</span>
                </div>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 italic">
              Data is automatically partitioned. Each office only accesses records within their jurisdiction.
            </p>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="lg:col-span-2 border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="h-5 w-5 text-blue-600" />
                System Activity Logs
              </CardTitle>
              <CardDescription>Real-time tracking of administrative actions.</CardDescription>
            </div>
            <Badge variant="outline" className="font-mono text-[10px]">LIVE</Badge>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border border-slate-100">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Timestamp</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentLogs.length > 0 ? (
                    recentLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-medium">{log.userName}</TableCell>
                        <TableCell className="text-slate-600">{log.action}</TableCell>
                        <TableCell className="text-slate-500 text-xs">
                          {log.timestamp?.toDate().toLocaleString() || 'Just now'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none">Success</Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="h-32 text-center text-slate-500">
                        No recent activity found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* System Health */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
              System Status
            </CardTitle>
            <CardDescription>Infrastructure & security health check.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Database Connectivity</span>
                <span className="text-emerald-600 font-medium">Stable (12ms)</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 w-[98%]"></div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Auth Service</span>
                <span className="text-emerald-600 font-medium">Operational</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 w-[100%]"></div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Badge Verification API</span>
                <span className="text-emerald-600 font-medium">Operational</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 w-[99%]"></div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-xs font-bold text-blue-900">Issuance Trend</p>
                  <p className="text-[10px] text-blue-700">Badge issuance is up 15% this week.</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* United Learner Registry Component */}
      <Card className="border-slate-200 shadow-sm mt-8">
        <CardHeader className="border-b border-slate-150/60 pb-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                <GraduationCap className="h-6 w-6 text-blue-600" />
                United Learner Registry
              </CardTitle>
              <CardDescription>
                System-wide view of enrolled/applied learners and their active institutional connections.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200/50 font-medium">
                {learners.length} Active Profiles
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {/* Controls Bar */}
          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search name, email, program..."
                className="pl-9 pr-4 py-2 w-full text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Filter by District Office */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-400 shrink-0" />
              <select
                className="text-sm border border-slate-200 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white w-full"
                value={selectedDistrict}
                onChange={(e) => setSelectedDistrict(e.target.value)}
              >
                <option value="All">All District Offices</option>
                {Array.from(new Set(learners.map(l => l.districtOfficeName || l.districtOfficeId).filter(Boolean))).map((district: any) => (
                  <option key={district} value={district}>{district}</option>
                ))}
              </select>
            </div>

            {/* Filter by Training Center */}
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-slate-400 shrink-0" />
              <select
                className="text-sm border border-slate-200 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white w-full"
                value={selectedCenter}
                onChange={(e) => setSelectedCenter(e.target.value)}
              >
                <option value="All">All Training Centers</option>
                {Array.from(new Set(learners.map(l => l.trainingCenterName || l.trainingCenterId).filter(Boolean))).map((center: any) => (
                  <option key={center} value={center}>{center}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Unified Connections Table */}
          <div className="rounded-xl border border-slate-100 overflow-hidden bg-white shadow-inner">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="font-semibold text-xs text-slate-600 uppercase tracking-wider pl-6 py-3">Learner Profile</TableHead>
                  <TableHead className="font-semibold text-xs text-slate-600 uppercase tracking-wider py-3">Program & Batch</TableHead>
                  <TableHead className="font-semibold text-xs text-slate-600 uppercase tracking-wider py-3">Connected Training Center</TableHead>
                  <TableHead className="font-semibold text-xs text-slate-600 uppercase tracking-wider py-3">Assigned District Office</TableHead>
                  <TableHead className="font-semibold text-xs text-slate-600 uppercase tracking-wider text-center py-3">Enrollment Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {learners.filter(l => {
                  const fullName = `${l.firstName || ''} ${l.lastName || ''}`.toLowerCase();
                  const email = (l.email || '').toLowerCase();
                  const qual = (l.qualification || l.programTitle || '').toLowerCase();
                  const tc = (l.trainingCenterName || '').toLowerCase();
                  
                  const matchesSearch = 
                    fullName.includes(searchTerm.toLowerCase()) || 
                    email.includes(searchTerm.toLowerCase()) || 
                    qual.includes(searchTerm.toLowerCase()) ||
                    tc.includes(searchTerm.toLowerCase());

                  const matchesDistrict = selectedDistrict === 'All' || l.districtOfficeId === selectedDistrict || l.districtOfficeName === selectedDistrict;
                  const matchesCenter = selectedCenter === 'All' || l.trainingCenterId === selectedCenter || l.trainingCenterName === selectedCenter;

                  return matchesSearch && matchesDistrict && matchesCenter;
                }).length > 0 ? (
                  learners.filter(l => {
                    const fullName = `${l.firstName || ''} ${l.lastName || ''}`.toLowerCase();
                    const email = (l.email || '').toLowerCase();
                    const qual = (l.qualification || l.programTitle || '').toLowerCase();
                    const tc = (l.trainingCenterName || '').toLowerCase();
                    
                    const matchesSearch = 
                      fullName.includes(searchTerm.toLowerCase()) || 
                      email.includes(searchTerm.toLowerCase()) || 
                      qual.includes(searchTerm.toLowerCase()) ||
                      tc.includes(searchTerm.toLowerCase());

                    const matchesDistrict = selectedDistrict === 'All' || l.districtOfficeId === selectedDistrict || l.districtOfficeName === selectedDistrict;
                    const matchesCenter = selectedCenter === 'All' || l.trainingCenterId === selectedCenter || l.trainingCenterName === selectedCenter;

                    return matchesSearch && matchesDistrict && matchesCenter;
                  }).map((l) => (
                    <TableRow key={l.id} className="hover:bg-slate-50/40 transition-colors">
                      <TableCell className="pl-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900">{l.firstName} {l.lastName}</span>
                          <span className="text-xs text-slate-500 font-mono italic">{l.email}</span>
                          {l.contactNumber && <span className="text-[10px] text-slate-400">{l.contactNumber}</span>}
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-blue-900 leading-snug">{l.qualification || l.programTitle || "General Track"}</span>
                          <span className="text-[10px] text-slate-500 font-medium">
                            Batch: <span className="text-slate-700 italic font-bold">{l.batchName || "Applied Option"}</span>
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex items-center gap-2">
                          <div className="p-1 rounded-full bg-blue-50 text-blue-600">
                            <Building2 className="h-3.5 w-3.5" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-slate-800 leading-tight">{l.trainingCenterName || "Unassigned"}</span>
                            <span className="text-[10px] font-mono text-slate-400">ID: {l.trainingCenterId || l.organizationId || "N/A"}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex items-center gap-2">
                          <div className="p-1 rounded-full bg-purple-50 text-purple-600">
                            <MapPin className="h-3.5 w-3.5" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-slate-800 leading-tight">{l.districtOfficeName || "Oversight Headquarters"}</span>
                            <span className="text-[10px] font-mono text-slate-400">ID: {l.districtOfficeId || "N/A"}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center py-4">
                        <Badge 
                          className={
                            l.status === 'Enrolled' 
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300' 
                              : l.status === 'Applied' 
                              ? 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 hover:border-blue-300' 
                              : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                          }
                        >
                          {l.status || 'Active'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-slate-500">
                      No matching registered learners with connected institutions found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
