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
  Settings,
  Sliders,
  Eye,
  Save,
  Move,
  RotateCcw,
  RefreshCw,
  SlidersHorizontal,
  Image,
  Sparkles,
  Check,
  Lock,
  ChevronRight,
  Upload
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { BadgeRenderer } from '@/src/components/badges/BadgeRenderer';
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

const ACTIVE_STANDARD_PROFILES = [
  "Create 2D Digital Cut-Out Animation",
  "Develop 2D Animation",
  "Produce 3D Animation",
  "Advanced Multimedia Production",
  "Web Development NC III",
  "Visual Graphic Design NC III",
  "Software Development NC IV",
  "Cybersecurity Analyst",
  "Game Development",
  "Data Science Associate",
  "IT Support Specialist",
  "Technical Drafting NC II"
];

const PROFILE_CODE_MAPPING: { [key: string]: string } = {
  "Create 2D Digital Cut-Out Animation": "ANIM-NC3-2D",
  "Develop 2D Animation": "ANIM-NC2-2D",
  "Produce 3D Animation": "ANIM-NC3-3D",
  "Advanced Multimedia Production": "ICT-AMP-23",
  "Web Development NC III": "ICT-WD-3",
  "Visual Graphic Design NC III": "ICT-VGD-3",
  "Software Development NC IV": "ICT-SD-4",
  "Cybersecurity Analyst": "ICT-CSA-4",
  "Game Development": "ICT-GD-3",
  "Data Science Associate": "ICT-DSA-3",
  "IT Support Specialist": "ICT-ITSS-2",
  "Technical Drafting NC II": "IND-TD-2"
};

