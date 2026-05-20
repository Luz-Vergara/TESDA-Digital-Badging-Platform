import React, { useState, useEffect } from 'react';
import { Search, Building2, MapPin, Award, ArrowRight, Filter } from 'lucide-react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/src/lib/firebase';
import { useFirebase } from '@/src/lib/FirebaseProvider';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { ProgramOffering, Enrollment } from '@/src/types';

export default function AvailablePrograms() {
  const { user, userProfile } = useFirebase();
  const [offerings, setOfferings] = useState<ProgramOffering[]>([]);
  const [myEnrollments, setMyEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [selectedProgram, setSelectedProgram] = useState<ProgramOffering | null>(null);
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Show all active programs
    const offPath = 'programOfferings';
    const q = query(collection(db, offPath), where('status', '==', 'Active'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setOfferings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ProgramOffering[]);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, offPath);
      setLoading(false);
    });

    if (user) {
      const enrPath = 'enrollments';
      const enrQuery = query(collection(db, enrPath), where('learnerId', '==', user.uid));
      const unsubscribeEnr = onSnapshot(enrQuery, (snapshot) => {
        setMyEnrollments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Enrollment[]);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, enrPath);
      });
      return () => { unsubscribe(); unsubscribeEnr(); };
    }

    return () => unsubscribe();
  }, [user]);

  const handleApply = async () => {
    if (!user || !userProfile || !selectedProgram) return;

    setIsSubmitting(true);
    try {
      const payload: Partial<Enrollment> & { badgeTemplateId?: string, badgeType?: string, programTitle?: string } = {
        learnerId: user.uid,
        learnerName: userProfile.name,
        learnerEmail: user.email || '',
        trainingCenterId: selectedProgram.trainingCenterId,
        programOfferingId: selectedProgram.id,
        badgeTemplateId: selectedProgram.badgeTemplateId || '',
        badgeType: selectedProgram.badgeType || '',
        programTitle: selectedProgram.programTitle || '',
        programBatchId: '', // Learner just applies to the program
        enrollmentStatus: 'Applied',
        completionStatus: 'Not Started',
        dateApplied: serverTimestamp() as any,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await addDoc(collection(db, 'enrollments'), payload);
      setIsApplyModalOpen(false);
      alert("Application submitted successfully!");
    } catch (error) {
       handleFirestoreError(error, OperationType.CREATE, 'enrollments');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredOfferings = offerings.filter(o => 
    o.programTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
    o.trainingCenterName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) return <div className="p-8 text-center">Scanning available programs...</div>;

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Available Programs</h1>
          <p className="text-slate-500">Explore digital credentials and training programs from certified centers.</p>
        </div>
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Search qualifications or tools..." 
            className="pl-10 h-11 border-slate-200 shadow-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredOfferings.map((offering) => {
          const enrollment = myEnrollments.find(e => e.programOfferingId === offering.id);
          return (
            <Card key={offering.id} className="group hover:shadow-xl transition-all duration-300 border-slate-200 overflow-hidden flex flex-col">
              <div className="h-2 bg-blue-600" />
              <CardHeader>
                <div className="flex justify-between items-start mb-2">
                  <Badge variant="secondary" className="text-[10px] font-bold tracking-widest uppercase py-0.5">
                    {offering.programType}
                  </Badge>
                  <Award className={cn(
                    "h-5 w-5",
                    offering.badgeType === 'Master' ? "text-purple-500" :
                    offering.badgeType === 'Expert' ? "text-emerald-500" : "text-blue-500"
                  )} />
                </div>
                <CardTitle className="text-lg font-bold group-hover:text-blue-600 transition-colors line-clamp-2">
                  {offering.programTitle}
                </CardTitle>
                <p className="text-xs font-mono text-slate-400 uppercase">{offering.qualificationCode}</p>
              </CardHeader>
              <CardContent className="flex-1 space-y-4">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Building2 className="h-4 w-4 text-slate-400" />
                  <span className="font-medium">{offering.trainingCenterName}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <MapPin className="h-4 w-4 text-slate-400" />
                  <span>{offering.deliveryMode} Delivery</span>
                </div>
              </CardContent>
              <CardFooter className="pt-0 pb-6 pr-6 pl-6">
                {!enrollment ? (
                  <Button 
                    onClick={() => { setSelectedProgram(offering); setIsApplyModalOpen(true); }}
                    className="w-full bg-blue-600 hover:bg-blue-700 font-bold gap-2"
                  >
                    Apply Now <ArrowRight className="h-4 w-4" />
                  </Button>
                ) : enrollment.enrollmentStatus === 'Applied' ? (
                  <Button disabled className="w-full bg-amber-50 text-amber-700 border border-amber-200 font-bold">
                    Application Pending
                  </Button>
                ) : enrollment.enrollmentStatus === 'Enrolled' ? (
                  <Button variant="outline" className="w-full text-emerald-600 border-emerald-200 hover:bg-emerald-50 font-bold cursor-default">
                    Enrolled • View in My Enrollments
                  </Button>
                ) : enrollment.enrollmentStatus === 'Completed' ? (
                  <Button disabled className="w-full bg-blue-50 text-blue-700 border border-blue-200 font-bold">
                    Completed
                  </Button>
                ) : enrollment.enrollmentStatus === 'Rejected' ? (
                  <div className="w-full space-y-2">
                    <div className="text-center text-xs text-rose-600 font-semibold">Previous Application Rejected</div>
                    <Button 
                      onClick={() => { setSelectedProgram(offering); setIsApplyModalOpen(true); }}
                      className="w-full bg-blue-600 hover:bg-blue-700 font-bold gap-2"
                    >
                      Re-apply Now <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <Button 
                    onClick={() => { setSelectedProgram(offering); setIsApplyModalOpen(true); }}
                    className="w-full bg-blue-600 hover:bg-blue-700 font-bold gap-2"
                  >
                    Apply Now <ArrowRight className="h-4 w-4" />
                  </Button>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>

      <Dialog open={isApplyModalOpen} onOpenChange={setIsApplyModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apply for Training Program</DialogTitle>
            <DialogDescription>
              Submit your expression of interest to {selectedProgram?.trainingCenterName}
            </DialogDescription>
          </DialogHeader>
          <div className="py-6 space-y-4">
            <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg">
              <h4 className="font-bold text-blue-900 text-sm mb-1">{selectedProgram?.programTitle}</h4>
              <p className="text-xs text-blue-700">{selectedProgram?.programType} • {selectedProgram?.badgeType} Level Badge</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-slate-600 leading-relaxed">
                By clicking "Submit Application", your TESDA profile and contact details will be shared with the Training Center for review.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsApplyModalOpen(false)}>Cancel</Button>
            <Button onClick={handleApply} disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700">
              {isSubmitting ? 'Submitting...' : 'Confirm Application'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
