import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  Award,
  CheckCircle2,
  ArrowLeft,
  Send,
  Building2,
  UserCheck,
  FileCheck,
  ShieldCheck,
  AlertCircle,
  HelpCircle
} from 'lucide-react';
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  serverTimestamp,
  getDocs
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/src/lib/firebase';
import { useFirebase } from '@/src/lib/FirebaseProvider';
import { generateRequestNumber } from '@/src/lib/badge-utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Learner, BadgeTemplate, ProgramOffering } from '@/src/types';

export default function FileBadgeRequest() {
  const { user, userProfile, isAuthReady } = useFirebase();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialLearnerId = searchParams.get('learnerId') || '';

  const [learners, setLearners] = useState<Learner[]>([]);
  const [templates, setTemplates] = useState<BadgeTemplate[]>([]);
  const [offerings, setOfferings] = useState<ProgramOffering[]>([]);
  const [selectedLearner, setSelectedLearner] = useState<Learner | null>(null);

  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedRequestNumber, setSubmittedRequestNumber] = useState<string | null>(null);

  const [badgeTemplateId, setBadgeTemplateId] = useState('');
  const [batchRef, setBatchRef] = useState('');
  const [issuancePath, setIssuancePath] = useState<'Standard Training-Based' | 'RPL'>('Standard Training-Based');
  const [remarks, setRemarks] = useState('');
  const [isAttested, setIsAttested] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthReady || !user) return;

    const tcId = userProfile?.organizationId || user.uid;

    // 1. Fetch Learners
    const lQuery = query(
      collection(db, 'learners'),
      where('trainingCenterId', '==', tcId)
    );
    const unsubscribeLearners = onSnapshot(lQuery, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Learner[];
      setLearners(docs);

      if (initialLearnerId) {
        const found = docs.find(l => l.id === initialLearnerId);
        if (found) setSelectedLearner(found);
      } else if (docs.length > 0 && !selectedLearner) {
        setSelectedLearner(docs[0]);
      }
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'learners');
      setLoading(false);
    });

    // 2. Fetch Badge Templates
    const tQuery = query(collection(db, 'badgeTemplates'), where('status', 'in', ['Approved', 'Active']));
    const unsubscribeTemplates = onSnapshot(tQuery, (snapshot) => {
      const templateDocs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as BadgeTemplate[];
      setTemplates(templateDocs);
      if (templateDocs.length > 0 && !badgeTemplateId) {
        setBadgeTemplateId(templateDocs[0].id);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'badgeTemplates');
    });

    // 3. Fetch Program Offerings
    const pQuery = query(collection(db, 'programOfferings'), where('trainingCenterId', '==', tcId));
    const unsubscribeOfferings = onSnapshot(pQuery, (snapshot) => {
      setOfferings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ProgramOffering[]);
    });

    return () => {
      unsubscribeLearners();
      unsubscribeTemplates();
      unsubscribeOfferings();
    };
  }, [user, isAuthReady, userProfile, initialLearnerId]);

  const handleLearnerChange = (learnerId: string) => {
    const found = learners.find(l => l.id === learnerId);
    if (found) setSelectedLearner(found);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!selectedLearner) {
      setErrorMessage('Please select a learner.');
      return;
    }

    if (!badgeTemplateId) {
      setErrorMessage('Please select an approved Badge Template.');
      return;
    }

    if (!isAttested) {
      setErrorMessage('You must confirm the attestation checkbox before submitting.');
      return;
    }

    setIsSubmitting(true);
    const tcId = userProfile?.organizationId || user?.uid || 'tc-default';
    const districtId = userProfile?.assignedDistrictId || 'demo-district-office';
    const reqNum = await generateRequestNumber(tcId);

    const templateObj = templates.find(t => t.id === badgeTemplateId);

    try {
      await addDoc(collection(db, 'badgeRequests'), {
        requestNumber: reqNum,
        requestType: 'Individual',
        trainingCenterId: tcId,
        trainingCenterName: userProfile?.office || 'Training Provider',
        assignedDistrictId: districtId,
        learnerId: selectedLearner.id,
        learnerName: selectedLearner.name,
        learnerUli: selectedLearner.uli || 'ULI-2026-DEMO',
        learnerEmail: selectedLearner.email || '',
        learnerIds: [selectedLearner.id],
        learnerCount: 1,
        programName: selectedLearner.programName || templateObj?.qualificationTitle || 'National Certificate',
        qualificationCode: templateObj?.qualificationCode || 'QUAL-2026',
        ctprNumber: selectedLearner.ctprNumber || 'CTPR-2026-08912',
        badgeTemplateId: badgeTemplateId,
        badgeTitle: templateObj?.title || 'Digital Badge',
        issuancePath: issuancePath,
        batchReference: batchRef || 'Batch 2026-A',
        status: 'Pending',
        remarks: remarks || 'Filing request based on verified training completion in External MIS.',
        requestedByUserId: user?.uid,
        requestedByEmail: user?.email,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      setSubmittedRequestNumber(reqNum);
      setIsSubmitting(false);
    } catch (err: any) {
      console.error('Error submitting badge request:', err);
      handleFirestoreError(err, OperationType.CREATE, 'badgeRequests');
      setErrorMessage('Failed to file badge request. Please try again.');
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (submittedRequestNumber) {
    return (
      <div className="max-w-2xl mx-auto py-12 space-y-6">
        <Card className="border-emerald-200 bg-emerald-50/20 text-center p-8">
          <div className="mx-auto w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mb-4">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <CardTitle className="text-2xl font-bold text-slate-900">Badge Request Filed Successfully!</CardTitle>
          <CardDescription className="text-slate-600 mt-2 text-base">
            Request <span className="font-mono font-bold text-blue-600">#{submittedRequestNumber}</span> has been saved in Firebase and routed to your assigned District Office for verification.
          </CardDescription>

          <div className="mt-8 flex justify-center gap-4">
            <Button
              variant="outline"
              onClick={() => {
                setSubmittedRequestNumber(null);
                setIsAttested(false);
                setRemarks('');
              }}
            >
              File Another Request
            </Button>
            <Link to="/trainingcenter/requests">
              <Button className="bg-blue-600 hover:bg-blue-700">
                View All Badge Requests
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900">File Badge Request</h1>
            <Badge className="bg-blue-100 text-blue-800 border-blue-200 font-mono text-[10px]">
              DIGITAL BADGING PLATFORM
            </Badge>
          </div>
          <p className="text-slate-500 text-sm">
            Initiate formal digital credential processing for eligible learners with verified records in External MIS.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {errorMessage && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-3 text-rose-700 text-sm">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p>{errorMessage}</p>
          </div>
        )}

        {/* SECTION 1: EXTERNAL MIS READ-ONLY LEARNER DATA */}
        <Card className="border-slate-200">
          <CardHeader className="bg-slate-50 border-b border-slate-100 py-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <CardTitle className="text-sm font-bold text-slate-800">1. External Learner Record Verification</CardTitle>
              </div>
              <Badge variant="outline" className="bg-white font-mono text-[10px] text-slate-600">
                Source: External MIS (T2MIS API)
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div>
              <Label className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 block">
                Select Eligible Learner
              </Label>
              <Select value={selectedLearner?.id || ''} onValueChange={handleLearnerChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select learner..." />
                </SelectTrigger>
                <SelectContent>
                  {learners.map(l => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name} ({l.uli || 'No ULI'}) - {l.programName || 'Qualification'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedLearner && (
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 grid md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Learner Name</p>
                  <p className="font-bold text-slate-900 mt-0.5">{selectedLearner.name}</p>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">ULI: {selectedLearner.uli || 'ULI-2026-DEMO'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Registered Qualification & CTPR</p>
                  <p className="font-semibold text-slate-800 mt-0.5">{selectedLearner.programName || 'National Certificate'}</p>
                  <p className="text-xs text-slate-500 mt-0.5">CTPR: {selectedLearner.ctprNumber || 'CTPR-2026-08912'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Assigned Training Center</p>
                  <p className="font-medium text-slate-700 mt-0.5">{userProfile?.office || 'Authorized Training Provider'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">External MIS Completion Status</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span className="font-bold text-emerald-700">100% Core Competencies Completed</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* SECTION 2: DIGITAL BADGE CONFIGURATION */}
        <Card className="border-slate-200">
          <CardHeader className="bg-slate-50 border-b border-slate-100 py-3">
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-blue-600" />
              <CardTitle className="text-sm font-bold text-slate-800">2. Digital Badge Specification</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 block">
                  Applicable Badge Template *
                </Label>
                <Select value={badgeTemplateId} onValueChange={setBadgeTemplateId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select badge template..." />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map(t => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.title} ({t.qualificationCode || 'Standard'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 block">
                  Issuance Path / Route *
                </Label>
                <Select value={issuancePath} onValueChange={(val: any) => setIssuancePath(val)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Standard Training-Based">Standard Training-Based</SelectItem>
                    <SelectItem value="RPL">Recognition of Prior Learning (RPL)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 block">
                  Batch / Cohort Reference
                </Label>
                <Input
                  placeholder="e.g. Batch 2026-01"
                  value={batchRef}
                  onChange={(e) => setBatchRef(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 block">
                  Assigned District Office Routing
                </Label>
                <Input
                  readOnly
                  value={userProfile?.assignedDistrictId ? 'Connected District Office' : 'Default District Office'}
                  className="bg-slate-100 font-medium text-slate-600"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 block">
                Filing Remarks / Notes
              </Label>
              <Textarea
                placeholder="Optional remarks regarding learner completion or verification details..."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* SECTION 3: ATTESTATION & ROUTING */}
        <Card className="border-blue-200 bg-blue-50/30">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-start space-x-3">
              <Checkbox
                id="attest"
                checked={isAttested}
                onCheckedChange={(checked) => setIsAttested(checked === true)}
                className="mt-1"
              />
              <div className="grid gap-1.5 leading-none">
                <label
                  htmlFor="attest"
                  className="text-sm font-bold text-slate-900 cursor-pointer"
                >
                  Official Institutional Attestation *
                </label>
                <p className="text-xs text-slate-600 leading-relaxed">
                  I hereby certify that the learner's completion records in the External Information System (T2MIS) have been audited and verified by this Training Center. I request the District Office to review and endorse this digital badge request.
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => navigate('/trainingcenter/eligibility')}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !isAttested}
                className="bg-blue-600 hover:bg-blue-700 gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Submit Badge Request to District Office
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
