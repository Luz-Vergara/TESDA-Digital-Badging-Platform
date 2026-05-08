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
  const { user, isAuthReady } = useFirebase();
  const [templates, setTemplates] = useState<BadgeTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<BadgeTemplate | null>(null);
  const [templateToDelete, setTemplateToDelete] = useState<BadgeTemplate | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [qualificationFilter, setQualificationFilter] = useState('all');
  
  const [formData, setFormData] = useState({
    badgeName: '',
    qualificationName: '',
    qualificationCode: '',
    badgeType: 'Proficient' as BadgeTemplate['badgeType'],
    credentialLevel: 'Unit of Competency' as BadgeTemplate['credentialLevel'],
    relatedCompetency: '',
    description: '',
    criteria: '',
    validityMonths: 36,
    alignment: 'TESDA Training Standard',
    tags: '',
    issuableBy: ['TrainingCenter'] as BadgeTemplate['issuableBy'],
    requiresApproval: true,
    displayOrder: 1,
    hierarchyVisible: true,
    status: 'Approved' as BadgeTemplate['status']
  });

  useEffect(() => {
    if (!isAuthReady || !user) return;

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

  const uniqueQualifications = Array.from(new Set(templates.map(t => t.qualificationName).filter(Boolean)));

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = 
      (template.badgeName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (template.qualificationName || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesQual = qualificationFilter === 'all' || template.qualificationName === qualificationFilter;
    
    return matchesSearch && matchesQual;
  });

  // Handle badge type changes to auto-set credential level and issuing logic
  const handleBadgeTypeChange = (type: BadgeTemplate['badgeType']) => {
    let level: BadgeTemplate['credentialLevel'] = 'Unit of Competency';
    let issuers: BadgeTemplate['issuableBy'] = ['TrainingCenter'];
    let order = 1;

    switch(type) {
      case 'Proficient':
        level = 'Unit of Competency';
        issuers = ['TrainingCenter'];
        order = 1;
        break;
      case 'Expert':
        level = 'Full Qualification / Certificate of Training';
        issuers = ['TrainingCenter'];
        order = 2;
        break;
      case 'Skilled':
        level = 'Certificate of Competency';
        issuers = ['AssessmentCenter', 'CertificationOffice'];
        order = 3;
        break;
      case 'Master':
        level = 'National Certificate';
        issuers = ['AssessmentCenter', 'CertificationOffice'];
        order = 4;
        break;
    }

    setFormData(prev => ({
      ...prev,
      badgeType: type,
      credentialLevel: level,
      issuableBy: issuers,
      displayOrder: order
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      alert("Auth session not ready. Please refresh or log in again.");
      return;
    }
    if (!formData.qualificationName || !formData.badgeType || !formData.credentialLevel || !formData.status) {
       alert("Please fill in all required fields.");
       return;
    }

    setIsSubmitting(true);
    try {
      const templateData = {
        ...formData,
        tags: formData.tags.split(',').map(t => t.trim()).filter(t => t !== ''),
        updatedAt: serverTimestamp()
      };
      
      if (editingTemplate) {
        await updateDoc(doc(db, 'badgeTemplates', editingTemplate.id!), templateData);
        
        await addDoc(collection(db, 'auditLogs'), {
          action: `Updated Badge Template: ${formData.badgeName}`,
          userName: 'QSO Admin',
          timestamp: serverTimestamp(),
          details: `Qualification: ${formData.qualificationName} | Type: ${formData.badgeType}`
        });
      } else {
        const newTemplate = {
          ...templateData,
          createdAt: serverTimestamp()
        };
        await addDoc(collection(db, 'badgeTemplates'), newTemplate);
        
        await addDoc(collection(db, 'auditLogs'), {
          action: `Created Badge Template: ${formData.badgeName}`,
          userName: 'QSO Admin',
          timestamp: serverTimestamp(),
          details: `Qualification: ${formData.qualificationName} | Type: ${formData.badgeType}`
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
      badgeName: '',
      qualificationName: '',
      qualificationCode: '',
      badgeType: 'Proficient',
      credentialLevel: 'Unit of Competency',
      relatedCompetency: '',
      description: '',
      criteria: '',
      validityMonths: 36,
      alignment: 'TESDA Training Standard',
      tags: '',
      issuableBy: ['TrainingCenter'],
      requiresApproval: true,
      displayOrder: 1,
      hierarchyVisible: true,
      status: 'Approved'
    });
  };

  const handleEdit = (template: BadgeTemplate) => {
    setEditingTemplate(template);
    setFormData({
      badgeName: template.badgeName || '',
      qualificationName: template.qualificationName || '',
      qualificationCode: template.qualificationCode || '',
      badgeType: template.badgeType,
      credentialLevel: template.credentialLevel || 'Unit of Competency',
      relatedCompetency: template.relatedCompetency || '',
      description: template.description,
      criteria: template.criteria,
      validityMonths: template.validityMonths,
      alignment: template.alignment || 'TESDA Training Standard',
      tags: template.tags.join(', '),
      issuableBy: template.issuableBy,
      requiresApproval: template.requiresApproval,
      displayOrder: template.displayOrder || 1,
      hierarchyVisible: template.hierarchyVisible !== undefined ? template.hierarchyVisible : true,
      status: template.status
    });
    setIsModalOpen(true);
  };

  const handleDelete = async () => {
    if (!templateToDelete) return;
    setIsSubmitting(true);
    try {
      await deleteDoc(doc(db, 'badgeTemplates', templateToDelete.id!));
      
      await addDoc(collection(db, 'auditLogs'), {
        action: `Deleted Badge Template: ${templateToDelete.badgeName || templateToDelete.programName}`,
        userName: 'QSO Admin',
        timestamp: serverTimestamp(),
        details: `Qualification: ${templateToDelete.qualificationName} | Type: ${templateToDelete.badgeType}`
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
                    <Label htmlFor="badgeName">Badge Name</Label>
                    <Input 
                      id="badgeName" 
                      value={formData.badgeName} 
                      onChange={(e) => setFormData({...formData, badgeName: e.target.value})} 
                      placeholder="e.g. Associate Web Developer" 
                      required 
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="badgeType">Badge Type</Label>
                    <Select 
                      value={formData.badgeType} 
                      onValueChange={(v: any) => handleBadgeTypeChange(v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Proficient">Proficient</SelectItem>
                        <SelectItem value="Expert">Expert</SelectItem>
                        <SelectItem value="Skilled">Skilled</SelectItem>
                        <SelectItem value="Master">Master</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="qualificationName">Qualification Name</Label>
                    <Input 
                      id="qualificationName" 
                      value={formData.qualificationName} 
                      onChange={(e) => setFormData({...formData, qualificationName: e.target.value})} 
                      placeholder="e.g. 2D Animation NC III" 
                      required 
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="qualificationCode">Qualification Code</Label>
                    <Input 
                      id="qualificationCode" 
                      value={formData.qualificationCode} 
                      onChange={(e) => setFormData({...formData, qualificationCode: e.target.value})} 
                      placeholder="e.g. ICT-2D-2023" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="credentialLevel">Related Credential Level</Label>
                    <Select 
                      value={formData.credentialLevel} 
                      onValueChange={(v: any) => setFormData({...formData, credentialLevel: v})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Unit of Competency">Unit of Competency</SelectItem>
                        <SelectItem value="Full Qualification / Certificate of Training">Full Qualification / Certificate of Training</SelectItem>
                        <SelectItem value="Certificate of Competency">Certificate of Competency</SelectItem>
                        <SelectItem value="National Certificate">National Certificate</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="relatedCompetency">Related Unit / COC / NC</Label>
                    <Input 
                      id="relatedCompetency" 
                      value={formData.relatedCompetency} 
                      onChange={(e) => setFormData({...formData, relatedCompetency: e.target.value})} 
                      placeholder="e.g. UC1: Perform Computer Operations" 
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="description">Badge Description</Label>
                  <Textarea 
                    id="description" 
                    value={formData.description} 
                    onChange={(e) => setFormData({...formData, description: e.target.value})} 
                    placeholder="Briefly describe what this badge represents..." 
                    required 
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="criteria">Criteria for Earning the Badge</Label>
                  <Textarea 
                    id="criteria" 
                    value={formData.criteria} 
                    onChange={(e) => setFormData({...formData, criteria: e.target.value})} 
                    placeholder="List the requirements to earn this badge..." 
                    required 
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="validity">Validity (Months)</Label>
                    <Input 
                      id="validity" 
                      type="number"
                      value={formData.validityMonths} 
                      onChange={(e) => setFormData({...formData, validityMonths: parseInt(e.target.value) || 0})} 
                      required 
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="displayOrder">Display Order</Label>
                    <Input 
                      id="displayOrder" 
                      type="number"
                      value={formData.displayOrder} 
                      onChange={(e) => setFormData({...formData, displayOrder: parseInt(e.target.value) || 0})} 
                      required 
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="hierarchyVisible">Hierarchy Visible</Label>
                    <Select 
                      value={formData.hierarchyVisible ? 'yes' : 'no'} 
                      onValueChange={(v) => setFormData({...formData, hierarchyVisible: v === 'yes'})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="yes">Yes</SelectItem>
                        <SelectItem value="no">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Issuable By</Label>
                    <div className="border rounded-md p-2 bg-slate-50 space-y-1">
                      {['TrainingCenter', 'AssessmentCenter', 'CertificationOffice'].map((role) => (
                        <div key={role} className="flex items-center gap-2">
                          <input 
                            type="checkbox" 
                            id={`issuable-${role}`}
                            checked={formData.issuableBy.includes(role as any)}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setFormData(prev => ({
                                ...prev,
                                issuableBy: checked 
                                  ? [...prev.issuableBy, role as any]
                                  : prev.issuableBy.filter(r => r !== role)
                              }));
                            }}
                          />
                          <Label htmlFor={`issuable-${role}`} className="text-xs font-normal cursor-pointer">
                            {role === 'TrainingCenter' ? 'Training Center' : role === 'AssessmentCenter' ? 'Assessment Center' : 'Certification Office'}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="status">Status</Label>
                    <Select 
                      value={formData.status} 
                      onValueChange={(v: any) => setFormData({...formData, status: v})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Approved">Approved</SelectItem>
                        <SelectItem value="Active">Active</SelectItem>
                        <SelectItem value="Draft">Draft</SelectItem>
                        <SelectItem value="Archived">Archived</SelectItem>
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
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Search by badge name or qualification..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="w-full md:w-[250px]">
            <Select value={qualificationFilter} onValueChange={setQualificationFilter}>
              <SelectTrigger>
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-slate-400" />
                  <SelectValue placeholder="All Qualifications" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Qualifications</SelectItem>
                {uniqueQualifications.map(qual => (
                  <SelectItem key={qual} value={qual}>{qual}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="rounded-md border border-slate-100">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="w-[200px]">Badge Name</TableHead>
                  <TableHead>Qualification</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Credential Level</TableHead>
                  <TableHead>Issuable By</TableHead>
                  <TableHead>Validity</TableHead>
                  <TableHead>Hierarchy</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTemplates.length > 0 ? (
                  filteredTemplates.map((template) => (
                    <TableRow key={template.id} className="hover:bg-slate-50/50 transition-colors">
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900">{template.badgeName || template.programName}</span>
                          <span className="text-xs text-slate-500 line-clamp-1">{template.description}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-slate-600">{template.qualificationName || template.programName}</span>
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
                        <span className="text-xs text-slate-500">{template.credentialLevel || 'N/A'}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {template.issuableBy.map(role => (
                            <div key={role} className="flex items-center gap-1 text-[10px] text-slate-600">
                              <Settings className="h-2 w-2" />
                              {role === 'TrainingCenter' ? 'Training Center' : role === 'AssessmentCenter' ? 'Assessment Center' : 'Certification Office'}
                            </div>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Calendar className="h-3 w-3" />
                          {template.validityMonths} m
                        </div>
                      </TableCell>
                      <TableCell>
                        {template.hierarchyVisible ? (
                           <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-100 text-[10px]">Visible</Badge>
                        ) : (
                           <Badge variant="outline" className="bg-slate-50 text-slate-400 border-slate-100 text-[10px]">Hidden</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={
                          template.status === 'Approved' || template.status === 'Active' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-none' :
                          template.status === 'Draft' ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-none' :
                          'bg-rose-100 text-rose-700 hover:bg-rose-200 border-none'
                        }>
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
                    <TableCell colSpan={9} className="h-32 text-center text-slate-500">
                      {templates.length === 0 ? "No templates found." : "No templates match your search filters."}
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
