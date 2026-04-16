import React, { useEffect, useState } from 'react';
import { 
  Search, 
  Filter, 
  Calendar,
  AlertTriangle,
  RefreshCw,
  User,
  Award,
  Clock,
  History as HistoryIcon
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
import { BadgeIssuanceRequest } from '@/src/types';

export default function RenewalManagement() {
  const { userProfile, isAuthReady } = useFirebase();
  const [expiringBadges, setExpiringBadges] = useState<BadgeIssuanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!isAuthReady) return;

    if (!userProfile?.organizationId) {
      setLoading(false);
      return;
    }

    const districtId = userProfile.organizationId;
    const path = 'issuedBadges';
    
    // In a real app, we'd filter by expiryDate < [currentDate + 30 days]
    // For now, we'll just show approved badges sorted by expiry
    const q = query(
      collection(db, path),
      where('districtOfficeId', '==', districtId),
      where('status', '==', 'Approved'),
      orderBy('expiryDate', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as BadgeIssuanceRequest[];
      setExpiringBadges(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });

    return () => unsubscribe();
  }, [userProfile, isAuthReady]);

  const filteredBadges = expiringBadges.filter(req => 
    req.learnerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    req.badgeName.toLowerCase().includes(searchQuery.toLowerCase())
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
          <h1 className="text-3xl font-bold text-slate-900">Renewal Management</h1>
          <p className="text-slate-500">Track and manage badges nearing expiration.</p>
        </div>
        <Button variant="outline" className="gap-2">
          <HistoryIcon className="h-4 w-4" />
          Renewal History
        </Button>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <Card className="border-amber-100 bg-amber-50/30">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-amber-100 text-amber-600 rounded-xl">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">12</p>
              <p className="text-xs font-medium text-slate-500 uppercase">Expiring in 30 Days</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-blue-100 bg-blue-50/30">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">45</p>
              <p className="text-xs font-medium text-slate-500 uppercase">Renewal Requests</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-slate-100 text-slate-600 rounded-xl">
              <RefreshCw className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">98%</p>
              <p className="text-xs font-medium text-slate-500 uppercase">Renewal Rate</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">Expiring Badges</CardTitle>
            <CardDescription>Monitor credentials that require renewal or will expire soon</CardDescription>
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Search badges..." 
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
                  <TableHead>Learner</TableHead>
                  <TableHead>Badge Type</TableHead>
                  <TableHead>Expiry Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBadges.length > 0 ? (
                  filteredBadges.map((req) => (
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
                        <div className="flex items-center gap-2">
                          <Award className="h-4 w-4 text-blue-600" />
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-slate-700">{req.badgeName}</span>
                            <span className="text-[10px] text-slate-500 uppercase">{req.badgeType}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Calendar className="h-3.5 w-3.5" />
                          {req.expiryDate ? new Date(req.expiryDate.seconds * 1000).toLocaleDateString() : 'No Expiry'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-amber-200 text-amber-700 bg-amber-50">
                          Expiring Soon
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" className="h-8 gap-1.5">
                            <RefreshCw className="h-3.5 w-3.5" />
                            Renew
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 text-rose-600">
                            Expire
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-slate-500">
                      No badges found nearing expiration.
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
