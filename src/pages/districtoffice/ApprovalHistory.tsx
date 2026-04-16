import React, { useEffect, useState } from 'react';
import { 
  Search, 
  Filter, 
  Eye, 
  CheckCircle2, 
  XCircle,
  Building2,
  User,
  History,
  Download
} from 'lucide-react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BadgeIssuanceRequest } from '@/src/types';
import RequestDetailsModal from '@/src/components/districtoffice/RequestDetailsModal';

export default function ApprovalHistory() {
  const { userProfile, isAuthReady } = useFirebase();
  const [approvedRequests, setApprovedRequests] = useState<BadgeIssuanceRequest[]>([]);
  const [rejectedRequests, setRejectedRequests] = useState<BadgeIssuanceRequest[]>([]);
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

    const districtId = userProfile.organizationId;
    const path = 'issuedBadges';
    
    // Approved query
    const qApproved = query(
      collection(db, path),
      where('districtOfficeId', '==', districtId),
      where('status', '==', 'Approved'),
      orderBy('approvedAt', 'desc')
    );

    // Rejected query
    const qRejected = query(
      collection(db, path),
      where('districtOfficeId', '==', districtId),
      where('status', '==', 'Rejected'),
      orderBy('approvedAt', 'desc')
    );

    const unsubApproved = onSnapshot(qApproved, (snapshot) => {
      setApprovedRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as BadgeIssuanceRequest[]);
    }, (error) => handleFirestoreError(error, OperationType.GET, path));

    const unsubRejected = onSnapshot(qRejected, (snapshot) => {
      setRejectedRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as BadgeIssuanceRequest[]);
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.GET, path));

    return () => {
      unsubApproved();
      unsubRejected();
    };
  }, [userProfile, isAuthReady]);

  const handleViewDetails = (request: BadgeIssuanceRequest) => {
    setSelectedRequest(request);
    setIsModalOpen(true);
  };

  const renderTable = (data: BadgeIssuanceRequest[], type: 'Approved' | 'Rejected') => {
    const filtered = data.filter(req => 
      req.learnerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.badgeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.issuerName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
      <div className="rounded-md border border-slate-100">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead>Learner</TableHead>
              <TableHead>Badge</TableHead>
              <TableHead>Source Center</TableHead>
              <TableHead>{type === 'Approved' ? 'Approved Date' : 'Rejected Date'}</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length > 0 ? (
              filtered.map((req) => (
                <TableRow key={req.id} className="hover:bg-slate-50/50 transition-colors">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center">
                        <User className="h-4 w-4 text-slate-500" />
                      </div>
                      <span className="font-bold text-slate-900">{req.learnerName}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-blue-700">{req.badgeName}</span>
                      <span className="text-[10px] text-slate-500 uppercase font-medium">{req.badgeType}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-3 w-3 text-slate-400" />
                      <span className="text-sm text-slate-600">{req.issuerName}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-slate-500">
                      {new Date(req.approvedAt?.seconds * 1000).toLocaleDateString()}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge className={type === 'Approved' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' : 'bg-rose-100 text-rose-700 hover:bg-rose-100'}>
                      {type === 'Approved' ? (
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                      ) : (
                        <XCircle className="h-3 w-3 mr-1" />
                      )}
                      {req.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-8 gap-1.5"
                      onClick={() => handleViewDetails(req)}
                    >
                      <Eye className="h-3.5 w-3.5" />
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-slate-500">
                  No records found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    );
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Approval History</h1>
          <p className="text-slate-500">View and manage past badge issuance decisions.</p>
        </div>
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Export History
        </Button>
      </div>

      <Tabs defaultValue="approved" className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between gap-4">
          <TabsList className="bg-slate-100 p-1">
            <TabsTrigger value="approved" className="data-[state=active]:bg-white data-[state=active]:text-emerald-600 gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Approved
              <Badge variant="secondary" className="ml-1 text-[10px]">{approvedRequests.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="rejected" className="data-[state=active]:bg-white data-[state=active]:text-rose-600 gap-2">
              <XCircle className="h-4 w-4" />
              Rejected
              <Badge variant="secondary" className="ml-1 text-[10px]">{rejectedRequests.length}</Badge>
            </TabsTrigger>
          </TabsList>

          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Search history..." 
                className="pl-9 w-64 h-9 text-sm" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button variant="outline" size="icon" className="h-9 w-9">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <TabsContent value="approved" className="m-0">
          <Card className="border-slate-200">
            <CardContent className="p-0">
              {renderTable(approvedRequests, 'Approved')}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rejected" className="m-0">
          <Card className="border-slate-200">
            <CardContent className="p-0">
              {renderTable(rejectedRequests, 'Rejected')}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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
