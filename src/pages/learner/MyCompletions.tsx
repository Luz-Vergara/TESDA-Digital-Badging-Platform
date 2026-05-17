import React, { useState, useEffect } from 'react';
import { Award, CheckCircle2, FileText, ExternalLink, ShieldCheck, Clock, BookOpen, Loader2 } from 'lucide-react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/src/lib/firebase';
import { useFirebase } from '@/src/lib/FirebaseProvider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { UCCompletion, Enrollment } from '@/src/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function MyCompletions() {
  const { user } = useFirebase();
  const [completions, setCompletions] = useState<UCCompletion[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const compQuery = query(
      collection(db, 'ucCompletions'),
      where('learnerId', '==', user.uid)
    );

    const unsubComp = onSnapshot(compQuery, (snapshot) => {
      setCompletions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as UCCompletion[]);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'ucCompletions');
      setLoading(false);
    });

    const enrQuery = query(
      collection(db, 'enrollments'),
      where('learnerId', '==', user.uid),
      where('enrollmentStatus', '==', 'Enrolled')
    );

    const unsubEnr = onSnapshot(enrQuery, (snapshot) => {
      setEnrollments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Enrollment[]);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'enrollments');
    });

    return () => {
      unsubComp();
      unsubEnr();
    };
  }, [user]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Training Progress & Completions</h1>
        <p className="text-slate-500 text-sm">Monitor your ongoing training and view verified competency records.</p>
      </div>

      <Tabs defaultValue="completed" className="w-full">
        <TabsList className="bg-slate-100 p-1 border-slate-200">
          <TabsTrigger value="completed" className="data-[state=active]:bg-white">Verified Completions ({completions.length})</TabsTrigger>
          <TabsTrigger value="inprogress" className="data-[state=active]:bg-white">In Progress ({enrollments.filter(e => e.completionStatus === 'In Progress').length})</TabsTrigger>
        </TabsList>

        <TabsContent value="completed" className="mt-4">
          <div className="grid gap-4">
            {completions.map((comp) => (
              <Card key={comp.id} className="border-slate-200 overflow-hidden group">
                <div className="flex">
                  <div className={cn("w-2", comp.completionStatus === 'Badge Requested' ? 'bg-blue-500' : 'bg-emerald-500')} />
                  <CardContent className="p-6 flex-1">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                           {comp.completionStatus === 'Badge Requested' ? (
                             <Clock className="h-4 w-4 text-blue-500" />
                           ) : (
                             <ShieldCheck className="h-4 w-4 text-emerald-500" />
                           )}
                           <h3 className="font-bold text-lg text-slate-900">{comp.ucTitle}</h3>
                        </div>
                        <p className="text-xs text-slate-500 font-mono uppercase tracking-tighter">{comp.ucCode}</p>
                        <div className="flex items-center gap-4 mt-4">
                           <div className="flex flex-col">
                              <span className="text-[10px] text-slate-400 font-bold uppercase">Date Completed</span>
                              <span className="text-sm font-medium">{comp.completedAt ? new Date(comp.completedAt.seconds * 1000).toLocaleDateString() : 'N/A'}</span>
                           </div>
                           <div className="h-8 w-px bg-slate-100 mx-2" />
                           <div className="flex flex-col">
                              <span className="text-[10px] text-slate-400 font-bold uppercase">Verified By</span>
                              <span className="text-sm font-medium">{comp.verifiedBy || 'Training Center'}</span>
                           </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-3">
                        <Badge className={cn("shadow-none py-1 px-3 border-none", 
                          comp.completionStatus === 'Badge Requested' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
                        )}>
                          {comp.completionStatus === 'Badge Requested' ? (
                            <Clock className="h-3.5 w-3.5 mr-2" />
                          ) : (
                            <CheckCircle2 className="h-3.5 w-3.5 mr-2" />
                          )}
                          {comp.completionStatus === 'Badge Requested' ? 'Processing Issuance' : 'Verified Completion'}
                        </Badge>
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Badge Status:</p>
                          <Badge variant={comp.completionStatus === 'Badge Requested' ? 'default' : 'secondary'} className={
                            comp.completionStatus === 'Badge Requested' ? 'bg-blue-600' : ''
                          }>
                            {comp.completionStatus === 'Badge Requested' ? 'Status: Pending' : 'Eligible for Request'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </div>
                {comp.evidenceUrl && (
                  <div className="bg-slate-50 px-6 py-2 border-t border-slate-100 flex justify-end">
                    <a 
                      href={comp.evidenceUrl} 
                      target="_blank" 
                      rel="noreferrer"
                      className="text-[10px] font-bold text-blue-600 hover:underline flex items-center gap-1 uppercase tracking-wider"
                    >
                      View Evidence <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  </div>
                )}
              </Card>
            ))}
            {completions.length === 0 && (
              <div className="py-20 text-center flex flex-col items-center border border-dashed border-slate-200 rounded-lg">
                <Award className="h-12 w-12 text-slate-200 mb-4" />
                <h3 className="font-bold text-slate-900">No verified completions</h3>
                <p className="text-slate-500 text-sm">Completed programs verified by your center will appear here.</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="inprogress" className="mt-4">
          <div className="grid gap-4">
            {enrollments.filter(e => e.completionStatus === 'In Progress').map((enr) => (
              <Card key={enr.id} className="border-slate-200 overflow-hidden">
                <div className="flex">
                  <div className="w-2 bg-blue-400" />
                  <CardContent className="p-6 flex-1">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                           <BookOpen className="h-4 w-4 text-blue-500" />
                           <h3 className="font-bold text-lg text-slate-900">{enr.programTitle || 'Program Enrollment'}</h3>
                        </div>
                        <div className="flex items-center gap-4 mt-2">
                           <div className="flex flex-col">
                              <span className="text-[10px] text-slate-400 font-bold uppercase">Date Enrolled</span>
                              <span className="text-sm font-medium">{enr.dateEnrolled ? new Date(enr.dateEnrolled.seconds * 1000).toLocaleDateString() : 'Pending'}</span>
                           </div>
                           <div className="h-8 w-px bg-slate-100 mx-2" />
                           <div className="flex flex-col">
                              <span className="text-[10px] text-slate-400 font-bold uppercase">Enrollment Status</span>
                              <span className="text-sm font-medium">{enr.enrollmentStatus}</span>
                           </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-100">
                          <Clock className="h-3 w-3 mr-1.5" />
                          Training in Progress
                        </Badge>
                        <p className="text-xs text-slate-400 italic">Expected Completion: TBD</p>
                      </div>
                    </div>
                  </CardContent>
                </div>
              </Card>
            ))}
            {enrollments.filter(e => e.completionStatus === 'In Progress').length === 0 && (
              <div className="py-20 text-center flex flex-col items-center border border-dashed border-slate-200 rounded-lg">
                <BookOpen className="h-12 w-12 text-slate-200 mb-4" />
                <h3 className="font-bold text-slate-900">No active training</h3>
                <p className="text-slate-500 text-sm">Your active enrollments and training progress will be shown here.</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
