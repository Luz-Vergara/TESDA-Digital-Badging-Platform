import React, { useEffect, useState } from 'react';
import { 
  ShieldCheck, 
  Users, 
  FileText, 
  TrendingUp, 
  Plus,
  Search,
  Filter,
  ArrowRight,
  UserPlus,
  History,
  Award,
  LayoutDashboard,
  ClipboardList,
  FileCheck,
  Bell,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  ChevronRight,
  AlertCircle,
  MoreVertical,
  Download,
  Info,
  Loader2
} from 'lucide-react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  serverTimestamp, 
  getDocs,
  getDoc,
  limit,
  orderBy
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/src/lib/firebase';
import { useFirebase } from '@/src/lib/FirebaseProvider';
import { useLocation, useNavigate, Link } from 'react-router-dom';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { AssessmentRecord, BadgeRequest, Learner, Organization, BadgeTemplate, RPLApplication } from '@/src/types';
import { motion, AnimatePresence } from 'motion/react';

type DashboardView = 'overview' | 'search' | 'profiles' | 'assessment-records' | 'rpl-records' | 'submit-request' | 'tracking' | 'notifications';

export default function AssessmentDashboard() {
  const { user, userProfile, isAuthReady } = useFirebase();
  const location = useLocation();
  const navigate = useNavigate();
  const [currentView, setCurrentView] = useState<DashboardView>('overview');
  const [loading, setLoading] = useState(true);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [districtOffice, setDistrictOffice] = useState<Organization | null>(null);
  const [selectedLearner, setSelectedLearner] = useState<Learner | null>(null);
  const [templates, setTemplates] = useState<BadgeTemplate[]>([]);

  // Fetch Badge Templates
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'badgeTemplates'));
    const unsub = onSnapshot(q, (snapshot) => {
      setTemplates(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BadgeTemplate)));
    }, (error) => {
      console.error("Badge Templates Snapshot Error:", error);
      handleFirestoreError(error, OperationType.GET, 'badgeTemplates');
    });
    return unsub;
  }, [user]);

  // Sync view with URL
  useEffect(() => {
    const path = location.pathname.split('/').pop();
    if (path === 'assessmentcenter' || !path || path === '') {
      setCurrentView('overview');
    } else if (['overview', 'search', 'profiles', 'records', 'rpl', 'submit', 'tracking', 'notifications'].includes(path)) {
      // Map URL paths to view IDs
      if (path === 'records') setCurrentView('assessment-records');
      else if (path === 'rpl') setCurrentView('rpl-records');
      else if (path === 'submit') setCurrentView('submit-request');
      else setCurrentView(path as DashboardView);
    }
  }, [location]);
  
  const [stats, setStats] = useState({
    totalAssessed: 0,
    rplApplications: 0,
    pendingRequests: 0,
    approvedRequests: 0,
    rejectedRequests: 0
  });

  const [recentRequests, setRecentRequests] = useState<BadgeRequest[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);

  // Fetch AC Organization and its District Office
  useEffect(() => {
    if (!isAuthReady) return;

    const fetchOrgData = async () => {
      try {
        const orgName = (userProfile?.office || '').trim();
        const orgId = userProfile?.organizationId || '';
        const orgIdentifier = orgName || orgId || 'demo-assessment-center';

        const orgsRef = collection(db, 'organizations');
        let orgDoc: any = null;

        // 1. Try direct fetch by organization ID
        if (orgIdentifier) {
          const directRef = doc(db, 'organizations', orgIdentifier);
          try {
            const docSnap = await getDoc(directRef);
            if (docSnap.exists()) {
              orgDoc = { id: docSnap.id, ...docSnap.data() };
            }
          } catch (e) {
            console.warn("Could not fetch organization by direct document reference:", e);
          }
        }

        // 2. Query fallback if needed
        if (!orgDoc && orgIdentifier) {
          const qName = query(orgsRef, where('name', '==', orgIdentifier));
          const qNameSnap = await getDocs(qName);
          if (!qNameSnap.empty) {
            orgDoc = { id: qNameSnap.docs[0].id, ...qNameSnap.docs[0].data() };
          } else {
            const qId = query(orgsRef, where('id', '==', orgIdentifier));
            const qIdSnap = await getDocs(qId);
            if (!qIdSnap.empty) {
              orgDoc = { id: qIdSnap.docs[0].id, ...qIdSnap.docs[0].data() };
            }
          }
        }

        // 3. Fallback to any assessment center organization if still not found
        if (!orgDoc) {
          const qAC = query(orgsRef, where('type', '==', 'AssessmentCenter'));
          const qACSnap = await getDocs(qAC);
          if (!qACSnap.empty) {
            orgDoc = { id: qACSnap.docs[0].id, ...qACSnap.docs[0].data() };
          }
        }

        if (orgDoc) {
          setOrganization(orgDoc);
          if (orgDoc.assignedDistrictId) {
            // First try by ID
            const districtDocRef = doc(db, 'organizations', orgDoc.assignedDistrictId);
            const districtSnap = await getDoc(districtDocRef);
            if (districtSnap.exists()) {
              setDistrictOffice({ id: districtSnap.id, ...districtSnap.data() } as Organization);
            } else {
              // Fallback: search district by name or ID property
              console.warn("District ID not found as document ID, searching by name property...");
              const districtsRef = collection(db, 'organizations');
              const qd = query(districtsRef, where('name', '==', orgDoc.assignedDistrictId), where('type', '==', 'DistrictOffice'));
              const qdSnap = await getDocs(qd);
              if (!qdSnap.empty) {
                setDistrictOffice({ id: qdSnap.docs[0].id, ...qdSnap.docs[0].data() } as Organization);
              } else {
                console.error("Could not find District Office with identifier:", orgDoc.assignedDistrictId);
              }
            }
          }
        } else {
          console.warn("No organization match found for identifier:", orgIdentifier);
        }
      } catch (error) {
        console.error("Error fetching organization data:", error);
      } finally {
        // Universal fallback to end infinite loading state if subscription isn't guaranteed
        setLoading(false);
      }
    };

    fetchOrgData();
  }, [isAuthReady, userProfile]);

  // Real-time stats and recent activity
  useEffect(() => {
    if (!organization?.id || !user) return;

    const reqPath = 'issuedBadges';
    const qRequests = query(
      collection(db, reqPath),
      where('sourceAssessmentCenterId', '==', organization.id),
      orderBy('submittedAt', 'desc'),
      limit(10)
    );

    const unsubRequests = onSnapshot(qRequests, (snapshot) => {
      const reqs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      setRecentRequests(reqs);
      
      // Update stats based on full counts if possible, for now just simpler
      const pending = reqs.filter(r => r.status === 'Pending Approval').length;
      const approved = reqs.filter(r => r.status === 'Approved').length;
      const rejected = reqs.filter(r => r.status === 'Rejected').length;
      
      setStats(prev => ({
        ...prev,
        pendingRequests: pending,
        approvedRequests: approved,
        rejectedRequests: rejected
      }));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, reqPath);
    });

    const recordPath = 'assessmentRecords';
    const qRecords = query(
      collection(db, recordPath),
      where('organizationId', '==', organization.id)
    );

    const unsubRecords = onSnapshot(qRecords, (snapshot) => {
      const records = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AssessmentRecord));
      setStats(prev => ({
        ...prev,
        totalAssessed: records.length,
        rplApplications: records.filter(r => r.pathway === 'Recognition of Prior Learning (RPL)').length
      }));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, recordPath);
    });

    setLoading(false);
    return () => {
      unsubRequests();
      unsubRecords();
    };
  }, [organization, user]);

  if (loading || !isAuthReady) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentView}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {currentView === 'overview' && <OverviewView stats={stats} recentRequests={recentRequests} organization={organization} />}
          {currentView === 'search' && (
            <LearnerSearchView 
              organization={organization} 
              districtOffice={districtOffice}
              loading={loading}
              templates={templates}
              onSelectLearner={(l) => {
                setSelectedLearner(l);
                navigate('/assessmentcenter/profiles');
              }} 
            />
          )}
          {currentView === 'profiles' && (
            <LearnerProfileView 
              organization={organization} 
              districtOffice={districtOffice} 
              selectedLearner={selectedLearner}
              templates={templates}
            />
          )}
          {currentView === 'assessment-records' && <RecordsView organization={organization} type="assessment" />}
          {currentView === 'rpl-records' && <RPLEndorsedCandidatesAndRecordsView organization={organization} templates={templates} />}
          {currentView === 'submit-request' && (
            <SubmitRequestView 
              organization={organization} 
              districtOffice={districtOffice} 
              initialLearner={selectedLearner}
              templates={templates}
            />
          )}
          {currentView === 'tracking' && <TrackingView organization={organization} />}
          {currentView === 'notifications' && <NotificationsView organization={organization} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// --- SUB VIEWS ---

function OverviewView({ stats, recentRequests, organization }: { stats: any, recentRequests: BadgeRequest[], organization: any }) {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Portal Overview</h1>
        <p className="text-slate-500">Welcome back, {organization?.name}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard icon={Users} label="Total Assessed" value={stats.totalAssessed} color="blue" />
        <StatCard icon={ClipboardList} label="RPL Applications" value={stats.rplApplications} color="purple" />
        <StatCard icon={Clock} label="Pending Requests" value={stats.pendingRequests} color="amber" />
        <StatCard icon={CheckCircle2} label="Approved" value={stats.approvedRequests} color="emerald" />
        <StatCard icon={XCircle} label="Rejected" value={stats.rejectedRequests} color="rose" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Recent Submitted Requests</CardTitle>
                <CardDescription>Latest badge certification submissions to District Office</CardDescription>
              </div>
              <Button variant="outline" size="sm">View All</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentRequests.length > 0 ? (
                recentRequests.map(req => (
                  <div key={req.id} className="flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-lg ${req.status === 'Approved' ? 'bg-emerald-100 text-emerald-600' : req.status === 'Rejected' ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'}`}>
                        <FileCheck className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{req.learnerName}</p>
                        <p className="text-xs text-slate-500">{req.qualification} • {req.badgeType}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge className={
                        req.status === 'Approved' ? 'bg-emerald-500' : 
                        req.status === 'Rejected' ? 'bg-rose-500' : 
                        'bg-amber-500'
                      }>
                        {req.status}
                      </Badge>
                      <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider">
                        {req.submittedAt?.toDate ? req.submittedAt.toDate().toLocaleDateString() : 'Just now'}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-slate-500">
                  No recent requests found.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>System logs and updates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <ActivityItem 
                icon={UserPlus} 
                title="New Learner Registered" 
                desc="John Doe (Direct Assessment)" 
                time="2h ago" 
                color="blue"
              />
              <ActivityItem 
                icon={CheckCircle2} 
                title="Request Approved" 
                desc="Maria Santos - Skilled Badge" 
                time="4h ago" 
                color="emerald"
              />
              <ActivityItem 
                icon={XCircle} 
                title="Request Rejected" 
                desc="Incomplete portfolio evidence" 
                time="1d ago" 
                color="rose"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: any) {
  const colors: any = {
    blue: 'bg-blue-100 text-blue-600',
    purple: 'bg-purple-100 text-purple-600',
    amber: 'bg-amber-100 text-amber-600',
    emerald: 'bg-emerald-100 text-emerald-600',
    rose: 'bg-rose-100 text-rose-600'
  };
  return (
    <Card className="border-slate-200">
      <CardContent className="p-4">
        <div className={`p-2 rounded-lg w-fit mb-3 ${colors[color]}`}>
          <Icon className="h-4 w-4" />
        </div>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">{label}</p>
      </CardContent>
    </Card>
  );
}

function ActivityItem({ icon: Icon, title, desc, time, color }: any) {
  const colors: any = {
    blue: 'bg-blue-100 text-blue-600',
    emerald: 'bg-emerald-100 text-emerald-600',
    rose: 'bg-rose-100 text-rose-600'
  };
  return (
    <div className="flex gap-4">
      <div className={`mt-1 p-2 h-fit rounded-full ${colors[color]}`}>
        <Icon className="h-3 w-3" />
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        <p className="text-xs text-slate-500">{desc}</p>
        <p className="text-[10px] text-slate-400 mt-1 uppercase">{time}</p>
      </div>
    </div>
  );
}

function LearnerSearchView({ 
  organization, 
  districtOffice,
  loading,
  templates,
  onSelectLearner 
}: { 
  organization: any, 
  districtOffice: any,
  loading: boolean,
  templates: BadgeTemplate[],
  onSelectLearner: (l: Learner) => void 
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<Learner[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    contactNumber: '',
    qualification: '',
    learnerId: `L-${Math.floor(100000 + Math.random() * 900000)}`
  });

  const handleSearch = async () => {
    if (!searchQuery.trim() || !districtOffice?.id) return;
    setIsSearching(true);
    try {
      const learnersRef = collection(db, 'learners');
      
      // Determine search identifiers (ID or Name fallback)
      const districtIds = [districtOffice.id];
      if (districtOffice.name && districtOffice.name !== districtOffice.id) {
        districtIds.push(districtOffice.name);
      }

      // Restrict search to learners in the same District Office (using ID or Name)
      const qEmail = query(learnersRef, where('email', '==', searchQuery), where('districtOfficeId', 'in', districtIds));
      const qFirst = query(learnersRef, where('firstName', '==', searchQuery), where('districtOfficeId', 'in', districtIds));
      const qLast = query(learnersRef, where('lastName', '==', searchQuery), where('districtOfficeId', 'in', districtIds));
      
      const [emailSnap, firstSnap, lastSnap] = await Promise.all([
        getDocs(qEmail),
        getDocs(qFirst),
        getDocs(qLast)
      ]);
      
      const combined = [
        ...emailSnap.docs.map(d => ({ id: d.id, ...d.data() } as Learner)),
        ...firstSnap.docs.map(d => ({ id: d.id, ...d.data() } as Learner)),
        ...lastSnap.docs.map(d => ({ id: d.id, ...d.data() } as Learner))
      ];
      
      // De-duplicate
      const unique = Array.from(new Map(combined.map(item => [item.id, item])).values());
      setResults(unique);
      setHasSearched(true);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleCreateLearner = async () => {
    if (!formData.firstName || !formData.lastName || !formData.email) {
      alert("Please fill in the required fields (First Name, Last Name, Email).");
      return;
    }

    if (!organization) {
      alert("Assessment Center profile not loaded. Please wait or refresh.");
      return;
    }

    if (!districtOffice) {
      alert("No linked District Office found. A District Office must be assigned to your center to create learner profiles.");
      return;
    }

    setIsSubmitting(true);
    try {
      // Duplicate check
      const q = query(collection(db, 'learners'), where('email', '==', formData.email));
      const snap = await getDocs(q);
      if (!snap.empty) {
        alert("A learner with this email already exists.");
        setIsSubmitting(false);
        return;
      }

      const newLearner = {
        ...formData,
        status: 'Enrolled',
        trainingCenterId: 'Direct-AC', // Marker for direct assessment
        trainingCenterName: organization.name,
        districtOfficeId: districtOffice.id,
        districtOfficeName: districtOffice.name || '',
        createdAt: serverTimestamp()
      };
      
      await addDoc(collection(db, 'learners'), newLearner);
      await addDoc(collection(db, 'auditLogs'), {
        action: `Created Learner Profile for Direct Assessment: ${formData.email}`,
        userName: 'Assessment Center Staff',
        timestamp: serverTimestamp()
      });
      
      setIsCreateModalOpen(false);
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        contactNumber: '',
        qualification: '',
        learnerId: `L-${Math.floor(100000 + Math.random() * 900000)}`
      });
      handleSearch();
      alert("Learner profile created successfully.");
    } catch (error) {
      console.error("Error creating learner:", error);
      handleFirestoreError(error, OperationType.CREATE, 'learners');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Learner Search & Verification</h2>
          <p className="text-slate-500 text-sm">
            Search candidate history. 
            {districtOffice && (
              <span className="ml-1 inline-flex items-center text-blue-600 font-medium">
                <ShieldCheck className="h-3 w-3 mr-1" />
                Limited to {districtOffice.name}
              </span>
            )}
            {!districtOffice && !loading && (
              <span className="ml-1 text-rose-500 font-bold">
                (District Office Not Linked - Search Disabled)
              </span>
            )}
          </p>
        </div>
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger
            render={
              <Button className="gap-2">
                <Plus className="h-4 w-4" /> Create Learner for Direct Assessment / RPL
              </Button>
            }
          />
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>New Learner Profile (Direct Assessment)</DialogTitle>
              <DialogDescription>Create a record for walk-in candidates or RPL applicants.</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <Label>First Name</Label>
                <Input value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Last Name</Label>
                <Input value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Contact Number</Label>
                <Input value={formData.contactNumber} onChange={e => setFormData({...formData, contactNumber: e.target.value})} />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Target Qualification</Label>
                <Select 
                  value={formData.qualification} 
                  onValueChange={val => setFormData({...formData, qualification: val})}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select from QSO Qualifications" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from(new Set(templates.map(t => t.qualificationName))).filter(Boolean).map(qual => (
                      <SelectItem key={qual} value={qual!}>{qual}</SelectItem>
                    ))}
                    {templates.length === 0 && <SelectItem value="loading" disabled>Loading qualifications...</SelectItem>}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-slate-500 italic mt-1">
                  * Only qualifications registered in the QSO standard library can be selected.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateModalOpen(false)} disabled={isSubmitting}>Cancel</Button>
              <Button onClick={handleCreateLearner} disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create & Activate Account'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
              <Input 
                placeholder="Search by Learner ID, Name, or Email..." 
                className="pl-10 h-11"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <Button onClick={handleSearch} className="h-11 px-8" disabled={isSearching}>
              {isSearching ? <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" /> : 'Search Database'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {hasSearched && results.length === 0 && (
        <Card className="p-12 text-center border-dashed">
          <Info className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-900">No Learners Found</h3>
          <p className="text-slate-500 max-w-sm mx-auto mt-2">
            We couldn't find any learners with that search term in your district ({districtOffice?.name}).
          </p>
          <p className="text-xs text-slate-400 mt-4 italic">
            Note: Only learners correctly tagged with this District Office ID during enrollment can be discovered.
          </p>
        </Card>
      )}

      {results.length > 0 && (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Learner ID</TableHead>
                <TableHead>Full Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Qualification</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.map(learner => (
                <TableRow key={learner.id}>
                  <TableCell className="font-mono text-xs">{learner.id}</TableCell>
                  <TableCell className="font-medium text-slate-900">{learner.firstName} {learner.lastName}</TableCell>
                  <TableCell className="text-slate-500">{learner.email}</TableCell>
                  <TableCell>{learner.qualification}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="secondary" size="sm" className="bg-blue-50 text-blue-700 hover:bg-blue-100" onClick={() => onSelectLearner(learner)}>
                      Select Learner
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}

function LearnerProfileView({ 
  organization, 
  districtOffice,
  templates,
  selectedLearner: initialLearner 
}: { 
  organization: any, 
  districtOffice: any,
  templates: BadgeTemplate[],
  selectedLearner?: Learner | null
}) {
  const { userProfile } = useFirebase();
  const [isAddRecordOpen, setIsAddRecordOpen] = useState(false);
  const [recordType, setRecordType] = useState<'National Competency Assessment' | 'Recognition of Prior Learning (RPL)'>('National Competency Assessment');
  const [learner, setLearner] = useState<Learner | null>(initialLearner || null);
  const [records, setRecords] = useState<AssessmentRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const [recordForm, setRecordForm] = useState({
    qualification: learner?.qualification || '',
    assessmentDate: new Date().toISOString().split('T')[0],
    result: 'Passed / Competent' as any,
    remarks: '',
    assessorName: userProfile?.name || 'Assessor',
    evidenceRef: '',
    applicationNumber: `RPL-${Math.floor(100000 + Math.random() * 900000)}`,
    yearsExperience: 0,
    workExperienceSummary: ''
  });

  useEffect(() => {
    if (initialLearner) setLearner(initialLearner);
  }, [initialLearner]);

  useEffect(() => {
    if (!learner?.id) return;
    const q = query(
      collection(db, 'assessmentRecords'),
      where('learnerId', '==', learner.id)
    );
    const unsub = onSnapshot(q, (snapshot) => {
      setRecords(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AssessmentRecord)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'assessmentRecords');
    });
    return unsub;
  }, [learner]);

  const handleAddRecord = async () => {
    if (!learner || !organization || !districtOffice) return;
    setLoading(true);
    try {
      const newRecord: Partial<AssessmentRecord> = {
        organizationId: organization.id,
        districtOfficeId: districtOffice.id,
        learnerId: learner.id,
        learnerName: `${learner.firstName} ${learner.lastName}`,
        qualification: recordForm.qualification,
        assessmentDate: recordForm.assessmentDate,
        pathway: recordType,
        result: recordForm.result,
        remarks: recordForm.remarks,
        assessorName: recordForm.assessorName,
        evidenceRef: recordForm.evidenceRef,
        createdAt: serverTimestamp(),
      };

      if (recordType === 'Recognition of Prior Learning (RPL)') {
        newRecord.rplData = {
          applicationNumber: recordForm.applicationNumber,
          yearsExperience: recordForm.yearsExperience,
          workExperienceSummary: recordForm.workExperienceSummary,
          portfolioUrl: recordForm.evidenceRef,
          evidenceType: 'Portfolio',
          competencyMapping: 'Direct alignment',
          evaluationNotes: recordForm.remarks
        };
      }

      await addDoc(collection(db, 'assessmentRecords'), newRecord);
      
      // Update learner status if passed
      if (recordForm.result === 'Passed / Competent') {
        const learnerRef = doc(db, 'learners', learner.id);
        await updateDoc(learnerRef, { status: 'Completed' });
      }

      setIsAddRecordOpen(false);
      setRecordForm({
        ...recordForm,
        remarks: '',
        applicationNumber: `RPL-${Math.floor(100000 + Math.random() * 900000)}`
      });
    } catch (err) {
      console.error(err);
      handleFirestoreError(err, OperationType.WRITE, 'assessmentRecords');
    } finally {
      setLoading(false);
    }
  };

  const currentLearner = learner || {
    id: "L-482910",
    firstName: "Maria",
    lastName: "Santos",
    email: "m.santos@email.com",
    contactNumber: "+63 917 123 4567",
    qualification: "Cookery NC II",
    status: "Completed"
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div className="flex gap-6">
          <div className="h-20 w-20 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600 text-3xl font-bold">
            {currentLearner.firstName.charAt(0)}{currentLearner.lastName.charAt(0)}
          </div>
          <div>
            <h2 className="text-3xl font-bold text-slate-900">{currentLearner.firstName} {currentLearner.lastName}</h2>
            <div className="flex items-center gap-3 text-slate-500 text-sm mt-1">
              <span className="font-mono">{currentLearner.id}</span>
              <span>•</span>
              <span>{currentLearner.email}</span>
            </div>
            <div className="flex gap-2 mt-3">
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-100">Verified Profile</Badge>
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-100">Active Account</Badge>
              {records.some(r => r.pathway === 'Recognition of Prior Learning (RPL)') && (
                <Badge className="bg-purple-600 text-white gap-1">
                  <Award className="h-3 w-3" />
                  RPL Candidate
                </Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {/* Add Record Trigger is inside Action Center cards too, but here for convenience */}
          <Dialog open={isAddRecordOpen} onOpenChange={setIsAddRecordOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Record Assessment Result</DialogTitle>
                <DialogDescription>Submit official competency result for {currentLearner.firstName}.</DialogDescription>
              </DialogHeader>
              
              <Tabs value={recordType} onValueChange={(v: any) => setRecordType(v)} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="National Competency Assessment">National Assessment</TabsTrigger>
                  <TabsTrigger value="Recognition of Prior Learning (RPL)">RPL Evaluation</TabsTrigger>
                </TabsList>
                
                <div className="grid grid-cols-2 gap-4 py-6">
                  <div className="space-y-2 col-span-2">
                    <Label>Qualification / Competency</Label>
                    <Select 
                      value={recordForm.qualification} 
                      onValueChange={v => setRecordForm({...recordForm, qualification: v})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select from QSO Qualifications" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from(new Set(templates.map(t => t.qualificationName))).filter(Boolean).map(qual => (
                          <SelectItem key={qual} value={qual!}>{qual}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Assessment Date</Label>
                    <Input type="date" value={recordForm.assessmentDate} onChange={e => setRecordForm({...recordForm, assessmentDate: e.target.value})} />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Overall Result</Label>
                    <Select value={recordForm.result} onValueChange={v => setRecordForm({...recordForm, result: v})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Passed / Competent">Passed / Competent</SelectItem>
                        <SelectItem value="Failed / Not Yet Competent">Not Yet Competent</SelectItem>
                        <SelectItem value="Incomplete">Incomplete</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {recordType === 'Recognition of Prior Learning (RPL)' && (
                    <div className="space-y-2 col-span-2">
                      <Label>RPL Application Number</Label>
                      <Input value={recordForm.applicationNumber} readOnly className="bg-slate-50 font-mono" />
                    </div>
                  )}
                  
                  <div className="space-y-2 col-span-2">
                    <Label>Assessor Remarks</Label>
                    <Textarea 
                      value={recordForm.remarks} 
                      onChange={e => setRecordForm({...recordForm, remarks: e.target.value})}
                      placeholder="Enter detailed observations or justification..."
                    />
                  </div>
                </div>
              </Tabs>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddRecordOpen(false)}>Cancel</Button>
                <Button onClick={handleAddRecord} disabled={loading}>
                  {loading ? 'Processing...' : 'Submit Official Record'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Competency Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-y-4">
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400">Primary Qualification</p>
                  <p className="font-semibold text-slate-900">{currentLearner.qualification}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400">Contact Number</p>
                  <p className="font-semibold text-slate-900">{currentLearner.contactNumber}</p>
                </div>
              </div>
              
              <Separator />
              
              <div>
                <h4 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-emerald-600" />
                  Existing Credentials / Records
                </h4>
                <div className="space-y-3">
                  {records.length > 0 ? records.map(record => (
                    <div key={record.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200">
                      <div className="flex items-center gap-3">
                        {record.result === 'Passed / Competent' ? (
                          <ShieldCheck className="h-5 w-5 text-emerald-600" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-slate-400" />
                        )}
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{record.qualification}</p>
                          <p className="text-[10px] text-slate-500 uppercase font-bold">
                            {record.pathway} • {record.assessmentDate} • {record.result}
                          </p>
                        </div>
                      </div>
                      <Badge variant={record.pathway.includes('RPL') ? 'outline' : 'default'} className="text-[10px]">
                        {record.pathway.includes('RPL') ? 'RPL' : 'Standard'}
                      </Badge>
                    </div>
                  )) : (
                    <div className="text-center py-4 text-slate-500 text-sm italic">
                      No assessment records found for this learner.
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Action Center</CardTitle>
              <CardDescription>Issue new certificates or evaluate RPL applications</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <Button 
                variant="outline" 
                className="h-24 flex-col gap-2 hover:bg-emerald-50 hover:border-emerald-200 transition-all text-wrap"
                onClick={() => {
                  setRecordType('Unit Stacking (National Assessment)');
                  setIsAddRecordOpen(true);
                }}
              >
                <FileText className="h-6 w-6 text-emerald-600" />
                <div className="text-center">
                  <p className="font-bold text-slate-900">Unit Stacking</p>
                  <p className="text-[10px] text-slate-500">National Assessment result</p>
                </div>
              </Button>
              <Button 
                variant="outline" 
                className="h-24 flex-col gap-2 hover:bg-blue-50 hover:border-blue-200 transition-all text-wrap"
                onClick={() => {
                  setRecordType('Recognition of Prior Learning (RPL)');
                  setIsAddRecordOpen(true);
                }}
              >
                <Award className="h-6 w-6 text-blue-600" />
                <div className="text-center">
                  <p className="font-bold text-slate-900">RPL Pathway</p>
                  <p className="text-[10px] text-slate-500">Prior Learning evaluation</p>
                </div>
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-slate-900 text-white border-none shadow-xl overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <ShieldCheck className="h-24 w-24" />
            </div>
            <CardHeader>
              <CardTitle className="text-amber-400">Master Badge Eligibility</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-300 leading-relaxed">
                Eligibility is tracked automatically based on recorded passing marks in core competencies.
              </p>
              <div className="w-full bg-slate-800 rounded-full h-2">
                <div className="bg-amber-400 h-2 rounded-full w-[33%]" />
              </div>
              <Link to="/assessmentcenter/submit">
                <Button className="w-full bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold mt-4">
                  Proceed to Badge Request
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function RPLEndorsedCandidatesAndRecordsView({ organization, templates }: { organization: any, templates: BadgeTemplate[] }) {
  const [subTab, setSubTab] = useState<'endorsed' | 'history'>('endorsed');
  const [candidates, setCandidates] = useState<RPLApplication[]>([]);
  const [loading, setLoading] = useState(true);

  // Selected candidate overlay
  const [selectedCandidate, setSelectedCandidate] = useState<RPLApplication | null>(null);
  const [isEvalOpen, setIsEvalOpen] = useState(false);
  const [remarks, setRemarks] = useState('');

  // Checklist state
  const [checklist, setChecklist] = useState({
    endorsedByTC: false,
    evidenceReviewed: false,
    creditedListed: false,
    remainingCompetenciesIdentified: false,
    gapTrainingStatusChecked: false,
    targetCredentialVerified: false,
    documentsComplete: false,
    eligibleForAssessment: false,
  });

  // Assessor record state
  const [recordingResult, setRecordingResult] = useState(false);
  const [assessorForm, setAssessorForm] = useState({
    assessorName: '',
    assessmentDate: new Date().toISOString().split('T')[0],
    result: 'Passed / Competent' as 'Passed / Competent' | 'Failed / Not Yet Competent',
    remarks: '',
  });

  // Load candidates
  useEffect(() => {
    if (!organization?.id) return;
    const q = query(
      collection(db, 'rplApplications')
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const all = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RPLApplication));
      // Candidates endorsed to this center
      const matched = all.filter(app => {
        const matchesAC = app.assessmentCenterId === organization.id || 
                          app.assessmentCenterName === organization.name ||
                          app.status === 'Endorsed to Assessment Center' ||
                          app.status === 'Eligible for Assessment' ||
                          app.status === 'Returned to TC' ||
                          app.status === 'Additional Documents Requested' ||
                          app.status === 'Not Eligible' ||
                          app.status === 'Assessment Completed';
        return matchesAC;
      });
      setCandidates(matched);
      setLoading(false);
    }, (err) => {
      console.error(err);
      setLoading(false);
    });

    return unsub;
  }, [organization]);

  const handleOpenEval = (cand: RPLApplication) => {
    setSelectedCandidate(cand);
    setChecklist({
      endorsedByTC: cand.status === 'Endorsed to Assessment Center' || cand.endorsedToAssessmentCenter,
      evidenceReviewed: cand.evidence.length > 0,
      creditedListed: cand.competencyReviews.some(c => c.status === 'Credited through RPL'),
      remainingCompetenciesIdentified: cand.competencyReviews.some(c => c.status !== 'Credited through RPL'),
      gapTrainingStatusChecked: cand.gapTrainingStatus === 'Completed' || !cand.gapTrainingRequired,
      targetCredentialVerified: !!cand.targetCredential,
      documentsComplete: cand.evidence.every(e => e.status === 'Accepted'),
      eligibleForAssessment: cand.status === 'Eligible for Assessment',
    });
    setRemarks(cand.eligibilityRemarks || '');
    setRecordingResult(false);
    setIsEvalOpen(true);
  };

  const handleStatusAction = async (actionClass: RPLApplication['eligibilityStatus'], destStatus: RPLApplication['status']) => {
    if (!selectedCandidate) return;

    try {
      const docRef = doc(db, 'rplApplications', selectedCandidate.id);
      await updateDoc(docRef, {
        status: destStatus,
        eligibilityStatus: actionClass,
        eligibilityRemarks: remarks,
        eligibilityChecklist: checklist,
        updatedAt: serverTimestamp()
      });

      setSelectedCandidate(prev => prev ? {
        ...prev,
        status: destStatus,
        eligibilityStatus: actionClass,
        eligibilityRemarks: remarks,
        eligibilityChecklist: checklist
      } : null);

      setIsEvalOpen(false);
      alert(`Success! Status changed to "${destStatus}".`);
    } catch (e) {
      console.error(e);
      alert('Error updating status.');
    }
  };

  const handleRecordAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCandidate || !assessorForm.assessorName.trim()) {
      alert('Please fill in the Assessor Name.');
      return;
    }

    try {
      // 1. Create Assessment Record
      const newRecord: any = {
        organizationId: organization.id,
        districtOfficeId: organization.assignedDistrictId || 'demo-district-office',
        learnerId: selectedCandidate.learnerId,
        learnerName: selectedCandidate.learnerName,
        qualification: selectedCandidate.qualificationName,
        assessmentDate: assessorForm.assessmentDate,
        pathway: 'Recognition of Prior Learning (RPL)',
        result: assessorForm.result,
        remarks: assessorForm.remarks || `RPL competency assessment executed by ${assessorForm.assessorName}.`,
        assessorName: assessorForm.assessorName,
        evidenceRef: selectedCandidate.evidence[0]?.url || 'Portfolio',
        createdAt: serverTimestamp(),
        rplData: {
          applicationNumber: selectedCandidate.id,
          yearsExperience: selectedCandidate.yearsExperience,
          workExperienceSummary: selectedCandidate.workExperienceSummary,
          portfolioUrl: selectedCandidate.evidence[0]?.url || 'Portfolio',
          evidenceType: 'Portfolio Evidence Upload',
          competencyMapping: 'Standard mapped competencies through Accredited TC',
          evaluationNotes: assessorForm.remarks || 'Success'
        }
      };

      await addDoc(collection(db, 'assessmentRecords'), newRecord);

      // 2. Try to mark learner profile status completed if passed
      try {
        const qL = query(collection(db, 'learners'), where('email', '==', selectedCandidate.learnerEmail));
        const qSnap = await getDocs(qL);
        if (!qSnap.empty) {
          const lDoc = qSnap.docs[0];
          await updateDoc(doc(db, 'learners', lDoc.id), { status: 'Completed' });
        }
      } catch (ler) {
        console.warn("Learner document not found, skipping status patch: ", ler);
      }

      // 3. Mark RPL Application status Completed
      const docRef = doc(db, 'rplApplications', selectedCandidate.id);
      await updateDoc(docRef, {
        status: 'Assessment Completed',
        updatedAt: serverTimestamp()
      });

      setIsEvalOpen(false);
      setSelectedCandidate(null);
      alert('Assessment Result successfully saved! Candidate completed.');
    } catch (err) {
      console.error(err);
      alert('Error recording assessment outcome.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Award className="h-6 w-6 text-indigo-600" />
            RPL Assessment Operations Center
          </h1>
          <p className="text-slate-500 text-xs">
            Review prior learning portfolio claims from endorsed institutions and register official results.
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg">
          <Button
            variant={subTab === 'endorsed' ? 'default' : 'ghost'}
            size="sm"
            className="text-xs transition-shadow"
            onClick={() => setSubTab('endorsed')}
          >
            RPL-Endorsed Candidates
          </Button>
          <Button
            variant={subTab === 'history' ? 'default' : 'ghost'}
            size="sm"
            className="text-xs transition-shadow"
            onClick={() => setSubTab('history')}
          >
            RPL Historical Archives
          </Button>
        </div>
      </div>

      {subTab === 'history' ? (
        <RecordsView organization={organization} type="rpl" />
      ) : (
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center gap-1.5 text-slate-800">
              <ClipboardList className="h-4 w-4 text-indigo-600" />
              Active Triage Queue
            </CardTitle>
            <CardDescription className="text-xs">
              Accredited portfolios currently transferred and open for official skills challenge testing.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex flex-col items-center justify-center p-12 text-slate-400 font-mono text-xs">
                <Loader2 className="h-6 w-6 animate-spin text-indigo-600 mb-2" />
                Retrieving active candidates...
              </div>
            ) : candidates.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs border-t border-slate-100">
                No active RPL-Endorsed candidates in evaluation currently.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Candidate</TableHead>
                    <TableHead>Target Standard</TableHead>
                    <TableHead>Endorser Training Center</TableHead>
                    <TableHead>Verification Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {candidates.map((cand) => (
                    <TableRow key={cand.id}>
                      <TableCell>
                        <div className="space-y-0.5">
                          <p className="font-bold text-slate-800 text-xs">{cand.learnerName}</p>
                          <p className="text-[10px] text-slate-500 font-mono select-all text-sm">{cand.learnerEmail}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs font-medium text-slate-700">
                        [{cand.qualificationCode}] {cand.qualificationName} ({cand.targetCredential})
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">{cand.trainingCenterName}</TableCell>
                      <TableCell>
                        <Badge className="text-[10px]" variant={
                          cand.status === 'Eligible for Assessment' ? 'default' :
                          cand.status === 'Assessment Completed' ? 'emerald' :
                          cand.status === 'Returned to TC' ? 'destructive' :
                          'secondary'
                        }>
                          {cand.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          size="xs" 
                          variant="outline" 
                          className="bg-white text-xs px-2.5 h-8 font-semibold border-slate-200 text-slate-700 font-sans"
                          onClick={() => handleOpenEval(cand)}
                        >
                          Evaluate Eligibility
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Candidate Eligibility Evaluation Dialog */}
      {selectedCandidate && (
        <Dialog open={isEvalOpen} onOpenChange={() => setIsEvalOpen(false)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto border-slate-200">
            <DialogHeader className="border-b border-slate-50 pb-3">
              <DialogTitle className="text-slate-950 font-extrabold text-base flex items-center gap-1.5">
                <ShieldCheck className="h-5 w-5 text-indigo-600" />
                RPL Eligibility Verification
              </DialogTitle>
              <DialogDescription className="text-xs">
                Candidate: <strong>{selectedCandidate.learnerName}</strong> | Standard: <strong>{selectedCandidate.qualificationName}</strong>
              </DialogDescription>
            </DialogHeader>

            {!recordingResult ? (
              <div className="space-y-6 py-4">
                {/* Section 1: Endorser mapping details */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div><span className="text-slate-400 block font-mono text-[9px] uppercase font-bold">Endorsement Source:</span> <strong className="text-slate-700">{selectedCandidate.trainingCenterName}</strong></div>
                    <div><span className="text-slate-400 block font-mono text-[9px] uppercase font-bold">Target Badge Type:</span> <strong className="text-slate-700">{selectedCandidate.targetCredential}</strong></div>
                  </div>
                  <Separator className="my-1.5" />
                  <div>
                    <span className="text-slate-400 block font-mono text-[9px] uppercase font-bold leading-normal">Candidate Experience Declarations:</span>
                    <p className="text-slate-600 font-medium whitespace-pre-wrap mt-0.5 leading-relaxed">
                      "{selectedCandidate.workExperienceSummary}" ({selectedCandidate.yearsExperience} Year{selectedCandidate.yearsExperience > 1 ? 's' : ''} Occupational History)
                    </p>
                  </div>
                </div>

                {/* Section 2: Interactive Eligibility checklist */}
                <div className="border border-slate-100 rounded-xl p-4 bg-white space-y-3">
                  <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider font-mono">
                    Evaluation Tick-Off (8 Quality Vouchers)
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <label className="flex items-start gap-2 p-1 hover:bg-slate-50/50 rounded cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="rounded border-slate-300 mt-0.5"
                        checked={checklist.endorsedByTC} 
                        onChange={(e) => setChecklist(prev => ({ ...prev, endorsedByTC: e.target.checked }))} 
                      />
                      <span className="text-slate-600">RPL application is endorsed by Training Center</span>
                    </label>

                    <label className="flex items-start gap-2 p-1 hover:bg-slate-50/50 rounded cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="rounded border-slate-300 mt-0.5"
                        checked={checklist.evidenceReviewed} 
                        onChange={(e) => setChecklist(prev => ({ ...prev, evidenceReviewed: e.target.checked }))} 
                      />
                      <span className="text-slate-600">Evidence portfolio was reviewed</span>
                    </label>

                    <label className="flex items-start gap-2 p-1 hover:bg-slate-50/50 rounded cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="rounded border-slate-300 mt-0.5"
                        checked={checklist.creditedListed} 
                        onChange={(e) => setChecklist(prev => ({ ...prev, creditedListed: e.target.checked }))} 
                      />
                      <span className="text-slate-600">Credited competencies are listed</span>
                    </label>

                    <label className="flex items-start gap-2 p-1 hover:bg-slate-50/50 rounded cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="rounded border-slate-300 mt-0.5"
                        checked={checklist.remainingCompetenciesIdentified} 
                        onChange={(e) => setChecklist(prev => ({ ...prev, remainingCompetenciesIdentified: e.target.checked }))} 
                      />
                      <span className="text-slate-600">Remaining competencies for assessment are identified</span>
                    </label>

                    <label className="flex items-start gap-2 p-1 hover:bg-slate-50/50 rounded cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="rounded border-slate-300 mt-0.5"
                        checked={checklist.gapTrainingStatusChecked} 
                        onChange={(e) => setChecklist(prev => ({ ...prev, gapTrainingStatusChecked: e.target.checked }))} 
                      />
                      <span className="text-slate-600">Gap training is completed or not applicable</span>
                    </label>

                    <label className="flex items-start gap-2 p-1 hover:bg-slate-50/50 rounded cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="rounded border-slate-300 mt-0.5"
                        checked={checklist.targetCredentialVerified} 
                        onChange={(e) => setChecklist(prev => ({ ...prev, targetCredentialVerified: e.target.checked }))} 
                      />
                      <span className="text-slate-600">Target credential is identified: COC or NC</span>
                    </label>

                    <label className="flex items-start gap-2 p-1 hover:bg-slate-50/50 rounded cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="rounded border-slate-300 mt-0.5"
                        checked={checklist.documentsComplete} 
                        onChange={(e) => setChecklist(prev => ({ ...prev, documentsComplete: e.target.checked }))} 
                      />
                      <span className="text-slate-600">Required assessment documents are complete</span>
                    </label>

                    <label className="flex items-start gap-2 p-1 hover:bg-slate-50/50 rounded cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="rounded border-slate-300 mt-0.5"
                        checked={checklist.eligibleForAssessment} 
                        onChange={(e) => setChecklist(prev => ({ ...prev, eligibleForAssessment: e.target.checked }))} 
                      />
                      <span className="text-slate-600 font-bold text-indigo-700">Learner is eligible for assessment scheduling</span>
                    </label>
                  </div>
                </div>

                {/* Section 3: Remarks and Decision buttons */}
                <div className="space-y-4 border-t border-slate-100 pt-4">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-700">Eligibility Comments / Internal Remarks</Label>
                    <Textarea 
                      placeholder="Comment on document quality, schedule proposals, or missing files details to communicate back with center..."
                      value={remarks}
                      className="bg-white"
                      onChange={(e) => setRemarks(e.target.value)}
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button 
                      size="sm" 
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                      onClick={() => handleStatusAction('Approve for Assessment Schedule', 'Eligible for Assessment')}
                    >
                      Approve for Assessment Schedule
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="text-stone-700 hover:bg-slate-100 font-bold"
                      onClick={() => handleStatusAction('Return to Training Center', 'Returned to TC')}
                    >
                      Return to Training Center
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="text-amber-800 hover:bg-amber-50 border-amber-200 font-bold"
                      onClick={() => handleStatusAction('Request Additional Documents', 'Additional Documents Requested')}
                    >
                      Request Additional Documents
                    </Button>
                    <Button 
                      size="sm" 
                      variant="destructive"
                      className="bg-rose-600 font-bold text-white hover:bg-rose-700"
                      onClick={() => handleStatusAction('Not Eligible', 'Not Eligible')}
                    >
                      Not Eligible
                    </Button>
                  </div>

                  {/* Immediate Competency Assessment Recorder trigger */}
                  {(selectedCandidate.status === 'Eligible for Assessment') && (
                    <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-center justify-between gap-4 mt-6">
                      <div className="space-y-0.5 text-xs text-amber-800">
                        <span className="font-bold block">Schedule Authorized</span>
                        <p className="text-[11px] text-amber-700">Competency check is approved. Record the final score directly into the repository.</p>
                      </div>
                      <Button 
                        size="sm" 
                        className="bg-amber-600 text-white font-bold h-9"
                        onClick={() => setRecordingResult(true)}
                      >
                        Record Assessor Record Now
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Inline Assessor result registration panel */
              <form onSubmit={handleRecordAssessment} className="space-y-4 py-4 text-xs font-sans">
                <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-400 font-mono tracking-wider block uppercase">Selected Target Standard:</span>
                  <p className="font-bold text-slate-800 text-sm">{selectedCandidate.qualificationName} ({selectedCandidate.qualificationCode})</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 col-span-2">
                  <div className="space-y-1.5">
                    <Label className="font-semibold text-slate-700">Official Assessor Name</Label>
                    <Input 
                      placeholder="e.g. Inspector Manuel Quezon"
                      required
                      className="bg-white text-xs"
                      value={assessorForm.assessorName}
                      onChange={(e) => setAssessorForm(prev => ({ ...prev, assessorName: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="font-semibold text-slate-700">Assessment Executed Date</Label>
                    <Input 
                      type="date"
                      className="bg-white text-xs font-mono"
                      value={assessorForm.assessmentDate}
                      onChange={(e) => setAssessorForm(prev => ({ ...prev, assessmentDate: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-1.5 col-span-2">
                  <Label className="font-semibold text-slate-700">Evaluator Assessment Outcome</Label>
                  <Select 
                    value={assessorForm.result} 
                    onValueChange={(val: any) => setAssessorForm(prev => ({ ...prev, result: val }))}
                  >
                    <SelectTrigger className="w-full bg-white text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="text-xs">
                      <SelectItem value="Passed / Competent">Passed / Competent</SelectItem>
                      <SelectItem value="Failed / Not Yet Competent">Failed / Not Yet Competent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5 col-span-2">
                  <Label className="font-semibold text-slate-700">Assessor Detailed Remarks / Justification</Label>
                  <Textarea 
                    placeholder="Provide details on demonstration correctness, interview outcomes, or completed portfolio justifications..."
                    rows={3}
                    className="bg-white text-xs"
                    value={assessorForm.remarks}
                    onChange={(e) => setAssessorForm(prev => ({ ...prev, remarks: e.target.value }))}
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <Button 
                    type="button" 
                    variant="ghost" 
                    onClick={() => setRecordingResult(false)}
                  >
                    Cancel / Go Back
                  </Button>
                  <Button 
                    type="submit" 
                    className="bg-gradient-to-r from-indigo-600 to-emerald-600 text-white font-bold h-9"
                  >
                    Verify & Submit Assessment Outcome
                  </Button>
                </div>
              </form>
            )}

            <DialogFooter className="border-t border-slate-50 pt-2">
              <Button variant="ghost" onClick={() => setIsEvalOpen(false)} className="w-full">
                Close Verification Page
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function RecordsView({ organization, type }: { organization: any, type: 'assessment' | 'rpl' }) {
  const [data, setData] = useState<AssessmentRecord[]>([]);

  useEffect(() => {
    if (!organization?.id) return;
    const q = query(
      collection(db, 'assessmentRecords'),
      where('organizationId', '==', organization.id),
      where('pathway', '==', type === 'assessment' ? 'National Competency Assessment' : 'Recognition of Prior Learning (RPL)')
    );

    const unsub = onSnapshot(q, (snapshot) => {
      setData(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AssessmentRecord)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'assessmentRecords');
    });
    return unsub;
  }, [organization, type]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{type === 'assessment' ? 'Assessment Results' : 'RPL Records'}</CardTitle>
        <CardDescription>Historical data for your center</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Learner</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Result</TableHead>
              {type === 'rpl' && <TableHead>Application #</TableHead>}
              <TableHead>Remarks</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length > 0 ? data.map(record => (
              <TableRow key={record.id}>
                <TableCell className="font-semibold">{record.learnerName}</TableCell>
                <TableCell>{record.assessmentDate}</TableCell>
                <TableCell>
                  <Badge variant={record.result === 'Passed / Competent' ? 'default' : 'secondary'}>
                    {record.result}
                  </Badge>
                </TableCell>
                {type === 'rpl' && <TableCell className="font-mono text-xs">{record.rplData?.applicationNumber}</TableCell>}
                <TableCell className="text-slate-500 max-w-[200px] truncate">{record.remarks}</TableCell>
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-slate-500">No records found.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function SubmitRequestView({ organization, districtOffice, initialLearner, templates }: any) {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useFirebase();
  const [formData, setFormData] = useState<Partial<BadgeRequest>>({
    badgeType: 'Skilled Badge',
    remarks: '',
    evidenceUrl: '',
    status: 'Pending Approval'
  });
  
  const [selectedLearner, setSelectedLearner] = useState<Learner | null>(initialLearner || null);
  const [assessmentRecords, setAssessmentRecords] = useState<AssessmentRecord[]>([]);
  const [allLearnerRecords, setAllLearnerRecords] = useState<AssessmentRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<string>('');

  // Sync with prop if it changes
  useEffect(() => {
    if (initialLearner) setSelectedLearner(initialLearner);
  }, [initialLearner]);

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  useEffect(() => {
    setSelectedRecord('');
    if (!selectedLearner?.id) {
      setAssessmentRecords([]);
      setAllLearnerRecords([]);
      return;
    }
    const fetchRecords = async () => {
      try {
        console.log("SubmitRequestView: Fetching all records for learner:", selectedLearner.id);
        
        // Try querying by both possible learner ID fields
        const qDocId = query(
          collection(db, 'assessmentRecords'),
          where('learnerId', '==', selectedLearner.id)
        );
        
        const snaps = [await getDocs(qDocId)];
        
        // Also check human-readable learnerId
        const humanId = (selectedLearner as any).learnerId || (selectedLearner as any).id;
        if (humanId && humanId !== selectedLearner.id) {
          const qHumanId = query(
            collection(db, 'assessmentRecords'),
            where('learnerId', '==', humanId)
          );
          snaps.push(await getDocs(qHumanId));
        }

        const allDocs = snaps.flatMap(s => s.docs);
        const records = allDocs.map(doc => ({ id: doc.id, ...doc.data() } as AssessmentRecord));
        
        // De-duplicate by doc ID
        const uniqueRecords = Array.from(new Map(records.map(r => [r.id, r])).values());
        
        console.log("SubmitRequestView: Found unique records:", uniqueRecords.length);
        setAllLearnerRecords(uniqueRecords);

        // Filter for passing results for the "selectable" list
        const passing = uniqueRecords.filter(r => {
          const res = (r.result || "").toLowerCase();
          return res.includes('pass') || res.includes('competent') || res.includes('qualified');
        });
        
        setAssessmentRecords(passing);
      } catch (err) {
        console.error("SubmitRequestView: Error fetching records:", err);
      }
    };
    fetchRecords();
  }, [selectedLearner]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedLearner) {
      alert("No learner selected. Please search and select a learner first.");
      return;
    }
    if (!selectedRecord) {
      alert("Please select an assessment record to base the badge on.");
      return;
    }
    
    const record = allLearnerRecords.find(r => r.id === selectedRecord);
    if (!record) {
      alert("Selected record not found.");
      return;
    }

    const res = (record.result || "").toLowerCase();
    const isPassing = res.includes('pass') || res.includes('competent') || res.includes('qualified');
    
    if (!isPassing) {
      alert("You can only submit certification requests for records with a 'Passed' or 'Competent' result.");
      return;
    }

    if (!organization?.id) {
      alert("Your Assessment Center profile is not correctly loaded. Please contact support.");
      return;
    }
    if (!districtOffice?.id) {
      alert("No linked District Office found for your center. Certificate requests must be routed to a District Office for approval.");
      return;
    }
    
    setLoading(true);
    try {
      // Try to find a matching template by qualification and badge type
      const matchedTemplate = templates.find(t => 
        (t.qualificationName === (record?.qualification || formData.qualification)) && 
        (t.badgeType.includes(formData.badgeType?.split(' ')[0] || ''))
      );

      // Routing logic: Skilled and Master badges go to CO, others to District Office
      const isHighLevelBadge = formData.badgeType === 'Skilled Badge' || formData.badgeType === 'Master Badge';
      const targetApproverId = isHighLevelBadge ? 'CertificationOffice' : (districtOffice.id);
      const targetApproverName = isHighLevelBadge ? 'Certification Office' : districtOffice.name;

      const requestData = {
        ...formData,
        learnerId: selectedLearner.id,
        learnerName: `${selectedLearner.firstName} ${selectedLearner.lastName}`,
        learnerEmail: selectedLearner.email || '',
        badgeId: matchedTemplate?.id || '',
        badgeName: record?.qualification || '',
        programName: record?.qualification || '',
        assessmentRecordId: selectedRecord,
        qualification: record?.qualification || '',
        pathway: record?.pathway?.includes('Prior Learning') ? 'RPL' : 'Unit Stacking',
        issuerId: organization.id,
        issuerName: organization.name,
        issuerType: 'AssessmentCenter',
        sourceAssessmentCenterId: organization.id,
        districtOfficeId: districtOffice.id, // Keep the link for context
        routingTier: isHighLevelBadge ? 'CertificationOffice' : 'DistrictOffice',
        targetApproverId: targetApproverId,
        submittedBy: user?.uid || '',
        submittedByName: user?.displayName || user?.email || '',
        submittedAt: serverTimestamp(),
        status: isHighLevelBadge ? 'Submitted to CO' : 'Pending Approval'
      };

      await addDoc(collection(db, 'issuedBadges'), requestData);
      const successMessage = isHighLevelBadge 
        ? "Certificate Request Submitted! Your request is now for CO Review."
        : `Certificate Request Submitted! Forwarded to ${districtOffice?.name || "the District Office"} for approval.`;
      
      alert(successMessage);
      
      setFormData({ badgeType: 'Skilled Badge' as any, remarks: '', status: 'Pending Approval' as any, evidenceUrl: '' });
      setSelectedLearner(null);
      setSelectedRecord('');
      setIsConfirmOpen(false);
    } catch (err) {
      console.error(err);
      alert("Error submitting request: " + (err instanceof Error ? err.message : "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Submit Badge Certification Request</CardTitle>
        <CardDescription>Forwarding qualified results to {districtOffice?.name || 'Assigned District Office'}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            {/* Step 1: Selected Learner Display */}
            <div className="space-y-2">
              <Label>Target Learner</Label>
              {selectedLearner ? (
                <div className="p-2 border rounded-md bg-slate-50 flex justify-between items-center">
                  <div>
                    <p className="font-bold">{selectedLearner.firstName} {selectedLearner.lastName}</p>
                    <p className="text-xs text-slate-500 font-mono">{selectedLearner.id}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedLearner(null)}>Change</Button>
                </div>
              ) : (
                <div className="p-4 border border-dashed rounded-md text-center">
                  <p className="text-sm text-slate-500 mb-2">No learner selected</p>
                  <Button variant="outline" size="sm" onClick={() => navigate('/assessmentcenter/search')}>
                    Go to Search
                  </Button>
                </div>
              )}
            </div>

            {/* Step 2: Select Record */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label>Source Assessment/RPL Record</Label>
                {selectedLearner && (
                  <Button 
                    variant="link" 
                    className="h-auto p-0 text-xs" 
                    onClick={() => navigate('/assessmentcenter/profiles')}
                  >
                    + Add New Result
                  </Button>
                )}
              </div>
              <Select value={selectedRecord} onValueChange={setSelectedRecord} disabled={!selectedLearner}>
                <SelectTrigger>
                  <SelectValue placeholder={allLearnerRecords.length > 0 ? "Select Record" : "No records found for this learner"} />
                </SelectTrigger>
                <SelectContent>
                  {allLearnerRecords.map(r => {
                    const res = (r.result || "").toLowerCase();
                    const isPassing = res.includes('pass') || res.includes('competent') || res.includes('qualified');
                    return (
                      <SelectItem key={r.id} value={r.id} disabled={!isPassing}>
                        {r.qualification} - {r.assessmentDate} ({r.result}){!isPassing ? " - Not Eligible" : ""}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {selectedLearner && allLearnerRecords.length > 0 && assessmentRecords.length === 0 && (
                <p className="text-[10px] text-rose-500 italic">
                  This learner has records, but none are marked as "Passed" or "Competent".
                </p>
              )}
              {selectedLearner && allLearnerRecords.length === 0 && (
                <p className="text-[10px] text-slate-500 italic">
                  No records found. Visit the learner profile to add an assessment result first.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Badge Type</Label>
              <Select 
                value={formData.badgeType} 
                onValueChange={(val: any) => setFormData({...formData, badgeType: val})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Skilled Badge">Skilled Badge (COC)</SelectItem>
                  <SelectItem value="Master Badge">Master Badge (NC)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Assigned District Office (Ready-only)</Label>
              <Input value={districtOffice?.name || ''} disabled className="bg-slate-50 font-semibold" />
            </div>

            <div className="col-span-2 space-y-2">
              <Label>Supporting Evidence (Document URL / Portfolio)</Label>
              <Input 
                placeholder="https://portfolio-or-cloud-drive-link.com" 
                value={formData.evidenceUrl || ''} 
                onChange={e => setFormData({...formData, evidenceUrl: e.target.value})}
              />
            </div>

            <div className="col-span-2 space-y-2">
              <Label>Remarks / Internal Notes</Label>
              <Textarea 
                value={formData.remarks} 
                onChange={e => setFormData({...formData, remarks: e.target.value})}
                placeholder="Include details about the candidate's performance or RPL justification..." 
              />
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg flex gap-3 text-amber-700 text-xs">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <p className="leading-relaxed">
              <strong>Validation Rule:</strong> Badge requests can only be submitted if the source assessment result is marked as <strong>"Passed / Competent"</strong>. Badges are not published to the learner wallet until approved by the District Office.
            </p>
          </div>

          <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
            <DialogTrigger
              render={
                <Button className="w-full h-12 text-lg font-bold" disabled={!selectedLearner || !selectedRecord || loading}>
                  Submit Certification Request
                </Button>
              }
            />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Confirm Submission</DialogTitle>
                <DialogDescription>
                  You are about to submit a <strong>{formData.badgeType}</strong> request for <strong>{selectedLearner?.firstName} {selectedLearner?.lastName}</strong> to <strong>{districtOffice?.name}</strong>.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsConfirmOpen(false)}>Cancel</Button>
                <Button onClick={() => handleSubmit()} disabled={loading}>Confirm & Send</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
}

function TrackingView({ organization }: { organization: any }) {
  const [requests, setRequests] = useState<BadgeRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<BadgeRequest | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  useEffect(() => {
    if (!organization?.id) return;
    const q = query(
      collection(db, 'issuedBadges'),
      where('sourceAssessmentCenterId', '==', organization.id),
      orderBy('submittedAt', 'desc')
    );

    const unsub = onSnapshot(q, (snapshot) => {
      setRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'issuedBadges');
    });
    return unsub;
  }, [organization]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Submission Tracking</CardTitle>
        <CardDescription>Monitor status of certificate requests at District Office</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Request ID</TableHead>
              <TableHead>Learner</TableHead>
              <TableHead>Badge Type</TableHead>
              <TableHead>Qualification</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.length > 0 ? requests.map(req => (
              <TableRow key={req.id}>
                <TableCell className="font-mono text-[10px] uppercase">{req.id.slice(-8)}</TableCell>
                <TableCell className="font-semibold text-slate-900">{req.learnerName}</TableCell>
                <TableCell>
                  <Badge variant="outline">{req.badgeType}</Badge>
                </TableCell>
                <TableCell className="text-xs">{req.qualification}</TableCell>
                <TableCell>
                   <Badge className={
                    req.status === 'Approved' ? 'bg-emerald-500' : 
                    req.status === 'Rejected' ? 'bg-rose-500' : 
                    'bg-amber-500 text-white'
                  }>
                    {req.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => {
                    setSelectedRequest(req);
                    setIsDetailsOpen(true);
                  }}>Details</Button>
                </TableCell>
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-slate-500">No requests tracked yet.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          {selectedRequest && (
            <DialogContent className="max-w-xl">
              <DialogHeader>
                <DialogTitle>Request Details</DialogTitle>
                <DialogDescription>ID: {selectedRequest.id}</DialogDescription>
              </DialogHeader>
              <div className="space-y-6 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-[10px] text-slate-400 uppercase font-bold">Learner</Label>
                    <p className="font-semibold">{selectedRequest.learnerName}</p>
                  </div>
                  <div>
                    <Label className="text-[10px] text-slate-400 uppercase font-bold">Status</Label>
                    <div><Badge className={selectedRequest.status === 'Approved' ? 'bg-emerald-500' : 'bg-amber-500'}>{selectedRequest.status}</Badge></div>
                  </div>
                  <div>
                    <Label className="text-[10px] text-slate-400 uppercase font-bold">Badge Type</Label>
                    <p>{selectedRequest.badgeType}</p>
                  </div>
                  <div>
                    <Label className="text-[10px] text-slate-400 uppercase font-bold">Submitted Date</Label>
                    <p>{selectedRequest.submittedAt?.toDate ? selectedRequest.submittedAt.toDate().toLocaleDateString() : 'N/A'}</p>
                  </div>
                </div>
                <div>
                  <Label className="text-[10px] text-slate-400 uppercase font-bold">Remarks</Label>
                  <div className="p-3 bg-slate-50 rounded-lg text-sm border border-slate-100">
                    {selectedRequest.remarks || 'No remarks provided.'}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => setIsDetailsOpen(false)}>Close</Button>
              </DialogFooter>
            </DialogContent>
          )}
        </Dialog>
      </CardContent>
    </Card>
  );
}

function NotificationsView({ organization }: { organization: any }) {
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    if (!organization?.id) return;
    // For now, derive notifications from badge requests status changes
    const q = query(
      collection(db, 'issuedBadges'),
      where('sourceAssessmentCenterId', '==', organization.id),
      orderBy('submittedAt', 'desc'),
      limit(20)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const notes = snapshot.docs
        .filter(d => d.data().status !== 'Pending Approval')
        .map(d => {
          const data = d.data();
          return {
            id: d.id,
            title: data.status === 'Approved' ? 'Badge Request Approved' : 'Badge Request Rejected',
            desc: `${data.learnerName} - ${data.badgeType} for ${data.qualification}`,
            time: data.submittedAt?.toDate ? data.submittedAt.toDate().toLocaleDateString() : 'Recent',
            status: data.status === 'Approved' ? 'success' : 'error'
          };
        });
      setNotifications(notes);
    }, (error) => {
      console.error("Notifications listener error:", error);
      // Don't crash the whole view for notifications
    });
    return unsub;
  }, [organization]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notifications & System Alerts</CardTitle>
        <CardDescription>Updates on your submissions and center activity</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {notifications.length > 0 ? notifications.map(n => (
            <div key={n.id} className="flex gap-4 p-4 rounded-xl border border-slate-100 hover:bg-slate-50 transition-all cursor-default">
              <div className={`mt-1 p-2 h-fit rounded-full ${
                n.status === 'success' ? 'bg-emerald-100 text-emerald-600' : 
                n.status === 'error' ? 'bg-rose-100 text-rose-600' : 'bg-blue-100 text-blue-600'
              }`}>
                {n.status === 'success' ? <CheckCircle2 className="h-4 w-4" /> : 
                 n.status === 'error' ? <XCircle className="h-4 w-4" /> : <Info className="h-4 w-4" />}
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <p className="font-bold text-slate-900">{n.title}</p>
                  <span className="text-[10px] text-slate-400 uppercase tracking-widest">{n.time}</span>
                </div>
                <p className="text-sm text-slate-600 mt-1">{n.desc}</p>
              </div>
            </div>
          )) : (
            <div className="text-center py-12 text-slate-500">
              <Bell className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>No new notifications.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