export default function BadgeTemplates() {
  const { user, isAuthReady } = useFirebase();
  const [templates, setTemplates] = useState<BadgeTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<BadgeTemplate | null>(null);
  const [templateToDelete, setTemplateToDelete] = useState<BadgeTemplate | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [activeTab, setActiveTab] = useState<'catalog' | 'designer'>('catalog');
  const [showJsonConfig, setShowJsonConfig] = useState<boolean>(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [qualificationFilter, setQualificationFilter] = useState('all');

  // Layout Designer Workspace States
  const [designerTemplateId, setDesignerTemplateId] = useState<string>('');
  const [designerImgUrl, setDesignerImgUrl] = useState<string>('');
  const [designerConfig, setDesignerConfig] = useState<any>({
    fitMode: 'cover',
    name: { x: 50, y: 45, fontSize: "1.4rem", color: "#111827", enabled: true },
    qualificationTitle: { x: 50, y: 58, fontSize: "0.95rem", color: "#111827", enabled: true },
    qualificationCode: { x: 50, y: 63, fontSize: "0.8rem", color: "#374151", enabled: true },
    level: { x: 50, y: 70, fontSize: "0.9rem", color: "#1d4ed8", enabled: true },
    date: { x: 30, y: 88, fontSize: "0.7rem", color: "#111827", enabled: true },
    validUntil: { x: 70, y: 88, fontSize: "0.7rem", color: "#111827", enabled: true },
    id: { x: 50, y: 82, fontSize: "0.65rem", color: "#374151", enabled: true },
    qr: { x: 50, y: 75, size: 70, enabled: true }
  });
  const [activeField, setActiveField] = useState<string>('name');
  const [designerSuccess, setDesignerSuccess] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Dynamic Image File Compression & Reader
  const processFile = (file: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Highly specified file selection requested: Please upload a standard image format (PNG, JPG, or JPEG)!');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        // Enforce high compatibility limit by compressing background preview template bounds to max 1024px dynamic fit
        const maxDimension = 1024;
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.85);
          setDesignerImgUrl(compressedBase64);
        } else {
          setDesignerImgUrl(event.target?.result as string);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };
  
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
    status: 'Approved' as BadgeTemplate['status'],
    imageUrl: '',
    templateConfig: JSON.stringify({
      name: { x: 50, y: 45, fontSize: "1.45rem", color: "#111827", enabled: true },
      qualificationTitle: { x: 50, y: 58, fontSize: "0.95rem", color: "#111827", enabled: true },
      qualificationCode: { x: 50, y: 63, fontSize: "0.8rem", color: "#374151", enabled: true },
      level: { x: 50, y: 70, fontSize: "0.9rem", color: "#1d4ed8", enabled: true },
      date: { x: 28, y: 88, fontSize: "0.7rem", color: "#111827", enabled: true },
      validUntil: { x: 60, y: 88, fontSize: "0.7rem", color: "#111827", enabled: true },
      id: { x: 50, y: 82, fontSize: "0.65rem", color: "#374151", enabled: true },
      qr: { x: 50, y: 75, size: 70, enabled: true }
    }, null, 2)
  });

  // Subscribe to real-time sync of badge template details
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

  // Load standard template in layout designer when chosen in selector
  useEffect(() => {
    if (!designerTemplateId) return;
    const t = templates.find(doc => doc.id === designerTemplateId);
    if (t) {
      setDesignerImgUrl(t.imageUrl || '');
      if (t.templateConfig && typeof t.templateConfig === 'object') {
        setDesignerConfig(t.templateConfig);
      } else {
        // Use nice defaults
        setDesignerConfig({
          fitMode: 'cover',
          name: { x: 50, y: 45, fontSize: "1.4rem", color: "#111827", enabled: true },
          qualificationTitle: { x: 50, y: 58, fontSize: "0.95rem", color: "#111827", enabled: true },
          qualificationCode: { x: 50, y: 63, fontSize: "0.8rem", color: "#374151", enabled: true },
          level: { x: 50, y: 70, fontSize: "0.9rem", color: "#1d4ed8", enabled: true },
          date: { x: 30, y: 88, fontSize: "0.7rem", color: "#111827", enabled: true },
          validUntil: { x: 70, y: 88, fontSize: "0.7rem", color: "#111827", enabled: true },
          id: { x: 50, y: 82, fontSize: "0.65rem", color: "#374151", enabled: true },
          qr: { x: 50, y: 75, size: 70, enabled: true }
        });
      }
    }
  }, [designerTemplateId, templates]);

  // Set initial selected template standard
  useEffect(() => {
    if (templates.length > 0 && !designerTemplateId) {
      setDesignerTemplateId(templates[0].id!);
    }
  }, [templates, designerTemplateId]);

  const updateFieldPosition = (fieldKey: string, updates: Partial<any>) => {
    setDesignerConfig((prev: any) => {
      const currentField = prev[fieldKey] || { x: 50, y: 50, enabled: true, fontSize: "1rem", color: "#111827" };
      return {
        ...prev,
        [fieldKey]: {
          ...currentField,
          ...updates
        }
      };
    });
  };

  const handleSaveDesignerLayout = async () => {
    if (!user) {
      alert("Auth is not ready yet. Please refresh or log in again.");
      return;
    }
    if (!designerTemplateId) {
      alert("Please select a standard template to configure.");
      return;
    }
    
    setIsSubmitting(true);
    setDesignerSuccess(null);
    const matched = templates.find(t => t.id === designerTemplateId);
    
    try {
      await updateDoc(doc(db, 'badgeTemplates', designerTemplateId), {
        imageUrl: designerImgUrl.trim(),
        templateConfig: designerConfig,
        updatedAt: serverTimestamp()
      });
      
      await addDoc(collection(db, 'auditLogs'), {
        action: `Designed Layout Standards: ${matched?.badgeName || 'Badge Standard'}`,
        userName: 'QSO Admin',
        timestamp: serverTimestamp(),
        details: `Coordinated layout parameters for ${matched?.qualificationName || 'Qualification'}`
      });
      
      setDesignerSuccess(`Successfully saved layout coordinate standards for "${matched?.badgeName || 'Badge'}"! All generated badges will use this standard.`);
      setTimeout(() => setDesignerSuccess(null), 5000);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'badgeTemplates');
    } finally {
      setIsSubmitting(false);
    }
  };

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

    let parsedConfig = undefined;
    if (formData.templateConfig) {
      try {
        parsedConfig = JSON.parse(formData.templateConfig);
      } catch (e) {
        alert("Invalid Layout Configuration JSON format. Please verify the brace layout!");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const templateData = {
        ...formData,
        imageUrl: formData.imageUrl.trim(),
        templateConfig: parsedConfig,
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
      setActiveTab('catalog');
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
      status: 'Approved',
      imageUrl: '',
      templateConfig: JSON.stringify({
        name: { x: 50, y: 45, fontSize: "1.45rem", color: "#111827", enabled: true },
        qualificationTitle: { x: 50, y: 58, fontSize: "0.95rem", color: "#111827", enabled: true },
        qualificationCode: { x: 50, y: 63, fontSize: "0.8rem", color: "#374151", enabled: true },
        level: { x: 50, y: 70, fontSize: "0.9rem", color: "#1d4ed8", enabled: true },
        date: { x: 28, y: 88, fontSize: "0.7rem", color: "#111827", enabled: true },
        validUntil: { x: 60, y: 88, fontSize: "0.7rem", color: "#111827", enabled: true },
        id: { x: 50, y: 82, fontSize: "0.65rem", color: "#374151", enabled: true },
        qr: { x: 50, y: 75, size: 70, enabled: true }
      }, null, 2)
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
      status: template.status,
      imageUrl: template.imageUrl || '',
      templateConfig: template.templateConfig ? JSON.stringify(template.templateConfig, null, 2) : JSON.stringify({
        name: { x: 50, y: 45, fontSize: "1.45rem", color: "#111827", enabled: true },
        qualificationTitle: { x: 50, y: 58, fontSize: "0.95rem", color: "#111827", enabled: true },
        qualificationCode: { x: 50, y: 63, fontSize: "0.8rem", color: "#374151", enabled: true },
        level: { x: 50, y: 70, fontSize: "0.9rem", color: "#1d4ed8", enabled: true },
        date: { x: 28, y: 88, fontSize: "0.7rem", color: "#111827", enabled: true },
        validUntil: { x: 60, y: 88, fontSize: "0.7rem", color: "#111827", enabled: true },
        id: { x: 50, y: 82, fontSize: "0.65rem", color: "#374151", enabled: true },
        qr: { x: 50, y: 75, size: 70, enabled: true }
      }, null, 2)
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

  // Filter templates list based on filters
  const filteredTemplates = templates.filter(template => {
    const matchesSearch = 
      (template.badgeName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (template.qualificationName || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesQual = qualificationFilter === 'all' || template.qualificationName === qualificationFilter;
    
    return matchesSearch && matchesQual;
  });

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Award className="h-8 w-8 text-blue-600" />
            Badge Standards
          </h1>
          <p className="text-slate-500 text-sm">Define, upload backgrounds, manage templates, and lay out visual placeholders in real-time.</p>
        </div>
        
        <Button 
          className="bg-blue-600 hover:bg-blue-700 gap-2 font-semibold shadow-sm"
          onClick={() => {
            setEditingTemplate(null);
            resetForm();
            setIsModalOpen(true);
          }}
        >
          <Plus className="h-4 w-4" />
          Create New Template
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)} className="w-full space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2 p-1 bg-slate-100/80 rounded-lg">
          <TabsTrigger value="catalog" className="font-semibold text-slate-700 data-[state=active]:bg-white data-[state=active]:shadow-sm">
            Templates Library
          </TabsTrigger>
          <TabsTrigger value="designer" className="font-semibold text-slate-700 data-[state=active]:bg-white data-[state=active]:shadow-sm flex items-center justify-center gap-1.5">
            <Sliders className="h-4 w-4 text-emerald-600" />
            Visual Badge Designer
          </TabsTrigger>
        </TabsList>

        <TabsContent value="catalog" className="space-y-6">
          <div className="grid md:grid-cols-4 gap-6">
            {['Proficient', 'Expert', 'Skilled', 'Master'].map((type) => (
              <Card key={type} className="border-slate-200 shadow-sm bg-white">
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

          <Card className="border-slate-200 shadow-sm bg-white">
            <CardHeader className="border-b bg-slate-50/50">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                Badge Template Library
              </CardTitle>
              <CardDescription>System-wide standards for all digital credentials.</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
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
                
                <div className="w-full md:w-64">
                  <Select value={qualificationFilter} onValueChange={setQualificationFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by qualification" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Qualifications</SelectItem>
                      {Array.from(new Set(templates.map(t => t.qualificationName).filter(Boolean))).map(qName => (
                        <SelectItem key={qName} value={qName!}>{qName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 overflow-hidden bg-white">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="font-bold text-slate-700">Preview</TableHead>
                      <TableHead className="font-bold text-slate-700">Badge/Standard Name</TableHead>
                      <TableHead className="font-bold text-slate-700 font-mono text-center">Type</TableHead>
                      <TableHead className="font-bold text-slate-700">Qualification Group</TableHead>
                      <TableHead className="font-bold text-slate-700">Validity</TableHead>
                      <TableHead className="font-bold text-slate-700">Issuing Authority</TableHead>
                      <TableHead className="font-bold text-slate-700">Status</TableHead>
                      <TableHead className="right-0 font-bold text-slate-700 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTemplates.length > 0 ? (
                      filteredTemplates.map((template) => (
                        <TableRow key={template.id} className="hover:bg-slate-50/50">
                          <TableCell>
                            <div className="h-11 w-11 rounded border bg-slate-50 overflow-hidden flex items-center justify-center relative">
                              {template.imageUrl ? (
                                <img 
                                  src={template.imageUrl} 
                                  alt="" 
                                  className="h-full w-full object-cover"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <Award className="h-5 w-5 text-slate-400" />
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="font-bold text-slate-900 leading-tight">
                            {template.badgeName}
                            {template.qualificationCode && (
                              <span className="block font-mono text-[10px] text-slate-500 font-medium mt-0.5">{template.qualificationCode}</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-bold ${
                              template.badgeType === 'Proficient' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                              template.badgeType === 'Expert' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                              template.badgeType === 'Skilled' ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                              'bg-amber-50 text-amber-705 border border-amber-200'
                            }`}>
                              {template.badgeType}
                            </span>
                          </TableCell>
                          <TableCell className="text-slate-600 text-xs">
                            <div className="font-medium text-slate-800">{template.qualificationName}</div>
                            <div className="text-[10px] text-slate-400">{template.credentialLevel}</div>
                          </TableCell>
                          <TableCell className="text-slate-600 text-xs font-medium">
                            {template.validityMonths ? `${template.validityMonths} Months` : 'Permanent'}
                          </TableCell>
                          <TableCell className="text-slate-600 text-xs">
                            {template.issuableBy?.map(role => (
                              <span key={role} className="block text-[10px] bg-slate-100 text-slate-600 px-1 py-0.5 rounded mb-0.5 font-medium truncate max-w-[120px]">
                                {role === 'TrainingCenter' ? 'TCO Office' : role === 'AssessmentCenter' ? 'Assessment Ctr' : 'PO/RO Auth'}
                              </span>
                            ))}
                          </TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${
                              template.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-700' : 'bg-slate-100 text-slate-650'
                            }`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${template.status === 'Approved' ? 'bg-emerald-600' : 'bg-slate-400'}`} />
                              {template.status}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-slate-100">
                                  <MoreVertical className="h-4 w-4 text-slate-500" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-[180px] bg-white border rounded shadow-md">
                                <DropdownMenuLabel className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Template Actions</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuGroup>
                                  <DropdownMenuItem 
                                    onClick={() => handleEdit(template)}
                                    className="cursor-pointer hover:bg-slate-50"
                                  >
                                    <Edit2 className="mr-2 h-4 w-4 text-slate-600" />
                                    <span>Edit Template</span>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => {
                                      setDesignerTemplateId(template.id!);
                                      setActiveTab('designer');
                                    }}
                                    className="cursor-pointer hover:bg-slate-50"
                                  >
                                    <Sliders className="mr-2 h-4 w-4 text-emerald-600" />
                                    <span>Layout Designer</span>
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem 
                                    onClick={() => {
                                      setTemplateToDelete(template);
                                      setIsDeleteModalOpen(true);
                                    }}
                                    className="cursor-pointer text-rose-650 focus:text-rose-700 focus:bg-rose-50 hover:bg-rose-50"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4 text-rose-500" />
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
                        <TableCell colSpan={8} className="h-32 text-center text-slate-550">
                          {templates.length === 0 ? "No templates standard found." : "No templates match search filters."}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="designer" className="space-y-6">
          <div className="grid lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Visual Parameters Layout Controls */}
            <div className="lg:col-span-4 space-y-6 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <div>
                <h3 className="font-bold text-slate-950 flex items-center gap-2 text-base">
                  <SlidersHorizontal className="h-5 w-5 text-emerald-600" />
                  Layout Coordinator
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Configure coordinates layout in percentage size from center of layout. Drag variable sliders or click overlays directly inside real-time preview canvas to bind targets.
                </p>
              </div>

              <div className="space-y-4">
                {/* Template Profile Selection */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-slate-600">Active Standard Profile</Label>
                  <Select value={designerTemplateId} onValueChange={setDesignerTemplateId}>
                    <SelectTrigger className="w-full text-xs">
                      <SelectValue placeholder="Choose standard template..." />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map(t => (
                        <SelectItem key={t.id} value={t.id!} className="text-xs">
                          {t.badgeName || t.programName} ({t.badgeType})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Change background image URL */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-slate-600 flex items-center gap-1">
                    <Image className="h-3 w-3 text-emerald-500" />
                    Template Background Image URL
                  </Label>
                  <div className="flex gap-2">
                    <Input 
                      placeholder="Paste ImgBB JPG/PNG direct file URL..." 
                      value={designerImgUrl}
                      onChange={(e) => setDesignerImgUrl(e.target.value)}
                      className="text-xs"
                    />
                    {designerImgUrl && (
                      <Button size="icon" variant="outline" onClick={() => setDesignerImgUrl('')} className="h-9 w-9">
                        <RotateCcw className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Upload direct link template baseline to lay placeholder fields precisely above elements.
                  </p>
                </div>

                {/* Upload Custom Badge Template Background */}
                <div className="space-y-2 border-t pt-4">
                  <Label className="text-xs font-bold uppercase text-slate-600 flex items-center gap-1.5">
                    <Upload className="h-3.5 w-3.5 text-emerald-500" />
                    Upload Template Background
                  </Label>
                  <div 
                    className={`mt-1 flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-4 transition-all duration-150 cursor-pointer ${
                      isDragging 
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700' 
                        : 'border-slate-200 hover:border-emerald-500 hover:bg-slate-50/50 text-slate-500 bg-slate-50/20'
                    }`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => document.getElementById('badge-upload-input')?.click()}
                  >
                    <Upload className="h-6 w-6 mb-1.5 text-slate-400" />
                    <span className="text-xs font-semibold text-center text-slate-700">Drag image file here, or browse</span>
                    <span className="text-[9px] text-slate-400 text-center mt-0.5">Supports PNG, JPG, JPEG (Max 3MB)</span>
                    <input 
                      id="badge-upload-input"
                      type="file" 
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileSelect}
                    />
                  </div>
                </div>

                {/* Dynamic Image Fit Adjustment Controls */}
                <div className="space-y-2 border-t pt-4">
                  <Label className="text-xs font-bold uppercase text-slate-600 flex items-center gap-1.5">
                    <Sliders className="h-3.5 w-3.5 text-emerald-500" />
                    How should the image fit?
                  </Label>
                  <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1.5 rounded-lg border border-slate-200">
                    {[
                      { id: 'cover', label: 'Crop (Cover)', desc: 'Fills the entire canvas, cropping overflow' },
                      { id: 'contain', label: 'Fit (Contain)', desc: 'Fits entire image inside frame, adding letterbox if needed' },
                      { id: 'fill', label: 'Stretch (Fill)', desc: 'Stretches the image to fill the exact dimensions' }
                    ].map(mode => {
                      const isActive = (designerConfig?.fitMode || 'cover') === mode.id;
                      return (
                        <button
                          key={mode.id}
                          type="button"
                          className={`text-[10px] py-1.5 px-1 rounded font-bold text-center transition-all ${
                            isActive 
                              ? 'bg-emerald-600 text-white shadow' 
                              : 'text-slate-600 hover:bg-slate-200'
                          }`}
                          onClick={() => {
                            setDesignerConfig((prev: any) => ({
                              ...prev,
                              fitMode: mode.id as 'cover' | 'contain' | 'fill'
                            }));
                          }}
                          title={mode.desc}
                        >
                          {mode.label}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[9px] text-slate-400">
                    Select standard <strong>Crop (Cover)</strong> to scale and zoom, <strong>Fit (Contain)</strong> to fit completely with backgrounds, or <strong>Stretch (Fill)</strong> to fill the canvas exactly.
                  </p>
                </div>



                {/* Raw Config Position JSON Editor toggle */}
                <div className="pt-2 border-t mt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500 font-bold">Coordinate system config (Raw JSON)</span>
                    <button 
                      type="button"
                      onClick={() => setShowJsonConfig(!showJsonConfig)} 
                      className="text-xs font-bold text-emerald-600 underline hover:text-emerald-700"
                    >
                      {showJsonConfig ? 'Hide Config' : 'Show Config Editor'}
                    </button>
                  </div>

                  {showJsonConfig && (
                    <div className="grid gap-2 mt-2">
                      <Label htmlFor="designer-raw-json" className="text-[10px] uppercase font-bold text-slate-400">Layout Coordinate Positions (JSON %)</Label>
                      <Textarea 
                        id="designer-raw-json" 
                        value={JSON.stringify(designerConfig, null, 2)} 
                        onChange={(e) => {
                          try {
                            const parsed = JSON.parse(e.target.value);
                            setDesignerConfig(parsed);
                          } catch (err) {
                            // Don't crash but let them finish writing
                          }
                        }} 
                        placeholder="Layout config in JSON..." 
                        rows={6}
                        className="font-mono text-[11px] leading-tight text-white bg-slate-900 border-slate-800 focus:border-emerald-500-25"
                      />
                    </div>
                  )}
                </div>

                <Button 
                  type="button" 
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2 font-bold py-2 shadow-md transition-all mt-4"
                  onClick={handleSaveDesignerLayout}
                  disabled={isSubmitting || !designerTemplateId}
                >
                  <Save className="h-4 w-4" />
                  {isSubmitting ? 'Saving Configuration...' : 'Save Coordinate Parameters'}
                </Button>
              </div>
            </div>

            {/* Right Column: Live Interactive Placement Preview Canvas */}
            <div className="lg:col-span-8 flex flex-col items-center">
              <div className="w-full bg-slate-900 duration-300 p-8 rounded-2xl border border-slate-800 shadow-xl flex flex-col items-center justify-center relative min-h-[580px]">
                {/* Emerald themed coordinated helper headers */}
                <div className="absolute top-4 left-4 right-4 flex justify-between items-center text-xs text-slate-400 font-mono">
                  <div className="flex items-center gap-1.5 font-bold">
                    <Sparkles className="h-3.5 w-3.5 text-emerald-400 animate-pulse" />
                    <span className="tracking-wide">INTERACTIVE PLACEHOLDER PLACEMENT CANVAS</span>
                  </div>
                  {designerTemplateId && (
                    <div className="bg-emerald-950/80 px-2.5 py-1 rounded text-emerald-400 font-extrabold border border-emerald-800 uppercase tracking-widest text-[9px]">
                      Live Synchronized Profile
                    </div>
                  )}
                </div>

                {designerSuccess && (
                  <div className="absolute top-16 left-4 right-4 bg-emerald-950/90 border border-emerald-500 text-emerald-300 text-xs py-2 px-3 rounded-lg shadow-lg flex items-center gap-2 z-10 animate-bounce">
                    <Check className="h-4 w-4 text-emerald-400" />
                    <span>{designerSuccess}</span>
                  </div>
                )}

                {designerTemplateId ? (
                  <div className="flex flex-col items-center">
                    {/* The canvas frame wrapper */}
                    <div className="relative border-4 border-slate-800 rounded-2xl p-2 bg-slate-950 shadow-2xl mt-4">
                      <BadgeRenderer
                        scale={0.88}
                        data={{
                          id: 'designer-temp-preview',
                          name: 'Designer Standard Preview',
                          learnerName: 'DEMO RECIPIENT FULL NAME',
                          issueDate: '05/21/2026',
                          validUntil: '05/21/2029',
                          verificationId: 'TESDA-NC3-A89102',
                          imageUrl: designerImgUrl,
                          level: templates.find(t => t.id === designerTemplateId)?.badgeType || 'Expert',
                          qualificationTitle: templates.find(t => t.id === designerTemplateId)?.qualificationName || 'Advanced Multimedia Production',
                          qualificationCode: templates.find(t => t.id === designerTemplateId)?.qualificationCode || 'ICT-AMP-23',
                          templateConfig: designerConfig
                        }}
                      />

                      {/* Overlaid Guideline overlays */}
                      {designerImgUrl ? (
                        <div 
                          className="absolute inset-0 pointer-events-none"
                          style={{ width: `${500 * 0.88}px`, height: `${500 * 0.88}px`, margin: '12px' }}
                        >
                          {/* Symmetrical central guidelines */}
                          <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-emerald-500/20" />
                          <div className="absolute inset-y-0 left-1/2 border-l border-dashed border-emerald-500/20" />

                          {/* Interactive boundary clicks on selected elements */}
                          {Object.entries(designerConfig).map(([key, config]: [string, any]) => {
                            if (key === 'fitMode' || !config || config.enabled === false) return null;
                            const isSelected = activeField === key;
                            const size = key === 'qr' ? (config.size || 70) * 0.88 : 16;
                            
                            return (
                              <div 
                                key={key}
                                className={`absolute pointer-events-auto cursor-pointer rounded transition-all flex items-center justify-center ${
                                  isSelected 
                                    ? 'border-2 border-dashed border-emerald-550 bg-emerald-500/25 shadow-lg scale-105 z-25' 
                                    : 'border border-emerald-450/40 bg-emerald-400/5 hover:border-emerald-500 hover:bg-emerald-450/15'
                                }`}
                                style={{
                                  left: `${config.x}%`,
                                  top: `${config.y}%`,
                                  width: key === 'qr' ? `${size}px` : 'auto',
                                  height: key === 'qr' ? `${size}px` : '32px',
                                  padding: key === 'qr' ? '0' : '2px 8px',
                                  transform: 'translate(-50%, -50%)',
                                }}
                                title={`Click to drag coordinate sliders for ${key}`}
                                onClick={() => setActiveField(key)}
                              >
                                {key !== 'qr' && (
                                  <span className={`text-[9px] font-bold select-none truncate ${isSelected ? 'text-white bg-emerald-600 px-1 py-0.5 rounded shadow-sm text-center font-extrabold' : 'text-slate-300 bg-slate-800/80 px-1.5 py-0.5 rounded text-center'}`}>
                                    {key === 'name' ? 'Learner Name' : key === 'qualificationTitle' ? 'Title' : key === 'qualificationCode' ? 'Code' : key === 'validUntil' ? 'Expiry Date' : key}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>

                    {/* Active Layout Placeholder Selector Chips */}
                    <div className="w-full max-w-xl mt-6 space-y-2">
                      <Label className="text-[11px] font-bold uppercase text-slate-400 flex items-center justify-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                        Select Active Layout Placeholder Variable
                      </Label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 bg-slate-800/60 p-1.5 rounded-lg border border-slate-750/80">
                        {[
                          { id: 'name', label: 'Learner Name' },
                          { id: 'qualificationTitle', label: 'Qualific. Title' },
                          { id: 'qualificationCode', label: 'Qualific. Code' },
                          { id: 'level', label: 'Badge Level' },
                          { id: 'date', label: 'Issue Date' },
                          { id: 'validUntil', label: 'Expiry Date' },
                          { id: 'id', label: 'Credential ID' },
                          { id: 'qr', label: 'QR Secure Code' }
                        ].map(field => (
                          <button
                            key={field.id}
                            type="button"
                            className={`text-[11px] py-1.5 px-2 rounded font-medium text-center transition-all ${
                              activeField === field.id 
                                ? 'bg-emerald-600 text-white shadow-sm font-extrabold' 
                                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                            }`}
                            onClick={() => setActiveField(field.id)}
                          >
                            {field.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Coordinate Parameter / Slide controls for Active Layout Selection */}
                    {designerConfig[activeField] && (
                      <div className="w-full max-w-xl mt-5 p-5 bg-slate-800/40 rounded-xl border border-slate-755/90 space-y-4 text-left">
                        <div className="flex items-center justify-between border-b border-slate-750/50 pb-3">
                          <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                            {activeField === 'name' ? 'Learner Name' : activeField === 'qualificationTitle' ? 'Qualification Title' : activeField === 'qualificationCode' ? 'Qualification Code' : activeField === 'qr' ? 'QR Code Security' : activeField} Options & Parameters
                          </span>
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id="designer-field-enabled"
                              checked={designerConfig[activeField]?.enabled !== false}
                              onChange={(e) => updateFieldPosition(activeField, { enabled: e.target.checked })}
                              className="rounded text-emerald-600 bg-slate-900 border-slate-700 cursor-pointer h-4 w-4"
                            />
                            <Label htmlFor="designer-field-enabled" className="text-xs cursor-pointer select-none text-slate-300 font-semibold">Visible on Badge</Label>
                          </div>
                        </div>

                        {designerConfig[activeField]?.enabled !== false && (
                          <div className="space-y-4">
                            {/* Horizontal X Slider */}
                            <div className="space-y-1">
                              <div className="flex justify-between text-xs">
                                <span className="text-slate-400 font-medium">Horizontal Coordinate (X Position)</span>
                                <span className="font-mono text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-900/55">{designerConfig[activeField]?.x || 50}%</span>
                              </div>
                              <input 
                                type="range" 
                                min="0" 
                                max="100" 
                                value={designerConfig[activeField]?.x || 50} 
                                onChange={(e) => updateFieldPosition(activeField, { x: parseInt(e.target.value) })}
                                className="w-full cursor-pointer accent-emerald-500 h-1 bg-slate-700 rounded-lg"
                              />
                            </div>

                            {/* Vertical Y Slider */}
                            <div className="space-y-1">
                              <div className="flex justify-between text-xs">
                                <span className="text-slate-400 font-medium">Vertical Coordinate (Y Position)</span>
                                <span className="font-mono text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-900/55">{designerConfig[activeField]?.y || 50}%</span>
                              </div>
                              <input 
                                type="range" 
                                min="0" 
                                max="100" 
                                value={designerConfig[activeField]?.y || 50} 
                                onChange={(e) => updateFieldPosition(activeField, { y: parseInt(e.target.value) })}
                                className="w-full cursor-pointer accent-emerald-500 h-1 bg-slate-700 rounded-lg"
                              />
                            </div>

                            {/* Font sizing slider for non-QR elements */}
                            {activeField !== 'qr' && (
                              <div className="space-y-1">
                                <div className="flex justify-between text-xs font-medium">
                                  <span className="text-slate-400">Font Dimension Size</span>
                                  <span className="font-mono text-emerald-400 font-extrabold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-900/55">{designerConfig[activeField]?.fontSize || '1.1rem'}</span>
                                </div>
                                <input 
                                  type="range" 
                                  min="5" 
                                  max="30" 
                                  step="1"
                                  value={Math.round(parseFloat(designerConfig[activeField]?.fontSize || '1.1rem') * 10)} 
                                  onChange={(e) => updateFieldPosition(activeField, { fontSize: `${parseFloat(e.target.value) / 10}rem` })}
                                  className="w-full cursor-pointer accent-emerald-500 h-1 bg-slate-700 rounded-lg"
                                />
                              </div>
                            )}

                            {/* Color Selector */}
                            {activeField !== 'qr' && (
                              <div className="space-y-1">
                                <div className="flex justify-between text-xs font-medium">
                                  <span className="text-slate-400">Font Color Override</span>
                                  <span className="font-mono text-slate-300 font-bold bg-slate-900 px-2 py-0.5 rounded border border-slate-750">{designerConfig[activeField]?.color || '#111827'}</span>
                                </div>
                                <div className="flex items-center gap-2.5">
                                  <input 
                                    type="color" 
                                    value={designerConfig[activeField]?.color || '#111827'} 
                                    onChange={(e) => updateFieldPosition(activeField, { color: e.target.value })}
                                    className="h-8 w-12 border border-slate-700 rounded cursor-pointer p-0 bg-transparent"
                                  />
                                  <div className="grid grid-cols-5 gap-1.5 flex-1">
                                    {['#111827', '#1e1b4b', '#0038a8', '#047857', '#b45309', '#ffffff', '#e2e8f0', '#ef4444', '#3b82f6', '#10b981'].map(presetColor => (
                                      <button
                                        key={presetColor}
                                        type="button"
                                        className="h-5.5 w-5.5 rounded-full border border-slate-700 shadow-sm"
                                        style={{ backgroundColor: presetColor }}
                                        onClick={() => updateFieldPosition(activeField, { color: presetColor })}
                                        title={presetColor}
                                      />
                                    ))}
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* QR Dimension controls */}
                            {activeField === 'qr' && (
                              <div className="space-y-1">
                                <div className="flex justify-between text-xs font-semibold">
                                  <span className="text-slate-400">QR Code Dimensions (Scale)</span>
                                  <span className="font-mono text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-900/55">{designerConfig[activeField]?.size || 70}px</span>
                                </div>
                                <input 
                                  type="range" 
                                  min="40" 
                                  max="150" 
                                  value={designerConfig[activeField]?.size || 70} 
                                  onChange={(e) => updateFieldPosition(activeField, { size: parseInt(e.target.value) })}
                                  className="w-full cursor-pointer accent-emerald-500 h-1 bg-slate-700 rounded-lg"
                                />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="mt-6 flex flex-col items-center text-center max-w-sm">
                      <span className="text-white text-xs font-bold flex items-center gap-1.5 mb-1 bg-slate-800 px-2.5 py-1 rounded-full border border-slate-750">
                        <Sliders className="h-4 w-4 text-emerald-400" />
                        Interactive Coordinate Overlay Guides
                      </span>
                      <p className="text-[11px] text-slate-400">
                        Click directly on any translucent label overlay on the badge preview above to select that variable, then configure its sliders.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-20 text-slate-500">
                    <Award className="h-12 w-12 text-slate-750 mx-auto mb-4" />
                    <h4 className="font-bold text-slate-300">No Standards Installed</h4>
                    <p className="text-xs text-slate-500 max-w-sm mt-1">
                      Please publish at least one badge standard template on the library catalog first to arrange visual coordinates layouts.
                    </p>
                  </div>
                )}
              </div>

              {/* Quick Preset Layout Sliders */}
              <div className="w-full mt-4 bg-slate-50 border border-slate-200 p-4 rounded-xl flex justify-between items-center text-xs text-slate-650">
                <div>
                  <span className="font-bold text-slate-800">Quick Alignment Templates:</span>
                  <p className="text-[11px] text-slate-500">Snaps preset coordinates instantly to align your active layout profiles.</p>
                </div>
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="text-xs hover:bg-slate-100 text-slate-700 font-bold" 
                    onClick={() => {
                      setDesignerConfig({
                        name: { x: 50, y: 44, fontSize: "1.45rem", color: "#1e1b4b", enabled: true },
                        qualificationTitle: { x: 50, y: 56, fontSize: "0.95rem", color: "#0038a8", enabled: true },
                        qualificationCode: { x: 50, y: 62, fontSize: "0.8rem", color: "#475569", enabled: true },
                        level: { x: 50, y: 35, fontSize: "0.9rem", color: "#b45309", enabled: true },
                        date: { x: 30, y: 88, fontSize: "0.7rem", color: "#334155", enabled: true },
                        validUntil: { x: 70, y: 88, fontSize: "0.7rem", color: "#334155", enabled: true },
                        id: { x: 50, y: 82, fontSize: "0.65rem", color: "#475569", enabled: true },
                        qr: { x: 50, y: 73, size: 70, enabled: true }
                      });
                    }}
                  >
                    Classic Laurel Layout
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="text-xs hover:bg-slate-100 text-slate-700 font-bold" 
                    onClick={() => {
                      setDesignerConfig({
                        name: { x: 50, y: 45, fontSize: "1.5rem", color: "#000000", enabled: true },
                        qualificationTitle: { x: 50, y: 58, fontSize: "1.02rem", color: "#334155", enabled: true },
                        qualificationCode: { x: 50, y: 64, fontSize: "0.8rem", color: "#64748b", enabled: true },
                        level: { x: 50, y: 71, fontSize: "0.9rem", color: "#1d4ed8", enabled: true },
                        date: { x: 28, y: 88, fontSize: "0.75rem", color: "#475569", enabled: true },
                        validUntil: { x: 60, y: 88, fontSize: "0.75rem", color: "#475569", enabled: true },
                        id: { x: 50, y: 82, fontSize: "0.7rem", color: "#64748b", enabled: true },
                        qr: { x: 50, y: 75, size: 70, enabled: true }
                      });
                    }}
                  >
                    Standard Flat Layout
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Create / Edit Badge Template Modal Dialog */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[600px] bg-white rounded-lg shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-slate-900 font-bold text-lg">
              {editingTemplate ? 'Edit Standard Template' : 'Create New Standard Template'}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Define the metadata, badge type, standard mappings, and background reference image.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
            <div className="grid grid-cols-2 gap-4">
              {/* Badge Name */}
              <div className="space-y-1.5 col-span-2">
                <Label htmlFor="badgeName" className="text-xs font-semibold text-slate-700">Badge/Standard Name</Label>
                <Input
                  id="badgeName"
                  placeholder="e.g. 2D Digital Animation Specialist"
                  value={formData.badgeName}
                  onChange={(e) => setFormData(prev => ({ ...prev, badgeName: e.target.value }))}
                  required
                  className="text-xs"
                />
              </div>

              {/* Active Standard Profile Name (KEY USER REQUIREMENT) */}
              <div className="space-y-1.5 col-span-2 bg-slate-50 p-3 rounded-lg border border-slate-100">
                <Label className="text-xs font-bold uppercase text-slate-700 block mb-1">
                  Active Standard Profile Name
                </Label>
                <div className="text-[10px] text-slate-500 mb-2">
                  Selecting a standard profile will automatically populate the Qualification Title, Code, and default Name.
                </div>
                <Select
                  value={formData.qualificationName}
                  onValueChange={(val) => {
                    const code = PROFILE_CODE_MAPPING[val] || '';
                    setFormData(prev => ({
                      ...prev,
                      qualificationName: val,
                      qualificationCode: code || prev.qualificationCode,
                      badgeName: prev.badgeName || `${val} Standard`
                    }));
                  }}
                >
                  <SelectTrigger className="w-full text-xs bg-white">
                    <SelectValue placeholder="Choose standard qualification profile..." />
                  </SelectTrigger>
                  <SelectContent>
                    {ACTIVE_STANDARD_PROFILES.map((profile) => (
                      <SelectItem key={profile} value={profile} className="text-xs">
                        {profile}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Qualification Name Display / Override */}
              <div className="space-y-1.5 col-span-2">
                <Label htmlFor="qualificationName" className="text-xs font-semibold text-slate-700">Qualification Title Display</Label>
                <Input
                  id="qualificationName"
                  placeholder="Displays as the qualification title text on the canvas"
                  value={formData.qualificationName}
                  onChange={(e) => setFormData(prev => ({ ...prev, qualificationName: e.target.value }))}
                  required
                  className="text-xs"
                />
              </div>

              {/* Qualification Code */}
              <div className="space-y-1.5">
                <Label htmlFor="qualificationCode" className="text-xs font-semibold text-slate-700">Qualification Code</Label>
                <Input
                  id="qualificationCode"
                  placeholder="e.g. ANIM-NC3-2D"
                  value={formData.qualificationCode}
                  onChange={(e) => setFormData(prev => ({ ...prev, qualificationCode: e.target.value }))}
                  required
                  className="text-xs"
                />
              </div>

              {/* Badge Type */}
              <div className="space-y-1.5">
                <Label htmlFor="badgeType" className="text-xs font-semibold text-slate-700">Badge Type</Label>
                <Select
                  value={formData.badgeType}
                  onValueChange={(val: any) => handleBadgeTypeChange(val)}
                >
                  <SelectTrigger id="badgeType" className="w-full text-xs">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Proficient" className="text-xs">Proficient (Unit)</SelectItem>
                    <SelectItem value="Expert" className="text-xs">Expert (Full Qual)</SelectItem>
                    <SelectItem value="Skilled" className="text-xs">Skilled (CoC)</SelectItem>
                    <SelectItem value="Master" className="text-xs">Master (NC)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Credential Level (Auto) */}
              <div className="space-y-1.5 col-span-2">
                <Label htmlFor="credentialLevel" className="text-xs font-semibold text-slate-400">Target Credential Level (Auto-calculated)</Label>
                <Input
                  id="credentialLevel"
                  value={formData.credentialLevel}
                  readOnly
                  disabled
                  className="text-xs bg-slate-50 text-slate-400 font-medium"
                />
              </div>

              {/* Related Competency */}
              <div className="space-y-1.5">
                <Label htmlFor="relatedCompetency" className="text-xs font-semibold text-slate-700">Related Units of Competency</Label>
                <Input
                  id="relatedCompetency"
                  placeholder="e.g. UC1, UC2, UC3"
                  value={formData.relatedCompetency}
                  onChange={(e) => setFormData(prev => ({ ...prev, relatedCompetency: e.target.value }))}
                  className="text-xs"
                />
              </div>

              {/* Validity Months */}
              <div className="space-y-1.5">
                <Label htmlFor="validityMonths" className="text-xs font-semibold text-slate-700">Validity (Months)</Label>
                <Input
                  id="validityMonths"
                  type="number"
                  min="1"
                  value={formData.validityMonths}
                  onChange={(e) => setFormData(prev => ({ ...prev, validityMonths: parseInt(e.target.value) || 36 }))}
                  className="text-xs"
                />
              </div>

              {/* Issuing Authority Scope */}
              <div className="space-y-1.5">
                <Label htmlFor="issuableBy" className="text-xs font-semibold text-slate-700">Issuable Authority</Label>
                <Select
                  value={formData.issuableBy[0]}
                  onValueChange={(val: any) => setFormData(prev => ({ ...prev, issuableBy: [val] }))}
                >
                  <SelectTrigger id="issuableBy" className="w-full text-xs">
                    <SelectValue placeholder="Authority scale" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TrainingCenter" className="text-xs">Training Center (RPL & course)</SelectItem>
                    <SelectItem value="AssessmentCenter" className="text-xs">Assessment Center (National assessments)</SelectItem>
                    <SelectItem value="CertificationOffice" className="text-xs">Certification Office (TESDA Central CO)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Status */}
              <div className="space-y-1.5">
                <Label htmlFor="status" className="text-xs font-semibold text-slate-700">Initial Template Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(val: any) => setFormData(prev => ({ ...prev, status: val }))}
                >
                  <SelectTrigger id="status" className="w-full text-xs">
                    <SelectValue placeholder="Standard status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Approved" className="text-xs">Approved / Active</SelectItem>
                    <SelectItem value="Draft" className="text-xs">Draft</SelectItem>
                    <SelectItem value="Archived" className="text-xs">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Description */}
              <div className="space-y-1.5 col-span-2">
                <Label htmlFor="description" className="text-xs font-semibold text-slate-700">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Summarized goals and objectives of the standard profile template..."
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={2}
                  className="text-xs"
                />
              </div>

              {/* Criteria */}
              <div className="space-y-1.5 col-span-2">
                <Label htmlFor="criteria" className="text-xs font-semibold text-slate-700">Completion Criteria</Label>
                <Textarea
                  id="criteria"
                  placeholder="Detail the grading points, minimum hours, and assessments necessary to grant this standard badge..."
                  value={formData.criteria}
                  onChange={(e) => setFormData(prev => ({ ...prev, criteria: e.target.value }))}
                  rows={2}
                  className="text-xs"
                />
              </div>

              {/* Alignment */}
              <div className="space-y-1.5">
                <Label htmlFor="alignment" className="text-xs font-semibold text-slate-700">Framework Alignment Reference</Label>
                <Input
                  id="alignment"
                  value={formData.alignment}
                  onChange={(e) => setFormData(prev => ({ ...prev, alignment: e.target.value }))}
                  className="text-xs"
                />
              </div>

              {/* Tags */}
              <div className="space-y-1.5">
                <Label htmlFor="tags" className="text-xs font-semibold text-slate-700">Search Tags (comma-separated)</Label>
                <Input
                  id="tags"
                  placeholder="multimedia, animation, creative, nc3"
                  value={formData.tags}
                  onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                  className="text-xs"
                />
              </div>

              {/* Template Image Background Link */}
              <div className="space-y-1.5 col-span-2 bg-slate-50 border border-slate-200 rounded-lg p-3">
                <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <Image className="h-4 w-4 text-slate-500" />
                  Visual Background Template (.JPG, .PNG)
                </Label>
                
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <div className="space-y-1">
                    <span className="text-[10px] font-medium text-slate-400 block mb-0.5">Upload Background Image</span>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          const file = e.target.files[0];
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            setFormData(prev => ({
                              ...prev,
                              imageUrl: event.target?.result as string
                            }));
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="text-xs h-9 cursor-pointer"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-medium text-slate-400 block mb-0.5">Or Paste Direct Image URL Reference</span>
                    <Input
                      type="text"
                      placeholder="https://imgur.com/your-badge.png"
                      value={formData.imageUrl}
                      onChange={(e) => setFormData(prev => ({ ...prev, imageUrl: e.target.value }))}
                      className="text-xs h-9 bg-white"
                    />
                  </div>
                </div>

                {formData.imageUrl && (
                  <div className="mt-3 flex items-center gap-2 border border-slate-200 rounded p-1.5 bg-slate-100/50">
                    <img
                      src={formData.imageUrl}
                      alt="Thumbnail"
                      className="h-8 w-8 rounded object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <span className="text-[9px] text-slate-500 truncate max-w-[400px]">Background configuration set successfully!</span>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      onClick={() => setFormData(prev => ({ ...prev, imageUrl: '' }))}
                      className="text-[10px] text-rose-500 hover:text-rose-600 h-6 px-1.5 ml-auto font-bold"
                    >
                      Clear Image
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-4 border-t flex justify-end">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsModalOpen(false)} 
                disabled={isSubmitting}
                className="text-xs h-9"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="text-xs h-9 bg-blue-600 hover:bg-blue-700 text-white font-bold"
              >
                {isSubmitting ? 'Saving...' : (editingTemplate ? 'Update Template' : 'Create Template')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal Dialog */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="sm:max-w-[400px] bg-white rounded-lg shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-slate-900 font-bold text-lg">Delete Certificate Standard Template</DialogTitle>
            <DialogDescription className="text-xs text-slate-500 mt-2">
              Are you sure you want to delete the certificate standard template for <span className="font-extrabold text-slate-905">"{templateToDelete?.badgeName || templateToDelete?.programName}"</span>? This will permanently erase the configuration and cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 pt-4 border-t flex justify-end">
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)} disabled={isSubmitting} className="text-xs h-9">
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isSubmitting} className="text-xs h-9 bg-rose-600 hover:bg-rose-700 text-white font-bold">
              {isSubmitting ? 'Deleting...' : 'Confirm Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
