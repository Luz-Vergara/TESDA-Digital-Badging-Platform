import React, { useEffect, useState } from 'react';
import { Award, Wallet, ArrowRight, Bell, BookOpen, Clock } from 'lucide-react';
import { collection, query, where, onSnapshot, getDocs, limit } from 'firebase/firestore';
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
  const { user, userProfile, isAuthReady } = useFirebase();
  const [earnedBadges, setEarnedBadges] = useState<BadgeMetadata[]>([]);
  const [recommendations, setRecommendations] = useState<BadgeTemplate[]>([]);
  const [learnerData, setLearnerData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [showComingSoon, setShowComingSoon] = useState(false);

  useEffect(() => {
    if (!isAuthReady || !user) {
      if (isAuthReady && !user) setLoading(false);
      return;
    }

    const path = 'issuedBadges';
    const q = query(
      collection(db, path),
      where('learnerEmail', '==', user.email)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allBadges = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as any[];
      
      // Filter for published or pending badges
      const badges = allBadges.filter(b => 
        b.publishedToLearner === true || 
        ['Pending Approval', 'Submitted to CO', 'Under CO Review', 'Badge ID Generated', 'Forwarded to District Office'].includes(b.status)
      ) as unknown as BadgeMetadata[];
      
      setEarnedBadges(badges);
      setLoading(false);
    }, (error) => {
      console.error("Dashboard Snapshot Error:", error);
      setLoading(false); // Stop loading even on error to show empty state/error message
      handleFirestoreError(error, OperationType.GET, path);
    });

    return () => unsubscribe();
  }, [user?.email, isAuthReady]);

  // Fetch learner specific data and recommendations
  useEffect(() => {
    if (!isAuthReady || !user?.email) return;

    const fetchLearnerData = async () => {
      try {
        const lq = query(collection(db, 'learners'), where('email', '==', user.email));
        const lSnap = await getDocs(lq);
        if (!lSnap.empty) {
          const lData = lSnap.docs[0].data();
          setLearnerData(lData);
          
          // Fetch recommendations based on qualification
          const qual = lData.qualification || '';
          const hasAnimationInterest = qual.toLowerCase().includes('animation') || 
                                      earnedBadges.some(b => (b.badgeName || '').toLowerCase().includes('animation'));

          const templatesQuery = query(
            collection(db, 'badgeTemplates'),
            limit(50)
          );
          
          const tSnap = await getDocs(templatesQuery);
          let allTemplates = tSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as BadgeTemplate[];
          
          // Filter out already earned badges
          const earnedIds = earnedBadges.map(b => b.badgeId);
          
          // Custom Recommendation Logic
          let recs: BadgeTemplate[] = [];

          // 1. Specifically look for 2D Animation NC III if interested
          if (hasAnimationInterest) {
            const animationExpert = allTemplates.find(t => 
              t.badgeName?.includes('2D Animation NC III') || 
              (t.qualificationName?.includes('2D Animation') && t.badgeType === 'Expert')
            );
            if (animationExpert && !earnedIds.includes(animationExpert.id)) {
              recs.push(animationExpert);
            }
          }

          // 2. Fill with other expert badges from same qualification
          const sameQualExpert = allTemplates.filter(t => 
            !earnedIds.includes(t.id) && 
            t.qualificationName === qual && 
            t.badgeType === 'Expert' &&
            !recs.find(r => r.id === t.id)
          );
          recs = [...recs, ...sameQualExpert];

          // 3. Fill with other badges from same qualification
          const sameQualOther = allTemplates.filter(t => 
            !earnedIds.includes(t.id) && 
            t.qualificationName === qual && 
            !recs.find(r => r.id === t.id)
          );
          recs = [...recs, ...sameQualOther];

          // 4. Fill with any expert badges
          if (recs.length < 3) {
            const otherExperts = allTemplates.filter(t => 
              !earnedIds.includes(t.id) && 
              t.badgeType === 'Expert' && 
              !recs.find(r => r.id === t.id)
            );
            recs = [...recs, ...otherExperts];
          }

          setRecommendations(recs.slice(0, 3));
        }
      } catch (err) {
        console.error("Error fetching recommendations:", err);
      }
    };

    fetchLearnerData();
  }, [user?.email, isAuthReady, earnedBadges.length]);

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
            Welcome back, {userProfile?.name?.split(' ')[0]}!
            {earnedBadges.some(b => b.pathway === 'Recognition of Prior Learning (RPL)') && (
              <Badge className="bg-purple-600 text-white text-[10px] uppercase tracking-wider py-0.5 px-2">RPL Pathway</Badge>
            )}
          </h1>
          <p className="text-slate-500">You have earned {earnedBadges.length} badges. Keep it up!</p>
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Badges */}
        <Card className="border-slate-200">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total</p>
              <p className="text-xl font-bold text-slate-900">{earnedBadges.length}</p>
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
                {earnedBadges.filter(b => b.badgeType === 'Proficient').length}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Expert */}
        <Card className="border-slate-200 border-l-4 border-l-green-500">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-50 text-green-600 flex items-center justify-center shrink-0">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Expert</p>
              <p className="text-xl font-bold text-slate-900">
                {earnedBadges.filter(b => b.badgeType === 'Expert').length}
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
                {earnedBadges.filter(b => b.badgeType === 'Skilled').length}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Master */}
        <Card className="border-slate-200 border-l-4 border-l-purple-500">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Master</p>
              <p className="text-xl font-bold text-slate-900">
                {earnedBadges.filter(b => b.badgeType === 'Master').length}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main Content - Recent Badges */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-slate-900">Recent Badges</h2>
            <Link to="/learner/wallet">
              <Button variant="link" className="text-blue-600 p-0 h-auto">View Wallet</Button>
            </Link>
          </div>
          
          {earnedBadges.length > 0 ? (
            <div className="grid md:grid-cols-2 gap-6">
              {earnedBadges.slice(0, 2).map((badge) => (
                <div key={badge.id}>
                  <BadgeCard badge={badge} />
                </div>
              ))}
            </div>
          ) : (
            <Card className="border-dashed border-slate-300 bg-slate-50">
              <CardContent className="p-12 text-center">
                <Award className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">No badges earned yet. Start a program to earn your first badge!</p>
              </CardContent>
            </Card>
          )}

          {/* In-Progress Programs would go here - removing hardcoded placeholder as requested */}
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
