import React from 'react';
import { useParams } from 'react-router-dom';
import { 
  Search, 
  ShieldCheck, 
  AlertCircle, 
  ExternalLink, 
  Award, 
  Building2, 
  Calendar, 
  User, 
  CheckCircle,
  FileText,
  Clock,
  XCircle,
  Link as LinkIcon
} from 'lucide-react';
import { collection, query, where, getDocs, getDoc, doc } from 'firebase/firestore';
import { db } from '@/src/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import Navbar from '@/src/components/layout/Navbar';
import { getBadgeColor } from '@/src/lib/badge-utils';

export default function Verification() {
  const { verificationId: urlVerificationId } = useParams();
  const [searchId, setSearchId] = React.useState('');
  const [firstName, setFirstName] = React.useState('');
  const [lastName, setLastName] = React.useState('');
  const [result, setResult] = React.useState<any>(null);
  const [isSearching, setIsSearching] = React.useState(false);
  const [error, setError] = React.useState('');
  const [isAutoVerified, setIsAutoVerified] = React.useState(false);

  const formatDate = (value: any) => {
    if (!value) return "N/A";
    if (value?.seconds) {
      return new Date(value.seconds * 1000).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }
    if (value instanceof Date) {
      return value.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }
    return String(value);
  };

  const getCustomStatusStyles = (status: string) => {
    const s = (status || 'Active').toLowerCase();
    
    if (['active', 'approved', 'published', 'earned', 'badge id generated', 'published to learner wallet', 'approved for publication', 'verified'].includes(s)) {
      return {
        bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        indicator: 'bg-emerald-500',
        label: 'Active & Verified',
        icon: ShieldCheck
      };
    } else if (s === 'expired') {
      return {
        bg: 'bg-amber-50 text-amber-700 border-amber-200',
        indicator: 'bg-amber-500',
        label: 'Credential Expired',
        icon: Clock
      };
    } else if (s === 'revoked' || s === 'suspended') {
      return {
        bg: 'bg-rose-50 text-rose-700 border-rose-200',
        indicator: 'bg-rose-500',
        label: 'Revoked Credential',
        icon: XCircle
      };
    } else {
      return {
        bg: 'bg-slate-50 text-slate-700 border-slate-200',
        indicator: 'bg-slate-500',
        label: status || 'Unknown Status',
        icon: AlertCircle
      };
    }
  };

  // Robust badge lookup that searches by verificationId, certificationId, badgeId, and document ID fallback!
  const getBadgeDetails = async (targetId: string): Promise<any> => {
    const rawId = targetId.trim();
    if (!rawId) return null;
    const uppercaseId = rawId.toUpperCase();
    const path = 'issuedBadges';

    const queries = [
      query(collection(db, path), where('verificationId', '==', rawId)),
      query(collection(db, path), where('verificationId', '==', uppercaseId)),
      query(collection(db, path), where('certificationId', '==', rawId)),
      query(collection(db, path), where('certificationId', '==', uppercaseId)),
      query(collection(db, path), where('badgeId', '==', rawId)),
      query(collection(db, path), where('badgeId', '==', uppercaseId))
    ];

    try {
      const results = await Promise.all(queries.map(q => getDocs(q)));
      for (const snap of results) {
        if (!snap.empty) {
          return { id: snap.docs[0].id, ...snap.docs[0].data() };
        }
      }
    } catch (e) {
      console.warn("Query issuedBadges check failed:", e);
    }

    // Direct ID fallback lookup in issuedBadges
    try {
      const directSnap = await getDoc(doc(db, path, rawId));
      if (directSnap.exists()) {
        return { id: directSnap.id, ...directSnap.data() };
      }
    } catch (e) {
      console.warn("Direct lookup check failed or skipped:", e);
    }

    // fallback lookup inside badgeRequests
    try {
      const requestSnap = await getDoc(doc(db, 'badgeRequests', rawId));
      if (requestSnap.exists()) {
        const reqData = requestSnap.data();
        const bData: any = {
          id: requestSnap.id,
          badgeTemplateId: reqData.badgeTemplateId,
          badgeTemplateName: reqData.badgeTemplateName || reqData.programTitle || '',
          badgeRequestId: requestSnap.id,
          programTitle: reqData.programTitle || reqData.badgeTemplateName || '',
          badgeType: reqData.badgeType || 'Proficient',
          trainingCenterId: reqData.trainingCenterId || '',
          trainingCenterName: reqData.trainingCenterName || '',
          districtOfficeId: reqData.districtOfficeId || '',
          evidenceUrl: reqData.evidenceUrl || '',
          qualificationName: reqData.qualificationName || reqData.programTitle || '',
          qualificationCode: reqData.qualificationCode || '',
          status: ['Approved', 'Badge ID Generated'].includes(reqData.status) ? 'Active' : reqData.status || 'Pending Review',
          description: reqData.templateDetails?.description || reqData.description || 'Holds formal recognition of skills and relevant competency certifications standard under TESDA code regulations.',
          criteria: reqData.templateDetails?.criteria || reqData.criteria || '',
          alignment: reqData.templateDetails?.alignment || reqData.alignment || '',
          badgeId: reqData.badgeId || reqData.badgeTemplateId || '',
          verificationId: reqData.verificationId || requestSnap.id,
          issueDate: reqData.submittedAt || reqData.createdAt || null
        };

        if (reqData.learnerIds && reqData.learnerIds.length > 0) {
          const lDoc = await getDoc(doc(db, 'learners', reqData.learnerIds[0]));
          if (lDoc.exists()) {
            const lData = lDoc.data();
            bData.learnerName = `${lData.firstName} ${lData.lastName}`;
            bData.learnerEmail = lData.email;
          } else {
            const uDoc = await getDoc(doc(db, 'users', reqData.learnerIds[0]));
            if (uDoc.exists()) {
              const uData = uDoc.data();
              bData.learnerName = uData.name || uData.displayName || "Learner Candidate";
              bData.learnerEmail = uData.email;
            } else {
              bData.learnerName = "Learner Candidate";
            }
          }
        } else {
          bData.learnerName = "Learner Candidate";
        }

        return bData;
      }
    } catch (err) {
      console.warn("Direct lookup check failed or skipped in badgeRequests:", err);
    }

    // fallback query inside badgeRequests by parameters
    const reqQueries = [
      query(collection(db, 'badgeRequests'), where('badgeId', '==', rawId)),
      query(collection(db, 'badgeRequests'), where('badgeId', '==', uppercaseId)),
      query(collection(db, 'badgeRequests'), where('verificationId', '==', rawId)),
      query(collection(db, 'badgeRequests'), where('verificationId', '==', uppercaseId))
    ];
    
    try {
      const reqResults = await Promise.all(reqQueries.map(q => getDocs(q)));
      for (const snap of reqResults) {
        if (!snap.empty) {
          const reqDoc = snap.docs[0];
          const reqData = reqDoc.data();
          const bData: any = {
            id: reqDoc.id,
            badgeTemplateId: reqData.badgeTemplateId,
            badgeTemplateName: reqData.badgeTemplateName || reqData.programTitle || '',
            badgeRequestId: reqDoc.id,
            programTitle: reqData.programTitle || reqData.badgeTemplateName || '',
            badgeType: reqData.badgeType || 'Proficient',
            trainingCenterId: reqData.trainingCenterId || '',
            trainingCenterName: reqData.trainingCenterName || '',
            districtOfficeId: reqData.districtOfficeId || '',
            evidenceUrl: reqData.evidenceUrl || '',
            qualificationName: reqData.qualificationName || reqData.programTitle || '',
            qualificationCode: reqData.qualificationCode || '',
            status: ['Approved', 'Badge ID Generated'].includes(reqData.status) ? 'Active' : reqData.status || 'Pending Review',
            description: reqData.templateDetails?.description || reqData.description || 'Holds formal recognition of skills and relevant competency certifications standard under TESDA code regulations.',
            criteria: reqData.templateDetails?.criteria || reqData.criteria || '',
            alignment: reqData.templateDetails?.alignment || reqData.alignment || '',
            badgeId: reqData.badgeId || reqData.badgeTemplateId || '',
            verificationId: reqData.verificationId || reqDoc.id,
            issueDate: reqData.submittedAt || reqData.createdAt || null
          };
          
          if (reqData.learnerIds && reqData.learnerIds.length > 0) {
            const lDoc = await getDoc(doc(db, 'learners', reqData.learnerIds[0]));
            if (lDoc.exists()) {
              const lData = lDoc.data();
              bData.learnerName = `${lData.firstName} ${lData.lastName}`;
              bData.learnerEmail = lData.email;
            } else {
              const uDoc = await getDoc(doc(db, 'users', reqData.learnerIds[0]));
              if (uDoc.exists()) {
                const uData = uDoc.data();
                bData.learnerName = uData.name || uData.displayName || "Learner Candidate";
                bData.learnerEmail = uData.email;
              } else {
                bData.learnerName = "Learner Candidate";
              }
            }
          } else {
            bData.learnerName = "Learner Candidate";
          }
          return bData;
        }
      }
    } catch (e) {
      console.warn("Query badgeRequests search failed:", e);
    }

    return null;
  };

  // Auto-verify if verification ID comes from URl / QR code
  React.useEffect(() => {
    if (!urlVerificationId) return;

    const autoVerify = async () => {
      setIsSearching(true);
      setError('');
      setResult(null);
      setIsAutoVerified(true);
      setSearchId(urlVerificationId);

      try {
        const badge = await getBadgeDetails(urlVerificationId);
        if (!badge) {
          setError(`No matching registered badge found for Verification ID/Badge ID: "${urlVerificationId}".`);
        } else {
          setResult(badge);
        }
      } catch (err) {
        console.error("Auto verify error:", err);
        setError("Error connecting to the badge verification node database.");
      } finally {
        setIsSearching(false);
      }
    };

    autoVerify();
  }, [urlVerificationId]);

  // Manual verification handler
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSearching(true);
    setError('');
    setResult(null);
    setIsAutoVerified(false);

    if (!searchId.trim() || !firstName.trim() || !lastName.trim()) {
      setError('Please fill in all manual verification fields.');
      setIsSearching(false);
      return;
    }

    try {
      const badge = await getBadgeDetails(searchId);
      if (!badge) {
        setError('No matching badge found. Please check the Verification ID.');
      } else {
        const holderName = (badge.learnerName || '').toLowerCase();
        
        // Match both first name and last name inside the holder's full learnerName
        const matchesFirst = holderName.includes(firstName.trim().toLowerCase());
        const matchesLast = holderName.includes(lastName.trim().toLowerCase());

        if (matchesFirst && matchesLast) {
          setResult(badge);
        } else {
          setError('Verification ID found, but the registered learner name does not match the names provided.');
        }
      }
    } catch (err) {
      console.error("Manual verification search error:", err);
      setError("An error occurred during badge inquiry. Please try again.");
    } finally {
      setIsSearching(false);
    }
  };

  const statusStyles = result ? getCustomStatusStyles(result.status) : null;
  const StatusIcon = statusStyles?.icon || ShieldCheck;

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      
      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-extrabold text-slate-900 mb-3 tracking-tight">
            Official Badge Registry & Verification Node
          </h1>
          <p className="text-slate-600 max-w-xl mx-auto text-sm leading-relaxed">
            Verify the official authenticity, validity periods, and credential ownership details of any digital badges issued by TESDA.
          </p>
        </div>

        {/* Manual Verification Form Card */}
        <Card className="mb-8 border-slate-200 shadow-sm bg-white">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2 text-slate-800">
              <ShieldCheck className="h-5 w-5 text-blue-600" />
              Inquire Credential Status
            </CardTitle>
            <CardDescription>
              Provide the corresponding unique credentials to establish safe and authenticated verification.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Learner First Name</label>
                  <Input 
                    placeholder="e.g. Juan" 
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required={!urlVerificationId}
                    className="border-slate-200 focus:ring-blue-500 bg-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Learner Last Name</label>
                  <Input 
                    placeholder="e.g. Dela Cruz" 
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required={!urlVerificationId}
                    className="border-slate-200 focus:ring-blue-500 bg-white"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Verification ID or Badge ID Reference</label>
                <div className="relative">
                  <Input 
                    placeholder="e.g. V26-..." 
                    className="pl-10 border-slate-200 focus:ring-blue-500 bg-white font-mono"
                    value={searchId}
                    onChange={(e) => setSearchId(e.target.value)}
                    required
                  />
                  <Search className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
                </div>
              </div>
              <Button 
                type="submit" 
                className="w-full bg-blue-600 hover:bg-blue-700 h-11 text-base font-bold text-white transition-all shadow-sm"
                disabled={isSearching}
              >
                {isSearching ? 'Accessing Secure Registrar...' : 'Verify Credential Authenticity'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {error && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-start gap-3 text-rose-800 mb-8 shadow-sm">
            <AlertCircle className="h-5 w-5 mt-0.5 text-rose-600 shrink-0" />
            <div className="space-y-1">
              <p className="text-sm font-bold">Verification Reject</p>
              <p className="text-xs font-medium text-rose-700">{error}</p>
            </div>
          </div>
        )}

        {result && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Verification Status Alert Header */}
            <div className={`border rounded-xl p-4 flex items-center justify-between gap-3 shadow-sm ${statusStyles?.bg}`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full bg-white shadow-sm shrink-0`}>
                  <StatusIcon className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-extrabold text-sm">{statusStyles?.label}</p>
                  <p className="text-xs opacity-85">
                    {isAutoVerified
                      ? "Automatically verified via high-trust secure QR code scan link."
                      : "Verified match with registered candidate roster database."}
                  </p>
                </div>
              </div>
              <Badge className="font-bold border-none py-1 px-3 bg-white text-slate-900 shadow-sm capitalize shrink-0 font-mono text-xs">
                {result.status || 'Active'}
              </Badge>
            </div>

            {/* Comprehensive Verified Badge Representation Card */}
            <Card className="border-slate-200 shadow-md overflow-hidden bg-white">
              {/* Card Header with Badge Visual & Designation */}
              <div className="bg-slate-900 p-8 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-slate-800">
                <div className="flex items-center gap-5">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center border-4 border-white/15 shadow-sm ${getBadgeColor(result.badgeType)} shrink-0`}>
                    <Award className="h-8 w-8" />
                  </div>
                  <div>
                    <Badge className="mb-1.5 bg-blue-500 hover:bg-blue-500 text-white font-bold border-none text-[10px] uppercase tracking-wider">
                      {result.badgeType} Level
                    </Badge>
                    <h2 className="text-xl font-bold font-sans tracking-tight leading-snug">
                      {result.programTitle || result.badgeTemplateName || result.badgeName || result.qualificationName || "TESDA Registered Program"}
                    </h2>
                    <p className="text-slate-400 text-xs mt-1 font-mono">
                      Badge ID: <span className="text-slate-200 font-bold">{result.badgeId || "N/A"}</span>
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Verification Code</span>
                  <span className="font-mono text-xs font-bold bg-white/10 px-3 py-1.5 rounded-lg border border-white/5 text-blue-200">
                    {result.verificationId}
                  </span>
                </div>
              </div>

              {/* Employer-Safe Clean Card Content */}
              <CardContent className="p-8">
                <div className="grid md:grid-cols-3 gap-8">
                  <div className="md:col-span-2 space-y-6">
                    {/* Badge Description */}
                    <div>
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 font-mono">Scope & Competency Standards</h3>
                      <p className="text-slate-700 text-sm leading-relaxed">
                        {result.description || "Holds formal recognition of relevant skills and standard competencies issued in compliance with the Philippines National Certification guidelines."}
                      </p>
                    </div>

                    {/* Criteria or Alignment */}
                    {result.criteria && (
                      <div>
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 font-mono">Issuance Criteria</h3>
                        <p className="text-slate-600 text-xs bg-slate-50/70 p-3 rounded-lg border border-slate-100 italic leading-relaxed">
                          {result.criteria}
                        </p>
                      </div>
                    )}

                    {/* Temporal/Date Information */}
                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div className="space-y-1">
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Official Issuance Date</h4>
                        <div className="flex items-center gap-2 text-slate-800 text-sm font-semibold">
                          <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
                          {formatDate(result.issueDate)}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Credential Expiration</h4>
                        <div className="flex items-center gap-2 text-slate-800 text-sm font-semibold">
                          <Clock className="h-4 w-4 text-slate-400 shrink-0" />
                          {result.expiryDate ? formatDate(result.expiryDate) : "Lifetime Validity / No Expiry"}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Employer Safe Metadata Panel (PII Sanitized - No email, phone, or private data shown publicly) */}
                  <div className="space-y-6">
                    {/* Sanitized Holder Box */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 font-mono">Sanitized Holder Details</h3>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold uppercase shrink-0 shadow-inner">
                          {(result.learnerName || result.badgeHolder || "L").charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 text-sm leading-tight">
                            {result.learnerName || result.badgeHolder || "Learner Candidate"}
                          </p>
                          <span className="text-[9px] text-emerald-600 font-medium tracking-wider flex items-center gap-1 mt-0.5">
                            <CheckCircle className="h-2.5 w-2.5" /> Identity Confirmed
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Issuer Details */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 font-mono">Institution Node</h3>
                      <div className="flex items-start gap-3">
                        <Building2 className="h-5 w-5 text-slate-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-slate-900 text-sm leading-tight">
                            {result.trainingCenterName || result.issuer || "TESDA Authorised Center"}
                          </p>
                          <p className="text-[10px] text-slate-500 mt-1 font-mono">
                            District Code: {result.districtOfficeId || "CORREG"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Download/Evidence Resources */}
                    {result.evidenceUrl && (
                      <div className="pt-2">
                        <a 
                          href={result.evidenceUrl} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 px-4 rounded-lg text-xs tracking-wide transition-all shadow-sm"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          Review Evidence Submission
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {result.qualificationCode && (
                  <>
                    <Separator className="my-6 border-slate-100" />
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-slate-400" />
                      <span className="text-xs font-semibold text-slate-500 font-mono">菲律宾TESDA Registration Classification Code: </span>
                      <Badge variant="outline" className="font-mono text-[10px] uppercase font-bold text-slate-600 border-slate-200">
                        {result.qualificationCode}
                      </Badge>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
