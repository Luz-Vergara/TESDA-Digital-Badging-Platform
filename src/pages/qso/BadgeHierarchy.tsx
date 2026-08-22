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
import { BadgeDesign, BadgeTemplate, BadgeIssuanceRequest } from '@/src/types';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { getBadgeColor, getStatusColor } from '@/src/lib/badge-utils';
import { BadgeRenderer } from '@/src/components/badges/BadgeRenderer';
import { demoStandards, getDemoStandardBadgeConfiguration, type DemoStandard } from '@/src/data/demoStandards';
import { DEFAULT_BADGE_DESIGNS, resolveBadgeDesign } from '@/src/lib/badge-designs';

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

const matchBadgeWithTemplate = (item: any, template: BadgeTemplate, offerings: any[] = []) => {
  // 1. Template ID connection
  if (item.badgeTemplateId === template.id || item.badgeId === template.id) return true;
  
  // 2. Program Offering connection
  if (item.programOfferingId) {
    const off = offerings.find(o => o.id === item.programOfferingId);
    if (off && off.badgeTemplateId === template.id) return true;
  }

  // 3. Strict qualificationCode check: if both have codes, and they don't match, they CANNOT match
  const itemCode = (item.qualificationCode || item.programCode || (item as any).qualificationCode || '').toString().trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  const templateCode = (template.qualificationCode || '').toString().trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  
  if (itemCode && templateCode && itemCode !== templateCode) {
    return false; // Explicit code mismatch!
  }
  
  // 4. Fallback Title & Type match with aggressive normalization
  const normalize = (s: string) => {
    return s.toLowerCase()
      .replace(/[^a-z0-9]/g, ' ')
      .replace(/\(proficient\)|\(skilled\)/g, '')
      .replace(/level|animation|competency/g, '') // Remove very common words that might be missing
      .replace(/\s+/g, ' ')
      .trim();
  };

  const itemTitleNorm = normalize(item.programTitle || item.badgeName || item.badgeTemplateName || '');
  const templateTitleNorm = normalize(template.badgeName || '');
  
  if (!itemTitleNorm || !templateTitleNorm) return false;

  // Skilled records require a direct type match.
  let typeMatch = !item.badgeType || !template.badgeType || 
                   item.badgeType.toLowerCase().includes(template.badgeType.toLowerCase()) ||
                   template.badgeType.toLowerCase().includes(item.badgeType.toLowerCase()) ||
                   (item.badgeType === 'Individual' && template.badgeType === 'Proficient');

  // Skilled records must match Skilled specifically.
  if (template.badgeType === 'Skilled') {
    typeMatch = item.badgeType === template.badgeType;
  }

  if (typeMatch) {
    if (itemTitleNorm === templateTitleNorm) return true;
    if (itemTitleNorm.includes(templateTitleNorm) || templateTitleNorm.includes(itemTitleNorm)) return true;
    
    // Fuzzy match fallback
    const wordsA = itemTitleNorm.split(' ').filter(w => w.length >= 2);
    const wordsB = templateTitleNorm.split(' ').filter(w => w.length >= 2);
    const intersection = wordsA.filter(w => wordsB.includes(w));
    if (intersection.length >= 2) return true;
  }
  
  return false;
};

const TIER_COLORS = {
  Proficient: 'bg-[#f0fdf4] text-green-700 border-green-200', // Light Green
  Skilled: 'bg-[#eff6ff] text-blue-700 border-blue-200',    // Blue
};

const PROGRESS_COLORS = {
  Locked: 'bg-slate-50 text-slate-400 border-slate-200 grayscale opacity-40',
  Pending: 'bg-orange-50 text-orange-600 border-orange-200',
  Rejected: 'bg-rose-50 text-rose-600 border-rose-200',
  Active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Eligible: 'bg-blue-50 text-blue-600 border-blue-300',
};

