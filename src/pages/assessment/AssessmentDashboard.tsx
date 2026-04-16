import React, { useEffect, useState } from 'react';
import { 
  ShieldCheck, 
  Users, 
  FileText, 
  TrendingUp, 
  Plus,
  Search,
  Filter,
  ArrowRight
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

export default function AssessmentDashboard() {
  const { user, userProfile, isAuthReady } = useFirebase();
  const [assessments, setAssessments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthReady || !user) return;

    const path = 'issuedBadges';
    const q = query(
      collection(db, path),
      where('issuerId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const badges = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setAssessments(badges);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });

    return () => unsubscribe();
  }, [user, isAuthReady]);

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
          <h1 className="text-3xl font-bold text-slate-900">Assessment Center Portal</h1>
          <p className="text-slate-500">{userProfile?.office || 'Authorized Assessment Center'}</p>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700 gap-2">
          <Plus className="h-4 w-4" />
          Record Assessment Result
        </Button>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card className="border-slate-200">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 rounded-lg bg-emerald-100 text-emerald-600">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <Badge variant="outline" className="text-blue-600 bg-blue-50 border-blue-100">NC I-IV</Badge>
            </div>
            <p className="text-2xl font-bold text-slate-900">{assessments.length}</p>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mt-1">Certificates Issued</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                <FileText className="h-5 w-5" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900">85%</p>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mt-1">Passing Rate</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 rounded-lg bg-purple-100 text-purple-600">
                <Users className="h-5 w-5" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900">42</p>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mt-1">Upcoming Assessments</p>
          </CardContent>
        </Card>
      </div>

      {/* Assessment Records */}
      <Card className="border-slate-200">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">National Certification Records</CardTitle>
            <CardDescription>Skilled and Master level badge issuance history</CardDescription>
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input placeholder="Search candidates..." className="pl-9 w-48 h-9 text-sm" />
            </div>
            <Button variant="outline" size="icon" className="h-9 w-9">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {assessments.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Candidate</TableHead>
                  <TableHead>Qualification</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assessments.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">{record.learnerName}</TableCell>
                    <TableCell className="text-slate-600">{record.programName}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-[10px] uppercase bg-purple-100 text-purple-700">
                        {record.badgeType}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={record.status === 'Active' ? 'bg-emerald-500' : 'bg-amber-500'}>
                        {record.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" className="h-8 text-emerald-600">
                        View Result
                        <ArrowRight className="ml-2 h-3 w-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="p-12 text-center text-slate-500">
              No assessment records found.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
