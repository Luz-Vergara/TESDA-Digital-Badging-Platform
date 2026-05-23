import React, { useEffect, useState, useMemo } from 'react';
import { Award, Search, Filter, ArrowLeft, Download, ExternalLink, Calendar, ShieldCheck } from 'lucide-react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/src/lib/firebase';
import { useFirebase } from '@/src/lib/FirebaseProvider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BadgeMetadata, BadgeTemplate } from '@/src/types';
import { getBadgeColor, getStatusColor } from '@/src/lib/badge-utils';
import { Link } from 'react-router-dom';
import { BadgeRenderer } from '@/src/components/badges/BadgeRenderer';

const formatDate = (value: any) => {
  if (!value) return "N/A";

  if (value?.seconds) {
    return new Date(value.seconds * 1000).toLocaleDateString();
  }

  if (value instanceof Date) {
    return value.toLocaleDateString();
  }

  return String(value);
};

export default function MyBadgeWallet() {
  const { user, isAuthReady } = useFirebase();
  const [badgesEmail, setBadgesEmail] = useState<any[]>([]);
  const [badgesId, setBadgesId] = useState<any[]>([]);
  const [badgesRequests, setBadgesRequests] = useState<any[]>([]);
  const [templates, setTemplates] = useState<BadgeTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('All');
 
  // Combine sources and filter by recognized templates
  const badges = useMemo(() => {
    const combined = [...badgesEmail];
    
    badgesId.forEach(item => {
      if (!combined.find(c => c.id === item.id)) {
        combined.push(item);
      }
    });

    // Add approved requests to the list
    badgesRequests.forEach(req => {
      if (!combined.find(c => c.id === req.id || (c.badgeId && c.badgeId === req.id))) {
        combined.push({
          ...req,
          badgeName: req.badgeTemplateName || req.badgeName || req.programTitle,
          status: 'Approved' // Treat as earned for wallet
        });
      }
    });

    // Valid statuses for wallet display
    const filtered = combined.filter(item => 
      item.publishedToLearner === true || 
      ['Active', 'Approved', 'Published', 'Earned', 'Badge ID Generated'].includes(item.status)
    );

    // Filter to only include badges that match a known template
    return filtered.filter(badge => {
      const bId = badge.badgeTemplateId || badge.badgeId;
      const matchedTemplate = templates.find(t => t.id === bId);
      
      // Fallback: title match with aggressive normalization
      const normalize = (s: string) => {
        return s.toLowerCase()
          .replace(/[^a-z0-9]/g, ' ')
          .replace(/\(proficient\)|\(expert\)|\(skilled\)|\(master\)/g, '')
          .replace(/level|animation|competency/g, '')
          .replace(/\s+/g, ' ')
          .trim();
      };
      
      const bTitleNorm = normalize(badge.programTitle || badge.badgeName || badge.badgeTemplateName || '');
      
      let finalMatch = null;
      if (bId && matchedTemplate) {
        finalMatch = matchedTemplate;
      } else {
        if (!bTitleNorm) return false;
        
        // Exact normalized match
        finalMatch = templates.find(t => normalize(t.badgeName || '') === bTitleNorm);

        if (!finalMatch) {
          // Fuzzy Match: Significant overlap
          finalMatch = templates.find(t => {
            const tTitleNorm = normalize(t.badgeName || '');
            if (!tTitleNorm) return false;
            const bWords = bTitleNorm.split(' ').filter(w => w.length >= 2);
            const tWords = tTitleNorm.split(' ').filter(w => w.length >= 2);
            const intersection = bWords.filter(w => tWords.includes(w));
            return intersection.length >= 2 || bTitleNorm.includes(tTitleNorm) || tTitleNorm.includes(bTitleNorm);
          });
        }
      }

      if (finalMatch) {
         // Attach template metadata if missing
         if (!badge.badgeType) badge.badgeType = finalMatch.badgeType;
         if (!badge.badgeName) badge.badgeName = finalMatch.badgeName;
         
         // Strict Type Check for COC/NC
         const bType = badge.badgeType;
         const tType = finalMatch.badgeType;
         if (tType === 'Skilled' || tType === 'Master') {
           return bType === tType || (bType === 'COC' && tType === 'Skilled') || (bType === 'Qualification' && tType === 'Master');
         }
         return true;
      }
      
      return false;
    }).sort((a, b) => {
      const dateA = a.issueDate?.seconds || a.submittedAt?.seconds || 0;
      const dateB = b.issueDate?.seconds || b.submittedAt?.seconds || 0;
      return dateB - dateA;
    });
  }, [badgesEmail, badgesId, badgesRequests, templates]);

  useEffect(() => {
    if (!isAuthReady || !user) {
      if (isAuthReady && !user) setLoading(false);
      return;
    }

    // Fetch official templates for verification
    const unsubTemplates = onSnapshot(collection(db, 'badgeTemplates'), (snapshot) => {
      setTemplates(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BadgeTemplate)));
    });

    const path = 'issuedBadges';
    const qEmail = query(
      collection(db, path),
      where('learnerEmail', '==', user.email)
    );
    const qId = query(
      collection(db, path),
      where('learnerId', '==', user.uid)
    );

    const unsubEmail = onSnapshot(qEmail, (snapshot) => {
      setBadgesEmail(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      console.error("Wallet Email Error:", error);
      handleFirestoreError(error, OperationType.GET, path);
      setLoading(false);
    });

    const unsubId = onSnapshot(qId, (snapshot) => {
      setBadgesId(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      console.error("Wallet UID Error:", error);
    });

    const qRequests = query(
      collection(db, 'badgeRequests'),
      where('learnerIds', 'array-contains', user.uid),
      where('status', 'in', ['Approved', 'Badge ID Generated'])
    );

    const unsubRequests = onSnapshot(qRequests, (snapshot) => {
      setBadgesRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      console.error("Wallet Requests Error:", error);
    });

    return () => {
      unsubEmail();
      unsubId();
      unsubRequests();
      unsubTemplates();
    };
  }, [user, isAuthReady]);

  const filteredBadges = badges.filter(badge => {
    const bName = badge.programName || (badge as any).programTitle || (badge as any).badgeName || (badge as any).badgeTemplateName || "Unnamed Badge";
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
            <p className="text-slate-500 text-sm">Manage and share your active credentials</p>
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
          filteredBadges.map((badge) => {
            const matchedTemplate = templates.find(
              (template) => template.id === (badge.badgeTemplateId || badge.badgeId)
            );
            return (
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
                  
                  {matchedTemplate && (
                    <div className="mb-4 flex justify-center">
                      <BadgeRenderer
                        scale={0.52}
                        data={{
                          id: badge.id,
                          name: matchedTemplate.badgeName,
                          learnerName: badge.learnerName || user?.displayName || "Learner Name",
                          issueDate: formatDate(badge.issueDate),
                          validUntil: formatDate(badge.validUntil),
                          verificationId: badge.verificationId || (badge as any).certificationId || "PENDING",
                          imageUrl: matchedTemplate.imageUrl || "",
                          level: badge.badgeType || matchedTemplate.badgeType,
                          qualificationTitle:
                            matchedTemplate.qualificationName ||
                            badge.qualificationName ||
                            badge.programTitle,
                          qualificationCode:
                            matchedTemplate.qualificationCode ||
                            badge.qualificationCode,
                          templateConfig: matchedTemplate.templateConfig
                        }}
                      />
                    </div>
                  )}
                  
                  <h3 className="font-bold text-slate-900 mb-1 group-hover:text-blue-600 transition-colors line-clamp-2 min-h-[3rem]">
                    {badge.programName || (badge as any).programTitle || (badge as any).badgeName || (badge as any).badgeTemplateName || "Unnamed Badge"}
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
          );
        })
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
