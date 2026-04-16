import React from 'react';
import { Search, ShieldCheck, AlertCircle, ExternalLink, Award, Building2, Calendar, User, CheckCircle } from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/src/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import Navbar from '@/src/components/layout/Navbar';
import { getBadgeColor, getStatusColor } from '@/src/lib/badge-utils';

export default function Verification() {
  const [searchId, setSearchId] = React.useState('');
  const [firstName, setFirstName] = React.useState('');
  const [lastName, setLastName] = React.useState('');
  const [result, setResult] = React.useState<any>(null);
  const [isSearching, setIsSearching] = React.useState(false);
  const [error, setError] = React.useState('');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSearching(true);
    setError('');
    setResult(null);

    const path = 'issuedBadges';
    try {
      const q = query(
        collection(db, path),
        where('verificationId', '==', searchId)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        setError('No matching badge found. Please check the Verification ID.');
      } else {
        const badgeData = querySnapshot.docs[0].data();
        const holderName = badgeData.learnerName.toLowerCase();
        
        // Simple name verification
        if (holderName.includes(firstName.toLowerCase()) && holderName.includes(lastName.toLowerCase())) {
          setResult({ id: querySnapshot.docs[0].id, ...badgeData });
        } else {
          setError('Verification ID found, but learner name does not match.');
        }
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, path);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      
      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-slate-900 mb-4">Official Badge Verification</h1>
          <p className="text-slate-600">Enter the credential details below to verify the authenticity of a TESDA digital badge.</p>
        </div>

        <Card className="mb-8 border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Verification Details</CardTitle>
            <CardDescription>All fields are required for secure verification.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Learner First Name</label>
                  <Input 
                    placeholder="e.g. Juan" 
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Learner Last Name</label>
                  <Input 
                    placeholder="e.g. Dela Cruz" 
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Badge ID / Verification ID</label>
                <div className="relative">
                  <Input 
                    placeholder="e.g. V-CSS-2023-001" 
                    className="pl-10"
                    value={searchId}
                    onChange={(e) => setSearchId(e.target.value)}
                    required
                  />
                  <Search className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
                </div>
              </div>
              <Button 
                type="submit" 
                className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-lg"
                disabled={isSearching}
              >
                {isSearching ? 'Verifying...' : 'Verify Credential'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {error && (
          <div className="bg-rose-50 border border-rose-200 rounded-lg p-4 flex items-start gap-3 text-rose-800 mb-8">
            <AlertCircle className="h-5 w-5 mt-0.5" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {result && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-center gap-3 text-emerald-800">
              <ShieldCheck className="h-6 w-6" />
              <p className="font-bold">Credential Verified Successfully</p>
            </div>

            <Card className="border-slate-200 shadow-md overflow-hidden">
              <div className="bg-slate-900 p-8 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex items-center gap-6">
                  <div className={`w-20 h-20 rounded-full flex items-center justify-center border-4 border-white/20 ${getBadgeColor(result.badgeType)}`}>
                    <Award className="h-10 w-10" />
                  </div>
                  <div>
                    <Badge className="mb-2 bg-blue-500 hover:bg-blue-500 text-white border-none">
                      {result.badgeType} Badge
                    </Badge>
                    <h2 className="text-2xl font-bold leading-tight">{result.programName}</h2>
                    <p className="text-slate-400 text-sm mt-1">Verification ID: {result.verificationId}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full backdrop-blur-sm">
                  <div className={`w-2.5 h-2.5 rounded-full ${getStatusColor(result.status)}`} />
                  <span className="text-sm font-bold uppercase tracking-wider">{result.status}</span>
                </div>
              </div>

              <CardContent className="p-8">
                <div className="grid md:grid-cols-3 gap-8">
                  <div className="md:col-span-2 space-y-8">
                    <div>
                      <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">Description</h3>
                      <p className="text-slate-700 leading-relaxed">{result.description}</p>
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">Criteria & Competencies</h3>
                      <ul className="space-y-2">
                        {result.standards.map((s: string) => (
                          <li key={s} className="flex items-start gap-2 text-slate-700">
                            <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0" />
                            <span>{s}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">Issuance Date</h3>
                        <div className="flex items-center gap-2 text-slate-900 font-medium">
                          <Calendar className="h-4 w-4 text-slate-400" />
                          {result.issuanceDate}
                        </div>
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">Validity</h3>
                        <div className="flex items-center gap-2 text-slate-900 font-medium">
                          <ShieldCheck className="h-4 w-4 text-slate-400" />
                          {result.validity}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-8">
                    <div className="bg-slate-50 p-6 rounded-xl border border-slate-100">
                      <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Badge Holder</h3>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold">
                          {result.badgeHolder.charAt(0)}
                        </div>
                        <p className="font-bold text-slate-900">{result.badgeHolder}</p>
                      </div>
                    </div>

                    <div className="bg-slate-50 p-6 rounded-xl border border-slate-100">
                      <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Issuer Details</h3>
                      <div className="flex items-center gap-3 mb-4">
                        <Building2 className="h-5 w-5 text-slate-400" />
                        <p className="font-bold text-slate-900">{result.issuer}</p>
                      </div>
                      <Button variant="outline" size="sm" className="w-full gap-2">
                        View Issuer Profile
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </div>

                    <div className="pt-4">
                      <Button className="w-full bg-slate-900 hover:bg-slate-800 gap-2">
                        Download Certificate
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                <Separator className="my-8" />

                <div className="flex flex-wrap gap-2">
                  {result.tags.map((tag: string) => (
                    <Badge key={tag} variant="secondary" className="bg-slate-100 text-slate-600 hover:bg-slate-200">
                      #{tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