const ACTIVE_STATUSES = ['Active', 'Approved', 'Published to Learner Wallet', 'Approved for Publication', 'Published', 'Earned', 'Badge ID Generated'];
const PENDING_STATUSES = [
  'Pending Review', 'Pending Approval', 'Approved for Badge ID Generation', 
  'Badge ID Generated', 'Forwarded to District Office', 'Submitted to CO', 'Under CO Review', 'Verified by AC', 'Assessment Result Uploaded', 'Submitted'
];
const REJECTED_STATUSES = ['Rejected', 'Returned by CO', 'Returned by District Office'];

export default function BadgeHierarchy() {
  const { user, userProfile, isAuthReady } = useFirebase();
  const [templates, setTemplates] = useState<BadgeTemplate[]>([]);
  const [badgeDesigns, setBadgeDesigns] = useState<BadgeDesign[]>(DEFAULT_BADGE_DESIGNS);
  const [issuedBadges, setIssuedBadges] = useState<any[]>([]);
  const [listRequests, setListRequests] = useState<any[]>([]);
  const [completions, setCompletions] = useState<any[]>([]);
  const [offerings, setOfferings] = useState<any[]>([]);
  const [enrollments, setEnrollments] = useState<any[]>([]);
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
    const unsubDesigns = onSnapshot(collection(db, 'badgeDesigns'), (snapshot) => {
      const remote = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as BadgeDesign);
      setBadgeDesigns([...DEFAULT_BADGE_DESIGNS, ...remote.filter((item) => !DEFAULT_BADGE_DESIGNS.some((base) => base.id === item.id))]);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'badgeDesigns'));

    let unsubIssued: () => void = () => {};
    let unsubRequests: () => void = () => {};
    let unsubCompletions: () => void = () => {};
    let unsubEnrollments: () => void = () => {};

    if (isLearner && user) {
      // Fetch by email (old records) and UID (new records)
      const qIssuedEmail = query(
        collection(db, 'issuedBadges'),
        where('learnerEmail', '==', user.email)
      );
      const qIssuedUID = query(
        collection(db, 'issuedBadges'),
        where('learnerId', '==', user.uid)
      );

      const unsubIssuedEmail = onSnapshot(qIssuedEmail, (snapshot) => {
        setIssuedBadges(prev => {
          const newData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          // Merge and avoid duplicates
          const combined = [...prev];
          newData.forEach(item => {
            if (!combined.find(c => c.id === item.id)) combined.push(item);
          });
          return combined;
        });
      }, (error) => {
        console.error("Issued Badges Email Error:", error);
        handleFirestoreError(error, OperationType.GET, 'issuedBadges');
      });

      const unsubIssuedUID = onSnapshot(qIssuedUID, (snapshot) => {
        setIssuedBadges(prev => {
          const newData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          const combined = [...prev];
          newData.forEach(item => {
            if (!combined.find(c => c.id === item.id)) combined.push(item);
          });
          return combined;
        });
      }, (error) => {
        console.error("Issued Badges UID Error:", error);
        handleFirestoreError(error, OperationType.GET, 'issuedBadges');
      });

      const qRequests = query(
        collection(db, 'badgeRequests'),
        where('learnerIds', 'array-contains', user.uid)
      );
      
      unsubRequests = onSnapshot(qRequests, (snapshot) => {
        setListRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }, (error) => {
        console.error("Requests Error:", error);
      });

      const qCompletions = query(
        collection(db, 'ucCompletions'),
        where('learnerId', '==', user.uid)
      );
      unsubCompletions = onSnapshot(qCompletions, (snapshot) => {
        setCompletions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }, (error) => {
        console.error("Completions Error:", error);
      });

      const qEnrollments = query(
        collection(db, 'enrollments'),
        where('learnerId', '==', user.uid)
      );
      unsubEnrollments = onSnapshot(qEnrollments, async (snapshot) => {
        let data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        if (data.length === 0 && user.email) {
          try {
            const q2 = query(
              collection(db, 'enrollments'),
              where('learnerEmail', '==', user.email)
            );
            const emailSnap = await getDocs(q2);
            data = emailSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          } catch (err) {
            console.error("Error fetching enrollments by email:", err);
          }
        }
        setEnrollments(data);
      }, (error) => {
        console.error("Enrollments Error:", error);
      });

      const qOfferings = query(collection(db, 'programOfferings'));
      const unsubOfferings = onSnapshot(qOfferings, (snapshot) => {
        setOfferings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setLoading(false);
      }, (error) => {
        console.error("Offerings Error:", error);
        setLoading(false);
      });

      unsubIssued = () => {
        unsubIssuedEmail();
        unsubIssuedUID();
        unsubOfferings();
      };
    } else if (isLearner && !user) {
      setLoading(false);
    }

    return () => {
      unsubTemplates();
      unsubDesigns();
      unsubIssued();
      unsubRequests();
      unsubCompletions();
      unsubEnrollments();
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

  if (!isLearner) {
    return <QSOStandardsHierarchy templates={templates} />;
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
                Active
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
                <SelectItem value="Skilled">Skilled</SelectItem>
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
              badgeDesigns={badgeDesigns}
              isExpanded={expandedQualifications.includes(qual)}
              onToggle={() => toggleQualification(qual)}
              issuedBadges={issuedBadges}
              listRequests={listRequests}
              completions={completions}
              offerings={offerings}
              enrollments={enrollments}
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

const templateMatchesStandard = (template: BadgeTemplate, standard: DemoStandard) =>
  template.standardId === standard.id ||
  (Boolean(standard.code) && template.qualificationCode === standard.code) ||
  template.qualificationName === standard.title;

function QSOStandardsHierarchy({ templates }: { templates: BadgeTemplate[] }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLevel, setFilterLevel] = useState<'All' | 'Proficient' | 'Skilled'>('All');
  const [expandedStandards, setExpandedStandards] = useState<string[]>(demoStandards.map((standard) => standard.id));

  const standards = demoStandards.filter((standard) => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const matchesSearch = !normalizedSearch ||
      standard.title.toLowerCase().includes(normalizedSearch) ||
      standard.code?.toLowerCase().includes(normalizedSearch) ||
      standard.competencies.some((competency) =>
        competency.title.toLowerCase().includes(normalizedSearch) ||
        competency.code?.toLowerCase().includes(normalizedSearch),
      );
    const matchesType = filterLevel === 'All' ||
      standard.completionBadgeType === filterLevel ||
      standard.competencies.some((competency) => competency.badgeType === filterLevel);
    return matchesSearch && matchesType;
  });

  const toggleStandard = (standardId: string) => {
    setExpandedStandards((current) =>
      current.includes(standardId)
        ? current.filter((id) => id !== standardId)
        : [...current, standardId],
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Badge Hierarchy</h1>
          <p className="font-medium text-slate-500">Competency and complete-standard badge pathways for the QSO demo standards.</p>
        </div>
        <Badge variant="outline" className="w-fit gap-1.5 border-indigo-200 bg-indigo-50 px-3 py-1 text-indigo-700">
          <ShieldCheck className="h-3.5 w-3.5" />
          Demo standards
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-slate-200 shadow-sm md:col-span-3">
          <CardContent className="p-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search standards or competencies..."
                className="border-none bg-transparent pl-10 shadow-none focus-visible:ring-0"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-1.5">
            <Select value={filterLevel} onValueChange={(value: 'All' | 'Proficient' | 'Skilled') => setFilterLevel(value)}>
              <SelectTrigger className="h-10 border-none shadow-none focus:ring-0">
                <Filter className="mr-2 h-4 w-4 text-slate-400" />
                <SelectValue placeholder="All badge types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All badge types</SelectItem>
                <SelectItem value="Proficient">Proficient</SelectItem>
                <SelectItem value="Skilled">Skilled</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        {standards.map((standard) => {
          const mappedTemplates = templates.filter((template) => templateMatchesStandard(template, standard));
          const proficientCompetencies = standard.competencies.filter((competency) => competency.badgeType === 'Proficient');
          const isExpanded = expandedStandards.includes(standard.id);

          return (
            <Card key={standard.id} className="overflow-hidden border-slate-200 shadow-sm">
              <button
                className="flex w-full items-center justify-between gap-4 p-5 text-left transition-colors hover:bg-slate-50"
                onClick={() => toggleStandard(standard.id)}
              >
                <div className="flex min-w-0 items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-100">
                    <BookOpen className="h-6 w-6" />
                  </div>
                  <div className="min-w-0">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="border-indigo-200 bg-indigo-50 text-indigo-700">{standard.type}</Badge>
                      {standard.code && <span className="text-xs font-semibold text-slate-500">{standard.code}</span>}
                    </div>
                    <h2 className="text-lg font-bold text-slate-900">{standard.title}</h2>
                    <p className="mt-1 text-xs text-slate-500">{getDemoStandardBadgeConfiguration(standard)}</p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <Badge className={mappedTemplates.length > 0 ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' : 'bg-slate-100 text-slate-600 hover:bg-slate-100'}>
                    {mappedTemplates.length} mapped
                  </Badge>
                  {isExpanded ? <ChevronDown className="h-5 w-5 text-slate-500" /> : <ChevronRight className="h-5 w-5 text-slate-500" />}
                </div>
              </button>

              <AnimatePresence initial={false}>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-slate-100 bg-slate-50/60 p-5 sm:p-8"
                  >
                    <div className="grid gap-6 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {proficientCompetencies.map((competency) => (
                          <div key={competency.code || competency.title} className="rounded-2xl border border-green-200 bg-green-50 p-4">
                            <Badge className="mb-3 bg-green-100 text-green-700 hover:bg-green-100">Proficient</Badge>
                            {competency.code && <p className="mb-1 text-[10px] font-bold tracking-wide text-green-700">{competency.code}</p>}
                            <p className="text-sm font-semibold leading-snug text-slate-800">{competency.title}</p>
                          </div>
                        ))}
                        {standard.competencies.filter((competency) => !competency.badgeType).map((competency) => (
                          <div key={competency.code || competency.title} className="rounded-2xl border border-slate-200 bg-white p-4 sm:col-span-2 xl:col-span-3">
                            <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">Known competency</p>
                            <p className="text-sm font-semibold leading-snug text-slate-800">{competency.title}</p>
                          </div>
                        ))}
                        {standard.competencies.length === 0 && (
                          <div className="rounded-2xl border border-green-200 bg-green-50 p-4 sm:col-span-2 xl:col-span-3">
                            <Badge className="mb-3 bg-green-100 text-green-700 hover:bg-green-100">Proficient</Badge>
                            <p className="text-sm font-semibold text-slate-800">Complete MCC achievement</p>
                          </div>
                        )}
                      </div>

                      {standard.completionBadgeType === 'Skilled' && (
                        <div className="flex flex-col items-center gap-1 text-center text-blue-600">
                          <ArrowUpRight className="h-7 w-7 rotate-45" />
                          <span className="text-[10px] font-bold uppercase tracking-wide">Complete standard</span>
                        </div>
                      )}

                      <div className={cn(
                        'rounded-3xl border-2 p-5 shadow-sm',
                        standard.completionBadgeType === 'Skilled'
                          ? TIER_COLORS.Skilled
                          : TIER_COLORS.Proficient,
                      )}>
                        <Badge className={cn(
                          'mb-3',
                          standard.completionBadgeType === 'Skilled'
                            ? 'bg-blue-100 text-blue-700 hover:bg-blue-100'
                            : 'bg-green-100 text-green-700 hover:bg-green-100',
                        )}>
                          {standard.completionBadgeType}
                        </Badge>
                        <p className="text-base font-bold text-slate-900">Complete {standard.type} standard</p>
                        <p className="mt-2 text-sm leading-relaxed text-slate-600">
                          {standard.completionBadgeType === 'Skilled'
                            ? 'Awarded after the standard’s required completion is demonstrated.'
                            : 'This complete MCC achievement is represented by one Proficient badge.'}
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 border-t border-slate-200 pt-4">
                      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Mapped badge templates</p>
                      {mappedTemplates.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {mappedTemplates.map((template) => (
                            <Badge key={template.id} variant="outline" className={getBadgeColor(template.badgeType)}>
                              {template.badgeType} · {template.badgeName}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-500">No badge templates are mapped to this demo standard yet.</p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

interface RowProps {
  key?: string;
  qual: string;
  badges: BadgeTemplate[];
  badgeDesigns: BadgeDesign[];
  isExpanded: boolean;
  onToggle: () => void;
  issuedBadges: any[];
  listRequests: any[];
  completions: any[];
  offerings: any[];
  enrollments: any[];
  isLearner: boolean;
  learnerQualification?: string;
}

function QualificationHierarchyRow({ qual, badges, badgeDesigns, isExpanded, onToggle, issuedBadges, listRequests, completions, offerings, enrollments, isLearner, learnerQualification }: RowProps) {
  const skilledBadges = badges.filter(b => b.badgeType === 'Skilled').sort((a, b) => a.displayOrder - b.displayOrder);
  const proficientBadges = badges.filter(b => b.badgeType === 'Proficient').sort((a, b) => a.displayOrder - b.displayOrder);

  const totalBadges = badges.length;
  
  // Detailed status counts for learner
  const isRPLCandidate = issuedBadges.some(ub => ub.pathway === 'Recognition of Prior Learning (RPL)');

  // Check if learner has ANY active badge or enrollment in this specific qualification
  const hasEngagementInQual = isLearner && (
    badges.some(t => 
      issuedBadges.some(ub => matchBadgeWithTemplate(ub, t, offerings) && ACTIVE_STATUSES.includes(ub.status))
    ) ||
    enrollments.some(enr => {
      const hasStatus = ['Enrolled', 'Completed', 'Applied'].includes(enr.enrollmentStatus);
      if (!hasStatus) return false;
      const off = offerings.find(o => o.id === enr.programOfferingId);
      if (!off) return false;
      const normQual = qual.toLowerCase().trim();
      const offTitle = (off.programTitle || '').toLowerCase();
      const offQual = (off.qualificationCode || '').toLowerCase();
      return (
        offTitle.includes(normQual) || 
        normQual.includes(offTitle) || 
        offQual.includes(normQual) || 
        normQual.includes(offQual) ||
        badges.some(b => 
          (b.qualificationCode && offQual && b.qualificationCode.toLowerCase().trim() === offQual.trim()) ||
          (b.qualificationName && offQual && b.qualificationName.toLowerCase().trim() === offQual.trim())
        )
      );
    })
  );

  const stats = badges.reduce((acc, t) => {
    // 1. Check for Active Issued Badge (Green)
    const issued = issuedBadges.find(ub => matchBadgeWithTemplate(ub, t, offerings) && ACTIVE_STATUSES.includes(ub.status));

    // 2. Check for Pending Request (Amber)
    const request = listRequests.find(r => matchBadgeWithTemplate(r, t, offerings));

    // 3. Check for Completion (Available - Blue)
    const completion = completions.find(c => 
      matchBadgeWithTemplate(c, t, offerings) && (c.completionStatus === 'Completed' || c.completionStatus === 'For Badge Request')
    );
    
    if (issued || (request && ACTIVE_STATUSES.includes(request.status))) {
      acc.active++;
    } else if (request && PENDING_STATUSES.includes(request.status)) {
      acc.pending++;
    } else if (request && REJECTED_STATUSES.includes(request.status)) {
      acc.rejected++;
    } else if (completion || (isLearner && (t.qualificationName === learnerQualification)) || hasEngagementInQual) {
      acc.available++;
    } else {
      acc.locked++;
    }
    return acc;
  }, { active: 0, pending: 0, available: 0, rejected: 0, locked: 0 });

  const progressValue = totalBadges > 0 ? (stats.active / totalBadges) * 100 : 0;
  const isComplete = skilledBadges.length > 0 && proficientBadges.length > 0;

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
            isLearner && stats.active > 0 ? "bg-emerald-600 shadow-emerald-100" : "bg-blue-600 shadow-blue-100"
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
                    Overall Progress: <span className="text-slate-900">{stats.active} of {totalBadges} badges active</span>
                  </div>
                  <div className="text-xs font-bold text-blue-600">
                    {Math.round(progressValue)}%
                  </div>
                </div>
                <Progress value={progressValue} className="h-2 bg-slate-100" />
                
                <div className="flex flex-wrap gap-4 pt-1">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Active: <span className="text-slate-900">{stats.active}</span></span>
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
              {['Skilled', 'Proficient'].map(type => {
                const qBadges = badges.filter(b => b.badgeType === type);
                if (qBadges.length === 0) return null;
                
                const activeCount = qBadges.filter(t => {
                  const issued = issuedBadges.find(ub => matchBadgeWithTemplate(ub, t, offerings) && ACTIVE_STATUSES.includes(ub.status));
                  const request = listRequests.find(r => matchBadgeWithTemplate(r, t, offerings));
                  return issued || (request && ACTIVE_STATUSES.includes(request.status));
                }).length;

                return (
                  <div key={type} className={cn(
                    "w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold shadow-sm relative",
                    type === 'Skilled' ? TIER_COLORS.Skilled : TIER_COLORS.Proficient,
                    isLearner && activeCount === 0 && "grayscale opacity-40 bg-slate-200 text-slate-500"
                  )}>
                    {isLearner ? (activeCount > 0 ? <CheckCircle2 className="h-3 w-3" /> : qBadges.length) : qBadges.length}
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
                          ? "Track your journey from competency mastery to complete-standard achievement."
                          : "This hierarchy defines the progression from competency mastery to complete-standard achievement."}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 bg-white rounded-xl border border-slate-100 shadow-sm text-center">
                    <p className="text-[9px] uppercase tracking-tighter text-slate-400 font-bold mb-1">Active</p>
                    <p className="text-lg font-bold text-slate-900">{stats.active}</p>
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
                  {/* Top level: Skilled */}
                  <div className="w-full">
                    <HierarchyGroup 
                      title="Skilled Badges" 
                      level="Complete-standard achievement"
                      items={skilledBadges} 
                      allBadges={badges}
                      badgeDesigns={badgeDesigns}
                      colorClass={TIER_COLORS.Skilled} 
                      compact
                      issuedBadges={issuedBadges}
                      listRequests={listRequests}
                      completions={completions}
                      offerings={offerings}
                      isLearner={isLearner}
                      learnerQualification={learnerQualification}
                      enrollments={enrollments}
                      qual={qual}
                    />
                  </div>

                  {/* Foundation level: Proficient */}
                  <div className="w-full">
                    <HierarchyGroup 
                      title="Proficient Badges" 
                      level="Unit of Competency Mastery" 
                      items={proficientBadges} 
                      allBadges={badges}
                      badgeDesigns={badgeDesigns}
                      colorClass={TIER_COLORS.Proficient} 
                      compact
                      issuedBadges={issuedBadges}
                      listRequests={listRequests}
                      completions={completions}
                      offerings={offerings}
                      isLearner={isLearner}
                      learnerQualification={learnerQualification}
                      enrollments={enrollments}
                      qual={qual}
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
  allBadges: BadgeTemplate[];
  badgeDesigns: BadgeDesign[];
  colorClass: string;
  compact?: boolean;
  issuedBadges: any[];
  listRequests: any[];
  completions: any[];
  offerings: any[];
  isLearner: boolean;
  learnerQualification?: string;
  enrollments: any[];
  qual: string;
}

function HierarchyGroup({ title, level, items, allBadges, badgeDesigns, colorClass, compact, issuedBadges, listRequests, completions, offerings, isLearner, learnerQualification, enrollments, qual }: GroupProps) {
  const navigate = useNavigate();
  const [selectedBadge, setSelectedBadge] = useState<{
    template: BadgeTemplate;
    record?: BadgeIssuanceRequest;
    status: 'Locked' | 'Pending' | 'Rejected' | 'Active' | 'Eligible';
  } | null>(null);

  return (
    <div className="flex flex-col items-center gap-6 w-full">
      <div className="text-center">
        <h5 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-1">{title}</h5>
        <div className="h-0.5 w-8 bg-slate-100 mx-auto rounded-full" />
      </div>
      
      <div className={cn(
        "grid gap-4 w-full",
        compact ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" : "grid-cols-1 justify-items-center"
      )}>
        {items.map((badge) => {
            // Determing status for learner
            let status: 'Locked' | 'Pending' | 'Rejected' | 'Active' | 'Eligible' = 'Locked';
            let activeRecord: any = null;
            
            if (isLearner) {
              // Priority 1: Issued Badge (Earned)
              const issued = issuedBadges.find(ub => matchBadgeWithTemplate(ub, badge, offerings) && ACTIVE_STATUSES.includes(ub.status));
  
              // Priority 2: Request from badgeRequests collection
              const request = listRequests.find(r => matchBadgeWithTemplate(r, badge, offerings));
  
              // Priority 3: Completion or Eligibility
              const completion = completions.find(c => 
                matchBadgeWithTemplate(c, badge, offerings) && 
                (c.completionStatus === 'Completed' || c.completionStatus === 'Badge Requested' || c.completionStatus === 'For Badge Request')
              );
  
              // Check if learner has ANY active badge or enrollment/taken program in this specific qualification
              const hasEngagementInQual = allBadges.some(t => 
                issuedBadges.some(ub => matchBadgeWithTemplate(ub, t, offerings) && ACTIVE_STATUSES.includes(ub.status))
              ) || enrollments.some(enr => {
                const hasStatus = ['Enrolled', 'Completed', 'Applied'].includes(enr.enrollmentStatus);
                if (!hasStatus) return false;
                const off = offerings.find(o => o.id === enr.programOfferingId);
                if (!off) return false;
                const normQual = qual.toLowerCase().trim();
                const offTitle = (off.programTitle || '').toLowerCase();
                const offQual = (off.qualificationCode || '').toLowerCase();
                return (
                  offTitle.includes(normQual) || 
                  normQual.includes(offTitle) || 
                  offQual.includes(normQual) || 
                  normQual.includes(offQual) ||
                  allBadges.some(b => 
                    (b.qualificationCode && offQual && b.qualificationCode.toLowerCase().trim() === offQual.trim()) ||
                    (b.qualificationName && offQual && b.qualificationName.toLowerCase().trim() === offQual.trim())
                  )
                );
              });
  
              if (issued || (request && ACTIVE_STATUSES.includes(request.status))) {
                status = 'Active';
                activeRecord = issued || request;
              } else if (request && REJECTED_STATUSES.includes(request.status)) {
                status = 'Rejected';
                activeRecord = request;
              } else if (request && PENDING_STATUSES.includes(request.status)) {
                status = 'Pending';
                activeRecord = request;
              } else if (completion || badge.qualificationName === learnerQualification || hasEngagementInQual) {
                status = 'Eligible';
                activeRecord = completion;
              }
            } else {
            status = 'Active'; // Default view for admin/qso
          }

          return (
            <div key={badge.id} className="relative">
              <motion.div 
                whileHover={{ scale: 1.02, translateY: -2 }}
                onClick={() => setSelectedBadge({ 
                  template: badge, 
                  record: activeRecord, 
                  status 
                })}
                className={cn(
                  "p-4 rounded-2xl border-2 shadow-sm transition-all h-full flex flex-col justify-between group cursor-pointer",
                  PROGRESS_COLORS[status]
                )}
              >
                <div className="space-y-1">
                  <div className="flex justify-between items-start">
                    <p className="text-[9px] font-bold opacity-70 uppercase truncate mr-2">
                      {status === 'Active' ? badge.badgeType : status}
                    </p>
                    {status === 'Locked' && <Lock className="h-3 w-3 opacity-60" />}
                    {status === 'Pending' && <Clock className="h-3 w-3" />}
                    {status === 'Rejected' && <XCircle className="h-3 w-3" />}
                    {status === 'Active' && <CheckCircle2 className="h-3 w-3" />}
                    {status === 'Eligible' && <HelpCircle className="h-3 w-3" />}
                  </div>

                  {/* Aesthetic Badge Overlay inside Node */}
                  <div className="my-2.5 flex justify-center relative w-full">
                    <div className={cn("w-full flex justify-center items-center", status === 'Active' ? "" : "opacity-40 grayscale")}>
                      <BadgeRenderer
                        scale={0.34}
                        allowEnlarge={false}
                        data={{
                          id: badge.id,
                          name: badge.badgeName,
                          learnerName: activeRecord?.learnerName || "Learner Name",
                          trainingProvider: activeRecord?.trainingCenterName || 'Training Center',
                          issueDate: activeRecord ? formatDate(activeRecord.issueDate) : "Not yet issued",
                          validUntil: activeRecord ? formatDate(activeRecord.validUntil) : "",
                          verificationId: activeRecord?.verificationId || "LOCKED",
                          badgeId: activeRecord?.badgeId || badge.id,
                          imageUrl: resolveBadgeDesign(badge, badgeDesigns).artworkUrl,
                          level: badge.badgeType,
                          qualificationTitle:
                            activeRecord?.programName ||
                            activeRecord?.programTitle ||
                            badge.badgeName ||
                            badge.qualificationName,
                          qualificationCode: badge.qualificationCode,
                          competencyTitle: activeRecord?.competencyTitle || badge.competencyTitle || badge.relatedCompetency || '',
                          competencyCode: activeRecord?.competencyCode || badge.competencyCode || '',
                          templateConfig: badge.templateConfig
                        }}
                      />
                      {!resolveBadgeDesign(badge, badgeDesigns).isConfigured && <p className="mt-1 text-center text-[8px] font-medium text-slate-500">Badge artwork not configured</p>}
                    </div>
                    {status !== 'Active' && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="bg-slate-900/85 text-white rounded-full p-2.5 shadow-lg backdrop-blur-[2px] flex items-center gap-1">
                          <Lock className="h-3.5 w-3.5 text-amber-500" />
                          <span className="text-[9px] font-bold uppercase tracking-wider pr-1">Locked</span>
                        </div>
                      </div>
                    )}
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
                    selectedBadge.status === 'Active' ? colorClass : PROGRESS_COLORS[selectedBadge.status]
                  )}>
                    <Award className="h-8 w-8" />
                  </div>
                  <div>
                    <Badge variant="outline" className={cn(
                      "mb-1 px-2 py-0",
                      selectedBadge.status === 'Active' ? colorClass : PROGRESS_COLORS[selectedBadge.status]
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
                        selectedBadge.status === 'Active' ? "bg-emerald-500" :
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
                        {selectedBadge.record.submittedAt ? formatDate(selectedBadge.record.submittedAt.toDate?.() ?? selectedBadge.record.submittedAt) : 'N/A'}
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
                {selectedBadge.status === 'Active' && (
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
