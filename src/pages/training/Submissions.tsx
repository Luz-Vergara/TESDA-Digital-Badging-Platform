import React, { useEffect, useState } from 'react';
import { 
  History as HistoryIcon, 
  Search, 
  Filter, 
  Eye,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Upload
} from 'lucide-react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot 
} from 'firebase/firestore';
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
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { BadgeIssuanceRequest } from '@/src/types';

export default function Submissions() {
  const { user, isAuthReady } = useFirebase();
  const [requests, setRequests] = useState<BadgeIssuanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<BadgeIssuanceRequest | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  useEffect(() => {
    if (!isAuthReady || !user) return;

    const path = 'issuedBadges';
    const q = query(
      collection(db, path),
      where('issuerId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as BadgeIssuanceRequest[];
      setRequests(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });

    return () => unsubscribe();
  }, [user, isAuthReady]);

  const filteredRequests = requests.filter(r => 
    r.learnerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.badgeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.id?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
          <h1 className="text-3xl font-bold text-slate-900">Submission History</h1>
          <p className="text-slate-500">View and track all badge issuance requests submitted by your center.</p>
        </div>
      </div>

      <Card className="border-slate-200">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">All Submissions</CardTitle>
            <CardDescription>Filter and search through your center's request history</CardDescription>
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Search by learner, badge, or ID..." 
                className="pl-9 w-72 h-9 text-sm" 
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
                  <TableHead>Request ID</TableHead>
                  <TableHead>Learner</TableHead>
                  <TableHead>Badge</TableHead>
                  <TableHead>Submitted On</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.length > 0 ? (
                  filteredRequests.map((request) => (
                    <TableRow key={request.id} className="hover:bg-slate-50/50 transition-colors">
                      <TableCell className="font-mono text-[10px] text-slate-500">
                        {request.id?.slice(-8).toUpperCase()}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900">{request.learnerName}</span>
                          <span className="text-[10px] text-slate-500">{request.learnerEmail}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-slate-700">{request.badgeName}</span>
                          <span className="text-[10px] text-slate-500 uppercase">{request.badgeType}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">
                        {request.submittedAt ? new Date(request.submittedAt.seconds * 1000).toLocaleDateString() : 'N/A'}
                      </TableCell>
                      <TableCell>
                        <Badge className={
                          request.status === 'Approved' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' :
                          request.status === 'Pending Approval' ? 'bg-amber-100 text-amber-700 hover:bg-amber-100' :
                          'bg-rose-100 text-rose-700 hover:bg-rose-100'
                        }>
                          {request.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          onClick={() => {
                            setSelectedRequest(request);
                            setIsDetailsModalOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-slate-500">
                      No submissions found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Details Modal (Reused from BadgeRequests) */}
      <Dialog open={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Submission Details</DialogTitle>
            <DialogDescription>
              Full information for badge request #{selectedRequest?.id?.slice(-8).toUpperCase()}
            </DialogDescription>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Learner Information</p>
                  <p className="font-bold text-slate-900">{selectedRequest.learnerName}</p>
                  <p className="text-sm text-slate-500">{selectedRequest.learnerEmail}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Badge Details</p>
                  <p className="font-bold text-slate-900">{selectedRequest.badgeName}</p>
                  <Badge variant="outline" className="text-[10px] uppercase mt-1">
                    {selectedRequest.badgeType}
                  </Badge>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Qualification / Unit</p>
                <p className="text-sm text-slate-700">{selectedRequest.programName}</p>
              </div>

              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Evidence & Remarks</p>
                {selectedRequest.evidenceUrl ? (
                  <a 
                    href={selectedRequest.evidenceUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-blue-600 hover:underline mt-1"
                  >
                    <Upload className="h-3 w-3" />
                    View Evidence Document
                  </a>
                ) : (
                  <p className="text-sm text-slate-400 italic">No evidence URL provided</p>
                )}
                <p className="text-sm text-slate-600 mt-2 bg-slate-50 p-3 rounded-md border border-slate-100">
                  {selectedRequest.remarks || 'No remarks provided.'}
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Approval Status</p>
                  <Badge className={
                    selectedRequest.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' :
                    selectedRequest.status === 'Pending Approval' ? 'bg-amber-100 text-amber-700' :
                    'bg-rose-100 text-rose-700'
                  }>
                    {selectedRequest.status}
                  </Badge>
                </div>

                {selectedRequest.status === 'Rejected' && (
                  <div className="p-4 bg-rose-50 border border-rose-100 rounded-lg flex gap-3">
                    <AlertCircle className="h-5 w-5 text-rose-500 shrink-0" />
                    <div>
                      <p className="text-sm font-bold text-rose-900">Rejection Feedback</p>
                      <p className="text-sm text-rose-700 mt-1">{selectedRequest.rejectionComment || 'No feedback provided.'}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailsModalOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
