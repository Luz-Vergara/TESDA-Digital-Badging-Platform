import React, { useState, useEffect } from 'react';
import { Search, Layers, ShieldCheck, Eye, Info, CheckCircle2, Building2 } from 'lucide-react';
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
import { ProgramOffering, BadgeTemplate } from '@/src/types';

export default function ProgramOfferings() {
  const { user, userProfile, isAuthReady } = useFirebase();
  const [programs, setPrograms] = useState<ProgramOffering[]>([]);
  const [templates, setTemplates] = useState<BadgeTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProgram, setSelectedProgram] = useState<ProgramOffering | null>(null);

  useEffect(() => {
    if (!isAuthReady || !user) return;

    const tcId = userProfile?.organizationId || user.uid;
    const path = 'programOfferings';
    const q = userProfile?.role === 'Admin' 
      ? query(collection(db, path))
      : query(collection(db, path), where('trainingCenterId', '==', tcId));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPrograms(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ProgramOffering[]);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
      setLoading(false);
    });

    const tempPath = 'badgeTemplates';
    const templatesQuery = query(collection(db, tempPath), where('status', 'in', ['Approved', 'Active']));
    const unsubscribeTemplates = onSnapshot(templatesQuery, (snapshot) => {
      setTemplates(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as BadgeTemplate[]);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, tempPath);
    });

    return () => {
      unsubscribe();
      unsubscribeTemplates();
    };
  }, [user, userProfile, isAuthReady]);

  const filteredPrograms = programs.filter(p => {
    const term = searchQuery.toLowerCase();
    return (
      p.programTitle?.toLowerCase().includes(term) ||
      p.qualificationName?.toLowerCase().includes(term) ||
      p.qualificationCode?.toLowerCase().includes(term) ||
      (p.ctprNumber && p.ctprNumber.toLowerCase().includes(term))
    );
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
            <h1 className="text-2xl font-bold text-slate-900">Registered Programs (CTPR)</h1>
            <Badge className="bg-slate-100 text-slate-700 font-mono text-[11px] border-slate-200">
              Source: External Information System
            </Badge>
          </div>
          <p className="text-slate-500 text-sm">
            Institutional program registrations and Competency-Based Training Program Registration (CTPR) details synchronized from External MIS.
          </p>
        </div>
      </div>

      {/* Synchronized Banner */}
      <Card className="border-blue-200 bg-blue-50/30">
        <CardContent className="p-4 flex items-center gap-3">
          <Info className="h-5 w-5 text-blue-600 shrink-0" />
          <p className="text-xs text-slate-700 leading-relaxed">
            <span className="font-bold text-slate-900">Program Management Notice:</span> Program registrations, CTPR accreditations, and validity periods are managed directly in the source External Information System (T2MIS). Local program addition or editing in Digital Badging Platform is disabled to prevent duplicate record conflicts.
          </p>
        </CardContent>
      </Card>

      {/* Filter and Search */}
      <Card className="border-slate-200">
        <CardContent className="p-4 flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Search by program, qualification, or CTPR..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <p className="text-xs text-slate-500 font-medium">
            Total Synchronized Programs: <span className="font-bold text-slate-800">{filteredPrograms.length}</span>
          </p>
        </CardContent>
      </Card>

      {/* Programs Table */}
      <Card className="border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold">Synchronized Program Registrations</CardTitle>
          <CardDescription>Official CTPR records associated with this Training Provider</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>CTPR Number</TableHead>
                <TableHead>Qualification Code</TableHead>
                <TableHead>Qualification Title</TableHead>
                <TableHead>Delivery Mode</TableHead>
                <TableHead>Registration Status</TableHead>
                <TableHead>Validity Period</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPrograms.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-slate-500">
                    <Layers className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                    <p className="font-medium text-slate-700">No registered programs found</p>
                    <p className="text-xs text-slate-400 mt-1">Programs registered in T2MIS will automatically synchronize here.</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredPrograms.map((program) => (
                  <TableRow key={program.id}>
                    <TableCell>
                      <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        {program.ctprNumber || 'CTPR-2026-08912'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs font-semibold text-blue-600">
                        {program.qualificationCode || 'QUAL-2026'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-bold text-slate-900 text-sm">{program.programTitle || program.qualificationName}</p>
                        <p className="text-[10px] text-slate-500">{program.programType || 'Full Qualification'}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs font-medium">
                        {program.deliveryMode || 'Blended'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">
                        {program.status || 'Active'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <p className="text-xs text-slate-600 font-mono">
                        {program.validityPeriod || '2024 - 2029'}
                      </p>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => setSelectedProgram(program)}
                        className="h-8 gap-1 text-xs text-blue-600"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Program Detail Modal */}
      <Dialog open={!!selectedProgram} onOpenChange={(open) => !open && setSelectedProgram(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <Badge className="bg-slate-100 text-slate-800 font-mono text-[10px]">
                External MIS Record
              </Badge>
            </div>
            <DialogTitle className="text-xl font-bold">{selectedProgram?.programTitle}</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Competency-Based Training Program Registration Details
            </DialogDescription>
          </DialogHeader>

          {selectedProgram && (
            <div className="space-y-4 py-2 text-sm">
              <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <div>
                  <p className="text-slate-400 font-bold uppercase text-[10px]">CTPR Accreditation Number</p>
                  <p className="font-mono font-bold text-slate-900 mt-0.5">{selectedProgram.ctprNumber || 'CTPR-2026-08912'}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-bold uppercase text-[10px]">Qualification Code</p>
                  <p className="font-mono font-bold text-blue-600 mt-0.5">{selectedProgram.qualificationCode || 'QUAL-2026'}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-bold uppercase text-[10px]">Delivery Mode</p>
                  <p className="font-medium text-slate-800 mt-0.5">{selectedProgram.deliveryMode || 'Blended / In-Person'}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-bold uppercase text-[10px]">Registration Validity</p>
                  <p className="font-mono font-medium text-slate-800 mt-0.5">{selectedProgram.validityPeriod || '2024 - 2029'}</p>
                </div>
              </div>

              <div>
                <p className="font-bold text-slate-800 text-xs mb-2">Linked Digital Badge Template</p>
                <div className="p-3 border border-slate-200 rounded-lg flex items-center justify-between bg-white">
                  <div className="flex items-center gap-2.5">
                    <ShieldCheck className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="font-bold text-slate-900 text-xs">{selectedProgram.badgeTemplateName || 'Approved Digital Badge Template'}</p>
                      <p className="text-[10px] text-slate-500">Authorized for District Office Endorsement</p>
                    </div>
                  </div>
                  <Badge className="bg-emerald-100 text-emerald-800 border-none text-[10px]">Ready</Badge>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" className="w-full" onClick={() => setSelectedProgram(null)}>
              Close Details
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
