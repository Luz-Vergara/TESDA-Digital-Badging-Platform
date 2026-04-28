import React, { useEffect, useState } from 'react';
import { 
  Award, 
  Plus, 
  Search, 
  Filter, 
  Edit2, 
  Trash2,
  MoreVertical,
  BookOpen,
  Calendar,
  Tag,
  CheckCircle2,
  Archive,
  FileText,
  Settings
} from 'lucide-react';
import { 
  collection, 
  query, 
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
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from '@/components/ui/textarea';
import { BadgeTemplate } from '@/src/types';

export default function BadgeTemplates() {
  const { isAuthReady } = useFirebase();
  const [templates, setTemplates] = useState<BadgeTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<BadgeTemplate | null>(null);
  const [templateToDelete, setTemplateToDelete] = useState<BadgeTemplate | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    programName: '',
    badgeType: 'Proficient' as BadgeTemplate['badgeType'],
    description: '',
    criteria: '',
    validityMonths: 36,
    alignment: 'TESDA Training Standard',
    tags: '',
    issuableBy: 'TrainingCenter' as 'TrainingCenter' | 'AssessmentCenter',
    requiresApproval: true
  });

  useEffect(() => {
    if (!isAuthReady) return;

    const unsubTemplates = onSnapshot(collection(db, 'badgeTemplates'), (snapshot) => {
      const templateData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as BadgeTemplate[];
      setTemplates(templateData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'badgeTemplates');
    });

    return () => unsubTemplates();
  }, [isAuthReady]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const templateData = {
        ...formData,
        tags: formData.tags.split(',').map(t => t.trim()),
        issuableBy: [formData.issuableBy],
        status: 'Active',
        updatedAt: serverTimestamp()
      };
      
      if (editingTemplate) {
        await updateDoc(doc(db, 'badgeTemplates', editingTemplate.id!), templateData);
        
        await addDoc(collection(db, 'auditLogs'), {
          action: `Updated Badge Template: ${formData.programName}`,
          userName: 'Central Admin',
          timestamp: serverTimestamp(),
          details: `Type: ${formData.badgeType}`
        });
      } else {
        const newTemplate = {
          ...templateData,
          createdAt: serverTimestamp()
        };
        await addDoc(collection(db, 'badgeTemplates'), newTemplate);
        
        await addDoc(collection(db, 'auditLogs'), {
          action: `Created Badge Template: ${formData.programName}`,
          userName: 'Central Admin',
          timestamp: serverTimestamp(),
          details: `Type: ${formData.badgeType}`
        });
      }

      setIsModalOpen(false);
      setEditingTemplate(null);
      resetForm();
    } catch (error) {
      handleFirestoreError(error, editingTemplate ? OperationType.UPDATE : OperationType.CREATE, 'badgeTemplates');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      programName: '',
      badgeType: 'Proficient',
      description: '',
      criteria: '',
      validityMonths: 36,
      alignment: 'TESDA Training Standard',
      tags: '',
      issuableBy: 'TrainingCenter',
      requiresApproval: true
    });
  };

  const handleEdit = (template: BadgeTemplate) => {
    setEditingTemplate(template);
    setFormData({
      programName: template.programName,
      badgeType: template.badgeType,
      description: template.description,
      criteria: template.criteria,
      validityMonths: template.validityMonths,
      alignment: template.alignment || 'TESDA Training Standard',
      tags: template.tags.join(', '),
      issuableBy: template.issuableBy[0] as any,
      requiresApproval: template.requiresApproval
    });
    setIsModalOpen(true);
  };

  const handleDelete = async () => {
    if (!templateToDelete) return;
    setIsSubmitting(true);
    try {
      await deleteDoc(doc(db, 'badgeTemplates', templateToDelete.id!));
      
      await addDoc(collection(db, 'auditLogs'), {
        action: `Deleted Badge Template: ${templateToDelete.programName}`,
        userName: 'Central Admin',
        timestamp: serverTimestamp(),
        details: `Type: ${templateToDelete.badgeType}`
      });

      setIsDeleteModalOpen(false);
      setTemplateToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'badgeTemplates');
    } finally {
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

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Badge Standards</h1>
          <p className="text-slate-500">Define and manage system-wide badge templates and metadata.</p>
        </div>
        
        <Dialog open={isModalOpen} onOpenChange={(open) => {
          setIsModalOpen(open);
          if (!open) {
            setEditingTemplate(null);
            resetForm();
          }
        }}>
          <DialogTrigger render={
            <Button className="bg-blue-600 hover:bg-blue-700 gap-2" onClick={() => {
              setEditingTemplate(null);
              resetForm();
              setIsModalOpen(true);
            }}>
              <Plus className="h-4 w-4" />
              Create New Template
            </Button>
          } />
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>{editingTemplate ? 'Edit Badge Template' : 'Create Badge Template'}</DialogTitle>
                <DialogDescription>
                  {editingTemplate ? 'Update the standards for this digital badge.' : 'Define the standards for a new digital badge.'}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="programName">Program Name</Label>
                    <Input 
                      id="programName" 
                      value={formData.programName} 
                      onChange={(e) => setFormData({...formData, programName: e.target.value})} 
                      placeholder="e.g. Web Development NC III" 
                      required 
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="badgeType">Badge Type</Label>
                    <Select 
                      value={formData.badgeType} 
                      onValueChange={(v: any) => setFormData({...formData, badgeType: v})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Proficient">Proficient (Unit)</SelectItem>
                        <SelectItem value="Expert">Expert (Program)</SelectItem>
                        <SelectItem value="Skilled">Skilled (NC)</SelectItem>
                        <SelectItem value="Master">Master (Advanced)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea 
                    id="description" 
                    value={formData.description} 
                    onChange={(e) => setFormData({...formData, description: e.target.value})} 
                    placeholder="Briefly describe what this badge represents..." 
                    required 
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="criteria">Competency / Criteria</Label>
                  <Textarea 
                    id="criteria" 
                    value={formData.criteria} 
                    onChange={(e) => setFormData({...formData, criteria: e.target.value})} 
                    placeholder="List the requirements to earn this badge..." 
                    required 
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="validity">Validity (Months)</Label>
                    <Input 
                      id="validity" 
                      type="number"
                      value={formData.validityMonths} 
                      onChange={(e) => setFormData({...formData, validityMonths: parseInt(e.target.value)})} 
                      required 
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="issuableBy">Issuing Entity</Label>
                    <Select 
                      value={formData.issuableBy} 
                      onValueChange={(v: any) => setFormData({...formData, issuableBy: v})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select issuer" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TrainingCenter">Training Center</SelectItem>
                        <SelectItem value="AssessmentCenter">Assessment Center</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="tags">Tags (comma separated)</Label>
                  <Input 
                    id="tags" 
                    value={formData.tags} 
                    onChange={(e) => setFormData({...formData, tags: e.target.value})} 
                    placeholder="IT, Web, Development" 
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : editingTemplate ? 'Update Template' : 'Save Template'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid md:grid-cols-4 gap-6">
        {['Proficient', 'Expert', 'Skilled', 'Master'].map((type) => (
          <Card key={type} className="border-slate-200 shadow-sm">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-2">
                <div className={`p-2 rounded-lg ${
                  type === 'Proficient' ? 'bg-emerald-100 text-emerald-600' :
                  type === 'Expert' ? 'bg-blue-100 text-blue-600' :
                  type === 'Skilled' ? 'bg-purple-100 text-purple-600' :
                  'bg-amber-100 text-amber-600'
                }`}>
                  <Award className="h-5 w-5" />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900">
                {templates.filter(t => t.badgeType === type).length}
              </p>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mt-1">{type} Templates</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            Badge Template Library
          </CardTitle>
          <CardDescription>System-wide standards for all digital credentials.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-slate-100">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="w-[300px]">Program / Badge</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Issuable By</TableHead>
                  <TableHead>Validity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.length > 0 ? (
                  templates.map((template) => (
                    <TableRow key={template.id} className="hover:bg-slate-50/50 transition-colors">
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900">{template.programName}</span>
                          <span className="text-xs text-slate-500 line-clamp-1">{template.description}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={
                          template.badgeType === 'Proficient' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                          template.badgeType === 'Expert' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                          template.badgeType === 'Skilled' ? 'bg-purple-50 text-purple-700 border-purple-100' :
                          'bg-amber-50 text-amber-700 border-amber-100'
                        }>
                          {template.badgeType}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Settings className="h-3 w-3" />
                          {template.issuableBy.join(', ')}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Calendar className="h-3 w-3" />
                          {template.validityMonths} Months
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none">
                          {template.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger render={
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          } />
                          <DropdownMenuContent align="end" className="w-[160px]">
                            <DropdownMenuGroup>
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleEdit(template)} className="cursor-pointer">
                                <Edit2 className="mr-2 h-4 w-4" />
                                <span>Edit Template</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => {
                                  setTemplateToDelete(template);
                                  setIsDeleteModalOpen(true);
                                }} 
                                className="cursor-pointer text-rose-600 focus:text-rose-600 focus:bg-rose-50"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                <span>Delete Template</span>
                              </DropdownMenuItem>
                            </DropdownMenuGroup>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-slate-500">
                      No templates found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Delete Template</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the template for <span className="font-bold text-slate-900">"{templateToDelete?.programName}"</span>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isSubmitting}>
              {isSubmitting ? 'Deleting...' : 'Delete Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
