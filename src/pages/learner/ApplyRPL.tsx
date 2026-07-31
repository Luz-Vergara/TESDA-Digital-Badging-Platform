import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '@/src/lib/firebase';
import { collection, addDoc, getDocs, query, where, serverTimestamp, onSnapshot, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { getDocs as rawGetDocs, deleteDoc as rawDeleteDoc } from '@firebase/firestore';
import { useFirebase } from '@/src/lib/FirebaseProvider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Award, Plus, Trash, FileText, CheckCircle2, ChevronRight, AlertCircle, Sparkles, Building, Loader2, Search, Clock, ShieldCheck, HelpCircle, ArrowRight, BookOpen, Layers } from 'lucide-react';
import { BadgeTemplate, Organization, RPLEvidence, RPLCompetencyReview, RPLApplication } from '@/src/types';

export default function ApplyRPL() {
  const navigate = useNavigate();
  const { user, userProfile, isAuthReady } = useFirebase();
  
  // Tab and tracking states
  const [activeTab, setActiveTab2] = useState<'apply' | 'tracking'>('apply');
  const [myApps, setMyApps] = useState<RPLApplication[]>([]);
  const [myAppsLoading, setMyAppsLoading] = useState(true);
  const [deletingDemo, setDeletingDemo] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleDeleteDemoRPLData = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      // Auto reset the confirmation prompt after 5 seconds if not tapped again
      setTimeout(() => {
        setConfirmDelete(false);
      }, 5000);
      return;
    }

    setConfirmDelete(false);
    setDeletingDemo(true);
    setDeleteError('');
    setDeleteSuccess('');
    
    let rplCount = 0;
    let arCount = 0;
    let brCount = 0;
    let ibCount = 0;
    let colDeletions = 0;
    const failures: string[] = [];

    try {
      console.log("Inherent safety checklist: Initiating permanent deletion of demo RPL records with isDemo === true...");

      // 1. Delete rplApplications where isDemo === true
      try {
        const rplSnap = await rawGetDocs(query(collection(db, 'rplApplications'), where('isDemo', '==', true)));
        for (const d of rplSnap.docs) {
          const data = d.data();
          if (data.isDemo === true) {
            console.log(`[Safety Verified] Deleting rplApplications doc ID: ${d.id}`, data);
            await rawDeleteDoc(doc(db, 'rplApplications', d.id));
            rplCount++;
          }
        }
      } catch (err: any) {
        console.error("Error deleting rplApplications:", err);
        failures.push(`rplApplications (${err.message || err})`);
      }

      // 2. Delete assessmentRecords where isDemo === true and pathway === 'Recognition of Prior Learning (RPL)'
      try {
        const arSnap = await rawGetDocs(query(collection(db, 'assessmentRecords'), where('isDemo', '==', true)));
        for (const d of arSnap.docs) {
          const data = d.data();
          if (data.isDemo === true && data.pathway === 'Recognition of Prior Learning (RPL)') {
            console.log(`[Safety Verified] Deleting assessmentRecords doc ID: ${d.id}`, data);
            await rawDeleteDoc(doc(db, 'assessmentRecords', d.id));
            arCount++;
          }
        }
      } catch (err: any) {
        console.error("Error deleting assessmentRecords:", err);
        failures.push(`assessmentRecords (${err.message || err})`);
      }

      // 3. Delete badgeRequests where isDemo === true and related to RPL
      try {
        const brSnap = await rawGetDocs(query(collection(db, 'badgeRequests'), where('isDemo', '==', true)));
        for (const d of brSnap.docs) {
          const data = d.data();
          const hasRplKeywords = data.issuancePath === 'RPL' || 
                                data.remarks?.includes('RPL') || 
                                data.reviewRemarks?.includes('RPL') ||
                                data.badgeTemplateId?.includes('rpl') ||
                                data.id?.includes('rpl');
          if (data.isDemo === true && hasRplKeywords) {
            console.log(`[Safety Verified] Deleting badgeRequests doc ID: ${d.id}`, data);
            await rawDeleteDoc(doc(db, 'badgeRequests', d.id));
            brCount++;
          }
        }
      } catch (err: any) {
        console.error("Error deleting badgeRequests:", err);
        failures.push(`badgeRequests (${err.message || err})`);
      }

      // 4. Delete issuedBadges where isDemo === true and related to RPL
      try {
        const ibSnap = await rawGetDocs(query(collection(db, 'issuedBadges'), where('isDemo', '==', true)));
        for (const d of ibSnap.docs) {
          const data = d.data();
          const isRplBadge = data.pathway === 'RPL' || 
                             data.issuancePath === 'RPL' || 
                             data.evidenceUrl?.includes('rpl') || 
                             d.id.startsWith('demo-request-rpl');
          if (data.isDemo === true && isRplBadge) {
            console.log(`[Safety Verified] Deleting issuedBadges doc ID: ${d.id}`, data);
            await rawDeleteDoc(doc(db, 'issuedBadges', d.id));
            ibCount++;
          }
        }
      } catch (err: any) {
        console.error("Error deleting issuedBadges:", err);
        failures.push(`issuedBadges (${err.message || err})`);
      }

      // 5. Delete potential dynamic collections linked to RPL
      const extraCollections = [
        'rplStatusLogs', 'rplNotifications', 'rplChecklists', 'rplAttachments', 'rplDashboardQueue'
      ];
      for (const col of extraCollections) {
        try {
          const snap = await rawGetDocs(collection(db, col));
          for (const d of snap.docs) {
            const data = d.data();
            if (data.isDemo === true) {
              console.log(`[Safety Verified] Deleting extra collection doc ${col}/${d.id}`, data);
              await rawDeleteDoc(doc(db, col, d.id));
              colDeletions++;
            }
          }
        } catch (e: any) {
          // Dynamic collection may not exist, skip silently
        }
      }

      // 6. Persist a deletion marker flag in user profile
      if (user?.uid) {
        try {
          const userDocRef = doc(db, 'users', user.uid);
          await updateDoc(userDocRef, { rplDemoDataDeleted: true });
        } catch (err) {
          console.error("Error saving rplDemoDataDeleted flag in profile:", err);
        }
      }

      if (failures.length > 0) {
        setDeleteError(`Completed with warnings. Some collections failed to clear: ${failures.join(', ')}. Successfully deleted: ${rplCount} application(s), ${arCount} assessment record(s), ${brCount} badge request(s), ${ibCount} issued badge(s), and ${colDeletions} extra records.`);
      } else {
        setDeleteSuccess(`Permanently deleted demo RPL records from Firebase: ${rplCount} application(s), ${arCount} assessment record(s), ${brCount} badge request(s), ${ibCount} issued badge(s), and ${colDeletions} related logs/notifications. Your demo account starts fresh!`);
      }

      setTimeout(() => {
        setDeleteSuccess('');
      }, 7000);
    } catch (err: any) {
      console.error("Critical error inside handleDeleteDemoRPLData:", err);
      setDeleteError(err.message || "Failed to clear demo RPL records.");
    } finally {
      setDeletingDemo(false);
    }
  };

  // Loading states
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);

  // Source collections
  const [templates, setTemplates] = useState<BadgeTemplate[]>([]);
  const [trainingCenters, setTrainingCenters] = useState<Organization[]>([]);

  // Selection state
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [targetCredential, setTargetCredential] = useState<'Certificate of Competency' | 'National Certificate'>('National Certificate');
  const [applicationType, setApplicationType] = useState<'Enrolled Learner' | 'Walk-in RPL'>('Walk-in RPL');
  const [selectedTrainingCenterId, setSelectedTrainingCenterId] = useState('');

  // Auto-select template matching target credential type on change (Connect Skilled to COC & Master to NC)
  useEffect(() => {
    if (templates.length === 0) return;
    const filtered = templates.filter(t => {
      if (targetCredential === 'Certificate of Competency') {
        return t.badgeType === 'Skilled' || t.badgeType === 'Expert';
      } else {
        return t.badgeType === 'Master';
      }
    });
    if (filtered.length > 0) {
      const exists = filtered.some(t => t.id === selectedTemplateId);
      if (!exists) {
        setSelectedTemplateId(filtered[0].id);
      }
    } else {
      setSelectedTemplateId(templates[0].id);
    }
  }, [targetCredential, templates]);

  // Fetch learner's own RPL Applications for the tracking view
  useEffect(() => {
    if (!isAuthReady || !user) return;
    const qMyApps = query(
      collection(db, 'rplApplications'),
      where('learnerId', '==', user.uid)
    );
    const unsub = onSnapshot(qMyApps, (snap) => {
      const apps = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as RPLApplication));
      apps.sort((a, b) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });
      setMyApps(apps);
      setMyAppsLoading(false);
    }, (error) => {
      console.error("Error fetching my RPL apps:", error);
      setMyAppsLoading(false);
    });
    return () => unsub();
  }, [user, isAuthReady]);
  
  // Text inputs
  const [yearsExperience, setYearsExperience] = useState<number>(3);
  const [workExperienceSummary, setWorkExperienceSummary] = useState('');

  // Evidence tracking
  const [evidenceList, setEvidenceList] = useState<Array<{ title: string; url: string; description: string }>>([
    { title: 'Certificate of Employment', url: 'https://example.com/coe.pdf', description: 'Proof of 3+ years in industry' }
  ]);
  const [newEvidenceTitle, setNewEvidenceTitle] = useState('');
  const [newEvidenceUrl, setNewEvidenceUrl] = useState('');
  const [newEvidenceDesc, setNewEvidenceDesc] = useState('');

  // Validation / Error alerts
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Fetch qualifications and centers
  useEffect(() => {
    if (!isAuthReady) return;

    const fetchData = async () => {
      try {
        // Fetch templates
        const templatesSnap = await getDocs(collection(db, 'badgeTemplates'));
        const fetchedTemplates = templatesSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as BadgeTemplate));
        setTemplates(fetchedTemplates);

        // Fetch organizations (Training Centers)
        const orgsQuery = query(collection(db, 'organizations'), where('type', '==', 'TrainingCenter'), where('status', '==', 'Active'));
        const orgsSnap = await getDocs(orgsQuery);
        const fetchedCenters = orgsSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Organization));
        setTrainingCenters(fetchedCenters);

        // Default Training Center if learner profile has one
        if (userProfile?.office) {
          const matchedCenter = fetchedCenters.find(tc => tc.name === userProfile.office);
          if (matchedCenter) {
            setSelectedTrainingCenterId(matchedCenter.id);
            setApplicationType('Enrolled Learner');
          }
        }
      } catch (err) {
        console.error("Error loading RPL creation resources: ", err);
      } finally {
        setFetchingData(false);
      }
    };

    fetchData();
  }, [isAuthReady, userProfile]);

  // Handle adding new evidence to checklist local array
  const addEvidenceItem = () => {
    if (!newEvidenceTitle.trim() || !newEvidenceUrl.trim()) {
      setErrorMessage('Please provide both an evidence title and a verifiable document URL.');
      return;
    }
    setEvidenceList(prev => [
      ...prev,
      {
        title: newEvidenceTitle,
        url: newEvidenceUrl,
        description: newEvidenceDesc || 'Verifiable Portfolio Dossier Document'
      }
    ]);
    setNewEvidenceTitle('');
    setNewEvidenceUrl('');
    setNewEvidenceDesc('');
    setErrorMessage('');
  };

  // Remove evidence from local state array
  const removeEvidenceItem = (index: number) => {
    setEvidenceList(prev => prev.filter((_, idx) => idx !== index));
  };

  // Handle submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!selectedTemplateId) {
      setErrorMessage('Please select a target qualification to align your competencies.');
      return;
    }

    if (yearsExperience <= 0) {
      setErrorMessage('Please indicate a valid number of years of cumulative work experience.');
      return;
    }

    if (!workExperienceSummary.trim() || workExperienceSummary.length < 20) {
      setErrorMessage('Please write a detailed summary of your work experience (at least 20 characters).');
      return;
    }

    // Auto-capture whatever is in the input field as an active URL if not already attached
    let finalEvidenceList = [...evidenceList];
    if (newEvidenceUrl.trim()) {
      finalEvidenceList.push({
        title: newEvidenceTitle.trim() || 'Verifiable Portfolio Document',
        url: newEvidenceUrl.trim(),
        description: newEvidenceDesc.trim() || 'Verifiable Portfolio Dossier Document'
      });
    }

    if (finalEvidenceList.length === 0) {
      setErrorMessage('Please attach at least one portfolio item or verifiable evidence document link.');
      return;
    }

    setLoading(true);

    try {
      const selectedTemplate = templates.find(t => t.id === selectedTemplateId);
      if (!selectedTemplate) throw new Error('Target Template not found');

      // Setup initial competencies review checklist
      // We parse templates' description or criteria or list standard units
      const competencies: RPLCompetencyReview[] = [];
      const defaultCompetencies = [
        `Core Competency 1: Apply System Integration Processes`,
        `Core Competency 2: Debug and Rectify System Operations`,
        `Core Competency 3: Deploy Certified Professional Output`
      ];

      if (selectedTemplate.relatedCompetency) {
        // Use custom competency defined on template
        competencies.push({
          id: 'comp-1',
          competencyName: selectedTemplate.relatedCompetency,
          competencyCode: selectedTemplate.qualificationCode ? `${selectedTemplate.qualificationCode}-UC1` : 'UC-001',
          evidenceIds: [],
          status: 'Pending',
          remarks: 'Aligns with target template declaration'
        });
      } else {
        defaultCompetencies.forEach((comp, idx) => {
          competencies.push({
            id: `comp-${idx + 1}`,
            competencyName: comp,
            competencyCode: selectedTemplate.qualificationCode ? `${selectedTemplate.qualificationCode}-0${idx + 1}` : `UC-0${idx + 1}`,
            evidenceIds: [],
            status: 'Pending'
          });
        });
      }

      // Evidences with generated IDs
      const formattedEvidences: RPLEvidence[] = finalEvidenceList.map((ev, idx) => ({
        id: `ev-${idx + 1}`,
        title: ev.title,
        url: ev.url,
        description: ev.description,
        status: 'Pending'
      }));

      // Determine Center
      let matchedTCName = 'Awaiting Assignment / Walk-In';
      if (selectedTrainingCenterId) {
        const center = trainingCenters.find(c => c.id === selectedTrainingCenterId);
        if (center) {
          matchedTCName = center.name;
        }
      }

      // Initial Status logic
      const statusValue = selectedTrainingCenterId ? 'Submitted' : 'For Training Center Assignment';

      const rplPayload: Omit<RPLApplication, 'id'> = {
        learnerId: user?.uid || 'anonymous-learner',
        learnerName: user?.displayName || userProfile?.name || 'TESDA Registered Learner',
        learnerEmail: user?.email || userProfile?.email || 'learner@tesda.gov.ph',
        trainingCenterId: selectedTrainingCenterId || 'unassigned',
        trainingCenterName: matchedTCName,
        qualificationName: selectedTemplate.badgeName && selectedTemplate.qualificationName && selectedTemplate.badgeName !== selectedTemplate.qualificationName
          ? `${selectedTemplate.badgeName} (under ${selectedTemplate.qualificationName})`
          : (selectedTemplate.badgeName || selectedTemplate.qualificationName),
        qualificationCode: selectedTemplate.qualificationCode || 'N/A',
        qualificationId: selectedTemplate.id,
        targetCredential,
        applicationType,
        status: statusValue,
        workExperienceSummary,
        yearsExperience,
        evidence: formattedEvidences,
        competencyReviews: competencies,
        gapTrainingRequired: false,
        gapTrainingStatus: 'None',
        endorsedToAssessmentCenter: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      // Add to Firestore rplApplications
      await addDoc(collection(db, 'rplApplications'), rplPayload);

      // Reset the deletion marker in user profile on new manual submission
      if (user?.uid) {
        try {
          const userDocRef = doc(db, 'users', user.uid);
          await updateDoc(userDocRef, { rplDemoDataDeleted: false });
        } catch (err) {
          console.error("Error resetting rplDemoDataDeleted status on manual submit: ", err);
        }
      }

      setSuccessMessage('Congratulations! Your RPL application portfolio has been submitted successfully to TESDA.');
      
      // Navigate/Redirect back to wallet or application hub after short delay
      setTimeout(() => {
        navigate('/learner');
      }, 3000);

    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'System error submitting your prior learning portfolio.');
    } finally {
      setLoading(false);
    }
  };

  if (fetchingData) {
    return (
      <div className="flex flex-col items-center justify-center p-12 min-h-[400px]">
        <Loader2 className="h-8 w-8 text-blue-600 animate-spin mb-4" />
        <p className="text-slate-500 text-sm">Synchronizing alignment templates & training registries...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6">
      <div className="flex flex-col gap-1">
        <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full w-fit">
          <Award className="h-3 md:h-3.5 w-3 md:w-3.5" />
          Prior Learning Pathway
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
          Recognition of Prior Learning (RPL) Application
        </h1>
        <p className="text-slate-500 text-sm max-w-2xl leading-relaxed">
          Unlock accredited digital certifications and micro-credentials based on alignment mapping of your proven industry history, prior occupational certifications, and work experience.
        </p>
      </div>

      {deleteSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-emerald-900 animate-pulse">Success</h4>
            <p className="text-xs text-emerald-700 leading-relaxed font-medium">{deleteSuccess}</p>
          </div>
        </div>
      )}

      {deleteError && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-start gap-3 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
          <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-rose-900">Deletion Warning / Error</h4>
            <p className="text-xs text-rose-700 leading-relaxed font-medium">{deleteError}</p>
          </div>
        </div>
      )}

      {/* Dynamic Tab Switcher */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
        <Button
          type="button"
          variant={activeTab === 'apply' ? 'default' : 'ghost'}
          onClick={() => setActiveTab2('apply')}
          className={`text-xs font-semibold h-8 rounded-lg ${activeTab === 'apply' ? 'bg-blue-600 text-white hover:bg-blue-700' : 'text-slate-600 hover:bg-slate-100'}`}
        >
          <Layers className="h-3.5 w-3.5 mr-1.5" />
          Submit New RPL Application
        </Button>
        <Button
          type="button"
          variant={activeTab === 'tracking' ? 'default' : 'ghost'}
          onClick={() => setActiveTab2('tracking')}
          className={`text-xs font-semibold h-8 rounded-lg relative ${activeTab === 'tracking' ? 'bg-blue-600 text-white hover:bg-blue-700' : 'text-slate-600 hover:bg-slate-100'}`}
        >
          <Clock className="h-3.5 w-3.5 mr-1.5" />
          Ongoing Submissions & Tracker
          {myApps.length > 0 && (
            <span className="ml-1.5 bg-blue-100 text-blue-700 text-[9px] font-bold px-1.5 py-0.5 rounded-full">
              {myApps.length}
            </span>
          )}
        </Button>

        {userProfile?.isDemo && (
          <Button
            type="button"
            variant={confirmDelete ? "warning" as any : "destructive"}
            onClick={handleDeleteDemoRPLData}
            disabled={deletingDemo}
            className={`text-xs font-semibold h-8 rounded-lg md:ml-auto flex items-center gap-1.5 transition-all duration-300 ${
              confirmDelete 
                ? 'bg-amber-600 hover:bg-amber-700 text-white animate-pulse px-3 ring-2 ring-amber-300 ring-offset-1' 
                : 'bg-rose-600 hover:bg-rose-700 text-white'
            }`}
            id="btn-delete-demo-rpl"
          >
            {deletingDemo ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Deleting Demo RPL Data...
              </>
            ) : confirmDelete ? (
              <>
                <AlertCircle className="h-3.5 w-3.5 animate-bounce" />
                Confirm Deletion? Click Again
              </>
            ) : (
              <>
                <Trash className="h-3.5 w-3.5" />
                Delete Demo RPL Data
              </>
            )}
          </Button>
        )}
      </div>

      {activeTab === 'tracking' ? (
        <div className="space-y-6">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-50">
              <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-1.5">
                <ShieldCheck className="h-5 w-5 text-blue-600" />
                Active Quality Auditing & Status Log
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Track the chronological status of your prior learning portfolio and assessor checklists assigned by TESDA evaluators.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {myAppsLoading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 text-blue-600 animate-spin mb-2" />
                  <p className="text-xs text-slate-500">Loading your submissions...</p>
                </div>
              ) : myApps.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-slate-150 rounded-xl bg-slate-50">
                  <Award className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-xs font-semibold text-slate-700">No RPL Portfolios Found</p>
                  <p className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto">
                    You haven’t submitted any Recognition of Prior Learning claims yet. Click the "Submit New RPL Application" tab to start your journey.
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-4 bg-white border-slate-200 text-xs font-semibold text-slate-700 animate-pulse"
                    onClick={() => setActiveTab2('apply')}
                  >
                    Create Submission
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  {myApps.map((app) => (
                    <div key={app.id} className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm hover:border-slate-350 transition-all">
                      {/* App Header */}
                      <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
                        <div className="space-y-1">
                          <span className="text-[10px] uppercase font-mono tracking-wider font-bold text-slate-400 block">
                            Application Ref: <span className="select-all font-sans font-semibold text-slate-500">{app.id}</span>
                          </span>
                          <h3 className="font-bold text-sm text-slate-800">
                            [{app.qualificationCode}] {app.qualificationName}
                          </h3>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-800 hover:bg-slate-200 border border-slate-200">
                            {app.targetCredential}
                          </Badge>
                          <Badge className={`text-[10px] font-bold px-2.5 py-0.5 font-sans border text-white ${
                            app.status === 'Assessment Completed' ? 'bg-emerald-600 border-emerald-700' :
                            app.status === 'Eligible for Assessment' || app.status === 'Ready for Assessment Endorsement' ? 'bg-blue-600 border-blue-700' :
                            app.status === 'Returned to TC' || app.status === 'Not Eligible' ? 'bg-rose-600 border-rose-700' :
                            app.status === 'Additional Documents Requested' ? 'bg-amber-600 border-amber-700' : 'bg-slate-600 border-slate-700'
                          }`}>
                            {app.status}
                          </Badge>
                        </div>
                      </div>

                      {/* App Body */}
                      <div className="p-4 md:p-6 grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
                        {/* Summary & Center assignment */}
                        <div className="space-y-4">
                          <div className="space-y-1">
                            <span className="text-[10px] uppercase font-mono font-bold text-slate-400 block tracking-wider">Institution / Evaluator</span>
                            <div className="flex items-center gap-1.5 text-slate-700 font-semibold mt-1">
                              <Building className="h-4 w-4 text-blue-500 shrink-0" />
                              <span className="truncate">{app.trainingCenterName}</span>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <span className="text-[10px] uppercase font-mono font-bold text-slate-400 block tracking-wider">Experience Profile Summary</span>
                            <div className="bg-slate-50 p-2.5 rounded-lg text-slate-600 mt-1 italic border border-slate-100">
                              "{app.workExperienceSummary}"
                            </div>
                            <p className="text-[10px] text-slate-500 font-mono mt-1 text-right">
                              – {app.yearsExperience} years work experience declared
                            </p>
                          </div>

                          {/* Eligibility Decision Remarks */}
                          {app.eligibilityRemarks && (
                            <div className="p-3 rounded-lg bg-indigo-50 border border-indigo-150 text-indigo-950 space-y-1 mt-3">
                              <span className="font-bold block text-[10px] text-indigo-700 uppercase tracking-wide">TESDA Evaluator Notes</span>
                              <p className="text-xs leading-relaxed italic text-indigo-900">
                                "{app.eligibilityRemarks}"
                              </p>
                            </div>
                          )}

                          {app.assessmentBatchName && (
                            <div className="p-3 rounded-lg bg-blue-50 border border-blue-150 text-blue-950 space-y-1.5 mt-3">
                              <span className="font-bold block text-[10px] text-blue-700 uppercase tracking-wide flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                                Assigned Assessment Schedule
                              </span>
                              <p className="text-xs">
                                Batch: <strong className="font-semibold text-slate-800">{app.assessmentBatchName}</strong>
                              </p>
                              <p className="text-xs">
                                Schedule: <strong className="font-semibold text-slate-850">{app.assessmentDate}</strong> ({app.assessmentStartTime} - {app.assessmentEndTime})
                              </p>
                              <p className="text-xs">
                                Venue/Room: <strong className="font-semibold text-slate-850">{app.assessmentVenue}</strong>
                              </p>
                              <p className="text-xs">
                                Assessor: <strong className="font-semibold text-slate-850">{app.assessorName}</strong>
                              </p>
                              {app.assessmentRemarks && (
                                <p className="text-[10px] text-slate-500 font-mono italic leading-normal border-t border-blue-100 pt-1 mt-1">
                                  Instructions: "{app.assessmentRemarks}"
                                </p>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Mapped Competencies Status Checklist */}
                        <div className="space-y-3 bg-slate-50/55 p-3.5 rounded-xl border border-slate-150">
                          <span className="text-[10px] uppercase font-mono font-bold text-slate-400 block tracking-wider">
                            RPL Competency Mapping Log
                          </span>
                          <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                            {app.competencyReviews?.map((comp, idx) => (
                              <div key={comp.id || idx} className="p-2 rounded bg-white border border-slate-150 flex items-start gap-2.5">
                                <Badge className={`text-[8px] font-bold px-1.5 shrink-0 ${
                                  comp.status === 'Credited through RPL' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                  comp.status === 'Requires Gap Training' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-50 text-slate-600 border-slate-200'
                                } border`}>
                                  {comp.status}
                                </Badge>
                                <div className="space-y-0.5 col-span-2">
                                  <p className="font-semibold text-[11px] text-slate-700 leading-tight">
                                    {comp.competencyName}
                                  </p>
                                  {comp.remarks && (
                                    <p className="text-[10px] text-slate-500 leading-normal">
                                      {comp.remarks}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Submitted Evidence & Verifiers */}
                        <div className="space-y-3 bg-slate-50/55 p-3.5 rounded-xl border border-slate-150">
                          <span className="text-[10px] uppercase font-mono font-bold text-slate-400 block tracking-wider">
                            Verified Evidence List ({app.evidence?.length || 0})
                          </span>
                          <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                            {app.evidence?.map((ev, idx) => (
                              <div key={ev.id || idx} className="p-2.5 bg-white rounded border border-slate-150 flex items-center justify-between gap-1.5">
                                <div className="space-y-1 min-w-0 flex-1">
                                  <p className="font-bold text-[11px] text-slate-800 truncate" title={ev.title}>{ev.title}</p>
                                  <a 
                                    href={ev.url} 
                                    target="_blank" 
                                    rel="noreferrer" 
                                    className="text-blue-600 hover:text-blue-800 underline font-mono text-[9px] break-all block truncate"
                                  >
                                    {ev.url}
                                  </a>
                                </div>
                                <Badge className={`text-[9.5px] px-1.5 py-0.2 shrink-0 ${
                                  ev.status === 'Accepted' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                                  ev.status === 'Rejected' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-slate-50 text-slate-600 border-slate-200'
                                } border`}>
                                  {ev.status || 'Pending Review'}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Checklist indicators if evaluated */}
                      {app.eligibilityChecklist && (
                        <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 text-[10px] grid grid-cols-2 md:grid-cols-4 gap-2 text-slate-500 font-mono">
                          <div className="flex items-center gap-1.5">
                            <span className={app.eligibilityChecklist.endorsedByTC ? "text-emerald-600 font-bold" : "text-slate-300"}>✓</span>
                            <span className={app.eligibilityChecklist.endorsedByTC ? "text-slate-700" : ""}>Institutional Endorsed</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className={app.eligibilityChecklist.evidenceReviewed ? "text-emerald-600 font-bold" : "text-slate-300"}>✓</span>
                            <span className={app.eligibilityChecklist.evidenceReviewed ? "text-slate-700" : ""}>Portfolio Audited</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className={app.eligibilityChecklist.targetCredentialVerified ? "text-emerald-600 font-bold" : "text-slate-300"}>✓</span>
                            <span className={app.eligibilityChecklist.targetCredentialVerified ? "text-slate-700" : ""}>Target Credential Match</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className={app.eligibilityChecklist.eligibleForAssessment ? "text-blue-600 font-bold" : "text-slate-300"}>✓</span>
                            <span className={app.eligibilityChecklist.eligibleForAssessment ? "text-slate-700 font-bold" : ""}>Eligible for Challenge Test</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left side: Guide & Instructions */}
        <div className="space-y-4">
          <Card className="bg-gradient-to-br from-blue-50/50 to-indigo-50/30 border-blue-100">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Sparkles className="h-4.5 w-4.5 text-amber-500" />
                Evaluative Rules
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-slate-600 space-y-3 leading-relaxed">
              <p>Your portfolio will be checked using standard TESDA regulatory quality parameters:</p>
              <ul className="list-disc pl-4 space-y-1.5">
                <li><strong className="text-slate-700">Validity:</strong> Verifiable portfolio references and files showing actual execution of work</li>
                <li><strong className="text-slate-700">Relevance:</strong> Direct context match with selected professional competencies</li>
                <li><strong className="text-slate-700">Recency:</strong> Acquired within contemporary industry relevance</li>
                <li><strong className="text-slate-700">Authenticity:</strong> Clean documents, certificates, and employment vouchers</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-slate-100">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-slate-800">Workflow Tracker</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs text-slate-500">
              <div className="flex items-center gap-2 text-blue-600 font-medium">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold">1</span>
                <span>Submit Portfolio Evidence</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-[10px] text-slate-400 font-bold">2</span>
                <span>TC Evaluator Review & Competency Mapping</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-[10px] text-slate-400 font-bold">3</span>
                <span>Gap Training Compliance (if any)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-[10px] text-slate-400 font-bold">4</span>
                <span>AC Endorsed Candidate Assessment</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right side: Interactive Form */}
        <div className="md:col-span-2">
          <form onSubmit={handleSubmit} className="space-y-6">
            {errorMessage && (
              <div className="bg-rose-50 border border-rose-100 text-rose-700 p-4 rounded-xl flex items-start gap-2.5 text-sm">
                <AlertCircle className="h-5 w-5 shrink-0 text-rose-500 mt-0.5" />
                <div>
                  <span className="font-bold">Missing Parameters</span>
                  <p className="text-xs text-rose-600 mt-1">{errorMessage}</p>
                </div>
              </div>
            )}

            {successMessage && (
              <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 p-5 rounded-xl flex items-start gap-3 text-sm animate-pulse">
                <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-600 mt-0.5" />
                <div>
                  <span className="font-bold text-base">Application Successfully Created</span>
                  <p className="text-xs text-emerald-700 mt-1">
                    {successMessage} Redirecting your dashboard console...
                  </p>
                </div>
              </div>
            )}

            <Card className="shadow-sm border-slate-200">
              <CardHeader className="border-b border-slate-50">
                <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                  RPL Target Setup
                </CardTitle>
                <CardDescription>
                  Align your professional profile against national TESDA skills guidelines.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Select Qualification Template */}
                  <div className="col-span-1 sm:col-span-2 space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">Target Training Standard / Qualification</Label>
                    <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                      <SelectTrigger className="w-full bg-white border-slate-200">
                        <SelectValue placeholder="Choose national standard..." />
                      </SelectTrigger>
                      <SelectContent>
                        {(() => {
                          const filtered = templates.filter(t => {
                            if (targetCredential === 'Certificate of Competency') {
                              return t.badgeType === 'Skilled' || t.badgeType === 'Expert';
                            } else if (targetCredential === 'National Certificate') {
                              return t.badgeType === 'Master';
                            }
                            return true;
                          });
                          const display = filtered.length > 0 ? filtered : templates;
                          return display.map(t => {
                            const isDifferent = t.badgeName && t.qualificationName && t.badgeName !== t.qualificationName;
                            const displayName = isDifferent 
                              ? `${t.badgeName} (under ${t.qualificationName})` 
                              : (t.badgeName || t.qualificationName || 'Unnamed standard');
                            return (
                              <SelectItem key={t.id} value={t.id} className="text-xs">
                                {displayName} {t.qualificationCode ? `(${t.qualificationCode})` : ''} ({t.badgeType} Badge)
                              </SelectItem>
                            );
                          });
                        })()}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Target Credential Type */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">Target Credential Class</Label>
                    <Select value={targetCredential} onValueChange={(val: any) => setTargetCredential(val)}>
                      <SelectTrigger className="w-full bg-white border-slate-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Certificate of Competency">Certificate of Competency (COC) - Skilled Badge</SelectItem>
                        <SelectItem value="National Certificate">National Certificate (NC) - Master Badge</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Application Type */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">Pathway Entry Strategy</Label>
                    <Select value={applicationType} onValueChange={(val: any) => setApplicationType(val)}>
                      <SelectTrigger className="w-full bg-white border-slate-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Walk-in RPL">Direct Walk-In Candidate</SelectItem>
                        <SelectItem value="Enrolled Learner">Institutional Enrolled Learner</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Training Center Assignment option */}
                  <div className="col-span-1 sm:col-span-2 space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                      <Building className="h-3.5 w-3.5 text-slate-400" />
                      Associated Evaluative Training Center
                    </Label>
                    <Select value={selectedTrainingCenterId} onValueChange={setSelectedTrainingCenterId}>
                      <SelectTrigger className="w-full bg-white border-slate-200">
                        <SelectValue placeholder="Select TESDA Provider (Optional for Walk-ins)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none_id_value_unassigned">None (Submit as Walk-In for direct assignment)</SelectItem>
                        {trainingCenters.map(tc => (
                          <SelectItem key={tc.id} value={tc.id}>
                            {tc.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-slate-400">
                      If left empty, your application will be triaged at the regional level for an designated Training Center Evaluator assignment.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-slate-200">
              <CardHeader className="border-b border-slate-50 pb-3">
                <CardTitle className="text-sm font-bold text-slate-700">Employment Experience Profile</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="yearsExp" className="text-xs font-semibold text-slate-700">
                    Cumulative Years of Industry Experience
                  </Label>
                  <Input
                    id="yearsExp"
                    type="number"
                    min="1"
                    max="45"
                    className="w-full bg-white focus:ring-blue-500 border-slate-200"
                    placeholder="e.g. 5"
                    value={yearsExperience || ''}
                    onChange={(e) => setYearsExperience(parseInt(e.target.value) || 0)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="summary" className="text-xs font-semibold text-slate-700">
                    Professional Background & Work Summary
                  </Label>
                  <Textarea
                    id="summary"
                    rows={4}
                    className="w-full bg-white focus:ring-blue-500 border-slate-200"
                    placeholder="Provide a comprehensive operational summary of your active industry responsibilities, previous projects executed, employers served, and practical skills applied daily..."
                    value={workExperienceSummary}
                    onChange={(e) => setWorkExperienceSummary(e.target.value)}
                  />
                  <p className="text-[10px] text-slate-400">
                    Maximum professional fidelity is recommended to assist evaluators in fast-tracking competency endorsements.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Evidence Checklist Addition */}
            <Card className="shadow-sm border-slate-200">
              <CardHeader className="border-b border-slate-50 pb-3">
                <CardTitle className="text-sm font-bold text-slate-700">Verifier Evidence Portfolio</CardTitle>
                <CardDescription className="text-xs">
                  Attach active evidentiary files such as Certificates of employment, previous training records, project logs, or photos.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {/* List added evidence */}
                <div className="space-y-2">
                  {evidenceList.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50 text-xs">
                      <div className="space-y-0.5">
                        <p className="font-semibold text-slate-800">{item.title}</p>
                        <p className="text-slate-500 line-clamp-1">{item.description}</p>
                        <a href={item.url} target="_blank" rel="noreferrer" className="text-blue-600 underline font-mono text-[10px] break-all">
                          {item.url}
                        </a>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 h-8 w-8 rounded-full"
                        onClick={() => removeEvidenceItem(index)}
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}

                  {evidenceList.length === 0 && (
                    <div className="p-6 text-center border-2 border-dashed border-slate-200 rounded-lg text-slate-400 text-xs text-medium">
                      No evidentiary documents attached. Add at least one item below.
                    </div>
                  )}
                </div>

                {/* Addition Form Row */}
                <div className="border-t border-slate-100 pt-4 space-y-3">
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block font-mono">
                    Append Verified Evidence
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="evTitle" className="text-[10px] text-slate-500 font-semibold">Document Title</Label>
                      <Input
                        id="evTitle"
                        className="bg-white text-xs"
                        placeholder="e.g. Industry Certification Voucher"
                        value={newEvidenceTitle}
                        onChange={(e) => setNewEvidenceTitle(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="evLoc" className="text-[10px] text-slate-500 font-semibold font-mono">Verifier URL / File Link</Label>
                      <Input
                        id="evLoc"
                        className="bg-white text-xs font-mono"
                        placeholder="https://drive.google.com/..."
                        value={newEvidenceUrl}
                        onChange={(e) => setNewEvidenceUrl(e.target.value)}
                      />
                    </div>
                    <div className="col-span-1 sm:col-span-2 space-y-1">
                      <Label htmlFor="evDesc" className="text-[10px] text-slate-500 font-semibold">Contextual Decriptor</Label>
                      <Input
                        id="evDesc"
                        className="bg-white text-xs"
                        placeholder="Describe the context of this document to guide evaluator checks..."
                        value={newEvidenceDesc}
                        onChange={(e) => setNewEvidenceDesc(e.target.value)}
                      />
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="text-xs flex items-center gap-1.5 w-full bg-slate-50 hover:bg-slate-100 text-slate-700"
                    onClick={addEvidenceItem}
                  >
                    <Plus className="h-4 w-4 text-blue-600" />
                    Attach Item to Evidence Portfolio
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => navigate('/learner')}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium shadow-md flex items-center gap-2"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Completing Application...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4.5 w-4.5" />
                    Submit Portfolio To Evaluators
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
      )}
    </div>
  );
}
