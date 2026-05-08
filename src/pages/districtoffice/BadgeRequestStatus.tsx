import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Search, 
  Filter, 
  Download,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  ExternalLink,
  ChevronDown
} from 'lucide-react';
import { collection, query, where, onSnapshot, orderBy, doc, getDoc } from 'firebase/firestore';
import { db } from '@/src/lib/firebase';
import { useFirebase } from '@/src/lib/FirebaseProvider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type RequestStatus = 'Pending Approval' | 'Pending Certification' | 'Pending District Approval' | 'Approved' | 'Rejected' | 'Returned for Correction' | 'Published' | 'Expired' | 'Revoked' | 'All';

export default function BadgeRequestStatus() {
  const { userProfile } = useFirebase();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<RequestStatus>('All');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!userProfile?.organizationId) return;

    const fetchStatusRequests = async () => {
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

      let q = query(
        collection(db, 'issuedBadges'),
        where('districtOfficeId', 'in', districtIdentifiers),
        orderBy('submittedAt', 'desc')
      );

      if (statusFilter !== 'All') {
        q = query(
          collection(db, 'issuedBadges'),
          where('districtOfficeId', 'in', districtIdentifiers),
          where('status', '==', statusFilter),
          orderBy('submittedAt', 'desc')
        );
      }

      const unsub = onSnapshot(q, (snapshot) => {
        setRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setLoading(false);
      });

      return unsub;
    };

    let unsubPromise = fetchStatusRequests();
    return () => {
      unsubPromise.then(unsub => unsub && unsub());
    };
  }, [userProfile, statusFilter]);

  const filteredRequests = requests.filter(req => 
    req.learnerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    req.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    req.badgeName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    req.qualification?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Approved':
      case 'Published':
        return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none">Active / {status}</Badge>;
      case 'Rejected':
      case 'Revoked':
        return <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-100 border-none">{status}</Badge>;
      case 'Pending Approval':
        return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-none">Pending</Badge>;
      case 'Returned for Correction':
        return <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100 border-none">Returned</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Badge Request Status</h1>
          <p className="text-slate-500">Track all badge requests submitted by centers in your district.</p>
        </div>
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Export Report
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Search learner, qualification, or ID..." 
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button variant="outline" className="gap-2">
                      <Filter className="h-4 w-4" />
                      Status: {statusFilter}
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  }
                />
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setStatusFilter('All')}>All Requests</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter('Pending Approval')}>Pending Approval (Normal)</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter('Pending Certification')}>Pending Certification (CO)</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter('Pending District Approval')}>Pending District Approval</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter('Approved')}>Approved</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter('Rejected')}>Rejected</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter('Returned for Correction')}>Returned for Correction</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter('Published')}>Published</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter('Expired')}>Expired</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter('Revoked')}>Revoked</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Request ID</TableHead>
                  <TableHead>Learner Name</TableHead>
                  <TableHead>Badge Type</TableHead>
                  <TableHead>Source Center</TableHead>
                  <TableHead>Date Submitted</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array(5).fill(0).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={7} className="h-12 animate-pulse bg-slate-50" />
                    </TableRow>
                  ))
                ) : filteredRequests.length > 0 ? (
                  filteredRequests.map((req) => (
                    <TableRow key={req.id}>
                      <TableCell className="font-mono text-xs font-semibold">{req.id.substring(0, 8)}</TableCell>
                      <TableCell className="font-medium">{req.learnerName}</TableCell>
                      <TableCell>{req.badgeType}</TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium">{req.issuerName || req.trainingCenterName || req.assessmentCenterName}</p>
                          <p className="text-[10px] text-slate-500 uppercase font-bold">{req.issuerType || req.sourceType || 'Center'}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-500">
                        {req.submittedAt?.toDate ? req.submittedAt.toDate().toLocaleDateString() : 'N/A'}
                      </TableCell>
                      <TableCell>{getStatusBadge(req.status)}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" className="gap-2">
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-slate-500">
                      No requests found matching your filters.
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
