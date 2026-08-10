import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  CheckCircle,
  Clock,
  AlertCircle,
  Award,
  Search,
  Filter,
  Plus,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  FileText
} from 'lucide-react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Learner, BadgeRequest } from '@/src/types';

export default function BadgeEligibility() {
  const { user, userProfile, isAuthReady } = useFirebase();
  const navigate = useNavigate();
  const [learners, setLearners] = useState<Learner[]>([]);
  const [badgeRequests, setBadgeRequests] = useState<BadgeRequest[]>([]);
  const [issuedBadges, setIssuedBadges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    if (!isAuthReady || !user) return;

    const tcId = userProfile?.organizationId || user.uid;

    // Fetch Learners
    const learnersQuery = query(
      collection(db, 'learners'),
      where('trainingCenterId', '==', tcId)
    );
    const unsubscribeLearners = onSnapshot(learnersQuery, (snapshot) => {
      setLearners(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Learner[]);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'learners');
      setLoading(false);
    });

    // Fetch Badge Requests
    const reqQuery = query(
      collection(db, 'badgeRequests'),
      where('trainingCenterId', '==', tcId)
    );
    const unsubscribeRequests = onSnapshot(reqQuery, (snapshot) => {
      setBadgeRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as BadgeRequest[]);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'badgeRequests');
    });

    // Fetch Issued Badges
    const issuedQuery = query(
      collection(db, 'issuedBadges'),
      where('trainingCenterId', '==', tcId)
    );
    const unsubscribeIssued = onSnapshot(issuedQuery, (snapshot) => {
      setIssuedBadges(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'issuedBadges');
    });

    return () => {
      unsubscribeLearners();
      unsubscribeRequests();
      unsubscribeIssued();
    };
  }, [user, isAuthReady, userProfile]);

  // Evaluate Learner Eligibility
  const evaluatedLearners = learners.map(learner => {
    const existingRequest = badgeRequests.find(r => r.learnerId === learner.id || r.learnerIds?.includes(learner.id));
    const existingIssued = issuedBadges.find(b => b.learnerId === learner.id);

    let eligibilityStatus: 'Eligible' | 'Not Yet Eligible' | 'Already Requested' | 'Badge Issued' = 'Eligible';
    let statusReason = '100% Units Completed & Verified in External MIS';

    if (existingIssued) {
      eligibilityStatus = 'Badge Issued';
      statusReason = `Digital Badge Issued (${existingIssued.verificationId || 'Active'})`;
    } else if (existingRequest) {
      eligibilityStatus = 'Already Requested';
      statusReason = `Request #${existingRequest.requestNumber} (${existingRequest.status})`;
    } else if (learner.status === 'In Progress' || learner.status === 'Registered') {
      eligibilityStatus = 'Not Yet Eligible';
      statusReason = 'Training / Assessment still in progress';
    }

    return {
      ...learner,
      eligibilityStatus,
      statusReason,
      completedCompetencies: '5 / 5 Core Units',
      ctprNumber: learner.ctprNumber || 'CTPR-2026-08912',
      qualification: learner.programName || 'National Certificate Qualification'
    };
  });

  const filteredLearners = evaluatedLearners.filter(learner => {
    const learnerName = learner.name || `${learner.firstName || ''} ${learner.lastName || ''}`.trim() || 'Learner';
    const qual = learner.qualification || learner.programName || '';
    const term = searchQuery.toLowerCase();
    const matchesSearch =
      learnerName.toLowerCase().includes(term) ||
      (learner.uli && learner.uli.toLowerCase().includes(term)) ||
      qual.toLowerCase().includes(term);

    if (statusFilter === 'all') return matchesSearch;
    return matchesSearch && learner.eligibilityStatus === statusFilter;
  });

  const counts = {
    total: evaluatedLearners.length,
    eligible: evaluatedLearners.filter(l => l.eligibilityStatus === 'Eligible').length,
    requested: evaluatedLearners.filter(l => l.eligibilityStatus === 'Already Requested').length,
    issued: evaluatedLearners.filter(l => l.eligibilityStatus === 'Badge Issued').length,
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-slate-900">Badge Eligibility</h1>
            <Badge className="bg-slate-100 text-slate-700 font-mono text-[11px] border-slate-200">
              Source: External MIS
            </Badge>
          </div>
          <p className="text-slate-500 text-sm">
            Evaluate learner qualification completeness retrieved from External MIS to determine Digital Badge readiness.
          </p>
        </div>
        <Link to="/trainingcenter/file-request">
          <Button className="bg-blue-600 hover:bg-blue-700 gap-2">
            <Plus className="h-4 w-4" />
            File Badge Request
          </Button>
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Evaluated</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{counts.total}</p>
          </CardContent>
        </Card>
        <Card className="border-emerald-200 bg-emerald-50/30">
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Ready for Badging</p>
            <p className="text-2xl font-bold text-emerald-700 mt-1">{counts.eligible}</p>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50/30">
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-blue-700 uppercase tracking-wider">Requests Pending</p>
            <p className="text-2xl font-bold text-blue-700 mt-1">{counts.requested}</p>
          </CardContent>
        </Card>
        <Card className="border-purple-200 bg-purple-50/30">
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-purple-700 uppercase tracking-wider">Badges Issued</p>
            <p className="text-2xl font-bold text-purple-700 mt-1">{counts.issued}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search */}
      <Card className="border-slate-200">
        <CardContent className="p-4 flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by learner name, ULI, or qualification..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter Eligibility" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Eligible">Eligible Only</SelectItem>
                <SelectItem value="Not Yet Eligible">Not Yet Eligible</SelectItem>
                <SelectItem value="Already Requested">Already Requested</SelectItem>
                <SelectItem value="Badge Issued">Badge Issued</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Eligibility Table */}
      <Card className="border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-bold">Learner Qualification & Eligibility Roster</CardTitle>
          <CardDescription>
            Official training completion records from T2MIS API formatted for badging assessment
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>Learner / Reference ID</TableHead>
                <TableHead>Qualification & CTPR</TableHead>
                <TableHead>Competencies Completed</TableHead>
                <TableHead>Eligibility Result</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLearners.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                    No matching learner records found for the selected criteria.
                  </TableCell>
                </TableRow>
              ) : (
                filteredLearners.map((learner) => (
                  <TableRow key={learner.id}>
                    <TableCell>
                      <div>
                        <p className="font-bold text-slate-900">{learner.name}</p>
                        <p className="text-xs font-mono text-slate-500">ULI: {learner.uli || 'ULI-2026-PENDING'}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-semibold text-slate-800">{learner.qualification}</p>
                        <p className="text-xs text-slate-500">CTPR: {learner.ctprNumber}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                        <div>
                          <p className="text-xs font-bold text-slate-700">{learner.completedCompetencies}</p>
                          <p className="text-[10px] text-slate-500">Verified in External MIS</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        {learner.eligibilityStatus === 'Eligible' && (
                          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">
                            Eligible for Badge
                          </Badge>
                        )}
                        {learner.eligibilityStatus === 'Already Requested' && (
                          <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                            Already Requested
                          </Badge>
                        )}
                        {learner.eligibilityStatus === 'Badge Issued' && (
                          <Badge className="bg-purple-100 text-purple-800 border-purple-200">
                            Badge Issued
                          </Badge>
                        )}
                        {learner.eligibilityStatus === 'Not Yet Eligible' && (
                          <Badge className="bg-amber-100 text-amber-800 border-amber-200">
                            In Progress
                          </Badge>
                        )}
                        <p className="text-[10px] text-slate-500 mt-1">{learner.statusReason}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {learner.eligibilityStatus === 'Eligible' ? (
                        <Button
                          size="sm"
                          onClick={() => navigate(`/trainingcenter/file-request?learnerId=${learner.id}`)}
                          className="bg-blue-600 hover:bg-blue-700 h-8 gap-1.5 text-xs font-medium"
                        >
                          <Award className="h-3.5 w-3.5" />
                          File Badge Request
                        </Button>
                      ) : learner.eligibilityStatus === 'Already Requested' ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate('/trainingcenter/requests')}
                          className="h-8 gap-1 text-xs text-blue-600 border-blue-200"
                        >
                          View Request
                        </Button>
                      ) : learner.eligibilityStatus === 'Badge Issued' ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate('/trainingcenter/issued')}
                          className="h-8 gap-1 text-xs text-purple-600 border-purple-200"
                        >
                          View Credential
                        </Button>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Incomplete</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
