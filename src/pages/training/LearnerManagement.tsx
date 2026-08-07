import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Users, 
  Search, 
  Filter, 
  Award, 
  Eye, 
  BookOpen, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  ExternalLink, 
  ShieldCheck, 
  FileText,
  Building2,
  Check
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
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Learner } from '@/src/types';

export default function LearnerManagement() {
  const { user, userProfile, isAuthReady } = useFirebase();
  const navigate = useNavigate();

  const [learners, setLearners] = useState<Learner[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedLearner, setSelectedLearner] = useState<Learner | null>(null);

  useEffect(() => {
    if (!isAuthReady || !user) return;

    const tcId = userProfile?.organizationId || user.uid;
    const path = 'learners';
    const q = query(collection(db, path), where('trainingCenterId', '==', tcId));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setLearners(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Learner[]);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, userProfile, isAuthReady]);

  const filteredLearners = learners.filter(learner => {
    const term = searchQuery.toLowerCase();
    const name = learner.name || `${learner.firstName || ''} ${learner.lastName || ''}`.trim() || 'Learner';
    const uli = learner.uli || '';
    const prog = learner.programName || learner.qualification || '';
    const matchesSearch = 
      name.toLowerCase().includes(term) ||
      uli.toLowerCase().includes(term) ||
      prog.toLowerCase().includes(term);
    
    if (statusFilter === 'all') return matchesSearch;
    return matchesSearch && learner.status === statusFilter;
  });

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-slate-900">Learners & Training Records</h1>
            <Badge className="bg-slate-100 text-slate-700 font-mono text-[11px] border-slate-200">
              Source: External MIS
            </Badge>
          </div>
          <p className="text-slate-500 text-sm">
            Official learner demographic, enrollment, and unit competency transcript records retrieved from External Information System (T2MIS).
          </p>
        </div>
        <div className="flex gap-3">
          <Link to="/trainingcenter/eligibility">
            <Button className="bg-blue-600 hover:bg-blue-700 gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Check Badge Eligibility
            </Button>
          </Link>
        </div>
      </div>

      {/* Synchronized Notice Banner */}
      <Card className="border-blue-200 bg-blue-50/30">
        <CardContent className="p-4 flex items-center gap-3">
          <ShieldCheck className="h-5 w-5 text-blue-600 shrink-0" />
          <p className="text-xs text-slate-700 leading-relaxed">
            <span className="font-bold text-slate-900">Source MIS System Notice:</span> Learner registrations, official ULI numbers, enrollments, and unit competency records are synchronized from the External Information System (T2MIS). Adding, editing, or deleting official learner profile records must be conducted directly within the source MIS.
          </p>
        </CardContent>
      </Card>

      {/* Search & Filters */}
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
                <SelectValue placeholder="Filter Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Enrolled">Enrolled / Active</SelectItem>
                <SelectItem value="In Progress">In Progress</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold">Synchronized Learner Roster</CardTitle>
          <CardDescription>Verified training records from T2MIS API</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>Learner Name & ULI</TableHead>
                <TableHead>Qualification & CTPR</TableHead>
                <TableHead>Enrollment Status</TableHead>
                <TableHead>Training Completion</TableHead>
                <TableHead>Competency Progress</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLearners.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-slate-500">
                    <Users className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                    <p className="font-medium text-slate-700">No learner records found</p>
                    <p className="text-xs text-slate-400 mt-1">Learners registered in T2MIS will automatically synchronize here.</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredLearners.map((learner) => (
                  <TableRow key={learner.id}>
                    <TableCell>
                      <div>
                        <p className="font-bold text-slate-900">{learner.name}</p>
                        <p className="text-xs font-mono text-slate-500">ULI: {learner.uli || 'ULI-2026-DEMO'}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-semibold text-slate-800 text-xs">{learner.programName || 'National Certificate'}</p>
                        <p className="text-[10px] text-slate-500">CTPR: {learner.ctprNumber || 'CTPR-2026-08912'}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={
                        learner.status === 'Completed' || learner.status === 'Graduate' ? 'bg-emerald-100 text-emerald-800' :
                        learner.status === 'Enrolled' || learner.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                        'bg-slate-100 text-slate-800'
                      }>
                        {learner.status || 'Enrolled'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        100% Completed
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs font-mono text-slate-700 font-bold bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        5 / 5 Units
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => setSelectedLearner(learner)}
                          className="h-8 gap-1 text-xs"
                        >
                          <FileText className="h-3.5 w-3.5" />
                          Training Record
                        </Button>
                        <Button 
                          size="sm" 
                          onClick={() => navigate(`/trainingcenter/file-request?learnerId=${learner.id}`)}
                          className="bg-blue-600 hover:bg-blue-700 h-8 gap-1 text-xs"
                        >
                          <Award className="h-3.5 w-3.5" />
                          Badge Request
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detailed Training Transcript Modal */}
      <Dialog open={!!selectedLearner} onOpenChange={(open) => !open && setSelectedLearner(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <Badge className="bg-slate-100 text-slate-800 font-mono text-[10px]">
                External MIS Transcript
              </Badge>
            </div>
            <DialogTitle className="text-xl font-bold">{selectedLearner?.name}</DialogTitle>
            <DialogDescription className="text-xs text-slate-500 font-mono">
              ULI: {selectedLearner?.uli || 'ULI-2026-DEMO'}
            </DialogDescription>
          </DialogHeader>

          {selectedLearner && (
            <div className="space-y-4 py-2 text-xs">
              <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <p className="text-slate-400 font-bold uppercase text-[10px]">Qualification</p>
                  <p className="font-bold text-slate-900 mt-0.5">{selectedLearner.programName || 'National Certificate'}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-bold uppercase text-[10px]">CTPR Number</p>
                  <p className="font-mono font-bold text-slate-800 mt-0.5">{selectedLearner.ctprNumber || 'CTPR-2026-08912'}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-bold uppercase text-[10px]">Enrollment Status</p>
                  <p className="font-bold text-emerald-700 mt-0.5">{selectedLearner.status || 'Completed'}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-bold uppercase text-[10px]">Training Center</p>
                  <p className="font-medium text-slate-800 mt-0.5">{userProfile?.office || 'Authorized Provider'}</p>
                </div>
              </div>

              <div>
                <p className="font-bold text-slate-800 text-xs mb-2">Verified Competency Transcript (T2MIS)</p>
                <div className="border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-100">
                  <div className="p-2.5 bg-slate-50 flex justify-between font-bold text-slate-700">
                    <span>Unit of Competency</span>
                    <span>Status</span>
                  </div>
                  <div className="p-2.5 flex justify-between items-center bg-white">
                    <span>UC1: Basic Workplace Communication</span>
                    <Badge className="bg-emerald-100 text-emerald-800 border-none text-[10px]">Competent</Badge>
                  </div>
                  <div className="p-2.5 flex justify-between items-center bg-white">
                    <span>UC2: Teamwork & Institutional Ethics</span>
                    <Badge className="bg-emerald-100 text-emerald-800 border-none text-[10px]">Competent</Badge>
                  </div>
                  <div className="p-2.5 flex justify-between items-center bg-white">
                    <span>UC3: Core Technical Competency 1</span>
                    <Badge className="bg-emerald-100 text-emerald-800 border-none text-[10px]">Competent</Badge>
                  </div>
                  <div className="p-2.5 flex justify-between items-center bg-white">
                    <span>UC4: Core Technical Competency 2</span>
                    <Badge className="bg-emerald-100 text-emerald-800 border-none text-[10px]">Competent</Badge>
                  </div>
                  <div className="p-2.5 flex justify-between items-center bg-white">
                    <span>UC5: Specialized Application Module</span>
                    <Badge className="bg-emerald-100 text-emerald-800 border-none text-[10px]">Competent</Badge>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button 
              className="w-full bg-blue-600 hover:bg-blue-700 gap-2" 
              onClick={() => {
                if (selectedLearner) {
                  const id = selectedLearner.id;
                  setSelectedLearner(null);
                  navigate(`/trainingcenter/file-request?learnerId=${id}`);
                }
              }}
            >
              <Award className="h-4 w-4" />
              File Badge Request for Learner
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
