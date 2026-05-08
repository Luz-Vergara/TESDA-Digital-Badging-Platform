import React, { useEffect, useState } from 'react';
import { Award, Search, Filter, ArrowLeft, Download, ExternalLink, Calendar, ShieldCheck } from 'lucide-react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/src/lib/firebase';
import { useFirebase } from '@/src/lib/FirebaseProvider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BadgeMetadata } from '@/src/types';
import { getBadgeColor, getStatusColor } from '@/src/lib/badge-utils';
import { Link } from 'react-router-dom';

export default function MyBadgeWallet() {
  const { user, isAuthReady } = useFirebase();
  const [badges, setBadges] = useState<BadgeMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('All');

  useEffect(() => {
    if (!isAuthReady || !user) {
      if (isAuthReady && !user) setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'issuedBadges'),
      where('learnerEmail', '==', user.email)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allBadges = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as any[];
      
      // Filter out rejected badges if we only want to show earned and pending
      const b = allBadges.filter(badge => 
        badge.publishedToLearner === true || 
        ['Pending Approval', 'Submitted to CO', 'Under CO Review', 'Badge ID Generated', 'Forwarded to District Office'].includes(badge.status)
      ) as unknown as BadgeMetadata[];
      
      setBadges(b);
      setLoading(false);
    }, (error) => {
      console.error("Wallet Snapshot Error:", error);
      handleFirestoreError(error, OperationType.GET, 'issuedBadges');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, isAuthReady]);

  const filteredBadges = badges.filter(badge => {
    const bName = badge.programName || (badge as any).badgeName || "Unnamed Badge";
    const vId = badge.verificationId || "Pending Verification";
    const matchesSearch = bName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          vId.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterType === 'All' || badge.badgeType === filterType;
    return matchesSearch && matchesFilter;
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/learner">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">My Badge Wallet</h1>
            <p className="text-slate-500 text-sm">Manage and share your earned credentials</p>
          </div>
        </div>
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Export All (JSON-LD)
        </Button>
      </div>

      <Card className="border-slate-200">
        <CardContent className="p-4 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Search badges by title or ID..." 
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0">
            {['All', 'Proficient', 'Expert', 'Skilled', 'Master'].map((type) => (
              <Button
                key={type}
                variant={filterType === type ? 'default' : 'outline'}
                size="sm"
                className={filterType === type ? 'bg-blue-600' : ''}
                onClick={() => setFilterType(type)}
              >
                {type}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredBadges.length > 0 ? (
          filteredBadges.map((badge) => (
            <Card key={badge.id} className="group border-slate-200 hover:border-blue-300 transition-all hover:shadow-md overflow-hidden">
              <div className={`h-2 ${getBadgeColor(badge.badgeType).split(' ')[0]}`} />
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getBadgeColor(badge.badgeType)}`}>
                    <Award className="h-5 w-5" />
                  </div>
                  <div className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-50 rounded-full border border-slate-100">
                    <div className={`w-1.5 h-1.5 rounded-full ${badge.publishedToLearner ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      {badge.publishedToLearner ? 'Published' : (badge.status === 'Submitted to CO' ? 'CO Review' : 'Pending')}
                    </span>
                  </div>
                </div>
                
                <h3 className="font-bold text-slate-900 mb-1 group-hover:text-blue-600 transition-colors line-clamp-2 min-h-[3rem]">
                  {badge.programName || (badge as any).badgeName}
                </h3>
                <p className="text-[10px] text-slate-500 mb-4 font-bold uppercase tracking-widest bg-slate-100 w-fit px-2 py-0.5 rounded">
                  {badge.badgeType}
                </p>
                
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Calendar className="h-3 w-3" /> Status
                    </span>
                    <span className="text-slate-700 font-medium truncate max-w-[120px]">{badge.status}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <ShieldCheck className="h-3 w-3" /> Badge ID
                    </span>
                    <span className="text-slate-700 font-mono bg-slate-50 px-1 rounded">{badge.verificationId || (badge as any).certificationId || 'PENDING'}</span>
                  </div>
                </div>
              </CardContent>
              <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex gap-2">
                <Button variant="ghost" size="sm" className="flex-1 text-xs hover:bg-white hover:text-blue-600">
                  Metadata
                </Button>
                <Button size="sm" className="flex-1 text-xs bg-blue-600 hover:bg-blue-700">
                  <ExternalLink className="h-3 w-3 mr-1.5" /> Share
                </Button>
              </div>
            </Card>
          ))
        ) : (
          <div className="col-span-full py-12 text-center">
            <Award className="h-12 w-12 text-slate-200 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900">No badges found</h3>
            <p className="text-slate-500">Try adjusting your search or filters</p>
          </div>
        )}
      </div>
    </div>
  );
}
