import React, { useEffect, useState, useMemo } from 'react';
import { Award, Wallet, ArrowRight, Bell, BookOpen, Clock, Building2 } from 'lucide-react';

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}

import { collection, query, where, onSnapshot, getDocs, limit, doc, getDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/src/lib/firebase';
import { useFirebase } from '@/src/lib/FirebaseProvider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import BadgeCard from '@/src/components/BadgeCard';
import { BadgeMetadata, BadgeTemplate } from '@/src/types';
import { Link, useNavigate } from 'react-router-dom';

export default function LearnerDashboard() {
  const navigate = useNavigate();
  const { user, userProfile, linkedExternalLearner, isAuthReady } = useFirebase();
  const [badgesEmail, setBadgesEmail] = useState<any[]>([]);
  const [badgesId, setBadgesId] = useState<any[]>([]);
  const [badgesRequests, setBadgesRequests] = useState<any[]>([]);
  const [templates, setTemplates] = useState<BadgeTemplate[]>([]);
  const [recommendations, setRecommendations] = useState<BadgeTemplate[]>([]);
  const [learnerData, setLearnerData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [offerings, setOfferings] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);

  const [showComingSoon, setShowComingSoon] = useState(false);
  const [myRplSubmissions, setMyRplSubmissions] = useState<any[]>([]);

  // Combine badges from both email, ID queries, and approved requests
  const activeBadges = useMemo(() => {
    const combined = [...badgesEmail];
    
    badgesId.forEach(item => {
      if (!combined.find(c => c.id === item.id)) {
        combined.push(item);
      }
    });

    // Add approved requests to the list only if there is no individual issued badge
    badgesRequests.forEach(req => {
      const alreadyHasBadge = combined.some(c => 
        c.badgeRequestId === req.id ||
        c.badgeTemplateId === req.badgeTemplateId ||
        (c.badgeId && c.badgeId === req.badgeTemplateId) ||
        c.id === req.id
      );
      if (!alreadyHasBadge) {
        const summaryItem = req.issuedBadgeSummary?.find((s: any) => s.learnerId === user?.uid);
        combined.push({
          ...req,
          id: summaryItem?.issuedBadgeId || req.id,
          badgeId: summaryItem?.badgeId || req.badgeId || '',
          verificationId: summaryItem?.verificationId || req.verificationId || '',
          badgeName: req.badgeTemplateName || req.badgeName || req.programTitle,
          status: 'Approved' // Treat as approved/earned
        });
      }
    });
    
    // Filter to only include badges that match a known template
    return combined.filter(badge => {
      let matchedTemplate: BadgeTemplate | undefined = undefined;

      // 1. Primary: Match by qualificationCode if available on both the badge and template
      const bQualCode = badge.qualificationCode || (badge as any).programCode || (badge as any).qualificationCode;
      if (bQualCode) {
        const cleanBQual = String(bQualCode).trim().toLowerCase();
        // Try exact match with both qualificationCode and optionally badgeType
        matchedTemplate = templates.find(t => 
          t.qualificationCode && 
          t.qualificationCode.trim().toLowerCase() === cleanBQual &&
          (!badge.badgeType || t.badgeType.toLowerCase() === badge.badgeType.toLowerCase())
        );
        // Fallback to just qualificationCode match
        if (!matchedTemplate) {
          matchedTemplate = templates.find(t => 
            t.qualificationCode && 
            t.qualificationCode.trim().toLowerCase() === cleanBQual
          );
        }
      }

      // 2. Secondary: Match by Template ID
      if (!matchedTemplate) {
        const bId = badge.badgeTemplateId || badge.badgeId;
        matchedTemplate = templates.find(t => t.id === bId);
      }
      
      // 3. Tertiary: Fallback title match with aggressive normalization
      const normalize = (s: string) => {
        return s.toLowerCase()
          .replace(/[^a-z0-9]/g, ' ')
          .replace(/\(proficient\)|\(expert\)|\(skilled\)|\(master\)/g, '')
          .replace(/level|animation|competency/g, '')
          .replace(/\s+/g, ' ')
          .trim();
      };
      
      const bTitleNorm = normalize(badge.programTitle || badge.badgeName || badge.badgeTemplateName || '');
      
      if (!matchedTemplate && bTitleNorm) {
        let bestTemplate: BadgeTemplate | null = null;
        let highestScore = 0;
        const bWords = bTitleNorm.split(' ').filter(w => w.length >= 2);

        templates.forEach(t => {
          // Check for code mismatch
          const bCode = (badge.qualificationCode || (badge as any).programCode || '').toString().trim().toLowerCase().replace(/[^a-z0-9]/g, '');
          const tCode = (t.qualificationCode || '').toString().trim().toLowerCase().replace(/[^a-z0-9]/g, '');
          if (bCode && tCode && bCode !== tCode) {
            return; // Explicitly skip matching this template due to code mismatch!
          }

          const tTitleNorm = normalize(t.badgeName || '');
          if (!tTitleNorm) return;

          let score = 0;
          if (tTitleNorm === bTitleNorm) {
            score = 100; // Perfect match
          } else if (bTitleNorm.includes(tTitleNorm) || tTitleNorm.includes(bTitleNorm)) {
            // High score for direct string inclusion
            const ratio = Math.min(bTitleNorm.length, tTitleNorm.length) / Math.max(bTitleNorm.length, tTitleNorm.length);
            score = 60 + ratio * 20;
          } else {
            const tWords = tTitleNorm.split(' ').filter(w => w.length >= 2);
            const intersection = bWords.filter(w => tWords.includes(w));
            if (intersection.length >= 2) {
              // Word overlap score
              const overlapCoeff = intersection.length / Math.max(bWords.length, tWords.length);
              score = overlapCoeff * 50;
            }
          }

          // Prioritize template that matches the badge's tier/type
          const bType = (badge.badgeType || '').toLowerCase();
          const tType = (t.badgeType || '').toLowerCase();
          if (score > 0) {
            if (bType && tType && bType === tType) {
              score += 15;
            }
          }

          if (score > highestScore) {
            highestScore = score;
            bestTemplate = t;
          }
        });

        if (highestScore >= 20) {
          matchedTemplate = bestTemplate || undefined;
        }
      }

      if (matchedTemplate) {
         // Attach/align template metadata
         badge.badgeType = matchedTemplate.badgeType;
         badge.badgeName = matchedTemplate.badgeName;
         badge.qualificationCode = matchedTemplate.qualificationCode;
         if (matchedTemplate.qualificationName) {
           badge.qualificationName = matchedTemplate.qualificationName;
         }
         badge.template = matchedTemplate;
         return true;
      }
      
      return false;
    }).sort((a, b) => {
      const dateA = a.issueDate?.seconds || a.submittedAt?.seconds || 0;
      const dateB = b.issueDate?.seconds || b.submittedAt?.seconds || 0;
      return dateB - dateA;
    });
  }, [badgesEmail, badgesId, badgesRequests, templates, user]);

  useEffect(() => {
    if (!isAuthReady || !user?.email) {
      if (isAuthReady && !user) setLoading(false);
      return;
    }

    // Fetch official templates for verification
    const unsubTemplates = onSnapshot(collection(db, 'badgeTemplates'), (snapshot) => {
      setTemplates(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BadgeTemplate)));
    });

    const path = 'issuedBadges';
    
    // Filter logic for valid badges to show in dashboard
    const filterValid = (docs: any[]) => {
      return docs.filter(item => 
        item.publishedToLearner === true || 
        ['Active', 'Approved', 'Published', 'Earned', 'Pending Approval', 'Submitted to CO', 'Under CO Review', 'Badge ID Generated', 'Forwarded to District Office'].includes(item.status)
      );
    };

    const qEmail = query(
      collection(db, path),
      where('learnerEmail', '==', user.email)
    );
    const qId = query(
      collection(db, path),
      where('learnerId', '==', user.uid)
    );

    const qRequests = query(
      collection(db, 'badgeRequests'),
      where('learnerIds', 'array-contains', user.uid),
      where('status', 'in', ['Approved', 'Badge ID Generated'])
    );

    const unsubEmail = onSnapshot(qEmail, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setBadgesEmail(filterValid(docs));
      setLoading(false);
    }, (error) => {
      console.error("Dashboard Email Error:", error);
      setLoading(false);
      handleFirestoreError(error, OperationType.GET, path);
    });

    const unsubId = onSnapshot(qId, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setBadgesId(filterValid(docs));
      setLoading(false);
    }, (error) => {
      console.error("Dashboard ID Error:", error);
    });

    const unsubRequests = onSnapshot(qRequests, (snapshot) => {
      setBadgesRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      console.error("Dashboard Requests Error:", error);
    });

    const qRpl = query(collection(db, 'rplApplications'), where('learnerId', '==', user.uid));
    const unsubRpl = onSnapshot(qRpl, (snapshot) => {
      setMyRplSubmissions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => {
      console.error("Dashboard RPL Submissions Error:", err);
    });

    return () => {
      unsubEmail();
      unsubId();
      unsubRequests();
      unsubTemplates();
      unsubRpl();
    };
  }, [user?.email, user?.uid, isAuthReady]);

  // Fetch active enrollments (e.g. for training-based learners like Melanie)
  useEffect(() => {
    if (!isAuthReady || !user) return;

    const enrPath = 'enrollments';
    const q1 = query(
      collection(db, enrPath),
      where('learnerId', '==', user.uid),
      where('enrollmentStatus', '==', 'Enrolled')
    );

    const unsubscribe = onSnapshot(q1, async (snapshot) => {
      let data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Fallback in case email query matches standard user registration vs learner record email
      if (data.length === 0 && user.email) {
        try {
          const q2 = query(
            collection(db, enrPath),
            where('learnerEmail', '==', user.email),
            where('enrollmentStatus', '==', 'Enrolled')
          );
          const emailSnap = await getDocs(q2);
          data = emailSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (err) {
          console.error("Error fetching enrollments by email:", err);
        }
      }

      setEnrollments(data);

      if (data.length > 0) {
        try {
          const offIds = [...new Set(data.map((d: any) => d.programOfferingId))];
          const batchIds = [...new Set(data.map((d: any) => d.programBatchId).filter(Boolean))];
          
          const [offDocs, batchDocs] = await Promise.all([
            Promise.all(offIds.map(id => getDoc(doc(db, 'programOfferings', id)))),
            Promise.all(batchIds.map(id => getDoc(doc(db, 'programBatches', id))))
          ]);
          
          setOfferings(offDocs.filter(d => d.exists()).map(d => ({ id: d.id, ...d.data() })));
          setBatches(batchDocs.filter(d => d.exists()).map(d => ({ id: d.id, ...d.data() })));
        } catch (err) {
          console.error("Error loading enrollment subdocs:", err);
        }
      }
    }, (error) => {
      console.error("Dashboard enrollments listener error:", error);
    });

    return () => unsubscribe();
  }, [user, isAuthReady]);

  // Fetch learner specific data and recommendations
  useEffect(() => {
    if (!isAuthReady || !user?.email) return;

    const fetchLearnerData = async () => {
      try {
        const lPath = 'learners';
        const lq = query(collection(db, lPath), where('email', '==', user.email));
        const lSnap = await getDocs(lq);
        
        let lData: any = null;
        if (!lSnap.empty) {
          lData = lSnap.docs[0].data();
        } else if (user.email) {
          // Robust case-insensitive check on entire collection if capitalized differently
          const qAll = query(collection(db, lPath));
          const allSnap = await getDocs(qAll);
          const foundDoc = allSnap.docs.find(d => (d.data().email || '').toLowerCase() === user.email.toLowerCase());
          if (foundDoc) {
            lData = foundDoc.data();
          }
        }

        if (lData) {
          setLearnerData(lData);
          
          // Fetch recommendations based on qualification
          const qual = lData.qualification || '';
          const hasAnimationInterest = qual.toLowerCase().includes('animation') || 
                                      activeBadges.some(b => (b.badgeName || '').toLowerCase().includes('animation'));

          const tPath = 'badgeTemplates';
          const templatesQuery = query(
            collection(db, tPath),
            limit(50)
          );
          
          const tSnap = await getDocs(templatesQuery);
          let allTemplates = tSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as BadgeTemplate[];
          
          // Filter out already active badges
          const activeIds = activeBadges.map(b => b.badgeId);
          
          // Custom Recommendation Logic
          let recs: BadgeTemplate[] = [];

          // 1. Specifically look for 2D Animation NC III if interested
          if (hasAnimationInterest) {
            const animationTemplate = allTemplates.find(t =>
              t.badgeName?.includes('2D Animation NC III') || 
              (t.qualificationName?.includes('2D Animation') && t.badgeType === 'Skilled')
            );
            if (animationTemplate && !activeIds.includes(animationTemplate.id)) {
              recs.push(animationTemplate);
            }
          }

          // 2. Fill with other Skilled badges from the same qualification.
          const sameQualSkilled = allTemplates.filter(t =>
            !activeIds.includes(t.id) && 
            t.qualificationName === qual && 
            t.badgeType === 'Skilled' &&
            !recs.find(r => r.id === t.id)
          );
          recs = [...recs, ...sameQualSkilled];

          // 3. Fill with other badges from same qualification
          const sameQualOther = allTemplates.filter(t => 
            !activeIds.includes(t.id) && 
            t.qualificationName === qual && 
            !recs.find(r => r.id === t.id)
          );
          recs = [...recs, ...sameQualOther];

          // 4. Fill with any remaining Skilled badges.
          if (recs.length < 3) {
            const otherSkilled = allTemplates.filter(t =>
              !activeIds.includes(t.id) && 
              t.badgeType === 'Skilled' &&
              !recs.find(r => r.id === t.id)
            );
            recs = [...recs, ...otherSkilled];
          }

          setRecommendations(recs.slice(0, 3));
        }
      } catch (err: any) {
        console.error("Error fetching recommendations:", err);
        // Silent error for dashboard recommendations to avoid breaking UI
      }
    };

    fetchLearnerData();
  }, [user?.email, isAuthReady, activeBadges.length]);


  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-slate-500 font-medium">Loading your credentials...</p>
        </div>
      </div>
    );
  }

  const getLearnerDisplayName = () => {
    if (linkedExternalLearner?.displayName) {
      return linkedExternalLearner.displayName;
    }
    if (learnerData?.firstName) {
      return [learnerData.firstName, learnerData.lastName].filter(Boolean).join(' ');
    }
    const rawName = userProfile?.name || '';
    if (!rawName) return 'Learner';
    const parenthesizedMatch = rawName.match(/\(([^)]+)\)/);
    if (parenthesizedMatch && parenthesizedMatch[1]) {
      const pName = parenthesizedMatch[1];
      return pName.split(' ')[0] || pName;
    }
    if (rawName.startsWith('Demo Learner')) {
      return 'Learner';
    }
    if (rawName.startsWith('Demo ')) {
      const clean = rawName.replace('Demo ', '').trim();
      return clean.split(' ')[0] || clean;
    }
    return rawName.split(' ')[0] || 'Learner';
  };

  if (!user) {
    return (
      <div className="p-8 text-center text-slate-500">
        Please sign in to view your dashboard.
      </div>
    );
  }
  
  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
            Welcome back, {getLearnerDisplayName()}!
            {activeBadges.some(b => b.pathway === 'Recognition of Prior Learning (RPL)') && (
              <Badge className="bg-purple-600 text-white text-[10px] uppercase tracking-wider py-0.5 px-2">RPL Pathway</Badge>
            )}
          </h1>
          <p className="text-slate-500">You have {activeBadges.length} active badges. Keep it up!</p>
          {linkedExternalLearner?.learnerUli && (
            <p className="mt-1 font-mono text-xs text-slate-500">ULI: {linkedExternalLearner.learnerUli}</p>
          )}
        </div>
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            className="gap-2 min-w-[140px]"
            onClick={() => {
              setShowComingSoon(true);
              setTimeout(() => setShowComingSoon(false), 2000);
            }}
          >
            <Bell className="h-4 w-4" />
            {showComingSoon ? 'Coming Soon!' : 'Notifications'}
          </Button>
          <Link to="/learner/wallet">
            <Button className="bg-blue-600 hover:bg-blue-700 gap-2">
              <Award className="h-4 w-4" />
              View All Badges
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Total Badges */}
        <Card className="border-slate-200">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total</p>
              <p className="text-xl font-bold text-slate-900">{activeBadges.length}</p>
            </div>
          </CardContent>
        </Card>

        {/* Proficient */}
        <Card className="border-slate-200">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Proficient</p>
              <p className="text-xl font-bold text-slate-900">
                {activeBadges.filter(b => b.badgeType === 'Proficient').length}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Skilled */}
        <Card className="border-slate-200 border-l-4 border-l-amber-500">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Skilled</p>
              <p className="text-xl font-bold text-slate-900">
                {activeBadges.filter(b => b.badgeType === 'Skilled').length}
              </p>
            </div>
          </CardContent>
        </Card>

      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main Content - Recent Badges */}
        <div className="lg:col-span-2 space-y-6">
          {/* Ongoing RPL Applications */}
          {myRplSubmissions.length > 0 && (
            <div className="space-y-4 pb-4 border-b border-slate-200">
              <div className="flex justify-between items-center">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
                  <Award className="h-5 w-5 text-purple-600 shrink-0" />
                  Recognition of Prior Learning (RPL) Submissions
                </h3>
                <Link to="/learner/rpl">
                  <Button variant="outline" size="sm" className="text-xs h-7 border-slate-200 hover:bg-purple-50 hover:text-purple-700 font-semibold">
                    Open Trackers
                  </Button>
                </Link>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {myRplSubmissions.map((app) => (
                  <Card key={app.id} className="border-slate-150 shadow-sm bg-purple-50/10 hover:border-purple-200 transition-all overflow-hidden">
                    <div className="h-0.5 bg-purple-500 w-full" />
                    <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] uppercase font-mono tracking-wider font-bold text-slate-400">
                            Ref: {app.id?.substring(0, 8)}...
                          </span>
                          <Badge className="bg-purple-100 text-purple-800 border-none hover:bg-purple-100 text-[9px] font-bold px-1.5 py-0 shrink-0">
                            RPL Entry
                          </Badge>
                          <Badge className={`text-[9px] font-bold px-2 py-0 border shrink-0 ${
                            app.status === 'Assessment Completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            app.status === 'Eligible for Assessment' || app.status === 'Ready for Assessment Endorsement' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                            app.status === 'Returned to TC' || app.status === 'Not Eligible' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                            app.status === 'Additional Documents Requested' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-50 text-slate-600 border-slate-200'
                          }`}>
                            {app.status}
                          </Badge>
                        </div>
                        <h4 className="font-bold text-sm text-slate-800 line-clamp-1">
                          [{app.qualificationCode}] {app.qualificationName}
                        </h4>
                        <p className="text-xs text-slate-500">
                          Assigned Hub: <span className="font-semibold text-slate-700">{app.trainingCenterName}</span>
                        </p>
                        {app.assessmentBatchName && (
                          <div className="mt-2.5 p-2.5 bg-blue-50/50 rounded-lg text-[11px] text-blue-900 border border-blue-100 max-w-md space-y-0.5">
                            <p className="font-bold text-blue-800 flex items-center gap-1 mb-1">
                              <Clock className="h-3 w-3" />
                              Assigned Assessment Schedule
                            </p>
                            <p>
                              Batch: <strong className="font-semibold text-slate-800">{app.assessmentBatchName}</strong>
                            </p>
                            <p>
                              Date: <strong className="font-semibold text-slate-850">{app.assessmentDate}</strong> | Time: <strong className="font-semibold">{app.assessmentStartTime} - {app.assessmentEndTime}</strong>
                            </p>
                            <p>
                              Room: <strong className="font-semibold text-slate-850">{app.assessmentVenue}</strong> | Assessor: <strong className="font-semibold">{app.assessorName}</strong>
                            </p>
                            {app.assessmentRemarks && (
                              <p className="text-[10px] text-slate-500 italic border-t border-slate-100 pt-1 mt-1 font-mono">
                                Note: "{app.assessmentRemarks}"
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-3 shrink-0 self-end md:self-auto">
                        <div className="text-right hidden md:block">
                          <p className="text-[9px] text-slate-450 font-mono">UPDATED</p>
                          <p className="text-xs font-semibold text-slate-600">
                            {app.updatedAt ? new Date(app.updatedAt.seconds * 1000).toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric'}) : 'Just Now'}
                          </p>
                        </div>
                        <Link to="/learner/rpl">
                          <Button size="sm" className="bg-purple-600 text-white hover:bg-purple-700 text-xs font-semibold flex items-center gap-1 px-3 h-8">
                            Check Status
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-slate-900">Recent Badges</h2>
            <Link to="/learner/wallet">
              <Button variant="link" className="text-blue-600 p-0 h-auto">View Wallet</Button>
            </Link>
          </div>
          
          {activeBadges.length > 0 ? (
            <div className="grid md:grid-cols-2 gap-6">
              {activeBadges.slice(0, 6).map((badge) => (
                <div key={badge.id}>
                  <BadgeCard badge={badge} template={badge.template} />
                </div>
              ))}
            </div>
          ) : (
            <Card className="border-dashed border-slate-300 bg-slate-50">
              <CardContent className="p-12 text-center">
                <Award className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">No active badges yet. Start a program to earn your first badge!</p>
              </CardContent>
            </Card>
          )}

          {/* Active Enrollments */}
          {enrollments.length > 0 && (
            <div className="space-y-4 pt-4 border-t border-slate-200">
              <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-blue-600" />
                My Active Enrollments
              </h3>
              <div className="grid md:grid-cols-2 gap-6">
                {enrollments.map((enr) => {
                  const off = offerings.find(o => o.id === enr.programOfferingId);
                  const batch = batches.find(b => b.id === enr.programBatchId);
                  return (
                    <Card key={enr.id} className="border-slate-200 hover:border-blue-300 transition-all hover:shadow-md overflow-hidden bg-white">
                      <div className="h-1 bg-emerald-500" />
                      <CardHeader className="pb-3 pt-4 px-4">
                        <div className="flex justify-between items-start gap-2">
                          <Badge variant="default" className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200">
                            {enr.enrollmentStatus}
                          </Badge>
                          <BookOpen className="h-4 w-4 text-blue-500 shrink-0 mt-1" />
                        </div>
                        <CardTitle className="text-base font-bold mt-2 text-slate-800 line-clamp-1">{off?.programTitle || 'Program'}</CardTitle>
                        <p className="text-[10px] text-slate-400 font-mono italic">{off?.qualificationCode || 'Code'}</p>
                      </CardHeader>
                      <CardContent className="space-y-4 pb-4 px-4">
                        <div className="space-y-2 text-xs">
                          <div className="flex items-center gap-2 text-slate-600">
                            <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span className="font-semibold truncate">{off?.trainingCenterName || 'Center'}</span>
                          </div>
                          <div className="flex items-center gap-2 text-slate-600">
                            <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span>Batch: <span className="font-medium text-slate-800">{batch?.batchName || 'General'}</span></span>
                          </div>
                        </div>

                        <div className="space-y-1.5 pt-2 border-t border-slate-100">
                          <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                            <span>Progress: {enr.completionStatus || 'Not Started'}</span>
                            <span className="text-slate-700">
                              {enr.completionStatus === 'Completed' ? '100%' : 
                               enr.completionStatus === 'For Assessment' ? '75%' : 
                               enr.completionStatus === 'In Progress' ? '40%' : '0%'}
                            </span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div className={cn(
                              "h-full transition-all duration-500",
                              enr.completionStatus === 'Completed' ? 'w-full bg-emerald-500' : 
                              enr.completionStatus === 'For Assessment' ? 'w-3/4 bg-blue-500' :
                              enr.completionStatus === 'In Progress' ? 'w-2/5 bg-amber-500' : 'w-0'
                            )} />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </div>


        {/* Sidebar - Recommendations */}
        <div className="space-y-8">
          <Card className="border-slate-200 bg-blue-600 text-white overflow-hidden">
            <div className="p-6 pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-blue-200" />
                Recommended for You
              </CardTitle>
              <CardDescription className="text-blue-100">Based on your {learnerData?.qualification || 'current'} progress</CardDescription>
            </div>
            <CardContent className="px-6 pb-6 space-y-4">
              {recommendations.length > 0 ? (
                recommendations.map((rec) => (
                  <div key={rec.id} className="p-3 bg-white/10 rounded-xl border border-white/20 hover:bg-white/15 transition-colors group cursor-pointer" onClick={() => navigate('/learner/programs')}>
                    <div className="flex justify-between items-start mb-1">
                      <p className="font-bold text-sm leading-tight pr-4">{rec.badgeName}</p>
                      <Badge className="bg-blue-400/30 text-blue-50 text-[9px] border-none font-bold uppercase py-0 px-1.5 shrink-0">
                        {rec.badgeType}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-blue-100">
                      <Clock className="h-3 w-3" />
                      Next logical step
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-4 text-center">
                  <Award className="h-8 w-8 text-blue-300 mx-auto mb-2 opacity-50" />
                  <p className="text-xs text-blue-100">Explore new pathways to find recommendations</p>
                </div>
              )}
              
              <Button 
                variant="secondary" 
                className="w-full mt-2 text-blue-700 font-bold bg-white hover:bg-blue-50 shadow-sm"
                onClick={() => navigate('/learner/programs')}
              >
                Explore Programs
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
