import React, { useEffect, useState } from 'react';
import { 
  Search, 
  Filter, 
  Eye, 
  CheckCircle2, 
  XCircle,
  Clock,
  Building2,
  User,
  Hash
} from 'lucide-react';
import { collection, query, where, onSnapshot, orderBy, doc, getDoc } from 'firebase/firestore';
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
import { BadgeIssuanceRequest } from '@/src/types';
import RequestDetailsModal from '@/src/components/districtoffice/RequestDetailsModal';

export default function ApprovalQueue() {
  const { userProfile, isAuthReady } = useFirebase();
  const [requests, setRequests] = useState<BadgeIssuanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<BadgeIssuanceRequest | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (!isAuthReady) return;

    if (!userProfile?.organizationId) {
      setLoading(false);
      return;
    }

    const fetchQueue = async () => {
      const districtId = userProfile.organizationId;
      let districtName = "";

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

      const path = 'issuedBadges';
      // Fetch all requests for this district to filter client-side
      const q = query(
        collection(db, path),
        where('districtOfficeId', 'in', districtIdentifiers),
        orderBy('submittedAt', 'desc')
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const data = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter((req: any) => {
            // Proficient badges (or normal items) that are directly routed here
            const isStandardPending = req.status === 'Pending Approval';
            // Skilled/Master badges that have been processed by CO
            const isForwardedFromCO = req.status === 'Forwarded to District Office';
            
            return isStandardPending || isForwardedFromCO;
          }) as any[];
        setRequests(data as any);
        setLoading(false);
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, path);
      });

      return unsubscribe;
    };

    let unsubPromise = fetchQueue();
    return () => {
      unsubPromise.then(unsub => unsub && unsub());
    };
  }, [userProfile, isAuthReady]);

  const filteredRequests = requests.filter(req => 
    req.learnerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    req.badgeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    req.issuerName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleViewDetails = (request: BadgeIssuanceRequest) => {
    setSelectedRequest(request);
    setIsModalOpen(true);
  };

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
            <h1 className="text-3xl font-bold text-slate-900">Approval Queue</h1>
            <p className="text-slate-500">Account Pending Configuration</p>
          </div>
        </div>
        
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-12 text-center">
            <h2 className="text-xl font-bold text-amber-900 mb-2">Organization Not Linked</h2>
            <p className="text-amber-800 max-w-md mx-auto">
              Your account is not yet linked to a specific TESDA District Office. 
              Please contact the Central Admin to assign your account to an organization.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Approval Queue</h1>
          <p className="text-slate-500">Review and validate pending badge issuance requests.</p>
        </div>
        <Badge variant="secondary" className="px-3 py-1 gap-2">
          <Clock className="h-3 w-3" />
          {requests.length} Pending
        </Badge>
      </div>

      <Card className="border-slate-200">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">Pending Requests</CardTitle>
            <CardDescription>Review submissions from training and assessment centers</CardDescription>
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Search requests..." 
                className="pl-9 w-64 h-9 text-sm" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button variant="outline" size="icon" className="h-9 w-9">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-slate-100">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead>Learner</TableHead>
                  <TableHead>Badge / Type</TableHead>
                  <TableHead>Source Center</TableHead>
                  <TableHead>Submitted By</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.length > 0 ? (
                  filteredRequests.map((req) => (
                    <TableRow key={req.id} className="hover:bg-slate-50/50 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center">
                            <User className="h-4 w-4 text-slate-500" />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-900">{req.learnerName}</span>
                            <span className="text-[10px] text-slate-500 font-mono uppercase">{req.learnerId}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-blue-700">{req.badgeName}</span>
                          <span className="text-[10px] text-slate-500 uppercase font-medium">{req.badgeType}</span>
                          {req.certificationId && (
                            <div className="mt-1 flex items-center gap-1.5 px-2 py-0.5 rounded bg-blue-50 border border-blue-100 w-fit">
                              <Hash className="h-2.5 w-2.5 text-blue-600" />
                              <span className="text-[9px] font-bold text-blue-600">ID: {req.certificationId}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-3 w-3 text-slate-400" />
                          <span className="text-sm text-slate-600">{req.issuerName}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-slate-600">{req.submittedByName}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-slate-500">
                          {new Date(req.submittedAt?.seconds * 1000).toLocaleDateString()}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 gap-1.5"
                            onClick={() => handleViewDetails(req)}
                          >
                            <Eye className="h-3.5 w-3.5" />
                            Details
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                            onClick={() => handleViewDetails(req)}
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                            onClick={() => handleViewDetails(req)}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-slate-500">
                      {searchQuery ? 'No requests match your search.' : 'No pending requests in the queue.'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <RequestDetailsModal 
        request={selectedRequest}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedRequest(null);
        }}
      />
    </div>
  );
}
