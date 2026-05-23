import React, { useState, useEffect } from 'react';
import { Plus, Search, Layers, Edit2, Trash2, CheckCircle2, XCircle } from 'lucide-react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  doc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/src/lib/firebase';
import { useFirebase } from '@/src/lib/FirebaseProvider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProgramOffering, BadgeTemplate } from '@/src/types';

export default function ProgramOfferings() {
  const { user, userProfile, isAuthReady } = useFirebase();
  const [programs, setPrograms] = useState<ProgramOffering[]>([]);
  const [templates, setTemplates] = useState<BadgeTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');

  const [formData, setFormData] = useState({
    programTitle: '',
    programType: 'Full Qualification' as any,
    qualificationName: '',
    qualificationCode: '',
    badgeTemplateId: '',
    badgeType: 'Proficient' as any,
    deliveryMode: 'Blended' as any,
    status: 'Active' as any
  });

  useEffect(() => {
    if (!isAuthReady || !user) return;

    const path = 'programOfferings';
    // Admins see all programs, Training Centers see only their own
    const q = userProfile?.role === 'Admin' 
      ? query(collection(db, path))
      : query(collection(db, path), where('trainingCenterId', '==', user.uid));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPrograms(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ProgramOffering[]);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
      setLoading(false);
    });

    const tempPath = 'badgeTemplates';
    const templatesQuery = query(collection(db, tempPath), where('status', 'in', ['Approved', 'Active']));
    const unsubscribeTemplates = onSnapshot(templatesQuery, (snapshot) => {
      setTemplates(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as BadgeTemplate[]);
    }, (error) => {
       handleFirestoreError(error, OperationType.LIST, tempPath);
    });

    return () => {
      unsubscribe();
      unsubscribeTemplates();
    };
  }, [user, userProfile, isAuthReady]);

  const handleTemplateChange = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setFormData({
        ...formData,
        badgeTemplateId: templateId,
        badgeTemplateName: template.badgeName,
        badgeType: template.badgeType,
        qualificationName: template.qualificationName,
        qualificationCode: template.qualificationCode,
        programType: template.credentialLevel === 'Unit of Competency' ? 'Unit of Competency' : 'Full Qualification',
        programTitle: template.badgeName // Default title to badge name
      });
    } else {
      setFormData({ ...formData, badgeTemplateId: templateId, badgeTemplateName: '' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !userProfile) return;
    if (!formData.badgeTemplateId) {
      alert("Please select a Badge Template.");
      return;
    }

    setIsSubmitting(true);
    try {
      const template = templates.find(t => t.id === formData.badgeTemplateId);
      const payload = {
        ...formData,
        badgeTemplateName: template?.badgeName || formData.badgeTemplateName || '',
        trainingCenterId: user.uid,
        trainingCenterName: userProfile.office || userProfile.name,
        updatedAt: serverTimestamp(),
      };

      if (editingId) {
        await updateDoc(doc(db, 'programOfferings', editingId), payload);
      } else {
        await addDoc(collection(db, 'programOfferings'), {
          ...payload,
          createdAt: serverTimestamp()
        });
      }

      setIsModalOpen(false);
      setEditingId(null);
      resetForm();
    } catch (error) {
      handleFirestoreError(error, editingId ? OperationType.UPDATE : OperationType.CREATE, 'programOfferings');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      programTitle: '',
      programType: 'Full Qualification',
      qualificationName: '',
      qualificationCode: '',
      badgeTemplateId: '',
      badgeType: 'Proficient',
      deliveryMode: 'Blended',
      status: 'Active'
    });
  };

  const handleEdit = (program: ProgramOffering) => {
    setEditingId(program.id);
    setFormData({
      programTitle: program.programTitle,
      programType: program.programType,
      qualificationName: program.qualificationName,
      qualificationCode: program.qualificationCode,
      badgeTemplateId: program.badgeTemplateId,
      badgeType: program.badgeType,
      deliveryMode: program.deliveryMode,
      status: program.status
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      // Auto-reset after 3 seconds
      setTimeout(() => setConfirmDeleteId(null), 3000);
      return;
    }

    setDeletingId(id);
    console.log("Attempting to delete program offering:", id);
    try {
      await deleteDoc(doc(db, 'programOfferings', id));
      console.log("Successfully deleted program offering:", id);
      setConfirmDeleteId(null);
    } catch (error: any) {
      console.error("Delete failed:", error);
      const errorMessage = error?.message || String(error);
      alert(`Failed to delete program offering: ${errorMessage}`);
      handleFirestoreError(error, OperationType.DELETE, 'programOfferings');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) return <div className="p-8 text-center">Loading programs...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Programs Offered</h1>
          <p className="text-slate-500">Manage qualifications and UCs your center offers.</p>
        </div>
        <Button onClick={() => { resetForm(); setEditingId(null); setIsModalOpen(true); }} className="bg-blue-600 hover:bg-blue-700 gap-2">
          <Plus className="h-4 w-4" /> Add Program Offering
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg">Offerings Directory</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Search programs..." 
                className="pl-9 h-9" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Program Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Badge Level</TableHead>
                <TableHead>Delivery</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {programs.filter(p => 
                p.programTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
                p.qualificationCode?.toLowerCase().includes(searchQuery.toLowerCase())
              ).map((program) => (
                <TableRow key={program.id}>
                  <TableCell>
                    <div className="font-bold text-slate-900">{program.programTitle}</div>
                    <div className="text-xs text-slate-500">{program.qualificationCode}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px]">{program.programType}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={
                      program.badgeType === 'Master' ? 'bg-purple-100 text-purple-700' :
                      program.badgeType === 'Skilled' ? 'bg-blue-100 text-blue-700' :
                      program.badgeType === 'Expert' ? 'bg-emerald-100 text-emerald-700' :
                      'bg-slate-100 text-slate-700'
                    }>{program.badgeType}</Badge>
                  </TableCell>
                  <TableCell className="text-sm">{program.deliveryMode}</TableCell>
                  <TableCell>
                    <Badge variant={program.status === 'Active' ? 'default' : 'secondary'} className={program.status === 'Active' ? 'bg-emerald-500' : ''}>
                      {program.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(program)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className={confirmDeleteId === program.id ? "text-white bg-rose-600 hover:bg-rose-700" : "text-rose-600 hover:text-rose-700 hover:bg-rose-50"}
                        onClick={() => handleDelete(program.id)}
                        disabled={deletingId === program.id}
                      >
                        {deletingId === program.id ? (
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        ) : confirmDeleteId === program.id ? (
                          <span className="text-[10px] font-bold px-1">Confirm?</span>
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {programs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-slate-500">
                    No programs offered yet. Click "Add Program Offering" to start.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{editingId ? 'Edit Program Offering' : 'Add Program Offering'}</DialogTitle>
              <DialogDescription>Define the details and badge alignment for this offering.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Link to Badge Template</Label>
                <Select value={formData.badgeTemplateId} onValueChange={handleTemplateChange}>
                  <SelectTrigger><SelectValue placeholder="Select template..." /></SelectTrigger>
                  <SelectContent>
                    {templates.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.badgeName} ({t.badgeType})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="programTitle">Program Offering Title</Label>
                <Input 
                  id="programTitle" 
                  value={formData.programTitle}
                  onChange={(e) => setFormData({...formData, programTitle: e.target.value})}
                  required
                  placeholder="e.g., Computer Systems Servicing NC II - Batch 2024"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Program Type</Label>
                  <Input value={formData.programType} disabled className="bg-slate-50" />
                </div>
                <div className="grid gap-2">
                  <Label>Delivery Mode</Label>
                  <Select value={formData.deliveryMode} onValueChange={(v) => setFormData({...formData, deliveryMode: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Institution-Based">Institution-Based</SelectItem>
                      <SelectItem value="Enterprise-Based">Enterprise-Based</SelectItem>
                      <SelectItem value="Online">Online</SelectItem>
                      <SelectItem value="Blended">Blended</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="qualificationCode">Qualification Code</Label>
                  <Input 
                    id="qualificationCode" 
                    value={formData.qualificationCode}
                    disabled
                    className="bg-slate-50"
                  />
                </div>
                <div className="grid gap-2 text-slate-500">
                  <Label>Badge Type</Label>
                  <Input value={formData.badgeType} disabled className="bg-slate-50" />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({...formData, status: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Draft">Draft</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                    <SelectItem value="Archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save Changes'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
