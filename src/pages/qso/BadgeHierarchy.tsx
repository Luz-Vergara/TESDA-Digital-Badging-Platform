import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Award, 
  Layers, 
  Search, 
  Filter, 
  ChevronRight, 
  ChevronDown, 
  CheckCircle2, 
  BookOpen,
  ShieldCheck,
  ArrowUpRight,
  Lock,
  Clock,
  XCircle,
  HelpCircle,
  Info,
  TrendingUp
} from 'lucide-react';
import { collection, query, onSnapshot, where, getDocs } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/src/lib/firebase';
import { useFirebase } from '@/src/lib/FirebaseProvider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { BadgeTemplate, BadgeIssuanceRequest } from '@/src/types';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { getBadgeColor, getStatusColor } from '@/src/lib/badge-utils';
import { format } from 'date-fns';

const TIER_COLORS = {
  Proficient: 'bg-[#f0fdf4] text-green-700 border-green-200', // Light Green
  Skilled: 'bg-[#eff6ff] text-blue-700 border-blue-200',    // Blue
  Expert: 'bg-[#fffbeb] text-amber-700 border-amber-200',   // Light Yellow/Cream
  Master: 'bg-[#fefce8] text-yellow-700 border-yellow-400', // Yellow/Gold
};

const PROGRESS_COLORS = {
  Locked: 'bg-slate-50 text-slate-400 border-slate-200 grayscale opacity-40',
  Pending: 'bg-orange-50 text-orange-600 border-orange-200',
  Rejected: 'bg-rose-50 text-rose-600 border-rose-200',
  Earned: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Eligible: 'bg-blue-50 text-blue-600 border-blue-300',
};

