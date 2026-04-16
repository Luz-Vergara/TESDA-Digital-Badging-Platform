import React, { useEffect, useState } from 'react';
import { 
  Search, 
  Filter, 
  Building2,
  TrendingUp,
  CheckCircle2,
  XCircle,
  ArrowUpRight,
  MapPin,
  Mail
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
import { Organization } from '@/src/types';

export default function CenterMonitoring() {
  const { userProfile, isAuthReady } = useFirebase();
  const [centers, setCenters] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!isAuthReady) return;

    if (!userProfile?.organizationId) {
      setLoading(false);
      return;
    }

    const districtId = userProfile.organizationId;
    const path = 'organizations';
    
    // Query centers under this district
    const q = query(
      collection(db, path),
      where('assignedDistrictId', '==', districtId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Organization[];
      setCenters(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });

    return () => unsubscribe();
  }, [userProfile, isAuthReady]);

  const filteredCenters = centers.filter(center => 
    center.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    center.location.toLowerCase().includes(searchQuery.toLowerCase())
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
          <h1 className="text-3xl font-bold text-slate-900">Center Monitoring</h1>
          <p className="text-slate-500">Oversight of Training and Assessment centers in your district.</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700 gap-2">
          <TrendingUp className="h-4 w-4" />
          District Performance Report
        </Button>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <Card className="border-slate-200">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-2">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Centers</p>
              <Building2 className="h-4 w-4 text-blue-600" />
            </div>
            <p className="text-3xl font-bold text-slate-900">{centers.length}</p>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="secondary" className="text-[10px] bg-blue-50 text-blue-700">
                {centers.filter(c => c.type === 'TrainingCenter').length} Training
              </Badge>
              <Badge variant="secondary" className="text-[10px] bg-purple-50 text-purple-700">
                {centers.filter(c => c.type === 'AssessmentCenter').length} Assessment
              </Badge>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-2">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Avg. Approval Rate</p>
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="text-3xl font-bold text-slate-900">94.2%</p>
            <p className="text-[10px] text-emerald-600 font-medium mt-1 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              +2.1% from last month
            </p>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-2">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Submissions</p>
              <ArrowUpRight className="h-4 w-4 text-slate-400" />
            </div>
            <p className="text-3xl font-bold text-slate-900">1,248</p>
            <p className="text-[10px] text-slate-500 mt-1">Across all centers this quarter</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">District Institutions</CardTitle>
            <CardDescription>Performance and submission metrics per center</CardDescription>
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Search centers..." 
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
                  <TableHead>Center Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Submissions</TableHead>
                  <TableHead>Approval Rate</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCenters.length > 0 ? (
                  filteredCenters.map((center) => (
                    <TableRow key={center.id} className="hover:bg-slate-50/50 transition-colors">
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900">{center.name}</span>
                          <span className="text-xs text-slate-500 flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {center.email}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={center.type === 'TrainingCenter' ? 'border-blue-200 text-blue-700 bg-blue-50' : 'border-purple-200 text-purple-700 bg-purple-50'}>
                          {center.type === 'TrainingCenter' ? 'Training' : 'Assessment'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-sm text-slate-600">
                          <MapPin className="h-3.5 w-3.5 text-slate-400" />
                          {center.location}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-medium text-slate-900">{center.submissionCount || 0}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-emerald-500" 
                              style={{ width: `${center.approvalRate || 100}%` }} 
                            />
                          </div>
                          <span className="text-xs font-bold text-slate-700">{center.approvalRate || 100}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" className="h-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                          View Submissions
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-slate-500">
                      No centers found in this district.
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
