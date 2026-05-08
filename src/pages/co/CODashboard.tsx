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
  AlertCircle,
  CheckCircle2,
  XCircle,
  Hash,
  Search,
  Filter,
  Eye,
  Award,
  Building2,
  User,
  Database,
  FileText,
  CreditCard
} from 'lucide-react';
import { collection, query, onSnapshot, limit, orderBy, where, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/src/lib/firebase';
import { useFirebase } from '@/src/lib/FirebaseProvider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link, useSearchParams } from 'react-router-dom';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

type COView = 
  | 'overview' 
  | 'requests' 
  | 'id-generation' 
  | 'forwarding' 
  | 'validity' 
  | 'renewal' 
  | 'revocation' 
  | 'reports' 
  | 'notifications';

export default function CODashboard() {
  const { isAuthReady, user } = useFirebase();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentView = (searchParams.get('view') || 'overview') as COView;
  
  const setCurrentView = (view: COView) => {
    setSearchParams({ view });
  };

  const [stats, setStats] = useState({
    pendingRequests: 0,
    underReview: 0,
    idsGenerated: 0,
    forwardedToDistrict: 0,
    returnedToAC: 0,
    expiringSoon: 0,
    activeCertifications: 0,
    revocations: 0
  });
  const [loading, setLoading] = useState(true);

  const [allBadges, setAllBadges] = useState<any[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [certId, setCertId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isAuthReady) return;

    const unsubBadges = onSnapshot(collection(db, 'issuedBadges'), (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      
      const sortedData = [...data].sort((a, b) => {
        const timeA = a.submittedAt?.seconds || 0;
        const timeB = b.submittedAt?.seconds || 0;
        return timeB - timeA;
      });

      setAllBadges(sortedData);
      
      setStats({
        pendingRequests: sortedData.filter(d => d.status === 'Submitted to CO').length,
        underReview: sortedData.filter(d => d.status === 'Under CO Review').length,
        idsGenerated: sortedData.filter(d => d.status === 'Badge ID Generated').length,
        forwardedToDistrict: sortedData.filter(d => d.status === 'Forwarded to District Office' || d.status === 'Pending District Office Approval').length,
        returnedToAC: sortedData.filter(d => d.status === 'Returned by CO').length,
        expiringSoon: 0, // Logic for date comparison
        activeCertifications: sortedData.filter(d => d.status === 'Published to Learner Wallet' || d.status === 'Approved for Publication').length,
        revocations: sortedData.filter(d => d.status === 'Revoked' || d.status === 'Suspended').length
      });
      
      setLoading(false);
    }, (err) => {
      console.error("CO Dashboard Fetch Error:", err);
      handleFirestoreError(err, OperationType.GET, 'issuedBadges');
    });

    return () => unsubBadges();
  }, [isAuthReady]);

  const updateStatus = async (id: string, status: string, additionalData: any = {}) => {
    try {
      await updateDoc(doc(db, 'issuedBadges', id), {
        status,
        updatedAt: serverTimestamp(),
        ...additionalData
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'issuedBadges');
    }
  };

  const handleIssueID = async () => {
    if (!selectedRequest || !certId.trim()) return;
    setIsSubmitting(true);
    
    const issueDate = new Date();
    const expiryDate = new Date();
    expiryDate.setFullYear(issueDate.getFullYear() + 3); // Default 3 years validity

    await updateStatus(selectedRequest.id, 'Badge ID Generated', {
      certificationId: certId,
      badgeGeneratedAt: serverTimestamp(),
      badgeGeneratedBy: user?.displayName || user?.email || 'CO Officer',
      issueDate: serverTimestamp(),
      expiryDate: expiryDate,
      validityPeriod: '3 Years',
      ncReferenceNumber: `TESDA-NC-${Math.floor(Math.random() * 1000000)}`,
      verificationCode: Math.random().toString(36).substring(2, 10).toUpperCase()
    });
    setIsIssueModalOpen(false);
    setCertId('');
    setSelectedRequest(null);
    setIsSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Main Content Area */}
      <div className="overflow-auto h-[max-content] pb-20">
        {currentView === 'overview' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-between bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-blue-600">Program Oversight</h1>
                <p className="text-slate-500 font-medium">Monitoring national Skilled and Master badge protocols.</p>
              </div>
              <div className="flex gap-4">
                <div className="text-right">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Registry</p>
                  <p className="text-lg font-bold text-slate-900">{stats.activeCertifications} Items</p>
                </div>
                <div className="h-10 w-px bg-slate-100 self-center" />
                <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 rounded-xl border border-emerald-100 text-xs font-bold text-emerald-600">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  LIVE OPS
                </div>
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid md:grid-cols-3 xl:grid-cols-6 gap-4">
              {[
                { label: 'Pending CO', value: stats.pendingRequests, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
                { label: 'Reviewing', value: stats.underReview, icon: Activity, color: 'text-blue-600', bg: 'bg-blue-50' },
                { label: 'IDs Ready', value: stats.idsGenerated, icon: Hash, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                { label: 'Forwarded', value: stats.forwardedToDistrict, icon: ArrowRight, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                { label: 'Returned', value: stats.returnedToAC, icon: XCircle, color: 'text-rose-600', bg: 'bg-rose-50' },
                { label: 'Published', value: stats.activeCertifications, icon: ShieldCheck, color: 'text-emerald-600', bg: 'bg-emerald-50' },
              ].map((stat) => (
                <Card key={stat.label} className="border-slate-200 shadow-sm overflow-hidden group hover:border-blue-200 transition-colors">
                  <CardContent className="p-5 relative">
                    <div className={`p-1.5 rounded-lg ${stat.bg} ${stat.color} w-fit mb-3 group-hover:scale-110 transition-transform`}>
                      <stat.icon className="h-4 w-4" />
                    </div>
                    <p className="text-2xl font-black text-slate-900 tracking-tight">{stat.value}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">{stat.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="border-slate-200 overflow-hidden shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between bg-white border-b border-slate-100">
                <div>
                  <CardTitle className="text-lg text-slate-900">Recent Assessment Center Requests</CardTitle>
                  <CardDescription>Actionable submissions requiring Certification Office attention.</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="text-xs font-bold border-slate-200" onClick={() => setCurrentView('requests')}>View All Queue</Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-400 font-bold border-b border-slate-100">
                      <tr>
                        <th className="px-6 py-4 border-b">Request ID</th>
                        <th className="px-6 py-4 border-b">Learner</th>
                        <th className="px-6 py-4 border-b">Badge & Qual</th>
                        <th className="px-6 py-4 border-b">Assessment Center</th>
                        <th className="px-6 py-4 border-b">Pathway</th>
                        <th className="px-6 py-4 border-b">Status</th>
                        <th className="px-6 py-4 border-b text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {allBadges.slice(0, 10).map((req) => (
                        <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 font-mono text-[10px] text-slate-500">#{req.id.slice(0, 8)}</td>
                          <td className="px-6 py-4 font-bold text-slate-900">{req.learnerName}</td>
                          <td className="px-6 py-4">
                            <Badge variant="outline" className={`text-[10px] font-bold ${req.badgeType === 'Master Badge' ? 'border-amber-200 text-amber-700 bg-amber-50' : 'border-blue-200 text-blue-700 bg-blue-50'}`}>
                              {req.badgeType}
                            </Badge>
                            <p className="text-[10px] text-slate-500 font-medium mt-0.5 truncate max-w-[150px]">{req.qualification}</p>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2 text-slate-600">
                              <Building2 className="h-3 w-3 text-slate-400" />
                              <span className="text-xs">{req.issuerName}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <Badge variant="ghost" className="text-[10px] uppercase font-black text-slate-500 bg-slate-100 px-1.5 h-5 rounded">
                              {req.pathway || 'NC ASSESSMENT'}
                            </Badge>
                          </td>
                          <td className="px-6 py-4">
                            <Badge className="text-[10px] font-bold uppercase tracking-tight">
                              {req.status}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-xs h-8 text-blue-600 font-bold"
                              onClick={() => {
                                setSelectedRequest(req);
                                setIsDetailModalOpen(true);
                              }}
                            >
                              VIEW
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {currentView === 'requests' && (
          <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Skilled & Master Requests</h2>
              <p className="text-sm text-slate-500 font-medium">Manage incoming submissions from Assessment Centers nationwide.</p>
            </div>
            
            <Card className="border-slate-200">
              <CardContent className="p-0">
                <div className="p-4 bg-slate-50/50 border-b flex items-center justify-between">
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="text-xs font-bold bg-white">All Requests</Button>
                    <Button variant="ghost" size="sm" className="text-xs font-bold">Submitted</Button>
                    <Button variant="ghost" size="sm" className="text-xs font-bold">Under Review</Button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm font-medium text-slate-600">
                    <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-400">
                      <tr>
                        <th className="px-6 py-4">Learner & Badge</th>
                        <th className="px-6 py-4">Assessment Center</th>
                        <th className="px-6 py-4">Pathway</th>
                        <th className="px-6 py-4">Submitted</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {allBadges.filter(r => ['Submitted to CO', 'Under CO Review', 'Returned by CO'].includes(r.status)).map((req) => (
                        <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4">
                            <p className="text-slate-900 font-bold">{req.learnerName}</p>
                            <p className="text-[10px] text-blue-600 font-bold uppercase">{req.badgeType} • {req.qualification}</p>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <Building2 className="h-3 w-3 text-slate-400" />
                              <span className="text-xs">{req.issuerName}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <Badge variant="outline" className={`text-[9px] px-1.5 h-4 ${req.pathway === 'RPL' ? 'border-purple-200 text-purple-700 bg-purple-50' : 'border-emerald-200 text-emerald-700 bg-emerald-50'}`}>
                              {req.pathway}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 text-xs">
                            {req.submittedAt?.toDate().toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4">
                            <Badge className="text-[10px] font-bold">{req.status}</Badge>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-blue-600 font-bold text-xs"
                              onClick={() => {
                                setSelectedRequest(req);
                                setIsDetailModalOpen(true);
                              }}
                            >
                              View Details
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {currentView === 'id-generation' && (
          <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Badge ID Generation</h2>
              <p className="text-sm text-slate-500 font-medium">Finalize approved certifications by issuing unique national badge IDs.</p>
            </div>
            
            <div className="grid gap-4">
              {allBadges.filter(r => r.status === 'Approved for Badge ID Generation' || r.status === 'Under CO Review').map((req) => (
                <Card key={req.id} className="border-slate-200 hover:border-blue-200 transition-all">
                  <div className="p-6 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                      <div className="h-12 w-12 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-slate-500">
                        {req.learnerName.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{req.learnerName}</p>
                        <p className="text-xs text-slate-500">{req.badgeType} • {req.qualification}</p>
                        <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-wider">{req.issuerName} • {req.pathway}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="text-[10px] font-bold uppercase">{req.status}</Badge>
                      <Button 
                        size="sm" 
                        className="bg-blue-600 hover:bg-blue-700 font-bold text-xs h-9 px-4"
                        onClick={() => {
                          setSelectedRequest(req);
                          const year = new Date().getFullYear();
                          const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
                          setCertId(`TESDA-NC-${year}-${random}`);
                          setIsIssueModalOpen(true);
                        }}
                      >
                        <Hash className="h-4 w-4 mr-2" />
                        GENERATE BADGE ID
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {currentView === 'forwarding' && (
          <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Forward to District Office</h2>
              <p className="text-sm text-slate-500 font-medium">Ready high-level badge records for District Office publication approval.</p>
            </div>
            
            <Card className="border-slate-200">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-400">
                      <tr>
                        <th className="px-6 py-4">Badge ID</th>
                        <th className="px-6 py-4">Learner</th>
                        <th className="px-6 py-4">Badge & Qual</th>
                        <th className="px-6 py-4">Assigned District</th>
                        <th className="px-6 py-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-600">
                      {allBadges.filter(r => r.status === 'Badge ID Generated').map((req) => (
                        <tr key={req.id}>
                          <td className="px-6 py-4">
                            <Badge variant="outline" className="font-mono text-[10px] border-blue-200 text-blue-700 bg-blue-50">
                              {req.certificationId}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 font-bold text-slate-900">{req.learnerName}</td>
                          <td className="px-6 py-4">
                            <p className="text-xs">{req.badgeType}</p>
                            <p className="text-[10px] text-slate-400 truncate max-w-[200px]">{req.qualification}</p>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <Building2 className="h-3 w-3 text-slate-400" />
                              <span className="text-xs">District HQ for {req.issuerName}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="text-xs font-bold border-emerald-200 text-emerald-600 hover:bg-emerald-50 h-8"
                              onClick={() => updateStatus(req.id, 'Forwarded to District Office', {
                                forwardedAt: serverTimestamp(),
                                forwardedBy: user?.displayName || user?.email || 'CO Officer'
                              })}
                            >
                              Forward to District
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {currentView === 'validity' && (
          <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Validity Monitoring</h2>
              <p className="text-sm text-slate-500 font-medium">Tracking lifecycle of all Skilled and Master technical credentials.</p>
            </div>
            <Card className="border-slate-200">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-400 font-bold">
                      <tr>
                        <th className="px-6 py-4">Badge ID</th>
                        <th className="px-6 py-4">Learner</th>
                        <th className="px-6 py-4">Issue Date</th>
                        <th className="px-6 py-4">Expiry Date</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {allBadges.filter(b => b.certificationId && b.status.includes('Published')).map((req) => (
                        <tr key={req.id}>
                          <td className="px-6 py-4 font-mono text-[11px] font-bold text-blue-700">{req.certificationId}</td>
                          <td className="px-6 py-4 font-bold text-slate-900">{req.learnerName}</td>
                          <td className="px-6 py-4 text-slate-500">{req.issueDate?.toDate().toLocaleDateString() || 'Recently Issued'}</td>
                          <td className="px-6 py-4 text-slate-500">{req.expiryDate?.toDate().toLocaleDateString() || '3 Years from Issue'}</td>
                          <td className="px-6 py-4">
                            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-black uppercase">Active</Badge>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <Button variant="ghost" size="sm" className="text-[11px] font-bold h-8">Flag for Renewal</Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {currentView === 'renewal' && (
          <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Renewal Management</h2>
              <p className="text-sm text-slate-500 font-medium">Processing badge extension requests for expiring NC certifications.</p>
            </div>
            <div className="text-center py-20 bg-slate-50 border border-dashed rounded-3xl border-slate-200">
              <RefreshCw className="h-12 w-12 mx-auto text-slate-300 mb-4" />
              <h3 className="text-lg font-bold text-slate-900">No Pending Renewals</h3>
              <p className="text-sm text-slate-500 font-medium">Standard NC/CoC renewals are processed every quarter.</p>
            </div>
          </div>
        )}

        {currentView === 'revocation' && (
          <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Revocation / Suspension</h2>
              <p className="text-sm text-slate-500 font-medium">Protocol enforcement and integrity-based badge cancellation.</p>
            </div>
            <div className="grid gap-4">
              <div className="p-6 bg-slate-50 border rounded-2xl flex items-center justify-between">
                <div className="flex gap-4 items-center">
                  <div className="h-10 w-10 rounded-full bg-rose-100 flex items-center justify-center">
                    <ShieldAlert className="h-5 w-5 text-rose-600" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">Policy Violation Detected</p>
                    <p className="text-xs text-slate-500">Center #402 reported inconsistent assessment evidence for Master Badge.</p>
                  </div>
                </div>
                <Button variant="destructive" size="sm" className="font-bold text-xs">INVESTIGATE CASE</Button>
              </div>
            </div>
          </div>
        )}

        {currentView === 'reports' && (
          <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Certification Reports</h2>
              <p className="text-sm text-slate-500 font-medium">Statistical breakdown of national high-level accreditation issuance.</p>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="border-slate-200 p-6">
                <h3 className="text-sm font-bold text-slate-900 mb-4 uppercase tracking-widest text-slate-400">Issuance by Badge Type</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span>Skilled Badge</span>
                      <span>{allBadges.filter(b => b.badgeType?.includes('Skilled')).length}</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-600" style={{ width: '65%' }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span>Master Badge</span>
                      <span>{allBadges.filter(b => b.badgeType?.includes('Master')).length}</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-500" style={{ width: '35%' }}></div>
                    </div>
                  </div>
                </div>
              </Card>
              <Card className="border-slate-200 p-6 flex items-center justify-center">
                <div className="text-center">
                  <TrendingUp className="h-8 w-8 text-blue-100 mx-auto mb-2" />
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Growth vs Last Quarter</p>
                  <p className="text-2xl font-black text-emerald-600">+14.2%</p>
                </div>
              </Card>
            </div>
          </div>
        )}

        {currentView === 'notifications' && (
          <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">System Notifications</h2>
                <p className="text-sm text-slate-500 font-medium">Real-time alerts for the Skilled & Master certification lifecycle.</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="text-[10px] font-bold h-8 border-slate-200">Export Logs</Button>
                <Button variant="ghost" className="text-[10px] font-bold h-8 text-slate-500">Mark all as read</Button>
              </div>
            </div>
            
            <div className="grid gap-3">
              {allBadges.slice(0, 10).map((log, i) => {
                const isNew = i < 3;
                return (
                  <div 
                    key={log.id} 
                    className={`p-5 rounded-2xl border flex gap-5 transition-all hover:translate-x-1 ${
                      isNew ? 'bg-white border-blue-200 shadow-sm' : 'bg-slate-50/50 border-slate-100'
                    }`}
                  >
                    <div className={`h-11 w-11 rounded-xl shrink-0 flex items-center justify-center ${
                      log.status.includes('Submitted') ? 'bg-amber-100 text-amber-600 border border-amber-200' :
                      log.status.includes('Forwarded') ? 'bg-emerald-100 text-emerald-600 border border-emerald-200' :
                      log.status.includes('Returned') ? 'bg-rose-100 text-rose-600 border border-rose-200' :
                      'bg-blue-100 text-blue-600 border border-blue-200'
                    }`}>
                      {log.status.includes('Submitted') ? <Clock className="h-5 w-5" /> :
                       log.status.includes('Forwarded') ? <ArrowRight className="h-5 w-5" /> :
                       log.status.includes('Returned') ? <XCircle className="h-5 w-5" /> :
                       <ShieldCheck className="h-5 w-5" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <p className={`text-sm font-bold ${isNew ? 'text-slate-900' : 'text-slate-600'}`}>
                          {log.status.includes('Submitted') ? 'Incoming Request: ' : 
                           log.status.includes('Forwarded') ? 'Record Forwarded: ' :
                           log.status.includes('Returned') ? 'Correction Required: ' : 'Status Verified: '}
                           <span className="text-blue-600 font-black">{log.learnerName}</span>
                        </p>
                        <span className="text-[10px] font-bold text-slate-400 capitalize">{log.submittedAt?.toDate().toLocaleDateString() || 'Today'}</span>
                      </div>
                      <p className="text-xs text-slate-500 font-medium mb-2">
                        {log.badgeType} issuance for {log.qualification} via {log.issuerName}. Current status: <span className="font-bold">{log.status}</span>.
                      </p>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-[9px] font-black uppercase bg-slate-100 text-slate-600 border-none">
                          REF: {log.id.slice(0, 8)}
                        </Badge>
                        <span className="h-1 w-1 rounded-full bg-slate-300" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{log.districtOfficeId || 'CO'} HQ</span>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="self-center font-black text-[11px] text-blue-600 h-8"
                      onClick={() => {
                        setSelectedRequest(log);
                        setIsDetailModalOpen(true);
                      }}
                    >
                      MANAGE
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Fallback for other views */}
        {!['overview', 'requests', 'id-generation', 'forwarding', 'validity', 'renewal', 'revocation', 'reports', 'notifications'].includes(currentView) && (
          <div className="py-20 text-center space-y-4">
            <div className="h-20 w-20 rounded-full bg-slate-100 flex items-center justify-center mx-auto">
              <Activity className="h-10 w-10 text-slate-300" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">{currentView.charAt(0).toUpperCase() + currentView.slice(1).replace('-', ' ')}</h3>
              <p className="text-slate-500">This module is part of the extended management suite. Interactive tools are under maintenance.</p>
            </div>
            <Button variant="ghost" onClick={() => setCurrentView('overview')} className="text-blue-600 font-bold">Return to Dashboard</Button>
          </div>
        )}
      </div>


      {/* Request Detail Modal */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-blue-600" />
              Certification Request Details
            </DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-6 pb-6 border-b border-slate-100">
                <div className="space-y-3">
                  <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Learner Information</Label>
                  <div className="p-3 bg-slate-50 rounded-xl">
                    <p className="text-sm font-bold text-slate-900">{selectedRequest.learnerName}</p>
                    <p className="text-xs text-slate-500">Learner ID: {selectedRequest.learnerEmail || 'N/A'}</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Assessment Center</Label>
                  <div className="p-3 bg-slate-50 rounded-xl">
                    <p className="text-sm font-bold text-slate-900">{selectedRequest.issuerName}</p>
                    <p className="text-xs text-slate-500">HQ Authority: {selectedRequest.districtOfficeId || 'Central'}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold text-slate-400 uppercase">Qualification</Label>
                    <p className="text-sm font-bold text-slate-800">{selectedRequest.qualification}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold text-slate-400 uppercase">Badge Type</Label>
                    <Badge variant="outline" className="text-xs font-bold border-blue-200 text-blue-700 bg-blue-50">
                      {selectedRequest.badgeType}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold text-slate-400 uppercase">Assessment Result</Label>
                    <p className="text-sm font-bold text-emerald-600">COMPETENT / PASS</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold text-slate-400 uppercase">Pathway</Label>
                    <p className="text-sm font-bold text-slate-800 uppercase">{selectedRequest.pathway || 'NC Assessment'}</p>
                  </div>
                </div>

                <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100 space-y-3">
                  <p className="text-[10px] font-bold text-blue-600 uppercase">Supporting Evidence & Portfolio</p>
                  <div className="flex gap-4">
                    {selectedRequest.evidenceUrl ? (
                      <a 
                        href={selectedRequest.evidenceUrl} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="flex items-center gap-2 p-2 bg-white rounded-lg border border-blue-200 text-xs font-bold text-blue-600 hover:bg-blue-50 transition-colors"
                      >
                        <Activity className="h-4 w-4" />
                        View Assessment Records
                      </a>
                    ) : (
                      <p className="text-xs text-slate-400 font-medium italic">No external portfolio link provided.</p>
                    )}
                    {selectedRequest.pathway === 'RPL' && (
                      <p className="text-[10px] text-purple-600 font-bold bg-purple-50 px-2 py-1 rounded border border-purple-100 italic">
                        RECOGNITION OF PRIOR LEARNING: VERIFY EXTERNAL EVIDENCE
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-slate-400 uppercase font-bold tracking-wider">CO Remarks</Label>
                  <Input placeholder="Add notes for the Assessment Center or District Office..." className="text-xs h-9" />
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <Button 
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 font-bold text-xs"
                  onClick={async () => {
                    await updateStatus(selectedRequest.id, 'Approved for Badge ID Generation', {
                      coApprovedAt: serverTimestamp(),
                      coApprovedBy: user?.displayName || user?.email || 'CO Officer'
                    });
                    setIsDetailModalOpen(false);
                    setCurrentView('id-generation');
                  }}
                >
                  Approve for Badge ID Gen
                </Button>
                <Button 
                  variant="outline" 
                  className="flex-1 text-rose-600 border-rose-100 hover:bg-rose-50 font-bold text-xs"
                  onClick={async () => {
                    await updateStatus(selectedRequest.id, 'Returned by CO', {
                      returnedAt: serverTimestamp(),
                      returnedBy: user?.displayName || user?.email || 'CO Officer'
                    });
                    setIsDetailModalOpen(false);
                  }}
                >
                  Return for Correction
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Certification ID Issue Modal */}
      <Dialog open={isIssueModalOpen} onOpenChange={setIsIssueModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Hash className="h-5 w-5 text-blue-600" />
              Assign Certification ID
            </DialogTitle>
            <DialogDescription>
              This unique ID will be the official citation for {selectedRequest?.learnerName}'s certification.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Target Learner</p>
                <p className="text-sm font-bold text-slate-800">{selectedRequest?.learnerName}</p>
              </div>
              <Badge variant="outline" className="text-[10px] font-bold h-5 bg-white">{selectedRequest?.badgeType}</Badge>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-700 uppercase tracking-tight">Official Certification ID (Unique Badge ID)</Label>
              <Input 
                value={certId} 
                onChange={(e) => setCertId(e.target.value)} 
                placeholder="TESDA-NC-2024-XXXXX"
                className="font-mono text-blue-600 font-bold h-12 text-lg shadow-inner bg-blue-50/30"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-slate-400 uppercase">Validity Period</Label>
                <Badge variant="outline" className="w-full justify-start h-9 px-3 text-xs bg-slate-50 border-slate-200">3 Years (Standard)</Badge>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-slate-400 uppercase">Issue Date</Label>
                <div className="h-9 px-3 rounded-md border border-slate-200 flex items-center bg-slate-50 text-xs text-slate-600">
                  {new Date().toLocaleDateString()}
                </div>
              </div>
            </div>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 flex gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
              <p className="text-[10px] text-amber-800 font-medium">
                IMPORTANT: This ID will be permanently recorded in the National Registry and verifiable by employers.
              </p>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="ghost" onClick={() => setIsIssueModalOpen(false)} className="font-bold text-xs">CANCEL</Button>
            <Button 
              className="bg-blue-600 hover:bg-blue-700 font-bold text-xs flex-1" 
              onClick={handleIssueID}
              disabled={isSubmitting || !certId.trim()}
            >
              {isSubmitting ? "PROCESSING..." : "FINALIZE & FORWARD"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