export default function BadgeHierarchy() {
  const { user, userProfile, isAuthReady } = useFirebase();
  const [templates, setTemplates] = useState<BadgeTemplate[]>([]);
  const [userBadges, setUserBadges] = useState<any[]>([]);
  const [learnerProfileFromCollection, setLearnerProfileFromCollection] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedQualifications, setExpandedQualifications] = useState<string[]>([]);
  const [filterLevel, setFilterLevel] = useState<string>('All');
  
  const isLearner = userProfile?.role === 'Learner';

  useEffect(() => {
    if (!isAuthReady || !user) return;

    // Fetch Approved or Active templates that are set to be visible in hierarchy
    const qTemplates = query(
      collection(db, 'badgeTemplates'),
      where('hierarchyVisible', '==', true)
    );

    const unsubTemplates = onSnapshot(qTemplates, (snapshot) => {
      const data = snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as BadgeTemplate[];
      
      const filteredData = data.filter(t => t.status === 'Approved' || t.status === 'Active');
      setTemplates(filteredData);
      
      if (!isLearner) {
        setLoading(false);
      }
    }, (error) => {
      console.error("Templates Snapshot Error:", error);
      handleFirestoreError(error, OperationType.GET, 'badgeTemplates');
      setLoading(false);
    });

    let unsubBadges: () => void = () => {};
    if (isLearner && user) {
      const qBadges = query(
        collection(db, 'issuedBadges'),
        where('learnerEmail', '==', user.email)
      );

      unsubBadges = onSnapshot(qBadges, (snapshot) => {
        const badges = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setUserBadges(badges);
        setLoading(false);
      }, (error) => {
        console.error("User Badges Snapshot Error:", error);
        handleFirestoreError(error, OperationType.GET, 'issuedBadges');
        setLoading(false);
      });
    } else if (isLearner && !user) {
      // If we are a learner but user is missing (logged out), stop loading
      setLoading(false);
    }

    return () => {
      unsubTemplates();
      unsubBadges();
    };
  }, [isAuthReady, isLearner, user]);

  useEffect(() => {
    if (isLearner && user?.email) {
      const q = query(collection(db, 'learners'), where('email', '==', user.email));
      getDocs(q).then(snap => {
        if (!snap.empty) {
          setLearnerProfileFromCollection(snap.docs[0].data());
        }
      }).catch(err => console.error("Error fetching learner profile:", err));
    }
  }, [user, isLearner]);

  // Group templates by qualificationName
  const groupedTemplates = templates.reduce((acc, template) => {
    const qual = template.qualificationName || template.badgeName;
    if (!acc[qual]) acc[qual] = [];
    acc[qual].push(template);
    return acc;
  }, {} as Record<string, BadgeTemplate[]>);

  // Filter qualifications based on search and level filter
  const qualifications = Object.keys(groupedTemplates).filter(qual => {
    const matchesSearch = qual.toLowerCase().includes(searchTerm.toLowerCase());
    const hasFilteredLevel = filterLevel === 'All' || groupedTemplates[qual].some(t => t.badgeType === filterLevel);
    return matchesSearch && hasFilteredLevel;
  }).sort();

  const toggleQualification = (qual: string) => {
    setExpandedQualifications(prev => 
      prev.includes(qual) ? prev.filter(q => q !== qual) : [...prev, qual]
    );
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Badge Hierarchy</h1>
          <p className="text-slate-500 font-medium">
            {isLearner 
              ? "Track your certification progress and competency pathways."
              : "Visual competency pathways and credential progression map."}
          </p>
        </div>
        <div className="flex gap-2">
          {isLearner ? (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 gap-1.5 px-3 py-1">
                <Clock className="h-3.5 w-3.5" />
                Pending
              </Badge>
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1.5 px-3 py-1">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Earned
              </Badge>
            </div>
          ) : (
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1.5 px-3 py-1">
              <ShieldCheck className="h-3.5 w-3.5" />
              Approved Templates Only
            </Badge>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        <Card className="md:col-span-3 border-slate-200 shadow-sm">
          <CardContent className="p-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Search qualification (e.g. 2D Animation NC III)..." 
                className="pl-10 border-none shadow-none focus-visible:ring-0 bg-transparent"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-1.5">
            <Select value={filterLevel} onValueChange={setFilterLevel}>
              <SelectTrigger className="border-none shadow-none focus:ring-0 h-10">
                <Filter className="h-4 w-4 mr-2 text-slate-400" />
                <SelectValue placeholder="All Levels" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Levels</SelectItem>
                <SelectItem value="Proficient">Proficient</SelectItem>
                <SelectItem value="Expert">Expert</SelectItem>
                <SelectItem value="Skilled">Skilled</SelectItem>
                <SelectItem value="Master">Master</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        {qualifications.length > 0 ? (
          qualifications.map((qual) => (
            <QualificationHierarchyRow 
              key={qual} 
              qual={qual} 
              badges={groupedTemplates[qual]} 
              isExpanded={expandedQualifications.includes(qual)}
              onToggle={() => toggleQualification(qual)}
              userBadges={userBadges}
              isLearner={isLearner}
              learnerQualification={learnerProfileFromCollection?.qualification || userProfile?.qualification}
            />
          ))
        ) : (
          <div className="py-24 text-center space-y-4 bg-white rounded-3xl border border-slate-200 border-dashed">
            <Layers className="h-12 w-12 text-slate-200 mx-auto" />
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-900">No Hierarchy Matches</h3>
              <p className="text-sm text-slate-500 max-w-xs mx-auto">We couldn't find any qualifications matching your search or filter.</p>
            </div>
            <Button className="bg-blue-600" onClick={() => { setSearchTerm(''); setFilterLevel('All'); }}>Clear All Filters</Button>
          </div>
        )}
      </div>
    </div>
  );
}

interface RowProps {
  key?: string;
  qual: string;
  badges: BadgeTemplate[];
  isExpanded: boolean;
  onToggle: () => void;
  userBadges: any[];
  isLearner: boolean;
  learnerQualification?: string;
}

function QualificationHierarchyRow({ qual, badges, isExpanded, onToggle, userBadges, isLearner, learnerQualification }: RowProps) {
  const masterBadges = badges.filter(b => b.badgeType === 'Master').sort((a, b) => a.displayOrder - b.displayOrder);
  const expertBadges = badges.filter(b => b.badgeType === 'Expert').sort((a, b) => a.displayOrder - b.displayOrder);
  const skilledBadges = badges.filter(b => b.badgeType === 'Skilled').sort((a, b) => a.displayOrder - b.displayOrder);
  const proficientBadges = badges.filter(b => b.badgeType === 'Proficient').sort((a, b) => a.displayOrder - b.displayOrder);

  const totalBadges = badges.length;
  
  // Detailed status counts for learner
  const isRPLCandidate = userBadges.some(ub => ub.pathway === 'Recognition of Prior Learning (RPL)');

  const stats = badges.reduce((acc, t) => {
    const record = userBadges.find(ub => ub.badgeId === t.id);
    const hasAnyInQual = userBadges.some(ub => ub.qualificationName === qual || ub.badgeName?.includes(qual));

    const earnedStatuses = ['Active', 'Approved', 'Published to Learner Wallet', 'Approved for Publication'];
    const pendingStatuses = [
      'Pending', 'Pending Approval', 'Submitted to CO', 'Under CO Review', 
      'Badge ID Generated', 'Forwarded to District Office', 
      'Pending District Office Approval', 'Approved for Badge ID Generation'
    ];
    const rejectedStatuses = ['Rejected', 'Returned by CO', 'Returned by District Office'];

    if (record) {
      if (earnedStatuses.includes(record.status)) acc.earned++;
      else if (pendingStatuses.includes(record.status)) acc.pending++;
      else if (rejectedStatuses.includes(record.status)) acc.rejected++;
      else acc.locked++;
    } else if (isLearner && (t.qualificationName === learnerQualification || hasAnyInQual)) {
      acc.available++;
    } else {
      acc.locked++;
    }
    return acc;
  }, { earned: 0, pending: 0, available: 0, rejected: 0, locked: 0 });

  const progressValue = totalBadges > 0 ? (stats.earned / totalBadges) * 100 : 0;
  const isComplete = masterBadges.length > 0 && expertBadges.length > 0 && skilledBadges.length > 0 && proficientBadges.length > 0;

  return (
    <Card className="border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
      <button 
        className={cn(
          "w-full flex items-center justify-between p-6 text-left transition-colors",
          isExpanded ? "bg-slate-50" : "hover:bg-slate-50/50"
        )}
        onClick={onToggle}
      >
        <div className="flex items-center gap-6">
          <div className={cn(
            "w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0 transition-all",
            isLearner && stats.earned > 0 ? "bg-emerald-600 shadow-emerald-100" : "bg-blue-600 shadow-blue-100"
          )}>
            <BookOpen className="h-7 w-7 text-white" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h3 className="font-bold text-xl text-slate-900 tracking-tight">{qual}</h3>
              {isLearner && isRPLCandidate && (
                <Badge className="bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-100 text-[10px] gap-1">
                  <TrendingUp className="h-3 w-3" />
                  RPL Fast-Track
                </Badge>
              )}
            </div>
            
            {isLearner && (
              <div className="mt-3 space-y-2">
                <div className="flex justify-between items-end mb-1">
                  <div className="text-xs font-bold text-slate-500">
                    Overall Progress: <span className="text-slate-900">{stats.earned} of {totalBadges} badges earned</span>
                  </div>
                  <div className="text-xs font-bold text-blue-600">
                    {Math.round(progressValue)}%
                  </div>
                </div>
                <Progress value={progressValue} className="h-2 bg-slate-100" />
                
                <div className="flex flex-wrap gap-4 pt-1">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Earned: <span className="text-slate-900">{stats.earned}</span></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-orange-500" />
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Pending: <span className="text-slate-900">{stats.pending}</span></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Available: <span className="text-slate-900">{stats.available}</span></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-slate-300" />
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Locked: <span className="text-slate-900">{stats.locked}</span></span>
                  </div>
                </div>
              </div>
            )}

            {!isLearner && (
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 bg-white border border-slate-200 px-2.5 py-1 rounded-lg">
                  < Award className="h-3.5 w-3.5 text-blue-500" />
                  {totalBadges} Badge{totalBadges !== 1 ? 's' : ''} Defined
                </div>
                {isComplete && (
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 uppercase tracking-widest bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100">
                    <CheckCircle2 className="h-3 w-3" /> Full Pathway Ready
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="hidden lg:flex items-center gap-2">
            <div className="flex -space-x-2">
              {['Master', 'Expert', 'Skilled', 'Proficient'].map(type => {
                const qBadges = badges.filter(b => b.badgeType === type);
                if (qBadges.length === 0) return null;
                
                const earned = qBadges.filter(t => 
                  userBadges.some(ub => ub.badgeId === t.id && (ub.status === 'Active' || ub.status === 'Approved'))
                ).length;

                return (
                  <div key={type} className={cn(
                    "w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold shadow-sm relative",
                    type === 'Master' ? TIER_COLORS.Master :
                    type === 'Expert' ? TIER_COLORS.Expert :
                    type === 'Skilled' ? TIER_COLORS.Skilled : 
                    TIER_COLORS.Proficient,
                    isLearner && earned === 0 && "grayscale opacity-40 bg-slate-200 text-slate-500"
                  )}>
                    {isLearner ? (earned > 0 ? <CheckCircle2 className="h-3 w-3" /> : qBadges.length) : qBadges.length}
                  </div>
                );
              })}
            </div>
          </div>
          <div className={cn(
            "p-2 rounded-full transition-colors",
            isExpanded ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-400"
          )}>
            {isExpanded ? <ChevronDown className="h-5 w-5 font-bold" /> : <ChevronRight className="h-5 w-5 font-bold" />}
          </div>
        </div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-slate-100 bg-[#f8fafc]/50 p-6 lg:p-12"
          >
            <div className="flex flex-col lg:flex-row gap-12">
              {/* Left Info Column */}
              <div className="lg:w-1/4 space-y-6">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  <h4 className="text-sm font-bold text-slate-900 border-b pb-3">Qualification Overview</h4>
                  <div className="space-y-4 text-xs font-medium text-slate-500">
                    <div className="space-y-1">
                      <p className="uppercase text-[9px] tracking-widest text-slate-400">Program</p>
                      <p className="text-slate-900">{qual}</p>
                    </div>
                    <div className="space-y-2">
                      <p className="uppercase text-[9px] tracking-widest text-slate-400">Progression Map</p>
                      <p className="leading-relaxed">
                        {isLearner 
                          ? "Track your journey from unit mastery to full national certification for this qualification."
                          : "This hierarchy defines the competency progression from unit mastery to full national certification."}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 bg-white rounded-xl border border-slate-100 shadow-sm text-center">
                    <p className="text-[9px] uppercase tracking-tighter text-slate-400 font-bold mb-1">Earned</p>
                    <p className="text-lg font-bold text-slate-900">{stats.earned}</p>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-slate-100 shadow-sm text-center">
                    <p className="text-[9px] uppercase tracking-tighter text-slate-400 font-bold mb-1">Locked</p>
                    <p className="text-lg font-bold text-slate-900">{stats.locked}</p>
                  </div>
                </div>
              </div>

              {/* Visual Hierarchy Diagram */}
              <div className="lg:w-3/4 bg-white rounded-3xl border border-slate-200 p-8 pt-12 shadow-inner relative overflow-hidden">
                {/* Background Grid Accent */}
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
                
                <div className="relative z-10 flex flex-col items-center gap-16">
                  {/* TOP LEVEL: Master & Expert */}
                  <div className="flex flex-wrap justify-center gap-8 min-h-[100px] w-full">
                    <HierarchyGroup 
                      title="Master Badge" 
                      level="Official NC Level" 
                      items={masterBadges} 
                      colorClass={TIER_COLORS.Master} 
                      maxSlots={1} 
                      userBadges={userBadges}
                      isLearner={isLearner}
                      learnerQualification={learnerQualification}
                    />
                    <div className="w-1" /> {/* Spacer */}
                    <HierarchyGroup 
                      title="Expert Badge" 
                      level="Training Complete" 
                      items={expertBadges} 
                      colorClass={TIER_COLORS.Expert} 
                      maxSlots={1} 
                      userBadges={userBadges}
                      isLearner={isLearner}
                      learnerQualification={learnerQualification}
                    />
                  </div>

                  {/* Vertical Connectors 1 */}
                  <div className="absolute top-[160px] left-1/2 -translate-x-1/2 w-[60%] h-[40px] flex justify-between pointer-events-none">
                    <div className="w-[1px] bg-slate-200 h-full mx-auto" />
                  </div>

                  {/* MIDDLE LEVEL: Skilled */}
                  <div className="w-full">
                    <HierarchyGroup 
                      title="Skilled Badges" 
                      level="Certificate of Competency (COC)" 
                      items={skilledBadges} 
                      colorClass={TIER_COLORS.Skilled} 
                      maxSlots={4}
                      compact
                      userBadges={userBadges}
                      isLearner={isLearner}
                      learnerQualification={learnerQualification}
                    />
                  </div>

                  {/* Vertical Connectors 2 */}
                  <div className="absolute bottom-[200px] left-1/2 -translate-x-1/2 w-[80%] h-[40px] flex justify-between pointer-events-none">
                    <div className="w-[1px] bg-slate-200 h-full mx-auto" />
                  </div>

                  {/* BOTTOM LEVEL: Proficient */}
                  <div className="w-full">
                    <HierarchyGroup 
                      title="Proficient Badges" 
                      level="Unit of Competency Mastery" 
                      items={proficientBadges} 
                      colorClass={TIER_COLORS.Proficient} 
                      maxSlots={6}
                      compact
                      userBadges={userBadges}
                      isLearner={isLearner}
                      learnerQualification={learnerQualification}
                    />
                  </div>
                </div>

                {/* Vertical Main Connection Line (Decorative behind) */}
                <div className="absolute left-1/2 top-12 bottom-12 w-[2px] bg-gradient-to-b from-slate-200 via-slate-100 to-transparent -translate-x-1/2 opacity-50 pointer-events-none" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

interface GroupProps {
  title: string;
  level: string;
  items: BadgeTemplate[];
  colorClass: string;
  maxSlots: number;
  compact?: boolean;
  userBadges: any[];
  isLearner: boolean;
  learnerQualification?: string;
}

function HierarchyGroup({ title, level, items, colorClass, maxSlots, compact, userBadges, isLearner, learnerQualification }: GroupProps) {
  const navigate = useNavigate();
  const [selectedBadge, setSelectedBadge] = useState<{
    template: BadgeTemplate;
    record?: BadgeIssuanceRequest;
    status: 'Locked' | 'Pending' | 'Rejected' | 'Earned' | 'Eligible';
  } | null>(null);

  // Create fixed slots to show the structure even if empty
  const slots = Array.from({ length: maxSlots });

  return (
    <div className="flex flex-col items-center gap-6 w-full">
      <div className="text-center">
        <h5 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-1">{title}</h5>
        <div className="h-0.5 w-8 bg-slate-100 mx-auto rounded-full" />
      </div>
      
      <div className={cn(
        "flex flex-wrap justify-center gap-4 w-full",
        compact ? "max-w-4xl" : ""
      )}>
        {slots.map((_, idx) => {
          const badge = items[idx];
          if (!badge) {
            return (
              <div key={idx} className={cn(
                "relative",
                compact ? "w-[12%] min-w-[140px]" : "w-[40%] min-w-[200px]"
              )}>
                <div className="p-4 rounded-2xl border-2 border-dashed border-slate-100 bg-slate-50/30 flex items-center justify-center h-full min-h-[90px]">
                   <div className="text-center opacity-20">
                     <Award className="h-5 w-5 mx-auto mb-1 text-slate-300" />
                     <p className="text-[8px] font-bold uppercase">Reserved</p>
                   </div>
                </div>
              </div>
            );
          }

          // Determine status for learner
          let status: 'Locked' | 'Pending' | 'Rejected' | 'Earned' | 'Eligible' = 'Locked';
          const record = userBadges.find(ub => ub.badgeId === badge.id);
          
          if (isLearner) {
            const earnedStatuses = ['Active', 'Approved', 'Published to Learner Wallet', 'Approved for Publication'];
            const pendingStatuses = [
              'Pending', 'Pending Approval', 'Submitted to CO', 'Under CO Review', 
              'Badge ID Generated', 'Forwarded to District Office', 
              'Pending District Office Approval', 'Approved for Badge ID Generation'
            ];
            const rejectedStatuses = ['Rejected', 'Returned by CO', 'Returned by District Office'];

            if (record) {
              if (earnedStatuses.includes(record.status)) status = 'Earned';
              else if (pendingStatuses.includes(record.status)) status = 'Pending';
              else if (rejectedStatuses.includes(record.status)) status = 'Rejected';
            } else if (badge.qualificationName === learnerQualification || userBadges.some(ub => ub.qualificationName === badge.qualificationName)) {
              status = 'Eligible';
            }
          } else {
            status = 'Earned'; // Default view for admin/qso
          }

          return (
            <div key={badge.id} className={cn(
              "relative",
              compact ? "w-[12%] min-w-[140px]" : "w-[40%] min-w-[200px]"
            )}>
              <motion.div 
                whileHover={{ scale: 1.02, translateY: -2 }}
                onClick={() => setSelectedBadge({ template: badge, record, status })}
                className={cn(
                  "p-4 rounded-2xl border-2 shadow-sm transition-all h-full flex flex-col justify-between group cursor-pointer",
                  PROGRESS_COLORS[status]
                )}
              >
                <div className="space-y-1">
                  <div className="flex justify-between items-start">
                    <p className="text-[9px] font-bold opacity-70 uppercase truncate mr-2">
                      {status === 'Earned' ? badge.badgeType : status}
                    </p>
                    {status === 'Locked' && <Lock className="h-3 w-3 opacity-60" />}
                    {status === 'Pending' && <Clock className="h-3 w-3" />}
                    {status === 'Rejected' && <XCircle className="h-3 w-3" />}
                    {status === 'Earned' && <CheckCircle2 className="h-3 w-3" />}
                    {status === 'Eligible' && <HelpCircle className="h-3 w-3" />}
                  </div>
                  <h6 className="font-bold text-xs leading-tight line-clamp-2 min-h-[2.5em]">{badge.badgeName}</h6>
                </div>
                <div className="pt-3 mt-3 border-t border-black/5 flex justify-between items-center">
                  <p className="text-[8px] font-bold opacity-60 tracking-wider truncate">{badge.qualificationCode || 'Standard'}</p>
                  {status === 'Eligible' && (
                    <span className="text-[8px] font-bold text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded uppercase">Apply</span>
                  )}
                </div>
              </motion.div>
            </div>
          );
        })}
      </div>
      
      <p className="text-[9px] font-medium text-slate-400">{level}</p>

      {/* Badge Details Dialog */}
      <Dialog open={!!selectedBadge} onOpenChange={(open) => !open && setSelectedBadge(null)}>
        <DialogContent className="sm:max-w-[450px]">
          {selectedBadge && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-4 mb-4">
                  <div className={cn(
                    "w-16 h-16 rounded-2xl flex items-center justify-center shadow-md",
                    selectedBadge.status === 'Earned' ? colorClass : PROGRESS_COLORS[selectedBadge.status]
                  )}>
                    <Award className="h-8 w-8" />
                  </div>
                  <div>
                    <Badge variant="outline" className={cn(
                      "mb-1 px-2 py-0",
                      selectedBadge.status === 'Earned' ? colorClass : PROGRESS_COLORS[selectedBadge.status]
                    )}>
                      {selectedBadge.template.badgeType}
                    </Badge>
                    <DialogTitle className="text-xl font-bold">{selectedBadge.template.badgeName}</DialogTitle>
                  </div>
                </div>
                <DialogDescription className="text-slate-600 text-sm leading-relaxed">
                  {selectedBadge.template.description}
                </DialogDescription>
              </DialogHeader>

              <div className="mt-4 space-y-6">
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <ShieldCheck className="h-3.5 w-3.5 text-blue-500" />
                    Issuance Criteria
                  </h4>
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-600 leading-relaxed italic">
                    {selectedBadge.template.criteria}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Status</p>
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "w-2 h-2 rounded-full",
                        selectedBadge.status === 'Earned' ? "bg-emerald-500" :
                        selectedBadge.status === 'Pending' ? "bg-amber-500" :
                        selectedBadge.status === 'Rejected' ? "bg-rose-500" : "bg-slate-300"
                      )} />
                      <span className="text-sm font-bold text-slate-700">{selectedBadge.status}</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Qualification</p>
                    <p className="text-sm font-medium text-slate-700 truncate">{selectedBadge.template.qualificationCode}</p>
                  </div>
                </div>

                {selectedBadge.record && (
                  <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-100 space-y-3">
                    <h5 className="text-[10px] font-bold text-blue-600 uppercase tracking-widest flex items-center gap-2">
                      <Info className="h-3 w-3" />
                      Issuance Details
                    </h5>
                    <div className="grid grid-cols-2 gap-y-2 text-[11px]">
                      <span className="text-slate-500">Issuer:</span>
                      <span className="text-slate-700 font-bold text-right truncate">{selectedBadge.record.issuerName}</span>
                      <span className="text-slate-500">Date:</span>
                      <span className="text-slate-700 font-bold text-right">
                        {selectedBadge.record.submittedAt ? format(selectedBadge.record.submittedAt.toDate(), 'PPP') : 'N/A'}
                      </span>
                      {selectedBadge.record.status === 'Rejected' && (
                        <>
                          <span className="text-rose-500">Reason:</span>
                          <span className="text-rose-700 font-bold text-right italic">{selectedBadge.record.rejectionComment || 'Not specified'}</span>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter className="mt-8">
                <Button variant="outline" onClick={() => setSelectedBadge(null)} className="flex-1">
                  Close
                </Button>
                {selectedBadge.status === 'Eligible' && (
                  <Button 
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                    onClick={() => navigate('/learner/programs')}
                  >
                    Apply for Badge
                  </Button>
                )}
                {selectedBadge.status === 'Earned' && (
                  <Button 
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => navigate('/learner/wallet')}
                  >
                    View in Wallet
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

