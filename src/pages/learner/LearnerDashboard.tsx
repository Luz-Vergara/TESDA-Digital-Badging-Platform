import React, { useEffect, useState } from 'react';
import { Award, Wallet, TrendingUp, ArrowRight, Bell, Plus } from 'lucide-react';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/src/lib/firebase';
import { useFirebase } from '@/src/lib/FirebaseProvider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import BadgeCard from '@/src/components/BadgeCard';
import { BadgeMetadata } from '@/src/types';

export default function LearnerDashboard() {
  const { user, userProfile, isAuthReady } = useFirebase();
  const [earnedBadges, setEarnedBadges] = useState<BadgeMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const createTestBadge = async () => {
    if (!user) return;
    setCreating(true);
    try {
      const testBadge = {
        learnerId: user.uid,
        programName: 'Web Development NC III',
        badgeType: 'Master',
        description: 'Demonstrated advanced proficiency in full-stack web development, including React, Node.js, and Cloud Infrastructure.',
        issuer: 'TESDA National Assessment Center',
        badgeHolder: user.displayName || 'Learner',
        criteria: 'Successful completion of national assessment for Web Development NC III.',
        issuanceDate: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
        verificationId: `TESDA-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
        validity: 'Permanent',
        alignment: 'Philippine Qualifications Framework (PQF) Level 5',
        tags: ['Web Development', 'React', 'Full Stack'],
        standards: ['TESDA-WD-2023-001'],
        status: 'Active',
        termsOfUse: 'This badge is the property of TESDA and is issued to the named individual upon successful assessment.',
        hierarchyLevel: 4,
        createdAt: serverTimestamp()
      };
      
      await addDoc(collection(db, 'issuedBadges'), testBadge);
      alert('Test badge created successfully! You can now use the Verification ID to test the Verify Badge page.');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'issuedBadges');
    } finally {
      setCreating(false);
    }
  };

  useEffect(() => {
    if (!isAuthReady || !user) {
      if (isAuthReady && !user) setLoading(false);
      return;
    }

    const path = 'issuedBadges';
    const q = query(
      collection(db, path),
      where('learnerId', '==', user.uid),
      where('status', '==', 'Active')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const badges = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as unknown as BadgeMetadata[];
      setEarnedBadges(badges);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });

    return () => unsubscribe();
  }, [user, isAuthReady]);

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
          <h1 className="text-3xl font-bold text-slate-900">Welcome back, {userProfile?.name?.split(' ')[0]}!</h1>
          <p className="text-slate-500">You have earned {earnedBadges.length} badges. Keep it up!</p>
        </div>
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            className="gap-2 border-blue-200 text-blue-600 hover:bg-blue-50"
            onClick={createTestBadge}
            disabled={creating}
          >
            <Plus className="h-4 w-4" />
            {creating ? 'Creating...' : 'Create Test Badge'}
          </Button>
          <Button variant="outline" className="gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </Button>
          <Button className="bg-blue-600 hover:bg-blue-700 gap-2">
            <Award className="h-4 w-4" />
            View All Badges
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card className="border-slate-200">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
              <Wallet className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Total Badges</p>
              <p className="text-2xl font-bold text-slate-900">{earnedBadges.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <Award className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Master Badges</p>
              <p className="text-2xl font-bold text-slate-900">
                {earnedBadges.filter(b => b.badgeType === 'Master').length}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
              <TrendingUp className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Completion Rate</p>
              <p className="text-2xl font-bold text-slate-900">85%</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main Content - Recent Badges */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-slate-900">Recent Badges</h2>
            <Button variant="link" className="text-blue-600 p-0 h-auto">View Wallet</Button>
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

          <div className="space-y-4">
            <h2 className="text-xl font-bold text-slate-900">In-Progress Programs</h2>
            <Card className="border-slate-200">
              <CardContent className="p-6 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-slate-900">Network Administration NC III</h3>
                    <p className="text-sm text-slate-500">Targeting Master Badge</p>
                  </div>
                  <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">65% Complete</Badge>
                </div>
                <Progress value={65} className="h-2" />
                <div className="flex justify-between text-xs text-slate-500">
                  <span>4 of 6 Units Completed</span>
                  <span>Est. Completion: Dec 2023</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Sidebar - Recommendations & Hierarchy */}
        <div className="space-y-8">
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="text-lg">Badge Hierarchy</CardTitle>
              <CardDescription>Your progress across tiers</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {[
                { label: 'Proficient', type: 'Proficient', total: 10, color: 'bg-blue-600' },
                { label: 'Expert', type: 'Expert', total: 5, color: 'bg-green-600' },
                { label: 'Skilled', type: 'Skilled', total: 3, color: 'bg-amber-600' },
                { label: 'Master', type: 'Master', total: 2, color: 'bg-purple-600' },
              ].map((tier) => {
                const count = earnedBadges.filter(b => b.badgeType === tier.type).length;
                return (
                  <div key={tier.label} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-slate-700">{tier.label}</span>
                      <span className="text-slate-500">{count}/{tier.total}</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${tier.color}`} 
                        style={{ width: `${Math.min((count / tier.total) * 100, 100)}%` }} 
                      />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-blue-600 text-white">
            <CardHeader>
              <CardTitle className="text-lg">Recommended for You</CardTitle>
              <CardDescription className="text-blue-100">Based on your background</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 bg-white/10 rounded-lg border border-white/20">
                <p className="font-bold text-sm mb-1">Cybersecurity Fundamentals</p>
                <p className="text-xs text-blue-100">Earn a Skilled Badge</p>
              </div>
              <div className="p-3 bg-white/10 rounded-lg border border-white/20">
                <p className="font-bold text-sm mb-1">Cloud Computing Essentials</p>
                <p className="text-xs text-blue-100">Earn an Expert Badge</p>
              </div>
              <Button variant="secondary" className="w-full mt-2 text-blue-700 font-bold">
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
