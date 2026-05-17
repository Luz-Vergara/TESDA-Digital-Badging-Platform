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
  Users,
  Award
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
import { BadgeRequest, ProgramOffering } from '@/src/types';
import RequestDetailsModal from '@/src/components/districtoffice/RequestDetailsModal';

export default function ApprovalQueue() {
  const { userProfile, isAuthReady, user } = useFirebase();
  const [requests, setRequests] = useState<BadgeRequest[]>([]);
  const [offerings, setOfferings] = useState<ProgramOffering[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<BadgeRequest | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (!isAuthReady || !user || !userProfile?.organizationId) {
      if (isAuthReady) setLoading(false);
      return;
    }

    // Badge Requests for this district
    const q = query(
      collection(db, 'badgeRequests'),
      where('districtOfficeId', '==', userProfile.organizationId),
      where('status', '==', 'Pending Review'),
      orderBy('submittedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const requestData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as BadgeRequest[];
      setRequests(requestData);
      
      // Fetch offering titles for display
      if (requestData.length > 0) {
        const offeringIds = [...new Set(requestData.map(r => r.programOfferingId))];
        const offeringDocs = await Promise.all(offeringIds.map(id => getDoc(doc(db, 'programOfferings', id))));
        const offeringData = offeringDocs.filter(d => d.exists()).map(d => ({ id: d.id, ...d.data() })) as ProgramOffering[];
        setOfferings(offeringData);
      }
      
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'badgeRequests');
    });

    return () => unsubscribe();
  }, [userProfile, isAuthReady, user]);

  const filteredRequests = requests.filter(req => {
    const offering = offerings.find(o => o.id === req.programOfferingId);
    const searchString = `${offering?.programTitle} ${req.requestType} ${req.badgeType}`.toLowerCase();
    return searchString.includes(searchQuery.toLowerCase());
  });

  if (loading) return <div className="p-8 text-center">Loading approval queue...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Approval Queue</h1>
          <p className="text-slate-500">Validation requests from Training and Assessment Centers.</p>
        </div>
        <Badge variant="secondary" className="px-3 py-1 gap-2">
          <Clock className="h-3 w-3" />
          {requests.length} Pending Approval
        </Badge>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Requests for Review</CardTitle>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Search requests..." 
                className="pl-9 w-64"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Request Type</TableHead>
                <TableHead>Program / Qualification</TableHead>
                <TableHead>Source Center</TableHead>
                <TableHead>Learners</TableHead>
                <TableHead>Submitted Date</TableHead>
                <TableHead className="text-right pr-6">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRequests.map((req) => {
                const offering = offerings.find(o => o.id === req.programOfferingId);
                return (
                  <TableRow key={req.id}>
                    <TableCell className="pl-6">
                      <Badge variant="outline" className="text-[10px] gap-1 px-2 uppercase font-bold">
                        {req.requestType}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-900">{offering?.programTitle || 'Program Title'}</span>
                        <span className="text-[10px] text-blue-600 font-bold uppercase">{req.badgeType}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm font-medium">
                      {offering?.trainingCenterName || 'Source Center'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 font-bold text-slate-600">
                        <Users className="h-3.5 w-3.5" />
                        {req.learnerIds.length}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {req.submittedAt ? new Date(req.submittedAt.seconds * 1000).toLocaleDateString() : 'N/A'}
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-blue-600 font-bold gap-1.5"
                        onClick={() => {
                          setSelectedRequest(req);
                          setIsModalOpen(true);
                        }}
                      >
                        <Eye className="h-4 w-4" /> Review
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredRequests.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-slate-500 italic">No pending requests found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
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
