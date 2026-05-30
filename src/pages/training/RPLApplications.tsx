import React, { useEffect, useState, useMemo } from 'react';
import { db } from '@/src/lib/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, getDocs, serverTimestamp, getDoc } from 'firebase/firestore';
import { useFirebase } from '@/src/lib/FirebaseProvider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { 
  Award, ShieldCheck, Search, Eye, Filter, CheckCircle2, Building, 
  ListChecks, Loader2, AlertTriangle, ExternalLink, RefreshCw, FileCheck, ThumbsUp, HelpCircle 
} from 'lucide-react';
import { RPLApplication, RPLEvidence, RPLCompetencyReview, Organization } from '@/src/types';

export default function RPLApplications() {
  const { user, userProfile, isAuthReady } = useFirebase();

  // Data state
  const [applications, setApplications] = useState<RPLApplication[]>([]);
  const [assessmentCenters, setAssessmentCenters] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('All');

  // Search/Filter state
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Application for Details/Action Modal
  const [selectedApp, setSelectedApp] = useState<RPLApplication | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Endorsement sub-state
  const [selectedACId, setSelectedACId] = useState('');
  const [endorsementRemarks, setEndorsementRemarks] = useState('');

  // Interaction checklist progress (15 formal items requested)
  const [checklist, setChecklist] = useState({
    item1_submitted: false,
    item2_linkedToCenter: false,
    item3_standardDefined: false,
    item4_credentialClassified: false,
    item5_portfolioCreated: false,
    item6_unitsLinked: false,
    item7_authenticityChecked: false,
    item8_relevanceChecked: false,
    item9_recentlyAcquired: false,
    item10_evidenceSufficient: false,
    item11_creditedIdentified: false,
    item12_nonCreditedIdentified: false,
    item13_gapChecked: false,
    item14_gapCompleted: false,
    item15_recommendedForAssessment: false,
  });

  // Load resources
  useEffect(() => {
    if (!isAuthReady) return;

    const officeName = userProfile?.office || 'demo-training-center';
    
    // Create query to fetch matching training center RPLs or those with For Assignment status
    const rplCol = collection(db, 'rplApplications');
    const unsubRPL = onSnapshot(rplCol, (snapshot) => {
      const allRPLs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as RPLApplication));
      // Triage filtering
      const filtered = allRPLs.filter(app => {
        const matchesEvaluator = app.trainingCenterId === userProfile?.organizationId || 
                                app.trainingCenterName === officeName ||
                                app.status === 'For Training Center Assignment' ||
                                app.trainingCenterId === 'unassigned';
        return matchesEvaluator;
      });
      setApplications(filtered);
      setLoading(false);
    });

    // Load active ACs for final mapping endorsement
    const loadACs = async () => {
      try {
        const qAC = query(collection(db, 'organizations'), where('type', '==', 'AssessmentCenter'), where('status', '==', 'Active'));
        const snap = await getDocs(qAC);
        setAssessmentCenters(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Organization)));
      } catch (err) {
        console.error("Error loading assessment centers list:", err);
      }
    };
    loadACs();

    return () => unsubRPL();
  }, [isAuthReady, userProfile]);

  // Sync state checklists on opening application evaluator
  const handleOpenEvaluator = (app: RPLApplication) => {
    setSelectedApp(app);
    setIsDetailOpen(true);
    
    // Smart auto-preset for local operational checklist based on application parameters
    const gapDone = app.gapTrainingStatus === 'Completed';
    const endorsed = app.endorsedToAssessmentCenter;
    
    setChecklist({
      item1_submitted: true,
      item2_linkedToCenter: app.trainingCenterId !== 'unassigned',
      item3_standardDefined: !!app.qualificationName,
      item4_credentialClassified: !!app.targetCredential,
      item5_portfolioCreated: app.evidence.length > 0,
      item6_unitsLinked: app.competencyReviews.length > 0,
      item7_authenticityChecked: app.evidence.every(e => e.status === 'Accepted'),
      item8_relevanceChecked: app.evidence.some(e => e.status === 'Accepted'),
      item9_recentlyAcquired: app.yearsExperience > 0,
      item10_evidenceSufficient: app.evidence.length >= 2,
      item11_creditedIdentified: app.competencyReviews.some(c => c.status === 'Credited through RPL'),
      item12_nonCreditedIdentified: app.competencyReviews.some(c => c.status === 'For Gap Training' || c.status === 'For Demonstration'),
      item13_gapChecked: app.gapTrainingRequired,
      item14_gapCompleted: gapDone,
      item15_recommendedForAssessment: endorsed,
    });

    // Reset endorsement selection context
    const initialAC = app.assessmentCenterId || '';
    setSelectedACId(initialAC);
    setEndorsementRemarks('');
  };

  // Quick state helpers
  const filteredApps = useMemo(() => {
    return applications.filter(app => {
      const matchSearch = 
        app.learnerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.qualificationName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.status.toLowerCase().includes(searchQuery.toLowerCase());

      const matchTab = activeTab === 'All' || 
        (activeTab === 'Submitted' && app.status === 'Submitted') ||
        (activeTab === 'For Evidence Review' && app.status === 'For Evidence Review') ||
        (activeTab === 'For Competency Mapping' && app.status === 'For Competency Mapping') ||
        (activeTab === 'For Gap Training' && app.status === 'For Gap Training') ||
        (activeTab === 'Ready for Assessment Endorsement' && app.status === 'Ready for Assessment Endorsement') ||
        (activeTab === 'Endorsed' && app.status === 'Endorsed to Assessment Center');

      return matchSearch && matchTab;
    });
  }, [applications, activeTab, searchQuery]);

  // Update specific evidence status inside evaluating record
  const handleUpdateEvidenceStatus = async (evidenceId: string, itemStatus: 'Accepted' | 'Needs More Evidence' | 'Rejected', remarks: string) => {
    if (!selectedApp) return;

    const updatedEvidences = selectedApp.evidence.map(ev => {
      if (ev.id === evidenceId) {
        return { ...ev, status: itemStatus, remarks };
      }
      return ev;
    });

    // Auto update status to "For Evidence Review" if evaluating
    let newMainStatus = selectedApp.status;
    if (newMainStatus === 'Submitted') {
      newMainStatus = 'For Evidence Review';
    }

    try {
      const appRef = doc(db, 'rplApplications', selectedApp.id);
      await updateDoc(appRef, {
        evidence: updatedEvidences,
        status: newMainStatus,
        updatedAt: serverTimestamp()
      });

      // Maintain modal reactivity
      setSelectedApp(prev => prev ? { ...prev, evidence: updatedEvidences, status: newMainStatus } : null);
    } catch (e) {
      console.error(e);
    }
  };

  // Update competency evaluation check
  const handleUpdateCompetencyStatus = async (
    compId: string, 
    compStatus: 'Credited through RPL' | 'For Gap Training' | 'For Demonstration' | 'Needs Additional Evidence' | 'Not Credited', 
    remarks: string,
    linkedEvIds: string[]
  ) => {
    if (!selectedApp) return;

    const updatedReviews = selectedApp.competencyReviews.map(review => {
      if (review.id === compId) {
        return { 
          ...review, 
          status: compStatus, 
          remarks: remarks || review.remarks, 
          evidenceIds: linkedEvIds 
        };
      }
      return review;
    });

    // Setup potential dynamic statuses
    let hasGap = updatedReviews.some(r => r.status === 'For Gap Training');
    let mainStatus: RPLApplication['status'] = 'For Competency Mapping';

    if (hasGap) {
      mainStatus = 'For Gap Training';
    } else if (updatedReviews.every(r => r.status !== 'Pending')) {
      mainStatus = 'Ready for Assessment Endorsement';
    }

    try {
      const appRef = doc(db, 'rplApplications', selectedApp.id);
      await updateDoc(appRef, {
        competencyReviews: updatedReviews,
        gapTrainingRequired: hasGap,
        gapTrainingStatus: hasGap ? (selectedApp.gapTrainingStatus === 'None' ? 'In Progress' : selectedApp.gapTrainingStatus) : 'None',
        status: mainStatus,
        updatedAt: serverTimestamp()
      });

      // Maintain modal reactivity
      setSelectedApp(prev => prev ? { 
        ...prev, 
        competencyReviews: updatedReviews, 
        gapTrainingRequired: hasGap,
        gapTrainingStatus: hasGap ? (prev.gapTrainingStatus === 'None' ? 'In Progress' : prev.gapTrainingStatus) : 'None',
        status: mainStatus 
      } : null);

      // Refresh checklist status automatically
      setChecklist(prev => ({
        ...prev,
        item11_creditedIdentified: updatedReviews.some(c => c.status === 'Credited through RPL'),
        item12_nonCreditedIdentified: updatedReviews.some(c => c.status === 'For Gap Training' || c.status === 'For Demonstration'),
        item13_gapChecked: hasGap
      }));
    } catch (e) {
      console.error(e);
    }
  };

  // Switch or complete Gap Training Module
  const handleToggleGapTrainingStatus = async (newStatus: 'None' | 'In Progress' | 'Completed') => {
    if (!selectedApp) return;

    let targetMainStatus: RPLApplication['status'] = selectedApp.status;
    if (newStatus === 'Completed') {
      targetMainStatus = 'Ready for Assessment Endorsement';
    } else if (newStatus === 'In Progress') {
      targetMainStatus = 'For Gap Training';
    }

    try {
      const appRef = doc(db, 'rplApplications', selectedApp.id);
      await updateDoc(appRef, {
        gapTrainingStatus: newStatus,
        status: targetMainStatus,
        updatedAt: serverTimestamp()
      });

      setSelectedApp(prev => prev ? {
        ...prev,
        gapTrainingStatus: newStatus,
        status: targetMainStatus
      } : null);

      setChecklist(prev => ({
        ...prev,
        item14_gapCompleted: newStatus === 'Completed'
      }));
    } catch (e) {
      console.error(e);
    }
  };

  // Endorse to selected Assessment Center
  const handleEndorseCandidate = async () => {
    if (!selectedApp || !selectedACId) return;

    const matchedAC = assessmentCenters.find(ac => ac.id === selectedACId);
    if (!matchedAC) return;

    try {
      const appRef = doc(db, 'rplApplications', selectedApp.id);
      await updateDoc(appRef, {
        status: 'Endorsed to Assessment Center',
        assessmentCenterId: selectedACId,
        assessmentCenterName: matchedAC.name,
        endorsedToAssessmentCenter: true,
        endorsedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      setIsDetailOpen(false);
      setSelectedApp(null);
    } catch (err) {
      console.error("Failed to endorse candidate", err);
    }
  };

  // Handle self-claim walk-in triage assignment
  const handleClaimTriage = async (app: RPLApplication) => {
    const institutionId = userProfile?.organizationId || 'demo-training-center';
    const institutionName = userProfile?.office || 'TESDA Training Center - Central Manila';

    try {
      const appRef = doc(db, 'rplApplications', app.id);
      await updateDoc(appRef, {
        trainingCenterId: institutionId,
        trainingCenterName: institutionName,
        status: 'Submitted',
        updatedAt: serverTimestamp()
      });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">
            Registration & Evaluation Hub
          </div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-indigo-600" />
            RPL Quality Assurance Console
          </h1>
          <p className="text-slate-500 text-xs mt-1">
            Analyze, verify, map competencies, and recommend candidates for direct National Competency Assessment.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 bg-indigo-50 border border-indigo-100 p-3 rounded-lg text-xs text-indigo-800">
          <Building className="h-4 w-4 text-indigo-600" />
          <div>
            <span className="font-bold block leading-none mb-0.5">Assigned Institution</span>
            <span className="text-[10px] text-slate-500 select-all font-semibold uppercase">{userProfile?.office || 'TESDA Training Center'}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        {/* Search */}
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by candidate name or qualification standard..."
            className="pl-9 text-xs bg-white border-slate-200"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Tab Buttons bar */}
        <div className="flex items-center gap-1.5 self-start overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {['All', 'Submitted', 'For Evidence Review', 'For Competency Mapping', 'For Gap Training', 'Ready for Assessment Endorsement', 'Endorsed'].map((t) => (
            <Button
              key={t}
              variant={activeTab === t ? 'default' : 'outline'}
              className="text-xs shrink-0 bg-white"
              size="sm"
              onClick={() => setActiveTab(t)}
            >
              {t}
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-slate-50/50 rounded-xl border border-slate-100">
          <Loader2 className="h-8 w-8 text-indigo-600 animate-spin mb-3" />
          <p className="text-xs text-slate-400 font-mono">Synchronizing evaluation queues...</p>
        </div>
      ) : filteredApps.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-200 p-6">
          <AlertTriangle className="h-8 w-8 text-slate-400 mx-auto mb-3" />
          <span className="text-sm font-semibold text-slate-700 block">No RPL application records found</span>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            Applications matching your current filters or walk-in queue appear empty. Check back once a candidate files.
          </p>
        </div>
      ) : (
        /* Applications Table/Grid */
        <div className="grid grid-cols-1 gap-4">
          {filteredApps.map((app) => {
            const hasUnassigned = app.trainingCenterId === 'unassigned';
            return (
              <Card key={app.id} className={`hover:shadow-md transition-shadow border-slate-200 ${hasUnassigned ? 'border-dashed border-blue-300 bg-blue-50/20' : ''}`}>
                <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-slate-800 text-sm leading-none">{app.learnerName}</h3>
                      <Badge className="text-[10px]" variant="outline">{app.targetCredential}</Badge>
                      <Badge className={`text-[10px] ${
                        app.status === 'Endorsed to Assessment Center' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                        app.status === 'Ready for Assessment Endorsement' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' :
                        app.status === 'For Gap Training' ? 'bg-amber-100 text-amber-800 border-amber-200 animate-pulse' :
                        app.status === 'For Competency Mapping' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {app.status}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1 text-xs text-slate-500">
                      <div>
                        <span className="font-mono text-slate-400 font-bold uppercase mr-1 text-[10px]">Standard:</span>
                        <span className="font-medium text-slate-700">[{app.qualificationCode}] {app.qualificationName}</span>
                      </div>
                      <div>
                        <span className="font-mono text-slate-400 font-bold uppercase mr-1 text-[10px]">Exp Level:</span>
                        <span className="font-medium text-slate-700">{app.yearsExperience} Year{app.yearsExperience > 1 ? 's' : ''} Occup. Practice</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-center">
                    {hasUnassigned ? (
                      <Button 
                        size="sm" 
                        className="bg-blue-600 text-white font-semibold flex items-center gap-1 text-xs"
                        onClick={() => handleClaimTriage(app)}
                      >
                        <RefreshCw className="h-3 w-3" />
                        Triage/Claim Evaluation
                      </Button>
                    ) : (
                      <Button 
                        size="sm" 
                        variant="default" 
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center gap-1 text-xs"
                        onClick={() => handleOpenEvaluator(app)}
                      >
                        <Eye className="h-4 w-4" />
                        Audit Portfolio
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Audit Detail Evaluation Dialog */}
      {selectedApp && (
        <Dialog open={isDetailOpen} onOpenChange={() => setIsDetailOpen(false)}>
          <DialogContent className="w-[95vw] sm:max-w-[92vw] lg:max-w-[90vw] max-h-[92vh] overflow-y-auto border-slate-200">
            <DialogHeader className="border-b border-slate-50 pb-4">
              <DialogTitle className="flex items-center gap-2 text-slate-900">
                <ShieldCheck className="h-5.5 w-5.5 text-indigo-600" />
                RPL Technical Compliance Audit
              </DialogTitle>
              <DialogDescription className="text-xs">
                Candidate Profile: <strong className="text-slate-800">{selectedApp.learnerName}</strong> | Targets: <strong className="text-slate-800">{selectedApp.qualificationName}</strong>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Grid Section 1: Candidate Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-mono mb-2">
                    Professional Experience Summary
                  </h4>
                  <div className="space-y-2 text-xs">
                    <p className="text-slate-700 font-medium whitespace-pre-wrap leading-relaxed line-clamp-4">
                      "{selectedApp.workExperienceSummary}"
                    </p>
                    <div className="text-[10px] text-slate-500 font-mono">
                      Declared Occupational Practice: {selectedApp.yearsExperience} Year{selectedApp.yearsExperience > 1 ? 's' : ''}
                    </div>
                  </div>
                </div>

                <div className="border border-slate-100 p-4 rounded-xl bg-white space-y-1">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-mono mb-2">
                    Status Timeline and Actions
                  </h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between items-center bg-slate-50 p-2 rounded">
                      <span className="text-slate-500 font-medium">Evaluation Milestone</span>
                      <Badge className="capitalize text-[10px]" variant="secondary">{selectedApp.status}</Badge>
                    </div>

                    <div className="flex justify-between items-center bg-slate-50 p-2 rounded col-span-2">
                      <span className="text-slate-500 font-medium">Gap Training Indicator</span>
                      <div className="flex items-center gap-2">
                        <Badge className="text-[10px]" variant={selectedApp.gapTrainingRequired ? 'destructive' : 'secondary'}>
                          {selectedApp.gapTrainingRequired ? 'Required' : 'None Identified'}
                        </Badge>
                        {selectedApp.gapTrainingRequired && (
                          <Select 
                            value={selectedApp.gapTrainingStatus} 
                            onValueChange={(val: any) => handleToggleGapTrainingStatus(val)}
                          >
                            <SelectTrigger className="h-6 w-28 text-[9px] bg-white text-slate-800">
                              <SelectValue placeholder="Gap Status" />
                            </SelectTrigger>
                            <SelectContent className="text-[10px]">
                              <SelectItem value="In Progress">In Progress</SelectItem>
                              <SelectItem value="Completed">Completed</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Grid Section 2: Evidences portfolio audits */}
              <div className="border border-slate-100 rounded-xl overflow-hidden shadow-sm">
                <div className="bg-slate-50/50 p-3.5 border-b border-slate-100">
                  <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wide flex items-center gap-1.5 font-mono">
                    <FileCheck className="h-4 w-4 text-emerald-600" />
                    Portfolio Evidence Audit Panel
                  </h3>
                </div>
                <div className="divide-y divide-slate-100 bg-white">
                  {selectedApp.evidence.map((ev) => (
                    <div key={ev.id} className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4 text-xs">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-700">{ev.title}</span>
                          <Badge variant={ev.status === 'Accepted' ? 'emerald' : ev.status === 'Rejected' ? 'destructive' : 'secondary'} className="text-[9px]">
                            {ev.status}
                          </Badge>
                        </div>
                        <p className="text-slate-500 max-w-xl leading-relaxed">{ev.description}</p>
                        <a 
                          href={ev.url} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="text-blue-600 underline font-mono text-[10px] flex items-center gap-1 mt-1 hover:text-indigo-600"
                        >
                          <ExternalLink className="h-3 w-3" />
                          View Portfolio Document Payload ({ev.id})
                        </a>
                        {ev.remarks && (
                          <p className="text-[10px] text-amber-700 bg-amber-50 p-1.5 rounded border border-amber-100 max-w-md">
                            Remarks: {ev.remarks}
                          </p>
                        )}
                      </div>

                      {/* Action trigger selectors */}
                      <div className="flex flex-col gap-1.5 border-l border-slate-100 pl-4">
                        <Label className="text-[9px] font-bold text-slate-500 uppercase font-mono">Document Verdict</Label>
                        <div className="flex items-center gap-1.5">
                          <Button 
                            size="sm" 
                            variant="default" 
                            className="bg-emerald-600 text-white rounded px-2 h-7 font-bold text-[10px]"
                            onClick={() => handleUpdateEvidenceStatus(ev.id, 'Accepted', 'Passed authenticity audit.')}
                          >
                            Accept
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive"
                            className="bg-rose-600 text-white rounded px-2 h-7 font-bold text-[10px]"
                            onClick={() => {
                              const note = prompt("Enter rejection/adjustment reason:") || 'Needs adjustment.';
                              handleUpdateEvidenceStatus(ev.id, 'Needs More Evidence', note);
                            }}
                          >
                            Requires Adjust.
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Grid Section 3: Competencies Mapping list */}
              <div className="border border-slate-100 rounded-xl overflow-hidden shadow-sm">
                <div className="bg-slate-50/50 p-3.5 border-b border-slate-100">
                  <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wide flex items-center gap-1.5 font-mono">
                    <ListChecks className="h-4 w-4 text-indigo-600" />
                    Technical Competency mapping & reviews
                  </h3>
                </div>
                <div className="divide-y divide-slate-100 bg-white">
                  {selectedApp.competencyReviews.map((comp) => (
                    <div key={comp.id} className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                      <div className="md:col-span-2 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-slate-400 font-bold text-[10px]">{comp.competencyCode}</span>
                          <span className="font-bold text-slate-700">{comp.competencyName}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 pt-1.5">
                          <span className="text-[10px] text-slate-400">Linked Evidences:</span>
                          {comp.evidenceIds.length === 0 ? (
                            <span className="text-[9px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">None linked</span>
                          ) : (
                            comp.evidenceIds.map(evId => (
                              <Badge key={evId} variant="outline" className="text-[9px]">{evId}</Badge>
                            ))
                          )}
                        </div>
                        {comp.remarks && (
                          <p className="text-[10px] text-slate-500 italic mt-1 bg-slate-50 p-1.5 rounded">
                            Evaluator Note: {comp.remarks}
                          </p>
                        )}
                      </div>

                      {/* Map evidence triggers */}
                      <div className="flex flex-col gap-2 shrink-0 md:border-l md:border-slate-100 md:pl-4">
                        <div className="space-y-1">
                          <Label className="text-[10px] font-bold text-slate-500 font-mono">Competency Verdict</Label>
                          <Select 
                            value={comp.status} 
                            onValueChange={(val: any) => {
                              const r = prompt("Write dynamic competency evaluator remarks:") || 'Valid credentials.';
                              // Auto link all accepted evidence IDs
                              const linkedEv = selectedApp.evidence.filter(e => e.status === 'Accepted').map(e => e.id);
                              handleUpdateCompetencyStatus(comp.id, val, r, linkedEv);
                            }}
                          >
                            <SelectTrigger className="w-full h-8 text-[10px] bg-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="text-[10px]">
                              <SelectItem value="Pending">Pending Audit</SelectItem>
                              <SelectItem value="Credited through RPL">Credited through RPL</SelectItem>
                              <SelectItem value="For Gap Training">Requires Gap Training</SelectItem>
                              <SelectItem value="For Demonstration">For Practical Demonstration</SelectItem>
                              <SelectItem value="Needs Additional Evidence">Needs Additional Evidence</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Grid Section 4: 15-Item Audit Checklist */}
              <div className="border border-slate-100 rounded-xl overflow-hidden shadow-sm">
                <div className="bg-slate-50/50 p-3.5 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wide flex items-center gap-1.5 font-mono">
                    <ListChecks className="h-4 w-4 text-amber-500" />
                    Evaluator Verification Checklist
                  </h3>
                  <span className="text-[10px] text-slate-400 font-mono">15 Audit Standards</span>
                </div>
                <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3 bg-white text-xs">
                  <div className="flex items-start gap-2">
                    <Checkbox id="chk1" checked={checklist.item1_submitted} onCheckedChange={(val: boolean) => setChecklist(prev => ({ ...prev, item1_submitted: val }))} />
                    <Label htmlFor="chk1" className="text-slate-600 font-medium">1. Candidate filed official RPL application portfolio</Label>
                  </div>
                  <div className="flex items-start gap-2">
                    <Checkbox id="chk2" checked={checklist.item2_linkedToCenter} onCheckedChange={(val: boolean) => setChecklist(prev => ({ ...prev, item2_linkedToCenter: val }))} />
                    <Label htmlFor="chk2" className="text-slate-600 font-medium">2. Candidate dossier successfully mapped to Center Registry</Label>
                  </div>
                  <div className="flex items-start gap-2">
                    <Checkbox id="chk3" checked={checklist.item3_standardDefined} onCheckedChange={(val: boolean) => setChecklist(prev => ({ ...prev, item3_standardDefined: val }))} />
                    <Label htmlFor="chk3" className="text-slate-600 font-medium">3. Alignment standard qualification title identified</Label>
                  </div>
                  <div className="flex items-start gap-2">
                    <Checkbox id="chk4" checked={checklist.item4_credentialClassified} onCheckedChange={(val: boolean) => setChecklist(prev => ({ ...prev, item4_credentialClassified: val }))} />
                    <Label htmlFor="chk4" className="text-slate-600 font-medium">4. Program Target verified: Certificate of Competency or NC</Label>
                  </div>
                  <div className="flex items-start gap-2">
                    <Checkbox id="chk5" checked={checklist.item5_portfolioCreated} onCheckedChange={(val: boolean) => setChecklist(prev => ({ ...prev, item5_portfolioCreated: val }))} />
                    <Label htmlFor="chk5" className="text-slate-600 font-medium">5. Authentic portfolio contains verifiable references</Label>
                  </div>
                  <div className="flex items-start gap-2">
                    <Checkbox id="chk6" checked={checklist.item6_unitsLinked} onCheckedChange={(val: boolean) => setChecklist(prev => ({ ...prev, item6_unitsLinked: val }))} />
                    <Label htmlFor="chk6" className="text-slate-600 font-medium">6. Evidences explicitly connected to standard competencies</Label>
                  </div>
                  <div className="flex items-start gap-2">
                    <Checkbox id="chk7" checked={checklist.item7_authenticityChecked} onCheckedChange={(val: boolean) => setChecklist(prev => ({ ...prev, item7_authenticityChecked: val }))} />
                    <Label htmlFor="chk7" className="text-slate-600 font-medium">7. Originality check complete (signed by employer or issuer)</Label>
                  </div>
                  <div className="flex items-start gap-2">
                    <Checkbox id="chk8" checked={checklist.item8_relevanceChecked} onCheckedChange={(val: boolean) => setChecklist(prev => ({ ...prev, item8_relevanceChecked: val }))} />
                    <Label htmlFor="chk8" className="text-slate-600 font-medium">8. Exhibits demonstrate practical alignment to trade skills</Label>
                  </div>
                  <div className="flex items-start gap-2">
                    <Checkbox id="chk9" checked={checklist.item9_recentlyAcquired} onCheckedChange={(val: boolean) => setChecklist(prev => ({ ...prev, item9_recentlyAcquired: val }))} />
                    <Label htmlFor="chk9" className="text-slate-600 font-medium">9. Prior execution remains current and industrially valid</Label>
                  </div>
                  <div className="flex items-start gap-2">
                    <Checkbox id="chk10" checked={checklist.item10_evidenceSufficient} onCheckedChange={(val: boolean) => setChecklist(prev => ({ ...prev, item10_evidenceSufficient: val }))} />
                    <Label htmlFor="chk10" className="text-slate-600 font-medium">10. Submittals are sufficient to confirm the skills claim</Label>
                  </div>
                  <div className="flex items-start gap-2">
                    <Checkbox id="chk11" checked={checklist.item11_creditedIdentified} onCheckedChange={(val: boolean) => setChecklist(prev => ({ ...prev, item11_creditedIdentified: val }))} />
                    <Label htmlFor="chk11" className="text-slate-600 font-medium">11. Mapped units credited through RPL are identified</Label>
                  </div>
                  <div className="flex items-start gap-2">
                    <Checkbox id="chk12" checked={checklist.item12_nonCreditedIdentified} onCheckedChange={(val: boolean) => setChecklist(prev => ({ ...prev, item12_nonCreditedIdentified: val }))} />
                    <Label htmlFor="chk12" className="text-slate-600 font-medium">12. Remaining uncredited units are flagged for evaluation</Label>
                  </div>
                  <div className="flex items-start gap-2">
                    <Checkbox id="chk13" checked={checklist.item13_gapChecked} onCheckedChange={(val: boolean) => setChecklist(prev => ({ ...prev, item13_gapChecked: val }))} />
                    <Label htmlFor="chk13" className="text-slate-600 font-medium">13. Structural gap training requirements identified</Label>
                  </div>
                  <div className="flex items-start gap-2">
                    <Checkbox id="chk14" checked={checklist.item14_gapCompleted} onCheckedChange={(val: boolean) => setChecklist(prev => ({ ...prev, item14_gapCompleted: val }))} />
                    <Label htmlFor="chk14" className="text-slate-600 font-medium">14. Competency gap training completed or non-applicable</Label>
                  </div>
                  <div className="flex items-start gap-2 pb-2">
                    <Checkbox id="chk15" checked={checklist.item15_recommendedForAssessment} onCheckedChange={(val: boolean) => setChecklist(prev => ({ ...prev, item15_recommendedForAssessment: val }))} />
                    <Label htmlFor="chk15" className="text-slate-600 font-semibold text-indigo-700">15. Evaluator recommends endorse back for official assessment</Label>
                  </div>
                </div>
              </div>

              {/* Endorsement Actions Panel */}
              <div className="bg-slate-50 p-5 rounded-xl border border-slate-100 space-y-4">
                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wide flex items-center gap-1">
                  <ThumbsUp className="h-4 w-4 text-indigo-600" />
                  National Competency Endorsement Framework
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1.5">
                    <Label className="font-semibold text-slate-700">Select Assessment Center Center</Label>
                    <Select value={selectedACId} onValueChange={setSelectedACId}>
                      <SelectTrigger className="w-full bg-white select-all">
                        <SelectValue placeholder="Pick accredited testing venue..." />
                      </SelectTrigger>
                      <SelectContent>
                        {assessmentCenters.map(ac => (
                          <SelectItem key={ac.id} value={ac.id}>
                            {ac.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="font-semibold text-slate-700">Endorsement evaluation notes</Label>
                    <Input 
                      placeholder="Add brief evaluator recommendation..."
                      className="bg-white"
                      value={endorsementRemarks}
                      onChange={(e) => setEndorsementRemarks(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button 
                    size="sm" 
                    className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-bold h-9"
                    onClick={handleEndorseCandidate}
                    disabled={!selectedACId}
                  >
                    Endorse Learner to Assessment Center for Scheduling
                  </Button>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={() => setIsDetailOpen(false)} className="w-full">
                Close Evaluator Block
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
